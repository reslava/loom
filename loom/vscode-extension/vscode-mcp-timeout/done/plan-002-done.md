---
type: done
id: pl_01KR3HE7MVDRPA7TK3R01Z9BDQ-done
title: Done — MCP State Cache + Connection Resilience
status: done
created: "2026-05-08T00:00:00.000Z"
version: 4
tags: []
parent_id: pl_01KR3HE7MVDRPA7TK3R01Z9BDQ
requires_load: []
---
# Done — MCP State Cache + Connection Resilience

## Step 1 — Add stateCache.ts module in packages/mcp/src/ — module-level LoomState

Created `packages/mcp/src/stateCache.ts`. Module-level singleton: `_cache: LoomState | null`, `_watcher: fs.FSWatcher | null`, `_root: string | null`. `initStateCache(root)` is idempotent — skips if already watching the same root. Sets up `fs.watch` with `{ recursive: true }` on `{root}/loom`; any file event sets `_cache = null`. Watcher errors also invalidate the cache. If the `loom/` directory doesn't exist yet, the watch call is silently skipped (the next `initStateCache` call will retry). Exports: `initStateCache`, `getCachedState`, `setCachedState`, `invalidateStateCache`.

## Step 2 — Wire cache into handleStateResource in packages/mcp/src/resources/state.ts — call initStateCache(root), return cached state for unfiltered reads (no weaveId/status params), store result after computing; filtered reads bypass cache

Updated `packages/mcp/src/resources/state.ts`. Added import of `initStateCache`, `getCachedState`, `setCachedState` from `../stateCache`. Added `isUnfiltered` flag — true when no `weaveId`, no `status` filter, and `includeContent` is false (the tree's hot path). On each call: `initStateCache(root)` runs first (idempotent). If `isUnfiltered` and cache is warm, serializes and returns the cached state immediately — no `getState()` call, no file I/O. If cache is cold (or filtered request), runs `getState()` as before, then stores the result in cache for unfiltered calls. Filtered reads (session-start prompts, status queries) always bypass the cache.

## Step 3 — Fix silent connect-failure in packages/vscode/src/mcp-client.ts — capture connectError in closure, rethrow in ensureConnected() so callers get an immediate throw instead of hanging on a dead transport

Updated `packages/vscode/src/mcp-client.ts`. Added `let connectError: Error | undefined` in the closure. The `.catch()` handler now stores the error in `connectError` before showing the VS Code error message (previously it only logged and showed — `connectError` was always undefined). `ensureConnected()` now awaits `connectPromise` then immediately throws `connectError` if set, before attempting any `readResource`/`callTool` call. This means a failed connect surfaces as an immediate throw to the caller (caught by `handleMcpError` → `disposeMCP()` → reconnect node) instead of silently proceeding to hang on a dead transport for 30 seconds.

## Step 4 — Add readStateWithRetry helper in packages/vscode/src/tree/treeProvider.ts getRootChildren — 3 attempts, 500ms delay, skip retry on timeout errors (those go straight to reconnect node)

Updated `packages/vscode/src/tree/treeProvider.ts`. Added private method `readStateWithRetry(root)`: 3 attempts, 500ms delay between retries. Timeout errors (`32001` / `timed out` in message) are rethrown immediately — the existing catch block converts them to the reconnect node. Non-timeout errors (transient connect failure during cache rebuild window) are retried up to 3 times before propagating. The `getRootChildren` try block now calls `this.readStateWithRetry(this.workspaceRoot)` instead of `getMCP(...).readResource(...)` directly.
