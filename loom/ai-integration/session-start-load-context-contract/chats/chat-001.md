---
type: chat
id: ch_01KX3WR31N2TJAGKK6YSG3070W
title: session-start-load-context-contract Chat 001
status: done
created: 2026-07-09
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 5
---
# session-start-load-context-contract Chat 001

## Rafa:

In the previous session I detected a loom behaviour contract issue 
I told you read this loom chat (in a thread)
And I saw you using bash command to get the threadULID

I pointed you to a chat and you should have loaded the doc context
then you have also threadULID 

When a session start and user point you to a loom doc, thread you should always load the corresponding context by using mcp resource templates designed for when human user start the session and point you to a doc / thread:
- `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` — Human-pointable context bundle for a doc addressed by slug path (docSlug = idea/design/req or a filename stem like chat-001; a trailing .…
- `loom://context/thread/{weaveSlug}/{threadSlug}` — Human-pointable context bundle anchored on a thread’s primary doc — same bundle as the ULID form.

In the previous session you skipped this and this should be a hard contract
Please review the cause and let fix this

## AI:

You're right, and this session I did it correctly to prove the fix out: I loaded `loom://context/ai-integration/session-start-load-context-contract/chat-001?mode=chat` — no bash, no grep.

**Vision check:** this serves "the AI becomes as stateful as it can be via durable docs it rereads through MCP" and removes the manual step of an agent shelling out to grep frontmatter for a ULID.

### Root cause

The bash-for-ULID move wasn't a random slip — the contract *led me there*. Two things point the agent at the ULID first:

1. **Session-start step 5 and the primary entry points are ULID-keyed.** Step 5 says "call `do-next-step` with that thread's active planUlid (or read `loom://context/thread/{weaveSlug}/{threadSlug}`)". The slug-path human-pointable form is only a **parenthetical**. And when — like *this* thread — there's no plan yet, `do-next-step` needs a `planUlid` that doesn't exist, so the agent falls off the happy path and starts hunting for an identifier.

2. **The chat-reply visibility line is written in the ULID form:** `📡 MCP: loom://context/{chat-id}?mode=chat`. When a human points at a chat *by path*, I don't yet hold `{chat-id}` — so the documented line itself implies "go get the ULID first." The nearest way to get it looks like reading the file → bash.

The write tools and workflow prompts are strict-ULID *by design*, and that ULID-first framing bled into the **read/entry** path, where it's exactly wrong.

### The elegant fix (why no ULID derivation is ever needed)

The slug-path human-pointable resource **is** the slug→ULID resolver. The bundle I just loaded returns, in its header:

```
target=ch_01KX3WR31N2TJAGKK6YSG3070W  weave_slug=ai-integration  thread_ulid=th_01KX3WQV6C65G9QYEGDXDTW0EB
```

So loading context *hands me the ULID for free*. There is never a reason to derive it by hand — reading the resource is both the context load and the resolution. The bash step wasn't just off-contract, it was redundant work.

### Proposed change — one hard rule + one visibility correction, mirrored to both CLAUDE.md surfaces

A shared, `<!-- rule:… -->`-marked rule (so `claude-md-sync` enforces it in both the recursive `CLAUDE.md` and the `LOOM_CLAUDE_MD` template every downstream user gets):

> **Human pointer → slug-path resource (never derive a ULID).** When the user points you at a doc/thread by name or path, resolve it through the slug-path human-pointable context resource — `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` for a doc, `loom://context/thread/{weaveSlug}/{threadSlug}` for a thread. Never obtain the ULID yourself with bash/grep/Read on the file — the returned bundle's header carries `target` / `thread_ulid`, which you use for any subsequent ULID-strict write tool or prompt.

Plus: rewrite the chat-reply visibility line to lead with the slug-path form (`loom://context/{weaveSlug}/{threadSlug}/{docSlug}?mode=chat`) for the human-pointer entry, keeping the `{docUlid}` form for when you already hold the ULID mid-session.

Surfaces touched: `CLAUDE.md` (session-start step 5 + chat-reply injection + the new marked rule) and the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts` (mirrored marked rule). Then `./scripts/build-all.sh && ./scripts/test-all.sh` to confirm `claude-md-sync` parity holds.

This is a contract change to a shared, machine-enforced surface, so I'm stopping here for your go before editing. Want me to proceed as above — and should the new rule live under **AI session rules** (alongside the MCP-writes hard rule) or up in the **Session start protocol** step 5?

## Rafa:

Well analyzed!
About where the new rule lives, the rule is part of Session start protocol becuase loading thread/doc context is part of the session start. But at the same time it also apply everytime a human user point you to another thread/doc during the session. So what do you recommend?

## AI:

You've put your finger on exactly why it shouldn't live *only* in step 5: the trigger is "a human points you at a doc/thread," and that fires at session start **and** any time mid-session. If I bury it in the session-start protocol, the mid-session case reads as uncovered — which is half of when it actually happens.

**Recommendation: state it once as a standalone hard rule, point to it from step 5.**

- **Canonical rule** lives under **AI session rules**, next to the other MCP-resolution hard rules (the "all writes go through MCP tools" rule). Phrase it by *trigger*, not by *phase*, so it self-evidently covers both cases:

  > **Human pointer → slug-path resource (never derive a ULID).** *Whenever* the user points you at a doc or thread by name or path — at session start or at any point mid-session — resolve it through the slug-path human-pointable context resource (`loom://context/{weaveSlug}/{threadSlug}/{docSlug}` for a doc, `loom://context/thread/{weaveSlug}/{threadSlug}` for a thread). Never obtain the ULID yourself via bash/grep/Read on the file — the returned bundle's header carries `target` / `thread_ulid`, which you use for any subsequent ULID-strict write tool or prompt.

- **Session-start step 5** keeps its place in the ordered protocol but shrinks to a one-line pointer: "…scope the deep load to it via the slug-path human-pointable resource (see the *Human pointer → slug-path* hard rule)." Step 5 stays complete as a sequence, without duplicating the rule body.

Why this shape over duplicating the full text in both places: **single source of truth, no drift.** It's the same discipline as the doc-sync contract — state the fact once, link to it. If the rule text lived in both step 5 and AI session rules, the two copies would eventually diverge, and this is a `claude-md-sync`-marked shared rule, so a divergence is a real maintenance hazard, not just untidiness.

So: one marked hard rule under AI session rules (mirrored to the `LOOM_CLAUDE_MD` template), step 5 becomes a pointer, and the chat-reply visibility line switches to the slug-path form. Good to proceed on that basis?

## Rafa:

Agree
Do it and then use loom_quick_ship

## AI:

Done. Shipped the contract fix across both surfaces.

**New shared hard rule `human-pointer-context`** — added to both `CLAUDE.md` (under AI session rules, next to the MCP-writes rule) and the `LOOM_CLAUDE_MD` template in `installWorkspace.ts`, both carrying the `<!-- rule:human-pointer-context -->` marker so `claude-md-sync` enforces parity. The rule, phrased by trigger:

> Whenever the user points you at a doc/thread by name or path — session start **or** mid-session — resolve it through the slug-path human-pointable resource (`loom://context/{weaveSlug}/{threadSlug}/{docSlug}` or `.../thread/{weaveSlug}/{threadSlug}`). Never derive the ULID by hand via bash/grep/Read — the bundle header returns `target` / `thread_ulid`. The slug-path resource *is* the slug→ULID resolver.

**Two follow-on edits** so nothing still pointed the old way:
- **Session-start step 5** shrank to a pointer — leads with the slug-path resource and defers to the hard rule, instead of leading with `do-next-step`/planUlid (which broke down on a plan-less thread like this one).
- **Chat-reply context-injection** visibility line now shows the slug-path form (`loom://context/{weaveSlug}/{threadSlug}/{chat-stem}?mode=chat`) as the human-pointer entry, keeping the `{chat-ulid}` form documented as the mid-session equivalent.

**Verified:** `build-all` clean; `claude-md-sync` passes at 16 shared rule ids (was 15); full suite 23/23.

Recording this as a done plan via quick-ship, then committing.