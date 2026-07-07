---
type: reference
id: rf_01KQYDFDD9XKK20AREQ1TF6BCA
title: loom — MCP
status: active
created: "2026-04-27T00:00:00.000Z"
updated: 2026-06-15
version: 2
tags: [mcp, reference, ai-integration, ai, public]
requires_load: []
slug: mcp-reference
load: by-request
---

# loom — MCP

This doc explains **how** the Loom MCP surface works — the protocol, the host
landscape, the single-AI model, and the four kinds of surface (resources, tools,
prompts, sampling).

Three docs, three questions — don't duplicate across them:

- **WHERE MCP sits** in the package architecture → [architecture-reference.md](architecture-reference.md) (`cli / vscode → mcp → app → core + fs`).
- **HOW MCP works** → this doc.
- **WHAT tools exist right now** → the `loom://catalog` resource. It is auto-generated from the live tool registry (`packages/mcp/src/server.ts`), grouped by purpose, and therefore never drifts.

> **Tools are deliberately not enumerated here.** The tool registry changes often;
> a hand-maintained table drifts the moment a tool is added or its args change.
> `loom://catalog` owns the list. This doc names tools only as *illustrative
> examples* of a category, and lists the **resources** and **prompts** (which are
> few, stable, and have no catalog of their own).

## How MCP works

MCP (Model Context Protocol) is a client–server protocol over stdio.

```
Claude Code (MCP client)  ←→  loom mcp (MCP server subprocess)
```

The host spawns `loom mcp` on session start, discovers its capabilities
(resources, tools, prompts), then calls them during the conversation. The server
process runs until the host exits or restarts — note that `build-all.sh` does
**not** restart an already-running server, so new tool args only take effect after
a session/MCP restart.

## Host landscape (who can reach MCP)

| Host | MCP? | Notes |
|------|------|-------|
| **Claude Code (CLI)** | ✅ resources · tools · prompts | Sampling is **blocked** — the CLI is already the AI (see Sampling below). |
| **Claude desktop app** + other MCP agents (Cursor, Continue…) | ✅ | Standard MCP client behaviour. |
| **Loom VS Code extension** (`packages/vscode`) | ✅ as a *client* | It is itself an MCP client talking to the Loom server, and it advertises `{ sampling: {} }` (the fallback AI path). |
| **Claude VS Code extension** | ❌ no MCP | Cannot reach `loom://` resources or `loom_*` tools; must fall back to direct file edits (`⚠️ MCP unavailable — editing file directly`). Unrelated to the Loom extension above. |

## Who owns what

| Side | Owns |
|------|------|
| **AI (host agent)** | Conversation context · reasoning · generation · deciding which tools to call |
| **Loom MCP server** | Document state · frontmatter · link index · plan-step validation · reducers |

**Rule:** the AI never edits loom markdown files directly. All state changes go
through MCP tools, which validate inputs and maintain consistency via reducers.

---

## 1. Resources (read-only)

Resources give the AI read access to Loom state without file IO. They are few and
stable, so they are listed here in full.

### Concrete resources

| URI | Returns | Use when |
|-----|---------|----------|
| `loom://catalog` | Grouped index of every `loom_*` tool (name + one-line purpose) | **Before searching for a tool** — then `ToolSearch select:<exact name>` |
| `loom://state` | Full project state (weaves, threads, plans) as JSON; `?weaveId=&threadId=` filterable | Need a global or filtered view |
| `loom://roadmap` | Derived cross-weave roadmap (`RoadmapView` JSON): the single topo+priority `roadmap[]`, history, diagnostics | Reason about cross-weave **blocked-on** |
| `loom://diagnostics` | Broken links, orphaned docs, and roadmap findings (cycles, dangling deps, missing `thread.md`) | Before a cleanup pass |
| `loom://summary` | Health counts (weaves, threads, plans, open steps) | Quick status |
| `loom://link-index` | Document graph: `byId`, parent/child, backlinks, slugs | Checking relationships |
| `loom://status` | Raw `.loom/_status.md` text | Stage 1 legacy only |

### Resource templates (parameterised)

| URI | Returns | Use when |
|-----|---------|----------|
| `loom://context/{docUlid}` — or the slug forms `loom://context/thread/{weaveSlug}/{threadSlug}` and `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` | Unified context bundle: global/weave ctx + parent chain + `requires_load` for a target; append `?mode={chat\|idea\|design\|plan\|implementing\|refine\|promote\|ctx}` and `?loaded=id@version,…`. The bundle manifest header carries the resolved `weave_slug` + `thread_ulid` so a following thread-scoped write needs no second lookup. | **Start of any thread work** |
| `loom://docs/{docUlid}` | Raw markdown of any doc by its ULID | Reading a specific doc |
| `loom://plan/{planUlid}` | Plan doc with steps parsed as JSON | Inspecting a plan's step list |
| `loom://requires-load/{docUlid}` | All `requires_load` docs, recursive + deduplicated | Loading a doc's full dependency tree |

`loom://context` is the primary entry point — it bundles everything needed for a
thread in one call, and dedupes against a declared ledger (see Context Dispatcher
in [architecture-reference.md](architecture-reference.md)).

---

## 2. Tools (state mutations)

Always use tools to change state — never edit `loom/**/*.md` directly (a PreToolUse
gate hook enforces this in Claude Code). Tools are organised into these groups (the
same grouping `loom://catalog` renders):

