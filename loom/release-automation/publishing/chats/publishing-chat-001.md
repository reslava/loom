---
type: chat
id: ch_01KT2FSYB9F8GBRD780524DCXR
title: publishing Chat
status: done
created: "2026-06-01T00:00:00.000Z"
updated: 2026-06-01
version: 2
tags: []
parent_id: null
requires_load: []
---
# publishing Chat

## Rafa:


## AI:

Continuing here from the release-pipeline chat. Taking a position on dev vs production build for the published artifacts.

**First, a correction to what I said earlier.** I claimed the spine "ships an unminified CLI tarball" and implied `--production` would minify it. I checked `packages/cli/esbuild.js` and that's wrong: `minify: false` is **hardcoded**, and `--production` only flips `sourcemap: !isProduction`. So for the CLI, dev and production produce a **byte-identical `dist/index.js`** except for the trailing `//# sourceMappingURL` comment — the only real difference is **whether the tarball includes `dist/index.js.map`**. No minification happens either way.

And the **extension is already a non-issue**: `vsce package` runs `vscode:prepublish` → `esbuild.js --production`, and the extension's esbuild *does* honour `minify: isProduction`. So the `.vsix` is already minified with no sourcemap, regardless of what `build-all.sh` did. Nothing to decide there.

So the entire question reduces to: **does the published CLI tarball ship a sourcemap?**

**Option A — dev build (current behaviour, ships the sourcemap)**
- ✅ Zero work — `build-all.sh` already produces this; no flag, no second build mode.
- ✅ Keeps the spine's tested-bytes == shipped-bytes literally true: the MCP integration test spawns this exact bundle.
- ✅ Source-mapped stack traces in user bug reports — a real win for a tool whose users are developers. A pasted error maps to TS source instead of one bundled line.
- ✅ CLI is MIT; the map exposes nothing that `npm install`'s source doesn't already.
- ⚠️ Larger tarball (the `.map` roughly doubles it — but absolute size is still small, a few hundred KB).
- ⚠️ Slightly unconventional to ship maps in a published CLI.

**Option B — production build (no sourcemap)**
- ✅ Smaller, "cleaner" tarball; the conventional choice.
- ⚠️ Loses source-mapped stack traces — strictly worse debuggability, for essentially the gain of *not shipping one file*.
- ⚠️ To keep tested == shipped you'd build-test with `--production` too. Cheap (the executable bytes are identical), but it's flag plumbing for ~no benefit.

**My position: Option A — dev build, ship the sourcemap.** When minification is off regardless, "production" here does exactly one thing — delete the sourcemap — and that map is pure upside for an OSS developer tool (better stack traces, nothing leaked) at a trivial size cost. It's also the zero-plumbing path that keeps the spine's guarantee intact. I'd only flip to B if tarball size ever became a real concern, which for a CLI it won't.

**Forward note (not now):** if we ever want a genuinely smaller CLI, that's a one-line change to `packages/cli/esbuild.js` (`minify: isProduction`, matching the extension). *Then* dev-vs-prod would actually differ in bytes, and `build-test` would need to build production so tests run the shipped bytes. Worth a sentence in the publishing design as a known lever, not a v1 change.

If you're good with A, the publish-npm body just becomes `npm publish artifacts/reslava-loom-X.Y.Z.tgz --access public` against the dev-built tarball, and the production-build question is closed. Want me to fold this into a `publishing` design and tackle the mechanical questions (existence-check commands, first-publish bootstrapping, dry-run)?

## Rafa: 

Yes

## AI:

Design written → `publishing-design.md` (draft). Option A is locked in it; the three publish bodies are specified:

- **npm:** `npm publish artifacts/reslava-loom-X.Y.Z.tgz --access public` (the packed tarball, not a re-publish from the dir — re-publishing would rerun `prepublishOnly` and drop the sourcemap, reopening Option A).
- **vsce:** `vsce publish --no-dependencies --packagePath artifacts/loom-vscode-X.Y.Z.vsix` (publishes the prebuilt vsix, no repackage).
- **ovsx:** `ovsx publish artifacts/loom-vscode-X.Y.Z.vsix -p $OVSX_TOKEN` (same vsix; one-time `ovsx create-namespace reslava` prerequisite).

