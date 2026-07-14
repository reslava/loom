---
description: Ship a synchronized Loom release (CLI + extension) end-to-end — changelog, bump, build/test, tag, push, and monitor the publish workflow.
argument-hint: "<X.Y.Z>  (required — omit and it shows candidates then stops; never assumed)"
---

# do-release

Ship Loom version **$ARGUMENTS**. The version is **required and never assumed** — if
`$ARGUMENTS` is empty, do not pick one: run pre-flight **A** below (show the candidates,
STOP, and require an explicit re-run with `X.Y.Z`).

This is an **operational runbook task**, not pipeline design work. Load only the
minimal context below — do **not** read `loom://state` or the `release-pipeline`
thread bundle (idea/design/plan). Those describe how the pipeline is *built*; this
task only *runs* it.

## Context to load (and nothing more)

1. `RELEASING.md` — the authoritative checklist + gotchas + partial-failure recovery.
2. Root `package.json` `version` — the current version (the only authoritative source).
3. The **Loom doc graph** — the changelog is drafted from here, not from `git log`. Read
   `loom://roadmap` and take its `history` entries with `release: null` — the **Unreleased**
   set is this release's shipped plans (`record-release` stamps exactly this set at the end).
   By default also read those plans' **done docs** for the per-change *why* (see step 2).
4. `git log <lastTag>..HEAD --oneline` — the **coverage net only** (`git tag --sort=-creatordate | head -1`
   gives the last tag). No longer the changelog source; used in step 3 to catch user-facing
   changes that shipped with no covering done plan.

## Pre-flight (before any release work)

**A. Version is required — never assumed.** If `$ARGUMENTS` is empty, do **not** pick a
version. Read the current root `package.json` version and show the three candidates as a
hint — e.g. `patch → 1.9.3 · minor → 1.10.0 · major → 2.0.0` — with one line noting that
which one applies depends on what actually shipped (bugfix-only = patch, new features =
minor, breaking = major). Then **STOP** and require the user to re-run `/do-release X.Y.Z`
with an explicit version. Proceed past here only when a version was given.

**B. Commit stray roadmap reflows first (keep the release commit clean).** Check
`git status` for uncommitted `thread.md` files so they don't get swept into the
`release: vX.Y.Z` commit:
- **Modified, tracked `thread.md` whose diff touches only `priority` / `depends_on`** →
  commit just those as `chore: roadmap` before continuing.
- **New / untracked `thread.md`, or any `thread.md` with a non-roadmap diff** → do **not**
  auto-commit (a new thread's manifest belongs with its feature commit, not a roadmap
  chore). **STOP and report** them, and let the user commit them by hand.

## Steps

1. **Confirm version.** Pre-flight A guarantees a version was supplied. Sanity-check it's a
   clean bump above the current root `package.json` version and state it.
2. **Draft the changelog from the graph (not `git log`).** Invoke the `release-notes`
   report inline (in this session) over the **Unreleased** set — `loom://roadmap` `history`
   where `release: null`:
   - **Skeleton + framing** come from the report: grouped by version, the Unreleased bucket
     sub-structured as **Added / Changed / Fixed** with a one-line **Highlights** lead (the
     `release-notes` kind owns this shape).
   - **Enrichment (default):** read each Unreleased plan's **done doc**
     (`loom/{weave}/{thread}/done/{plan}-done.md` — a bounded per-release set) and curate
     `title + done-body` into user-facing outcomes in a **benefit voice** — what the user can
     now do or no longer suffers, not the engineering plan title. Skip the done-doc read only
     for a fast, low-token draft (**titles-only fallback**).
   - Synthesize **in-session** — do *not* shell out; you are the AI (no API key / sampling).
   - **Coverage net (`git log`):** after the graph draft, run `git log <lastTag>..HEAD --oneline`
     and list any user-facing commit **not represented** by an Unreleased done plan as a
     **"Not covered by a done plan"** appendix under the draft — the human folds genuine changes
     in or dismisses them. `quick_ship`'s done docs keep this list near-empty; the net only
     proves completeness, it does not carry the changelog.
   - **Stale-leak guardrail:** if any Unreleased done doc's date **predates the previous tag**,
     flag it inline — a prior release may have failed to stamp its plans (the tag-push gotcha),
     so they would wrongly leak into these notes. Non-blocking; surface it and let the human decide.
3. **Write both changelogs from the step-2 draft:**
   - Root `CHANGELOG.md` — write the curated Added / Changed / Fixed (+ Highlights) entries
     under `## [Unreleased]` (the bump rolls it into the dated `## [X.Y.Z]` section that
     becomes the **GitHub release body verbatim**).
   - `packages/vscode/CHANGELOG.md` — add a dated `## [X.Y.Z]` section **by hand**; the
     bump script does *not* roll this one. If the extension had no functional change, say so
     explicitly (still add the section — the release guard requires it).
4. **STOP — show the proposed version + both changelog sections and wait for `go`.** The
   root section is published verbatim as release notes, so it gets one human review.
5. On `go`:
   - `bash scripts/bump-version.sh X.Y.Z` (bumps all 7 `package.json`s, rolls root CHANGELOG).
   - `bash scripts/build-all.sh && bash scripts/test-all.sh` — **build before test** (the
     suite imports `dist/`). Red = stop and report; never ship a red build.
   - `loom record-release X.Y.Z` — stamp this release's done plans with `actual_release`
     so the roadmap owns "what shipped in vX.Y.Z" (idempotent; no-op if nothing is unstamped).
     Run it **after** the build so the freshly-built CLI is linked; its plan-file edits are
     part of the release commit below.
   - `git commit -am "release: vX.Y.Z"` (ask whether to fold any unrelated pending edits;
     the `record-release` stamps land in this commit).
   - `git tag -a vX.Y.Z -m "vX.Y.Z"` — **annotated**, or `--follow-tags` silently leaves the
     tag local and the workflow never fires.
   - `git push --follow-tags`.
6. **Monitor.** `gh run list --workflow=release.yml --limit 1` → `gh run watch <id> --exit-status`.
   Job graph: `guard → build-test → publish(npm·vsce·ovsx) → release`.
7. **Partial-failure recovery.** Every publish job is skip-if-already-published, so a
   transient failure (e.g. `ECONNRESET` to the Marketplace) is recovered by re-running the
   **same tag**: `gh run rerun <id> --failed`. No re-tag, no version bump — npm/Open VSX are
   immutable and already consumed. Only if the npm *content* is wrong do you roll forward to
   the next patch. If a publish fails twice consecutively, stop and diagnose — it's no longer
   a flake.

## Done when

npm + Marketplace + Open VSX are all live at the version and the GitHub release for the
tag is published (`gh release view vX.Y.Z`).
