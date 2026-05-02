---
type: reference
id: loom
title: "Loom — Definition & Vision"
status: active
created: 2026-04-29
version: 1
tags: [vision, definition, onboarding]
parent_id: null
child_ids: []
requires_load: []
---

# Loom — Definition & Vision

**Use this doc as session-start context.** It captures the top-level vision of Loom, the
loop it enables, and why each piece of the system exists. Read it first before working on
any thread so you have the right mental model.

---

## Loom's top vision

Loom is a **collaboration medium between User and AI**, where **markdown documents are the
shared context database**. The whole tool exists to make that collaboration durable,
traceable, and resumable.

## The loop

1. **User and AI talk in chats** — free-form conversation grounded in the current context
   (a thread, a design, a plan). Chats are the *thinking space*.
2. When the conversation reaches something concrete, **the user clicks a button** to ask
   the AI to **formalize** the conversation into a structured doc:
   - "Capture this as an **idea**"
   - "Turn this into a **design**"
   - "Break this into a **plan**"
   The button is the moment of **promotion from chat → structured doc**. The AI does the
   writing; the user decides when.
3. Once a plan exists, **the user clicks another button** to ask the AI to **implement
   the next step**. The AI writes code, then writes implementation notes into the matching
   `-done.md`. The plan ticks forward.
4. Throughout, the **chat keeps going** in its own context — it's the conversation log,
   not the workspace.

## Why each piece exists

- **Chats** = where humans and AI think together (no implementation, no formal state).
- **Idea / Design / Plan docs** = formalized outcomes of conversations, become the
  durable context.
- **`-done.md`** = where AI records what it actually did (separate from chat, separate
  from plan).
- **Buttons in the extension** = the user's explicit trigger points. AI never acts
  unprompted; the user decides when conversation becomes formal output, and when a step
  gets implemented.
- **MCP** = makes all this state machine-readable so the AI never has to guess.

## Implication for buttons

The `DoStep` button is not "mark step done" — it's "AI, implement this step now." The
execution *is* the point. Marking done is a side-effect of having actually done it.
Without the AI doing the work, the button is a lie.

Same for the chat → idea / design / plan buttons: each is a request for the AI to
*produce* the formal doc from the chat, not a state flip.

So the architecture has to start from: **how does the AI actually do work when a button
is clicked?** That's the sampling problem. Until that's solved, every button is either
fake (just marks state) or pushes the work back to the user.
