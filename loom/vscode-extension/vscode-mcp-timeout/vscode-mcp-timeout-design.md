---
type: design
id: de_01KR3HCJF2C79JFQHVX87S9WYD
title: MCP State Cache + Connection Resilience
status: done
created: "2026-05-08T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: id_01KR1QRCXTATTTXKHRQSRG4CC2
requires_load: []
---
# MCP State Cache + Connection Resilience

## Problem

The VS Code extension freeze-reconnect loop is caused by two compounding bugs, not by MCP being inherently unreliable:

**Bug 1 — no state cache:** Every `readResource('loom://state')` triggers a full workspace scan (`getState()` reads every `.md` file, parses frontmatter, builds the link index). The file watcher in `extension.ts` fires `syncAndRefresh()` — which calls `readResource('loom://state')` — after every file write. During a DoStep, the AI writes 2–3 files → 2–3 full scans queue up at 800ms intervals while the AI tool call may still be in-flight. The MCP server is continuously re-scanning, the client's 30s timer fires, and the reconnect loop begins.

**Bug 2 — silent connect-failure:** In `mcp-client.ts`, if `client.connect()` fails, `connectPromise` resolves silently (the catch swallows the error). `connected` stays `false`. Every subsequent `ensureConnected()` call immediately returns (promise already resolved) and then calls `client.readResource()` on a dead transport — hanging until the 30s timeout fires. This is the loop: reconnect → broken client → hang → timeout → reconnect.

**Bug 3 (UX layer) — no retry on transient state:** After reconnect, the tree immediately attempts a fresh `readResource`. If the MCP server is in the middle of rebuilding state (cache miss window), the call may fail transiently. No retry = error node shown prematurely.

---

## Design

### Fix 1 — State cache in the MCP server

**Where:** New module `packages/mcp/src/stateCache.ts`. The cache is a module-level singleton (one per `loom mcp` process).

**What is cached:** Full unfiltered `LoomState` only. Filtered reads (`loom://state?weaveId=...`, `loom://state?status=...`) bypass the cache — they are infrequent (session-start prompts) and often need fresh data. The tree always calls `loom://state` unfiltered; that is the hot path.

**Invalidation:** `fs.watch` with `{ recursive: true }` on `{workspaceRoot}/loom/`. Any file event (create, change, delete) sets `_cache = null` immediately. No debounce on the invalidation — simple and correct. The rebuild happens lazily on the next `readResource` call.

**Cross-platform note:** `fs.watch` with `recursive: true` is natively supported on Windows and macOS. Linux requires either `chokidar` or a polyfill. Since the MCP server runs locally (same OS as the workspace), this is acceptable for now. Add a `chokidar` dependency if Linux support is needed.

**Cache module API:**
```ts
// packages/mcp/src/stateCache.ts
export function initStateCache(root: string): void   // idempotent; sets up watcher if not already watching
export function getCachedState(): LoomState | null
export function setCachedState(state: LoomState): void
export function invalidateStateCache(): void          // exposed for tests
```

**Flow in `handleStateResource`:**
```
1. initStateCache(root)          — idempotent
2. if unfiltered && getCachedState() → return cached (no file I/O)
3. else → getState() → setCachedState(result) → return result
```

`getState()` in `app` is unchanged — still pure, no side effects.

### Fix 2 — Connect-failure propagation in `mcp-client.ts`

Store the connect error and rethrow it in `ensureConnected()`:

```ts
let connectError: Error | undefined;

const connectPromise = client.connect(transport)
    .then(() => { connected = true; _mcpConnected = true; })
    .catch((err: Error) => {
        connectError = err;
        _mcpConnected = false;
        vscode.window.showErrorMessage(`Loom MCP failed to start: ${err.message}`);
    });

async function ensureConnected(): Promise<void> {
    if (!connected) {
        await connectPromise;
        if (connectError) throw connectError;
    }
}
```

With this change, a failed connect causes `readResource` / `callTool` to throw immediately instead of hanging. `handleMcpError` catches it, calls `disposeMCP()`, and the tree shows the reconnect node. The next `getMCP()` creates a fresh client — a clean retry, not a silent hang.

### Fix 3 — Refresh Tree retry in `treeProvider.ts`

Wrap the `readResource('loom://state')` call in `getRootChildren()` with a retry loop:

- **Max 3 attempts**, **500ms delay** between tries
- **Retry only on non-timeout errors** — a timeout means MCP is genuinely unresponsive; show the reconnect node immediately (current behaviour)
- On transient errors (connect-failure during cache rebuild, brief process restart), retry gives the server time to settle

```ts
async function readStateWithRetry(mcp: LoomMCPClient): Promise<string> {
    const MAX = 3;
    let last: Error = new Error('no attempts');
    for (let i = 0; i < MAX; i++) {
        try {
            return await mcp.readResource('loom://state');
        } catch (e: any) {
            if (isTimeoutError(e)) throw e; // reconnect path, no retry
            last = e;
            if (i < MAX - 1) await new Promise(r => setTimeout(r, 500));
        }
    }
    throw last;
}
```

---

## Files touched

| File | Change |
|------|--------|
| `packages/mcp/src/stateCache.ts` | New — cache module |
| `packages/mcp/src/resources/state.ts` | Wire cache into `handleStateResource` |
| `packages/vscode/src/mcp-client.ts` | Store + rethrow connect error in `ensureConnected` |
| `packages/vscode/src/tree/treeProvider.ts` | `readStateWithRetry` helper in `getRootChildren` |

---

## What this does NOT change

- `getState()` in `app` — stays pure, no IO changes
- The file watcher in `extension.ts` — still debounced at 800ms; that's fine, the cache makes the resulting `readResource` cheap
- Timeout values — 30s is correct now; the cache makes timeouts rare rather than the norm
- `handleMcpError` — already correct; no changes needed