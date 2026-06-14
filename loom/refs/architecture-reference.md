---
type: reference
id: rf_01KQYDFDDDMS4N0V9G73MNV5JR
title: loom — Architecture 
status: active
created: "2026-04-14T00:00:00.000Z"
version: 4
tags: [architecture, reference, loom, mcp, public]
requires_load: []
slug: architecture-reference
load_when: [design, plan]
---

# loom — Architecture

> **This doc owns the structural facts** — package dependency rule, MCP surface,
> doc-types table, frontmatter schema, directory layout, and file-naming rules.
> For the *implementation* contract (the two API surfaces, DI pattern, reducer
> purity, ID lifecycle, and gotchas) see
> [implementation-contract-reference.md](implementation-contract-reference.md).

## 1. Package Relationships (Stage 2)

```
CLI (packages/cli)          VSCode (packages/vscode)
  │                              │
  │                         thin MCP client
  └──────────┬─────────────────┬─┘
             │                 │
             │                 ▼
             │          MCP Server (packages/mcp)
             │          resources, tools, prompts, sampling
             │                 │
             └─────────────────┤
                                ▼
         Application Layer (app)
         Use-cases: weaveIdea, weaveDesign, weavePlan,
         finalize, rename, startPlan, completeStep,
         closePlan, chatNew, promoteToDesign, etc.
         Query use-cases: searchDocs, getStaleDocs,
         getBlockedSteps (shared by MCP tools + CLI)
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
         Domain Layer (core)    Infrastructure Layer (fs)
         Entities, reducers,    Repositories, serializers,
         events, validation     link index, path utils
```

**Dependency rules (Stage 2):**
- `cli` may call app directly (inspection/queries) or reach the MCP surface
  **in-process** — `packages/cli/src/mcpClient.ts` builds the server with
  `createLoomMcpServer` over the SDK's in-memory transport and runs the handshake
  internally, so commands like `loom catalog` / `loom resources` / `loom context` /
  `loom next` read MCP resources & prompts with no subprocess or hand-typed JSON-RPC.
  Query commands (`loom search` / `stale` / `blocked`) call the shared app query
  use-cases directly — the same ones their MCP tools delegate to (one source of truth).
- `vscode` **must** call MCP only — no direct app imports
- `mcp` server may **only** import from `app` — it is the gate
- `app` may **only** import from `core` and `fs`
- `core` may **only** import from itself
- `fs` may **only** import from `core` and standard libraries

**Stage 2 principle:** MCP is the primary gate. The extension (human UI) routes exclusively through MCP.

## 2. AI Agent Integration (Stage 2)

```
User
 └── AI Agent (Claude Code / Cursor / any MCP host)
       ├── built-in tools: read_file, write_file, bash, grep, edit
       └── via MCP (stdio) → Loom MCP server (packages/mcp)
             ├── Resources  — read Loom state (loom://state, loom://thread-context/...)
             ├── Tools      — mutate Loom state (loom_complete_step, loom_create_idea...)
             ├── Prompts    — guided workflow templates (do-next-step, continue-thread...)
             └── Sampling   — server asks host agent to run LLM inference (API-key path only)

Loom MCP config (Claude Code):
  { "mcpServers": { "loom": { "command": "loom", "args": ["mcp"], "env": { "LOOM_ROOT": "${workspaceFolder}" } } } }
```

**Stage 2 — MCP is the single source of truth.** No manual `.loom/_status.md` file.
Session start: call `do-next-step` prompt (loads context + step instructions).

**Key resources:**
- `loom://state?weaveId=&threadId=` — full Loom state JSON, filterable; single source of truth
- `loom://thread-context/{weaveId}/{threadId}?mode=` — bundled idea+design+plan+ctx for a thread; primary agent entry point
- `loom://plan/{id}` — plan doc with parsed steps array
- `loom://requires-load/{id}` — recursively resolved `requires_load` chain
- `loom://diagnostics` — broken links, dangling child_ids, stale docs
- `loom://summary` — health counts (weaves, threads, plans, open steps)

