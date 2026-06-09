---
type: plan
id: pl_01KR3HE7MVDRPA7TK3R01Z9BDQ
title: MCP State Cache + Connection Resilience
status: done
created: "2026-05-08T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 1
design_version: 1
tags: []
parent_id: de_01KR3HCJF2C79JFQHVX87S9WYD
requires_load: []
target_version: 0.1.0
steps:
  - id: add-statecache
    order: 1
    status: done
    description: Add stateCache.ts module in packages/mcp/src/ — module-level LoomState
    files_touched: ["null cache + fs.watch watcher (recursive) on {root}/loom — exports initStateCache(root)", getCachedState(), setCachedState(state), invalidateStateCache()]
    blocked_by: []
    satisfies: []
  - id: wire-cache-into-handlestateresource-in-packages
    order: 2
    status: done
    description: Wire cache into handleStateResource in packages/mcp/src/resources/state.ts — call initStateCache(root), return cached state for unfiltered reads (no weaveId/status params), store result after computing; filtered reads bypass cache
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: fix-silent-connect-failure-in-packages
    order: 3
    status: done
    description: Fix silent connect-failure in packages/vscode/src/mcp-client.ts — capture connectError in closure, rethrow in ensureConnected() so callers get an immediate throw instead of hanging on a dead transport
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-readstatewithretry-helper-in-packages-vscode
    order: 4
    status: done
    description: Add readStateWithRetry helper in packages/vscode/src/tree/treeProvider.ts getRootChildren — 3 attempts, 500ms delay, skip retry on timeout errors (those go straight to reconnect node)
    files_touched: []
    blocked_by: []
    satisfies: []
---
# MCP State Cache + Connection Resilience

| | |
|---|---|
| **Created** | 2026-05-08 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Eliminate the freeze-reconnect loop by caching MCP state server-side, fixing the silent connect-failure hang, and adding a retry layer in the tree provider.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add stateCache.ts module in packages/mcp/src/ — module-level LoomState | null cache + fs.watch watcher (recursive) on {root}/loom — exports initStateCache(root), getCachedState(), setCachedState(state), invalidateStateCache() | — | — |
| ✅ | 2 | Wire cache into handleStateResource in packages/mcp/src/resources/state.ts — call initStateCache(root), return cached state for unfiltered reads (no weaveId/status params), store result after computing; filtered reads bypass cache | — | — | — |
| ✅ | 3 | Fix silent connect-failure in packages/vscode/src/mcp-client.ts — capture connectError in closure, rethrow in ensureConnected() so callers get an immediate throw instead of hanging on a dead transport | — | — | — |
| ✅ | 4 | Add readStateWithRetry helper in packages/vscode/src/tree/treeProvider.ts getRootChildren — 3 attempts, 500ms delay, skip retry on timeout errors (those go straight to reconnect node) | — | — | — |
---

### Step 1 — Add stateCache.ts module in packages/mcp/src/ — module-level LoomState|null cache + fs.watch watcher (recursive) on {root}/loom — exports initStateCache(root), getCachedState(), setCachedState(state), invalidateStateCache()

<!-- Detailed spec. -->

---

### Step 2 — Wire cache into handleStateResource in packages/mcp/src/resources/state.ts — call initStateCache(root), return cached state for unfiltered reads (no weaveId/status params), store result after computing; filtered reads bypass cache

<!-- Detailed spec. -->

---

### Step 3 — Fix silent connect-failure in packages/vscode/src/mcp-client.ts — capture connectError in closure, rethrow in ensureConnected() so callers get an immediate throw instead of hanging on a dead transport

<!-- Detailed spec. -->

---

### Step 4 — Add readStateWithRetry helper in packages/vscode/src/tree/treeProvider.ts getRootChildren — 3 attempts, 500ms delay, skip retry on timeout errors (those go straight to reconnect node)

<!-- Detailed spec. -->

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
