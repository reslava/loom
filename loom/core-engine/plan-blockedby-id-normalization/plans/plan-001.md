---
type: plan
id: pl_01KWGV4H908G6AV83NG6H6TY5X
title: plan-blockedby-id-normalization Plan
status: done
created: 2026-07-02
updated: 2026-07-02
version: 1
design_version: 1
tags: []
parent_id: de_01KWGTDV2BKCYGE8THQYVBPXT3
requires_load: []
target_version: 0.1.0
steps:
  - id: resolve-blockedby-ids-helper
    order: 1
    status: done
    description: "Add a pure `resolveBlockedByIds(entries, orderedStepIds)` helper in packages/core: a numeric ('1') or 'Step N' entry resolves to orderedStepIds[N-1]; an already-known step-id slug or a plan-id (pl_…) passes through; an out-of-range numeric entry throws; result is deduped and a self-referencing id is rejected. Add unit tests covering each branch."
    files_touched: [packages/core/src/planUtils.ts, packages/core/test/]
    blocked_by: []
    satisfies: []
  - id: wire-create-path
    order: 2
    status: done
    description: "Wire resolveBlockedByIds into buildStructuredSteps (packages/app/src/weavePlan.ts) as a two-pass build: assign every step id by order first, then resolve each step's blockedBy against that ordered id list before persisting."
    files_touched: [packages/app/src/weavePlan.ts]
    blocked_by: [resolve-blockedby-ids-helper]
    satisfies: []
  - id: wire-add-update-reducers
    order: 3
    status: done
    description: Call the same helper from the ADD_STEP and UPDATE_STEP reducers (packages/core/src/events/planEvents.ts and the plan reducer) so a numeric blockedBy supplied via loom_add_step / loom_update_step normalizes identically — create and update converge on one codepath.
    files_touched: [packages/core/src/events/planEvents.ts, packages/core/src/planReducer.ts]
    blocked_by: [resolve-blockedby-ids-helper]
    satisfies: []
  - id: integration-tests-and-build
    order: 4
    status: done
    description: "Add integration tests: create a plan with blockedBy ['1','2'] persists slug ids; round-trip via loom_list_plan_steps shows slugs; reordering keeps edges pointing at the same logical steps; out-of-range ordinal errors; a pl_… plan-id and an already-slug entry pass through; add/update-step numeric input normalizes identically. Then run ./scripts/build-all.sh + ./scripts/test-all.sh and fix any fallout."
    files_touched: [tests/, scripts/build-all.sh, scripts/test-all.sh]
    blocked_by: [wire-create-path, wire-add-update-reducers]
    satisfies: []
---
# plan-blockedby-id-normalization Plan

## Goal

Make loom_create_plan (and the add/update-step reducers) persist step `blockedBy` as stable step-id slugs instead of raw ordinals, by introducing one shared pure core resolver used by every write path. Ordinals stay accepted on input but are normalized to ids at write time (out-of-range → error); non-numeric slugs and plan-ids pass through. This removes the latent correctness bug where a freshly-created plan's dependency graph silently mis-points after a reorder.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a pure `resolveBlockedByIds(entries, orderedStepIds)` helper in packages/core: a numeric ('1') or 'Step N' entry resolves to orderedStepIds[N-1]; an already-known step-id slug or a plan-id (pl_…) passes through; an out-of-range numeric entry throws; result is deduped and a self-referencing id is rejected. Add unit tests covering each branch. | packages/core/src/planUtils.ts, packages/core/test/ | — | — |
| ✅ | 2 | Wire resolveBlockedByIds into buildStructuredSteps (packages/app/src/weavePlan.ts) as a two-pass build: assign every step id by order first, then resolve each step's blockedBy against that ordered id list before persisting. | packages/app/src/weavePlan.ts | resolve-blockedby-ids-helper | — |
| ✅ | 3 | Call the same helper from the ADD_STEP and UPDATE_STEP reducers (packages/core/src/events/planEvents.ts and the plan reducer) so a numeric blockedBy supplied via loom_add_step / loom_update_step normalizes identically — create and update converge on one codepath. | packages/core/src/events/planEvents.ts, packages/core/src/planReducer.ts | resolve-blockedby-ids-helper | — |
| ✅ | 4 | Add integration tests: create a plan with blockedBy ['1','2'] persists slug ids; round-trip via loom_list_plan_steps shows slugs; reordering keeps edges pointing at the same logical steps; out-of-range ordinal errors; a pl_… plan-id and an already-slug entry pass through; add/update-step numeric input normalizes identically. Then run ./scripts/build-all.sh + ./scripts/test-all.sh and fix any fallout. | tests/, scripts/build-all.sh, scripts/test-all.sh | wire-create-path, wire-add-update-reducers | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
