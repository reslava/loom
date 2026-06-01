# @reslava/loom

**REslava Loom — Weave ideas into features with AI.**

Loom is a document-driven, event-sourced workflow system for AI-assisted development.
Markdown files are the database; state is derived; AI collaborates step-by-step with
human approval. Each project gets its own `loom/` doc workspace and an AI session
contract, so the agent stays as stateful as durable docs allow — it rereads context
at every action instead of starting each turn empty.

> **The CLI does not run the AI.** It handles setup, inspection, and manual document
> CRUD. The actual thinking and implementation happen through an MCP-capable agent
> (Claude Code, Cursor, or any MCP client) connected to the Loom MCP server.

---

## Install

```bash
npm install -g @reslava/loom
```

Then, inside any project repository:

```bash
loom install
```

This creates `.loom/`, writes `.loom/CLAUDE.md`, patches the root `CLAUDE.md`, and
writes `.mcp.json` so an MCP agent can reach the Loom server.

No global install? Run any command through `npx`:

```bash
npx @reslava/loom status
```

---

## Quick start

1. `loom install` — scaffold Loom into the current project.
2. Open the project in **Claude Code** (or another MCP-capable agent). The generated
   `.mcp.json` wires up the `loom` MCP server automatically.
3. Chat with the agent to shape ideas, then let it generate designs, plans, and
   implement plan steps — all recorded as markdown under `loom/`.

The loop: `chat → {generate|refine} idea/design/plan/ctx → {implement step(s)} → done`.

---

## Commands

The CLI handles setup, inspection, and document state. AI work (drafting content,
designing, writing code for a step) is done through your MCP agent.

### Workspace & initialization

| Command | Description |
|---------|-------------|
| `loom install [--force]` | Install Loom into the current workspace (`.loom/`, `.loom/CLAUDE.md`, `.mcp.json`). |
| `loom init [--force]` | Initialize a mono-loom workspace in the current directory. |
| `loom init-multi [--force]` | Initialize the global multi-loom workspace at `~/looms/default`. |
| `loom setup <name> [--path <p>] [--no-switch]` | Create a new named loom workspace. |
| `loom switch <name>` | Switch the active loom context. |
| `loom list` | List all registered looms. |
| `loom current` | Show the currently active loom. |
| `loom mcp` | Start the Loom MCP server (stdio). Launched by your agent, not by hand. |

### Inspection

| Command | Description |
|---------|-------------|
| `loom status [weave-id] [--verbose] [--json] [--filter <c>] [--sort <o>]` | Show derived state of weaves/threads. |
| `loom validate [weave-id] [--all] [--verbose]` | Validate document integrity, links, and staleness. |

### Documents (manual CRUD)

| Command | Description |
|---------|-------------|
| `loom weave idea <title> [--weave <n>] [--thread <id>] [--loose]` | Create an idea document. |
| `loom weave design <weave-id> [--title <t>] [--thread <id>]` | Create a design from an existing idea. |
| `loom weave plan <weave-id> [--title <t>] [--goal <g>] [--thread <id>]` | Create a plan from a finalized design. |
| `loom finalize <temp-id>` | Finalize a draft document and generate its permanent ID. |
| `loom rename <old-id> <new-title>` | Rename a finalized document and update references. |

### Workflow events

| Command | Description |
|---------|-------------|
| `loom refine-design <weave-id>` | Fire `REFINE_DESIGN` (bumps design version, marks child plans stale). |
| `loom start-plan <plan-id>` | Move a plan to `implementing`. |
| `loom complete-step <plan-id> --step <n>` | Mark plan step `n` as done. |

These event/CRUD commands change document **state** only.

---

## MCP server

`loom mcp` starts the Loom MCP server over stdio. You normally never run it by hand —
your agent launches it via the `.mcp.json` that `loom install` writes:

```json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "loom",
      "args": ["mcp"],
      "env": { "LOOM_ROOT": "${workspaceFolder}" }
    }
  }
}
```

The server exposes Loom's documents, workflow tools, and prompts to the agent so all
writes to `loom/**/*.md` flow through validated, event-sourced operations.

---

## License

MIT
