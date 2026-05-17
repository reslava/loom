---
type: done
id: pl_01KRT2TST0TZZG16HERT2KTCW0-done
title: Done — Instrument MCP and capture a timeout
status: done
created: "2026-05-17T00:00:00.000Z"
version: 3
tags: []
parent_id: pl_01KRT2TST0TZZG16HERT2KTCW0
requires_load: []
---
# Done — Instrument MCP and capture a timeout

## Step 1 — Client instrumentation in packages/vscode/src/mcp-client.ts: create the "Loom MCP" output channel; add a logged() wrapper around readResource and callTool that records {id, label, startedAt, durationMs, outcome, inFlight}; bridge the spawned child's stderr into the same channel with a [server] prefix; log child exit/close with code+signal. No behavior changes — only logging.

**File touched:** `packages/vscode/src/mcp-client.ts`

**What was added:**
- Module-level `getOut()` lazily creates the `Loom MCP` output channel.
- `logged(kind, label, fn)` wrapper records `[client] {kind} start id=N {label} inFlight=K` → `[client] {kind} ok|FAIL id=N {label} durationMs=…` for every `readResource`, `callTool`, `callPrompt`. `inFlight` is a per-client counter.
- `transport.stderr.on('data', …)` splits chunks on newlines and writes each non-empty line with `[server] ` prefix. `stderr: 'pipe'` was already set.
- `transport.onclose` logs `[server] transport closed` and clears `_mcpConnected` — closes hypothesis 3 (silent child death).
- `dispose()` logs `[client] dispose`.

**No behavior changes** — only logging.

**Build:** `cd packages/vscode && npm run package` → `DONE Packaged loom-vscode-0.5.0.vsix`. Compiles clean.

## Step 2 — Server instrumentation in packages/mcp/src/stateCache.ts and packages/mcp/src/resources/state.ts: emit bracketed-prefix stderr lines on every cache invalidate / miss / rebuild start / rebuild end / hit, and one [state] read uri=… cacheHit=… totalMs=… line per resource read. Plain stderr — no structured logging.

**Files touched:** `packages/mcp/src/stateCache.ts`, `packages/mcp/src/resources/state.ts`.

**stateCache.ts:**
- Added `log(line)` helper that writes to `process.stderr` with a trailing newline (no structured logging — bracketed-prefix plain text per design).
- `fs.watch` callback now logs `[cache] invalidate path=<filename> reason=<eventType>` — but only when there was a cache to invalidate (suppresses noisy back-to-back invalidations on a cold cache, which would otherwise drown the real signal).
- Watcher `error` listener logs `[cache] watcher error err=…`.
- `getCachedState()` logs `[cache] hit` on cached return; on miss it logs `[cache] miss → rebuild start` and stores `_rebuildStartedAt`. Returns `null` as before.
- `setCachedState(state)` pairs with the miss log: emits `[cache] rebuild end durationMs=<n> weaves=<n> plans=<n>` and clears `_rebuildStartedAt`. Uses `state.summary.totalWeaves` / `totalPlans` (already on `LoomState`) — simpler than reaching into nested weave/thread doc arrays.
- `invalidateStateCache()` logs `[cache] invalidate path=<manual> reason=invalidateStateCache` when a cache existed.

**resources/state.ts:**
- `handleStateResource` captures `startedAt = Date.now()` at entry.
- Both return paths (cached-hit and recomputed) emit `[state] read uri=<uri> cacheHit=<bool> totalMs=<n>` to stderr immediately before returning. `cacheHit=false` covers both "cache miss → rebuild" and "filtered read bypassed cache" — the preceding `[cache]` lines disambiguate.

**No behavior changes** — only logging. Filtered reads still bypass the cache. Hot path still returns cached JSON.

**Builds:** `cd packages/mcp && npx tsc` → clean, `process.stderr.write` line present in `dist/stateCache.js:47`. `cd packages/vscode && npm run package` → `DONE Packaged loom-vscode-0.5.0.vsix`.

**Note on global `loom` CLI:** the global `loom mcp` symlink at `~/AppData/Roaming/npm/loom` resolves to `packages/cli`, which loads `packages/mcp/dist/` directly — so the rebuild above is sufficient. No `npm link` re-run needed.

## Step 3 — Reproduce and diagnose: build, reload the extension, capture (a) the cold getState() duration on session start and (b) the fs.watch invalidation count during a single DoStep, then drive the workspace until a timeout fires and save the full "Loom MCP" output. Paste the log into the chat. Identify which hypothesis the evidence supports. The real fix is scoped in a new thread — not in this plan.

**Status:** Build side ready. Interactive capture is Rafa-side — step stays 🔳 until the log is pasted into the chat.

**Build state at handoff:**
- `packages/mcp/dist/stateCache.js` and `packages/mcp/dist/resources/state.js` carry the `[cache]` / `[state]` stderr lines.
- `packages/vscode/loom-vscode-0.5.0.vsix` (May 17, 06:38) carries the client-side logger, stderr bridge, and `transport.onclose` handler.
- Global `loom` CLI at `~/AppData/Roaming/npm/loom` resolves to the rebuilt `packages/cli`, which loads `packages/mcp/dist/` — no relink needed.

**What Rafa needs to do to close this step:**

1. **Install the fresh extension.** Either `code --install-extension loom-vscode-0.5.0.vsix` then reload window, or in the Extension Development Host: stop and relaunch `F5`. (If you only reload the window without reinstalling, the previous extension instance keeps running.)
2. **Open `View → Output → Loom MCP`.** This is the new channel; everything we capture flows there.
3. **Capture baseline #1 — cold `getState()` time.** On the first tree render after reload, find the first `[state] read uri=loom:// cacheHit=false totalMs=<n>` line. Record `n`. (If `n > 5000` ms, hypothesis 1 is already strongly indicated — the cache window cannot survive a single DoStep write storm.)
4. **Capture baseline #2 — `fs.watch` event rate.** Trigger one DoStep on any short plan. Count the `[cache] invalidate path=… reason=…` lines that fire during the step. Expected on Windows: 2–4 per file written; 5-file DoStep ≈ 10–20 invalidations.
5. **Drive until a timeout reproduces.** Continue working in the workspace until the freeze + `MCP timed out` happens. Immediately copy the full `Loom MCP` output into the chat (`vscode-mcp-timeout-chat-002`).
6. **Pre-registered hypothesis decision tree** (so we don't rationalize afterward):
   - Many `[cache] miss → rebuild start` without matching `rebuild end`, durations climbing → **H1 cache thrashing**.
   - Long gap between `[client] readResource start id=N` and any subsequent `[state] read uri=…` (server idle, request never logged server-side) → **H2 transport stall**.
   - `[server] transport closed` or non-zero exit line preceding the timeout → **H3 silent child death**.

The real fix is scoped in a new thread *after* the log lands — designing it now would mean a fourth blind patch.
