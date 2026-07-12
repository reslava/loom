---
type: chat
id: ch_01KXBTYC2TTQ4GFM0MK0K91AFN
title: doc-graph-reports — plan-005 Chat 004
status: done
created: 2026-07-12
updated: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 21
---
# doc-graph-reports — plan-005 Chat 004

## Rafa:

I started plan-005
do plan

## AI:

**Plan-005 (Reports — coverage & kinds) done** — all 6 steps ✅, plan auto-closed.

**What shipped**
1. Four single-doc-type "complete" kinds — `ideas` / `designs` / `plans` / `dones` — each cross-weave with a distinct lens and a **150k-char default budget**.
2. `ctx` registered in `docTypes` for the summary-friendly kinds (architecture + the four new); analytical kinds (`decisions`/`drift-audit`/`security`) stay ctx-free.
3. `loom report <kind> --full` — unlimited-budget override wired CLI→prompt→`selectReportDocs`, with a **token-cost warning** at the CLI edge (reads `manifest.fullChars`).
4. On-demand-ctx suggestion — when a weave slice degrades and has no ctx, the manifest + coverage note point at `loom refresh ctx` (capability only, no auto-gen).
5. Tests (13 blocks) + build + **23/23 suite green** + one real sample report.
6. `loom/refs/reports-reference.md` completed (Parameters, Examples/how-to, kinds promoted to shipped).

**Sample report — `designs --weave core-engine`** (weave-scoped, showcase shape):
- **211,746 → 150,463 chars** (~53k → ~37.6k tokens), tiers 22 full · 0 summary · 10 reference. The step-4 ctx suggestion fired live.
- Saved: `loom/core-engine/reports/Core Engine — Designs (2026-07-12) - designs report.md` (`rp_01KXC1HB5W…`) — added to the showcase-candidates table.

