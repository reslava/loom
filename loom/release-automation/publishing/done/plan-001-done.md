---
type: done
id: pl_01KT2GX2Q4C19PP3M8MZE08F8S-done
title: Done — Fill the publish job bodies + dry-run + runbook
status: done
created: "2026-06-01T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KT2GX2Q4C19PP3M8MZE08F8S
requires_load: []
---
# Done — Fill the publish job bodies + dry-run + runbook

## Step 1 — publish-npm (`.github/workflows/release.yml`): replace the INTEGRATION POINT stub with `npm publish artifacts/reslava-loom-${VERSION}.tgz --access public` (publish the prebuilt tarball, not a re-publish from packages/cli — that would rerun prepublishOnly and drop the sourcemap). Keep the existing `npm view` skip-check and the `if: skip == 'false'` gate.

`publish-npm` body in `release.yml`: replaced the `INTEGRATION POINT` stub with `npm publish "artifacts/reslava-loom-${VERSION}.tgz" --access public` (the prebuilt tarball from the spine's `release-artifacts`, not a re-publish from `packages/cli/` — that would rerun `prepublishOnly` and drop the sourcemap, reopening Option A). Kept the existing `npm view` skip-check and the `if: steps.check.outputs.skip == 'false'` gate. Auth via `NODE_AUTH_TOKEN`←`NPM_TOKEN` (already wired by setup-node with the npm registry-url).

## Step 2 — publish-vsce (`.github/workflows/release.yml`): implement the existence check as `npx @vscode/vsce show reslava.loom-vscode --json` parsed with jq for the tag version (set skip=true if present), and replace the publish stub with `npx @vscode/vsce publish --no-dependencies --packagePath artifacts/loom-vscode-${VERSION}.vsix` (auth via VSCE_PAT env, no repackage).

`publish-vsce` in `release.yml`: existence check now runs `npx @vscode/vsce show reslava.loom-vscode --json` piped to `jq -e 'any(.versions[]?; .version == $v)'` (used `any(...)` for a single boolean — `jq -e` exits 0 ⇒ version present ⇒ `skip=true`; else `skip=false`). Publish body replaced with `npx @vscode/vsce publish --no-dependencies --packagePath "artifacts/loom-vscode-${VERSION}.vsix"` — publishes the prebuilt vsix (no repackage), auth via the `VSCE_PAT` env already wired on the step.

## Step 3 — publish-ovsx (`.github/workflows/release.yml`): implement the existence check as `curl -fsSL https://open-vsx.org/api/reslava/loom-vscode/${VERSION}` (exit 0 = exists → skip=true), and replace the publish stub with `npx ovsx publish artifacts/loom-vscode-${VERSION}.vsix -p $OVSX_TOKEN`. Add a comment noting the one-time `ovsx create-namespace reslava` prerequisite (documented in RELEASING.md, not run by CI).

`publish-ovsx` in `release.yml`: existence check now runs `curl -fsSL "https://open-vsx.org/api/reslava/loom-vscode/$VERSION"` — `-f` makes a 404 a non-zero exit, so exit 0 ⇒ version exists ⇒ `skip=true`, else `skip=false`. Publish body replaced with `npx ovsx publish "artifacts/loom-vscode-${VERSION}.vsix" -p "$OVSX_TOKEN"` (same prebuilt vsix as the Marketplace; `OVSX_TOKEN` env already wired). Added an inline comment for the one-time `npx ovsx create-namespace reslava` prerequisite, pointing to RELEASING.md — CI does not run it.

## Step 4 — Dry-run (`.github/workflows/release.yml`): add a `workflow_dispatch` trigger with a `dry_run` boolean input alongside the existing tag trigger. When dry_run is true, the three publish steps run their no-consume variant (`npm publish --dry-run`; skip the actual vsce/ovsx publish) so guard → build-test → publish-wiring is exercised end-to-end without publishing. Ensure the `release` job is skipped on dry-run (no GitHub release for a non-publish).

Dry-run wiring in `release.yml` (spans guard + 3 publish steps + release, as expected):
- **Trigger:** added `workflow_dispatch` with a `dry_run` boolean input (`default: true` — a manual run is safe by default) alongside the tag `push` trigger.
- **guard:** branches on `$GITHUB_EVENT_NAME` — on `workflow_dispatch` there's no tag, so VERSION is read from root `package.json`; on `push` it's parsed from the tag. The three-way `package.json` sync assertion runs in both modes (validates the files agree).
- **publish steps:** each gets `DRY_RUN: ${{ github.event_name == 'workflow_dispatch' && inputs.dry_run }}` (renders "true"/"false"). When true: npm runs `npm publish … --dry-run`; vsce/ovsx echo + `exit 0` (the vsix was already built/validated in build-test). When false: real publish.
- **release job:** added `if: github.event_name == 'push'` so a manual/dry-run never cuts a GitHub release.
- Updated the file's stale header comment (was describing the publish bodies as unimplemented INTEGRATION POINT stubs) to describe the now-complete spine+publishing split and the dry-run.

Verified: `release.yml` parses as valid YAML; all three publish steps carry the DRY_RUN env; `release.if == github.event_name == 'push'`; no `INTEGRATION POINT` / `TODO(publishing)` references remain (the only `exit 1`s left are the legit guard version-mismatch and release CHANGELOG gates).

## Step 5 — Runbook (`RELEASING.md`): expand the secrets section into a first-publish bootstrapping guide — how to mint each token (NPM_TOKEN automation token + @reslava scope; VSCE_PAT via Azure DevOps + create the `reslava` Marketplace publisher; OVSX_TOKEN + sign the agreement + `ovsx create-namespace reslava`), the `--access public` first-publish note, and how to run the dry-run via workflow_dispatch before the first real tag.

`RELEASING.md` runbook:
- Replaced the thin "Secrets the workflow needs" table with a **First-time setup (one-time)** section: a how-to-mint column for each secret — NPM_TOKEN (automation token, `@reslava` scope must pre-exist), VSCE_PAT (create the `reslava` Marketplace publisher via Azure DevOps, then a PAT with Marketplace→Manage), OVSX_TOKEN (sign the Publisher Agreement, then `ovsx create-namespace reslava` once), GITHUB_TOKEN (auto) — plus first-publish notes (`--access public`; publisher/namespace must exist or publish 404s).
- Added a **Dry-run before the first real tag** section: Actions → release → Run workflow → `dry_run: true`, what it does (version from package.json; npm --dry-run; marketplace steps skip; no release).
- Updated the **Known risks** section (was a now-false "publish bodies are stubs" warning) to the real gotchas: dev build ships a sourcemap by design (Option A); idempotency checks depend on `vsce show --json` / Open VSX HTTP API formats, and a re-run is always safe.

End-to-end state: spine + publishing now compose. A `dry_run` workflow_dispatch exercises guard → build-test → publish-wiring without consuming a version; a real `vX.Y.Z` tag publishes the CLI tarball to npm and the same `.vsix` to Marketplace + Open VSX (each idempotent), then cuts the GitHub release from the CHANGELOG section. Remaining before a first real release is operational, not code: mint the three tokens + create the Marketplace publisher / Open VSX namespace (per the runbook), then run a dry-run.
