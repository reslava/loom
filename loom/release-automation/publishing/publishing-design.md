---
type: design
id: de_01KT2G8X11XP9Z11D2QKK9E5NK
title: Publish job bodies — npm, Marketplace, Open VSX
status: done
created: "2026-06-01T00:00:00.000Z"
updated: 2026-06-01
version: 3
tags: []
parent_id: id_01KT2FN4D7V6J3TK7G07CXDJTE
requires_load: []
---
# Publish job bodies — npm, Marketplace, Open VSX

This thread fills the three `>>> INTEGRATION POINT <<<` stubs the `release-pipeline`
spine left in `.github/workflows/release.yml`. The spine already owns the job
graph, `needs`, artifact download, secret env wiring, and the skip-if-published
*control structure*; this design specifies the **commands that go inside** those
structures, plus the one-time provisioning each registry needs.

**Vision frame.** Project infra for shipping Loom itself. Removes the maintainer
hand-running `npm publish` / `vsce publish` / `ovsx publish`.

**Inputs (from the spine's `release-artifacts`):**
- `artifacts/reslava-loom-X.Y.Z.tgz` — packed CLI (`@reslava/loom`), dev build with sourcemap.
- `artifacts/loom-vscode-X.Y.Z.vsix` — packaged extension (`reslava.loom-vscode`), production/minified (vsce ran `vscode:prepublish`).

**Locked decision (chat-001):** **Option A — dev build, ship the sourcemap.** The
CLI's `esbuild.js` hardcodes `minify: false`; `--production` only drops the
sourcemap, so dev vs prod is byte-identical executable code. We ship the dev
tarball as-is (better stack traces, keeps tested-bytes == shipped-bytes, zero
plumbing). The production-build question is **closed** for v1. Known future lever:
set `minify: isProduction` in the CLI esbuild if tarball size ever matters — at
which point `build-test` must build production too.

---

## §1 — publish-npm

Existence check is already in the spine (`npm view "@reslava/loom@$VERSION" version`).
Body:

```bash
npm publish "artifacts/reslava-loom-${VERSION}.tgz" --access public
```

- `--access public` is required because `@reslava` is a scoped package; harmless on
  subsequent publishes, mandatory on the first.
- Auth via `NODE_AUTH_TOKEN` (← `NPM_TOKEN`), already wired by `setup-node` with
  `registry-url: https://registry.npmjs.org`.
- Publishing the **packed tarball** (not `npm publish` from `packages/cli/`) is
  deliberate — it ships the exact bytes `build-test` produced and tested, and
  avoids re-running `prepublishOnly` (which would rebuild and drop the sourcemap,
  reopening the Option-A decision).

---

## §2 — publish-vsce (VS Code Marketplace)

Body:

```bash
npx @vscode/vsce publish --no-dependencies \
  --packagePath "artifacts/loom-vscode-${VERSION}.vsix"
```

- `--packagePath` publishes the **prebuilt** `.vsix` — vsce does not repackage, so
  the tested artifact is what ships.
- Auth via `VSCE_PAT` env (vsce reads it automatically).

**Existence check** (sets `skip=true` when already published) — see §4.

---

## §3 — publish-ovsx (Open VSX)

Body:

```bash
npx ovsx publish "artifacts/loom-vscode-${VERSION}.vsix" -p "$OVSX_TOKEN"
```

- Same prebuilt `.vsix` as the Marketplace — one artifact, two registries.
- **One-time prerequisite:** the `reslava` namespace must exist on Open VSX before
  the first publish: `npx ovsx create-namespace reslava -p "$OVSX_TOKEN"` (run once,
  documented in the runbook — not in the workflow).

**Existence check** — see §4.

---

## §4 — Existence-check method (design decision)

The three publish jobs must be idempotent (spine contract: "safe to run twice").
npm's check is settled (`npm view`). For Marketplace and Open VSX there are two
ways to ask "is X.Y.Z already published?":

- **Option 1 — registry HTTP API via curl.** Uniform, no output-parsing fragility.
  - Open VSX: `curl -fsSL "https://open-vsx.org/api/reslava/loom-vscode/${VERSION}"`
    → exit 0 (200) if the version exists, non-zero (404) if not. Clean.
  - Marketplace: the gallery API is a POST with a JSON body (`extensionquery`) — workable but ugly to write in shell.
- **Option 2 — the registry CLIs.** `npx @vscode/vsce show reslava.loom-vscode --json`
  (parse `.versions[].version` for `$VERSION`) and `npx ovsx get reslava.loom-vscode --metadata`.
  Reuses tooling already on the runner; needs `jq`/grep parsing.

**Recommendation:** **mixed, picking the cleanest per registry** — Open VSX via the
HTTP API (`curl` against the version URL is a one-liner, no parsing), Marketplace
via `vsce show ... --json | jq` (the gallery POST API is worse than parsing vsce's
JSON). npm stays on `npm view`. This is the one genuine choice in this design; I
lean to it but it's worth your nod since it sets the idempotency mechanism.

---

## §5 — First-publish bootstrapping (one-time manual prerequisites)

These are **not** automated — they're documented in `RELEASING.md` as one-time
setup before the first release:

- **npm:** the `@reslava` scope must exist on the account that owns `NPM_TOKEN`;
  `NPM_TOKEN` is an automation token. First publish carries `--access public`.
- **Marketplace:** the `reslava` publisher must be created in the VS Code
  Marketplace (via an Azure DevOps org); `VSCE_PAT` is a PAT scoped to it with
  Marketplace-publish rights.
- **Open VSX:** sign the publisher agreement on open-vsx.org, then
  `ovsx create-namespace reslava` once. `OVSX_TOKEN` is an open-vsx.org access token.

---

## §6 — Dry-run / first exercise (design decision)

We want to prove spine + publishing compose **without** consuming a real version
(npm is immutable). Two approaches:

- **Option A — `workflow_dispatch` dry-run input.** Add a manual trigger with a
  `dry_run` boolean; when true, the publish steps run `npm publish --dry-run`,
  `vsce package` (already done) / skip the actual publish, and `ovsx publish --help`
  / skip. Exercises guard + build-test + the publish wiring end-to-end, publishes
  nothing. Reusable forever as a pre-flight. Cost: a small `if` branch in each
  publish step (touches `release.yml`, i.e. nudges the spine).
- **Option B — low pre-release tag.** Just tag `v0.0.1-rc.1` and let it really
  publish to all three (pre-release versions are fine to burn). Simpler, zero
  workflow change, but it does consume registry versions and needs the extension
  pre-release handling.

**Recommendation:** **Option A (dry-run input).** It's the durable, non-consuming
pre-flight and the extra `if` is cheap. It does touch `release.yml`, so it's a
shared edit with the spine — calling that out per the thread boundary.

---

## §7 — Boundary (what stays in the spine)

- Job graph, `needs`, artifact upload/download, secret env wiring, the
  skip-if-published `if:` structure, and the whole `release` job (CHANGELOG +
  `gh release create`) — all **spine**, already done.
- This thread edits `release.yml` only to (a) replace the three `INTEGRATION POINT`
  command bodies, (b) add the two existence-check queries (vsce, ovsx), and
  (c) — if §6 Option A is accepted — add the `workflow_dispatch` `dry_run` branch.
- Token *values* are repo secrets; this thread documents how to **mint** them.

---

## Decisions log

- **2026-06-01 (chat-001):** Option A locked — dev build, ship sourcemap;
  production-build question closed for v1. publish-npm = `npm publish <tarball> --access public`.
- **2026-06-01 (design):** publish-vsce/ovsx publish the prebuilt `.vsix` via
  `--packagePath` / direct path (no repackage). Two open recommendations pending
  your nod: §4 existence-check method (Open VSX HTTP API + Marketplace `vsce show --json`)
  and §6 dry-run via a `workflow_dispatch` input.
