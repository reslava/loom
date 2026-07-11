---
type: design
id: de_01KX9090H4YC377XX8TT1SEVFM
title: Surface Loom's decision-history value in positioning docs
status: done
created: 2026-07-11
version: 1
idea_version: 1
tags: []
parent_id: id_01KX6HRNBJB751WJTNAZN3NTEA
requires_load: []
---
# Surface Loom's decision-history value in positioning docs

## Goal

Land a concise, differentiated statement of Loom's **decision-history value** in the positioning docs — the property that a Loom project carries the full, auditable *why* behind every decision — without blurring it into the context-auditability claim the README already makes.

## Core positioning decision — two different "auditables"

The README already uses "auditable" twice, and both times it means **auditable context**:

- `## Fresh, Scoped, Auditable` → *"you know why the AI gave the answer it gave"* (the loaded docs are visible + version-controlled).
- `## How Loom is Different` table → row **"Auditable context"**.

This idea is about a **different, stronger, more team-facing** claim:

| | auditable **context** (already stated) | auditable **decision history** (this thread) |
|--|--|--|
| Question it answers | *Why did the AI answer as it did?* | *Why did the project decide as it did?* |
| Scope | one AI action | the whole project's lifetime |
| Audience | the person driving the AI | owners, collaborators, future-you (onboarding, handoff) |
| Mechanism | the loaded context bundle is explicit | every idea/design/req/plan/done/chat is durable, versioned, greppable |

**Decision (locked):** present decision-history as its **own section**, not folded into the existing "Auditable" bullet. Folding would conflate the two and weaken both. The new section stands beside the existing one — they are siblings (context-auditability vs decision-auditability).

## Placement

- **Primary:** a new short section in `README.md`, inserted **immediately after `## Fresh, Scoped, Auditable`** (line ~140, before `## How Loom decides what the AI sees`). Heading + one tight paragraph. Sibling positioning makes the context-vs-decisions distinction legible by adjacency.
- **Cross-reference:** one line in `docs/WAYS-TO-USE-LOOM.md` (fits under the "Two users" / value framing) pointing at the README section, so the team-facing angle is discoverable from the "which way do I run Loom" doc.
- **Not** in `## Why Loom exists` (that's Rafa's origin-story narrative — a value claim would dilute it) and **not** a bare bullet (reads as a restatement of the existing "Auditable" bullet).

Heading: **"The decision trail is part of the repo"** (chosen over "Every decision, kept" and "Auditable decision history" — the latter leans on the overloaded word we're trying to distinguish from).

## Deliverable — the section prose

```markdown
## The decision trail is part of the repo

Code tells you *what* was built. It almost never tells you *why* — which
alternatives were weighed, what got rejected, what a constraint was quietly
protecting against. That reasoning usually lives in one person's head or in an
AI chat window, and both are gone by the time the next person asks. The chat
window is the worst case: ephemeral, unsearchable, discarded the moment the tab
closes.

In Loom the reasoning *is* the repo. Every idea, design, req, plan, done-note —
and the chats that produced them — is markdown, versioned in git next to the
code it explains. The whole decision history is a first-class, greppable
artifact: an owner, a new collaborator, or you-in-six-months can trace any
decision back to the conversation that made it. You keep the *why*, not just the
*what*.
```

## Why this is grounded (not marketing)

- Maps directly to the vision's *durable/traceable memory* pillar ("structured docs as … the durable memory") and to the vision's opening pain ("a chat window: … no history, no search").
- It's a **direct consequence** of "markdown docs are the database" — a stated architectural fact, not an aspiration.
- The with/without contrast is concrete (rejected alternatives, constraints, the chat-window worst case), not superlatives.

## Scope / non-goals

- **In:** the README section above + one WAYS-TO-USE cross-ref line.
- **Out:** no code, no new doc types, no tooling. This is positioning prose only.
- **Watch:** don't touch the existing "Auditable" wording — the two claims coexist by design.

## Open / for the plan

- Whether `docs/USER_GUIDE.md` also warrants a mention (idea listed it as a maybe) — lean **no** for a first pass; README + WAYS-TO-USE is enough to land the claim. Revisit if it reads thin.
