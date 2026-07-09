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

> **Prefer VS Code?** The [**Loom AI extension**](https://marketplace.visualstudio.com/items?itemName=reslava.loom-vscode) bundles this same engine — install it and everything works in **1 click, no CLI needed**. This npm package is the right choice when you drive Loom from **Cursor, Continue, terminal Claude Code, or CI** (as an MCP server) or straight from the terminal. See [the three ways to run Loom](https://github.com/reslava/loom/blob/main/loom/refs/architecture-reference.md#delivery-surfaces--audiences).

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

The loop: `chat → {generate|refine} idea/design/req/plan/ctx → {implement step(s)} → done`.

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
| `loom status [weave] [--verbose] [--json] [--filter <c>] [--sort <o>]` | Show derived state of weaves/threads. |
| `loom validate [weave] [--all] [--verbose]` | Validate document integrity, links, and staleness. |
| `loom roadmap [--group-by-thread]` | Print the derived cross-weave roadmap — one Roadmap band (present + future in a single dependency + priority order, status + blocked-on per row) and history (shipped plans, newest first). Pure read. |

### Feedback

| Command | Description |
|---------|-------------|
| `loom feedback [--repo <owner/name>] [--print]` | Open a prefilled GitHub issue to send feedback about Loom. **Opt-in:** it carries Loom version, OS, and non-PII usage counts (weaves / threads / done plans / current release) that you review and edit before sending — nothing is sent automatically. Targets the workspace's git `origin` remote by default; `--repo` overrides the target, `--print` emits the URL instead of opening a browser. |

### Usage telemetry (opt-in, off by default)

Loom can optionally send **anonymous, content-free** usage telemetry so we can see whether the workflow loop is used and where people stall. It is **off by default** and sends nothing until you enable it.

- **Enable:** `LOOM_TELEMETRY=1` (e.g. in your `.mcp.json` server env, which is where the agent-side `loom mcp` server reads it). **Disable / kill switch:** unset it or set `LOOM_TELEMETRY=0`.
- **Sent only when on:** a random install id, Loom version, OS, `is_ci`, the surface (`cli`/`agent`), and fixed workflow events (`workspace_activated`, `session_started`, `doc_generated`/`doc_refined` with the doc *type*, `plan_started`, `step_completed`, `plan_done`, `command_invoked`, `error`).
- **Never sent:** document content, titles, slugs, paths, weave/thread names, or any PII. Events go to PostHog (EU).

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
| `loom context <doc> [--mode <m>]` | Print the assembled context bundle for a doc, or a thread via `thread/<weave>/<thread>`. |
| `loom next [plan]` | Print the next incomplete step + context for a plan (defaults to the active plan). |
| `loom search <query> [--type <t>] [--weave <weave>]` | Search docs by id/title/content; prints id + title + snippet. |
| `loom stale [--all]` | List docs that may be stale — a child whose upstream parent moved past its stamped baseline (`design` behind idea, `req` behind design, `plan` behind design/req) + reason. Default shows the **actionable** set (matches the extension); `--all` adds done/historical docs. See [the staleness model](../../loom/refs/staleness-reference.md). |
| `loom blocked` | List blocked steps across implementing plans + their blockers. |

### Documents (manual CRUD)

| Command | Description |
|---------|-------------|
| `loom weave idea <title> [--weave <weave>] [--thread <slug>] [--loose]` | Create an idea document. |
| `loom weave design <weave> [--title <t>] [--thread <slug>]` | Create a design from an existing idea. |
| `loom weave plan <weave> [--title <t>] [--goal <g>] [--thread <slug>]` | Create a plan from a finalized design. |
| `loom finalize <draft>` | Finalize a draft document (status `draft` → `active`). The ULID `id` is unchanged — there is no temp→permanent step. |
| `loom rename <doc> <new-title>` | Rename a document's **title** only. The ULID `id` and all cross-references (by ULID) are untouched. |

### Workflow events

| Command | Description |
|---------|-------------|
| `loom refine-design <weave>` | Fire `REFINE_DESIGN` (bumps design version, marks child plans stale). |
| `loom start-plan <plan>` | Move a plan to `implementing`. |
| `loom complete-step <plan> --step <n>` | Mark plan step `n` as done. |

These event/CRUD commands change document **state** only.

### Maintenance

| Command | Description |
|---------|-------------|
| `loom migrate [--dry-run]` | Backfill `thread.md` (a fresh `th_` ULID + title + default priority) for every thread folder missing one — needed for the derived roadmap. Idempotent (skips threads that already have a manifest); `--dry-run` prints what it would create and touches nothing. |
| `loom migrate-plan-steps [plan] [--dry-run]` | Migrate legacy plans (steps in the body table) to frontmatter-native `steps` (the v1.3.0 source of truth). Idempotent; never empties a table it can't parse (reports it as `unparseable` and leaves it untouched). |
| `loom backfill-design-versions [--dry-run]` | Repair plan `design_version` baselines stamped before create/promote read the live design version. Idempotent. |
| `loom backfill-staleness-baselines [--dry-run]` | Migrate onto the [directional staleness model](../../loom/refs/staleness-reference.md): stamp `idea_version` on designs and `design_version` on reqs, repoint each req parent idea→design (and strip the dead `req_version`). Idempotent. |

---

## MCP server

`loom mcp` starts the Loom MCP server over stdio. You normally never run it by hand —
your agent launches it via the `.mcp.json` that `loom install` writes:

```json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@reslava/loom@<version>", "mcp"]
    }
  }
}
```

`loom install` writes this with the version pinned, so the agent fetches the exact
build via `npx` — no global install required. This pinned `npx` form is the
recommended shape: the older `"command": "loom", "args": ["mcp"]` (a globally-installed
`loom` binary) is **retired** as the MCP-server form — it updates on its own schedule
and can silently drift from the extension. If you run Loom in VS Code, the extension
migrates a legacy `command:"loom"` config to this pin for you (or run
`loom install --migrate-mcp-command`).

The server exposes Loom's documents, workflow tools, and prompts to the agent so all
writes to `loom/**/*.md` flow through validated, event-sourced operations.

---

## License

MIT
