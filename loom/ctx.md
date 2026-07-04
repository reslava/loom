---
type: ctx
id: loom-ctx
title: loom — Global Context
status: active
created: 2026-04-29
updated: 2026-07-04
version: 11
tags: [ctx, vision, architecture, session-start]
parent_id: null
requires_load: [vision, workflow]
load: always
---
# loom — Global Context

**This is the global ctx doc. Read at the start of every session.** It bundles the
three views you need to operate Loom: what it is (concept), how it's built
(architecture), and how to act in it (rules). Each section ends with a pointer to
the deeper reference if needed.

**Canonical refs (loaded via `requires_load`):**
- [loom/refs/vision-reference.md](refs/vision-reference.md) — the north star: what Loom is for, why it exists, what manual steps it replaces. Use it for the vision-check rule before any design proposal.
- [loom/refs/workflow-reference.md](refs/workflow-reference.md) — the canonical loop, phase definitions, transitions, and the workflow diagram.
- [loom/refs/architecture-reference.md](refs/architecture-reference.md) — package layers, MCP surface, doc types table, frontmatter schema, stale-detection rules.

---

## 1. Concept — what Loom *is*

Loom is a **collaboration medium between User and AI**, where **markdown documents
are the shared context database**. The whole tool exists to make that collaboration
durable, traceable, and resumable.

**The canonical loop** (see [refs/workflow-reference.md](refs/workflow-reference.md) for phase definitions and transitions):

```
chat → {generate|refine} idea/design/req/plan/ctx → {implement step(s)} → done
```

In plain words:
- Chats are where User and AI **think together** — free-form, no formal artifacts.
- When a conversation reaches something concrete, the User **clicks a button** to ask AI to formalize it: *Generate Idea*, *Generate Design*, *Generate Plan*. AI writes the structured doc.
- Once a plan exists, the User clicks **DoStep** to ask AI to implement the next step. AI writes code and records what it did in `{plan-id}-done.md`.
- {refine} can run on any structured doc when a parent has changed — propagates updates through the graph.

**Why each piece exists:**
- **Chats** = where humans and AI think together (no implementation, no formal state).
- **Idea / Design / Plan docs** = formalized outcomes of conversations, durable context.
- **Done docs** = where AI records what it actually did.
- **Buttons in the extension** = the user's explicit trigger points. AI never acts unprompted.
- **MCP** = makes all this state machine-readable.

Buttons must do real work, not flip state. A `DoStep` button that doesn't actually
implement is a lie (this is the false-step-4 hallucination class of bug).

---

## 2. Glossary (canonical)

This is the single source for Loom terminology. Other docs link here instead of redefining.

### Doc-graph terms

- **Weave** — a project folder under `loom/` (e.g. `loom/core-engine/`). Also the core domain entity (`Weave` interface in `packages/core`). Contains threads and weave-level docs (chats, ctx, loose fibers).
- **Thread** — a workstream subfolder inside a weave (e.g. `loom/core-engine/staleness-management/`). Holds an idea, a design, plans, done docs, and thread-level chats. The core entity is `Thread`.
- **Loose fiber** — a doc at weave root that hasn't been grouped into a thread yet (typically a draft idea or design).
- **Workspace / Loom root** — the project directory containing `.loom/` (config) and `loom/` (docs). One workspace = one Loom installation.

### Doc-type terms

- **Idea** (`idea.md`) — what we want to build, why it matters, success criteria.
- **Design** (`design.md`) — how we'll build it: architecture, decisions, trade-offs. Contains the design conversation log.
- **Req** (`req.md`) — the thread's locked scope: Included / Excluded / Constraints, authored after the design and always-loaded thereafter (optional).
- **Plan** (`plan-NNN.md`) — implementation plan with a steps table. Lives in `{thread}/plans/`.
- **Done** (`plan-NNN-done.md`) — post-implementation notes for a plan. Lives in `{thread}/done/`.
- **Chat** (`chat-NNN.md`) — User↔AI conversation log; free-form thinking surface. Lives at any level: weave-root `chats/`, thread `chats/`, or attached to a specific design/plan.
- **Ctx** (`ctx.md`) — AI-optimised context summary at global / weave level. Auto-loaded into AI context based on scope. Never appears in `requires_load`.
- **Reference** (`{slug}-reference.md`) — static or semi-static architectural facts, lives in `loom/refs/` or thread-local refs. Loaded via `requires_load` (citation-loaded), not auto-included.

