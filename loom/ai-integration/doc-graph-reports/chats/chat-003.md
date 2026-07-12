---
type: chat
id: ch_01KXBHD8QEHH2T88MJH8SKC9M2
title: Doc-graph reports — plan-004 C-2 Chat 003
status: active
created: 2026-07-12
updated: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 9
---
# Doc-graph reports — plan-004 C-2 Chat 003

## Rafa:

we already done plan-001, plan-002, plan-003 
and we are about to start plan-004 C-2

Thanks for to including 1 saved report in plan-004 step `build-test-verify-and-leave-a` will be nice to do a quick review of reports generated.
The idea is that when we finish this thread we generate the most interesting reports to be included/linked/showed in READMEs and docs so users can witness the adding value of using Loom in their own projects
We will generate and include also reports from our dogfooding Loom project Chord Flow
So we will try to reduce tokens/costs of inference for generating reports during the thread developing
And we could choose at the end what reports to show up
Agree?

### about plan-004
I asked you how were you going to save tokens for big projects/weaves/reports and I see you are going to:
- Add a deterministic token budget to selectReportDocs
- Extend the manifest to record each doc's tier (full / summary / reference-only) and per-tier counts

That approach is very nice becuase do not use any inference, it is deterministic and has no cost.

But I wonder if we could also take advantage of ctx.md loom docs and use them as a global and weave summaries.
- add global ctx.md as a doc for reports
- if a weave already has a ctx.md generated, use it
- if a weave is too big and has no ctx yet off user to generate one, loom/{weave}/ctx.md 

ctx.md would have 2 consumers:
- reports engine (the problem I see is that depending of the kind of info that report should generate, a summary could be useful or not)
- loom context

#### Currently only global context

If we consider this, it is a big one becuase currently we left only global loom/ctx.md and we eliminated weave level ctx.md files
This push back me a lot becuase overcomplicate loom context management too much, but I wanted to share the idea and know
What do you think?

## AI:

Two separate proposals here, and they deserve separate answers — one is an easy yes, the other I want to split apart before we commit, because I think it bundles three different things with very different costs.

## Part 1 — showcase strategy: agree, with two refinements

Yes. Generating reports as we build the thread, saving them, and picking the best ones for the READMEs/docs (Loom's own history *and* Chord Flow's) is exactly the cheap-validation play — it's the most demo-able feature on the board, and "point Loom at your project's history, get a decisions-and-weaknesses report" sells the doc-graph premise in one screenshot. Two refinements so we don't trip over ourselves:

1. **Separate "cheap during dev" from "best for the showcase."** Budgeting (plan-004 C-2) reduces the *input slice* cost — that's what keeps our dev iterations affordable. But the reports we finally put in a README want to be the *best quality*, which is a synthesis concern, not an input concern. So: keep dev-iteration generations budgeted/cheap, and reserve a small number of **full-quality final generations** (chosen at thread close) for the showcase. Those final ones can run wider slices deliberately. This fits the standing practice already baked into plan-004 step 4 — one sanctioned paid generation per plan.

2. **Track candidates as we go.** Rather than deciding "what to show" cold at the end, let's keep a short running shortlist (a note in the thread, or just a naming convention on the saved files) of "this one came out well." Cheap, and it means the end-of-thread choice is a curation, not a re-generation.

## Part 2 — ctx.md as a report source: worth doing, but let me split it into three

You've actually bundled three distinct commitments here, and they're *not* the same size:

**(a) The report engine consumes an existing ctx doc if one is present.** — This is *already in plan-004*. Step 1's Tier-2 degradation says: when a slice overflows budget, "prefer an existing ctx doc for that scope, else a fixed excerpt." So "if a weave already has a ctx.md, use it" is already the design — opportunistic, zero new machinery. ✅ keep.

**(b) Global ctx.md as a first-class report *input* for the right kinds.** — Cheap, additive, and genuinely helps the token goal: for a whole-project `project-overview`, feeding the few-KB global ctx instead of scanning every design is both cheaper *and* probably a better input for that kind. But — and this is the nuance you flagged yourself — **it belongs in the kind registry, not universally.** A summary *helps* orientation kinds (overview, onboarding) and actively *hurts* the high-value analytical kinds (`decisions`/"why", `drift-audit`, `security`): those exist precisely to surface the raw, un-summarized rationale, and feeding them a ctx summary gives you a report synthesized from a synthesis — twice removed from the source, and it launders away provenance (your `sources` becomes "the ctx doc" instead of the actual decision chats). So: `ctx` goes in `docTypes` for summary-friendly kinds only. That's a one-line-per-kind registry decision, not a new selection path.

