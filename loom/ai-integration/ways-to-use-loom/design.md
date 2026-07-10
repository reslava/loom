---
type: design
id: de_01KX6E14S7PZRWWG5H64K1ZVAV
title: Ways to Use Loom — user-facing positioning guide
status: done
created: 2026-07-10
version: 1
idea_version: 1
tags: []
parent_id: id_01KX6E03QNM76R4WA39E3H8DXZ
requires_load: []
---
# Ways to Use Loom — user-facing positioning guide

## Overview

Deliver one canonical user guide, `docs/WAYS-TO-USE-LOOM.md`, plus a short highlighted pointer at the **top** of the three READMEs. Placement convention: `docs/*.md` = **user** guides (public how-to), `refs/*.md` = **dev** references (architecture/internal facts) — so this belongs in `docs/`, not `refs/`.

## The model to document

### Two independent axes

- **Axis A — human control surface:** how you see & manage the doc graph. Extension (tree, roadmap, buttons) · CLI-only (terminal).
- **Axis B — AI session model:** how inference is driven. Task-scoped launch (extension button → one fresh AI session per action, steered by the launch prompt) · Persistent agent (you keep one agent session open, converse, decide when it ends).

### The matrix

```
                          AXIS B — AI SESSION MODEL
                ┌────────────────────────┬───────────────────────────┐
                │  Task-scoped launch    │  Persistent agent         │
                │  (button → 1 fresh     │  (you keep one agent      │
                │   AI session/action)   │   session open, you end)  │
 ┌──────────────┼────────────────────────┼───────────────────────────┤
 │ Extension    │  ① GUIDED              │  ② POWER TERMINAL         │
 │ (tree,       │  beginner / simple     │  extension for the tree,  │
 │  roadmap,    │  click a button,       │  drive a persistent agent │
 │  buttons)    │  watch AI work         │  + CLI in the terminal    │
 ├──────────────┼────────────────────────┼───────────────────────────┤
 │ Terminal /   │  —                     │  ③ PURE AGENT             │
 │ CLI only     │  (launches are an      │  terminal-only, no ext.,  │
 │ (no ext.)    │   extension mechanism) │  any MCP host             │
 └──────────────┴────────────────────────┴───────────────────────────┘

 Orthogonal — no AI, non-interactive:
 ④ AUTOMATION / CI — scripted CLI (loom validate, record-release, roadmap in CI)
```

Reading notes to include verbatim in the guide:
- Bottom-left is intentionally empty — **task-scoped launches only come from the extension** (a button writes the launch prompt), so "CLI-only + task-scoped" is not a real combination. Show the gap honestly rather than invent a fourth recipe.
- ④ is not a cell — it is a **layer under everything**; any of ①–③ can also run CLI in CI. Drawn orthogonal to keep the 2×2 clean.

### The four recipes (each with a real example)

- **① Guided** — *example:* in the extension, right-click a thread → *Generate Idea*; a Claude terminal opens with the launch prompt, writes `idea.md`, you review. Then *Generate Plan* → *Start Plan* → *DoStep*, watching each. Audience: beginners, simple projects.
- **② Power terminal** — *example:* extension open for the tree/roadmap; in a terminal you run `claude`, say "read `ai-integration/context-dispatcher/design`, then draft the plan for this thread"; the agent uses `loom://context/...` and `loom_create_plan`. Session lasts as long as you want. Audience: advanced, flexible, cross-thread reads.
- **③ Pure agent** — *example:* no extension; in Cursor (or Claude Code) with the Loom MCP server configured, you converse with the agent and orient via `loom status` / `loom roadmap`. Audience: terminal purists, non-VS-Code hosts. This is the concrete proof of the host-agnostic promise.
- **④ Automation / CI** — *example:* a GitHub Action step runs `loom validate` to fail the build on broken links, and `loom record-release` in the release script. No AI, non-interactive.

### Two persistent-agent patterns to document (not build)

Both already fit Loom's pointer-driven model unchanged — surface them as usage patterns with an example:
- **Borrowing context from another thread** — mid thread-A, ask the agent to read thread-B's idea (`loom://context/{weave}/{thread}/idea`) to recall why a past decision was made; you stay in thread-A, no scope change.
- **Switching threads early** — thread-A barely started (near-zero context) → spin up thread-B + idea + chat, point the agent there, switch. Cheap because A had nothing invested. Useful freedom; does not fight "one thread = one slice, fresh context at session start, close when done + committed."

## Guide structure (`docs/WAYS-TO-USE-LOOM.md`)

1. **Two users** — human + AI (the hook).
2. **Two axes + the matrix.**
3. **The four recipes** — each with a real example.
4. **Pick your way** — decision table: *solo/team · beginner/power · editor/terminal · simple/cross-thread* → recommended recipe.
5. **How the architecture serves this** — MCP is the shared spine every way rides (`extension → mcp`, `cli → app`, `agent → mcp`), which is *why* the ways interoperate on one doc graph.
6. **Persistent-agent patterns** — borrowing context / switching early.

## README pointers

`README.md`, `packages/cli/README.md`, `packages/vscode/README.md` each get a **short, top-of-file, highlighted** callout linking to `docs/WAYS-TO-USE-LOOM.md` (e.g. a blockquote/badge near the top). No matrix copied into any README — link only, to stay drift-free per the doc-sync discipline.

## Delivery

Pure docs. `docs/*.md` and `README.md`/package READMEs are **outside** the `loom/**` MCP gate, so the guide and README edits use normal `Write`/`Edit`. Once written, record the work as a single DONE plan via `loom_quick_ship` (no req, no full plan ceremony — scope is settled and small).

## Decisions settled in chat-001

- Canonical location `docs/WAYS-TO-USE-LOOM.md` (user-doc convention), not `refs/`.
- Pointers in **all three** READMEs, top + highlighted, link-only.
- No `req` for this thread (optional; overkill for a settled docs task).
- Ship via `loom_quick_ship` rather than create_plan → do_step.
