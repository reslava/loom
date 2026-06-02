---
type: design
id: de_01KT2J0C0AMZHR41BA09XJDTAD
title: Synchronized version bump + canonical version-source list
status: done
created: "2026-06-01T00:00:00.000Z"
updated: 2026-06-02
version: 3
tags: []
parent_id: null
requires_load: []
---
# Synchronized version bump + canonical version-source list

The last `release-automation` thread. Provides the **one command** that moves the
whole monorepo to a new version, and defines the **canonical list of files the
version lives in** — the list the spine's `guard` job asserts against the tag.

**Vision frame.** Project infra for shipping Loom. Removes the maintainer
hand-editing version numbers across files before a release (the stale `0.2.0`
`--version` drift was this class of error).

**Grounding facts (verified 2026-06-01):**
- The version lives **only** in `package.json` files — the CLI `--version` and the
  extension both read it from there; no hardcoded version strings exist elsewhere.
- There are **7** version-bearing `package.json`s, all at `0.7.0`: root (private),
  `packages/cli` + `packages/vscode` (published), `packages/core / fs / app / mcp`
  (internal `@reslava-loom/*`, bundled, not published).

---

## Locked decisions (chat-001, 2026-06-01)

1. **Bump scope = all 7 `package.json`s.** "One synchronized version" is the
   premise; they're already in lockstep and bumping all is free. Keeps the internal
   `@reslava-loom/*` versions honest too.
2. **Mechanism = built-in npm, no custom version logic:**
   `npm version <X.Y.Z> --workspaces --include-workspace-root --no-git-tag-version`
   — one command, hits root + all workspaces, touches no git. (File: deps are
   `file:` links, not version ranges, so nothing else to rewrite.)
3. **The command also rolls the CHANGELOG:** `## [Unreleased]` → `## [X.Y.Z] - <today>`,
   inserts a fresh empty `[Unreleased]`, and updates the link refs. This is the one
   other version-stamped action and removes a manual step.
4. **No commit, no tag.** The command only edits files; the maintainer reviews
   (READMEs, CHANGELOG), then commits + `git tag vX.Y.Z` by hand. Automation never
   tags (extends the spine's locked rule to the bump tool).
5. **Guard reconciliation:** widen the spine's `guard` loop from the 3 user-facing
   files to **all 7**, so the asserted list == the canonical bumped list and they
   cannot drift.
6. **No interactive prompt.** README/CHANGELOG review stays the trust-based
   `RELEASING.md` checklist — an interactive `[y/N]` would fight scripting and
   duplicate the gate.

---

## Shape

**`scripts/bump-version.sh X.Y.Z`:**
1. Validate the arg is `X.Y.Z` (semver core); usage error otherwise.
2. `npm version "$X.Y.Z" --workspaces --include-workspace-root --no-git-tag-version --allow-same-version`.
3. Roll `CHANGELOG.md` (a small embedded `node` script — safer than sed for this):
   rename `## [Unreleased]` → add `## [X.Y.Z] - <UTC date>` beneath a fresh
   `## [Unreleased]`; rewrite the `[Unreleased]:` compare link to start at the new
   tag; insert a `[X.Y.Z]:` release-tag link. Fail if there's no `[Unreleased]`.
4. Print a reminder: review READMEs + CHANGELOG, then commit and `git tag vX.Y.Z`.

**Canonical version-source list** (the bump target == the guard's assertion list):
```
package.json
packages/core/package.json
packages/fs/package.json
packages/app/package.json
packages/mcp/package.json
packages/cli/package.json
packages/vscode/package.json
```

---

## Boundary / cross-thread edits

- This thread **edits `.github/workflows/release.yml`** (the spine's `guard` loop,
  3 → 7) — a shared edit, flagged per the weave boundary. The guard logic is
  otherwise unchanged.
- It **edits `RELEASING.md`** so the "bump" checklist item runs `bump-version.sh`
  and the CHANGELOG item reflects that notes go under `[Unreleased]` (the bump rolls
  them into `[X.Y.Z]`).

## Non-goals

- No git commit or tag. No version-bump CI job (tagging is manual; locked).
- No touching files other than the 7 `package.json`s and `CHANGELOG.md`.

---

## Decisions log

- **2026-06-01 (chat-001):** all 6 decisions above locked — all-7 scope, built-in
  `npm version`, CHANGELOG roll yes, no commit/tag, guard widened to 7, no prompt.