**(c) Reintroduce weave-level ctx.md as a maintained standing doc.** — **This is the one I'd resist**, and I think your own push-back is the correct instinct. I checked: right now only `loom/ctx.md` exists — weave ctx really was eliminated. Bringing it back as a *maintained* doc reverses a simplification you value, and it adds a staleness surface that's especially dangerous *here*: **a stale weave summary feeding a report is worse than no summary**, because a report is supposed to be trustworthy decision-memory. A report that quietly synthesized from a 3-months-stale weave ctx would mislead — the exact opposite of the feature's purpose.

**The resolution that gets you ~90% of the benefit with none of the context-management complexity:** treat ctx as an input the report engine *can consume when present and appropriate for the kind* — never *required*, never *reintroduced as a mandatory doc*. Your third bullet — "if a weave is too big and has no ctx, offer to generate one" — is actually the right shape already: that's a **report-engine capability** (offer an on-demand, dated ctx for an oversized slice, use it, and it's fine if it's ephemeral), *not* a reversal of the global-only ctx decision. So we don't touch ctx scope at all; we just let the report engine read a ctx if it's there and offer to mint one for a too-big slice.

## The two-consumers coupling — keep ctx and reports distinct

You named the real risk: "ctx would have 2 consumers: reports engine + loom context." Watch this. ctx and reports are already defined as different things — **ctx is scope-state the AI reads to *operate*; a report is a narrative a human reads to *understand*** (it's in the design's "Relationship to ctx" section). Reports may *read* ctx as one cheap input, but must never *shape* it. The moment we start tuning ctx content/shape to make better reports, we've coupled two things that want to pull in opposite directions. If we ever genuinely need a summary tuned for reports, that's a *different* artifact — not a mutation of ctx's job.

## What I'd actually change vs. leave alone

- **plan-004 as written:** leave it. It already does (a). Its deterministic, no-inference budgeting is the right spine and I wouldn't disturb it.
- **Small addition, likely a follow-up plan (not a plan-004 amendment):** register `ctx` in `docTypes` for the summary-friendly kinds (b), and give the report engine the "offer to generate an on-demand ctx for an oversized slice" capability (c-as-capability). Both are additive to the kind registry / selection layer.
- **Do NOT:** reintroduce weave ctx as a standing maintained doc, or make any kind *require* ctx.

Does splitting it this way match your instinct? If you agree, I'd fold (b) + (c-as-capability) into the thread as a small follow-up rather than reopening plan-004 — and we start plan-004 C-2 as-is. Your call on whether that follow-up rides now or after we've seen the first budgeted report land.

## Rafa:

Agreed, fold (b) + (c-as-capability) into the thread as a small follow-up 
I started plan-004
do plan

## AI:

**Plan-004 (C-2 token budgeting) done** — all 4 steps ✅, plan auto-closed.

**What shipped**
- `selectReportDocs` gained a deterministic, AI-free char budget (`DEFAULT_REPORT_MAX_CHARS = 60000`, per-kind + per-run overridable). Over budget → degrade by recency: **full → summary → reference-only**. Summaries prefer an existing **scope ctx**, else a fixed excerpt (H1 + headings + first N lines) — never a model call, so the selection layer stays pure/testable/free.
- Manifest now carries `fullChars` (pre-budget) vs `emittedChars` (post-budget), per-tier counts, and an `elision` string; the `report` prompt tags each doc `[full|summary|reference]` and injects a **coverage note** telling the agent to state its own coverage honestly.
- Tests: 5 new blocks (determinism, degradation order, relevance, elision counts, ctx-preferred-over-excerpt). Full suite **23/23**.

**The budgeted report, generated for real** (whole-project `decisions`):

| | chars | ~tokens |
|---|---|---|
| Slice before budget | 3,392,358 | ~848k |
| Emitted after budget | 74,306 | ~18.6k |
| **Saved** | **~3.32M** | **~830k (~98%)** |

Tiers: 3 full · 5 summary · 220 reference (228 docs). Saved for your review at:
`loom/reports/Loom — Decisions (recent, budget-scoped) (2026-07-12) - decisions report.md` (`rp_01KXBPQV3FVQDK2QEGG3TC0HC1`). Single date in the filename — the double-date fix held. *(Generated via `loom report decisions`, which spawns a fresh server from the rebuilt dist, so it ran the new code even before you reconnected MCP.)*

**Two honest findings** (also written into the report):
1. **Recency = relevance front-loads the newest thread.** This whole-project decisions report is ~90% about the reports feature itself, purely because it's newest; the other 220 decision docs (2026-04→07) are named but not read. For a *showcase* report we'd want to scope by weave/date — or reconsider the relevance heuristic to sample across the timeline. Worth deciding before any report goes in a README (ties directly to the Part-1 curation plan).
2. The budget bounds *heavy* content, not the total — emitted (74k) exceeds 60k by the 220 reference markers (~14k), by design (every doc keeps a name).

