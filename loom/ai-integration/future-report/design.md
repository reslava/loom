---
type: design
id: de_01KXH9ZH380GNK3NV1CCQ2T32D
title: Future-focused report — design
status: done
created: 2026-07-14
version: 1
idea_version: 1
tags: []
parent_id: id_01KXFHF3C99QV8XJDJ8K4CZ1DX
requires_load: []
---
# Future-focused report — design

## Scope (settled in chat-001)

A **forward-looking report** that mines the graph's *open* material and proposes ranked next-work — the reports engine's first prospective kind. v1 is deliberately the cheap, fully-grounded half:

- **v1 ships:** a new `next-work` report kind (Tier-1 deterministic forward signal) + a `forward` flag on the `report` prompt (the experiment) + one `creativity` knob.
- **Deferred to its own thread:** Tier-2 semantic synthesis (cross-thread convergence + design-smell detection). The differentiator, but a costly LLM pass — revisited once v1 earns it.

**Guardrail (from the idea, sharpened):** grounded-observation / free-solution. Every proposal must anchor to recorded doc-graph signal — a parked question, a stalled edge, a blocked step, a stale doc. The `creativity` knob widens the *solution* latitude, never the *problem* set. The report **invents no problems**; at `creative` it may propose a bolder solution to an observed one.

## Where it fits — the existing reports engine

The engine (from `packages/core/reportKinds.ts`, `reportSelection.ts`, `packages/mcp/prompts/report.ts`) already has three selection shapes, dispatched in the `report` prompt's `handle()`:

1. **doc-set kinds** (`ideas`, `decisions`, `drift-audit`, …) — `selectReportDocs(state, kind)` scans `kind.docTypes` with a deterministic budget.
2. **roadmap-passthrough kinds** (`project-overview`, empty `docTypes`) — read `loom://roadmap`.
3. **enriched brief** (`release-notes`) — `buildReleaseNotesBrief(state)`, a bespoke derived builder.

`next-work` is a **fourth shape: a derived forward-signal slice** — closest to (2)/(3): its inputs are *derived* (blocked steps, stale entries, graph-shape gaps, parked-question headings), not a flat doc-type scan. So it gets its own pure builder, `buildForwardSignal(state, filters)`, a sibling of `buildRoadmap` / `buildReleaseNotesBrief`.

**Clean-up this exposes (decision D1 below):** the prompt currently *infers* the shape (`kind.docTypes.length === 0` ⇒ roadmap; `slug === 'release-notes'` ⇒ brief). A fourth shape makes that inference fragile. Proposed: add an explicit `source: 'docset' | 'roadmap' | 'release-notes' | 'forward-signal'` discriminator to `ReportKind` and switch on it — the correct-path fix, retiring the `docTypes.length === 0` heuristic.

## Architecture — the three v1 additions

### A. The `next-work` kind (Tier-1)

Registry entry in `REPORT_KINDS`:

```
'next-work': {
  slug: 'next-work',
  title: 'Next Work',
  docTypes: [],                 // derived, not a doc-type scan
  source: 'forward-signal',     // new discriminator (D1)
  scopeHint: 'cross-weave',
  promptFraming: <forward-synthesis lens — see §Prompt framing>,
}
```

### B. `buildForwardSignal(state, filters)` — the pure Tier-1 builder

A pure `(LoomState, ReportFilters) => ForwardSignal` function in `packages/core`, no IO, unit-testable with a state fixture (mirrors `buildRoadmap`). It composes **existing derivations** — this is the key answer to the idea's open question *"new derived function vs compose existing":* **compose, plus one thin scan.** It emits four grounded signal groups, each row carrying the source doc id(s) + the detector that fired:

| Group | Source (all already in the graph) | Deterministic? |
|-------|-----------------------------------|----------------|
| **Parked decisions** | heading scan of idea/design bodies for `## Open questions` / "deferred" sections | yes — a fixed heading match, like `deterministicExcerpt` |
| **Stalled intent** | graph shape: idea→no design, design→no plan, plan `active` but never `implementing` | yes — from the link index / state |
| **Blocked work** | blocked steps (`getBlockedSteps`) + roadmap `blockedOn` threads | yes — reuses existing derivations |
| **Drift debt** | stale docs (`staleEntries` / `getStaleDocs`) | yes — existing |

All four are pure and free — the LLM never *finds* the signal, it only narrates + ranks it. That keeps v1 cheap and fully grounded.

