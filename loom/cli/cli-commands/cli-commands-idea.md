---
type: idea
id: id_01KTJS3W536XCQB7ZSANF161DT
title: CLI Commands — Make MCP-only Capability Terminal-Reachable
status: done
created: "2026-06-08T00:00:00.000Z"
updated: 2026-06-08
version: 2
tags: []
parent_id: null
requires_load: []
---
# CLI Commands — Make MCP-only Capability Terminal-Reachable

## Problem

Loom's richest capabilities now live behind the **MCP surface** — `loom://catalog`,
`loom://context/...`, the `do-next-step` prompt, and tools like `loom_search_docs`,
`loom_get_stale_docs`, `loom_get_blocked_steps`. These are reachable from MCP hosts
(Claude Code, the VS Code extension) but **not from a plain terminal**.

Today the only way to read `loom://catalog` or list resources without an MCP host is
to hand-type the 3-message JSON-RPC handshake and pipe it into `loom mcp`:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize",...}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"loom://catalog"}}' \
  | LOOM_ROOT="$(pwd)" loom mcp 2>/dev/null
```

That is a raw-protocol incantation, not a command anyone would type. The MCP surface
has outgrown the CLI: capability exists, but the human-facing delivery layer never
caught up.

## Why it matters (vision)

Loom's north star is that the system should be **reachable where the human already is**.
A developer in a terminal — no MCP host attached — should be able to ask "what tools
exist?", "what's my next step?", "what docs are stale?" without learning JSON-RPC.
This idea removes the manual step of speaking the protocol by hand.

It also gives the CLI delivery layer its **own backlog home**. Until now, CLI-flavored
ideas (`json-output`, `loom-doctor`, `cli-error-standardization`,
`mono-multi-command-clarity`, `deferred-work-command`) were archived with no thread to
belong to. This thread is where pending CLI work lands.

## Proposed direction

Add thin CLI commands that run the MCP handshake **internally** and print the result,
plus surface MCP tools that have no CLI equivalent yet:

- **Tier 1 (the trigger):** `loom catalog`, `loom resources` / `loom resources read <uri>`.
- **Tier 2 (capability gaps):** `loom context <docId>`, `loom next [plan-id]`,
  `loom search <query>`, `loom stale`, `loom blocked`.
- **Tier 3 (later fold-ins):** `--json` on read commands, `loom doctor` health check.

Each command is a thin delivery shim — it parses args, drives the MCP layer (or app),
and prints. No new domain logic; the value is reachability.

## Non-goals

- Not re-implementing MCP tools in the CLI — these wrap the existing surface.
- Not a TUI or interactive shell — single-shot commands only.
- Not adding domain behavior — strictly delivery-layer plumbing.

## Open questions

- Should the commands reach the MCP server (handshake) or call `app` use-cases
  directly? Resources like `loom://catalog` are MCP-generated, so at least those must
  go through MCP; the design resolves where each command draws from.
- Output format: human-readable by default, `--json` opt-in (Tier 3) or built in now?
