---
type: reference
id: rf_01KQYDFDDD6SYMCJ1Q2Z6748EK
title: cli — Commands
status: active
created: "2026-04-14T00:00:00.000Z"
version: 2
tags: [cli, commands, reference, loom, public]
requires_load: []
slug: cli-commands-reference
load: by-request
---

# Loom CLI Commands Reference

Every command in the `loom` CLI. Source of truth: `packages/cli/src/index.ts`.

> **The CLI does not run the AI.** It handles setup, inspection, and manual document CRUD. AI work happens through an MCP-capable agent (Claude Code) connected to the Loom MCP server — see the **[CLI / Claude Code User Guide](../../docs/CLI_USER_GUIDE.md)**.

---

## Workspace & initialization

### `loom install [--force]`
Install Loom into the **current** workspace: creates `.loom/`, writes `.loom/CLAUDE.md`, patches the root `CLAUDE.md`, and writes the MCP config. This is the normal per-project initializer.

### `loom init [--force]`
Initialize a mono-loom workspace in the current directory.

### `loom init-multi [--force]`
Initialize the global multi-loom workspace at `~/looms/default`.

### `loom setup <name> [--path <path>] [--no-switch]`
Create a new named loom workspace. `--path` sets a custom location; `--no-switch` keeps the current active loom.

### `loom switch <name>`
Switch the active loom context.

### `loom list`
List all registered looms.

### `loom current`
Show the currently active loom.

### `loom mcp`
Start the Loom MCP server over stdio. Normally launched **by your agent** via `.mcp.json` (`"command": "loom", "args": ["mcp"]`), not run by hand.

---

## Inspection

### `loom status [weave-id] [--verbose] [--json] [--tokens] [--filter <criteria>] [--sort <order>]`
Show derived state of weaves/threads.
- `--verbose` — include plan steps.
- `--json` — machine-readable output.
- `--filter` — e.g. `status=active,implementing` or `phase=planning`.
- `--sort` — e.g. `id:asc`, `id:desc`.

### `loom validate [weave-id] [--all] [--fix] [--verbose]`
Validate document integrity, links, and staleness. `--all` validates every weave; `--verbose` shows detailed issues. (`--fix` is not yet implemented.)

---

## Documents (manual CRUD)

### `loom weave idea <title> [--weave <name>] [--thread <id>] [--loose]`
Create an idea document. By default creates a thread named from the title; `--weave` places it in a specific weave, `--thread` sets an explicit thread ID, `--loose` creates a loose fiber at the weave root.

### `loom weave design <weave-id> [--title <t>] [--thread <id>]`
Create a design from an existing idea.

### `loom weave plan <weave-id> [--title <t>] [--goal <g>] [--thread <id>]`
Create a plan from a finalized design.

### `loom finalize <temp-id>`
Finalize a draft document and generate its permanent ID.

### `loom rename <old-id> <new-title>`
Rename a finalized document and update references to it.

---

## Workflow events

### `loom refine-design <weave-id>`
Fire the `REFINE_DESIGN` event (bumps the design version, marks child plans stale).

### `loom start-plan <plan-id>`
Move a plan to `implementing`.

### `loom complete-step <plan-id> --step <n>`
Mark plan step `n` as done.

---

> These event/CRUD commands change document **state** only. The actual thinking and implementation —
> drafting idea content, designing, writing code for a step — is done through your MCP agent (§4 of the
> [CLI / Claude Code User Guide](../../docs/CLI_USER_GUIDE.md)).
