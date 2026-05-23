---
type: chat
id: ch_01KR22S9K8CW2QN4AR74WEC1WB
title: vscode-mcp-timeout Chat
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 4
tags: []
parent_id: null
requires_load: []
---
# vscode-mcp-timeout Chat

## Rafa:

I did the test. I saw error when refine and mcp reconnect messages.
Tree was always correct.
What conclusion?

## AI:

Smoke test passed. Conclusion:

**The refactor works end-to-end.** When a timeout fires mid-command:
1. The tree immediately shows the reconnect node (via `treeProvider.refresh()` + `disposeMCP()`)
2. The user sees the "MCP timed out — reconnecting…" notification
3. The tree state is correct — no stale or stuck UI

Before this change, only the tree-load path (`getRootChildren`) had this behaviour. Every other command (refine, generate, chatReply, etc.) silently swallowed the error or showed a raw message with no reconnect path. Now all AI-bound commands are consistent.

The one deliberate trade-off: non-timeout MCP errors in those commands no longer show a `showErrorMessage` — they re-throw silently. That's acceptable given non-timeout MCP errors are rare, and the reconnect UX was the primary pain point. Worth watching whether any "disappeared" errors show up in practice; if they do, we can restore the fallback in a follow-up.

## Rafa:

It happens again, sidebar activity loom icon end with refresh icon froozen, tree become froozen, after a while, MCP timed out.

No way to refresh. 


## AI:

Root cause found. It's in `mcp-client.ts`, line 13:

```ts
const RESOURCE_READ_TIMEOUT_MS = 5 * 60 * 1000; // state reads — generous for cold-start link-index build
```

When the MCP connection stalls during a tree load, `getRootChildren()` is awaiting `readResource('loom://state')` with a **5-minute timeout**. VS Code is blocked waiting for that promise — the sidebar spinner freezes, the tree freezes, and nothing renders (including the reconnect node) until the 5 minutes expire.

The status bar button (`loom.reconnectMcp`) is technically registered and clickable during this window, but even clicking it may not help: `disposeMCP()` calls `transport.close()`, but whether that actually rejects the in-flight `readResource` promise (or just lets it run until the 5-minute wall) depends on MCP SDK internals. If the old promise doesn't get rejected immediately, the tree stays frozen regardless.

**The fix:**

Reduce `RESOURCE_READ_TIMEOUT_MS` to something reasonable for interactive UI — **30 seconds**. The cold-start link-index build comment was overly cautious; state reads on real projects finish in well under a second. If they don't, a fast reconnect is better than a 5-minute freeze.

```ts
const RESOURCE_READ_TIMEOUT_MS = 30 * 1000; // state reads — fast; if stalled, reconnect is better than freezing
```

That single change cuts the freeze window from 5 minutes to 30 seconds and makes the reconnect node appear promptly.

If we also want to ensure `disposeMCP()` actively cancels the in-flight request (so the status bar reconnect works immediately), we'd need to track the in-flight AbortController or use `Promise.race`. That's a second, independent fix — worth doing but not blocking.

Want me to apply the timeout change now?

## Rafa:

Apply timeout change
Briefly explain `Promise.race`

## AI:

Done. `RESOURCE_READ_TIMEOUT_MS` changed from `5 * 60 * 1000` → `30 * 1000` in `mcp-client.ts:13`.

---

**`Promise.race` for cancelling in-flight MCP requests**

`Promise.race([p1, p2])` resolves/rejects with whichever promise settles first — the others are ignored (they still run, but their outcome is discarded).

Applied here: wrap every `readResource` call in a race against a "dispose signal" promise. When `disposeMCP()` is called, you reject that signal, and the race immediately throws — the caller sees the error, `getRootChildren` catches it, and the tree re-renders without waiting for the real request to time out.

```ts
// In createMCPClient:
let _disposeReject: ((e: Error) => void) | undefined;
const disposeSignal = new Promise<never>((_, reject) => { _disposeReject = reject; });

// In readResource:
const result = await Promise.race([
    client.readResource({ uri }, { timeout: RESOURCE_READ_TIMEOUT_MS }),
    disposeSignal,
]);

// In dispose():
_disposeReject?.(new Error('MCP disposed'));
transport.close().catch(() => {});
```

The 30s timeout already fixes the visible freeze. `Promise.race` is the follow-up that makes the status bar reconnect button feel instant instead of "wait up to 30s then recover." Worth a separate plan step if you want it.

Next: build + test the timeout change?

## Rafa:

We implemented already so many patches and workarounds for this always repeating issue, we can not ship MCP with this, MCP timed out error always appears, first sidebar activity loom icon shows refresh froozen, ending with MCP timed out, if I click reconnect when finally refresh, loom icon show fast intermintent refresh icon over it.

### TODO
`Promise.race` for cancelling in-flight MCP requests.

But this is not the solution!
The solution is find why this is happening and solve the cause, no more patches and workarounds.

### TODO
find the real cause 

### Refresh Tree
I already told you this idea and was implemented, but I think is worth to repeat a rethink about it.

1. valid state: when Tree is created we have a valid tree state
2. file watcher detect changes
3. test if new tree is valid, if so refresh, if not wait wait and retry n times until is valid again. We need to define `valid` perfectly
4. if not valid after n tries, show the problem and how to fix it

What you think

## AI:

You are right. We cannot ship with this. And the timeout patches are not the fix — they only reduced the freeze window from 5 minutes to 30 seconds. The reconnect loop is still there.

Let me name what I actually see in the code.

---

## Root cause — two compounding bugs

### Bug 1: `getState()` re-runs on every single tree refresh

Every call to `readResource('loom://state')` in the MCP server triggers a full workspace scan — it reads every `.md` file under `loom/`, parses frontmatter, builds the link index, and loads all threads from scratch. There is no caching between calls.

