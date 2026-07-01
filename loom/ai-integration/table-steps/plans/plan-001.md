---
type: plan
id: pl_01KQYFA0DCH6H1PZ2AYXRJC1RX
title: Wire steps array through loom_create_plan
status: done
created: 2026-05-06
updated: 2026-05-06
version: 2
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 0.5.0
steps:
  - id: fix-to-scan-frontmatter
    order: 0
    status: done
    description: Fix `findDocumentById` + `gatherAllDocumentIds` to scan frontmatter `id`
    files_touched: ["`packages/fs/src/utils/pathUtils.ts`"]
    blocked_by: []
    satisfies: []
  - id: update-to-accept-and-render
    order: 1
    status: done
    description: "Update `generatePlanBody` to accept and render `steps?: string[]`"
    files_touched: ["`packages/core/src/bodyGenerators/planBody.ts`"]
    blocked_by: []
    satisfies: []
  - id: add-to-and-pass-through-to
    order: 2
    status: done
    description: Add `steps` to `WeavePlanInput` and pass through to body generator
    files_touched: ["`packages/app/src/weavePlan.ts`"]
    blocked_by: [1]
    satisfies: []
  - id: add-to-tool-schema-and-pass
    order: 3
    status: done
    description: Add `steps` to `loom_create_plan` tool schema and pass to `weavePlan`
    files_touched: ["`packages/mcp/src/tools/createPlan.ts`"]
    blocked_by: [2]
    satisfies: []
  - id: build-all-packages-and-verify
    order: 4
    status: done
    description: Build all packages and verify
    files_touched: ["`packages/core`", "`packages/app`", "`packages/mcp`", "`packages/vscode`"]
    blocked_by: [3]
    satisfies: []
---
# Wire steps array through loom_create_plan

| | |
|---|---|
| **Created** | 2026-05-06 |
| **Status** | DONE |
| **Target version** | 0.1.0 |

---

## Goal

Add `steps?: string[]` parameter all the way from `loom_create_plan` tool → `weavePlan()` app function → `generatePlanBody()` core generator, so that a single `loom_create_plan` call produces a plan doc with both the steps table and the detailed step sections populated from the same source array. Eliminates the follow-up `loom_update_doc` pattern that dropped the table.

Also fixed `findDocumentById` and `gatherAllDocumentIds` in `packages/fs/src/utils/pathUtils.ts` — were searching by filename instead of frontmatter `id`, breaking `loom_update_doc` for every doc post-ULID migration.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 0 | Fix `findDocumentById` + `gatherAllDocumentIds` to scan frontmatter `id` | `packages/fs/src/utils/pathUtils.ts` | — | — |
| ✅ | 1 | Update `generatePlanBody` to accept and render `steps?: string[]` | `packages/core/src/bodyGenerators/planBody.ts` | — | — |
| ✅ | 2 | Add `steps` to `WeavePlanInput` and pass through to body generator | `packages/app/src/weavePlan.ts` | 1 | — |
| ✅ | 3 | Add `steps` to `loom_create_plan` tool schema and pass to `weavePlan` | `packages/mcp/src/tools/createPlan.ts` | 2 | — |
| ✅ | 4 | Build all packages and verify | `packages/core`, `packages/app`, `packages/mcp`, `packages/vscode` | 3 | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
