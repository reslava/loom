---
type: plan
id: id-management-plan-001
title: "Implement Automatic Document ID Management"
status: draft
created: 2026-04-15
version: 1
design_version: 1
tags: [id, linking, ux]
parent_id: id-management-design
target_version: "0.3.0"
requires_load: [id-management-design]
---

# Plan — Implement Automatic Document ID Management

| | |
|---|---|
| **Created** | 2026-04-15 |
| **Status** | DRAFT |
| **Design** | `id-management-design.md` |
| **Target version** | 0.3.0 |

---

# Goal

Implement automatic ID generation, temporary draft IDs, and the `loom rename` command to eliminate manual ID maintenance and prevent broken links.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create ID utilities (kebab-case, uniqueness check) | `packages/core/src/idUtils.ts` | — |
| ✅ | 2 | Update `loom weave` to create temporary IDs | `packages/cli/src/commands/weave.ts` | Step 1 |
| ✅ | 3 | Implement `loom finalize` command | `packages/cli/src/commands/finalize.ts` | Steps 1, 2 |
| ✅ | 4 | Implement `loom rename` command with reference updating | `packages/cli/src/commands/rename.ts` | Step 1 |
| ⏳ | 5 | Add file watcher diagnostics for ID mismatches (deferred to VS Code extension) | `packages/vscode/src/diagnostics.ts` (deferred) | — |
| ⏳ | 6 | Enhance `loom repair` to fix ID issues | `packages/cli/src/commands/repair.ts` | Step 1 |
| ✅ | 7 | Test with sample documents | `tests/id-management.test.ts` | All |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |