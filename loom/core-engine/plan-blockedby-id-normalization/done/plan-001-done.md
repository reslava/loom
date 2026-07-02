---
type: done
id: pl_01KWGV4H908G6AV83NG6H6TY5X-done
title: Done — plan-blockedby-id-normalization Plan
status: done
created: 2026-07-02
version: 2
tags: []
parent_id: pl_01KWGV4H908G6AV83NG6H6TY5X
requires_load: []
---
# Done — plan-blockedby-id-normalization Plan

## Step 1 — Add a pure `resolveBlockedByIds(entries, orderedStepIds)` helper in packages/core: a numeric ('1') or 'Step N' entry resolves to orderedStepIds[N-1]; an already-known step-id slug or a plan-id (pl_…) passes through; an out-of-range numeric entry throws; result is deduped and a self-referencing id is rejected. Add unit tests covering each branch.

Added the pure `resolveBlockedByIds(entries, orderedStepIds, selfId?)` helper in `packages/core/src/planUtils.ts` (next to `isStepBlocked`, whose read-time ordinal regex `/^(?:Step\s+)?(\d+)$/i` it mirrors for the write side). Behaviour: numeric / "Step N" entry → id at that 1-based position; non-numeric (step-id slug or `pl_…` plan-id) → passthrough; out-of-range ordinal → throws; result deduped (an ordinal and the slug it resolves to collapse to one edge); an entry resolving to `selfId` → throws.

Exported it from `packages/core/src/index.ts` (the named re-export list — no wildcard — so it had to be added explicitly).

Tests: `tests/resolve-blockedby-ids.test.ts` covering every branch (empty, numeric, "Step N" case/space, slug + plan-id passthrough, mixed, out-of-range throw, dedupe, self-block via ordinal and slug, signed-number passthrough), wired into `scripts/test-all.sh`.

**Harness correction:** the plan's step-1 `files_touched` said `packages/core/test/`, but those jest files are **orphaned** — `test-all.sh` runs standalone ts-node tests in the root `tests/` dir (custom `assert`, importing built `packages/core/dist`) and there is no jest config or `test` script, so jest tests never run. Test therefore written in the `tests/` ts-node style and wired in.

Verification: `tsc --noEmit -p packages/core/tsconfig.json` passes (exit 0). Functional run deferred to step 4's `build-all` + `test-all` (the test imports `core/dist`, which step 4 rebuilds).

Actual files: `packages/core/src/planUtils.ts`, `packages/core/src/index.ts`, `tests/resolve-blockedby-ids.test.ts`, `scripts/test-all.sh`.

## Step 2 — Wire resolveBlockedByIds into buildStructuredSteps (packages/app/src/weavePlan.ts) as a two-pass build: assign every step id by order first, then resolve each step's blockedBy against that ordered id list before persisting.

Wired the resolver into the create path. `packages/app/src/weavePlan.ts`: added `resolveBlockedByIds` to the core import and rewrote `buildStructuredSteps` as a **two-pass** build — pass 1 assigns every step's stable slug id by order; pass 2 builds the steps, resolving each `blockedBy` against `orderedStepIds` with the step's own id as `selfId`. Ordinals are now persisted as slug ids; slugs/plan-ids pass through; out-of-range throws. Files: `packages/app/src/weavePlan.ts`.

## Step 3 — Call the same helper from the ADD_STEP and UPDATE_STEP reducers (packages/core/src/events/planEvents.ts and the plan reducer) so a numeric blockedBy supplied via loom_add_step / loom_update_step normalizes identically — create and update converge on one codepath.

Wired the SAME helper into the step-mutation reducers so create and update converge on one codepath. The reducer lives at `packages/core/src/reducers/planReducer.ts` (not `planReducer.ts` at src root as the plan guessed — corrected). `UPDATE_STEP`: resolve `patch.blockedBy` against the current ordered step ids with `selfId = stepId`. `ADD_STEP`: after splicing the new step in, resolve ITS `blockedBy` against the final post-insert order (`selfId` = new id) — existing steps already carry slug ids, so only the new one is resolved. Files: `packages/core/src/reducers/planReducer.ts`.

## Step 4 — Add integration tests: create a plan with blockedBy ['1','2'] persists slug ids; round-trip via loom_list_plan_steps shows slugs; reordering keeps edges pointing at the same logical steps; out-of-range ordinal errors; a pl_… plan-id and an already-slug entry pass through; add/update-step numeric input normalizes identically. Then run ./scripts/build-all.sh + ./scripts/test-all.sh and fix any fallout.

Integration test `tests/blockedby-normalization.test.ts` (wired into `scripts/test-all.sh`): create persists ordinal blockedBy as slug ids; slug + `pl_…` passthrough; out-of-range ordinal at create throws; `UPDATE_STEP` numeric → slug + out-of-range throws; `ADD_STEP` numeric resolves against final order; a `REORDER_STEPS` keeps slug edges pointing at the same steps. `./scripts/build-all.sh` green (exit 0); `./scripts/test-all.sh` green — all suites, 0 failed, MCP integration 18/18. Both new tests also verified in isolation. Files: `tests/blockedby-normalization.test.ts`, `scripts/test-all.sh`.
