---
type: design
id: de_01KTVQNV2T7TXFQNN7XVQB4FFG
title: Context Dispatcher Sidebar — design
status: draft
created: 2026-06-11
version: 1
tags: []
parent_id: id_01KTVQ1XF2F8W8X8K067SY8RE8
requires_load: []
---
# Context Dispatcher Sidebar — design

## Overview

A **read-only mirror** of the Context Dispatcher's per-session ledger, surfaced in the VS Code extension's CONTEXT panel. The dispatcher (1.6.0, [[context-dispatcher]]) dedupes injection against a caller-declared `{id@version}` ledger that lives only in the agent's transcript; this thread makes that ledger *visible* — "here is exactly what the AI holds right now," plus a running tally of redundant context avoided.

The load-bearing constraint, inherited from model C: **injection must stay a pure function of the caller's declaration**. So the mirror is *display only* — it can never gate or change what loads. Everything below is built around that invariant.

## The decision

Extend model C with a **session-keyed passive record**, written at the impure boundary (the `loom://context` resource handler), never inside the pure `assembleContext`. Three moving parts: a **session id** that keys the record, a **passive-record writer** that persists the last-resolved ledger per session, and a **panel** that reads and renders it.

### Session identity — launcher env first, agent-declared fallback

The gating question was "what keys a session?" Resolution, in priority order:

1. **`LOOM_SESSION_ID` on the MCP server process (recommended).** The Loom MCP server runs over stdio as **one process per connection**, so the process lifetime *is* the session. Whoever launches the server stamps the env:
   - **Launched-Claude-CLI-agent path (the case that needs the panel):** the extension *starts* that agent, so it mints the id and sets `LOOM_SESSION_ID` when it spawns `loom mcp`. The server reads its own env and stamps every record with it — **zero agent discipline, no hand-rolled ULID, no per-call argument**. The extension knows the id (it set it), so it reads back exactly that record.
   - **Fallback within this tier:** if the env is unset, the server mints a token at process start (`sess_<unix-ms>-<rand>`), stable for the process = the session.
2. **Agent-declared `sessionId` argument (secondary).** For hosts where the launcher cannot set the server's env but the agent can pass an argument, CLAUDE.md instructs the agent to *use* a session id (one provided by the launcher if present, else mint one) and pass it on `loom_do_step` / `loom://context`. This is strictly weaker (depends on agent discipline) and only exists for that gap.

Why env-first beats "tell the AI to mint an id": it removes the model from the reliable path entirely. Asking the model to emit a correct ULID by hand is the weak link; a launcher setting an env var is not.

**Known caveat:** a *long-lived* extension-hosted server (one process spanning several sessions) breaks "process = session." That path would need the agent-declared id (tier 2) or a per-session re-stamp. Not a concern for the launched-CLI path (fresh `loom mcp` per launch); flagged as an open question.

### The passive-record writer

In `handleContextResource` (already the single impure boundary — it calls `getState`, reads prefs, runs the pure assembler), after `assembleContext` returns, write the record. The thing worth recording is **what the agent holds *after* this call** = the full resolved set = `bundle.manifest ∪ bundle.docs.map({id,version})` (assumed-present + the delta just sent). Plus the numbers for the savings tally.

This is a side effect in the handler, not in `assembleContext` — purity of injection is untouched. `loom_do_step` routes through the same handler, so it is covered for free.

### The ledger store

`.loom/context-ledger.json` (gitignored — ephemeral session state, same posture as `.loom/context-prefs.json` is for prefs but never committed):

```jsonc
{
  "<sessionId>": {
    "updatedAt": "2026-06-11T…",
    "targetId": "pl_…",            // last target the session injected for
    "docs": [{ "id": "loom-ctx", "version": 3 }, … ],   // full set the agent now holds
    "lastDelta": { "count": 1, "tokens": 420 },          // what THIS call actually injected
    "fullTokens": 6973                                   // what the full bundle WOULD have cost
  }
}
```

