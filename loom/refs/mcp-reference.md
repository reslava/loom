---
type: reference
id: rf_01KQYDFDD9XKK20AREQ1TF6BCA
title: mcp
status: active
created: "2026-04-27T00:00:00.000Z"
version: 1
tags: [mcp, reference, ai-integration, ai, public]
requires_load: []
slug: mcp-reference
load: by-request
---

# mcp

## How MCP works

MCP (Model Context Protocol) is a client-server protocol over stdio.

```
Claude Code (MCP client)  ←→  loom mcp (MCP server subprocess)
```

Claude Code spawns `loom mcp` on session start, discovers its capabilities (resources, tools, prompts), then calls them during the conversation. The server process runs until Claude Code exits or restarts.

## Who owns what

| Side | Owns |
|------|------|
| **AI (Claude Code)** | Conversation context · reasoning · generation · deciding which tools to call |
| **Loom MCP Server** | Document state · frontmatter · link index · plan-step validation · reducers |

**Rule:** The AI never edits loom markdown files directly. All state changes go through MCP tools, which validate inputs and maintain consistency via reducers.

---

## Resources (read-only)

Resources give the AI read access to Loom state without file I/O.

| URI | Returns | Use when |
|-----|---------|----------|
| `loom://state` | Full project state (all weaves, threads, plans) as JSON | Need a global view |
| `loom://status` | Raw `.loom/_status.md` text | Stage 1 only |
| `loom://link-index` | Document graph (parent_id / child_ids) | Checking relationships |
| `loom://diagnostics` | Broken links, orphaned docs | Before a cleanup pass |
| `loom://summary` | Health counts (weaves, threads, plans, open steps) | Quick status |
| `loom://docs/{id}` | Raw markdown of any doc by id | Reading a specific doc |
| `loom://thread-context/{weaveId}/{threadId}` | Bundled: ctx summary + idea + design + active plan + requires_load refs | **Start of any thread work** |
| `loom://plan/{id}` | Plan doc with steps parsed as JSON | Inspecting a plan's step list |
| `loom://requires-load/{id}` | All `requires_load` docs, recursive + deduplicated | Loading a doc's full dependency tree |

`loom://thread-context` is the primary entry point. It bundles everything needed for a thread in one call.

---

## Tools (state mutations)

Always use tools to change state. Never edit weave markdown files directly.

### Creation

| Tool | Required | Optional |
|------|---------|---------|
| `loom_create_idea` | `weaveId`, `title` | `threadId` |
| `loom_create_design` | `weaveId`, `threadId`, `title` | — |
| `loom_create_plan` | `weaveId`, `threadId`, `title` | — |
| `loom_create_chat` | `weaveId`, `threadId`, `title` | — |

### Document editing

| Tool | Required | Optional |
|------|---------|---------|
| `loom_update_doc` | `id`, `content` | — |
| `loom_append_to_chat` | `chatId`, `role`, `text` | — |
| `loom_finalize_doc` | `id` | — |
| `loom_archive` | `id` | — |
| `loom_rename` | `id`, `newTitle` | — |

### Workflow lifecycle

| Tool | Required | Optional | Notes |
|------|---------|---------|-------|
| `loom_start_plan` | `planId` | — | Sets plan status to `implementing` |
| `loom_complete_step` | `planId`, `stepNumber` | — | Idempotent |
| `loom_close_plan` | `planId` | `notes` | Creates done doc; uses **DeepSeek** if `DEEPSEEK_API_KEY` is set |
| `loom_promote` | `sourceId`, `targetType` | — | `targetType`: `idea` \| `design` \| `plan`; uses **DeepSeek** for content draft |

### Search & query

| Tool | Required | Optional |
|------|---------|---------|
| `loom_find_doc` | `query` | `type`, `weaveId` |
| `loom_search_docs` | `query` | `type`, `weaveId` |
| `loom_get_blocked_steps` | — | — |
| `loom_get_stale_plans` | — | — |
| `loom_get_stale_docs` | — | — |

### AI generation — via sampling (fallback path only)

