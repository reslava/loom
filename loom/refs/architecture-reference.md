---
type: reference
id: loom-architecture
title: "Loom — Architecture Reference"
status: active
created: 2026-04-14
version: 2
tags: [architecture, reference, loom, mcp]
requires_load: []
load_when: [design, plan]
---

# Loom — Architecture Reference

## 1. Package Relationships

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Delivery Layer                              │
├─────────────────┬──────────────────────────┬─────────────────────────┤
│       CLI       │    VS Code Extension      │      MCP Server         │
│  (packages/cli) │   (packages/vscode)       │   (packages/mcp)        │
│                 │   Human surface:          │   Agent surface:        │
│                 │   tree view, commands     │   resources, tools,     │
│                 │   toolbar, inline buttons │   prompts, sampling     │
└────────┬────────┴────────────┬─────────────┴────────────┬────────────┘
         │                     │                           │
         └──────────────────── │ ─────────────────────────┘
                                │ calls
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Application Layer (app)                         │
│   Orchestration use-cases: weaveIdea, weaveDesign, weavePlan,       │
│   finalize, rename, startPlan, completeStep, closePlan, chatNew,    │
│   promoteToDesign, getState, summarise, validate, doStep            │
└──────────────────────────┬──────────────────────────────────────────┘
                            │ uses
              ┌─────────────┴──────────────┐
              ▼                             ▼
┌─────────────────────────┐   ┌────────────────────────────────────────┐
│     Domain Layer (core) │   │    Infrastructure Layer (fs)           │
│  Entities, Events,      │   │  Repositories: weaveRepository,        │
│  Reducers, Validation,  │   │  threadRepository, linkRepository      │
│  Body generators,       │   │  Serializers: frontmatterLoader/Saver  │
│  ID management,         │   │  Utils: pathUtils, findMarkdownFiles   │
│  Plan utilities         │   │  Link index: buildLinkIndex            │
└─────────────────────────┘   └────────────────────────────────────────┘
```

**Dependency rules (enforced):**
- `cli`, `vscode`, `mcp` may **only** import from `app` (and `core` for types).
- `app` may **only** import from `core` and `fs`.
- `core` may **only** import from itself.
- `fs` may **only** import from `core` and standard libraries.
- No delivery layer may bypass `app` — all state changes go through app use cases.

## 2. AI Agent Integration

```
User
 └── AI Agent (Claude Code / Cursor / any MCP host)
       ├── built-in tools: read_file, write_file, bash, grep, edit
       └── via MCP (stdio) → Loom MCP server (packages/mcp)
             ├── Resources  — read Loom state (loom://state, loom://thread-context/...)
             ├── Tools      — mutate Loom state (loom_complete_step, loom_create_idea...)
             ├── Prompts    — guided workflow templates (do-next-step, continue-thread...)
             └── Sampling   — server asks host agent to run LLM inference (VS Code AI buttons)

Loom MCP config (Claude Code):
  { "mcpServers": { "loom": { "command": "loom", "args": ["mcp"], "env": { "LOOM_ROOT": "${workspaceFolder}" } } } }
```

**Key resources:**
- `loom://state?weaveId=&threadId=` — full Loom state JSON, filterable; single source of truth
- `loom://thread-context/{weaveId}/{threadId}?mode=` — bundled idea+design+plan+ctx for a thread; primary agent entry point
- `loom://plan/{id}` — plan doc with parsed steps array
- `loom://requires-load/{id}` — recursively resolved `requires_load` chain
- `loom://diagnostics` — broken links, dangling child_ids
- `loom://status` — `.loom/_status.md` (Stage 1 only, deprecated in Stage 2)

**Key tools:**
- `loom_complete_step` — mark a plan step done (idempotent)
- `loom_create_idea / design / plan / chat` — create Loom docs
- `loom_update_doc` — rewrite doc content, preserve frontmatter
- `loom_promote` — idea → design → plan, chat → idea
- `loom_refresh_ctx` — regenerate ctx summary via sampling
- `loom_rename` / `loom_archive` / `loom_get_stale_docs`

**Key prompts:**
- `do-next-step` — loads full plan step context; primary "do work" entry point for agents
- `continue-thread` — loads thread context and asks agent to propose next action
- `weave-idea / design / plan` — guided doc creation via sampling

**Sampling:** MCP server requests the host agent to run an LLM inference on its behalf. Enables VS Code toolbar AI buttons (Weave Idea, Weave Design, AI Reply) without a separate API key — all AI runs through the user's agent connection (single billing).

## 3. Document Types and Frontmatter Fields

### Document types

| Type | File location | Purpose |
|------|--------------|---------|
| `idea` | `{thread}/{thread}-idea.md` | Raw concept, pre-design |
| `design` | `{thread}/{thread}-design.md` | Design conversation + decision log |
| `plan` | `{thread}/plans/{plan-id}.md` | Implementation steps table |
| `done` | `{thread}/done/{done-id}.md` | Post-implementation summary |
| `chat` | `{thread}/chats/{chat-id}.md` or `{weave}/chats/{id}.md` | AI conversation log |
| `ctx` | `{thread}/ctx/` or `{weave}/ctx.md` | AI-optimised context summary (source of truth for agents) |
| `reference` | `references/{scope}/{id}.md` | Static/semi-static architectural facts |

### Frontmatter fields (canonical order)

```yaml
---
type: idea | design | plan | done | chat | ctx | reference
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
| 7 | Complete steps | steps table updated | plan updated |
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
    _status.md              ← Stage 1 only; manual session state
  weaves/
    {weave-id}/
      ctx.md                ← weave-level context summary
      chats/                ← weave-level AI chat docs
      _archive/             ← archived weave-level docs
      {thread-id}/
        {thread-id}-idea.md
        {thread-id}-design.md
        ctx/                ← thread-level context summary
        chats/              ← thread-level AI chat docs
        plans/
          {plan-id}.md
        done/
          {done-id}.md
        _archive/
  references/
    {scope}/
      {id}.md               ← reference docs (architecture, patterns, API notes)
  packages/
    core/                   ← domain: entities, reducers, events, validation
    fs/                     ← infrastructure: repositories, serializers, link index
    app/                    ← use cases: all business operations
    cli/                    ← delivery: terminal commands
    vscode/                 ← delivery: VS Code extension (human surface)
    mcp/                    ← delivery: MCP server (agent surface)
```
