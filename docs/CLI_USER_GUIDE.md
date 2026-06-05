# Loom — CLI & Claude Code User Guide

> **New to Loom?** Read **[Core concepts & workflow](USER_GUIDE.md)** first — it explains weaves, threads, the chat → idea → design → plan → done loop, and how context works. This guide covers only what's specific to driving Loom from the **terminal**: the `loom` CLI and an MCP-capable agent (Claude Code).

---

## Contents

1. [Two terminal roles](#1-two-terminal-roles)
2. [Install & initialize](#2-install--initialize)
3. [Connect Claude Code (MCP)](#3-connect-claude-code-mcp)
4. [Driving the loop through the agent](#4-driving-the-loop-through-the-agent)
5. [Seeing what context the AI got](#5-seeing-what-context-the-ai-got)
6. [The `loom` CLI command reference](#6-the-loom-cli-command-reference)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Two terminal roles

In the terminal, Loom has two distinct surfaces — don't confuse them:

- **The `loom` CLI** — for **setup, inspection, and manual document CRUD**: `loom install`, `loom status`, `loom validate`, `loom weave …`, etc. The CLI does **not** run the AI.
- **An MCP agent (Claude Code)** — this is where the **AI work** happens. The agent connects to the Loom **MCP server** (`loom mcp`) and uses Loom's tools (`loom_create_idea`, `loom_do_step`, `loom_complete_step`, …) and resources (`loom://context/…`) to read and advance your documents.

So: you use `loom` to set up and to look at state; you talk to **Claude Code** to actually move the workflow forward.

---

## 2. Install & initialize

**Install the CLI globally:**

```bash
npm install -g @reslava/loom
```

**Initialize Loom in your project**, from the project root:

```bash
loom install
```

This creates `.loom/` (config), `loom/` (your document workspace), patches a root `CLAUDE.md` session contract, and writes the MCP config. You only do this once per project.

---

## 3. Connect Claude Code (MCP)

The Loom MCP server runs inside MCP-capable hosts — **Claude Code (CLI)**, the **Claude desktop app**, Cursor, Continue, etc.

Add **`.mcp.json`** to your project root:

```json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "loom",
      "args": ["mcp"],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

> For a user-global config instead of per-project, put the same `mcpServers` block in `~/.claude.json`.

Project-scoped servers need one-time approval: run `claude` in the project root and approve `loom` (or use `claude /mcp`). Verify with:

```bash
claude mcp list
```

You should see `loom` connected.

---

## 4. Driving the loop through the agent

Once connected, you collaborate in natural language; the agent calls Loom tools under the hood. The session follows a consistent rhythm:

**Session start.** The session contract has the agent load the global context, read which threads are active, and surface the next step — then **stop and wait for your `go`**. You'll see a short "Session start" summary with the active weave, the active plan, and the next step.

**Advancing the work.** The primary driver is the **`do-next-step`** prompt: it bundles the thread context (idea, design, active plan, plus any `requires_load` references) and the next incomplete step, ready to execute. Other entry points:

| You want to… | Ask the agent / use |
|--------------|--------------------|
| Work the next plan step | the `do-next-step` prompt |
| Review a thread and get a suggestion | the `continue-thread` prompt |
| Lock a thread's scope (requirements) | `loom_create_req` (with `content`) → `loom_finalize_req` |
| Check the plan honours the requirements | `loom_verify_req` |
| Create an idea / design / plan | `loom_create_*` then fill it in |
| Reply inside a chat | the agent appends via `loom_append_to_chat` |
| Mark a step done | `loom_complete_step` |
| Refresh a ctx summary | `loom_refresh_ctx` |

**The stop rhythm.** Like the extension, the agent does **one step**, records it, names the next step and files, then **stops for `go`**. You can authorize a range ("do steps 2–4") when you want it to run ahead.

> **Note on generation:** in a Claude Code session, the AI *is* Claude — so the `loom_generate_*` (sampling) tools are intentionally disabled. The agent instead creates the doc in a single call by passing `content` to `loom_create_*`. You don't need to think about this; it's automatic.

**Locking scope (requirements).** Before the design and plan, you can have the agent extract a `req` doc from your chat — the thread's *include / exclude / constraints*. The agent calls `loom_create_req` with the content, you curate, then `loom_finalize_req` locks it. From there the locked spec auto-loads into every action in the thread, and `loom_verify_req` checks the plan covers what was asked and avoids what was excluded. Full model: [loom-requirements-reference](../loom/refs/loom-requirements-reference.md). The complete tool/resource catalogue is in [mcp-reference](../loom/refs/mcp-reference.md).

---

## 5. Seeing what context the AI got

Loom's promise is that you see exactly what the AI saw. In a terminal session that shows up two ways:

- **Visibility lines.** When the agent loads context, it prints one line per document — e.g. `📄 auth-design.md — loaded for context`. That's the literal bundle that went into the prompt.
- **`loom status`.** Inspect derived state — which threads are active, plan progress, stale docs — without launching the AI.

The context *model* (global/weave ctx, references, `requires_load`, `load_when`) is explained in **[§4 of the core guide](USER_GUIDE.md#4-giving-the-ai-the-right-context)**. The same `.loom/context-prefs.json` overrides the extension's CONTEXT panel writes are honored here too — the launch path reads them when assembling the bundle.

---

## 6. The `loom` CLI command reference

Setup, inspection, and manual CRUD. (The AI is driven through your MCP agent — see §4.) The canonical, exhaustive list lives in [cli-commands-reference](../loom/refs/cli-commands-reference.md); the table below is the everyday subset.

### Workspace

| Command | Description |
|---------|-------------|
| `loom install [--force]` | Install Loom into the current workspace (`.loom/`, `CLAUDE.md`, MCP config). |
| `loom init [--force]` | Initialize a mono-loom workspace in the current directory. |
| `loom setup <name> [--path <p>] [--no-switch]` | Create a new named loom workspace. |
| `loom switch <name>` | Switch the active loom. |
| `loom list` | List registered looms. |
| `loom current` | Show the active loom. |
| `loom mcp` | Start the MCP server (stdio). Normally launched *by* your agent via `.mcp.json`, not by hand. |

### Inspection

| Command | Description |
|---------|-------------|
| `loom status [weave-id] [--verbose] [--json] [--filter <…>] [--sort <…>]` | Show derived state of weaves/threads. |
| `loom validate [weave-id] [--all] [--verbose]` | Check document integrity, links, and staleness. |

### Documents (manual CRUD)

| Command | Description |
|---------|-------------|
| `loom weave idea <title> [--weave <w>] [--thread <id>] [--loose]` | Create an idea (new thread by default). |
| `loom weave design <weave-id> [--thread <id>] [--title <t>]` | Create a design from an existing idea. |
| `loom weave plan <weave-id> [--thread <id>] [--goal <g>] [--title <t>]` | Create a plan from a finalized design. |
| `loom finalize <temp-id>` | Finalize a draft doc and assign its permanent ID. |
| `loom rename <old-id> <new-title>` | Rename a finalized doc and update references. |

### Workflow events

| Command | Description |
|---------|-------------|
| `loom refine-design <weave-id>` | Fire `REFINE_DESIGN`. |
| `loom start-plan <plan-id>` | Move a plan to `implementing`. |
| `loom complete-step <plan-id> --step <n>` | Mark a plan step done. |

> These CRUD/event commands change document *state* without involving the AI. The actual *thinking and implementation* — drafting an idea's content, designing, writing code for a step — is what you do through Claude Code (§4).

---

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `claude mcp list` doesn't show `loom` | Check `.mcp.json` exists in the project root and approve the server (`claude` interactively, or `claude /mcp`). |
| "Loom MCP server not built" | The CLI's MCP entry isn't built. If running from source, build it; if installed via npm, reinstall `@reslava/loom`. |
| A tool isn't found | Your installed `loom` may be older than the docs expect. Reinstall the CLI: `npm install -g @reslava/loom`. |
| Agent ignores a doc you expected | Check the `📄` visibility lines for what actually loaded, then add a `requires_load` citation or adjust the reference's `load` / `load_when`. |
| State looks wrong | Run `loom validate` to surface broken links and stale docs. |
