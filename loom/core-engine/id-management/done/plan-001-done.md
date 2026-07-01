---
type: plan
id: pl_01KQYDFDDCPMZT3CX4Z6YFYE1C
title: Implement Automatic Document ID Management
status: done
created: "2026-04-15T00:00:00.000Z"
version: 1
design_version: 1
tags: [id, linking, ux]
parent_id: de_01KQYDFDDC2GWRSG7TVP5Z5MAN
requires_load: [de_01KQYDFDDC2GWRSG7TVP5Z5MAN]
target_version: 0.3.0
steps:
  - id: create-id-utilities-kebab-case-uniqueness
    order: 1
    status: done
    description: Create ID utilities (kebab-case, uniqueness check)
    files_touched: ["`packages/core/src/idUtils.ts`"]
    blocked_by: []
    satisfies: []
  - id: update-to-create-temporary-ids
    order: 2
    status: done
    description: Update `loom weave` to create temporary IDs
    files_touched: ["`packages/cli/src/commands/weave.ts`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: implement-command
    order: 3
    status: done
    description: Implement `loom finalize` command
    files_touched: ["`packages/cli/src/commands/finalize.ts`"]
    blocked_by: [Steps 1, 2]
    satisfies: []
  - id: implement-command-with-reference-updating
    order: 4
    status: done
    description: Implement `loom rename` command with reference updating
    files_touched: ["`packages/cli/src/commands/rename.ts`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: add-file-watcher-diagnostics-for-id
    order: 5
    status: pending
    description: Add file watcher diagnostics for ID mismatches (deferred to VS Code extension)
    files_touched: ["`packages/vscode/src/diagnostics.ts` (deferred)"]
    blocked_by: []
    satisfies: []
  - id: enhance-to-fix-id-issues
    order: 6
    status: pending
    description: Enhance `loom repair` to fix ID issues
    files_touched: ["`packages/cli/src/commands/repair.ts`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: test-with-sample-documents
    order: 7
    status: done
    description: Test with sample documents
    files_touched: ["`tests/id-management.test.ts`"]
    blocked_by: [All]
    satisfies: []
---

# Implement Automatic Document ID Management

| | |
|---|---|
| **Created** | 2026-04-15 |
| **Status** | DRAFT |
| **Design** | `id-management-design.md` |
| **Target version** | 0.3.0 |

---

## Goal

Implement automatic ID generation, temporary draft IDs, and the `loom rename` command to eliminate manual ID maintenance and prevent broken links.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Create ID utilities (kebab-case, uniqueness check) | `packages/core/src/idUtils.ts` | — | — |
| ✅ | 2 | Update `loom weave` to create temporary IDs | `packages/cli/src/commands/weave.ts` | Step 1 | — |
| ✅ | 3 | Implement `loom finalize` command | `packages/cli/src/commands/finalize.ts` | Steps 1, 2 | — |
| ✅ | 4 | Implement `loom rename` command with reference updating | `packages/cli/src/commands/rename.ts` | Step 1 | — |
| 🔳 | 5 | Add file watcher diagnostics for ID mismatches (deferred to VS Code extension) | `packages/vscode/src/diagnostics.ts` (deferred) | — | — |
| 🔳 | 6 | Enhance `loom repair` to fix ID issues | `packages/cli/src/commands/repair.ts` | Step 1 | — |
| ✅ | 7 | Test with sample documents | `tests/id-management.test.ts` | All | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |