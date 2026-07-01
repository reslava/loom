---
type: done
id: pl_01KR1QMHV0RTMJ2N8XE068G2GY-done
title: Done — Surface blocked steps per-plan
status: done
created: "2026-05-08T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KR1QMHV0RTMJ2N8XE068G2GY
requires_load: []
---
# Done — Surface blocked steps per-plan

## Step 1 — Import isStepBlocked from @reslava-loom/core/dist/planUtils in treeProvider.ts.

Added `import { isStepBlocked } from '@reslava-loom/core/dist/planUtils';` on line 14 of `packages/vscode/src/tree/treeProvider.ts`, directly after the existing `getWeaveStatus`/`getThreadStatus` import from `@reslava-loom/core/dist/derived`. No new dependency boundary introduced — extension already imports from core.

## Step 2 — Compute blockedCount in createPlanNode: filter plan.steps for !done steps, call isStepBlocked(s, plan, this.state!.index) for each, count results.

Added `blockedCount` computation in `createPlanNode` (`packages/vscode/src/tree/treeProvider.ts`) just before the `hasPending` / `contextValue` block. Guards against `this.state` being null (returns 0 when state is unavailable). Uses the `isStepBlocked` import added in step 1 with `this.state!.index` as the LinkIndex.

## Step 3 — Update description logic in createPlanNode: when blockedCount > 0 and all pending steps are blocked show '{progress} · {blockedCount} blocked 🚫'; when some but not all are blocked show next unblocked step with '({blockedCount} blocked)' suffix.

Updated description logic in `createPlanNode` (`packages/vscode/src/tree/treeProvider.ts`). Added `pendingSteps` + `allPendingBlocked` derived values. Four cases now handled in order: (1) stale → `{progress} · {status} ⚠️ stale` (fixed: was missing progress prefix), (2) all-pending-blocked → `{progress} · N blocked 🚫`, (3) some-blocked → first unblocked pending step label with `(N blocked)` suffix, (4) normal implementing → unchanged. First-unblocked step resolved by re-running `isStepBlocked` over pending steps; falls back to `nextStep` when `state` is null.

## Step 4 — Adjust contextValue: introduce plan-implementing-blocked when all pending steps are blocked; keep plan-implementing-doable only when at least one unblocked pending step exists. Update package.json when clauses if the DoStep button needs suppressing for plan-implementing-blocked.

Updated `contextValue` assignment in `createPlanNode` (`packages/vscode/src/tree/treeProvider.ts`): now emits `plan-implementing-blocked` when `plan.status === 'implementing' && allPendingBlocked` (reuses the `allPendingBlocked` variable computed in step 3), `plan-implementing-doable` when implementing with at least one unblocked pending step, else `plan-{status}`. No changes needed to `packages/vscode/package.json`: both `loom.doStep` and `loom.completeStep` inline buttons already have `when: viewItem == plan-implementing-doable`, so they are already suppressed for the new `plan-implementing-blocked` contextValue.

## Step 5 — Build and smoke-test: run build-all.sh, verify a plan with a blockedBy dependency shows the blocked suffix, DoStep is hidden/disabled when all pending steps are blocked, and normal plans are unaffected.

Ran `./scripts/build-all.sh`. Initial build failed: TS2448/2454 — `blockedCount` declared after use because steps 2 and 3 inserted code in non-declaration order. Fixed by consolidating `pendingSteps`, `hasPending`, `blockedCount`, and `allPendingBlocked` into a single declaration block at the top of the description section (lines 568–573), before any description logic. Also simplified `blockedCount` computation to filter `pendingSteps` directly (no `!s.done` guard needed since `pendingSteps` is already filtered). Second build succeeded: all 6 packages compiled clean. Visual smoke-test not possible from CLI (no running VS Code instance), but the TypeScript types are satisfied: `isStepBlocked` receives `{ order, blockedBy }` steps matching its signature, and `this.state!.index` is `LinkIndex` as required.