| Group | What it covers | Example tool |
|-------|----------------|--------------|
| **create** | New idea / design / plan / req / reference / chat | `loom_create_idea` |
| **doc** | Body / frontmatter edits, finalize, archive, rename, promote | `loom_update_doc`, `loom_patch_doc` |
| **refine** | Sampling-based rewrite of a stale idea / design / plan | `loom_refine_design` |
| **generate** | Sampling-based first-draft generation | `loom_generate_plan` |
| **plan** | Step lifecycle: start, complete, add/remove/reorder/update steps, do-step brief, append-done, close | `loom_do_step`, `loom_complete_step` |
| **req** | Requirements: amend, finalize (lock), verify a plan against the locked req | `loom_verify_req` |
| **thread** | Roadmap metadata writes: create thread, set priority, set deps | `loom_set_priority` |
| **chat** | Append a reply, read only the new tail since the last AI block | `loom_append_to_chat` |
| **context** | Read/write per-target context-prefs, refresh ctx | `loom_set_context_prefs` |
| **query** | Find / search docs, list blocked steps, list stale plans/docs | `loom_search_docs` |

**For the exact tool names, args, and one-line purposes, read `loom://catalog`** —
then `ToolSearch select:<exact name>` to load a tool's schema before the first call.

Two tools write content via an **API-key AI client** rather than host sampling:

- `loom_close_plan` — drafts the done-doc body via the DeepSeek-flavoured `makeAiClient` if `DEEPSEEK_API_KEY` is set; otherwise writes a placeholder you fill in.
- `loom_promote` — accepts an inline `body` (the path used in Claude Code, where you write the content) **or** generates it via sampling when `body` is omitted (sampling-capable hosts only).

---

## 3. Prompts (workflow drivers)

Prompts combine context loading + instruction in one call. Few and stable, listed
here in full.

| Prompt | Required args | What it does |
|--------|--------------|-------------|
| `do-next-step` | `planUlid` | Loads thread context + plan, returns the next step instruction + a pre-filled `loom_complete_step` call. **Primary workflow driver.** |
| `continue-thread` | `weaveSlug`, `threadSlug` | Reviews thread state, suggests next action |
| `refine-design` | `designUlid` | Reviews a design doc, suggests refinements |
| `validate-state` | — | Reviews diagnostics (incl. roadmap cycles/dangling deps) and identifies issues |
| `weave-idea` | `weaveSlug`, `prompt` (`threadSlug` optional) | Drafts an idea from a description (sampling) |
| `weave-design` | `weaveSlug`, `threadSlug` | Transitions idea → design (sampling) |
| `weave-plan` | `weaveSlug`, `threadSlug` | Generates a plan from a design (sampling) |

---

## 4. The roadmap surface (worked example)

The derived roadmap shows how one feature spans **read** and **write** MCP surfaces
— and is a complete agent surface, not CLI-only:

- **Read:** `loom://roadmap` — `getState → buildRoadmap(state) → RoadmapView` JSON (the single topo+priority `roadmap[]`, shipped-plan history, diagnostics). The CLI's `loom roadmap` is a *separate* human ASCII renderer over the same pure function; the resource is what lets an agent reason about cross-weave **blocked-on** without parsing CLI text.
- **Diagnostics:** roadmap cycles, dangling `depends_on`, and threads missing `thread.md` fold into `loom://diagnostics` and the `validate-state` prompt.
- **Write (group `thread`):** `loom_create_thread`, `loom_set_priority`, `loom_set_thread_deps` — author the only non-derived inputs (soft `priority`, hard `depends_on`), with write-time cycle/existence validation.

---

## 5. Sampling (the fallback AI path)

Sampling is MCP's mechanism for the **server to request an AI completion from the
client** (a reverse call). In Loom it is the **fallback** path — the **primary**
path is the Loom VS Code extension launching a **Claude Code CLI agent**
(`launchClaude`) that does the work and writes via content tools, needing no
sampling and no API key.

**Flow (fallback):** a `loom_generate_*` / `loom_refine_*` tool is called → the
Loom server builds a prompt → calls `sampling/createMessage` on the host → host
runs inference → result returned to the server → server writes the document.

**Host support:**
- **Loom VS Code extension** *supports* sampling — `mcp-client.ts` advertises `{ sampling: {} }` and routes the call through `makeAIClient()` (`reslava-loom.ai.apiKey`, default `claude-haiku-4-5`).
- **Claude Code CLI** *blocks* sampling — it is already the agent, so server→client inference returns `MethodNotFound`. The agent generates content itself and passes it to `loom_create_*` / `loom_update_doc` (and `body` to `loom_promote`).

**Single-AI rule:** Loom requires exactly one AI provider — either a Claude CLI
(primary) or a configured API key (fallback) — never both.

---

## 6. Setup

`.mcp.json` in the project root (project-scoped):

```json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@reslava/loom@<version>", "mcp"],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}",
        "DEEPSEEK_API_KEY": "your-key-here"
      }
    }
  }
}
```

Project-scoped servers require one-time approval per project (run `claude` in the
project root and approve `loom`, or use `claude /mcp`; verify with
`claude mcp list`). `DEEPSEEK_API_KEY` enables the AI-drafted done-doc in
`loom_close_plan`; without it that tool writes a placeholder.

---

## 7. Making MCP usage visible

Output one line before each MCP interaction so routing is auditable:

```
🔧 MCP: {tool-name}({key-args})     ← before a tool call
📡 MCP: {uri}                       ← before reading a resource
⚠️ MCP unavailable — editing file directly   ← only if MCP is genuinely down
```

If you don't see these prefixes, either MCP is not running or the agent is
bypassing it (which the rules forbid).
