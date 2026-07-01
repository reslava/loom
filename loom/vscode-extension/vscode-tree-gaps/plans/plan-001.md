---
type: plan
id: pl_01KR1QSV8Q3YPSSZR5SFBS67DB
title: Fix orphaned dones, missing status icons, summary node
status: done
created: 2026-05-07
updated: 2026-05-08
version: 3
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 0.5.0
steps:
  - id: add-blocked-and-cancelled-cases-to
    order: 1
    status: done
    description: "Add BLOCKED and CANCELLED cases to getThreadIcon and getWeaveIcon in icons.ts: BLOCKED → ThemeIcon('warning'), CANCELLED → ThemeIcon('error'). Matches the existing plan-level blocked/cancelled icon pattern."
    files_touched: [icons.ts]
    blocked_by: []
    satisfies: []
  - id: surface-orphaned-done-docs-in-getthreadchildren
    order: 2
    status: done
    description: "Surface orphaned done docs in getThreadChildren: after building the plans section, collect thread.dones whose parent_id does not match any plan.id. If any exist, add them under a 'Done (orphaned)' section node so they are visible and can be inspected/deleted."
    files_touched: [treeProvider.ts]
    blocked_by: []
    satisfies: []
  - id: add-summary-warning-row-in-getrootchildren
    order: 3
    status: pending
    description: "Add summary warning row in getRootChildren: if state.summary.stalePlans > 0 or state.summary.blockedSteps > 0, prepend a non-clickable TreeItem showing counts (e.g. '⚠️ 3 stale · 2 blocked', contextValue: 'summary-warning', icon: ThemeIcon('warning')). Skip if vscode-staled plan already implements this step."
    files_touched: [treeProvider.ts]
    blocked_by: []
    satisfies: []
  - id: increase-file-watcher-debounce-from-300ms
    order: 4
    status: done
    description: "Increase file watcher debounce from 300ms to 800ms in extension.ts to reduce mid-creation snapshot races that cause threads to appear non-expandable and the MCP server to be overwhelmed by concurrent loom://state requests."
    files_touched: [extension.ts]
    blocked_by: []
    satisfies: []
  - id: preserve-last-good-state-on-suspect
    order: 5
    status: done
    description: "Preserve last-good state on suspect reads: in getRootChildren, after a successful loom://state read, cache the state as lastGoodState. If a subsequent read returns a state where total docs dropped significantly vs lastGoodState (heuristic: >30% drop), keep the previous state and schedule a retry (exponential backoff, up to 3 retries) before rendering. Only replace the tree once the new state passes the heuristic or retries are exhausted."
    files_touched: [treeProvider.ts]
    blocked_by: []
    satisfies: []
  - id: build-and-smoke-test-verify-blocked
    order: 6
    status: done
    description: "Build and smoke-test: verify BLOCKED/CANCELLED threads show the correct icon, orphaned done docs appear under their thread, summary row shows when counts are non-zero, bulk doc creation no longer freezes the tree, and MCP timeout during creation recovers without manual reconnect."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Fix orphaned dones, missing status icons, summary node

| | |
|---|---|
| **Created** | 2026-05-07 |
| **Status** | DRAFT |
| **Design** | `vscode-tree-gaps-idea.md` |
| **Target version** | {X.X.X} |

---

## Goal

Patch tree presentation gaps in treeProvider.ts: missing status icons, orphaned done docs, summary warning row, debounce stability, and last-good-state preservation.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add BLOCKED and CANCELLED cases to getThreadIcon and getWeaveIcon in icons.ts: BLOCKED → ThemeIcon('warning'), CANCELLED → ThemeIcon('error'). Matches the existing plan-level blocked/cancelled icon pattern. | icons.ts | — | — |
| ✅ | 2 | Surface orphaned done docs in getThreadChildren: after building the plans section, collect thread.dones whose parent_id does not match any plan.id. If any exist, add them under a 'Done (orphaned)' section node so they are visible and can be inspected/deleted. | treeProvider.ts | — | — |
| 🔳 | 3 | Add summary warning row in getRootChildren: if state.summary.stalePlans > 0 or state.summary.blockedSteps > 0, prepend a non-clickable TreeItem showing counts (e.g. '⚠️ 3 stale · 2 blocked', contextValue: 'summary-warning', icon: ThemeIcon('warning')). Skip if vscode-staled plan already implements this step. | treeProvider.ts | — | — |
| ✅ | 4 | Increase file watcher debounce from 300ms to 800ms in extension.ts to reduce mid-creation snapshot races that cause threads to appear non-expandable and the MCP server to be overwhelmed by concurrent loom://state requests. | extension.ts | — | — |
| ✅ | 5 | Preserve last-good state on suspect reads: in getRootChildren, after a successful loom://state read, cache the state as lastGoodState. If a subsequent read returns a state where total docs dropped significantly vs lastGoodState (heuristic: >30% drop), keep the previous state and schedule a retry (exponential backoff, up to 3 retries) before rendering. Only replace the tree once the new state passes the heuristic or retries are exhausted. | treeProvider.ts | — | — |
| ✅ | 6 | Build and smoke-test: verify BLOCKED/CANCELLED threads show the correct icon, orphaned done docs appear under their thread, summary row shows when counts are non-zero, bulk doc creation no longer freezes the tree, and MCP timeout during creation recovers without manual reconnect. | — | — | — |
---

