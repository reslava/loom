---
type: design
id: de_01KTVACXRTR1P4AB2PN7P1REXY
title: Context Dispatcher — design
status: done
created: 2026-06-11
updated: 2026-06-11
version: 2
idea_version: 2
tags: []
parent_id: id_01KTVAC0FWPVY2EATC8VDM3EZP
requires_load: []
---
# Context Dispatcher — design

## Overview

A single context-injection pipeline that dedupes against what the agent already holds. Built on a **client-declared ledger** (model C), not a server-side session cache (model B) — the server stays stateless and pure; the caller declares the `{id@version}` set it currently holds, and the dispatcher returns only the delta.

## The core constraint

The MCP server is **stateless across calls and cannot observe the agent's context window** (already codified in CLAUDE.md: the "is-it-in-transcript?" decision lives in the AI, not the server). So "knows what's loaded" must live somewhere that can actually see the window. That single fact decides the architecture.

## The decision: C (client-declared ledger), not B (server cache)

Two candidate mechanisms were weighed (see [[global-chat-004]]):

### B — server-side session cache (rejected)
Server keeps a per-connection set of "already sent `{id@version}`" and sends only deltas; resets when the stdio connection resets.
- **Pro:** fully automatic, zero work for the agent.
- **Fatal flaw:** *"sent" ≠ "still loaded."* Long sessions get compacted/summarized. If the server suppresses a doc it "knows it sent" but compaction dropped it from the window, the agent is **silently missing context** — an under-load *correctness* failure, worse than wasted tokens. The server's optimism can't see compaction. Also needs per-session keying to stay multi-agent-safe.

### C — client-declared ledger (chosen)
Server stays stateless/pure. Each context-injecting call passes `loaded: [{ id, version }]`; the dispatcher diffs and returns only new/changed docs.
- Keeps the server a **pure function of its input** — preserves testability and multi-agent safety for free (two agents on one server can't poison each other).
- The declarer can re-declare after a compaction, so there is **no silent under-load**.
- **Cost:** someone maintains and passes the ledger. In Claude Code that is effectively the agent — the *same* judgment as today's chat rule, but converted from fuzzy prose into an explicit, server-checkable contract.

## Components

1. **Context ledger** (client-side state) — the `{id@version}` set the agent holds. Resets per clean session (a fresh client = empty ledger). This is the "knows what's loaded" piece. It lives where the context lives.
2. **Context dispatcher** (server-side, the single path) — `assembleContext(request, alreadyLoaded) → { docs: delta, manifest: assumedPresent }`. Every context-injecting command calls it; none assembles context on its own.

## Protocol

- A call carries `loaded: [{ id, version }]` (the inverse of the existing additive `context_ids`).
- The dispatcher computes: for each doc the request *would* inject, emit it only if its id is absent from `loaded` **or** its current version differs. The unit is `{docId@version}` — a refine bumps the version → always re-sent (CLAUDE.md already mandates re-read after refine).
- The response includes a **manifest** of everything the dispatcher assumed present (so the agent/log can reconcile), plus the delta docs themselves.

## Wiring

Route through the dispatcher: `loom_do_step`, the `loom://context` resource, the context-assembler, and `complete_step`/`append_done` (which today echo the whole plan back — they should return a reference + delta, not the full doc each time). New context-injecting tools must use it too — it is the *only* injection door.

## Extension visibility (resolving the C-vs-display tension)

Showing the loaded-context ledger in the extension is a strong vision fit (*make AI state visible*). But in C the ledger lives in the *agent's* client — and when the agent is a **launched Claude CLI process**, the extension is a *separate* MCP client that can't see that ledger.

Resolution: the dispatcher **passively records** the last-declared ledger per session in a spot the extension can read — **for display only, never to suppress injection**. Injection stays a pure function of the caller's declaration (C's safety intact); observability gets a read-only mirror. Render it in the CONTEXT section (or a new sub-panel).

## Cheap stopgap (do this first)

Independent of the full pipeline: add a `context: "skip"` / `brief_only` flag to `do_step` (and `complete_step`/`append_done`) so the agent can suppress the repeat bundle when it knows the thread is still loaded. Captures most of the token saving today with near-zero architecture, and buys time to build C properly. Land this first, then the dispatcher.

## Open questions

- **Ledger maintenance in the launched-agent path** — how does the launched Claude CLI agent build and pass `loaded` reliably? Is it the agent's own bookkeeping, or can the host/client automate it?
- **Session identity** — define "clean session" precisely across stdio (one process per connection), the in-process CLI client, and a long-lived extension server.
- **Manifest granularity** — full per-doc `{id@version}` list every call, or a compact session token the dispatcher can validate?
- **Compaction signal** — is there any reliable signal that the agent's window was compacted, to trigger a full re-declare, or is "re-declare whenever unsure" the only honest rule?

## Out of scope

- A server-side content cache (the B model) — explicitly rejected for the silent-under-load risk.
- The `loom_append_to_chat` role-default fix — related friction-reduction, but a separate, already-shipped change.
