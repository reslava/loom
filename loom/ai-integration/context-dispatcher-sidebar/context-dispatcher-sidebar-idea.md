---
type: idea
id: id_01KTVQ1XF2F8W8X8K067SY8RE8
title: Context Dispatcher Sidebar — surface the loaded-context ledger
status: draft
created: 2026-06-11
version: 1
tags: []
parent_id: null
requires_load: []
---
# Context Dispatcher Sidebar — surface the loaded-context ledger

## What we want to build

A **read-only view of the context dispatcher's current per-session ledger** in the VS Code extension — "here is exactly what the AI has loaded right now" — rendered in the existing CONTEXT panel (or a sub-panel beside it). Ideally with a running tally of *redundant context avoided* this session (delta injected vs. the full bundle it would otherwise have re-sent).

## Why it matters

Loom's whole pitch is making AI state **visible and durable**. The Context Dispatcher (1.6.0, [[context-dispatcher]]) made injection dedupe against a caller-declared `{id@version}` ledger — but that ledger lives only in the agent's transcript, where the user can't see it. Surfacing it closes the loop: the user can *watch* what the AI holds and confirm it isn't re-paying for context it already has. It also gives the one signal we explicitly lack today (raised in the dispatcher chat): an **aggregate** "injected the delta, not the full bundle, N times → ~X tokens saved" — there is no cumulative readout right now, only per-call `contextManifest` / `docs=N` hints in each brief.

This is observability, not a new capability — so it's a strong *vision* fit but not load-bearing. Build it when watching the ledger is worth more than the next capability.

## The core tension (carried from the dispatcher design + [[global-chat-004]])

In model C the ledger lives in the **agent's client**. When the agent is a *launched Claude CLI process*, the extension is a **separate MCP client** and cannot see that agent's ledger — so it has nothing to render. The naive "just read the agent's state" does not work.

**Resolution that preserves model-C safety:** the dispatcher **passively records** the last-declared ledger per session in a spot the extension can read — **for display only, never to suppress injection**. Injection stays a pure function of the *caller's* declaration (no silent under-load); observability gets a read-only mirror. The pure `assembleContext` does not change; the record is a side effect in the resource handler / a dedicated writer.

## Open questions

- **Session identity** — what keys "this session's ledger"? stdio is one process per connection; there's also the in-process CLI client and a long-lived extension server. The passive record needs a stable session key, and this is the gating design question.
- **Where the record lives** — a file under `.loom/` (e.g. `.loom/context-ledger.json` keyed by session)? It must be written *outside* the pure assembler.
- **What to display** — just the `{id@version}` list, or also a savings tally? The tally needs the dispatcher to also record the would-have-been full-bundle size, not only the delta.
- **Mirror freshness** — the record is *last-declared*; after a compaction the agent re-declares, and the panel should reflect the latest declaration. Read-only, refreshed on each declaration.

## Success criteria

- The CONTEXT panel (or a sub-panel) shows the current session's loaded-context ledger as `{id@version}` rows, refreshed when the dispatcher records a new declaration.
- **Display-only invariant:** nothing the panel does can change what the assembler injects — purity and no-silent-under-load are preserved by construction.
- Works for the **launched-Claude-CLI-agent path** (the separate-client case), not only the extension's own in-process MCP client.
- *(Stretch)* a per-session "redundant context avoided" tally (delta tokens vs. full-bundle tokens).

## Scope / relation to prior work

- Builds on the Context Dispatcher (1.6.0, [[context-dispatcher]]) and the Phase 3 CONTEXT panel ([[context-sidebar]], `ai-integration/context-sidebar`).
- The **passive-record hook** (server-side, in `ai-integration`'s pipeline) is the load-bearing part; the panel row is the thin tail — which is why this lives in `ai-integration`, not `vscode-extension`.
- **Out of scope:** changing injection behaviour (the dispatcher owns that); the record is observability only and must never gate what loads.