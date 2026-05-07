---
type: design
id: de_01KQYDFDD9PRVJT4JBAQ0JHRG6
title: Loom MCP Server — Exposing Loom State to AI Agents
status: done
created: "2026-04-25T00:00:00.000Z"
updated: 2026-05-07
version: 3
tags: [ai, mcp, integration, agent, loom]
parent_id: null
requires_load: [de_01KQYDFDD88BTYTQ61S0Q9W02V]
role: primary
target_release: 0.5.0
actual_release: 0.4.0
---

# Loom MCP Server — Exposing Loom State to AI Agents

## Goal

Define an MCP (Model Context Protocol) server, distributed as `packages/mcp/`, that exposes Loom's structured project memory to any MCP-compatible AI agent (Claude Code, Cursor, future tools).

The server lets the agent — not Loom — perform code edits, bash, and codebase exploration, while Loom remains the source of truth for **workflow structure**: weaves, threads, ideas, designs, plans, steps, decisions, chats.

## Context

### Why MCP

Three approaches were evaluated for closing the gap between "Loom generates docs" and "AI implements code from those docs":

| Approach | Cost | AI-agnostic | Reuses existing tools |
|----------|------|-------------|-----------------------|
| Build coding agent in Loom | High | Yes | No (reinvents Claude Code) |
| Use Claude Agent SDK | Medium | No | Partial |
| **Loom as MCP server** | **Low** | **Yes** | **Yes** |

MCP is an open protocol — Anthropic-published but supported by Cursor, Continue, Cline, and others. Implementing once exposes Loom to every MCP-aware agent.

### Architectural position

```
User
 └── AI Agent (Claude Code / Cursor / ...)
       ├── built-in: read_file, write_file, bash, grep, edit
       └── via MCP → Loom server (this design)
             ├── reads weave/thread/plan structure
             ├── proposes/applies workflow state changes
             └── tracks progress

Loom (independent)
 └── direct AI API calls → generates idea/design/chat docs (Option A unchanged)
```

The agent owns **code execution**. Loom owns **workflow state**. Each stays in its lane.

## Tech Stack

- **Language:** TypeScript. Anthropic publishes `@modelcontextprotocol/sdk` for TS — first-class support, matching the rest of Loom's codebase. Python and Go SDKs also exist; TS is the natural choice here.
- **Transport:** `stdio` for v1 (agent spawns `loom mcp` as a subprocess). HTTP/SSE can be added later for remote scenarios.
- **Package layout:** `packages/mcp/` — own `package.json`, depends on `@reslava-loom/app` and `@reslava-loom/fs` (the existing layer that already implements all use cases).
- **Entry point:** `loom mcp` CLI subcommand. Code lives in `packages/mcp/`, the CLI delegates to it. Single global install; no second binary. Configured in the agent's MCP config:

  ```json
  {
    "mcpServers": {
      "loom": { "command": "loom", "args": ["mcp"] }
    }
  }
  ```

## MCP Primitives

MCP servers expose three primitive types. Loom uses all three:

| Primitive | Use in Loom | Examples |
|-----------|-------------|----------|
| **Resources** | Read-only doc/state access | A plan doc, a thread bundle, the full Loom state JSON |
| **Tools** | Actions with side effects | Mark step done, create idea, promote chat to design |
| **Prompts** | Templated user-invocable prompts | "Refine plan", "Continue thread X" |

## Endpoint Catalog

Categorised by purpose. This is the v1 surface; not every endpoint needs to ship at once.

### 1. Discovery & State (resources)

Read-only, idempotent, cheap. `loom://state` is the single source of truth — filtered via query params rather than separate per-weave/per-thread endpoints.

| Endpoint | Type | Description |
|----------|------|-------------|
| `loom://state` | Resource | Full Loom state JSON (weaves, threads, summary). Accepts `?weaveId=` and `?threadId=` for scoped results. Same shape as `getState`. |
| `loom://status` | Resource | Contents of `.loom/_status.md`. **Temporary** — exists only while Loom is in Stage 1 (manual status tracking). Will be removed once Loom derives all status from docs + code natively. |
| `loom://link-index` | Resource | Resolved parent_id / child_ids graph. |

