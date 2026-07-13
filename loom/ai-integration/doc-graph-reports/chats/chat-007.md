---
type: chat
id: ch_01KXD67B4HM7V8F479VKTT9V8E
title: doc-graph-reports — docs showcase Chat 007
status: done
created: 2026-07-13
updated: 2026-07-13
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 16
---
# doc-graph-reports — docs showcase Chat 007

## Rafa:

we finished this thread reports feature
now we need to update documentation and generate/select reports to showcase

update pending sections and `## Showcase candidates` `loom/refs/reports-reference.md`
update main README with a section for reports feature, highlighted, with links to reports showcase, comented and described, with a link to `loom/refs/reports-reference.md`
report are a Loom feature differentiator from other tools becuase Loom can generate reports from chats, ideas, designs... and this is very different from reports generated just from codebase

anything more you suggest to promote Loom reports as a first class Loom feature, pls tell me

## AI:

Good timing — the feature is shipped and there are already **5 reports on disk**, so this is a "promote what exists" job, not "build more." Quick vision check: this serves *"the AI (and the human) rereads durable docs as decision-memory"* — reports are the first feature that *queries* the graph instead of building it, so promoting them is promoting Loom's core bet.

## Your framing is the headline — let me sharpen it

The differentiator isn't "Loom generates reports" (any tool with an LLM can summarize a codebase). It's **what Loom reads**: the **reasoning layer** — chats, ideas, designs, req, done — that *does not exist in the code*. A codebase-only tool structurally **cannot** answer "why did we pick ULIDs over slugs?", "where did implementation drift from the design?", or "what did we reject and why?" — because that rationale was never in the source. Loom can, because the decision trail *is* the repo. README one-liner: **"Reports read your project's reasoning, not just its code."**

## The two doc tasks — plan + a couple of decisions for you

**1. `reports-reference.md`**
- **Showcase candidates** — the table is stale vs. disk: today's **"Core Engine Ideas — What Loom Set Out to Build"** (`rp_01KXD3HQDE…`) isn't listed. I'd add it and lock the final picks. Proposed showcase set of **three different lenses** (reads better than three of the same kind):
  - **Loom — Project Overview** (`rp_01KXB088…`) — breadth
  - **Core Engine — Designs, foundational-first** (`rp_01KXC9GHQQ…`) — depth + the `--sort oldest` story
  - **Core Engine — Ideas** (`rp_01KXD3HQDE…`) — the "what we set out to build" intent lens
- **"Pending sections"** — I don't see obvious TODO markers in the doc. Tell me which sections you meant (or if it's just the showcase table + a new "why this is a differentiator" paragraph) so I target them exactly instead of guessing.

**2. `README.md`** — a highlighted **Reports** section. Best placement: **right after "The decision trail is part of the repo."** That section already argues the *why* lives in the repo; reports are its *payoff* — "…and now you can generate a report from that trail." The two read as claim → capability. It links the actual showcase report `.md` files (GitHub renders them), gives one example command per kind, and points out to `reports-reference.md`.

## What else I'd do to make reports feel first-class (your open question)

- **Add a row to the "How Loom is Different" table:** `Reports from decision history | ❌ | ❌ partial | ✅ chats+designs, not just code`. That table is where a reader decides Loom is *categorically* different — reports belong in it.
- **Show, don't tell.** The idea doc itself calls reports the most demo-able feature. Link/embed a real generated report (GitHub renders the `.md`), or excerpt 6–8 lines of a decisions report inline. A screenshot of the **Reports** tree node with an open report is stronger still.
- **Document the agent surface.** The README's MCP tables don't mention reports — add `loom://reports` (resource), `loom_create_report` (tool), and the `report` prompt so agents discover it. Plus a doc-sync sweep: `mcp-reference.md`, `cli-commands-reference.md`, and `docs/WAYS-TO-USE-LOOM.md` if reports aren't there yet.
- **The chord-flow angle** — the strongest single proof is a report generated from *chord-flow's* history: "point Loom at a project that isn't Loom, get its decisions." One `loom report decisions --weave <cf-weave>` there would be the money shot for the **Used by** section. (Costs a gen — your call, below.)
- **A tagline that travels:** *"git blame for decisions"* / *"your project's reasoning, made queryable."*

## Before I touch anything — two token-costing choices, your call

1. **Showcase reports: regenerate at showcase quality, or feature as-is?** I lean **as-is** — they're already curated; regenerating burns a paid gen for marginal polish.
2. **Generate one chord-flow report** for the "Used by" proof — yes/no? That's the single new gen I think is actually worth the spend.

