---
type: idea
id: id_01KX6E03QNM76R4WA39E3H8DXZ
title: Ways to Use Loom — user-facing positioning guide
status: done
created: 2026-07-10
version: 1
tags: []
parent_id: null
requires_load: []
---
# Ways to Use Loom — user-facing positioning guide

## What we want to build

A single canonical **user-facing guide** — `docs/WAYS-TO-USE-LOOM.md` — that explains the distinct ways a developer can use Loom, when to pick each, and how Loom's architecture makes them interoperate. Three READMEs (`README.md`, `packages/cli/README.md`, `packages/vscode/README.md`) each carry a short, top-of-file, highlighted pointer to it. No copies of the content — one source, three pointers.

This is a **documentation / positioning task, not a feature.** It removes no manual step and adds no code surface. Its whole job is to give users a clear mental model they can locate themselves in.

## Why it matters

- Loom's headline vision promise — *"works with Claude Code, Cursor, or any MCP-capable agent"* and *"drop `loom install` into any repo"* — is currently **invisible** to a reader. Nothing tells a new user that Loom is more than "the VS Code extension."
- Users arrive with different setups (editor-centric vs terminal-centric, beginner vs power, solo vs team, one-shot fix vs long build). Without a map, they default to whatever they stumbled into and never discover the way that fits them.
- The `loom` CLI, the MCP surface, and the extension are three doors onto **the same doc graph**. That interoperability is a selling point that no doc currently makes concrete.

## Core model (the thing the guide teaches)

Two **independent axes** the user combines freely:
- **Axis A — human control surface:** Extension (visual tree + roadmap + buttons) vs CLI-only (terminal).
- **Axis B — AI session model:** task-scoped launches (extension button → one fresh AI session per action) vs a persistent agent (a long-lived Claude Code / Cursor session you steer and end).

Four named **recipes** as concrete points in that space:
- ① **Guided** — extension buttons, watch AI work. Beginner / simple projects.
- ② **Power terminal** — extension for the tree, a persistent agent + CLI in the terminal. Advanced, flexible.
- ③ **Pure agent** — terminal-only, no extension, any MCP host. The truest test of the host-agnostic promise.
- ④ **Automation / CI** — scripted CLI (`loom validate`, `record-release`, `roadmap`), no AI, non-interactive. Orthogonal layer under ①–③.

## Success criteria

- One canonical `docs/WAYS-TO-USE-LOOM.md` exists; the two-axes model + matrix + four recipes are all present.
- Each recipe carries a small, real example (a button-click sequence, a real terminal exchange, a CI snippet).
- A "pick your way" decision table maps *solo/team · beginner/power · editor/terminal · simple/cross-thread* onto the recipes.
- A short "how the architecture serves this" section: MCP is the shared spine every way rides.
- All three READMEs carry a top-of-file, highlighted link to the guide — and **no** duplicated matrix (drift-free).

## Non-goals

- No code, no new feature, no contract change. The persistent-agent pattern (borrowing another thread's context via a pointed read, or switching threads early) already fits Loom's pointer-driven session model unchanged — it is documented, not built.