**Finding worth your eye (reinforces last time's):** recency=relevance degraded the **oldest/foundational** designs (Link Index, Clean-Architecture layering, BaseDoc, ID Management) to reference-only — the *opposite* of what a `designs`/`architecture` reader wants. For these kinds, **oldest-first ordering or `--full` is the better shape**. It's a real design question we could pick up as a small follow-up if you want the single-doc-type kinds to default to a non-recency order.

Uncommitted: plan-005 code (core kinds/selection, mcp prompt, cli) + tests + reference doc + the sample report + plan/done docs + these turns. Want me to **commit** (one commit for plan-005)?

## Rafa:

commit
spin up a small follow-up plan for the single-doc-type kinds to default to a non-recency order
maybe we could have recency, oldest sort options together with full or budget 

### ctx

i saw that brief generated for the report said:
>SUGGESTION — these weaves had docs degraded by the budget but have no ctx to summarize with: core-engine. Generating a ctx for them (e.g. `loom refresh ctx` scoped to the weave) would give better summaries on the next run. (Informational — no ctx is generated automatically.)

that is suggesting to include again weave level ctx.md files? because currently we only have global ones

### Pending plans

from `loom/ai-integration/doc-graph-reports/chats/chat-002.md` lines 102-106

**Group D — extension surface**
7. **Extension `Reports` tree node** (read-only display) **+ generate action**. Display is *independent*; the generate action *builds on 3* (the agent-launch pattern).

**Group E — optional / later**
8. **Refresh-in-place** (vs snapshot). Deferred; revisit only if repeated regeneration proves noisy. *Lowest priority.*

write plan for group D

currently:
- global reports appears in extension tree in weave = reports > Loose fibers > * and should appears in special folder similar to Refs, Reports 
- weave reports do not appear in extension tree

### Notes about Loom reports

reports about Loom itself can bring some weird information becuase Loom was born and grew up inside Loom repo itself, so old decisions was taken with very early states of Loom, even Stage 1 and Stage 2 (maybe we clean that stages info in the future from relevant docs like CLAUDE)

## AI:

Committing plan-005 as the last action. On your four points:

## ctx — you caught a real seam

Half-right, so let me be precise. The suggestion does **not** reintroduce weave ctx as a *mandatory* doc, and nothing auto-generates one — that boundary holds. **But** if you *act* on it (`loom refresh ctx` scoped to a weave), Loom writes a **persistent** `loom/{weave}/ctx.md` that then lives on and is loaded by `getState` from that point. So it's not ephemeral — following the suggestion *is* opting into a standing weave ctx. It's your choice (never forced), so the "optional/on-demand, never mandatory" rule isn't broken — but you're right that it *nudges* toward the weave ctx you're wary of.

And given the recency finding, generating a ctx is **not** the best fix for the case that triggered the suggestion (a `designs`/`architecture` run dropping foundational docs) — **ordering (oldest-first) or `--full` is.** So I'll rework the suggestion (in the ordering plan) to lead with `--sort oldest` / `--full`, and mention ctx only as a secondary opt-in that *creates a persistent doc*. That keeps the (c) capability honest — "use a ctx if one exists" — without pushing weave ctx on you.

## plan-006 — non-recency ordering (drafted)

`pl_…` in this thread. Shape:
1. `selectReportDocs` gets a **keep-full ordering** knob — `sort: 'recency' | 'oldest'` (recency = newest keep full, today's behavior; oldest = oldest keep full). Per-kind default via a new `defaultSort`: **single-doc-type kinds + architecture → `oldest`** (foundational docs stay full), analytical/roadmap → `recency`. Output stays chronological.
2. `--sort <recency|oldest>` wired CLI→prompt→selection (mirrors `--full`; they compose).
3. Rework the oversized-ctx suggestion (per the ctx answer above).
4. Tests + regenerate `designs --weave core-engine --sort oldest`, saved — a better showcase candidate that keeps the foundational designs full (before/after vs the recency run).

**Sub-decisions to confirm:** flag `--sort` vs `--order`; values `recency`/`oldest` (add `structural` later?); the per-kind defaults above.

## plan-007 — Group D, extension reports surface (drafted)

`pl_…` in this thread (kept here for feature cohesion — say if you'd rather it be its own vscode-extension thread). I found the cause of your phantom-weave bug: the tree special-cases a `refs` pseudo-weave into a **"Refs"** node (`treeProvider.ts:163–235`); `loom/reports/` has no such handling, so it falls through as a normal weave whose docs show as Loose Fibers. Plan:
1. Render cross-weave `loom/reports/` under a dedicated **Reports** node (mirror the refs special-casing), read-only + click-to-open — kills the phantom weave.
2. Render weave-scoped `loom/{weave}/reports/` under their weave (reports are outside `LoomState`, so the tree scans the dir directly).
3. **Generate-report** action (command + menu) launching the `--run`/`launchClaude` agent to synthesize + save, then refresh.
4. build + test + verify in the Extension Dev Host.

## Loom-self reports — agreed, real artifact

You're right: a whole-history Loom report faithfully surfaces **superseded early-stage decisions** (Stage 1/2, pre-ULID, the old `weaves/` folder naming — I saw it in the core-engine designs). That's *correct* for a decisions/history report but misleading for a **showcase**. Levers, cheapest first: **`--since`** to scope past the early stages, weave-scoping, and — the deeper one you flagged — a future cleanup of Stage 1/2 references from `CLAUDE.md`/refs. I'd treat that CLAUDE cleanup as its own small task when you want it, not part of these plans. (It's also why **Chord Flow** reports will be the cleaner showcase — that repo didn't grow up inside Loom.)

Both plans are drafts (uncommitted) for your review — `start plan` whichever you want first. Committing plan-005 now.

## Rafa:

### plan-006

Sub-decisions:
- flag: `--sort` 
- values: `recency`/`oldest` agreed (add `structural` later?, but what means `structural`?)
- the per-kind defaults above: agreed

### ctx

I found mcp tool: `loom_refresh_ctx`  
```
 loom_refresh_ctx                                                                                        loom                                                                                                            
 Tool name: loom_refresh_ctx                                                                                       Full name: mcp__loom__loom_refresh_ctx
                                                                                                                Description:
 Prepare a ctx (re)generation. Assembles the scope source, ensures the ctx doc shell at the canonical flat path, and returns the source for the agent to summarise — then call loom_update_doc on the returned ctxId with the summary body. No server-side inference (works in any host). scope "global" -> loom/ctx.md (id loom-ctx); scope "weave" -> loom/{weave_slug}/ctx.md (id {weave_slug}-ctx). Returns stale=false when the source is unchanged since the last generation (source_hash).

   Parameters:
     ● scope (required): string - ctx scope (global or weave)
     ● weave_slug: string - Weave folder slug (required when scope = "weave") 
```

so it looks there is an mcp tool still available for a weave level ctx

current extension does not show even global ctx.md and I am almost sure won't show weave level ctx neither 
also I did not find equivalent mirror CLI command

spin up a thread to settle down this discrepancies

## AI:

## plan-006 — locked

`--sort`, values `recency`/`oldest`, per-kind defaults — all confirmed. plan-006 stands as drafted; ready to `start plan` whenever.

**What `structural` would mean** (and why I'd defer it): instead of ordering the keep-full decision by *date*, order it by the doc **graph** — keep the structurally foundational docs full (lowest layer / most-referenced via the link index) and degrade the leaf/incremental ones. The reports design already gestured at this ("chronological for narrative kinds, structural for architecture"): an `architecture` report ideally keeps the base-layer, most-depended-upon designs full regardless of date. It's appealing but **needs a real ranking definition** (backlink count? explicit layer? parent-chain depth?), so I'd leave it a *named future option*, not build it now — `recency`/`oldest` cover the concrete need (foundational = oldest, here).

## ctx — good find, thread spun up

You're right, and it's a real inconsistency: `loom_refresh_ctx` still offers `scope: "weave"`, the extension shows **no** ctx (not even global), and there's **no CLI mirror** — three surfaces disagreeing about what ctx even is.

Spun up **`core-engine/ctx-surface-parity`** (idea `id_01KXC5B8CF…`, priority 40) framing the three discrepancies and the fork it exists to settle:
- **(A) Global-only** — retire `scope: "weave"` from the tool; ctx is a single `loom/ctx.md`. Matches current practice; drops the reports weave-ctx nudge.
- **(B) Fully support weave ctx** — keep the capability but make *every* surface honour it (extension display + Refresh, CLI `loom refresh-ctx [--weave]` mirror, docs).

Whichever you pick, the rule is **all three surfaces end consistent**, and the reports (c) suggestion + plan-006's reworded wording align to it. I deliberately did **not** pre-decide — that's the thread's job. (My lean, for when you pick it up: **A**, unless big-project per-weave summaries prove worth the maintenance surface — but that's your call, and it's exactly the weave-ctx tension you keep flagging.)

Nothing committed this turn — the new thread/idea and plan-006/007 are all drafts for review.

## Rafa:

### ctx

think out loud with you, going far to extract the important point without rejecting new ideas... 

about picking (A) or (B) (currently is A with the discrepancies found)
- a global ctx is not about all the implemented threads in every weave, it is about the main, most used and needed architecture, rules, APIs contracts, nomenclatures, documents links, etc. It is almost an extension of main / hard CLAUDE.md contract, always loaded when session star.
  - when should be updated: a new main important point appears or is modified 
- a weave level ctx should reflect the main points of all the "main" threads inside the weave. Should be loaded when star working in a thread of the weave.
  - when should be updated: after every thread is finished?

weave level ctx depends also of how well structured and grouped are the threads to be useful
weave level ctx always miss cross-weave relationships

should we design:
- a event that fires global ctx refresh automatically
- an event that fires weave ctx refresh automatically
if we get this, ctx files will never be stale

should we design predefined and maybe customizable important project pilars of every projects (agnostic)
- architecture/layers 
- API
- language/technologies/libraries/dependencies
- CI
- documentation
- AI
should we propose predefined weaves in loom projects? 
even loom could group threads in predefined/custom weaves analysing then and classifying them
this way we could generate global and weave ctx files automatically with via AI inference help

the goal is getting global and weave ctx files autoupdated

stoppping here, I don't want to go any further before knowing

what do you think? suggestions?

## AI:

Thinking with you — and I think you circled the one point that actually decides this. Let me name it, then push on two ideas and endorse a third.

## The point that decides A vs B: staleness

Weave ctx was abandoned for exactly one reason — the maintenance/staleness burden. Everything you wrote reduces to one question: **can ctx stay fresh cheaply?** If yes, weave ctx is viable (B); if no, A. It was never "is weave ctx useful" (it clearly can be) — it's "can it stay trustworthy without cost."

## Where auto-refresh hits Loom's spine — and how to save the good half

"An event fires a ctx refresh automatically" means an event fires **AI inference**, and that collides with two things:
- Loom's core rule **"AI never acts unprompted"** — buttons/slang are the user's explicit trigger; nothing spends inference on its own. Auto-firing generation breaks that principle.
- **Your wallet** — silent auto-refreshes spend tokens you're paying for, on a cadence you didn't choose.

But the valuable half is salvageable and *already half-built*: **auto-detect staleness (deterministic, free); keep the refresh a one-click user action.** `loom_refresh_ctx` already returns `stale` via a `source_hash` — the engine already knows when a ctx's source changed. Wire that into the staleness system Loom already runs for idea/design/plan:
- **Global ctx** → flagged stale when its source changes.
- **Weave ctx** → your "after a thread finishes" *is* a concrete, detectable event — flag the weave ctx stale when any thread in it reaches done.

Then the human sees "⚠ ctx stale — refresh?" and clicks once. That's **"you always know it's stale + cheap to fix"** — 90% of "never stale", with zero silent AI and zero surprise cost. The Loom-shaped version of your goal.

## Pillars template — yes, cheap and genuinely good

A predefined-but-customizable section schema (architecture/layers · API · tech/deps · CI · docs · AI) is just a better *generate* prompt: ctx comes out consistent and comparable, and the generator knows what to look for. Low risk, real polish. I'd take it.

## Predefined weaves + AI auto-classifying threads — brakes here

Two different things:
- *Optional weave scaffolding at `loom install`* (suggested starter weaves) — fine, cheap, opt-in.
- *Loom analysing your threads and re-grouping them into weaves via AI* — a big, invasive, inference-heavy feature that **reorganises the user's own project structure**. High risk (moving threads is destructive), unclear payoff, and not what the vision asks Loom to do (durable shared context, not "reorganise my repo"). That's the building-in-the-dark corner — park it as an idea, don't design it now.

## The synthesis — A/B is a false binary. Call it (C)

- **Global ctx** — always-loaded (your "extension of CLAUDE.md" framing is exactly right), staleness-flagged, one-click refresh.
- **Weave ctx** — *optional and on-demand* (not auto-maintained), but when one exists it's **surfaced in the extension**, staleness-flagged (on thread-done), one-click refreshable, with the CLI mirror.
- Both from the **pillar template**. No auto-firing AI. No auto-weave-classification.

That gives weave ctx everything B wanted (visible, trustworthy, parity across surfaces) with A's low burden (on-demand, deterministic staleness, user-triggered refresh). It also answers your own two caveats: weave ctx *does* miss cross-weave links → **global stays the home for cross-weave architecture**, weave ctx is just the per-weave zoom; and weave-ctx usefulness depends on thread grouping → on-demand means you only make one where the grouping already earns it.

## One honest meta-note

This is a big, mostly *internal-quality* expansion at a moment when the scarce thing is external validation, not more ctx machinery. The cheap valuable slice is small — deterministic ctx staleness + one-click refresh + extension display + the pillar template. Auto-firing AI and auto-weave-classification are the expensive, against-the-grain parts; I'd leave them parked.

This is really the **`ctx-surface-parity`** thread's design conversation, not doc-graph-reports. Want me to carry these points into a chat there (its proper home) and continue it in that thread? You said stop here — so nothing to build; I'm stopping for your read.

## Rafa:

carry these points into a chat in `ctx-surface-parity`
(ctx raised again and I need to unload my ideas)

## AI:

Carried the ctx discussion (your ideas + the synthesis) into **`core-engine/ctx-surface-parity/chat-001`** — let's continue it there. This chat stays with doc-graph-reports (reports coverage & kinds).