The full doc-type table with file locations and frontmatter shape is in
[refs/architecture-reference.md](refs/architecture-reference.md) section 3.

### Frontmatter terms

- **Frontmatter** — YAML block at the top of every doc, canonical key order enforced by `serializeFrontmatter` (in `packages/core/src/frontmatterUtils.ts`).
- **`requires_load`** — list of doc IDs that must be read before working on this doc. The session-start protocol and AI rules honour this.
- **`load`** (reference docs only) — `always` (auto-included) or `by-request` (only loaded when listed in `requires_load`).
- **`load_when`** (reference docs only) — operation modes (idea, design, plan, implementing) when this reference is relevant. Filters auto-load.
- **Stale** — a doc is stale when a parent it depends on has been refined since this doc's `version`. Plan staleness uses `design_version`; ctx staleness uses generation timestamp. Stale docs are flagged but never silently rewritten.

### Workflow / loop terms

- **{generate}** — User clicks *Generate Idea/Design/Req/Plan/Ctx* button; AI reads context and produces a draft of the new doc. Output starts at `status: draft`.
- **{refine}** — User clicks *Refine* on an existing doc that's gone stale; AI reads updated parents and rewrites or patches the doc. Version bumps.
- **{implement step(s)} / DoStep** — User clicks *DoStep* on a plan in `status: implementing`; AI reads next pending step + thread context, writes code, records what was done in `{plan-id}-done.md`, marks the step ✅.
- **Promote** — chat → idea, idea → design, design → plan. Same operation as {generate} but with explicit parent linkage.

---

## 3. Architecture — how Loom is *built*

**Stage 2 layers:** `cli / vscode → mcp → app → core + fs`. Layers never import
upward. The VS Code extension **must not** import `app` directly — MCP is the gate.

**Two API surfaces inside `app`:**
- `getState(deps)` — builds link index once, loads all threads, returns `LoomState`. Read.
- `runEvent(weaveSlug, event, deps)` — load → reduce → save. Mutate.

**Reducers are pure** — no IO, no async, no VS Code. Side effects run *after* the
reducer, in `runEvent`.

→ Deeper: [refs/architecture-reference.md](refs/architecture-reference.md) for the
full diagram, doc-type table, and stale-detection rules; [refs/mcp-reference.md](refs/mcp-reference.md)
for the MCP surface (resources, prompts, sampling) and `loom://catalog` for the
live tool list.

---

## 4. Rules — how to *act* in Loom

**Stage 2 — MCP active.** All writes to `loom/**/*.md` go through MCP tools (create
doc, update doc body, mark step done, rename, archive, promote). Never edit weave
markdown files directly to change content or state — doing so bypasses reducers,
the link index, and plan-step validation. A PreToolUse hook physically enforces
this in Claude Code sessions; see CLAUDE.md for the full hard rule.

**Primary entry points:**
- `loom://context/{docId}` (or `loom://context/thread/{weaveSlug}/{threadUlid}`) —
  bundled global/weave ctx + parent chain + requires_load for a doc/thread. Load
  before working on it.
- `do-next-step` prompt — gives the next incomplete step with full context loaded
  and a pre-filled `loom_complete_step` call.
- **Declare what you already hold (Context Dispatcher).** Stepping through one plan
  across a session, pass `context: "skip"` or `alreadyLoaded: [{ id, version }]` to
  `do-next-step` / `loom_do_step` so only the *delta* re-injects — the dedupe unit is
  `{id@version}`, so a refine always re-injects (no silent under-load). See the
  `context-ledger` rule in CLAUDE.md.

**Chat docs are the conversation surface.** When a `-chat.md` doc is the active
context, every reply goes inside it under `## AI:`. Replies that live only in the
terminal disappear; chat-doc replies persist as project memory.

**MCP visibility:** before each MCP call, output `🔧 MCP: tool_name(...)` or `📡 MCP:
loom://...`. If MCP is unavailable, output `⚠️ MCP unavailable — editing file directly`.

**Stop rules:**
1. After each step: mark ✅, state next step + files, **STOP** wait for `go`.
2. Two failed fixes in a row: stop, write root-cause, wait.
3. Architecture / API decisions: present trade-offs, **STOP** wait.
4. User says `STOP`: respond `Stopped.` only.

→ Deeper: [CLAUDE.md](../CLAUDE.md) for the full session contract.