### 2. Document Reading (resources)

| Endpoint | Type | Description |
|----------|------|-------------|
| `loom://docs/{id}` | Resource | Raw markdown of any doc by ID. |
| `loom://thread-context/{weaveId}/{threadId}` | Resource | Bundled context: idea + design + active plan + linked refs. The "everything you need to work on this thread" payload. |
| `loom://plan/{id}` | Resource | Plan doc with parsed steps array. |
| `loom://requires-load/{id}` | Resource | Recursively resolves all `requires_load` chains and returns the union of doc contents. |

### 3. Document Authoring (tools)

Each tool returns the new/updated doc and the file path.

| Tool | Description |
|------|-------------|
| `loom_create_idea` | New idea in a weave or thread. Args: `weaveId`, `threadId?`, `title`, `content`. |
| `loom_create_design` | New design in a thread. Args: `weaveId`, `threadId`, `title`, `content`. |
| `loom_create_plan` | New plan in a thread. Args: `weaveId`, `threadId`, `title`, `steps[]`. |
| `loom_update_doc` | Rewrite an existing doc's content (frontmatter preserved). Args: `id`, `content`. |
| `loom_append_to_chat` | Append a message under `## AI:` or `## User:` to a chat doc. Args: `id`, `role`, `body`. |
| `loom_create_chat` | New chat doc in a weave or thread. Args: `weaveId`, `threadId?`, `title?`. |

### 4. Workflow Transitions (tools)

These mutate plan/step state and are the heart of the agentic loop.

| Tool | Description |
|------|-------------|
| `loom_start_plan` | Move a plan from `draft` → `active`. Args: `id`. |
| `loom_complete_step` | Mark a step done in a plan's table. Args: `planId`, `stepNumber`. |
| `loom_close_plan` | Finalise a plan; emit a done doc summarising the work. Args: `id`, `summary?`. |
| `loom_promote` | idea → design, idea → plan, design → plan, chat → idea. Args: `sourceId`, `targetType`. |
| `loom_finalize_doc` | Move a `-temp` doc into final form. Args: `id`. |
| `loom_archive` | Move a doc/thread/weave into `_archive/`. Args: `id`. |
| `loom_rename` | Rename a doc and update all references. Args: `oldId`, `newTitle`. |

### 5. Search & Query (tools)

| Tool | Description |
|------|-------------|
| `loom_find_doc` | Locate a doc by ID. Args: `id`. Returns path. |
| `loom_search_docs` | Full-text search across all docs. Args: `query`, `type?`, `weaveId?`. |
| `loom_get_blocked_steps` | List steps blocked by missing dependencies across all plans. |
| `loom_get_stale_plans` | List plans whose `design_version` is below current design version. |
| `loom_get_stale_docs` | Generalised stale check — returns all docs (including ctx, ideas) whose parent has been updated since last generation. |
| `loom_refresh_ctx` | Trigger ctx regeneration for a thread or weave via sampling. Agent generates summary, server saves to `{thread}/ctx/` or `{weave}/ctx.md`. Args: `weaveId`, `threadId?`. |

### 6. Diagnostics (resources)

| Endpoint | Type | Description |
|----------|------|-------------|
| `loom://diagnostics` | Resource | Broken parent_ids, dangling child_ids, orphaned docs. |
| `loom://summary` | Resource | Counts: totalWeaves, activeWeaves, totalPlans, stalePlans, blockedSteps. |

### 7. Prompts (templates)

User-invocable prompt templates that the agent fills in. These are Loom's primary "guided workflow" surface — the user selects a prompt, the MCP server fills in all required context (docs, state, step details), and the agent receives a fully loaded task. Eliminates the "load `requires_load` manually" step that currently Rafa has to do.