**Still owed:** the **(b) + (c-as-capability) follow-up** you agreed to — register `ctx` in `docTypes` for summary-friendly kinds, and give the report engine an "offer an on-demand ctx for an oversized slice" capability. I did **not** auto-create it — it wants its own small plan (and finding #1 above might reshape it slightly). Say the word and I'll `generate plan` for it.

Uncommitted: plan-004 code (core budgeting + prompt), the test, the plan/done docs, the saved report, and these chat turns. Want me to **commit** (one commit for plan-004)?

## Rafa:

- commit plan-004
- generate plan for the (b)+(c) ctx follow-up
- we also have pending this chat section `## Part 1 — showcase strategy` lines 54-60. we talk about `Track candidates as we go`, we should make a list to track

### About **Two honest findings** 

1. Recency = relevance front-loads the newest thread. Yes, agree, recency is not good to be included in README showcase. Selected weave(s) could be most interesting.

### Most complete reports 

I think some doc sources slices could be interesting and more complete, whole project history:
- report from all ideas, or all ideas from selected weave(s)
- report from all designs, or all designs from selected weave(s)
- report from all plans, or all plans from selected weave(s)
- report from all dones, or all dones from selected weave(s)

I think there kind of reports that mainly could be feed for just one doc type

We should refine some reports to cover whole project history.
Maybe also give user the opportunity to generate reports without passing `selectReportDocs` filter, warning they consume lot of tokens 

What do you thinnk?

## AI:

Order: committing plan-004 this turn. The follow-up plan I want to shape with you first (below) — because your "most complete reports" idea lands on the *exact same surface* as (b)+(c), so folding them avoids two overlapping plans.

## On #5 — yes to all three, one reframe

- **Single-doc-type kinds (all ideas / designs / plans / dones)** — cheap and clean: each is just a registry entry (`docTypes: ['design']`, etc.). The engine + budgeting already handle any `docTypes` set, and "…from selected weave(s)" is the existing `--weave` filter — no new code path, just new kinds + framings. Strong yes; these are genuinely more *complete* per-lens ("what have we designed?", "everything we've shipped" from dones).
- **Whole-project completeness** — the lever is scope + budget, not a new mechanism. Your finding-#1 fix (weave-selected, not recency) is right: `--weave` already gives that today; for the showcase we curate weave-scoped runs. And single-doc-type slices are smaller than chats+designs, so they can carry a *higher default budget* and still stay affordable.
- **Unbudgeted / "no filter" mode with a token warning** — yes, as an explicit opt-in. One reframe so the mental model stays clean: it's a **budget override to unlimited**, not bypassing `selectReportDocs` — selection + ordering still run, you just switch off degradation. So `loom report <kind> --full` + a CLI-edge warning. The manifest already knows `fullChars`, so we can print "~Xk tokens — proceed?" cheaply before spending anything.

## Proposed single follow-up plan — "reports: coverage & kinds" (folds (b)+(c)+#5)

1. Single-doc-type kinds in the registry: `ideas` / `designs` / `plans` / `dones` (+ framings) — per-lens "complete" reports.
2. `ctx` in `docTypes` for the summary-friendly kinds (project-overview, architecture, the new overview kinds) — **(b)**. Analytical kinds (decisions / drift / security) stay ctx-free — they need raw rationale, not a summary-of-a-summary.
3. Per-kind default budgets: bump single-doc-type kinds higher; analytical kinds stay at 60k.
4. `--full` (unlimited-budget) override + a token-cost warning at the CLI edge — your "without filter, warned" ask.
5. On-demand ctx for an oversized slice — **(c)**: when a weave slice overflows and has no ctx, the engine notes it and offers to generate one (a capability, *not* a reintroduced standing doc — the boundary we drew earlier).
6. build + test + one saved sample report (the standing practice).

**Sub-decisions I need your call on** (they set names / API shape — this is why I'm not just generating it):
- Kind names: `ideas`/`designs`/`plans`/`dones`, or `*-overview`, or `all-*`?
- Override flag: `--full` vs `--no-budget` vs `--budget 0`?
- Default budget for single-doc-type kinds — a number (e.g. 150k), or "unlimited by default since one doc type is naturally bounded"?

Give me the shape and I'll generate it. (Or say "just the narrow (b)+(c)" and I keep #5 as its own plan.)

## Tracking list — seeded here, needs a permanent home

Candidates so far:
- ❌ *rejected* — `Loom — Decisions (recent, budget-scoped)` (rp_01KXBPQV3F…): recency-front-loaded; regenerate **weave-scoped** before it's showcase-worthy.
- ✅ *candidate* — `Loom — Project Overview` (rp_01KXB088…, from plan-002): the roadmap one you called "useful payoff."

Where should this live permanently? My rec: a dedicated `## Showcase candidates` note in the thread (survives chat scroll, MCP-writable) — or I keep it in-chat. Your call. Chord Flow's reports will get their own entries once we generate them there.

Committing plan-004 now.