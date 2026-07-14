---
type: reference
id: rf_01KQYDFDDDMS4N0V9G73MNV5JR
title: loom — Architecture 
status: active
created: "2026-04-14T00:00:00.000Z"
updated: 2026-06-16
version: 5
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

## Delivery surfaces & audiences

Loom is **one engine** (`app` + `core` + `fs` + `telemetry`, exposed through the
`mcp` server) shipped through three delivery surfaces. Which one a user installs
depends on where they work — but all three drive the same document graph through
the same MCP tools.

```
                        ┌───────────────────────────────┐
                        │   Loom engine (one codebase)   │
                        │   mcp → app → core + fs + tel   │
                        └───────────────┬───────────────┘
                   bundled            npx-fetched            npm -g
                       │                   │                    │
                       ▼                   ▼                    ▼
             ┌───────────────┐    ┌────────────────┐    ┌──────────────┐
             │ VS Code ext.  │    │  AI agent (MCP) │    │     CLI      │
             │ (human, GUI)  │    │ Claude Code /   │    │ terminal /   │
             │               │    │ Cursor / etc.   │    │ scripting/CI │
             └───────────────┘    └────────────────┘    └──────────────┘
```

| Surface | Audience | How the engine is delivered | Prereqs |
|---------|----------|-----------------------------|---------|
| **VS Code extension** | A human in VS Code | **Bundled** into the VSIX (`dist/loom-mcp.js`); the extension spawns it on VS Code's own Electron-as-Node (`process.execPath` + `ELECTRON_RUN_AS_NODE=1`) | None — no global CLI, no user Node |
| **AI agent (MCP)** | Claude Code, Cursor, Continue, any MCP host | **`npx`** — `loom install` writes `.mcp.json` with `npx -y @reslava/loom@<version> mcp`, pinned to the writing version | Node (the agent already has it) |
| **CLI** | Terminal users, scripting, CI, non-VS-Code hosts | **`npx @reslava/loom …`** (pinned, no persistent install) — `npm i -g @reslava/loom` still works for ad-hoc terminal use, but is never required and is not the MCP-server form | Node |

**Design rules that follow from this:**
- The three surfaces never diverge in behaviour — they are thin deliveries of the
  same `app` use-cases via the same `mcp` server. A fix in `app` fixes it everywhere.
- The **extension imports no `app`** — even its own bundled server is reached through
  MCP (`vscode → mcp → app`), and workspace init / example-seed go through the
  `loom_install` / `loom_seed_example` MCP tools rather than a direct `app` import.
- **Positioning:** the extension is the recommended default for humans; the CLI/MCP
  path is a first-class route for agents and hosts the extension can't serve (terminal
  Claude Code, Continue, JetBrains, CI). Neither is a second-class fallback.
- The global `@reslava/loom` CLI still ships (for the CLI surface and the `npx` path);
  it is no longer a *prerequisite* of the extension.
- **Bundle-first server delivery (post-1.19).** One server codebase, two sanctioned
  delivery vehicles, **zero persistent global installs**. Extension-launched agents
  (the AI buttons) bind the *bundled* server directly — `launchClaude` runs
  `claude --strict-mcp-config --mcp-config <generated>` pointing at the same
  `dist/loom-mcp.js` the extension itself spawns — so the agent runs the **exact
  extension version by construction**, never the project `.mcp.json` and never a global
  `loom`. The project `.mcp.json` is consumed **only** by a `claude` the extension
  did *not* launch (a hand-run terminal agent, Cursor, CI); for those it carries the
  **`npx`-pinned** server, which `loom install` self-heals to the current version on
  every extension activation. The legacy `"command": "loom"` form (a separately-updated
  global binary that could drift from the extension) is **retired**: never written by a
  new install, and migrated to the npx pin on consent (`loom_install` `migrate_mcp_command`
  / `loom install --migrate-mcp-command`).

---

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
         setStatus, rename, startPlan, completeStep,
         closePlan, chatNew, promoteToDesign, etc.
         Query use-cases: searchDocs, getStaleDocs,
         getBlockedSteps (shared by MCP tools + CLI)
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼               ▼
      Domain Layer (core)  Infra (fs)   Infra (telemetry)
      Entities, reducers,  Repositories,  Opt-in, content-free
      events, validation   serializers,   usage events → PostHog
                           link index     (injected via deps)