| Prompt | Description |
|--------|-------------|
| `continue-thread` | Loads thread context (ctx first if fresh, then idea + design + active plan) and asks the agent to propose the next action. Args: `weaveId`, `threadId`. |
| `do-next-step` | Loads the active plan, next incomplete step, and all `requires_load` referenced docs; asks the agent to implement it. Args: `planId`. |
| `refine-design` | Loads design + linked chat history and asks for a refinement proposal. Args: `designId`. |
| `weave-idea` | Generates a new idea doc from a user prompt. Invokes MCP sampling to ask the host agent for AI generation; saves via `loom_create_idea`. Args: `weaveId`, `threadId?`, `prompt`. |
| `weave-design` | Drafts a design from the thread idea using MCP sampling. Args: `weaveId`, `threadId`. |
| `weave-plan` | Drafts a plan with steps from the thread design using MCP sampling. Args: `weaveId`, `threadId`. |
| `validate-state` | Asks the agent to scan `loom://diagnostics` and propose fixes. |

### 8. Sampling (server-initiated LLM calls)

MCP sampling is where the **server requests the host agent to run an LLM inference**. This is the inverse of normal tool use and is the mechanism that replaces Loom's standalone AI API layer.

**Why this matters:** The VS Code extension's "Weave Idea", "Weave Design", "Weave Plan" toolbar buttons previously called the AI API directly (requiring `reslava-loom.ai.*` keys). With sampling, these buttons instead:
1. VS Code extension calls the MCP server (`loom_request_idea_generation`)
2. MCP server issues a `sampling/createMessage` request to the host agent (Claude Code)
3. The host agent generates text using its own model connection (user's Claude subscription)
4. Generated content returned to the MCP server → saved as a Loom doc

**Result:** No separate API key. The user's Claude Code connection handles all AI generation. Single billing.

**Sampling is optional in the MCP spec** — not all clients implement it. Claude Code supports it; Cursor does not yet (as of 2026-04). VS Code extension AI buttons should degrade gracefully: if the connected client doesn't support sampling, show a message to use Claude Code's chat instead.

| Sampling request | Triggered by | Description |
|-----------------|--------------|-------------|
| `generate_idea` | VS Code "Weave Idea" button | Asks host to draft idea content from user-supplied prompt |
| `generate_design` | VS Code "Weave Design" button | Asks host to draft design from linked idea |
| `generate_plan` | VS Code "Weave Plan" button | Asks host to draft plan with steps from linked design |
| `generate_chat_reply` | VS Code "AI Reply" button | Asks host to continue the chat conversation |
| `suggest_next_action` | VS Code status indicator click | Asks host what to do next given current Loom state |

## Design Decisions

### MCP is a delivery layer — always delegate to app

MCP joins `cli` and `vscode` as the third delivery layer. The dependency rule is identical:

```
mcp  →  app  →  core + fs
```

Every MCP tool must call an existing `packages/app/` use case. If a use case doesn't exist yet, implement it in `app` first, then wrap it in the MCP tool. No bypassing. This ensures the same business logic is available from CLI, VS Code, and MCP without duplication.

### State changes go through tools, not through file writes

The agent has direct file access — it *could* edit Loom docs directly. But that bypasses Loom's invariants (frontmatter conventions, link index updates, plan-step parsing, status transitions). Workflow state changes **must** go through MCP tools so Loom's reducers and validators run.

The agent is told this in the tool descriptions and the project CLAUDE.md.

### Resources for read, tools for write

MCP resources are fetched lazily by the agent when relevant. Tools are explicit actions. Mapping read endpoints to resources (URI-addressable, cacheable) is more efficient than tools for large data like full state.

### Tool descriptions matter more than tool count

Each tool needs a precise, agent-readable description. The agent decides whether to call a tool based on its description. A vague description means the agent ignores it. Descriptions should mention when to use the tool, what arguments mean, and what the return shape is.

### Idempotency where possible

`loom_complete_step` should be safe to call twice (no double-marking). `loom_create_idea` with an existing ID should error rather than overwrite. This protects against retry loops.

## Repositioning Loom

After the MCP server ships, Loom can be defined as:

> **Loom is the structured project memory for AI-assisted development.** A markdown-based document graph (weaves → threads → ideas → designs → plans → done) that any AI agent can read, write, and reason over via MCP. It gives stateless coding agents persistent context, workflow state, and approval gates so multi-session work stays coherent.

User-facing one-liner:

> *"Your AI co-developer's long-term memory."*

The VS Code extension becomes the **human surface** (tree view, inline chat, command palette) over the same underlying document graph. The MCP server becomes the **agent surface**.

## Limitations vs Direct Agent SDK

Choosing MCP over a custom-built coding agent has real trade-offs. Listed honestly:

1. **No control over conversation flow.** With Agent SDK, Loom would orchestrate the AI loop directly. With MCP, the agent's host (Claude Code) controls the loop. Loom can only expose tools; it can't force ordering or insertion of system prompts mid-conversation.

2. **No proactive notification.** MCP servers are reactive. Loom can't "ping" the agent saying "step 5 just got blocked." The user has to ask.

3. **Streaming progress is limited.** Tool responses are atomic. A long-running operation (e.g., "do this whole plan") can't stream intermediate progress back through the tool call. Workaround: small-grained tools (per step) instead of one large tool.

4. **No tool-call ordering guarantees.** The agent may call tools in unexpected orders. Loom's tools must be robust to this — each tool validates its preconditions.

5. **Per-agent UX differences.** Claude Code, Cursor, and others surface MCP tools differently. Loom can't control how a tool appears in the agent's UI.

6. **Discovery is on the agent.** If the agent doesn't realise a tool is relevant, it won't use it. Good descriptions and a brief CLAUDE.md / `.cursor/rules` snippet help.

7. **Authentication is local-only by default.** stdio transport assumes single-user local access. Multi-user / remote MCP needs HTTP + auth — out of scope for v1.

For Loom's use case (single-developer workflow tool) all seven are acceptable. The big wins — no coding agent to build, AI-agnostic via open protocol, leverages existing agent capabilities — vastly outweigh them.

## What changes vs current design

**Removed:**
- `reslava-loom.ai.*` settings (`provider`, `apiKey`, `model`, `baseUrl`) — no longer needed
- `packages/app/src/chatNew.ts`, `weaveIdea.ts`, `refineDesign.ts`, `doStep.ts` AI API call paths — replaced by MCP tools + sampling
- `loom.aiEnabled` context key and guards in VS Code extension — replaced by MCP connection detection

**Kept (non-AI app use cases stay):**
- All state management, doc creation, plan step tracking — the MCP tools are thin wrappers over these
- Tree view, VS Code commands for structural actions (rename, archive, delete, create weave/thread) — unaffected
- `packages/app/src/getState.ts`, `rename.ts`, `finalize.ts`, etc. — MCP tools delegate to these

**VS Code extension AI buttons (new behavior):**
- Connected to MCP host → trigger sampling request → AI generates → saved via MCP tool
- No MCP host connected → button shows "Connect Claude Code to use AI features"

## Resolved decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Subcommand vs binary | `loom mcp` subcommand | Single global install; `packages/mcp/` is the code, CLI delegates |
| URI scheme | `loom://` for virtual resources, `file://` for actual doc files | Clear ownership; agents can open file-URI docs in editor |
| State filtering | `loom://state?weaveId=&threadId=` | Single source of truth; no redundant per-weave endpoints |
| Project root | `LOOM_ROOT` env var | Simplest; no spec changes needed |
| AI routing | MCP-only (Option A) — no standalone AI API layer | Single billing, simpler architecture; `reslava-loom.ai.*` settings dropped |
| AI generation in VS Code | MCP sampling | Host agent generates; server saves via tool; degrades if client lacks sampling support |
| `_status.md` exposure | Expose in v1, mark deprecated | Required while Stage 1 is active; remove when Loom derives status natively |

## Open questions for plan

- **Versioning.** As tools evolve, how do older agents discover new tools? MCP supports tool listing dynamically — covered by protocol.
- **Sampling fallback UX.** When the host client doesn't support sampling (e.g., Cursor), VS Code AI buttons should degrade cleanly. Exact UX TBD — options: hide buttons, show tooltip, open a guided prompt in the agent chat.
- **MCP connection detection in VS Code.** The extension needs to know if an MCP host is actively connected so it can toggle sampling-dependent buttons. Mechanism TBD — likely polling the MCP server's status or using a VS Code extension API.
