---
type: chat
id: ch_01KT203118VPH8KHB3QAZ9SBH7
title: release-pipeline Chat
status: done
created: "2026-06-01T00:00:00.000Z"
updated: 2026-06-01
version: 2
tags: []
parent_id: null
requires_load: []
---
# release-pipeline Chat

## Rafa:

### Open questions for design

- Pre-tag README gate: I lean to checklist doc and trust-based. Agree? Is a script worth it?
- Release notes source: I lean to hand-written `CHANGELOG.md`. Agree?
- Open VSX: publish there in v1 or Marketplace-only first. What this mean? Explain briwfly
- Secrets surface (handled in `publishing`): `NPM_TOKEN`, `VSCE_PAT`, `OVSX_TOKEN`,
  `GITHUB_TOKEN`. I never automatized ci with secrets before. Explain briefly
- Partial-failure handling: if npm succeeds but vsix publish fails, how do we recover
  given the version is already consumed on npm (immutable)? -> We could fix the issue and republis both with a minor new version tag. Agree?


## AI:

Going question by question.

**1. Pre-tag README gate — checklist doc, trust-based. Agree; skip the script.**

Agree. A script can verify a README *changed*, never that it's *correct* — so it gives either false confidence (passes when you touch a comma) or false alarms (fails every release the READMEs were already fine). For a solo maintainer that's pure friction with no real safety. The honest gate is a `RELEASING.md` checklist you run by hand. And the highest-drift item is already gone: the CLI README reads the version from `package.json`, so there's no hardcoded version to forget. So: checklist in `RELEASING.md`, trust-based, no verification step in CI.

One cheap addition that isn't a script-gate: the bump command (the `versioning` thread) can print "✋ reviewed all 3 READMEs and the CHANGELOG? (y/N)" before it writes the bump. That's a forcing function, not a content check — it belongs to `versioning`, not here. Flagging it so we don't double-build it.

**2. Release notes — hand-written `CHANGELOG.md`. Agree.**

Agree, and it fits Loom's whole philosophy: humans write meaning, tools don't fabricate it. Auto-from-commits produces noise nobody reads. Concretely: you maintain `CHANGELOG.md` in *Keep a Changelog* format, write the `## [X.Y.Z]` section as part of the pre-tag gate, and CI extracts that one section and uses it verbatim as the GitHub release body. So the CHANGELOG is the single source and CI just transcribes it.

**3. Open VSX — what it is, and my lean.**

Open VSX is an open-source extension registry (Eclipse Foundation). It exists because Microsoft's Marketplace Terms forbid non-Microsoft products from pulling extensions from it — so every VS Code *fork* installs from Open VSX instead: **Cursor, VSCodium, Windsurf, Gitpod, code-server, Theia.** Publish only to MS Marketplace and none of those users can install Loom from their extension panel.

That audience is exactly Loom's target — Cursor users are AI-dev users. The cost is small: one extra token and one extra `ovsx publish` call. My lean is **include Open VSX in v1.** Marketplace-only-first is a legitimate de-risk (one fewer token, one fewer thing that can fail on day one), but you'd be cutting off the fork ecosystem that overlaps most with your audience. This one is a real decision — your call; I'd take Open VSX in v1.

**4. CI secrets — how they work, briefly.**

A "secret" is a token you store encrypted in the repo at **Settings → Secrets and variables → Actions**. The workflow references it as `${{ secrets.NPM_TOKEN }}`; GitHub injects it as an env var only at runtime and auto-masks it in logs. It never lives in the repo or in code. The four:

