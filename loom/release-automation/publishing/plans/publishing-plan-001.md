---
type: plan
id: pl_01KT2GX2Q4C19PP3M8MZE08F8S
title: Fill the publish job bodies + dry-run + runbook
status: done
created: 2026-06-01
updated: 2026-06-01
version: 1
design_version: 1
tags: []
parent_id: de_01KT2G8X11XP9Z11D2QKK9E5NK
requires_load: []
target_version: 0.1.0
actual_release: 0.7.0
steps:
  - id: publish-npm
    order: 1
    status: done
    description: "publish-npm (`.github/workflows/release.yml`): replace the INTEGRATION POINT stub with `npm publish artifacts/reslava-loom-${VERSION}.tgz --access public` (publish the prebuilt tarball, not a re-publish from packages/cli — that would rerun prepublishOnly and drop the sourcemap). Keep the existing `npm view` skip-check and the `if: skip == 'false'` gate."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: publish-vsce
    order: 2
    status: done
    description: "publish-vsce (`.github/workflows/release.yml`): implement the existence check as `npx @vscode/vsce show reslava.loom-vscode --json` parsed with jq for the tag version (set skip=true if present), and replace the publish stub with `npx @vscode/vsce publish --no-dependencies --packagePath artifacts/loom-vscode-${VERSION}.vsix` (auth via VSCE_PAT env, no repackage)."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: publish-ovsx
    order: 3
    status: done
    description: "publish-ovsx (`.github/workflows/release.yml`): implement the existence check as `curl -fsSL https://open-vsx.org/api/reslava/loom-vscode/${VERSION}` (exit 0 = exists → skip=true), and replace the publish stub with `npx ovsx publish artifacts/loom-vscode-${VERSION}.vsix -p $OVSX_TOKEN`. Add a comment noting the one-time `ovsx create-namespace reslava` prerequisite (documented in RELEASING.md, not run by CI)."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: dry-run
    order: 4
    status: done
    description: "Dry-run (`.github/workflows/release.yml`): add a `workflow_dispatch` trigger with a `dry_run` boolean input alongside the existing tag trigger. When dry_run is true, the three publish steps run their no-consume variant (`npm publish --dry-run`; skip the actual vsce/ovsx publish) so guard → build-test → publish-wiring is exercised end-to-end without publishing. Ensure the `release` job is skipped on dry-run (no GitHub release for a non-publish)."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: runbook-releasing
    order: 5
    status: done
    description: "Runbook (`RELEASING.md`): expand the secrets section into a first-publish bootstrapping guide — how to mint each token (NPM_TOKEN automation token + @reslava scope; VSCE_PAT via Azure DevOps + create the `reslava` Marketplace publisher; OVSX_TOKEN + sign the agreement + `ovsx create-namespace reslava`), the `--access public` first-publish note, and how to run the dry-run via workflow_dispatch before the first real tag."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Fill the publish job bodies + dry-run + runbook

## Goal

Replace the three INTEGRATION POINT stubs in .github/workflows/release.yml with real, idempotent publish commands per publishing-design (Option A locked), add the existence-check queries, add a workflow_dispatch dry-run input, and expand RELEASING.md with token-minting + first-publish bootstrapping. After this, spine + publishing compose end-to-end: a dry-run exercises everything without consuming a version, and a real tag publishes all three artifacts idempotently.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | publish-npm (`.github/workflows/release.yml`): replace the INTEGRATION POINT stub with `npm publish artifacts/reslava-loom-${VERSION}.tgz --access public` (publish the prebuilt tarball, not a re-publish from packages/cli — that would rerun prepublishOnly and drop the sourcemap). Keep the existing `npm view` skip-check and the `if: skip == 'false'` gate. | — | — | — |
| ✅ | 2 | publish-vsce (`.github/workflows/release.yml`): implement the existence check as `npx @vscode/vsce show reslava.loom-vscode --json` parsed with jq for the tag version (set skip=true if present), and replace the publish stub with `npx @vscode/vsce publish --no-dependencies --packagePath artifacts/loom-vscode-${VERSION}.vsix` (auth via VSCE_PAT env, no repackage). | — | — | — |
| ✅ | 3 | publish-ovsx (`.github/workflows/release.yml`): implement the existence check as `curl -fsSL https://open-vsx.org/api/reslava/loom-vscode/${VERSION}` (exit 0 = exists → skip=true), and replace the publish stub with `npx ovsx publish artifacts/loom-vscode-${VERSION}.vsix -p $OVSX_TOKEN`. Add a comment noting the one-time `ovsx create-namespace reslava` prerequisite (documented in RELEASING.md, not run by CI). | — | — | — |
| ✅ | 4 | Dry-run (`.github/workflows/release.yml`): add a `workflow_dispatch` trigger with a `dry_run` boolean input alongside the existing tag trigger. When dry_run is true, the three publish steps run their no-consume variant (`npm publish --dry-run`; skip the actual vsce/ovsx publish) so guard → build-test → publish-wiring is exercised end-to-end without publishing. Ensure the `release` job is skipped on dry-run (no GitHub release for a non-publish). | — | — | — |
| ✅ | 5 | Runbook (`RELEASING.md`): expand the secrets section into a first-publish bootstrapping guide — how to mint each token (NPM_TOKEN automation token + @reslava scope; VSCE_PAT via Azure DevOps + create the `reslava` Marketplace publisher; OVSX_TOKEN + sign the agreement + `ovsx create-namespace reslava`), the `--access public` first-publish note, and how to run the dry-run via workflow_dispatch before the first real tag. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