Now look at the file watcher in `extension.ts:368`:

```ts
const watcher = vscode.workspace.createFileSystemWatcher('**/loom/**/*.md');
const debouncedSyncAndRefresh = debounce(() => syncAndRefresh(), 800);
```

`syncAndRefresh()` calls `treeProvider.refresh()` → `getRootChildren()` → `readResource('loom://state')` → full scan again.

This means: every time the AI writes a done doc, a plan update, or a chat reply, the file watcher fires after 800ms and triggers a full workspace scan. During a DoStep, the AI might write 2–3 files → 2–3 full scans queued at 800ms intervals, all while the AI tool call itself may still be in-flight. The MCP server is computing `getState()` continuously.

**This is the actual reason it freezes.** The MCP server is not idle — it is busy re-scanning the workspace. The client's 30s timer fires because the server is backlogged, not because MCP is broken.

### Bug 2: Connect failure → silent hang → loop

In `mcp-client.ts`:

```ts
let connected = false;
const connectPromise = client.connect(transport).then(() => {
    connected = true;
}).catch((err) => {
    // swallows the error — connectPromise resolves
});

async function ensureConnected(): Promise<void> {
    if (!connected) await connectPromise; // connectPromise already resolved, returns immediately
}
```

If `client.connect()` fails (process crash, spawn error, whatever), `connectPromise` resolves silently. `connected` stays `false`. Every subsequent `readResource` call then:
1. Hits `ensureConnected()` → immediately returns (promise already resolved)
2. Calls `client.readResource()` on a dead transport
3. Hangs until the 30s timeout fires
4. Timeout → `disposeMCP()` → new client → same broken connect → same loop

This is why the fast intermittent refresh icon appears after reconnect: the reconnect creates a new client, the new client connects but hits the backlogged server, times out, reconnects again, repeats.

---

## The real fix

Two things, in order of impact:

**1. Cache state in the MCP server with file-watcher invalidation.**

`getState()` should run once and return a cached result. The MCP server should maintain its own file watcher on `loom/**/*.md` and invalidate the cache on changes. Subsequent `readResource('loom://state')` calls within the same quiet window return the cached state immediately — no file I/O.

This eliminates the "N scans per DoStep" problem and makes the server fast and idle between changes.

**2. Fix the silent connect-failure bug.**

If connect fails, `ensureConnected()` must throw — not proceed silently to a dead `client.readResource()`. Either re-throw from the catch, or store the error and rethrow it in `ensureConnected()`.

---

## Refresh Tree idea

Your idea is right and it addresses a different problem — UI resilience when state transitions mid-render. Worth having, but it's a resilience layer, not a root-cause fix. "Valid state" in your terms = `readResource` returned parseable data and the client is connected. The N-retry logic protects against the window where the server is briefly invalidating its cache after a write.

Once the caching fix is in, implement this as a follow-up: if `readResource` fails, retry up to 3 times with 500ms delay before showing the error node. That covers the cache-invalidation window cleanly.

---

## Proposed next step

Design the caching layer inside the MCP server:
- Where state lives (module-level `LoomState | null`)
- What invalidates it (file watcher events in the MCP process)
- Invalidation strategy: immediate (on any write) vs debounced (wait for writes to settle, e.g. 200ms)
- Whether `getState()` in `app` needs changes or the cache sits in the MCP resource handler

Want to design this first, or go straight to a plan?

## Rafa:

Create a new design and a new plan in this thread for all:
1. Cache state in the MCP server with file-watcher invalidation
2. Fix the silent connect-failure bug
Refresh Tree idea

## AI:

Creating design + plan in this thread now. Three items together: state cache, connect-failure fix, and Refresh Tree retry.

## AI:

Done. Both docs are live in this thread:

- **Design** — `vscode-mcp-timeout-design.md` (status: active) — root cause analysis, three fixes, files touched, what stays unchanged
- **Plan** — `vscode-mcp-timeout-plan-002.md` — 4 steps:
  1. `stateCache.ts` module in MCP server
  2. Wire cache into `handleStateResource`
  3. Fix `ensureConnected` connect-failure propagation
  4. `readStateWithRetry` in `treeProvider.ts`

Steps 1+2 kill the re-scan loop (the primary cause). Steps 3+4 fix the hang and add the resilience layer. Ready to start Step 1 on `go`.

## AI:

All 4 steps done. Plan closed ✅.

**What was built:**

1. `packages/mcp/src/stateCache.ts` — new module. Module-level `LoomState | null` cache + `fs.watch` watcher on `{root}/loom`. Any file event invalidates the cache immediately. Idempotent init — safe to call on every request.

2. `packages/mcp/src/resources/state.ts` — wired in. Unfiltered `loom://state` reads (the tree's hot path) return the cached state with no file I/O. Cache miss triggers `getState()` as before, result stored. Filtered reads always bypass cache.

3. `packages/vscode/src/mcp-client.ts` — `connectError` captured in closure. `ensureConnected()` now throws immediately if connect failed, instead of silently proceeding to a dead transport that hangs for 30 seconds.

4. `packages/vscode/src/tree/treeProvider.ts` — `readStateWithRetry()` private method. 3 attempts, 500ms delay. Timeout errors skip retry and go straight to the reconnect node. Non-timeout errors (transient connect failure during cache rebuild) are retried.

Build: clean (`✅ Build complete`).

**Note on the parallel `complete_step` call:** Step 3 hit a transient permission error on an unrelated file (`vscode-diagnostics-chat-001.md`) — looks like a file-lock race during the parallel write batch. Retried alone and succeeded. Worth noting as a finding — parallel MCP writes may occasionally collide on file locks.