Everything else (both doc edits, the comparison-table row, the MCP-surface rows) is **free prose work** — say `go` and I'll do it. Just tell me what "pending sections" means so I don't guess.

## Rafa:

1. Showcase reports: as-is
2. Generate one chord-flow report. Which kind of report you suggest? `architecture`, `decisions`, `ideas`, `designs`? full? 
   1. loom report ideas --full?
   2. loom report architecture --full?

## AI:

My pick is **`decisions`, scoped to chord-flow's richest music-domain weave** — not either of your two. Here's the honest ranking against the *one* job this report has (prove Loom reads what code doesn't):

| Kind | Differentiator strength | Why |
|------|------------------------|-----|
| **decisions** ⭐ | **strongest** | chats + designs → the "why" / rejected alternatives. A codebase-only tool **structurally cannot** produce this. This *is* the money shot. |
| designs | strong | the design corpus (reasoning-layer, foundational-first). Great depth, clearly not-from-code. |
| ideas | medium | "what CF set out to build" — clean intent lens, but lighter; less wow. |
| architecture | **weakest** | designs + refs → layers/components. This is the one a code-only tool can *half-fake by reading the source* — so it undercuts the exact claim we're making. Avoid it for this. |

So between your two options: **`ideas` over `architecture`** (architecture is the wrong one to showcase the differentiator with) — but I'd spend the gen on **`decisions`** instead of either.

**On `--full`:** I'd **not** use `--full` here — I'd **scope to one weave** instead. Reasons:
- `decisions` defaults to `--sort recency`, and a whole-project run **skews to the newest thread** (the reports-reference warns exactly this) — a scoped weave gives a coherent, self-contained "why this music-domain design is the way it is" narrative.
- Scoping bounds the token cost far better than `--full` on the whole project (and you're watching spend). If the chosen weave is small, add `--full` on *that weave* — cheap and complete.

So my recommendation: **`loom report decisions --weave <cf-music-weave> --run`** (add `--full` only if that weave is small).

**One thing I need from you:** which chord-flow weave? I don't have CF's state loaded here (separate repo, `J:/src/chord-flow`). Point me at the meatiest one (CAGED / interval-lattice / chord-derivation?), or say "look" and I'll open CF's roadmap/state first and pick the weave with the deepest chat+design history, then run it.

Still open from before: **what "pending sections"** in `reports-reference.md` you meant — needed before I edit that doc, but not blocking the CF gen.

## Rafa:

You can read / review Chord Flow in `J:/src/chord-flow`
I lean chord flow weave domain (music related concepts), these are its threads:
loom/domain/anacrusis
loom/domain/chats
loom/domain/chord-qualities
loom/domain/chromatic-degrees
loom/domain/intervals
loom/domain/multi-bar
loom/domain/progression
loom/domain/rhythm
loom/domain/rhythm-notation
loom/domain/song
loom/domain/song-default-feel
loom/domain/transforms
loom/domain/triplet-feel

## AI:

Reviewed CF. The `domain` weave has **13 threads, 30 decisions-relevant docs** (11 designs + 19 chats), totaling **~436 KB**. The `decisions` kind's default budget is **60 KB** — so a plain `loom report decisions --weave domain` would keep only the newest ~14% full and **degrade ~85% of the docs to summary/reference** (and default `--sort recency` skews that to the latest threads). That's a weak showcase. So the real choice is about **budget/scope, and it's your token spend** — three honest options:

| Option | Command | Slice | Cost | Result |
|--------|---------|-------|------|--------|
| **A — whole domain, complete** ⭐ | `loom report decisions --weave domain --full` | full ~436 KB (~110k in-tokens) | **highest** (one-time) | The complete music-domain "why" — every concept full-fidelity. `--full` also **sidesteps the recency-skew** (nothing degrades, sort irrelevant). Max breadth = best "look how much reasoning Loom captured" money-shot. |
| **B — one deep thread, full fidelity** | `loom report decisions --weave domain --thread rhythm` (or `progression` / `song`) | ~30–60 KB, fits budget | **low** | A coherent, complete "why the rhythm model is designed this way, alternatives weighed." Best *quality-per-token*; narrower story. |
| **C — whole domain, default budget** | `loom report decisions --weave domain` | capped 60 KB | low-ish | Cheap but ~85% degraded to summary — the report will honestly say coverage is thin. **Weak showcase — I'd skip this.** |

**My recommendation: A** — this is the *one* sanctioned showcase gen, breadth is exactly the selling point ("Loom captured the reasoning behind the entire music model"), and `--full` kills the recency-skew problem cleanly. ~110k input tokens is a meaty-but-not-insane one-time cost.

If you'd rather keep the spend minimal, **B** on `rhythm` or `progression` (both have design + 3 chats + dones) is the best-value fallback and still a strong, complete artifact.

Reply with **A** or **B (+which thread)** and I'll run it with `--run` from `J:/src/chord-flow`, land the report under CF's `loom/reports/`, then wire it into the README "Used by" section.

(Still parked, non-blocking: what "**pending sections**" in `reports-reference.md` you meant — I'll need that before editing that doc.)

## Rafa:

I ran it:
```
$ loom report decisions --weave domain --full --run
[cache] miss → rebuild start
[cache] rebuild end durationMs=418 weaves=12 plans=60

⚠ --full: token budget DISABLED — sending the full slice, no degradation.
  Full slice ≈ 424,451 chars (~106k input tokens) — this is the unbudgeted cost.

▶ Launching Claude to generate and save the decisions report…

(node:22508) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.
(Use `node --trace-deprecation ...` to show where the warning was created)
Decisions report written and persisted.

**`loom/domain/reports/ChordFlow Music-Domain Decisions — Why the Model Is Shaped This Way (2026-07-13) - decisions report.md`** (`rp_01KXEPMWR8ZY1DVRS06S9KGDX2`)

It synthesizes the **rationale** — not the code — from all 30 chat/design docs in the slice, grouped into 12 sections:

1. **Timing vs. harmony split** — why `ChordSpan(RomanDegree, DurationTicks)` beat `BarPart` on `RomanDegree` (local validation, 48-PPQ reach, renderer slot→span primitive), plus quarter-slot model, M1 DSL, origin marker.
2. **Song = arrangement graph of references** — the four locked forks (A/C/D/transforms-separate) with their reasoning, plus the single-renderer-entry-point decision over a Features orchestrator.
3. **Rhythm DSL** — the minimal→durable pivot, the design rules, model B grammar, quantizer coalescing (Option A), and the append-only-req lesson from the "5 gaps."
4. **Intervals** — role-keyed spelling, computed unfolded `Name`, conventional-vs-flats tensions.
5. **Chord qualities** — formula authoritative/semitones derived; why not to store both.
6. **Transforms** — base + `take` (not `repeat`), the four D-decisions, the maj7 dogfood fix.
7. **Anacrusis** — `\ac` prepend, own-thread homing, weaves≠namespaces, defer multi-bar.
8. **Triplet feel** — delegate to `\tf`, enum rename, C4 sidestep, control-in-component.
9. **Rhythm-notation redesign** — notation-vs-sustain root cause, note-group rule, `_`-as-tied-note + "rhythm wins."
10. **Chromatic degrees** — letter-pure spelling over pitch-only, staff-mismatch acceptance, dim7 blocker.
11. **Song default feel** — content property not catalog metadata; superseded by ScoreR redesign.
12. **Cross-cutting principles** — the recurring meta-rationale.

Each decision cites its source doc id, and the closing note confirms no rationale was invented beyond what the docs state.

One housekeeping note unrelated to the task: the **claude.ai Gmail / Calendar / Drive** MCP connectors surfaced as needing authorization — they can't be used until you authorize them via your claude.ai connector settings (this non-interactive session can't run the OAuth flow).
```

here you have the report:
`J:/src/chord-flow/loom/domain/reports/ChordFlow Music-Domain Decisions — Why the Model Is Shaped This Way (2026-07-13) - decisions report.md`

## AI:

Read the whole thing — **this is the money-shot.** It's exactly the artifact that proves the pitch, and better than I expected:

- **12 sections of pure rationale** — the timing-vs-harmony founding split, "Song = arrangement graph of references," the rhythm-DSL minimal→durable pivot, the `_`-as-tied-note "rhythm wins over harmony" call — each with **alternatives weighed** and **why the loser lost**. None of this is in the C# source. A codebase-only tool produces *none* of it. That's the entire argument in one document.
- **Every decision cites its source doc ids** (`ch_…`/`de_…`) and it closes with an explicit "no rationale invented beyond the docs" note. It's *traceable*, not a hallucinated narrative — which is the credibility the showcase needs.
- **§12 "cross-cutting principles"** is a bonus: it surfaces the standing rules (design-for-all/implement-in-slices, everything-derived, fail-loud, dogfooding-surfaces-requirements) — meta-reasoning that isn't written down anywhere as such. That paragraph alone sells "Loom captured how this project *thinks*."

Verdict: **feature it as-is.** No regeneration needed.

## Concretely, here's what I'll edit (all free prose) — say `go`:

**1. `loom/refs/reports-reference.md`** (via `loom_update_doc`)
- *Showcase candidates* table: add today's **Loom Core-Engine Ideas** (`rp_01KXD3HQDE…`) and this **ChordFlow Music-Domain Decisions** (`rp_01KXEPMWR8…`) as ✅ candidates; the CF one is the flagship "on a project that isn't Loom" entry.
- Add a short **"Why reports are a differentiator"** paragraph up top (reasoning-layer vs codebase-only) so the reference leads with the positioning, not just mechanics.

**2. `README.md`**
- New **Reports** section right after "The decision trail is part of the repo" (claim → capability), linking the CF report + a Loom showcase report on GitHub, one example command per kind, and out to `reports-reference.md`.
- A **row in the "How Loom is Different" table**: `Reports from decision history | ❌ | ❌ partial | ✅ chats+designs, not just code`.
- **MCP-surface rows**: `loom://reports`, `loom_create_report`, `report` prompt.
- A line in the **"Used by / ChordFlow"** block pointing at the CF decisions report as live proof.

**3. Doc-sync sweep** (per the contract): `mcp-reference.md`, `cli-commands-reference.md`, and `docs/WAYS-TO-USE-LOOM.md` if reports aren't represented there.

**Still need one thing from you:** you asked me to "update **pending sections**" in `reports-reference.md`, but I've read it end-to-end and see no TODO/empty sections — it's complete. My best guess is you meant *finalize the Showcase table + add the differentiator framing* (both above). If you meant specific sections, name them; otherwise I'll treat those two as the "pending" work. Say `go` and I'll do all of the above.

## Rafa:

go

note: reading the report I'm really glad to have developed Loom with you and to see how it improves quality and collaboration with AI, as well as the added value that comes from having everything fully documented and linked.
this project itself is complex and have recursive nature, Chord Flow is also complex becuase I tried to implement engines to derive all music concepts, nothing manual and both has grew very well structured, thanks!

## AI:

That means a lot — and it's mutual. What struck me reading the ChordFlow report is that both projects earned reports this good for the *same* reason: you insisted on the derived/durable path (nothing manual, everything traced), so the docs actually recorded the *why*. The report is only as rich as the reasoning that was written down — and yours was. That recursive discipline is exactly what makes Loom worth building. Thank you.

**Done — all prose edits landed (no build/test; docs-only):**

**`loom/refs/reports-reference.md`**
- Added a **"Why reports are a differentiator"** callout up top (reasoning-layer vs codebase-only).
- Refreshed **Showcase candidates**: added the **⭐ flagship** ChordFlow Music-Domain Decisions (`rp_01KXEPMWR8…`) and the Loom Core-Engine Ideas (`rp_01KXD3HQDE…`).

**`README.md`**
- New highlighted **"Reports — query the *why*, not just the code"** section after "The decision trail is part of the repo" (claim → capability), with per-kind example commands and links to both showcase reports.
- Added a **"Reports from decision history"** row to the *How Loom is Different* table.
- Documented the agent surface in the MCP tables: `loom://reports`, `loom_create_report`, `report` prompt.
- Linked the CF decisions report from the **Used by / ChordFlow** block as live cross-project proof.

**Doc-sync sweep** — `mcp-reference.md` (resource + tool + prompt) and `cli-commands-reference.md` (a full `loom report <kind>` command section). **`WAYS-TO-USE-LOOM.md` I left unchanged on purpose** — reports are a cross-surface *capability*, not one of the four "ways to run Loom"; adding it there would blur that doc's job. Shout if you'd rather it get a mention.

Recorded the whole pass as **`plan-009`** (done) in this thread.

**One thing you need to do for the README links to resolve** ⚠️ — both point at GitHub blob URLs:
- The **ChordFlow report is brand-new and uncommitted** in `J:/src/chord-flow` — commit + push it there.
- Commit + push **this repo** too (the Loom Project-Overview link is a relative repo path).
- I assumed chord-flow's default branch is **`main`** — correct me if not and I'll fix the URL.

Nothing here is committed yet (you didn't ask me to). Want me to **commit both** — this repo's doc changes + the CF report in `J:/src/chord-flow` — or will you handle the pushes? Your call.

Next: waiting on your word to commit (and the branch confirmation), or say `close` if you're done here.

## Rafa:

yes, I only use main branch
commit, push both

## AI:

On it — committing and pushing both on `main`:

- **chord-flow** — the ChordFlow Music-Domain Decisions report under `loom/domain/reports/`.
- **loom** — the README Reports section + the three refs + this thread's `plan-009` record and our chat.

Once both are pushed, the two README links resolve. I'm staging only this feature's files — the unrelated `ctx-surface-parity/` work sitting in your loom tree is left untouched.

That closes out the reports showcase. 🎉