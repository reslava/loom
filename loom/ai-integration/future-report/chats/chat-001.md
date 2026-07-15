---
type: chat
id: ch_01KXGPTRE6WXF3DJZYRFS6DQQ2
title: future-report Chat 001
status: done
created: 2026-07-14
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 11
---
# future-report Chat 001

## Rafa:

read idea
briefly ask me open questions to settle down 

thinking out loud with you:

what to do next? future ideas, improvements, and unfinished threads worth picking up.

### Creativity level

these reports can be closed or creative by user picking the **creativity level**
closed: propose future stuff based on past
creative: suggest whatever improve the project whatever way

for example, **tech creativity level**
closed: use same stack, architecture used to propose anything
creative: prpose new stuff and even new stack or architecture to improve the current one

**differentiator creativity level**
closed: detect possible project fetures that could be improved to be a differentiator
creative: suggest new features that could be the project differentiator

### I like

- backlog-proposer based on forward signal — deferred questions, blocked work, stale docs, unpursued idea branches 

### Design stance 

1. New kind vs analytical mode. I also lean an new kind, but could see if taking current kinds with a *forward mode* in the prompt could give some interesting results
2. Proposal vs invention guardrail. This guard could be picked by user. See above `Creativity level`

### Random thoughts

flying high to extract the useful part...
- detecting possible refactors, reuse of already done ideas. Example, in Chord Flow I detected we used twice a fretboard render UI, so I decided to create a `Fretboard Render Component` used by all
- detecting possible "SOLID" broken laws, and proposing solutions. Example, an thread has been implemented. I put SOLID between "..." becuase I mean without analysing codebase, sometimes SOLID breaks can be detected even ideas, or more deep designs and where AI could detect most for sure  in plans
- proposing new marketing, discovering, CI improvements for the project

stop here to hear your turn...

## AI:

Read the idea. The `creativity level` knob is a genuinely new axis the idea doesn't have — and it collides head-on with the idea's success criterion *"invents nothing; every proposal cites the open material it derives from."* That collision is the design's center of gravity, so most of these questions orbit it. Keeping them brief, with my lean where I have one.

**1. Does "creative" break the citation rule, or just widen the solution?**
This is the call everything else hangs on. Two readings of the knob:
- **Grounded-observation, free-solution** (my lean): *every* creativity level still anchors each proposal to recorded doc-graph signal — a deferred question, a stale doc, a repeated pattern. `closed` proposes a same-stack fix; `creative` may propose a new stack/architecture *for that same observed problem*. The guardrail becomes "invents no **problems**," never "invents no **solutions**."
- **Free-observation, free-solution**: `creative` is allowed to suggest work no doc hints at ("add feature X"), pure model priors.

The first stays true to Loom's whole premise (the graph is the memory; the report reads it). The second turns the report into a generic "ask an LLM for ideas" — which has no moat and no grounding. Which one do you mean by `creative`?

**2. One master knob, or per-facet knobs?**
You gave `tech` creativity and `differentiator` creativity as separate examples. Is creativity **one** level (e.g. `closed | balanced | creative`) applied uniformly, or **independent knobs per facet** (tech / differentiator / process…)? Per-facet is more expressive but multiplies the prompt surface and the user's decisions. My lean: **one master level** to ship, facets as a later refinement if the single knob proves too blunt.

**3. Doc-graph only, or does it read source code?**
Your "random thoughts" split cleanly into two engines:
- **Doc-graph signal** (deferred questions, blocked/stale/unpursued work, marketing/CI ideas from docs) — this is exactly what today's reports engine already reads. In scope, cheap.
- **Codebase-aware analysis** (refactor/reuse detection like your Chord Flow fretboard case, SOLID-break detection) — these require reading `packages/**` *source*, which the reports engine **has never done**. That's a different capability, a different cost, and arguably a different feature.

I'd **scope future-report to the doc graph only** and park code-analysis as its own thread (it's a whole engine, not a mode). Agree, or do you want the SOLID/refactor detection in from day one?

**4. New kind — confirmed?** We both lean a distinct `next-work`/`foresight` kind, with creativity as a *parameter* of it (not a new kind per level, not a forward-mode bolted onto retrospective kinds). Confirming so I don't reopen it in design.

