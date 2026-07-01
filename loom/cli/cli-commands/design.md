---
type: design
id: de_01KTJS4ME8XT191QZ53HVC9WKW
title: CLI Commands — Design
status: done
created: 2026-06-08
updated: 2026-06-08
version: 2
idea_version: 2
tags: []
parent_id: id_01KTJS3W536XCQB7ZSANF161DT
requires_load: []
---
# CLI Commands — Design

## Goal

Add thin CLI commands that make the MCP-only surface reachable from a plain terminal,
and close obvious capability gaps where an MCP tool exists but no CLI does. Strictly a
**delivery-layer** addition: parse args → drive MCP/app → print. No new domain logic.

## Where each command draws from

Two sources, picked per command by what owns the data:

| Source | When | How |
|--------|------|-----|
| **MCP server (internal handshake)** | The data is MCP-generated and has no app use-case (resources/prompts). `loom://catalog`, `loom://context/...`, `do-next-step`. | Reuse the in-process server (`createLoomMcpServer`) over an in-memory transport, run `initialize → initialized → call`, return the result. **No subprocess, no stdio piping.** |
| **App use-case** | A plain function already exists in `app`. search, stale, blocked. | Call the use-case directly with `fsDeps`, like every other CLI command. |

**Key design decision — reach MCP in-process, not via subprocess.** The clunky
incantation in the chat spawns `loom mcp` and pipes JSON over stdio. The CLI should
instead instantiate the server in-process and talk to it over an in-memory transport
(the MCP SDK ships one). This avoids: a second process, stdio framing, and `LOOM_ROOT`
env juggling. The handshake still happens, but inside one process and hidden from the
user.

### Helper: `mcpClientLocal(root)`

A small CLI-internal helper (`packages/cli/src/mcpClient.ts`) that:
1. Builds the server via `createLoomMcpServer(root)`.
2. Connects it to an in-memory transport pair, runs `initialize` + `initialized`.
3. Exposes `readResource(uri)`, `listResources()`, `getPrompt(name, args)`.
4. Tears down on completion.

Every Tier-1 command and `loom context` / `loom next` is a 3-line wrapper over this.

## Command surface

### Tier 1 — the trigger

- **`loom catalog`** — `readResource("loom://catalog")`, print the grouped markdown.
- **`loom resources`** — `listResources()`, print uri + title table.
- **`loom resources read <uri>`** — `readResource(uri)`, print contents. Generalizes
  `loom catalog` and makes `loom://context/...` reachable too.

### Tier 2 — capability gaps

- **`loom context <docId>`** — `readResource("loom://context/<docId>")` (accepts
  `--mode chat` and the `thread/<weave>/<thread>` form). Prints the assembled bundle.
- **`loom next [plan-id]`** — `getPrompt("do-next-step", {planId})`, print the next
  step + context. Defaults to the active plan when omitted.
- **`loom search <query>`** — app `searchDocs` use-case; print id + title + snippet.
- **`loom stale`** — app stale-docs use-case; list stale docs + reason.
- **`loom blocked`** — app blocked-steps use-case; list blocked steps + blocker.

### Tier 3 — deferred (named, not built here)

- `--json` flag on read commands (folds in the archived `json-output` idea).
- `loom doctor` health check (folds in the archived `loom-doctor` idea).

These are out of scope for the first plan; the design records them so the thread keeps
the backlog.

## File structure

```
packages/cli/src/
  mcpClient.ts          ← new: in-process MCP client helper
  commands/
    catalog.ts          ← new
    resources.ts        ← new (list + read subcommand)
    context.ts          ← new
    next.ts             ← new
    search.ts           ← new
    stale.ts            ← new
    blocked.ts          ← new
  index.ts              ← register the new commands
```

Each command file follows the existing pattern (an exported `xCommand` action handler
wired in `index.ts`). No changes to `app`/`core`/`fs` for Tier 1; Tier 2 reuses
existing app use-cases (verify they exist; if a thin wrapper is missing, add it in
`app`, not in the CLI).

## Testing

- Unit: `mcpClient.ts` round-trips a known resource (`loom://catalog`) and returns
  non-empty grouped markdown.
- Command tests in `tests/commands.test.ts` style: run each command against a fixture
  loom, assert output shape. Reuse the existing CLI test harness.

## Trade-offs considered

- **In-process MCP vs. subprocess:** in-process is cleaner (one process, no stdio
  framing) and is the only correct way to avoid re-deriving `LOOM_ROOT`. Rejected the
  subprocess approach — it just automates the clunky thing instead of removing it.
- **CLI re-implements tools vs. wraps surface:** wrapping keeps one source of truth.
  Re-implementing would drift from MCP. Rejected.