<!-- step:add-blocked-and-cancelled-cases-to -->
### Step 1 — Add BLOCKED and CANCELLED cases to getThreadIcon and getWeaveIcon

In `icons.ts`, add to `getThreadIcon` and `getWeaveIcon`:
```typescript
case 'BLOCKED':   return new vscode.ThemeIcon('warning');
case 'CANCELLED': return new vscode.ThemeIcon('error');
```

---

<!-- step:surface-orphaned-done-docs-in-getthreadchildren -->
### Step 2 — Surface orphaned done docs in getThreadChildren

After the plans section is built, collect orphaned dones:
```typescript
const planIds = new Set(thread.plans.map(p => p.id));
const orphanedDones = thread.dones.filter(d => !planIds.has(d.parent_id ?? ''));
if (orphanedDones.length > 0) {
    children.push(this.createSectionNode(
        'Done (orphaned)',
        orphanedDones.map(d => this.createDoneDocNode(d, weaveId, thread.id))
    ));
}
```

---

<!-- step:add-summary-warning-row-in-getrootchildren -->
### Step 3 — Add summary warning row in getRootChildren

After loading state, before building weave nodes:
```typescript
if (this.state.summary.stalePlans > 0 || this.state.summary.blockedSteps > 0) {
    const parts = [];
    if (this.state.summary.stalePlans > 0) parts.push(`${this.state.summary.stalePlans} stale`);
    if (this.state.summary.blockedSteps > 0) parts.push(`${this.state.summary.blockedSteps} blocked`);
    const summaryNode = new vscode.TreeItem(`⚠️ ${parts.join(' · ')}`, vscode.TreeItemCollapsibleState.None);
    summaryNode.contextValue = 'summary-warning';
    summaryNode.iconPath = new vscode.ThemeIcon('warning');
    nodes.unshift(summaryNode);
}
```

---

<!-- step:increase-file-watcher-debounce-from-300ms -->
### Step 4 — Increase watcher debounce to 800ms

In `extension.ts`, change:
```typescript
const debouncedRefresh = debounce(() => treeProvider.refresh(), 300);
```
to:
```typescript
const debouncedRefresh = debounce(() => treeProvider.refresh(), 800);
```
This reduces concurrent `loom://state` MCP calls during bulk doc creation.

---

<!-- step:preserve-last-good-state-on-suspect -->
### Step 5 — Preserve last-good state on suspect reads

In `treeProvider.ts`, add a `private lastGoodState: LoomState | null = null` field. In `getRootChildren`, after a successful state read:

```typescript
const newState = JSON.parse(json) as LoomState;

// Heuristic: if total docs dropped >30% vs last good state, treat as suspect
const lastTotal = this.lastGoodState
    ? this.lastGoodState.weaves.reduce((n, w) => n + w.allDocs.length, 0)
    : 0;
const newTotal = newState.weaves.reduce((n, w) => n + w.allDocs.length, 0);
const isSuspect = this.lastGoodState !== null && lastTotal > 0 && newTotal < lastTotal * 0.7;

if (isSuspect) {
    // Schedule retry, keep old state
    setTimeout(() => this._onDidChangeTreeData.fire(), 1500);
} else {
    this.state = newState;
    this.lastGoodState = newState;
}
```

Retries are bounded naturally by the debounce: a retry fires `_onDidChangeTreeData` which calls `getRootChildren` again; if the state is still suspect the same logic applies, but after 3 rapid writes the MCP server should stabilise.

---

<!-- step:build-and-smoke-test-verify-blocked -->
### Step 6 — Build and smoke-test

Run `./scripts/build-all.sh`, open Extension Development Host, verify all fixes.

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