### C. Two prompt-level knobs on the `report` prompt

Both are prompt-framing modifiers (no selection change), added as `report` prompt args + CLI flags:

- **`forward` (boolean)** — the experiment. When set, wraps *any* kind's `promptFraming` with a forward-reframe: *"From the retrospective slice above, infer what it implies for **next work** — what follow-on decisions/reconciliations/extensions it tees up."* Reuses the kind's existing selection unchanged → near-zero code. Running `decisions --forward`, `drift-audit --forward`, etc. tells us which retrospective slices carry the best forward signal — feedback that informs how rich `next-work`'s own selection should grow.
- **`creativity` (`closed` | `creative`, default `closed`)** — solution latitude. `closed`: propose within the current stack/architecture. `creative`: may propose new approaches/stack/architecture *for an observed problem*. Both always cite the grounding signal. Injected as a clause into the framing.

## Ranking (output is a ranked list)

Ranking inputs are computed **deterministically** in `buildForwardSignal`; the LLM orders the final narrative from them (it doesn't invent the scores):

- **leverage** — fan-out of resolving the item: a blocked step gating N threads, a stalled design N plans would build on, a parked decision N docs wait on. Read from the link index / roadmap deps.
- **readiness** — actionable now (unblocked) vs waiting on a dependency.
- **age** — how long parked (`created`/`updated` drift), the tiebreak.

Composite order: **leverage × readiness, tie-break age** → the list leads with *"highest-leverage, unblocked, longest-parked work."* `creativity` changes solution latitude, **not** the ranking.

## Grounding invariant (the idea's "invents nothing", enforced)

Every proposal row renders its **source doc id(s) + firing detector** — the "why now." The `promptFraming` states: *do not propose an item without a cited signal group; if the graph shows no open material, say so and stop* (the same empty-set discipline `release-notes` already has for "nothing unreleased").

## Prompt framing (sketch)

> Produce a **next-work report** from the forward-signal slice below — the project's open material, grouped as parked decisions, stalled intent, blocked work, and drift debt. Propose a **ranked next-work list**, highest-leverage and unblocked first. For each proposal: **what to do**, the **signal it derives from** (cite the doc id(s) + which group), its **leverage** (what it unblocks), and a concrete **first move**. `{creativity clause}` Do NOT propose work no signal group supports; if the slice is empty, say so and stop.

## Surface parity

- **MCP:** `next-work` auto-appears in `reportKindSlugs()`; `forward` + `creativity` are new `report`-prompt args.
- **CLI:** `loom report next-work [--weave …] [--forward] [--creativity creative]`; `--forward` / `--creativity` must also be wired onto the existing `loom report <kind>` command so the experiment is runnable there (tri-surface parity — the report command already mirrors the prompt).
- **Persistence:** unchanged — synthesis persists via `loom_create_report` as an `rp_` artifact (kind `next-work`), same as every other kind.

## Deferred — Tier 2 (its own thread)

Semantic **convergence** (same concept across ≥2 threads → propose an extraction/abstraction; the Chord Flow fretboard case) and **design-smell hints from prose** (a design whose stated responsibilities sprawl). These need the LLM to *read doc prose to find the signal* — not a pure function — so they're a costlier, less-deterministic pass. Split out to keep v1 cheap and grounded; the `forward`-mode results will help scope it.

## Open questions / decisions to settle

- **D1 — `source` discriminator.** Add explicit `ReportKind.source` and retire the `docTypes.length === 0` inference, or keep special-casing `next-work` in the prompt `handle()`? Lean: add the discriminator (correct-path; the fourth shape makes inference brittle). *Touches every kind's registry entry — the reason to decide it now.*
- **D2 — parked-question scan location.** The `## Open questions` heading scan is a doc-prose read. Keep it a pure heading-match in `buildForwardSignal` (deterministic, Tier-1), or is *any* prose reading already Tier-2? Lean: a fixed heading match is deterministic and stays Tier-1 (it extracts an existing section verbatim, judges nothing).
- **D3 — `creativity` values.** Two levels (`closed`/`creative`) or three (`closed`/`balanced`/`creative`)? Lean: ship two; add `balanced` only if the gap proves too wide.
- **D4 — leverage without a codebase.** Fan-out is computable from the link index + roadmap deps, but "leverage" is partly judgment. Ship the deterministic fan-out as the leverage proxy, let the LLM refine within the cited signal — acceptable?
