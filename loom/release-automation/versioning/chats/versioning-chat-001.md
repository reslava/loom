---
type: chat
id: ch_01KT2HD31DD4H326AT6AQ0PE29
title: versioning
status: active
created: 2026-06-01
version: 1
tags: []
parent_id: null
requires_load: []
---
# versioning

## Rafa:


## AI:

Continuing here for the **`versioning`** thread — the last piece of `release-automation`. Its job (per the locked decisions in the release-pipeline idea): **one command that bumps the synchronized version everywhere, plus the canonical list of where the version lives** (the tag convention `vX.Y.Z` is already locked).

**Grounding facts:**
- There are **7 version-bearing `package.json`s**, all currently synced at `0.7.0`: root (private), `packages/cli` + `packages/vscode` (published), and `packages/core / fs / app / mcp` (internal `@reslava-loom/*`, bundled via esbuild, not published).
- The CLI `--version` and the extension both read from `package.json` — no hardcoded version strings anywhere. So the version lives **only** in these `package.json`s.
- The spine's `guard` job currently asserts only the **3 user-facing** files match the tag.

So this thread is small and well-bounded. The decisions I'd want your call on:

**1. Which files does the bump touch — all 7, or just the 3 user-facing?**
Lean **all 7**. "One synchronized version" is the whole premise, they're already in lockstep, and bumping all of them is free. The internal versions being correct also keeps the `@reslava-loom/*` file: deps honest.

**2. Bump mechanism — built-in `npm version` or a custom script?**
Lean the **built-in**: `npm version X.Y.Z --workspaces --include-workspace-root --no-git-tag-version`. One command, no script to maintain, hits root + all workspaces. `--no-git-tag-version` because CI owns nothing and *you* tag manually (locked). The alternative is a `scripts/bump-version.sh` if we need to touch non-package.json files — but there aren't any, so the built-in wins.

**3. Does the bump do anything beyond editing `package.json`s?** Two sub-questions:
   - **Roll the CHANGELOG** `## [Unreleased]` → `## [X.Y.Z] - <today>`? It'd be convenient (the release job needs that section), but it couples versioning to the changelog format. Lean: **yes, roll it** — it's the one other version-stamped action and removes a manual step.
   - **Commit/tag?** Lean **no** — the bump only edits files; you review (READMEs, CHANGELOG), then commit + tag yourself. This matches the `RELEASING.md` checklist where bump and tag are separate, and keeps "CI/automation never tags" extending to the bump tool too.

**4. Reconcile the guard's check-list.** If the bump touches all 7, should `guard` assert all 7 (not just 3)? Lean **yes** — keep the guard's asserted list == the canonical bumped list, so they can't drift. Small edit to the spine's guard loop.

**5. The forcing-function prompt** I flagged way back — should the bump command end with a `✋ reviewed the 3 READMEs + CHANGELOG? [y/N]` prompt, or keep that purely as the trust-based `RELEASING.md` checklist? Lean: **keep it in the checklist only** — an interactive prompt fights scripting/automation and duplicates the gate.

That's the whole design surface. Where do you land on 1–5 (especially the all-7 scope and the CHANGELOG-roll)?

## Rafa:

1. all 7
2. built-in `npm version`
3. Roll the CHANGELOG yes, rool it
   Commit/tag? no
4. all 7
5. keep it in the checklist only

## AI:

All five locked — no open questions left. The concrete deliverable is now fully determined:

- **Bump command** (`scripts/bump-version.sh X.Y.Z`, or a one-line npm script) wrapping:
  `npm version <X.Y.Z> --workspaces --include-workspace-root --no-git-tag-version` → bumps all 7 `package.json`s in one shot, no git tag.
- **CHANGELOG roll:** the same command rewrites `## [Unreleased]` → `## [X.Y.Z] - <today>` (and re-seeds an empty `[Unreleased]` + the compare-link refs).
- **No commit, no tag** — it only edits files; you review + commit + tag by hand.
- **Guard reconciliation:** widen the spine's `guard` loop from 3 → all 7 `package.json`s so the asserted list == the bumped list.
- **No interactive prompt** — the README/CHANGELOG review stays the trust-based `RELEASING.md` checklist.

This thread is small enough that the design is essentially this message. To keep the weave's three threads structurally consistent, I'll formalize it as a tight **idea → design → plan** (each short, decisions already settled), then implement — the implementation is the bump script + a `release-pipeline` guard edit + a `RELEASING.md` tweak pointing the "bump" checklist item at the new command.

Say **go** (or "do whole plan" once the plan exists) and I'll spin up the docs and build it.

## Rafa:

Create design, plan
Do whole plan

## AI:

Whole plan done — `versioning-plan-001` auto-closed to `done`. And that's the **last thread — `release-automation` is complete.**

What landed:
- **`scripts/bump-version.sh X.Y.Z`** — validates semver, `npm version … --workspaces --include-workspace-root --no-git-tag-version` (all 7 package.json), then a node CHANGELOG roll (`[Unreleased]` → dated `[X.Y.Z]`, fresh `[Unreleased]`, link refs). No commit/tag. Verified: arg validation + the roll on a throwaway copy; `bash -n` clean.
- **`release.yml` guard** widened 3 → all 7 package.json (the canonical list now matches what the bump touches).
- **`RELEASING.md`** — bump item now runs the script; CHANGELOG item reframed (write under `[Unreleased]`, the bump rolls it).

**The three threads now compose into one pipeline:**
`bump-version.sh` (versioning) → review + `git tag vX.Y.Z` → `release.yml` guard → build-test → publish×3 (publishing) → GitHub release.

The only thing left before a first real release is **operational, not code**: mint `NPM_TOKEN`/`VSCE_PAT`/`OVSX_TOKEN`, create the `reslava` Marketplace publisher + Open VSX namespace, then run the dry-run (`Actions → release → dry_run: true`). All of that is documented in `RELEASING.md`.

Nothing's been committed — it's all in the working tree for you to review. Want me to commit the `release-automation` work, or leave it?