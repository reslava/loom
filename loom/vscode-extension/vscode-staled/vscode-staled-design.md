---
type: design
id: de_01KR1QJGJV3V1J44JQX1FEVNSA
title: Stale doc detection and visualization in the VS Code tree
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: id_01KR1PS5JDB6P8WC93CZKDGAM8
requires_load: []
---
# Stale doc detection and visualization in the VS Code tree

## Problem

Three related gaps in the current tree:

1. **Plan stale badge is unreliable** — `createPlanNode` reads `plan.staled` (frontmatter flag) rather than computing `isPlanStale(plan, design)` from version numbers. If a design is refined but the MCP reducer doesn't set the flag, the plan silently misses the `⚠️ stale` badge.

2. **Ideas and designs have no stale indicator** — `getStaleDocs` detects parent-update staleness for all doc types, but the tree only exposes it for plans. A stale idea or design is invisible until the user runs validate manually.

3. **Summary counts not surfaced** — `LoomState.summary.stalePlans` and `summary.blockedSteps` are computed on every state load but appear nowhere in the UI.

## Architecture

### Data flow

```
getState() → LoomState
  state.weaves[w].threads[t].plans[p]   ← PlanDoc (has design_version, steps)
  state.weaves[w].threads[t].design     ← DesignDoc (has version)
  state.summary.stalePlans              ← count (already computed)
  state.summary.blockedSteps            ← count (already computed)
```

The tree already receives the full `LoomState` on every `loom://state` read. All data needed for staleness is already in memory — no extra MCP call required.

### Fix 1 — Plan stale badge (reliability)

In `treeProvider.ts` `createPlanNode`, replace:
```typescript
if (plan.staled) {
```
with inline version math using the design already available in the calling scope (`getThreadChildren` has both `thread.plans` and `thread.design`):
```typescript
const isStale = thread.design ? plan.design_version < thread.design.version : false;
if (isStale) {
```
This makes the badge match what `getState` counts in `summary.stalePlans`.

### Fix 2 — Stale badge for ideas and designs

In `createDocumentNode` / `createThreadNode`, add a `staleIds: Set<string>` parameter threaded from `getWeaveChildren` → `getThreadChildren` → `createDocumentNode`. Populate the set during `getWeaveChildren` by scanning each thread:

```
for each thread:
  if thread.idea && thread.design && design.updated > idea.updated → staleIds.add(idea.id)
  for each plan where plan.design_version < thread.design.version → staleIds.add(plan.id)
  (design staleness: design.parent_id is idea → if idea.updated > design.updated → staleIds.add(design.id))
```

When `createDocumentNode` receives a doc whose id is in `staleIds`, append `⚠️ stale` to the description.

This mirrors the timestamp heuristic in `getStaleDocs` without the extra MCP round-trip.

### Fix 3 — Summary header (optional, additive)

Add a non-clickable informational row at the top of `getRootChildren` when `summary.stalePlans > 0 || summary.blockedSteps > 0`:

```
⚠️  3 stale · 2 blocked          (TreeItem, no command, contextValue: 'summary-warning')
```

This gives a dashboard glance without changing individual node descriptions.

## Key decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Stale detection source for plans | Version math inline, not `plan.staled` flag | Flag can be stale itself; version math is always correct |
| Stale set population | During `getWeaveChildren` using state already in memory | No extra MCP call; O(docs) pass |
| Stale badge for designs/ideas | Same `⚠️ stale` suffix as plans | Visual consistency |
| Summary row | Additive, behind `summary.stalePlans > 0 \|\| blockedSteps > 0` | Zero noise when workspace is clean |

## Files touched

- `packages/vscode/src/tree/treeProvider.ts` — all changes live here
  - `createPlanNode`: fix stale condition
  - `getWeaveChildren` / `getThreadChildren`: build `staleIds` set, thread it through
  - `createDocumentNode`: accept and apply `staleIds`
  - `getRootChildren`: add summary warning row

## Open questions

- Should the summary row expand to list the stale docs, or just show the counts? (Expandable is richer but adds a custom node type.)
- Should stale designs also carry a `refine` context menu item injected by this change, or is that a separate concern?
