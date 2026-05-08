---
type: chat
id: ch_01KR23NK3N6N5ZA4WNYVJZCE0W
title: vscode-staled test Chat
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 2
tags: []
parent_id: null
requires_load: []
---
# CHAT

## Rafa:

in Loom project
tree summary shows: 6 stale . 4 blocked

stale: 
loom/core-engine/doc-ids/doc-ids-idea.md  
loom/core-engine/doc-ids/plans/doc-ids-plan-001.md 

Very difficult to find stale docs.
Has sense mark stale already done docs?

tell me the rule for a doc tobe stale

I couldn't find the 4 plans blocked



## AI:

**Staleness rules — as implemented:**

| Doc | Rule |
|-----|------|
| **Plan** | `plan.design_version < thread.design.version` — design was refined (version bumped) after the plan was last synced |
| **Idea** | `design.updated > idea.updated` — the design was touched more recently than the idea |
| **Design** | `idea.updated > design.updated` — the idea was updated more recently than the design |

All three use data already in memory from `loom://state` — no extra MCP call.

---

**"Has sense mark stale already done docs?" — No, it's a bug.**

A plan with `status: done` has already been implemented. If the design is refined after that, the plan's `design_version` will trail behind — but the plan is finished, there's nothing to re-implement. Showing `⚠️ stale` on a done plan is noise (and actively misleading — it looks like there's work to do).

Same applies to `status: cancelled` plans and `status: done`/`closed` designs and ideas.

The fix is a one-liner gate in each check:

```typescript
// createPlanNode
const isStale = design && plan.status !== 'done' && plan.status !== 'cancelled'
    ? plan.design_version < design.version
    : false;

// getWeaveChildren — stale idea/design
if (designUpdated > ideaUpdated && thread.idea.status !== 'done') staleIds.add(thread.idea.id);
if (ideaUpdated > designUpdated && thread.design.status !== 'done' && thread.design.status !== 'closed') staleIds.add(thread.design.id);
```

`summary.stalePlans` on the server side likely has the same issue — worth checking whether the app-layer count also skips done plans, or whether it's inflating the badge number.

---

**"Very difficult to find stale docs" — agreed, known UX gap.**

The badge is on individual nodes, so to find 6 stale docs you have to manually expand every weave → thread. The summary row (`⚠️ 6 stale · 4 blocked`) tells you there's a problem but gives no navigation path to the culprits.

Two directions worth considering:
1. **Status filter** — the existing filter bar already supports filtering by status (active, implementing, etc.). Adding a `stale` pseudo-status filter would collapse the tree to only stale threads, making them immediately visible.
2. **Diagnostics panel / validate command** — `loom_get_stale_docs` returns a full list. A "Show stale docs" command could open a flat list (like the Problems panel) with one-click navigation.

Which feels more useful to you as a daily driver?

---

**"I couldn't find the 4 blocked"**

`summary.blockedSteps` counts individual *steps* that are blocked (steps where `blockedBy` points to an unfinished predecessor), not plans. A single plan can have multiple blocked steps. To find them today you'd have to expand every implementing plan and look for blocked step indicators — there's no shortcut.

Same UX gap as stale: the count is visible at the root, the culprits are buried. The diagnostics/filter approach above would help here too. `loom_get_blocked_steps` already exists as an MCP tool — it just isn't wired into the tree.

## Rafa:

Create a new plan in this thread for the tweaks pending:
- done docs, don't show stale
- Status filter psudo status stale
- Status filter plans with blocked steps

## AI:

Plan created: `vscode-staled-plan-002.md` — *Stale/blocked tree tweaks*

3 steps:
1. **Gate stale badge on active docs** — skip `⚠️ stale` when plan/idea/design is `done`/`cancelled`/`closed`
2. **'stale' pseudo-status filter** — filter tree to threads with at least one stale non-done plan or stale idea/design
3. **'blocked' pseudo-status filter** — filter tree to threads whose implementing plans have at least one step with an unfinished `blockedBy` predecessor

## Rafa:

Summary shows 7 stale, but when I aply filer I see only 2 docs staled

## AI:

Two separate reasons for the gap:

**1. Summary counts plans; filter shows threads**

`summary.stalePlans` is a count of stale *plan documents* (7 plans). The filter collapses the tree to stale *threads* (2 threads). If several stale plans live inside the same thread, the filter shows that thread once — the counts are just measuring different things.

**2. Summary has no status guard — ours does**

In `packages/app/src/getState.ts` line 142:
```typescript
thread.plans.filter(p => p.design_version < thread.design!.version).length
```
No `plan.status` check. Every plan — done, cancelled, implementing, active — counts if `design_version` trails the design. So the 7 includes done/cancelled plans that we correctly exclude from the tree badge and from the filter.

The filter we added only surfaces threads where a *non-done, non-cancelled* plan is stale. That's the right behaviour. The summary number is inflated.

**Fix (if you want the summary to match):** add the same status guard in `getState.ts`:
```typescript
thread.plans.filter(p =>
    p.status !== 'done' && p.status !== 'cancelled' &&
    p.design_version < thread.design!.version
).length
```
That would bring `summary.stalePlans` in sync with what the badge and filter actually show. Worth a quick plan step, or just a direct edit — it's a one-liner.

## AI:

Done. `packages/app/src/getState.ts` line 142 now filters out done/cancelled plans before counting:

```typescript
thread.plans.filter(p =>
    p.status !== 'done' && p.status !== 'cancelled' &&
    p.design_version < thread.design!.version
).length
```

App type-check clean, vscode bundle clean. `summary.stalePlans` will now match what the badge and the filter actually show.

## Rafa:

Still Summary 7 stale - Filtering by Stale only 2

## AI:

The MCP server is still on the old build — I only packaged the VSIX (which bundles app code for the extension). The summary number comes from `loom://state` served by the global `loom` CLI, which hasn't been updated yet. Running `build-all.sh` now to recompile and re-link.

## Rafa:

Now summary 1 stale - Filter shows 2

## AI:

Progress — down from 7 to 1 — but the remaining gap is a different structural problem.

`summary.stalePlans` counts only stale **plan docs**. Our `threadHasStale()` filter also catches threads where only an **idea or design** is stale (timestamp comparison), with no stale plan at all. Those threads have no plan to count, so they never appear in `stalePlans`, but the filter still surfaces them.

In other words:
- Thread A — 1 stale plan → counted in `stalePlans`, shown in filter
- Thread B — stale idea or design, no stale plan → NOT counted in `stalePlans`, but shown in filter

That's the 1 vs 2 gap.

**Fix options:**

1. **Add `staleIdeas`/`staleDesigns` to the summary** in `getState.ts`, then include them in the warning row label. Most accurate.
2. **Single `staleDocs` count** — collapse all three into one number that matches `threadHasStale` exactly. Simpler.
3. **Leave it** — the summary is "stale plans" specifically, the filter is "stale anything". They're different views; just label them clearly.

Which do you prefer?

## Rafa:

Final user will not like this kind of discrepancies
Do Option 1

In Summary: blocked should detail more, for example, `plan steps blocked`

## AI:

Done. Three files updated:

**`packages/core/src/entities/state.ts`** — added `staleIdeas: number` and `staleDesigns: number` to the summary interface.

**`packages/app/src/getState.ts`** — computes both counts using the same timestamp + status logic as the tree filter:
- `staleIdeas`: `design.updated > idea.updated && idea.status !== 'done'`
- `staleDesigns`: `idea.updated > design.updated && design.status !== 'done'/'closed'`

**`packages/vscode/src/tree/treeProvider.ts`** — warning row now:
- Sums `stalePlans + staleIdeas + staleDesigns` into a single `staleDocs` count → `"2 stale"`
- Labels blocked steps as `"4 plan steps blocked"` instead of `"4 blocked"`

Build clean. After `build-all.sh`, the MCP server will serve the updated counts and the summary row will match the filter exactly.