```

**Dependency rules (Stage 2):**
- `cli` may call app directly (inspection/queries) or reach the MCP surface
  **in-process** — `packages/cli/src/mcpClient.ts` builds the server with
  `createLoomMcpServer` over the SDK's in-memory transport and runs the handshake
  internally, so commands like `loom catalog` / `loom resources` / `loom context` /
  `loom next` read MCP resources & prompts with no subprocess or hand-typed JSON-RPC.
  Query commands (`loom search` / `stale` / `blocked`) call the shared app query
  use-cases directly — the same ones their MCP tools delegate to (one source of truth).
- `vscode` **must** call MCP only — no direct `app`/`fs` imports (one whitelisted
  pre-MCP bootstrap aside). This is the boundary that actually matters and is
  guarded by `tests/vscode-no-fs-imports.test.ts`.
- `mcp` is the **mutation gate**: every state *change* an agent makes goes through
  an `app` use-case. For *reads*, the MCP resources (`state`, `roadmap`,
  `diagnostics`, `context`) assemble read-models directly from `fs` repositories
  (`getActiveLoomRoot`/`loadWeave`/`buildLinkIndex`) and `core` derived functions
  (`buildRoadmap`, validation) — so `mcp` legitimately imports `app` + `core` + `fs`.
  It must **not** import `cli`/`vscode`. (Routing trivial reads through `app` too
  was considered and rejected as ceremony — the gate that earns its keep is on
  *mutations* and on *vscode → mcp*, not on read-only assembly.)
- `app` may **only** import from `core`, `fs`, and `telemetry` (never `cli`/`vscode`/`mcp`).
- `telemetry` (`packages/telemetry`) is a **leaf infrastructure** package — like `fs`,
  it is injected into consumers via `deps` and imports nothing from `core`/`fs`/`app`.
  It carries the portable transport/consent/identity core only; the Loom event
  vocabulary lives in `packages/app/src/telemetry`, and events are emitted at the
  dispatcher seam (the MCP `CallTool` handler + the CLI command dispatch). Opt-in,
  content-free, off by default. The concrete client is built at each delivery entry
  (MCP server → `agent`, CLI → `cli`, extension-spawned server → `extension`).
- `core` may **only** import from itself — zero sibling packages, zero node IO.
  Guarded by `tests/core-no-fs-imports.test.ts`.
- `fs` may import from `core` and standard libraries only (never `app`/`cli`/`vscode`/`mcp`).
- `cli` is a delivery layer: it may call `app` use-cases directly, reach the MCP
  surface **in-process** (the `mcpClient.ts` detail above), and read `core`/`fs`
  types for rendering. It must not import `vscode`.

**Stage 2 principle:** MCP is the primary gate **for mutations**, and the extension
(human UI) routes exclusively through MCP. Read paths inside the engine (cli, mcp
resources) may compose `core` + `fs` directly.

## 2. AI Agent Integration (Stage 2)

```
User
 └── AI Agent (Claude Code / Cursor / any MCP host)
       ├── built-in tools: read_file, write_file, bash, grep, edit
       └── via MCP (stdio) → Loom MCP server (packages/mcp)
             ├── Resources  — read Loom state (loom://state, loom://context/...)
             ├── Tools      — mutate Loom state (loom_complete_step, loom_create_idea...)
             ├── Prompts    — guided workflow templates (do-next-step, continue-thread...)
             └── Sampling   — server asks host agent to run LLM inference (API-key path only)

Loom MCP config (Claude Code):
  { "mcpServers": { "loom": { "command": "npx", "args": ["-y", "@reslava/loom@<version>", "mcp"] } } }
```

**Stage 2 — MCP is the single source of truth.** No manual `.loom/_status.md` file.
Session start: call `do-next-step` prompt (loads context + step instructions).

**The MCP surface** has four kinds — resources (read), tools (mutate), prompts
(workflow drivers), and sampling (server→host inference). This doc owns only
*where* that surface sits in the architecture (above). For *how* it works and the
full resource/prompt catalogue see
[mcp-reference.md](mcp-reference.md); for the always-current **tool** list read the
auto-generated `loom://catalog` resource — neither is re-enumerated here, to avoid
drift. The primary entry points worth naming at the architecture level:
`loom://state` (single source of truth), `loom://context/{docId}` (bundled thread
context — the primary agent entry point), and the `do-next-step` prompt (the "do
work" driver).

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
| `idea` | `{thread}/idea.md` | Raw concept, pre-design |
| `design` | `{thread}/design.md` | Design conversation + decision log |
| `plan` | `{thread}/plans/plan-NNN.md` | Implementation plan — structured `steps` in frontmatter (source of truth); the body `## Steps` table is a generated view |
| `done` | `{thread}/done/plan-NNN-done.md` | Post-implementation summary (one per plan) |
| `chat` | `{thread}/chats/chat-NNN.md`, `{weave}/chats/chat-NNN.md`, or `loom/refs/chats/{slug}.md` | AI conversation log (thread-, weave-, or refs-scoped) |
| `ctx` | `loom/ctx.md` (global-only) | AI-optimised architecture/API context summary (source of truth for agents). Scope is **global-only** — one `loom/ctx.md` per project; there is no weave- or thread-level ctx (the parent chain loads idea/design/plan in full). |
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

## 4. Canonical Workflow: Idea → Design → Req → Plan → Done

The authoring loop is `chat → idea → design → req → plan → done`. `req` is **optional**
and sits between design and plan — a thread with no req goes `design → plan` directly.
See [workflow-reference.md](workflow-reference.md) for the phase diagram and
[staleness-reference.md](staleness-reference.md) for the dependency edges.

| Step | Action | State transition | Files |
|------|--------|-----------------|-------|
| 1 | Create idea | `status: draft` | `idea.md` |
| 2 | Finalize idea | `draft → active` | frontmatter updated |
| 3 | Weave design | `status: draft` | `design.md` |
| 4 | Refine design | `version++`, child req/plans marked stale | design updated |
| 5 | Author & lock req *(optional)* | `draft → locked` | `req.md` |
| 6 | Weave plan | `status: draft` | `plans/plan-NNN.md` |
| 7 | Start plan | `draft → active → implementing` | frontmatter updated |
| 8 | Complete steps | step `status` updated in frontmatter; body table regenerated | plan updated |
| 9 | Close plan | `implementing → done`; done doc emitted | `done/plan-NNN-done.md` |
| 10 | Update ctx | ctx summary regenerated | ctx doc updated |

## 5. Making AI Stateful — the Loom proposition

AI agents are stateless: each session starts from zero. Loom solves this by being the agent's persistent memory:

| Mechanism | What it does |
|-----------|-------------|
| `requires_load` | Declares which docs must be loaded before working on a doc. Enforced by CLAUDE.md session start protocol. |
| `ctx` docs | AI-optimised summary at the global level (one `loom/ctx.md`). Agents read ctx before raw source docs; refreshed on demand (a `last_refreshed` recency stamp, no stale badge). |
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
      .archive/             ← archived weave-level docs
      {thread-id}/
        thread.md           ← thread manifest (th_ ULID + soft priority + depends_on) — powers the roadmap
        req.md              ← locked scope spec (Included / Excluded / Constraints)
        idea.md
        design.md
        chats/              ← thread-level AI chat docs (promote to idea/design/plan)
          chat-NNN.md
        plans/
          plan-NNN.md
        done/
          plan-NNN-done.md
        .archive/
  packages/
    core/                   ← domain: entities, reducers, events, validation
    fs/                     ← infrastructure: repositories, serializers, link index
    telemetry/              ← infrastructure: opt-in, content-free usage events → PostHog
    app/                    ← use cases: all business operations
    cli/                    ← delivery: terminal commands
    vscode/                 ← delivery: VS Code extension (human surface)
    mcp/                    ← delivery: MCP server (agent surface)
```

## 7. File Names and Titles

### File naming rules

Filenames are **flat and canonical** — a token in the name is load-bearing for
doc-type detection, and identity lives in frontmatter ULIDs (not the filename), so
a thread or weave folder rename rewrites zero doc content:

| Filename | Doc type |
|----------|----------|
| `idea.md` | idea (per-thread singleton) |
| `design.md` | design (per-thread singleton) |
| `plan-NNN.md` | plan (NNN = zero-padded number) |
| `plan-NNN-done.md` | done (named after its plan) |
| `chat-NNN.md` | chat (NNN = zero-padded number) |
| `req.md` | req (per-thread singleton) |
| `thread.md` | thread manifest (per-thread singleton) |
| `{slug}.md` in `loom/refs/` | reference (human slug) |

Special forced filenames (exact, no prefix):

| Filename | Scope |
|----------|-------|
| `ctx.md` | Global (`loom/ctx.md`) |

ctx is **global-only** — one `loom/ctx.md` per project; there is no weave- or thread-level ctx file.

Thread constraints define what docs can exist. Location implies the parent thread — no extra metadata needed. Ordinals (`plan-NNN`, `chat-NNN`) are assigned by creation order and never renumbered on delete (gaps allowed). Loom owns these filenames: it derives them on create through one canonical naming module, `loom migrate-layout` normalizes existing docs to the scheme, and folder renames go through `loom_rename_thread` / `loom_rename_weave`.

### Title — single source of truth

**`frontmatter.title` is the only title.** Docs do **not** include a `# Title` heading in the body. The Loom tree view and all Loom surfaces read `frontmatter.title` directly.

- No `# Heading` in the body → no dual-source drift.
- VS Code's built-in markdown preview will not display a title heading (acceptable trade-off; the Loom tree view is the primary surface).
- Future: the Loom extension's preview renderer may inject a synthetic `# {title}` at render time — stored nowhere, display only.

**`loom_retitle`** updates `frontmatter.title` only. Folder-slug renames (weave/thread) go through `loom_rename_weave` / `loom_rename_thread`; reference filename-slug renames through `loom_rename_reference_file`.
