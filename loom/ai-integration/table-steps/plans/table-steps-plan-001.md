---
type: plan
id: pl_01KQYFA0DCH6H1PZ2AYXRJC1RX
title: Wire steps array through loom_create_plan
status: done
created: "2026-05-06T00:00:00.000Z"
updated: "2026-05-06T00:00:00.000Z"
version: 2
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
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

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 0 | Fix `findDocumentById` + `gatherAllDocumentIds` to scan frontmatter `id` | `packages/fs/src/utils/pathUtils.ts` | — |
| ✅ | 1 | Update `generatePlanBody` to accept and render `steps?: string[]` | `packages/core/src/bodyGenerators/planBody.ts` | — |
| ✅ | 2 | Add `steps` to `WeavePlanInput` and pass through to body generator | `packages/app/src/weavePlan.ts` | 1 |
| ✅ | 3 | Add `steps` to `loom_create_plan` tool schema and pass to `weavePlan` | `packages/mcp/src/tools/createPlan.ts` | 2 |
| ✅ | 4 | Build all packages and verify | `packages/core`, `packages/app`, `packages/mcp`, `packages/vscode` | 3 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
