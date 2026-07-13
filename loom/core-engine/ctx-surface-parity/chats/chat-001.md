---
type: chat
id: ch_01KXC7J71R17NNV9JVJ3T3G93D
title: ctx scope, staleness; surface parity
status: active
created: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 1
---
# ctx scope, staleness; surface parity

## Rafa:

## AI:

**Carried over from `doc-graph-reports/chat-004`** — where this surfaced while wiring the reports oversized-ctx suggestion. The idea (`id_01KXC5B8CF…`) frames the original A/B fork; this recaps the deeper design conversation so we can continue it here. Unload freely.

## Rafa's ideas (the thinking)

- **Global vs weave ctx — distinct purposes:**
  - *Global ctx* = the main architecture, rules, API contracts, nomenclatures, doc links — an **extension of the hard `CLAUDE.md` contract**, always loaded at session start. Updated when a main point appears or changes.
  - *Weave ctx* = the main points of the "main" threads inside a weave. Loaded when starting work in a thread of that weave. Updated after every thread finishes.
  - Caveats Rafa named: weave-ctx usefulness depends on how well threads are grouped; weave ctx always misses cross-weave relationships.
- **Auto-refresh events** — an event that fires global ctx refresh, another that fires weave ctx refresh, so ctx is never stale. **Goal: global + weave ctx auto-updated.**
- **Pillars** — predefined + customizable project pillars, project-agnostic: architecture/layers · API · language/tech/libs/deps · CI · documentation · AI.
- **Predefined / auto weaves** — ship predefined weaves; even have Loom analyse + classify threads into weaves via AI, then generate global/weave ctx automatically.

## My synthesis

1. **The crux is staleness.** Weave ctx was only ever abandoned over the maintenance/staleness burden. So A-vs-B reduces to: *can ctx stay fresh cheaply?* If yes → weave ctx viable.
2. **Auto-firing AI refresh is against Loom's spine.** "An event fires a ctx refresh" = an event fires **inference**, which breaks the core rule **"AI never acts unprompted"** and spends tokens on a cadence the user didn't choose. **Salvage the good half:** auto-**detect** staleness (deterministic, free — `loom_refresh_ctx` already returns `stale` via `source_hash`) and keep the **refresh** a one-click user action. Global ctx → stale when source changes; weave ctx → stale when a thread in it reaches **done** (your concrete event). Result: "you always know it's stale + cheap to fix" — 90% of "never stale", no silent AI, no surprise cost.
3. **Pillars template — yes.** A predefined-but-customizable section schema is just a better *generate* prompt; consistent, comparable ctx. Low risk. Take it.
4. **AI auto-classifying threads into weaves — park it.** Optional weave *scaffolding* at `loom install` is fine; but Loom re-grouping the user's threads via AI is invasive (moves threads), inference-heavy, unclear payoff, and off-vision ("durable shared context", not "reorganise my repo").

## Proposed resolution — (C), A/B was a false binary

- **Global ctx** — always-loaded (the "extension of CLAUDE.md" framing), staleness-flagged, one-click refresh. Home for cross-weave/architecture (weave ctx can't see cross-weave links).
- **Weave ctx** — *optional & on-demand* (not auto-maintained), but when one exists it's **surfaced in the extension**, staleness-flagged (on thread-done), one-click refreshable, with the CLI mirror. On-demand means you only make one where the thread grouping already earns it.
- Both from the **pillar template**. **No** auto-firing AI, **no** auto-weave-classification.

This gives weave ctx everything option B wanted (visible, trustworthy, tri-surface parity) with option A's low burden.

**Cheap valuable slice** (if we build anything): deterministic ctx staleness + one-click refresh + extension display + pillar template. Auto-fire AI and auto-weave-classification stay parked. **Meta-caution:** this is a big internal-quality area at a moment when external validation is the scarce thing — worth keeping the slice small.

Open question to settle: adopt **(C)**, or do you still want to push on the auto-update / auto-weave ideas? Your floor now — unload.