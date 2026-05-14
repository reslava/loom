---
type: reference
id: rf_01KQYDFDDDGG6Q9DG9G1CM1GMG
title: loom — Vision
status: active
created: "2026-04-30T00:00:00.000Z"
version: 1
tags: [vision, north-star, onboarding]
parent_id: null
requires_load: []
slug: vision
---

# Loom — Vision

## User and AI collaboration

Loom is for making AI-User collaboration **development-oriented**: structured docs as the shared context, the workflow surface, and the durable memory — fitting how software actually gets built, not how chat windows want it to.

Today the default is a chat window: uncomfortable, no history, no search, no structure, no project workflow, no context. The AI starts each turn empty; the user re-explains everything every time.

Loom turns this into:
- Based on a **structured documents database**. Both always know weaves, threads state. Plans pending steps. The AI becomes as **stateful as it can be** — not via memory inside the model, but via durable docs it rereads at every action.
- Workflow: in a weave/thread
  `chat → {generate|refine} idea/design/plan/ctx → {implement step(s)} → done`
- Both freely chat and user decides when to ask AI to generate or refine an idea, design, plan, or implement some doable steps of a plan.
- When parent docs change, child docs go stale. User can ask AI to refine them so specs propagate.
- User launches/asks AI for docs generation, implement & refine. AI works in a terminal window showing process (streaming) and letting user view and interact.

Loom vscode extension is the visual help bridge between User ↔ Loom ↔ AI: tree and buttons to launch/ask AI.

## Who Loom is for

Loom is for any developer or team building software with AI — not just the Loom project itself. Drop `loom install` into any repository and the full workflow is available immediately.

- Works with Claude Code, Cursor, or any MCP-capable agent.
- Each project gets its own `loom/` doc workspace and AI session contract.
- Teams can shape the loop to their needs (a `.loom/workflow.yml` is planned for custom phases).

The Loom project uses Loom to build itself — a useful stress test, but **not the purpose**. The real measure is Loom on someone else's codebase.

## Chat
- User create new chat draft with a button
- User write
- User ask to AI to reply with a button
- Loom send to AI last `## {UserName}:` section
- AI reads and append the reply `## {AI}:`
- ...

## UX
### NO AI
- tree: state, filters
- weave/threads and docs operations: new, delete, rename, drag & drop, etc
### AI
- {generate}
- {refine}
- {implement step(s)}