`fullTokens − lastDelta.tokens` accumulated across a session is the "redundant context avoided" tally. (To accumulate, the writer adds each call's saved tokens to a running `savedTokens` total on the record.)

### The panel

The existing CONTEXT panel (Phase 3, [[context-sidebar]]) renders the *next* injection for the selected node. This adds a **second, session-scoped view** (a sub-section or sibling panel): the current session's `docs` as `{id@version}` rows, a relative `updatedAt`, and the running `savedTokens` tally. Read-only — no toggles, no persistence the user edits. It refreshes when `.loom/context-ledger.json` changes (file watcher) for the session id the extension is tracking.

## Data flow

```
extension launches Claude CLI agent
   └─ spawns `loom mcp`, sets env LOOM_SESSION_ID = sess_X
agent runs loom_do_step / reads loom://context (declares alreadyLoaded as usual)
   └─ handleContextResource:
        assembleContext(…, alreadyLoaded) → { docs: delta, manifest }   (PURE, unchanged)
        write .loom/context-ledger.json[sess_X] = manifest ∪ delta + token math   (side effect)
extension watches .loom/context-ledger.json, reads [sess_X], renders rows + saved tally
```

Injection (`docs`) still depends *only* on `alreadyLoaded`. `sess_X` only labels the record.

## Display-only invariant (the thing we must not break)

- Nothing read from `.loom/context-ledger.json` ever feeds back into `assembleContext`. The record is write-from-the-handler, read-by-the-panel — a one-way mirror.
- A missing / stale / wrong session id degrades the *panel* (empty or stale rows), never injection. This is why session-id can be soft: it can't cause a silent under-load.
- The pure assembler signature and behaviour are unchanged from 1.6.0.

## Build order (load-bearing first)

1. **Session id + passive-record writer + store** — server-side, in `ai-integration`. This is the real work and is independently useful (a future `loom session` CLI readout, debug logging).
2. **Extension session-id authority** — extension mints + sets `LOOM_SESSION_ID` on launch; knows which record to read.
3. **Panel view** — the thin tail: render `docs` + tally, file-watch refresh.

Each step is shippable alone; the panel is the only piece that needs the extension.

## Open questions

- **Long-lived extension server** — if one MCP process serves multiple sessions, env-at-launch can't distinguish them; needs the agent-declared `sessionId` (tier 2) or a re-stamp signal. Confirm the launched-agent path always spawns a fresh server (expected) so tier 1 suffices.
- **Record lifecycle / GC** — `.loom/context-ledger.json` accumulates one entry per session forever. Cap it (keep last N sessions, or prune entries older than T) so it doesn't grow unbounded.
- **Multi-target sessions** — a session that steps across several plans injects different bundles; `docs` is "last resolved set." Is last-wins enough for display, or do we want per-target sub-records? Last-wins is the cheap default.
- **`savedTokens` accuracy** — the heuristic `ceil(chars/4)` token estimate is already what the bundle uses; the tally inherits its imprecision. Fine for a "you avoided ~N" signal; not a billing number.

## Out of scope

- Changing injection behaviour — the dispatcher owns that; this thread never gates what loads.
- Cross-machine / shared ledger — the record is local, per-workspace, ephemeral.
- A standalone-CLI panel — standalone Claude Code sessions have no extension UI; they still get a written record (tier-1 fallback id) for a future `loom session` readout, but rendering it is not in scope here.

## Decisions taken (this design)

1. **Record at the resource handler, never in `assembleContext`** — purity of injection is the whole point of model C; the mirror is a handler side effect.
2. **Session id from the launcher's env first** (`LOOM_SESSION_ID`), agent-declared argument only as a fallback for hosts that can't set it. The extension is the id authority on the launched-agent path.
3. **Record the full held set** (`manifest ∪ delta`), not just the delta — the panel answers "what does the AI hold," not "what was the last diff."
4. **`.loom/context-ledger.json`, gitignored** — ephemeral session state, never committed.
5. **Display-only, one-way mirror** — the store is written by the handler and read by the panel; it never flows back into assembly.
6. **Build the server-side record before the panel** — the record is load-bearing and independently useful; the panel is the thin tail, gated on actually wanting to watch it.