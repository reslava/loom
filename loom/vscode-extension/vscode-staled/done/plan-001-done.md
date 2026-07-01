---
type: done
id: pl_01KR1QMG9ZKPB6464QWQP7J12Y-done
title: Done — Stale doc detection and visualization
status: done
created: "2026-05-07T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KR1QMG9ZKPB6464QWQP7J12Y
requires_load: []
---
# Done — Stale doc detection and visualization

## Step 1 — Fix createPlanNode stale condition: replace plan.staled flag check with inline version math (plan.design_version < thread.design.version). Pass thread.design into createPlanNode from getThreadChildren.

**File edited:** `packages/vscode/src/tree/treeProvider.ts`

- Added `DesignDoc` import from `@reslava-loom/core/dist/entities/design`.
- Updated `createPlanNode` signature: added `design?: DesignDoc` as 5th parameter.
- Replaced `if (plan.staled)` with `const isStale = design ? plan.design_version < design.version : false; if (isStale)` — stale detection now uses version math instead of the frontmatter flag.
- In `getThreadChildren`, updated the `createPlanNode` call to pass `thread.design` as the new 5th argument.

## Step 2 — Build staleIds set in getWeaveChildren/getThreadChildren: for each thread compute stale ideas (idea.updated < design.updated) and stale designs (design.updated < idea.updated via parent_id). Thread staleIds: Set<string> through to createDocumentNode.

**File edited:** `packages/vscode/src/tree/treeProvider.ts`

- In `getWeaveChildren`: added `staleIds = new Set<string>()` pre-loop that scans all threads. Populates it with:
  - `thread.idea.id` when `design.updated > idea.updated` (idea is stale — design was refined after)
  - `thread.design.id` when `idea.updated > design.updated` (design is stale — idea was updated after)
  - `plan.id` for each plan where `plan.design_version < thread.design.version` (plan is stale)
- Updated `createThreadNode(thread, weaveId, staleIds)` signature — accepts `staleIds: Set<string>` with empty-set default; passes it to `getThreadChildren`.
- Updated `getThreadChildren(thread, weaveId, staleIds)` signature — accepts `staleIds: Set<string>` with empty-set default; passes it as 5th arg to `createDocumentNode` calls for idea and design nodes.
- Updated `createDocumentNode` signature to add `staleIds?: Set<string>` as optional 5th parameter (no behavior added yet — Step 3 applies the badge).

## Step 3 — Apply stale badge in createDocumentNode: when doc.id is in staleIds, append '⚠️ stale' to node.description. Update tooltip accordingly.

**File edited:** `packages/vscode/src/tree/treeProvider.ts`

In `createDocumentNode`:
- Added `const isStale = staleIds?.has(doc.id) ?? false;`
- Changed `node.description` to `isStale ? \`${doc.status} ⚠️ stale\` : doc.status`
- Changed `node.tooltip` to `isStale ? \`${doc.type} • ${doc.status} ⚠️ stale\` : \`${doc.type} • ${doc.status}\``

This makes idea and design nodes show `⚠️ stale` suffix in the tree description and tooltip when their id is in the `staleIds` set populated by Step 2. Visual pattern matches the existing plan stale badge.

## Step 4 — Add summary warning row in getRootChildren: when state.summary.stalePlans > 0 or state.summary.blockedSteps > 0, prepend a non-clickable TreeItem showing the counts (e.g. '⚠️ 3 stale · 2 blocked').

**File edited:** `packages/vscode/src/tree/treeProvider.ts`

In `getRootChildren`, after `groupWeaves` builds the `nodes` array: added a summary warning block guarded by `stalePlans > 0 || blockedSteps > 0` (destructured from `this.state.summary`). When triggered, creates a non-clickable `TreeItem` with label `⚠️ N stale · M blocked` (parts joined only when non-zero), `contextValue: 'summary-warning'`, and `iconPath: ThemeIcon('warning')`. Node is `unshift`-ed to the front of `nodes` so it appears at the top of the tree. When the workspace is clean (both counts zero) no node is inserted — zero noise.

## Step 5 — Build and smoke-test: run build-all.sh, open the extension in Extension Development Host, verify stale badges appear on plans whose design bumped, on ideas/designs with parent-update staleness, and that the summary row shows correct counts.

**Build:** ran `./scripts/build-all.sh` — all packages (core, fs, app, cli, vscode, mcp) compiled without errors.

**Smoke-test:** requires VS Code Extension Development Host (F5 launch) — cannot be done headlessly from CLI. Rafa needs to:
1. Press F5 in VS Code to launch Extension Development Host.
2. Confirm a plan node whose design was bumped shows `⚠️ stale` in its description.
3. Confirm an idea or design node whose parent was updated more recently shows `⚠️ stale`.
4. Confirm the root `⚠️ N stale · M blocked` summary row appears when `summary.stalePlans > 0` or `summary.blockedSteps > 0`.
5. Confirm the summary row is absent when the workspace has no stale or blocked docs.

**Code review snapshot:** all four logic points are in `packages/vscode/src/tree/treeProvider.ts`:
- `createPlanNode` (line ~480): `isStale` from version math, not `plan.staled`
- `getWeaveChildren` (line ~290): builds `staleIds` set by scanning threads
- `createDocumentNode` (line ~440): applies `⚠️ stale` to description + tooltip
- `getRootChildren` (line ~115): summary warning row via `nodes.unshift`
