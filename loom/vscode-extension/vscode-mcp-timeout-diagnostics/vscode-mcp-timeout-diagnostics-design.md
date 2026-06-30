---
type: design
id: de_01KRT2RZGM09CBDB9B9BZF1GH1
title: MCP timeout diagnostics — bi-directional instrumentation
status: draft
created: 2026-05-17
updated: 2026-05-17
version: 2
idea_version: 2
tags: []
parent_id: id_01KRT2KXX9D5QW6GDCRBFSA6HS
requires_load: []
---
# MCP timeout diagnostics — bi-directional instrumentation

## Problem

We have shipped three fixes against `MCP timed out` and the symptom persists. We cannot keep guessing — we need numbers. The goal of this design is **measurement, not repair**. No behavior changes, no new retry layer, no timeout-knob tweaks. Just enough telemetry to pick one of three pre-registered hypotheses (cache thrashing, transport stall, silent child death) from a single captured DoStep.

---

## Design

### Three streams, one channel

A new VS Code output channel `"Loom MCP"` becomes the single sink. Three producers write into it, time-ordered by arrival:

1. **Client request timings** — every `readResource` / `callTool` from `mcp-client.ts`.
2. **Server cache + state events** — every cache invalidate/miss/rebuild/hit and every state read, written to stderr by `packages/mcp` and piped in.
3. **Child stderr passthrough** — anything else the server writes (errors, exits), today silently discarded.

The interleaved log lets us see, for any timeout: did the client request reach the server? did the server start a rebuild? did the rebuild finish? did a watcher event cancel it? — all on one timeline.

### Client instrumentation (`packages/vscode/src/mcp-client.ts`)

Wrap `readResource` and `callTool` in a logger:

```ts
let inFlight = 0;
let nextReqId = 1;

async function logged<T>(
    kind: 'readResource' | 'callTool',
    label: string,
    fn: () => Promise<T>,
): Promise<T> {
    const id = nextReqId++;
    const startedAt = Date.now();
    inFlight++;
    out.appendLine(`[client] ${kind} start id=${id} ${label} inFlight=${inFlight}`);
    try {
        const r = await fn();
        const ms = Date.now() - startedAt;
        out.appendLine(`[client] ${kind} ok    id=${id} ${label} durationMs=${ms}`);
        return r;
    } catch (e: any) {
        const ms = Date.now() - startedAt;
        out.appendLine(`[client] ${kind} FAIL  id=${id} ${label} durationMs=${ms} err=${e?.message ?? e}`);
        throw e;
    } finally {
        inFlight--;
    }
}
```

`inFlight` is the key signal — if it climbs and stays high, we have queueing on a stuck server.

### Server instrumentation (`packages/mcp/src/stateCache.ts` + `resources/state.ts`)

Bracketed-prefix stderr lines, so the client side can route them visually without parsing:

- `[cache] invalidate path=<file> reason=<fs.watch event>`
- `[cache] miss → rebuild start`
- `[cache] rebuild end durationMs=<n> docs=<n>`
- `[cache] hit`
- `[state] read uri=<…> cacheHit=<bool> totalMs=<n>`

These are not structured logs — humans will read them once each. Plain stderr is enough.

### Stderr bridge (`packages/vscode/src/mcp-client.ts`)

In `getMCP()`, after spawning the child via `StdioClientTransport`, capture the child's stderr stream and forward to the output channel:

```ts
const transport = new StdioClientTransport({ command, args, env });
transport.stderr?.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString('utf8').split(/\r?\n/)) {
        if (line) out.appendLine(`[server] ${line}`);
    }
});
```

(If the transport API doesn't expose stderr directly, capture it from the underlying `child_process` — confirm at implementation time.)

Also wire a `transport.onclose` / child `'exit'` listener that logs `[server] EXIT code=<n> signal=<s>`. This closes hypothesis 3 (silent child death) from one line in the log.

### Baseline measurements (one-shot, manual)

Two numbers we currently don't have. Capture them once with the instrumentation live, *before* attempting to reproduce:

- **`getState()` cold time** on this workspace right now. Open VS Code, watch the first `[state] read … cacheHit=false totalMs=<n>` line. If `n > 5000` ms, the cache window is too small for any DoStep write storm and Hypothesis 1 is already strongly indicated.
- **`fs.watch` event rate during one DoStep.** Count `[cache] invalidate` lines fired during a single DoStep's window. On Windows with `{ recursive: true }`, a single `Edit` typically fires 2–4 events. Five-file DoStep ≈ 10–20 invalidations in a few hundred ms.

Both numbers go in the chat reply when the log is captured — they constrain which hypothesis survives.

---

## Files touched

| File | Change |
|------|--------|
| `packages/vscode/src/mcp-client.ts` | Output channel; `logged()` wrapper around `readResource`/`callTool`; stderr bridge; child-exit log |
| `packages/mcp/src/stateCache.ts` | `[cache] …` stderr lines on invalidate/miss/rebuild-start/rebuild-end/hit |
| `packages/mcp/src/resources/state.ts` | `[state] read uri=… cacheHit=… totalMs=…` after each call |

No app/core changes. No reducer changes. No behavior changes.

---

## What this does NOT change

- `getState()` — still pure, still does the same work.
- The file watcher in `extension.ts` — debounce, scope, everything unchanged.
- Timeouts — 30s stays.
- `handleMcpError` — unchanged. The reconnect node still shows on timeout; we're just going to know why.

---

## Exit criteria

We exit this thread when **one** of the three hypotheses is supported by the captured log. The fix itself lives in a separate thread, designed against the evidence — not designed here.