**5. Output: narrate or rank?** Does the report just surface the open material, or cluster + rank it into a proposed next-work list ("highest-leverage unblocked work first")? The ranked list is more useful and more opinionated. Does creativity level change the *ranking* too (closed = priority/dependency order from the roadmap; creative = leverage/impact-scored), or only the *input latitude*?

If I had to compress it to the one decision that defines the feature: **Q1** — is `creative` still doc-grounded, or free invention? Your answer there settles half the rest.

Stopping here for your turn.

## Rafa:

1. Grounded-observation, free-solution
2. One master level
3. Doc-graph only, but as I tried to told you some SOLID breaks or code reusing options can be detected just reading docs ideas, no need to read codebase
4. New kind. But also I would like to introduce `forwad` mode to current kinds and see what happen
5. Ranked list

I was just thinking out loud, the creativity knob is just an idea, the tech or differentiator were just concrete examples
I would like you propose reports of this kind, new approac, new knobs, anything...

Detecting repetitive patterns and ideas parked could raise good future proposals...

Wait for your turn

## AI:

Got your answers. Locking what's settled, then proposing hard — you asked me to.

**Settled:** grounded-observation/free-solution · one master creativity knob · doc-graph only (incl. pattern/smell detection *from doc prose*, no codebase read) · new kind **plus** a `forward` mode experiment on existing kinds · ranked output.

*Vision check:* this serves *"the AI becomes as stateful as it can be — via durable docs it rereads"* and removes the manual step of a human re-reading every idea's Open-questions section to decide what to build next. Clean fit.

---

### The reframe I want to propose: two tiers of forward signal

Your key line — *"detecting repetitive patterns and ideas parked could raise good future proposals"* — actually splits the feature into two fundamentally different engines, and seeing the split is the whole design:

**Tier 1 — deterministic forward signal.** Pure graph functions, no LLM to *find* them:
- **Parked decisions** — "Open questions" / deferred sections awaiting a call
- **Stalled intent** — idea→no design, design→no plan, plan→not started (momentum lost)
- **Blocked work** — blocked steps + dependency-blocked threads (`loom_get_blocked_steps` + roadmap `blockedOn`)
- **Drift debt** — stale docs never reconciled (`staleEntries`)

These *compose existing derivations* — answering the idea's open question, Tier 1 needs **no** new `buildRoadmap`-style function, just a thin composer over ones we have. Cheap. Always grounded. The LLM only *narrates + ranks* them.

**Tier 2 — semantic synthesis.** The LLM reads doc *prose* to find things no pure function can:
- **Convergence / repetition** — the same concept described across ≥2 threads → propose an abstraction (your Chord Flow fretboard: "you've described a fretboard render in 2 threads → extract a shared component")
- **Design-smell hints from prose** — a design/plan whose *stated responsibilities* sprawl → an SRP-ish "this thread looks like it's doing three things" flag, purely from what the doc says it does

Tier 2 is the **differentiator** — no retrospective report does cross-thread synthesis, and it's exactly the "repetitive patterns" you pointed at. But it's semantic (costs tokens, less deterministic) where Tier 1 is free. The **creativity knob lives mostly in Tier 2 + the solution proposals**: `closed` = "extract the repeated thing you already described"; `creative` = "…and here's a different architecture for it" — always anchored to the observed repetition, never inventing the problem.

---

### Ranking (you picked ranked list)
Composite: **leverage × readiness**, tie-break by **age**.
- *leverage* = how much it unblocks (a blocked step gating 3 threads outranks a lone parked question)
- *readiness* = actionable now vs waiting on a dependency
- *age* = how long parked (older = more likely worth a decision)

So the top of the list is literally *"highest-leverage, unblocked, longest-parked work."* Every row carries its **cited doc ids + which detector fired** — that's the "why now," and it's the idea's "invents nothing" invariant made visible. Sketch of one row:

> **Extract a shared fretboard-render component** · *signal: convergence — id_ABC (chord-grid design), id_XYZ (scale-viewer design) both describe a fretboard renderer* · *leverage: touches 2 active threads* · *move: promote a `fretboard-render` thread; refactor both to consume it*

---

### On the two things you were curious about

