---
type: plan
id: pl_01KT2J1DV54HHNAPKS92W3MWSG
title: Build the synchronized bump command
status: done
created: "2026-06-01T00:00:00.000Z"
updated: "2026-06-01T00:00:00.000Z"
version: 1
design_version: 1
tags: []
parent_id: de_01KT2J0C0AMZHR41BA09XJDTAD
requires_load: []
target_version: 0.1.0
steps:
  - id: create-scripts-bump-version
    order: 1
    status: done
    description: "Create `scripts/bump-version.sh X.Y.Z`: validate the arg is semver-core (X.Y.Z), cd to repo root, run `npm version \"$VERSION\" --workspaces --include-workspace-root --no-git-tag-version --allow-same-version` to bump all 7 package.json files, and print a closing reminder to review READMEs/CHANGELOG then commit + `git tag vX.Y.Z`. No git commit/tag in the script."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: extend-scripts-bump-version
    order: 2
    status: done
    description: "Extend `scripts/bump-version.sh` with the CHANGELOG roll (an embedded `node` step, safer than sed): rename `## [Unreleased]` → add `## [X.Y.Z] - <UTC date>` under a fresh empty `## [Unreleased]`; rewrite the `[Unreleased]:` compare link to start at v$VERSION; insert a `[X.Y.Z]:` release-tag link. Fail with a clear message if CHANGELOG.md has no `[Unreleased]` section."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: widen-the-spine-s-guard-in
    order: 3
    status: done
    description: "Widen the spine's guard in `.github/workflows/release.yml`: change the version-sync loop from the 3 user-facing package.json files to all 7 (root, core, fs, app, mcp, cli, vscode) — the canonical list owned by this thread — and update the loop's comment to say so."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: update-releasing
    order: 4
    status: done
    description: "Update `RELEASING.md`: point the “bump” checklist item at `bash scripts/bump-version.sh X.Y.Z` (notes it bumps all 7 + rolls the CHANGELOG), and adjust the CHANGELOG checklist item so notes are written under `## [Unreleased]` before bumping (the bump rolls them into `[X.Y.Z]`). Note that guard now re-asserts all 7."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Build the synchronized bump command

## Goal

Implement the versioning-design: a scripts/bump-version.sh that bumps all 7 package.json files via npm version and rolls the CHANGELOG, widen the spine's guard to assert all 7, and update RELEASING.md to drive the bump from the new command. No commit/tag, no interactive prompt.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Create `scripts/bump-version.sh X.Y.Z`: validate the arg is semver-core (X.Y.Z), cd to repo root, run `npm version "$VERSION" --workspaces --include-workspace-root --no-git-tag-version --allow-same-version` to bump all 7 package.json files, and print a closing reminder to review READMEs/CHANGELOG then commit + `git tag vX.Y.Z`. No git commit/tag in the script. | — | — | — |
| ✅ | 2 | Extend `scripts/bump-version.sh` with the CHANGELOG roll (an embedded `node` step, safer than sed): rename `## [Unreleased]` → add `## [X.Y.Z] - <UTC date>` under a fresh empty `## [Unreleased]`; rewrite the `[Unreleased]:` compare link to start at v$VERSION; insert a `[X.Y.Z]:` release-tag link. Fail with a clear message if CHANGELOG.md has no `[Unreleased]` section. | — | — | — |
| ✅ | 3 | Widen the spine's guard in `.github/workflows/release.yml`: change the version-sync loop from the 3 user-facing package.json files to all 7 (root, core, fs, app, mcp, cli, vscode) — the canonical list owned by this thread — and update the loop's comment to say so. | — | — | — |
| ✅ | 4 | Update `RELEASING.md`: point the “bump” checklist item at `bash scripts/bump-version.sh X.Y.Z` (notes it bumps all 7 + rolls the CHANGELOG), and adjust the CHANGELOG checklist item so notes are written under `## [Unreleased]` before bumping (the bump rolls them into `[X.Y.Z]`). Note that guard now re-asserts all 7. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
