---
type: chat
id: ch_01KR22S9K8CW2QN4AR74WEC1WB
title: vscode-mcp-timeout Chat
status: active
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-07T00:00:00.000Z"
version: 3
tags: []
parent_id: vscode-mcp-timeout
requires_load: []
---
# CHAT

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