- **`NPM_TOKEN`** — an npm *automation* token (npmjs.com → Access Tokens). Authorizes `npm publish` for the `@reslava` scope. Manual setup.
- **`VSCE_PAT`** — an Azure DevOps Personal Access Token with Marketplace-publish scope. Authorizes `vsce publish` to VS Code Marketplace. Manual setup (this is the fiddly one — Azure DevOps org + PAT).
- **`OVSX_TOKEN`** — an Open VSX access token from your open-vsx.org account. Authorizes `ovsx publish`. Manual setup (only if we do #3).
- **`GITHUB_TOKEN`** — **automatic.** GitHub Actions provides it to every run; no setup. You just declare `permissions: contents: write` in the workflow so it can create the release.

So really only 2–3 tokens to set up by hand; the GitHub one is free.

**5. Partial failure (npm OK, vsix fails) — agree on roll-forward, but refine the mechanism.**

Your instinct is right: npm versions are immutable (you can't re-`publish` 0.8.0, and unpublish is restricted/discouraged), so you never try to reuse a consumed version — you roll forward. Two refinements:

- **It's a patch, not a minor.** A failed publish is a fix, not a feature → 0.8.0 → **0.8.1**. (0.8.0 ends up orphaned on npm with no matching extension; that's fine, it's free.)
- **Try idempotent re-run *before* bumping.** The cleaner design: make each publish job *skip-if-already-published* — check whether the version already exists on that registry and no-op if so. Then a partial failure just means you **re-run the same tag's workflow**: npm sees 0.8.0 exists and skips, the marketplace job that failed runs again and completes. No version burned for a transient marketplace hiccup. You only roll forward to 0.8.1 in the rarer case where the npm *content itself* is wrong and needs replacing.

So: idempotent jobs as the first-line recovery, version-bump roll-forward as the fallback. Keeps the synchronized-version invariant intact without spending a version on every flaky publish.

---

Net: I agree with your leans on 1, 2, and 5 (with the patch-not-minor + idempotency refinements). #3 (Open VSX) and the idempotency design in #5 are the two things worth your explicit decision before I draft the design. Want me to fold these into a design doc, or keep chewing?

## Rafa:

1 ok
2 ok 
5 yes it is patch + idempotency
3 ok ( i did not know Open VSX )
4 yes ok, I remember now I used secrets in ci before

Create a design

## AI:

Design created → `release-pipeline-design.md` (status: draft). It locks all five resolved decisions and lays out the spine:

**Job graph:** `guard → test → build → fan-out(publish-npm | publish-vsce | publish-ovsx) → release`, build-once-and-publish-from-artifacts, every publish job skip-if-already-published so a partial failure is recovered by re-running the same tag.

I kept the thread boundary tight: this design is the **workflow spine only**. The bump command lives in `versioning`, and the actual publish-command bodies + token scopes live in `publishing` — I stated the contracts between them rather than absorbing their scope.

**Two leans I flagged for your call before this goes to a plan:**

1. Should `release` require **all three** publish jobs to succeed (strict `needs`), or proceed once npm + one marketplace are out? I lean **strict** — given idempotent re-runs, a flaky Open VSX just means re-run the tag, and the GitHub release then reflects a fully-consistent state.
2. The CHANGELOG-section gate is the **one** pre-tag check I made CI-enforced (the `release` job fails if no `## [X.Y.Z]` section exists), because section-existence is machine-checkable where README-quality isn't. Comfortable with that asymmetry vs. the trust-based README gate?

Confirm those two and I'll write the implementation plan.

## Rafa:

Both confirmed
go

## AI:

Plan created → `release-pipeline-plan-001.md` (status: active), 5 steps:

1. `release.yml` trigger + `guard` job (parse tag, assert package.json versions == tag).
2. `test` + `build` jobs (canonical scripts; upload npm tarball + .vsix artifacts).
3. Three publish job skeletons (needs build, artifact download, secret wiring, idempotency-guard structure) — publish-command bodies left as `publishing`-thread integration points.
4. `release` job — strict needs on all three, `contents: write`, extract `## [X.Y.Z]` from CHANGELOG (fail if missing), create the GitHub release.
5. `RELEASING.md` checklist + seed `CHANGELOG.md`.

Both confirmed leans are baked in (strict `needs` in step 4; CHANGELOG gate in step 4). Step 3 deliberately stops at the orchestration boundary so the `publishing` thread fills the command bodies without this thread reaching into its scope.

Ready to implement step 1 on your `go`.

## Rafa:

Do whole plan

## AI:

Stopping before writing any files — implementation surfaced a design-level correction (stop rule 3, which still interrupts "do whole plan").

**Finding: the design's job order is backwards.** The design and plan step 2 say `guard → test → build`. But the test suite imports compiled output from `dist/` — e.g. `tests/workspace-workflow.test.ts` imports `../packages/fs/dist/index.js`, `../packages/app/dist/*.js`. `test-all.sh` just runs ts-node over those files; it does **not** build first. So on a clean CI runner, `test` before `build` fails at import. Locally it only works because you've already built. **Build must precede test.**

This is actually *better* for our "build once, publish the tested bytes" goal — if build runs first, the exact `dist/` that tests validate is the same `dist/` we pack and publish.

**Two ways to fix the order — I need your pick:**

1. **(Recommended) Collapse build+test into one job.** `guard → build-test → publish×3 → release`, where `build-test` runs `./scripts/build-all.sh` then `./scripts/test-all.sh` then packs the npm tarball + `.vsix` and uploads them. One runner, one checkout — mirrors exactly how you build+test locally, and guarantees tested-bytes == shipped-bytes with no artifact reshuffle.
2. **Keep separate jobs, just reorder** to `guard → build → test → publish`. `build` uploads `dist/` as an artifact; `test` downloads it before running. More moving parts (a `dist/` artifact passed between runners) for no real benefit here.

I lean hard on **#1** — it's the smaller, more honest workflow.

**Secondary risk (not blocking, flagging it):** `tests/workspace-utils.ts:6` hardcodes `WORKSPACE_ROOT = 'j:/temp/loom'`. On Linux that's a *relative* path, so the suite will scribble a `j:/temp/loom` tree into the runner's working dir. It'll probably pass (colons are legal in Linux filenames), but it's grime and a latent portability bug. Fixing it (use `os.tmpdir()`) is **test-infra, not release-spine** — out of scope for this thread. Want me to (a) leave it and just note it in `RELEASING.md` risks, or (b) open a separate thread/idea for test-path portability? Either way it doesn't block the spine.

Confirm the job-order choice (and the j:/temp disposition if you have a preference) and I'll resume the plan with the corrected graph — which also means I should update the design doc's §1 graph + the plan's step 2 to match before implementing. STOP.

## Rafa:

order: 1
j:/temp: fix it using `os.tmpdir()`


## AI:

Whole plan done — `release-pipeline-plan-001` auto-closed to `status: done`. What landed:

- **`.github/workflows/release.yml`** — `guard → build-test → publish-npm | publish-vsce | publish-ovsx → release`. Tag-only trigger, version-sync guard, build-before-test merged job that packs + uploads the tested tarball/.vsix, three idempotent publish skeletons, and a strict-`needs` release job that extracts the CHANGELOG section (fail-closed) and cuts the GitHub release.
- **`RELEASING.md`** — trust-based pre-tag checklist, secrets table, partial-failure recovery.
- **`CHANGELOG.md`** — added `[Unreleased]` + `[0.7.0]` to the existing history (not overwritten).
- **`tests/workspace-utils.ts`** — `j:/temp/loom` → `os.tmpdir()` so the suite runs on Linux CI.

Two things worth flagging:

1. **A real bug was caught & fixed mid-flight** — the changelog-extraction awk used a dynamic regex that treated `[0.7.0]` as a character class and matched nothing (the gate only "passed" because everything came back empty). Switched to literal `index()` matching and re-verified: 0.7.0 extracts correctly, bogus version fails closed.
2. **The spine is intentionally not runnable end-to-end yet.** The three publish bodies are `exit 1` `INTEGRATION POINT` stubs owned by the **`publishing`** thread. A tag push today passes guard+build-test, then fails loudly at publish — nothing published, no release. That's the honest state until `publishing` (and `versioning` for the bump command) land.

Couldn't run the workflow in CI from here — verification was local (YAML parse + the exact release-job awk against the real CHANGELOG). The first real exercise will be `publishing` filling the stubs, then a throwaway pre-release tag.

Natural next moves: start the **`publishing`** thread (publish command bodies + the vsce/ovsx existence checks) or **`versioning`** (the synchronized bump command + canonical version-source list the guard should check).

## Rafa:

start `publishing` thread 

## AI:

`publishing` thread started → `publishing-idea.md` (draft).

I wrote it **narrower than the original scope bullet** on purpose, because the spine absorbed more than planned. Publishing now owns only:
- the 3 publish-command bodies inside the `INTEGRATION POINT` stubs,
- the vsce/ovsx version-exists queries (npm's is already done),
- a token-provisioning runbook feeding `RELEASING.md`'s secrets table.

The **GitHub release job is already done** in the spine, so it's explicitly out of scope here — I called that reconciliation out in the idea so the two threads don't both claim it.

**One open question is the real fork and I'd want your steer before a design:** the spine's `build-test` builds the CLI with **dev** esbuild (`node esbuild.js`), so the packed tarball ships **unminified**. Do we want releases to ship a production (`--production`) build? The catch: a publish-time rebuild would break the spine's "tested-bytes == shipped-bytes" guarantee, so if we want production output it probably has to happen in `build-all.sh` (so tests run against the same production bytes). That's a `versioning`/`build` boundary question as much as a publishing one.

The other open questions (npm publish-from-tarball, exact existence-check commands, first-publish bootstrapping, dry-run path) are more mechanical — design-time, not blocking.

Want me to take a position on the production-build question and move to a `publishing` design, or talk it through first? (Also: future publishing discussion probably belongs in a `publishing`-thread chat rather than this one — say the word and I'll spin one up.)

## Rafa: 

Continue the chat in the new thread, chat: `loom/release-automation/publishing/chats/publishing-chat-001.md`

Take a position with pros and cons for dev / production build