These tools call back to the **host** via MCP sampling (`sampling/createMessage`). Sampling is the **fallback** AI path — it runs only when the user has no Claude CLI installed; the primary path is the extension launching a Claude CLI agent that writes via content tools (`loom_update_doc` / `loom_create_*`). Sampling availability is host-dependent: the Loom VS Code extension provides it (via `makeAIClient()` + `reslava-loom.ai.apiKey`); a **Claude Code CLI session blocks it** (`MethodNotFound`) — there the agent itself generates and passes `content` to `loom_create_*` / `loom_update_doc`.

| Tool | Required | Optional |
|------|---------|---------|
| `loom_generate_idea` | `weaveId`, `title`, `prompt` | `threadId` |
| `loom_generate_design` | `weaveId`, `threadId`, `title` | — |
| `loom_generate_plan` | `weaveId`, `threadId`, `title` | — |
| `loom_generate_chat_reply` | `chatId` | — |
| `loom_refresh_ctx` | `weaveId`, `threadId` | — |

### AI generation — via DeepSeek (any client)

`loom_close_plan` and `loom_promote` use `DEEPSEEK_API_KEY` if set. Without it they generate a placeholder.

---

## Prompts (workflow drivers)

Prompts are pre-built conversation starters that combine context loading + instruction in one call. Call them instead of assembling context manually.

| Prompt | Required args | What it does |
|--------|--------------|-------------|
| `do-next-step` | `planId` | Loads thread context + plan, returns step instruction + `loom_complete_step` call to make |
| `continue-thread` | `weaveId`, `threadId` | Reviews thread state, suggests next action |
| `refine-design` | `weaveId`, `threadId` | Reviews design doc, suggests refinements |
| `weave-idea` | `weaveId`, `title` | Starts a new idea in the workflow |
| `weave-design` | `weaveId`, `threadId` | Transitions from idea to design |
| `weave-plan` | `weaveId`, `threadId` | Generates a plan from design |
| `validate-state` | — | Reviews diagnostics, identifies issues |

`do-next-step` is the primary workflow driver. Call it with the active `planId` to get context + step instruction in one shot.

---

## Sampling (the fallback AI path)

Sampling is MCP's mechanism for the server to request AI completions from the client (reverse call). In Loom it is the **fallback** path — see the single-AI architecture: the **primary** path is the Loom VS Code extension launching a **Claude Code CLI agent** (`launchClaude`) that does the work and writes via content tools, needing no sampling and no API key.

**Flow (fallback):** a `loom_generate_*` / `loom_refine_*` tool is called → Loom server builds a prompt → calls `sampling/createMessage` on the host → host runs inference → result returned to server → server writes content to the document.

**Host support (note: opposite of what older docs claimed):**
- **Loom VS Code extension** *supports* sampling — its `mcp-client.ts` advertises `{ sampling: {} }` and routes the call through `makeAIClient()` (`reslava-loom.ai.apiKey`, default `claude-haiku-4-5`).
- **Claude Code CLI** *blocks* sampling — it is already the agent, so server→client inference returns `MethodNotFound`. The agent generates content itself and passes it to `loom_create_*` / `loom_update_doc`.

**Single-AI rule:** Loom requires exactly one AI provider — either a Claude CLI (primary) or a configured API key (fallback) — never both.

---

## Setup

`.claude/mcp.json` (project-scoped):

```json
{
  "mcpServers": {
    "loom": {
      "command": "loom",
      "args": ["mcp"],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}",
        "DEEPSEEK_API_KEY": "your-key-here"
      }
    }
  }
}
```

`DEEPSEEK_API_KEY` enables AI-generated content in `loom_close_plan` and `loom_promote`. Without it, those tools write a placeholder body that you can fill in manually.

---

## Making MCP usage visible in the conversation

Add this rule to `CLAUDE.md` to make MCP calls visible:

```
When calling any MCP tool, output one line before the tool call:
  🔧 MCP: {tool-name}({key-args})
When reading any MCP resource, output:
  📡 MCP: {uri}
```

This lets you verify whether the AI is routing through MCP or editing files directly.