**The `forward` mode experiment (your #4, second half) — I think it's the cheap first move, not a throwaway.** Add a `forward: true` flag to the existing `report` prompt that reframes *any* kind's prompt: `decisions --forward` → "what follow-on decisions do these tee up?"; `drift-audit --forward` → "what should we reconcile next?". It reuses each kind's existing selection — **near-zero code**. Running it across the retrospective kinds tells us *which existing slices carry the best forward signal*, which then informs what the dedicated `next-work` kind should select. Experiment → learn → build the opinionated kind. Given generation costs you real money, this order matters: **forward-mode + Tier 1 are cheap to build and cheap to run; Tier 2 is the one expensive gen.** I'd ship Tier 1 + forward-mode first, prove the concept, then add Tier 2.

**Knobs — I'd resist multiplying them.** One `creativity` master knob (settled) is enough for v1. If you want a second later, the useful one isn't per-facet (tech/differentiator) but **`focus`** — run all detectors vs zero in on one family (e.g. "just show me convergence"). But that's a refinement; single knob ships.

---

### The one real fork I want you to call (this changes scope + cost)

**Is Tier 2 (semantic convergence/smell detection) in v1, or a fast-follow?**
- **Tier 1 + forward-mode only** → cheap, deterministic, fully grounded, ships fast, low token cost. But it's "organize the backlog you can already enumerate" — less wow.
- **+ Tier 2** → the differentiator (cross-thread pattern proposals), but it's a costly LLM pass over the whole doc corpus and the less-deterministic part.

My lean given your budget: **v1 = Tier 1 + forward-mode experiment** (validate cheaply), **Tier 2 as its own thread** once the concept earns it. But you're the one paying per gen and chasing the differentiator, so this is your call — it's a real architecture + cost fork, not a detail.

Wait for your turn.

## Rafa:

Tier 1 + forward-mode first, defer Tier 2

## AI:

Locked. **v1 scope:**

- **New `next-work` kind** — selection = Tier-1 deterministic forward signal (parked decisions · stalled intent · blocked work · drift debt), composed from existing derivations; LLM narrates + ranks (leverage × readiness, tie-break age); every row cites its source doc ids + firing detector.
- **`forward` flag on the `report` prompt** — reframes existing kinds' prompts to ask "what next?", near-zero code, the cheap experiment that tells us which slices carry forward signal.
- **One `creativity` knob** — grounded-observation / free-solution, single master level.
- **Deferred to its own thread:** Tier 2 (semantic convergence + design-smell synthesis) — the differentiator, revisited once v1 earns it.

That's a clean, cheap, fully-grounded v1 — and the forward-mode experiment feeds back into how good the dedicated kind's selection should be.

**Next move — your call:** the idea doc still frames this as all-open ("New kind vs mode", "which selection slice", Tier-2 questions). Two ways forward:

1. **`refine idea` first** — fold these decisions into the idea (v1 = Tier-1 + forward-mode, Tier-2 deferred) so the idea is truthful before we design. Costs one gen.
2. **Straight to `design`** — leave the idea as the origin-thinking record, capture all the settled decisions in the design doc (which is where architecture belongs anyway). The chat + design carry the truth; the idea stays as the "why".

I lean **2** — the idea's job is *why it matters*, and that's still accurate; the two-tier architecture, the ranking, the knob, the deferral are all *design* concerns and belong in the design doc. Refining the idea would mostly duplicate what the design will say. Saves a gen too.

Which way?

## Rafa:

2

## AI:

Wrote **`design.md`** (draft). It's grounded in the real engine — I read `reportKinds.ts`, `reportSelection.ts`, and the `report` prompt first, so the architecture slots into the seams that already exist rather than inventing a pipeline.

**What it locks in:**
- `next-work` is a **fourth selection shape** — a *derived forward-signal slice*, sibling of `buildRoadmap` / `buildReleaseNotesBrief`. New pure builder `buildForwardSignal(state, filters)`.
- Tier-1 = four grounded, deterministic detectors — **parked decisions · stalled intent · blocked work · drift debt** — each row citing its source doc id + firing detector. Answers the idea's "new function vs compose": **compose existing derivations + one heading scan.**
- **Ranking** inputs (leverage × readiness, tie-break age) computed deterministically; the LLM narrates, doesn't invent scores.
- The **`forward` flag** = a prompt-level reframe of any existing kind (near-zero code); the **`creativity` knob** = solution latitude only.
- Tier-2 explicitly split to its own thread.

**Four decisions I parked in the design's Open-questions rather than deciding for you** — one has real reach:

- **D1 (has reach): a `source` discriminator on `ReportKind`.** The prompt currently *infers* selection shape from `docTypes.length === 0`. A fourth shape makes that brittle, so I lean toward adding an explicit `source: 'docset' | 'roadmap' | 'release-notes' | 'forward-signal'` and retiring the heuristic. That's the correct-path fix but it **touches every kind's registry entry** — so it's your call before we plan. The short path (special-case `next-work` in the prompt) works but leaves the inference debt.
- **D2** — is the `## Open questions` heading scan Tier-1 (deterministic extract) or already Tier-2? I say Tier-1: it lifts an existing section verbatim, judges nothing.
- **D3** — `creativity`: two levels or three? Lean two.
- **D4** — "leverage" without reading code: ship deterministic fan-out (link-index + roadmap deps) as the proxy, LLM refines within cited signal. OK?

D1 is the one that changes surface area, so I'd want your call there before a plan. Read the design and react.

Next: waiting for your take on the design — especially D1.

## Rafa:

Agree with your leans
write plan

## AI:

Wrote **`plan-001.md`** — 7 steps, all four leans (D1–D4) baked in. Sequenced by real dependencies:

1. **`source` discriminator on `ReportKind`** — add the field, tag every existing kind, retire the `docTypes.length === 0` inference (D1). *Foundation — touches the registry.*
2. **`buildForwardSignal` pure builder** — the four Tier-1 groups (parked / stalled / blocked / drift) composing existing derivations + the heading scan, with deterministic leverage×readiness×age inputs. *Independent of 1, can go in parallel.*
3. **Register the `next-work` kind** — empty docTypes, `source: 'forward-signal'`, the ranked-list framing. *(needs 1)*
4. **Report prompt: `switch(kind.source)` + `forward`/`creativity` args** — the fourth selection branch + the two prompt-framing knobs. *(needs 1, 2, 3)*
5. **CLI `--forward` / `--creativity`** — tri-surface parity. *(needs 4)*
6. **Tests** — `forward-signal.test.ts` against a fixture + extend the prompt test + `test-all.sh`. *(needs 2, 4)*
7. **Docs sweep** — mcp-reference, ways-to-use, CLI README. *(needs 4, 5)*

The spine is 1→3→4, with 2 feeding 4; 5/6/7 fan out after the surface is settled. Steps 4 and 6 are the meat.

Plan's in `draft`. When you want to build: `start plan`, then `do step 1` (or `do steps 1-3` to run the core through without stopping). I'd hold off on step 7's exact doc paths until step 4 lands — noted in the step that I'll verify where reports are actually documented.

Next: waiting for `go` — start the plan, or react to the step breakdown first.

## Rafa:

I started plan
do plan

## AI:

**Plan done — all 7 steps shipped, verified end-to-end.** `plan-001` is `done`.

What landed:
- **`source` discriminator** on `ReportKind` (retires the `docTypes.length===0` inference); all 10 kinds tagged.
- **`buildForwardSignal`** (pure core builder) — the four Tier-1 detectors composing existing derivations: parked-decision (verbatim Open-questions lift), stalled-intent (broken idea→design→plan chain), blocked-work (blocked steps + roadmap-blocked threads), drift-debt (actionable stale docs). Deterministic leverage→readiness→age ranking.
- **`next-work` kind** + the **`report` prompt** switching on `kind.source`, with a `forward-signal` branch and an empty-set stop-signal.
- **`forward` / `creativity` knobs** — extracted into a pure, tested `applyProspectiveFraming`; mirrored as CLI `--forward` / `--creativity`.
- **12-block test** (`tests/forward-signal.test.ts`) + docs sweep (reports-reference, cli-commands-reference, mcp-reference, WAYS-TO-USE, cli README).

Verification (beyond the green suite): `loom report next-work` on *this* repo surfaced **20 real open items** (9 parked · 9 stalled · 1 blocked · 1 drift), ranked, each citing its doc id + detector. `--creativity creative` injects its clause; invalid values rejected; `--forward` adds the reframe on retrospective kinds (and is absent without it). Two builds + full suite all clean.

Note: the working tree is **uncommitted** — say the word and I'll commit it. And Tier-2 (semantic convergence + design-smell synthesis) remains parked as its own future thread, as agreed.