**Key tools:**
- `loom_complete_step` — mark a plan step done (idempotent)
- `loom_create_idea / design / plan / chat` — create Loom docs
- `loom_update_doc` — rewrite doc content, preserve frontmatter
- `loom_append_to_chat` — append a message to a chat doc (role: user | ai)
- `loom_promote` — idea → design → plan, chat → idea
- `loom_refresh_ctx` — regenerate ctx summary (sampling path; use loom_update_doc in Claude Code CLI)
- `loom_get_context_prefs` / `loom_set_context_prefs` — read/write per-target context overrides in `.loom/context-prefs.json` (mode-agnostic `{ [targetId]: { include, exclude } }`); the sidebar CONTEXT panel and both `loom://context` + `loom_do_step` / refine read this file as `overrides`
- `loom_rename` / `loom_archive`
- `loom_search_docs` / `loom_get_stale_docs` / `loom_get_blocked_steps` — query tools that
  delegate to the shared `app` use-cases (`searchDocs` / `getStaleDocs` / `getBlockedSteps`);
  the `loom search` / `stale` / `blocked` CLI commands call the same use-cases

**Key prompts:**
- `do-next-step` — loads full plan step context; primary "do work" entry point for agents
- `continue-thread` — loads thread context and asks agent to propose next action
- `weave-idea / design / plan` — guided doc creation via sampling

**Sampling:** MCP server requests the host agent to run an LLM inference on its behalf. Used by the VS Code extension when an Anthropic/OpenAI API key is configured (`reslava-loom.ai.apiKey`). **Not available in Claude Code CLI sessions** — the CLI is already the AI; recursive server→client inference is intentionally blocked.

**Context Dispatcher (1.6.0) — injection dedupes against a declared ledger.** The MCP server is stateless and can't see the agent's window, so context injection is deduped against a ledger the *caller* declares. `loom_do_step` and the `loom://context` resource route through one pure assembler (`assembleContext`) that takes an optional `alreadyLoaded: {id, version}[]` ledger and returns only the delta + a `manifest` of the assumed-present rest. Controls: `context: "skip"` (coarse — "I hold the whole thread") and `alreadyLoaded` (precise, per-doc) on `loom_do_step`; `?loaded=id@version,…` on the resource. The dedupe unit is `{id@version}` — a refine (version bump) or a fresh session always re-injects, so the saving never costs correctness (model C; a server-side "already sent" cache was rejected for the silent-under-load risk). `loom_complete_step` / `loom_append_done` likewise stopped echoing the full plan back, returning a compact reference + the changed step. This directly serves "Making AI Stateful" (§5) — it stops paying to reread what's already in context.

## 2a. VS Code Extension AI Button Paths

The extension toolbar buttons support two AI paths, chosen at click time:

```
Button clicked
  ├── Claude Code CLI installed?
  │     yes → open terminal → claude "<direct-tool prompt>"
  │           Claude reads docs, calls loom_create_* + loom_update_doc / loom_append_to_chat directly
  │           (no sampling — Claude IS the AI)
  │
  └── no → getMCP().callTool('loom_generate_*' / 'loom_refine_*')
            → MCP server calls sampling/createMessage → extension's makeAIClient (API key)
```

**CLI path (default):** Works for Claude Pro subscribers and API-key users who have Claude Code installed. Opens a named terminal (e.g. "Loom: Chat Reply") and sends a `claude "<prompt>"` command. The prompt instructs Claude to use low-level MCP tools directly instead of sampling-based generate/refine tools.

**API-key path (fallback):** Works when Claude Code CLI is not on PATH and `reslava-loom.ai.apiKey` (or `reslava-loom.ai.provider` + key) is configured in VS Code settings. The extension acts as MCP client and handles `sampling/createMessage` callbacks via `makeAIClient` (Anthropic, OpenAI, or DeepSeek).

