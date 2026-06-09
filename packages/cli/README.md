# @reslava/loom

**Document-native workflow for AI-assisted development.** Weave ideas into features with AI.

🔗 **Get Loom:** [GitHub repo](https://github.com/reslava/loom) · [CLI on npm](https://www.npmjs.com/package/@reslava/loom) · [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=reslava.loom-vscode) · [Open vsx](https://open-vsx.org/extension/reslava/loom-vscode)

📚 **Guides:** [Core concepts & workflow](https://github.com/reslava/loom/blob/main/docs/USER_GUIDE.md) · [Extension User Guide](https://github.com/reslava/loom/blob/main/docs/EXTENSION_USER_GUIDE.md) · [CLI / Claude Code Guide](https://github.com/reslava/loom/blob/main/docs/CLI_USER_GUIDE.md)

![Loom workflow demo](https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/loom-demo-workflow.gif)

Loom is a document-driven, event-sourced workflow system for AI-assisted development.
Markdown files are the database; state is derived; AI collaborates step-by-step with
human approval. Each project gets its own `loom/` doc workspace and an AI session
contract, so the agent stays as stateful as durable docs allow — it rereads context
at every action instead of starting each turn empty.

> **The CLI does not run the AI.** It handles setup, inspection, and manual document
> CRUD. The actual thinking and implementation happen through an MCP-capable agent
> (Claude Code, Cursor, or any MCP client) connected to the Loom MCP server.

---

## Why Loom

Loom started as a hand-built habit: while developing the .NET library
[REslava.Result](https://github.com/reslava/nuget-package-reslava-result), I got tired of
ephemeral AI chats that forgot every decision between sessions, so I began keeping ideas,
designs, plans, and requirements as persistent Markdown — grouped by feature, so the AI
always had the right context. Loom automates that.

```
Traditional AI chat:          Loom:
  knowledge drifts & dies       knowledge becomes artifacts
                                artifacts become context
                                context drives implementation
```

**The part that matters most isn't the loop — it's how Loom decides what the AI sees.** A
graph of typed docs, scope-loaded `ctx` summaries, reference docs with conditional
`requires_load` / `load_when`, and locked **requirements** (include / exclude / constrain)
route exactly the right context into every action — structural memory, not a growing chat.
→ [How context works](https://github.com/reslava/loom/blob/main/docs/USER_GUIDE.md#4-giving-the-ai-the-right-context)

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

### MCP surface & queries

These commands make the Loom MCP surface reachable from a plain terminal — no MCP host
required. The read commands (`catalog`, `resources`, `context`, `next`) run the MCP
handshake **in-process** (no subprocess, no JSON-RPC by hand); the query commands
(`search`, `stale`, `blocked`) call the shared `app` use-cases the MCP tools also use.

| Command | Description |
|---------|-------------|
| `loom catalog` | Print the grouped index of every `loom_*` MCP tool (`loom://catalog`). |
| `loom resources` | List the MCP resources this Loom advertises (uri + title). |
| `loom resources read <uri>` | Read any MCP resource by uri (e.g. `loom://summary`, `loom://context/<id>`). |
| `loom context <docId> [--mode <m>]` | Print the assembled context bundle for a doc, or a thread via `thread/<weave>/<thread>`. |
| `loom next [plan-id]` | Print the next incomplete step + context for a plan (defaults to the active plan). |
| `loom search <query> [--type <t>] [--weave <id>]` | Search docs by id/title/content; prints id + title + snippet. |
| `loom stale` | List docs that may be stale (plans behind design, children behind parents) + reason. |
| `loom blocked` | List blocked steps across implementing plans + their blockers. |

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

### Maintenance

| Command | Description |
|---------|-------------|
| `loom migrate-plan-steps [plan-id] [--dry-run]` | Migrate legacy plans (steps in the body table) to frontmatter-native `steps` (the v1.3.0 source of truth). Idempotent; never empties a table it can't parse (reports it as `unparseable` and leaves it untouched). |

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
