---
type: chat
id: loom-contrains-chat
title: "Loom Contrains Chat"
status: active
created: 2026-04-23
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
# CHAT

## Rafa:
Lets settle down

- 1 weave - M chats `ai-chats/`- X threads
- 1 thread - 1 idea - 1 design - N plans - Y chats `ai-chats/` 

what you think? suggestions?
we need to take into account future weave -> threads

## AI:

The model is solid. A few thoughts and one open question.

**What you have is right.** The `weave-and-thread-design.md` already defines this: a Weave is a project container, a Thread is the "1 idea → 1 design → N plans" unit inside it. Your bullet points match that design exactly.

**The `ai-chats/` location question is the interesting part.** You place chats at the weave level (`ai-chats/`), not inside the thread folder. That makes sense today because chats are loose — they might span topics, or exist before a thread is born. The natural future path is:

- **Weave-level chats** → `weaves/{weave-id}/ai-chats/` — brainstorming not yet assigned to any thread (loose fibers)
- **Thread-level chats** → `weaves/{weave-id}/{thread-id}/ai-chats/` — conversation scoped to that thread's idea/design/plans

Right now everything is at weave level, which is fine for Stage 1. Thread-level chats become worth adding when threads exist as subdirectories.

**One constraint worth locking in:** a thread has at most one active design at a time. Multiple designs exploring alternatives → separate threads linked via `parent_id`. Without the `role` field (just dropped), this is now a convention rather than a code check.

**Open question:** where does a chat live after `promoteToIdea`? The chat stays in `ai-chats/`, the idea lands in the weave root (today) or thread folder (future). The link is `parent_id` on the idea pointing to the chat. Is that the model you want, or should the chat move into the thread folder once promoted?

## Rafa:
- yes, we could admit N designs in a thread, but I thought
a situation like this:

threadA
ideaA - designA* - planA-001, planA-002
        designB*
                  planC-001*

* all has parent ideaA                  

could be splitted into 3 threads: AA, AB, AC

my ideas was simplify the thread concept but I would like to know what is your opinion, pros vs cons

- I know this design is in `weave-and-thread-design.md` but i wanted to fully settle down it together with chats

- when a chat is promoted to an Idea is move to thread chats (future)

## AI:

On the N-designs question — here is the honest trade-off:

**Option A — 1 thread = 1 design (your instinct)**
Pros: thread is a single, readable narrative. No ambiguity about which design is "the one." Tree view is clean. `promoteToDesign` always creates a new thread, never adds a second design to an existing one.
Cons: the split into 3 threads (AA, AB, AC) feels mechanical for a case that started as one idea exploring alternatives. You end up with 3 threads all pointing to the same `ideaA` via `parent_id`, which is valid but verbose.

**Option B — 1 thread = N designs**
Pros: the exploration lives together. You see all alternatives in one place.
Cons: "which design do we implement?" becomes a question the system cannot answer. Plans can attach to either design — now you need to know which design a plan belongs to. The tree view gets ambiguous. Validation gets harder.

**My recommendation: Option A.** The 3-thread split you described (`threadA`, `threadAB`, `threadAC`) is actually clean once you name them well. The `parent_id` on each thread's design points back to `ideaA`, making the graph readable. The system stays simple: one design per thread, designs-per-weave can be many, everything is traceable.

The key insight: threads are cheap. Splitting is not a cost — it is the model.

On the promoted-chat move: agreed. Chat stays in weave `ai-chats/` until promoted → then moves to `{thread}/ai-chats/` alongside the idea it produced. The `parent_id` on the idea is the permanent link regardless of where the chat file lives.

Shall I write this up as a decision in `weave-and-thread-design.md`, or keep it here for now?

## Rafa:
About threads
1 idea - 1 design - N Plans : user know the exact workflow fast, clear
If he needs to split could be becuase:
a) the idea is big and need to implement complementary features. The splitted threads remains after implementation
b) 1 idea - 3 different designs, when he decide he can archive the other 2 to _achive/cancelled. The weave keeps clean.
## AI:

Exactly right — and those two cases have different semantics worth naming:

**Case A — Complementary split (permanent threads)**
The idea is large. You split into sub-threads that each implement a slice. All threads survive. Example: `auth-core`, `auth-oauth`, `auth-admin`. This is a graph of siblings, each with its own design and plans, all linked to the parent idea.

**Case B — Exploratory split (temporary threads)**
One idea, multiple design candidates. You pick one. The others get archived to `_archive/cancelled/`. The weave stays clean — only the chosen thread remains active. This is a decision funnel, not a permanent structure.

Both cases fit the same model: 1 thread = 1 idea → 1 design → N plans. The difference is just lifecycle (archive vs keep). No special handling needed in the system — `cancelled` status and the `_archive/` move cover it.

**One thing to add to the design doc:** the distinction between these two split motivations, so future contributors understand *why* they are splitting, not just *how*. Want me to add that to `weave-and-thread-design.md` §2.1?
