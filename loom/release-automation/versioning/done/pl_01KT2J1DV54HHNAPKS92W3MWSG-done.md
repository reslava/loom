---
type: done
id: pl_01KT2J1DV54HHNAPKS92W3MWSG-done
title: Done — Build the synchronized bump command
status: done
created: "2026-06-01T00:00:00.000Z"
version: 4
tags: []
parent_id: pl_01KT2J1DV54HHNAPKS92W3MWSG
requires_load: []
---
# Done — Build the synchronized bump command

## Step 1 — Create `scripts/bump-version.sh X.Y.Z`: validate the arg is semver-core (X.Y.Z), cd to repo root, run `npm version "$VERSION" --workspaces --include-workspace-root --no-git-tag-version --allow-same-version` to bump all 7 package.json files, and print a closing reminder to review READMEs/CHANGELOG then commit + `git tag vX.Y.Z`. No git commit/tag in the script.

Created `scripts/bump-version.sh`. Validates `$1` against `^[0-9]+\.[0-9]+\.[0-9]+$` (usage error + exit 1 otherwise), `cd`s to repo root, then runs `npm version "$VERSION" --workspaces --include-workspace-root --no-git-tag-version --allow-same-version` — bumps all 7 package.json in one shot, no git commit/tag. Closes with a reminder to review READMEs/CHANGELOG then `git commit` + `git tag vX.Y.Z` + `git push --follow-tags`. Verified: arg validation rejects `not-semver` with exit 1; `bash -n` syntax-clean. (Did not run the real bump — it would mutate the repo's version.)

## Step 2 — Extend `scripts/bump-version.sh` with the CHANGELOG roll (an embedded `node` step, safer than sed): rename `## [Unreleased]` → add `## [X.Y.Z] - <UTC date>` under a fresh empty `## [Unreleased]`; rewrite the `[Unreleased]:` compare link to start at v$VERSION; insert a `[X.Y.Z]:` release-tag link. Fail with a clear message if CHANGELOG.md has no `[Unreleased]` section.

Added the CHANGELOG roll to `bump-version.sh` as an embedded `VERSION="$VERSION" node <<'NODE'` step (node string-surgery, not sed). It: (a) errors if there's no `## [Unreleased]` section; (b) replaces the `## [Unreleased]` heading with `## [Unreleased]\n\n## [X.Y.Z] - <UTC date>` so the current Unreleased body becomes the dated section and a fresh empty Unreleased sits on top; (c) rewrites the `[Unreleased]:` compare-link to `compare/vX.Y.Z...HEAD` and inserts a `[X.Y.Z]: …/releases/tag/vX.Y.Z` ref beneath it. Verified on a throwaway copy with VERSION=0.8.0: produced empty `[Unreleased]` → `## [0.8.0] - 2026-06-01` → existing `## [0.7.0]`, with correct `[Unreleased]`/`[0.8.0]`/`[0.7.0]` link refs. Used `^## \[Unreleased\]$` (exact line, no `\s*`) to avoid the multiline-greedy match eating the following blank line.

## Step 3 — Widen the spine's guard in `.github/workflows/release.yml`: change the version-sync loop from the 3 user-facing package.json files to all 7 (root, core, fs, app, mcp, cli, vscode) — the canonical list owned by this thread — and update the loop's comment to say so.

Widened the spine's `guard` version-sync loop in `release.yml` from the 3 user-facing files to all 7 version-bearing `package.json`s (root + core/fs/app/mcp/cli/vscode), and updated the loop comment to state this is the canonical version-source list owned by `versioning`. The assertion logic is otherwise unchanged — each file's `.version` must equal the tag (or the package.json-derived version on a dry-run). Verified `release.yml` still parses as YAML and the loop now lists all 7.

## Step 4 — Update `RELEASING.md`: point the “bump” checklist item at `bash scripts/bump-version.sh X.Y.Z` (notes it bumps all 7 + rolls the CHANGELOG), and adjust the CHANGELOG checklist item so notes are written under `## [Unreleased]` before bumping (the bump rolls them into `[X.Y.Z]`). Note that guard now re-asserts all 7.

Updated the `RELEASING.md` pre-tag checklist: replaced the old "bump everywhere" + "write the [X.Y.Z] section" items with a coherent ordered pair — (1) **Record changes under `## [Unreleased]`** as you go (the bump rolls it into `[X.Y.Z]`), then (2) **Bump the synchronized version** via `bash scripts/bump-version.sh X.Y.Z` (bumps all 7 package.json + rolls the CHANGELOG; no commit/tag). The machine-checked annotations now read "guard re-asserts all 7" and "release fails if no `[X.Y.Z]` section". README review moved after the bump. This closes the loop: the runbook now drives the bump from the versioning command, and the CHANGELOG authoring flow (write under Unreleased → bump rolls it) matches how the bump script and the release-job extraction actually work.

End state: the whole `release-automation` weave is complete — `versioning` (bump command) → `release-pipeline` (spine) → `publishing` (publish bodies) compose. Remaining before a first real release is operational only (mint tokens, create publisher/namespace, run the dry-run).
