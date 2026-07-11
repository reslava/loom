---
type: chat
id: ch_01KX8ZQPCTBAXZ1X4MCWAVW19P
title: decision-history-value Chat 001
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 5
---
# decision-history-value Chat 001

## Rafa:

read idea
is it all grounded? i think so
write a design with the paragraph / section draft

## AI:

Read the idea. Grounding verdict + one substantive finding before I draft, because it shapes the design.

**Is it all grounded? Yes — and its "currently-underplayed" claim is *confirmed* by what's actually in the docs.**

- Vision cite: the idea maps cleanly to the vision's *durable/traceable memory* pillar — "structured docs as the shared context, the workflow surface, and **the durable memory**." The vision opens on exactly the pain the idea contrasts against: "Today the default is a chat window: … no history, no search." So the with/without framing (esp. "AI chat window = ephemeral, unsearchable") is grounded, not invented.
- Underplayed claim: also true. I checked the README. The word "auditable" already appears twice — but it means something **different** from what this idea is about:
  - `## Fresh, Scoped, Auditable` → **Auditable** = *"you know **why the AI gave the answer it gave**"* (context transparency, per-answer).
  - `## How Loom is Different` table → row "**Auditable context**".
  - Both are about *auditable **context*** (what the model saw). The idea is about *auditable **decisions*** (why *we* chose what we chose, over the project's life). That's a genuinely distinct, stronger, more team-facing claim — and it is indeed missing today.

**So there's one design decision to make (this is why I'm pausing before writing design.md):**

The new value must **not** get folded into the existing "Auditable" bullet — that would blur two different things. It needs to stand on its own and, ideally, name the distinction:
- *auditable **context*** = why the AI answered as it did (already covered)
- *auditable **decision history*** = why the project decided as it did (the new, missing one)

My recommendation: a **short dedicated section** (heading + one tight paragraph), placed right after `## Fresh, Scoped, Auditable` (they're siblings — one is context-auditability, one is decision-auditability), with a one-line cross-reference from `docs/WAYS-TO-USE-LOOM.md`. Not a bullet inside an existing section, and not buried in "Why Loom exists." The idea's open question ("one paragraph vs dedicated section") → dedicated section, precisely because a bare paragraph risks reading as a restatement of the existing "Auditable" bullet.

**Draft of the section (this is the prose the design would carry):**

> ## The decision trail is part of the repo
>
> Code tells you *what* was built. It almost never tells you *why* — which alternatives were weighed, what got rejected, what a constraint was quietly protecting against. That reasoning usually lives in one person's head or in an AI chat window, and both are gone by the time the next person asks. The chat window is the worst case: ephemeral, unsearchable, discarded the moment the tab closes.
>
> In Loom the reasoning *is* the repo. Every idea, design, req, plan, done-note — and the chats that produced them — is markdown, versioned in git next to the code it explains. The whole decision history is a first-class, greppable artifact: an owner, a new collaborator, or you-in-six-months can trace any decision back to the conversation that made it. You keep the *why*, not just the *what*.

If you like the framing, I'll formalize it as `design.md`: the design records (a) the context-vs-decisions distinction as the core positioning decision, (b) placement (README dedicated section after "Fresh, Scoped, Auditable" + WAYS-TO-USE cross-ref), and (c) this section draft as the deliverable.

One thing to confirm: heading wording. "The decision trail is part of the repo" is my pick; alternatives — "Every decision, kept" (punchier), or "Auditable decision history" (parallels the existing sibling, but leans on the overloaded word). Your call.

STOP — waiting for `go` (and your heading preference) before I write design.md.

## Rafa:

Use your pick
go

## AI:

Written `design.md` (draft, v1). It locks:

- **The core positioning decision** — decision-history is its *own* section, kept distinct from the existing "Auditable" (context-auditability), with a small table spelling out the context-vs-decisions difference so the plan can't accidentally re-blur them.
- **Placement** — new README section right after `## Fresh, Scoped, Auditable`; one cross-ref line in `docs/WAYS-TO-USE-LOOM.md`. Not in "Why Loom exists", not a bare bullet.
- **The deliverable prose** — heading "The decision trail is part of the repo" + the two-paragraph draft, verbatim, as a fenced block.
- **Scope/non-goals** — README + WAYS-TO-USE only; no code; leave the existing "Auditable" wording untouched. Flagged USER_GUIDE as a lean-no maybe for the plan.

Next: I can (a) finalize the design (`draft → active`), or (b) generate a plan from it — it's small enough to be a 2-step plan (README section, WAYS-TO-USE cross-ref). Your call on which, or `go` for both.

## Rafa:

i set state of idea, design, chat done
do it and then loom_quick_ship

## AI:

Shipped. Both edits are in and recorded as `plan-001` (DONE, 2 steps) with a done record:

- `README.md` — new section **"The decision trail is part of the repo"** after `## Fresh, Scoped, Auditable`, plus the one-line note distinguishing it from *auditable context*.
- `docs/WAYS-TO-USE-LOOM.md` — decision-history cross-ref under "Two users" → links to the README section.

Idea/design/chat are `done` (your set), thread has its versioned-history entry. Tree is dirty (README, WAYS-TO-USE, design.md, plan-001 + done, this chat) — say the word if you want it committed.