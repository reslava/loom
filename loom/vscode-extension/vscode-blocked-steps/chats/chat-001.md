---
type: chat
id: ch_01KR36V7NR68KSTAK9PZEP6VP9
title: vscode-blocked-steps Chat
status: done
created: "2026-05-08T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 2
tags: []
parent_id: null
requires_load: []
---
# vscode-blocked-steps Chat

## Rafa:

This thread has a stale plan v1, while idea and design are v2.
I think plan do not need to be refined, but could you verify it?

## AI:

Verified — the plan does **not** need refinement.

The 5 steps match design v2 exactly:

| Plan step | Design section |
|-----------|---------------|
| 1. Import `isStepBlocked` | "Import boundary" |
| 2. Compute `blockedCount` in `createPlanNode` | "Approach" code block |
| 3. Description suffix logic (blocked/partial/normal) | "Description suffix logic" table |
| 4. Adjust `contextValue` → `plan-implementing-blocked` | "contextValue adjustment" code block |
| 5. Build and smoke-test | Standard |

The stale flag is purely a `design_version` bookkeeping artifact (plan has `design_version: 1`, design is `version: 2`). The upgrade from v1→v2 didn't change scope, approach, or files touched — the plan was already written against the final design shape.

To clear the stale flag, just bump `design_version` to `2` in the plan's frontmatter. No step changes needed.

---

**Separate finding — thread-context MCP broken for this thread.**

`loom://thread-context/vscode-extension/vscode-blocked-steps` returns ENOENT because it looks for `plans/pl_01KR1QMHV0RTMJ2N8XE068G2GY.md` (ID-based filename), but the plan was created as `plans/vscode-blocked-steps-plan-001.md` (human-readable filename). The plan's frontmatter `id` field is correct — the disconnect is in how the thread-context resource resolves the plan path. Either the resource should use the filename from the file-system scan rather than constructing the path from the ID, or this plan needs to be renamed to match. Worth noting as a bug in the MCP resource loader.



## AI:

Bug fixed and verified. `loom://thread-context/vscode-extension/vscode-blocked-steps` now resolves correctly.

**Root cause:** `threadContext.ts` was constructing the plan path as `plans/${activePlan.id}.md`, but plans with human-readable filenames (like `vscode-blocked-steps-plan-001.md`) don't match their ID. `loadDoc` sets `_path` on every loaded document — the fix uses that instead.

**Fix (one line, `packages/mcp/src/resources/threadContext.ts`):**
```diff
- const planPath = path.join(root, 'loom', weaveId, threadId, 'plans', `${activePlan.id}.md`);
+ const planPath = (activePlan as any)._path ?? path.join(root, 'loom', weaveId, threadId, 'plans', `${activePlan.id}.md`);
```

The fallback keeps backward compatibility for any plans that happen to use ID-as-filename.

Also noticed: the plan's `design_version` is already `2` in the loaded output — the stale flag was cleared somewhere between our earlier read and now.

## Rafa:

The plan is done, but I do not see any block icon. Step 5 was smooke test, but i think it was not checked.
I created a test plan: loom/test/test/plans/test-plan-001.md


## AI:

Two problems with the test plan, not the implementation:

**1. Plan status must be `implementing`**

`createPlanNode` gates the blocked description on `plan.status === 'implementing'` (lines 576, 578 of `treeProvider.ts`). The test plan has `status: active`. Change it to `implementing`.

**2. `blockedBy` values must use "Step N" format**

`parseStepsTable` stores the raw cell values as `blockedBy` strings. `isStepBlocked` matches against `/^Step\s+(\d+)$/i` — so the value must literally be `Step 4`, not `4`.

The test plan has:
```
| 🔳 | 2 | | — | 4, 5 |
| 🔳 | 4 | | — | 3 |
```

These produce `blockedBy: ["4", "5"]` and `blockedBy: ["3"]` — neither matches `Step N` and neither contains `-plan-`, so `isStepBlocked` returns `false` for all of them.

Fix the test plan:
```
| 🔳 | 2 | | — | Step 4, Step 5 |
| 🔳 | 4 | | — | Step 3 |
```
and `status: implementing`.

With those two changes, step 2 will be blocked (by step 4 which is blocked by step 3 which is pending), step 4 will be blocked (by step 3 which is pending), steps 1, 3, 5 will be unblocked. `blockedCount` will be at least 2, and the description suffix should show.

## Rafa:

test plan now shows now: `(2 blocked)`
but we always used: BlockedBy 1,2,4 syntax for Steps.
read this plan steps table: loom/mvp/mvp/plans/mvp-plan-to-publish-plan.md, not show any blocked

i think just numbers is enough for steps blocking, agree?

we should stand clearly what is the canonical format for blockedBy steps plan column, so when create a plan by smapling create a correct format always

also in the in the future, blockedBy could be by other plan, how to format that?
plan-id -> for entire plan
plan-id 3,5 -> for steps 3,5 of that plan

what you think?

## AI:

Agreed — plain numbers are the established convention (the mvp plan uses them throughout: `1, 2, 3, 4`, `6`, `7, 8`, etc.) and the canonical format. `Step N` was overspecified.

Fix is one regex change in `packages/core/src/planUtils.ts`:

```diff
- const stepMatch = blocker.match(/^Step\s+(\d+)$/i);
+ const stepMatch = blocker.match(/^(?:Step\s+)?(\d+)$/i);
```

This makes `isStepBlocked` accept both `4` and `Step 4` — additive, no breakage. The mvp plan will then show blocked steps correctly in the tree.

## Rafa:

tree sumary shows 15 plan steps blocked
i filter by blocked
2 plans show blocked steps
  loom/test/test/plans/test-plan-001.md -> 2
  loom/mvp/mvp/plans/mvp-plan-to-publish-plan.md -> 7

i think the count should be 2+7 = 9
check why summary count is higher
maybe count 3 per blockBy 3,4,5 . This is 1 step blocked, not 3

## AI:

Not a counting bug — the 6 extra come from `loom/core-engine/core-engine/plans/archived-document-link-handling-plan-001.md`, which has `status: active` and 6 blocked steps using `Step N` format (Steps 2–7, all blocked transitively by Step 1).

The inconsistency is:

- `getState.ts` counts blocked steps across **all** plans regardless of status
- `threadHasBlocked` in the tree provider only looks at `status === 'implementing'` plans → thread doesn't appear in the blocked filter

So 15 = 6 (active plan) + 7 (mvp, implementing) + 2 (test, implementing). The tree filter can only surface 9.

**Fix:** `getState.ts` should only count blocked steps in `implementing` plans — matching the same logic as `threadHasBlocked`. An `active` plan hasn't started yet; its blocked steps aren't blocking real progress. One-line fix:

```diff
- if (!step.done && isStepBlocked(step, plan, index)) {
+ if (plan.status === 'implementing' && !step.done && isStepBlocked(step, plan, index)) {
```

Shall I apply it?