**Single-AI constraint (by design):** Loom requires **exactly one** AI provider, never two — *run Loom with whatever AI path you have; only one is required.* The CLI path (primary) needs no API key; the API-key path (fallback) needs no Claude CLI. A user configures one or the other. Both paths are intentional and kept. Because the CLI path is driven by a **launch prompt**, per-doc-type AI behaviour (e.g. req-aware `Satisfies` citation on plan refine) must be encoded in those launch prompts (`packages/vscode/src/commands/*.ts`), not in the `loom_refine_*` tools the launched agent is told not to call.

## 3. Document Types and Frontmatter Fields

### Document types

| Type | File location | Purpose |
|------|--------------|---------|
| `thread` | `{thread}/thread.md` | Thread manifest — authored-only roadmap metadata: a stable `th_` ULID, a soft `priority`, and hard `depends_on` edges. No `status` (always derived); kept off the done-rollup; no staleness. Powers the derived roadmap (`buildRoadmap`). |
| `req` | `{thread}/req.md` | The thread's locked scope spec — Included / Excluded / Constraints (`IN`/`EX`/`C` handles), auto-loaded into every action built after it |
| `idea` | `{thread}/{thread}-idea.md` | Raw concept, pre-design |
| `design` | `{thread}/{thread}-design.md` | Design conversation + decision log |
| `plan` | `{thread}/plans/{plan-id}.md` | Implementation plan — structured `steps` in frontmatter (source of truth); the body `## Steps` table is a generated view |
| `done` | `{thread}/done/{done-id}.md` | Post-implementation summary |
| `chat` | `{thread}/chats/{chat-id}.md`, `{weave}/chats/{chat-id}.md`, or `loom/refs/chats/{id}.md` | AI conversation log (thread-, weave-, or refs-scoped) |
| `ctx` | `loom/ctx.md` (global) or `{weave}/ctx.md` (weave) | AI-optimised context summary (source of truth for agents). Scope is global + weave only — there is no thread-level ctx; the parent chain loads idea/design/plan in full. |
| `reference` | `loom/refs/{scope}/{id}.md` | Static/semi-static architectural facts |

### Frontmatter fields (canonical order)

```yaml
---
type: idea | design | plan | done | chat | ctx | reference | req | thread
id: kebab-case-id
title: "Human Readable Title"
status: draft | active | implementing | done | archived
created: YYYY-MM-DD
version: 1                        # incremented on each significant update
tags: []
parent_id: null                   # ID of the parent doc (links child to parent)
child_ids: []                     # IDs of child docs (plans, done docs)
requires_load: []                 # Docs Claude must read before working on this doc
# design-specific:
role: primary | supporting
target_release: "0.x.0"
actual_release: null
design_version: 1                 # plan field: must match parent design version or plan is stale
# plan-specific:
target_version: "0.x.0"
steps: []                         # structured steps — the SOURCE OF TRUTH (v1.3.0+). Each: { id, order, status, description, files_touched, blocked_by, satisfies }. The body `## Steps` table is regenerated from this. See plan-steps-table-and-blockedby-format-reference.
# reference-specific:
load: always | by-request         # always = auto-include; by-request = requires_load only
load_when: [idea, design, plan, implementing]   # operation modes when this reference is relevant
---
```

**Stale detection rules:**
- A plan is **stale** when `plan.design_version < thread.design.version`
- A ctx doc is **stale** when it was generated before the last update to its parent thread/weave
- The MCP tool `loom_get_stale_docs` returns all stale docs across the project

## 4. Canonical Workflow: Idea → Design → Plan → Done

| Step | Action | State transition | Files |
|------|--------|-----------------|-------|
| 1 | Create idea | `status: draft` | `{thread}-idea.md` |
| 2 | Finalize idea | `draft → active`, temp ID → permanent ID | renamed |
| 3 | Weave design | `status: draft` | `{thread}-design.md` |
| 4 | Refine design | `version++`, child plans marked stale | design updated |
| 5 | Weave plan | `status: draft` | `plans/{plan-id}.md` |
| 6 | Start plan | `draft → active → implementing` | frontmatter updated |
| 7 | Complete steps | step `status` updated in frontmatter; body table regenerated | plan updated |
| 8 | Close plan | `implementing → done`; done doc emitted | done doc created |
| 9 | Update ctx | ctx summary regenerated | ctx doc updated |

## 5. Making AI Stateful — the Loom proposition

AI agents are stateless: each session starts from zero. Loom solves this by being the agent's persistent memory:

| Mechanism | What it does |
|-----------|-------------|
| `requires_load` | Declares which docs must be loaded before working on a doc. Enforced by CLAUDE.md session start protocol. |
| `ctx` docs | AI-optimised summaries at global/weave/thread level. Agents read ctx before raw source docs. Always kept fresh. |
| `load_when` | Filters which reference docs are auto-included based on the current operation mode (idea/design/plan/implementing). Saves tokens. |
| Stale tracking | When a parent doc is updated, child docs become stale. Agents see stale warnings and use `loom_refresh_ctx` / `loom_get_stale_docs` to update. |
| Link index | `parent_id` / `child_ids` graph that tracks doc relationships. Enables `loom://requires-load` chain resolution and stale detection. |

