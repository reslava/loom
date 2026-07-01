---
type: idea
id: id_01KT4MA3Z7SX80DNYAJSTH3YYV
title: Loom Demo Deliverables
status: done
created: "2026-06-02T00:00:00.000Z"
updated: 2026-06-02
version: 2
tags: []
parent_id: null
requires_load: []
---
# Loom Demo Deliverables

## Problem

Loom's value is hard to grasp from text alone. A prospective user reading the README has to *imagine* the workflow (chat → idea → design → plan → dostep → done) and *imagine* the context value ("the AI already knows the project"). The two surfaces where adoption is won — the **VS Code marketplace listing** and the **repo README** — currently have no visual proof and stale copy (the extension README still calls the sidebar "the panel", lists no button inventory, and has no demo asset).

The demo planning lived in `vscode-gif-demo/chats/chat-001.md`, but that chat conflated demo production with a core engineering refactor (the Unified Context Pipeline). This thread owns **only the demo deliverables** — the engineering arc has its own homes in `ai-integration/` and `core-engine/`.

## Goal

Ship the adoption-facing assets that make Loom's workflow and context model legible to someone who has never used it, on the two surfaces that drive installs (marketplace + README).

## Deliverables

- **D1 — README updates** (no recording needed; unblocked now):
  - **vsix README:** rename "the panel" → "the CONTEXT panel" throughout; full button inventory (Generate Idea/Design/Plan, Do Step, Refine, Promote, AI Reply, Generate Ctx, New Chat, Start Plan, Rename, Archive); demo-asset placeholder at top.
  - **main README:** hero icon (`packages/vscode/media/loom.png`); demo-asset placeholder after the Workflow section; exact button names in the extension bullet list; link to the extension/marketplace listing.
- **D2 — Workflow demo asset:** install → chat → idea → design → plan → dostep → done. The "aha" is the CONTEXT tree building node-by-node and the steps table flipping 🔳→✅. Demo project (pricing-page) + chat prompts already drafted in chat-001.
- **D3 — Context/reference demo asset:** weave ctx auto-load + a `requires_load` reference chain producing brand-correct output. Script + `brand-style-reference.md` + expected `demo-ctx.md` already drafted in chat-001.
- **D4 — Recording infra:** `.claude/settings.local.json` permission allowlist (no scary `--dangerously-skip-permissions` on screen), MCP-restart-after-build checklist, small clean demo project.

## Success criteria

- A first-time viewer can describe the Loom loop after watching D2.
- A first-time viewer understands "the AI loads project context automatically" after D3 — i.e. the *invisible* value is made visible.
- Marketplace + README copy names every extension button and the CONTEXT panel correctly.

## Scope boundary (important)

This thread does **not** own the context-pipeline engineering (Phases 2–5), the inert-ctx-load verification, or event-save-scope hardening. Those are tracked in their own threads. D3 has a **dependency** on weave-ctx auto-load actually working at record time (appears resolved by the 2026-05-31 ctx-load work — verify live before recording), but the fix itself is not this thread's work.

## Open decision for the design phase

The single load-bearing decision the design must settle: **asset format.** A GIF reads well for D2 (visible tree/table changes, and the marketplace renders GIF inline) but cannot convey D3's value (ctx auto-load is behavioral/invisible — a silent loop can't show "the AI already knew" vs "the AI grepped"). Candidate: hybrid — GIF for D2, short narrated video for D3. To be settled with Rafa before the design is written.

## Vision tie

Serves adoption: makes the vision-reference promises ("AI as stateful as it can be via durable docs", "no manual context dump") legible to someone deciding whether to install. Removes the manual step of *imagining* the workflow from prose.