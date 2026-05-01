---
type: ctx
id: loom-ctx
title: "Loom — Global Context"
status: active
created: 2026-04-29
version: 1
tags: [ctx, vision, architecture, session-start]
parent_id: null
child_ids: []
requires_load: [vision, workflow]
load: always
---

# Loom — Global Context

**This is the global ctx doc. Read at the start of every session.** It bundles the
three views you need to operate Loom: what it is (concept), how it's built
(architecture), and how to act in it (rules). Each section ends with a pointer to
the deeper reference if needed.

**Canonical refs (loaded via `requires_load`):**
- [loom/refs/vision.md](refs/vision.md) — the north star: what Loom is for, why it exists, what manual steps it replaces. Use it for the vision-check rule before any design proposal.
- [loom/refs/workflow.md](refs/workflow.md) — the canonical loop (`chat → {generate|refine} idea/design/plan/ctx → {implement step(s)} → done`), phase definitions, and transitions.

---

## 1. Concept — what Loom *is*

Loom is a **collaboration medium between User and AI**, where **markdown documents
are the shared context database**. The whole tool exists to make that collaboration
durable, traceable, and resumable.

**The loop:**

1. **User and AI talk in chats** — free-form conversation grounded in the current
   context (a thread, a design, a plan). Chats are the *thinking space*.
2. When a conversation reaches something concrete, **the user clicks a button** to
   ask the AI to **formalize** it into a structured doc — *idea*, *design*, or
   *plan*. The button is the moment of promotion from chat → structured doc.
3. Once a plan exists, **the user clicks another button** to ask the AI to
   **implement the next step**. The AI writes code and records what it did in the
   matching `-done.md`. The plan ticks forward.
4. The chat keeps going in its own context — it's the conversation log, not the
   workspace.

**Why each piece exists:**
- **Chats** = where humans and AI think together (no implementation, no formal state).
- **Idea / Design / Plan docs** = formalized outcomes of conversations, durable context.
- **`-done.md`** = where AI records what it actually did.
- **Buttons in the extension** = the user's explicit trigger points. AI never acts
  unprompted.
- **MCP** = makes all this state machine-readable.

Buttons must do real work, not flip state. A `DoStep` button that doesn't actually
implement is a lie (this is the false-step-4 hallucination class of bug).

→ Deeper: [loom/refs/loom.md](refs/loom.md)

---

## Glossary

- **Weave** — a project folder under `loom/`; also the core domain entity.
- **Thread** — a workstream subfolder inside a weave; holds idea + design + plans + done + chats.
- **Loose fiber** — a doc at weave root, not yet grouped into a thread.
- **Plan** — implementation plan with a steps table (`*-plan-NNN.md`).
- **Done** — post-implementation notes for one step or one plan (`*-done.md`).
- **Chat** — User↔AI conversation log (`*-chat.md`); free-form thinking surface.
- **Ctx** — AI-optimised context summary (global / weave / thread); auto-loaded.

---

## 2. Architecture — how Loom is *built*

**Stage 2 layers:** `cli / vscode → mcp → app → core + fs`. Layers never import
upward. The VS Code extension **must not** import `app` directly — MCP is the gate.

**Two API surfaces inside `app`:**
- `getState(deps)` — builds link index once, loads all threads, returns `LoomState`. Read.
- `runEvent(threadId, event, deps)` — load → reduce → save. Mutate.

**Reducers are pure** — no IO, no async, no VS Code. Side effects run *after* the
reducer, in `runEvent`.

**Document types:** `idea`, `design`, `plan`, `done`, `chat`, `ctx`, `reference`.
Layout: `loom/{weave}/{thread}/{thread}-idea.md`, `…-design.md`, `plans/`, `done/`,
`chats/`, `ctx/`. Frontmatter has a canonical key order enforced by
`serializeFrontmatter`.

→ Deeper: [loom/refs/architecture-reference.md](refs/architecture-reference.md) for
the full diagram, all MCP resources/tools/prompts, and stale-detection rules.
[loom/refs/loom-reference.md](refs/loom-reference.md) for the technical contract
(deps shape, ID lifecycle, file naming).

---

## 3. Rules — how to *act* in Loom

**Stage 2 — MCP active.** All Loom state mutations go through MCP tools (create
doc, mark step done, rename, archive, promote). Never edit weave markdown files
directly to change state — doing so bypasses reducers, the link index, and
plan-step validation.

**Primary entry points:**
- `loom://thread-context/{weaveId}/{threadId}` — bundled idea + design + plan + ctx
  for a thread. Load before working on it.
- `do-next-step` prompt — gives the next incomplete step with full context loaded
  and a pre-filled `loom_complete_step` call.

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
