---
type: design
id: de_01KR1QJJS01WWY5KWEAZ1X0GFB
title: Surface blocked steps per-plan in the VS Code tree
status: done
created: 2026-05-07
updated: 2026-05-08
version: 3
idea_version: 3
tags: []
parent_id: id_01KR1PS6ZQ3K0AT96SKE4XQKRP
requires_load: []
---
# Surface blocked steps per-plan in the VS Code tree

## Problem

`LoomState.summary.blockedSteps` is computed on every `getState` call but never visualized. A plan with blocked steps looks identical to a normal implementing plan — no badge, no icon variant, no description suffix. The user has no tree-level signal that a plan is stuck until they open the file and read the steps table.

The `plan-implementing-doable` contextValue distinguishes only whether *any* pending step exists, not whether steps are blocked. A plan where all pending steps are blocked will still show as `plan-implementing-doable` if `hasPending === true`.

## Architecture

### Data flow

```
getState()
  state.index                           ← LinkIndex (blockedBy resolution)
  state.weaves[w].threads[t].plans[p]
    .steps[s].done                      ← boolean
    .steps[s].blockedBy                 ← string[] (plan IDs)
```

`isStepBlocked(step, plan, index)` is already in `packages/core/src/planUtils.ts`. The link index is in `state.index`. Both are available to the tree provider via `this.state`.

### Approach

Compute per-plan blocked-step count in `createPlanNode` using the link index from `this.state.index`:

```typescript
const blockedCount = (plan.steps ?? []).filter(
  s => !s.done && isStepBlocked(s, plan, this.state!.index)
).length;
```

**Description suffix logic:**

| Condition | Description shown |
|-----------|------------------|
| `plan.staled` / version mismatch | `{progress} · {status} ⚠️ stale` |
| `blockedCount > 0`, all pending blocked | `{progress} · {blockedCount} blocked 🚫` |
| `blockedCount > 0`, some unblocked | `{progress} · Step N: … ({blockedCount} blocked)` |
| Normal implementing | `{progress} · Step N: {description}` |
| Otherwise | `{progress} · {status}` |

**contextValue adjustment:**

Current: `plan-implementing-doable` when `status === 'implementing' && hasPending`.
Proposed addition: if all pending steps are blocked, use `plan-implementing-blocked` instead. This lets context menus suppress the `DoStep` button when there's nothing executable.

```typescript
const allPendingBlocked = hasPending && (plan.steps ?? []).filter(s => !s.done).every(
  s => isStepBlocked(s, plan, this.state!.index)
);
node.contextValue = allPendingBlocked
  ? 'plan-implementing-blocked'
  : (plan.status === 'implementing' && hasPending ? 'plan-implementing-doable' : `plan-${plan.status}`);
```

### Import boundary

`isStepBlocked` lives in `@reslava-loom/core`. The VS Code extension already imports from core (`getWeaveStatus`, `getThreadStatus`, `isPlanStale` etc.), so this is within the existing import pattern — not a new boundary violation.

## Key decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Where to compute | `createPlanNode` inline | Has plan, thread, and index in scope |
| Import of `isStepBlocked` | Direct from `@reslava-loom/core/dist` | Already importing core; no new dependency |
| contextValue for all-blocked | `plan-implementing-blocked` | Suppresses DoStep button when nothing can run |
| Next-step preview | Show first *unblocked* pending step | More useful than showing a blocked step the user can't act on |

## Files touched

- `packages/vscode/src/tree/treeProvider.ts`
  - `createPlanNode`: compute `blockedCount`, adjust description and contextValue
  - Import `isStepBlocked` from core
- `packages/vscode/package.json` (view contribution) — add `plan-implementing-blocked` to `when` clauses if DoStep button needs suppressing

## Open questions

- Should blocked plans use a distinct icon (e.g. `warning` codicon) or just a description suffix? The plan already uses `warning` for `status === 'blocked'` (plan-level block via MCP), so a suffix is less noisy for step-level blocks.
- Does `plan-implementing-blocked` need a context menu entry "Show blocked steps" that opens the plan file, or is the description suffix enough?