It also writes down the first-publish bootstrapping (scope/publisher/namespace creation, token minting) for `RELEASING.md`.

**Two recommendations I'd want your nod on before a plan — these are the only real forks:**

1. **Idempotency / existence-check method (§4):** npm stays on `npm view`; for the marketplaces I lean **mixed-cleanest** — Open VSX via its HTTP API (`curl` the version URL → 200/404, no parsing) and Marketplace via `vsce show … --json | jq` (the gallery POST API is nastier than parsing vsce's JSON).
2. **Dry-run (§6):** I lean to a **`workflow_dispatch` `dry_run` input** so you can exercise guard → build-test → publish-wiring end-to-end without consuming a real version — durable pre-flight, cheap `if` branch. The alternative is just burning a `v0.0.1-rc.1` tag for real.

Both §4 and §6 lightly touch `release.yml` (shared with the spine) — flagging per the thread boundary. Confirm those two and I'll write the `publishing` plan.

## Rafa:

Both confirmed
Create the plan

## AI:

Plan created → `publishing-plan-001.md` (active), 5 steps:

1. **publish-npm** — `npm publish artifacts/reslava-loom-X.Y.Z.tgz --access public` (prebuilt tarball; keep the `npm view` skip-check).
2. **publish-vsce** — existence check via `vsce show … --json | jq`; publish via `--packagePath`.
3. **publish-ovsx** — existence check via `curl` the Open VSX version API; publish the same vsix; note the one-time `create-namespace` prereq.
4. **Dry-run** — `workflow_dispatch` + `dry_run` input; publish steps go no-consume, `release` job skipped on dry-run.
5. **Runbook** — expand `RELEASING.md` with token-minting + first-publish bootstrapping + how to dry-run.

Steps 1–4 touch `release.yml` (shared with the spine, as flagged); step 5 is `RELEASING.md`. Both confirmed decisions (§4 mixed existence checks, §6 dry-run input) are baked in.

Ready to implement step 1 on your go.

## AI:

Whole plan done — `publishing-plan-001` auto-closed to `done`. The spine's three `INTEGRATION POINT` stubs are gone; **spine + publishing now compose end-to-end.**

What landed in `release.yml`:
- **publish-npm:** `npm publish artifacts/reslava-loom-X.Y.Z.tgz --access public` (prebuilt tarball; `npm view` skip-check).
- **publish-vsce:** existence check `vsce show … --json | jq 'any(.versions[]?; .version==$v)'`; publish `--packagePath` the prebuilt vsix.
- **publish-ovsx:** existence check `curl -fsSL` the Open VSX version API (404→publish); publish the same vsix; `create-namespace` noted as a one-time prereq.
- **dry-run:** `workflow_dispatch` + `dry_run` (default true) → guard reads version from `package.json`, npm `--dry-run`, marketplaces skip, `release` job gated to tag pushes only.

And `RELEASING.md` grew a first-time-setup runbook (how to mint each token + create publisher/namespace) and a dry-run section; its stale "publish bodies are stubs" risk note is corrected.

Verified locally: YAML parses, all three publish steps carry the `DRY_RUN` env, `release.if == github.event_name == 'push'`, no stub references remain. **No CI run from here** — the genuine first exercise is operational: mint `NPM_TOKEN` / `VSCE_PAT` / `OVSX_TOKEN`, create the `reslava` Marketplace publisher + Open VSX namespace, then run the dry-run.

That leaves **`versioning`** as the last thread — the synchronized bump command + the canonical version-source list the guard should check (it currently checks root + cli + vscode `package.json`). Want to start it, or pause here?

## Rafa:

create thread `versioning` and a chat there to continue