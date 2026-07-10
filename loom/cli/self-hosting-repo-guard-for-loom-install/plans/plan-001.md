---
type: plan
id: pl_01KX3VNXAY62W4A86DNQ863WRE
title: self-hosting-repo-guard-for-loom-install Plan
status: done
created: 2026-07-09
updated: 2026-07-09
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 1.22.0
steps:
  - id: added-a-self-hosting-guard-to
    order: 1
    status: done
    description: "Added a self-hosting guard to installWorkspace: a new injectable `loomSettings` reader (packages/app/src/utils/loomSettings.ts) reads `selfHosting` from `.loom/settings.json`, and install returns a total no-op (skipped: 'self-hosting') from ABOVE the --force branch, so the CLI, the loom_install MCP tool, and the extension's silent activation refresh all short-circuit with zero writes"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: surfaced-the-skip-on-the-cli
    order: 2
    status: done
    description: "Surfaced the skip on the `loom install` CLI command and added the `skipped: 'self-hosting' | null` field to InstallWorkspaceResult"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: set-in-this-repo-s-tracked
    order: 3
    status: done
    description: "Set `selfHosting: true` in this repo's `.loom/settings.json` (tracked, travels with the repo)"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: deleted-the-gitignored-install-artifacts-and
    order: 4
    status: done
    description: Deleted the gitignored install artifacts `.loom/CLAUDE.md` and `CLAUDE-LOCAL.md` and removed their two `@import` lines from the root `CLAUDE.md`, so this repo's bespoke recursive contract is the only session contract loaded
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: verified-end-to-end-guard-is
    order: 5
    status: done
    description: "Verified end-to-end: guard is a no-op even with --force, a normal repo still installs fully, and ./scripts/test-all.sh is green (23 passed)"
    files_touched: []
    blocked_by: []
    satisfies: []
---
# self-hosting-repo-guard-for-loom-install Plan

## Goal

Quick-ship record of 5 completed changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Added a self-hosting guard to installWorkspace: a new injectable `loomSettings` reader (packages/app/src/utils/loomSettings.ts) reads `selfHosting` from `.loom/settings.json`, and install returns a total no-op (skipped: 'self-hosting') from ABOVE the --force branch, so the CLI, the loom_install MCP tool, and the extension's silent activation refresh all short-circuit with zero writes | — | — | — |
| ✅ | 2 | Surfaced the skip on the `loom install` CLI command and added the `skipped: 'self-hosting' \| null` field to InstallWorkspaceResult | — | — | — |
| ✅ | 3 | Set `selfHosting: true` in this repo's `.loom/settings.json` (tracked, travels with the repo) | — | — | — |
| ✅ | 4 | Deleted the gitignored install artifacts `.loom/CLAUDE.md` and `CLAUDE-LOCAL.md` and removed their two `@import` lines from the root `CLAUDE.md`, so this repo's bespoke recursive contract is the only session contract loaded | — | — | — |
| ✅ | 5 | Verified end-to-end: guard is a no-op even with --force, a normal repo still installs fully, and ./scripts/test-all.sh is green (23 passed) | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