## 6. Directory Structure

```
{workspace}/
  .loom/
    (no _status.md in Stage 2 — MCP is the source of truth)
    context-prefs.json      ← per-target context include/exclude overrides (sidebar-edited)
  loom/
    ctx.md                  ← global context summary
    refs/                   ← static architectural facts (reference docs)
      chats/                ← refs-level AI chat docs (promote to -reference.md)
    .archive/               ← archived project-level docs
    {weave-id}/
      ctx.md                ← weave-level context summary
      .archive/             ← archived weave-level docs
      {thread-id}/
        thread.md           ← thread manifest (th_ ULID + soft priority + depends_on) — powers the roadmap
        req.md              ← locked scope spec (Included / Excluded / Constraints)
        {thread-id}-idea.md
        {thread-id}-design.md
        chats/              ← thread-level AI chat docs (promote to idea/design/plan)
        plans/
          {plan-id}.md
        done/
          {done-id}.md
        .archive/
  packages/
    core/                   ← domain: entities, reducers, events, validation
    fs/                     ← infrastructure: repositories, serializers, link index
    app/                    ← use cases: all business operations
    cli/                    ← delivery: terminal commands
    vscode/                 ← delivery: VS Code extension (human surface)
    mcp/                    ← delivery: MCP server (agent surface)
```

## 7. File Names and Titles

### File naming rules

File suffixes are **enforced** — they are load-bearing for doc-type detection:

| Suffix | Doc type |
|--------|----------|
| `-idea.md` | idea |
| `-design.md` | design |
| `-plan-NNN.md` | plan (NNN = zero-padded number) |
| `-chat-MMM.md` | chat (MMM = zero-padded number or ULID) |
| `-done.md` | done |
| `-reference.md` | reference |

Special forced filenames (exact, no prefix):

| Filename | Scope |
|----------|-------|
| `ctx.md` | Global (`loom/ctx.md`) |
| `{weave-id}/ctx.md` | Weave-level |

There is no thread-level ctx file — ctx scope is global + weave only.

Thread constraints define what docs can exist, not what they're named. Location implies the parent thread — no extra metadata needed. Physical file rename is left to the VS Code Explorer; Loom does not manage it.

### Title — single source of truth

**`frontmatter.title` is the only title.** Docs do **not** include a `# Title` heading in the body. The Loom tree view and all Loom surfaces read `frontmatter.title` directly.

- No `# Heading` in the body → no dual-source drift.
- VS Code's built-in markdown preview will not display a title heading (acceptable trade-off; the Loom tree view is the primary surface).
- Future: the Loom extension's preview renderer may inject a synthetic `# {title}` at render time — stored nowhere, display only.

**`loom_rename`** updates `frontmatter.title` only. Physical file rename is out of Loom's scope.
