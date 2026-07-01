---
type: done
id: pl_01KR250PHSM2EASRGSPW9697PM-done
title: Done — Stale/blocked tree tweaks
status: done
created: "2026-05-07T00:00:00.000Z"
version: 3
tags: []
parent_id: pl_01KR250PHSM2EASRGSPW9697PM
requires_load: []
---
# Done — Stale/blocked tree tweaks

## Step 1 — Gate stale badge on active docs only: in createPlanNode guard isStale with plan.status !== 'done' && plan.status !== 'cancelled'; in getWeaveChildren guard stale idea with idea.status !== 'done' and stale design with design.status !== 'done' && design.status !== 'closed'. Build and verify done plans no longer show ⚠️ stale.

Edited `packages/vscode/src/tree/treeProvider.ts` in two places:

1. `createPlanNode` (line ~498): Changed `isStale` guard from `design ? plan.design_version < design.version : false` to `(design && plan.status !== 'done' && plan.status !== 'cancelled') ? plan.design_version < design.version : false`. Done/cancelled plans no longer receive the ⚠️ stale badge.

2. `getWeaveChildren` (lines ~307–308): Added status guards to the staleIds population:
   - Idea: added `&& thread.idea.status !== 'done'`
   - Design: added `&& thread.design.status !== 'done' && thread.design.status !== 'closed'`

Build passed (`npm run package` — 735.5 KB bundle, no type errors).

## Step 2 — Add 'stale' pseudo-status to the status filter: extend StatusFilter type and filterWeaves to treat 'stale' as matching any thread that contains at least one stale plan (design_version < design.version on a non-done plan) or a stale idea/design. Wire the new option into the filter bar UI so the user can select 'stale' and collapse the tree to only affected threads.

Two files edited:

**`packages/vscode/src/commands/filter.ts`**: Added `{ label: '$(warning) Stale', description: 'Threads with stale plans or docs', filter: ['stale'] }` to the QuickPick options in `setStatusFilter`.

**`packages/vscode/src/tree/treeProvider.ts`**:
- Added private `threadHasStale(t: Thread): boolean` helper that returns true if the thread has any non-done/cancelled plan with `design_version < design.version`, or a stale idea (design.updated > idea.updated and idea.status !== 'done'), or a stale design (idea.updated > design.updated and design.status !== 'done'/'closed').
- Updated `filterWeaves` to intercept the `'stale'` pseudo-status: when `statusFilter.includes('stale')`, a thread matches iff `this.threadHasStale(t)` instead of the normal `getThreadStatus` path.

Build passed (no type errors, 735.97 KB bundle).

## Step 3 — Add 'blocked' pseudo-status to the status filter: extend filterWeaves to treat 'blocked' as matching any thread whose implementing plans contain at least one step with a non-empty blockedBy array pointing to an unfinished predecessor. Wire into the filter bar UI alongside 'stale'.

Two files edited:

**`packages/vscode/src/commands/filter.ts`**: Added `{ label: '$(issues) Blocked', description: 'Threads with blocked steps in implementing plans', filter: ['blocked'] }` to the QuickPick options.

**`packages/vscode/src/tree/treeProvider.ts`**:
- Added private `threadHasBlocked(t: Thread): boolean` helper. It iterates only `implementing` plans, finds non-done steps with a non-empty `blockedBy` array, and resolves blockers: `Step N` references check if step N is still not done (mirrors `isStepBlocked` internal logic); cross-plan references are treated as blocked (best-effort, no link index in the tree layer — consistent with server-side behaviour for missing plans).
- Updated `filterWeaves` to intercept `'blocked'`: when `statusFilter.includes('blocked')`, a thread matches iff `this.threadHasBlocked(t)`.

Build passed (no type errors, 380.89 KB VSIX).
