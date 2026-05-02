---
type: reference
id: vision
title: "Loom — Vision"
status: active
created: 2026-04-30
version: 1
tags: [vision, north-star, onboarding]
parent_id: null
child_ids: []
requires_load: []
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

## Beyond Loom-on-Loom

Loom is currently building Loom — recursive while bootstrapping. **That recursion is not the purpose.** Loom is for helping final users, teams, and developers build any kind of solution.

This implies:
- `loom install` to drop the workflow into any project, not just this one.
- Possibly a custom `.loom/workflow.yml` so each team can shape its own variation of the loop.
- Loom-on-Loom is just a stress test. The real test is Loom-on-someone-else's-codebase.

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
