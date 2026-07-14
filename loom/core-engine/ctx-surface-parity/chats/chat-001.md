---
type: chat
id: ch_01KXC7J71R17NNV9JVJ3T3G93D
title: ctx scope, staleness; surface parity
status: done
created: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 20
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

## Rafa:

Coming back to this thread...
I still think Loom no need weave level ctx, it will be more problems than advantages.

The thinks I care, global ctx: deterministic ctx staleness + one-click refresh + extension display + pillar template

First time, if no ctx.md yet, AI inference create ctx.md based on pillar template.
But user can creates his own template before click refresh.
When ctx.md already exists use the sections, template already written.

Auto-fire AI and auto-weave-classification parked/cancelled

what do you think?

## AI:

Agreeing on the big move, then flagging the one thing still genuinely open.

**Kill weave ctx — yes, and it's cleaner than my (C).** My (C) kept weave ctx as "optional & on-demand," but that still keeps `scope: "weave"` alive in the tool, still makes the extension render a weave-ctx node, still needs thread-done staleness wiring and a `--weave` CLI flag. That's a maintenance surface for a feature you keep telling me you don't want. Global-only collapses the original A/B fork to **A-plus**: remove `scope: "weave"` from `loom_refresh_ctx`, one `loom/ctx.md`, and pour the saved effort into making that one doc excellent. Fewer states, less code, and it removes the exact "tool offers weave ctx while practice is global-only" trap the idea was written about. It's also the no-legacy path — we *delete* the weave branch, not deprecate it.

**Pillar template / first-time flow — yes, and there's one clean rule hiding in it.** Your three cases collapse to a single invariant:

> **Refresh always regenerates content under whatever sections already exist in `ctx.md`. The pillar template is only the default skeleton used when `ctx.md` doesn't exist yet.**

So:
- No `ctx.md` → generate from the default pillars (architecture/layers · API · language/tech/deps · CI · docs · AI).
- You hand-author `ctx.md` first (your own sections) → refresh fills/updates *your* headings, never rewrites the structure.
- `ctx.md` exists → its own headings *are* the template; refresh just re-pours content under them.

The nice consequence: "pillar template" isn't a second file to keep in sync — it's a default seed baked into the generate prompt, and the living `ctx.md` is the template from then on. One rule, no template-vs-doc drift.

One sub-choice for you: if you want to *see* the skeleton before the first refresh (edit headings first), `loom install` could seed an empty pillar-headed `ctx.md`. Otherwise first refresh generates it from scratch. I lean **generate-on-first-refresh** (no install-time artifact to maintain; you can still author your own before clicking) — but tell me.

**Auto-fire AI + auto-weave-classification — stay killed.** Agreed, both off-spine. Refresh is a click, never an event firing inference.

**The one genuinely open question: what makes global ctx "stale"?** Weave ctx had a crisp deterministic event (a thread hits done). Global ctx doesn't — it summarizes architecture/rules/API/contracts, which don't map to a single doc-graph event. So the staleness signal needs a defined *source set* to hash. Three candidates:

- **(a) Refs + `CLAUDE.md`** — stale when the architecture/contract docs change. Fits the "extension of CLAUDE.md" framing best; misses "the project grew new threads."
- **(b) The weave/thread skeleton** — stale when threads are added/renamed/reach done. Catches growth; misses a pure refs edit.
- **(c) Both** — hash over refs + `CLAUDE.md` + skeleton. Most complete, most churn (badge lights up more often).

I lean **(a)**: global ctx is the contract/architecture layer, so it should track the contract/architecture docs; skeleton growth is already served by the derived roadmap, not by re-summarizing. But this call sets how noisy the stale badge is, so it's yours.

**If (a) + generate-on-first-refresh, the buildable slice is:**
1. Drop `scope:"weave"` from `loom_refresh_ctx` and delete the weave-ctx path.
2. Generate prompt: default pillars when absent, preserve-existing-sections when present.
3. `source_hash` over refs + `CLAUDE.md` for the stale flag.
4. Extension: show `loom/ctx.md` with a staleness badge + Refresh action.
5. CLI `loom refresh-ctx` mirror (no `--weave` now — unambiguous single command, closes the parity gap).
6. Sweep docs + the reports oversized-ctx suggestion (doc-graph-reports plan-006) to match global-only.

Honest tradeoff I'm not hiding: with weave ctx gone, a big multi-weave project leans entirely on one global doc, which can grow. I still think it's right — the pillar sections keep it bounded, and per-weave summaries were exactly the maintenance burden you're rejecting.

Two things to settle before I'd write a design: **(1)** staleness source — a, b, or c? **(2)** seed-skeleton-on-install vs generate-on-first-refresh?

## Rafa:

### Weave ctx tradeoff

About the tradeoff you mentioned, I think a well structure ctx.md that complement CLAUDE.md and link reference docs when telling when they are needed is best that having duplicated info in 4 possible levels:
1. Claude
2. Global ctx, reference docs linked
3. Weave ctx
4. Thread context
In my opinion this is too much, redundant, hard to mantain, hard to split properly, hard to fit in user mental model.
If a weave have context, that information should not be duplicated in global ctx.

I do not like weave level ctx unless you convince me

### Split information

global ctx should not duplicate info already contained in CLAUDE.md for this itself repo, or CLAUDE-LOCAL.md for user loom repos and they should have clear different purposes:
CLAUDE-LOCAL.md rules contract
loom/ctx.md project architecture, API, etc

### pillars template

I lean generate-on-first-refresh, but with an option to seed-skeleton on click for user check and update
We need to decide a default template, show me your proposal draft

### staleness source

It is hard to know, maybe too much, when global ctx is stale, maybe we should let the user decide when do the refresh
The only real accuracy detection method could be:
When AI finish a plan, check if this modify any of the sections of ctx. If the ctx sections are clear enough this could be clear an easy, but I do not think is worth to implement
Let me know your opinion

## AI:

### Weave ctx tradeoff — you've convinced me, and here's why I won't argue the reverse

I went looking for the strongest case *for* weave ctx so I wasn't just agreeing. The best one is **selective loading at scale**: a 40-weave repo can't fit every subsystem's working detail in one global doc, and weave ctx would let you load only the subsystem you're in. But that argument dies on your own mechanism — the parent chain already loads the thread's real detail (idea/design/plan) on demand, and refs are citation-loaded when a doc's `requires_load` asks. So "load only what you need at scale" is *already solved* by parent-chain + requires_load. Weave ctx would be a third layer whose only job is redundancy. Your 4-levels objection is exactly right, and the fix isn't "trim weave ctx," it's "there shouldn't be a summary layer between global and thread at all." Global-only — settled.

The clean model that falls out, each layer with ONE distinct job and zero summary duplication:
- **CLAUDE.md / CLAUDE-LOCAL.md** — rules & workflow contract (*how to behave*)
- **loom/ctx.md** — architecture / API / stack (*what the project is*), links refs
- **refs/** — deep detail, citation-loaded (only when a doc's `requires_load` asks)
- **thread context** (idea/design/plan) — the working detail, parent-chain-loaded on demand

Weave ctx was the only proposed layer that was a *redundant summary*. Killing it is what makes the model coherent.

### Split information — agree, and it indicts our own ctx.md

Your split (CLAUDE-LOCAL = rules; loom/ctx = architecture/API) is the right principle — and applying it honestly means our *own* `loom/ctx.md` is currently in violation: section 4 is "Rules — how to act in Loom" (stop rules, MCP visibility, chat-surface rule), which just restates CLAUDE.md, and sections 1–2 restate concept/glossary. Under the split, `loom/ctx.md` sheds all of that and becomes purely architecture / API / nomenclature / reference-links. Rules stay in CLAUDE.md; ctx.md stops duplicating them. Both stay always-loaded — but with *disjoint* content. That's a concrete dogfood item: refactor our ctx.md to the template and drop the rules/concept duplication.

(The pillars you named — architecture · API · tech/deps · CI · docs · AI — are all "what the project is." None are rules, so the template structurally can't reintroduce the duplication.)

### Pillars template — draft

Default = generate-on-first-refresh, plus a **seed-skeleton-only** mode on click so you can check/edit headings before spending a generation. Project-agnostic default:

```markdown
---
type: ctx
id: {project}-ctx
title: "{Project} — Project Context"
status: active
load: always
---

# {Project} — Project Context

> Always-loaded architecture & API companion to CLAUDE.md.
> CLAUDE.md holds the rules and workflow contract; this doc holds *what the
> project is* — architecture, API, stack, and where the deep refs live.
> No rule is restated here.

## Architecture
<!-- Layers/packages, dependency rule, module boundaries, one-line mental model. -->
→ Deep: [architecture-reference.md](...)

## API & contracts
<!-- Public surfaces, naming conventions, invariants callers must respect. -->
→ Deep: [api-naming-reference.md](...)

## Stack — language, tech, libraries, dependencies
<!-- Runtime/language, key libraries + why they're here, version constraints. -->

## Build, test & CI
<!-- How to build, how to test, what CI enforces. -->

## Documentation map
<!-- Reference docs and WHEN each should be loaded (citation-loaded). -->
- [x-reference.md](...) — load when {condition}

## AI collaboration
<!-- Project-specific AI working notes not already in CLAUDE.md: entry points, gotchas. -->
```

Each pillar = a one-line HTML comment telling the generator what belongs there, bullets, and a `→ Deep:` link to the citation-loaded ref. The **Documentation map** pillar is what carries your "link refs and say when they're needed." The pillar set is customizable — this is only the default seed; once `ctx.md` exists, its own headings win.

### Staleness — drop automatic detection, you're right

Every automatic signal here is either untrustworthy or inference:
- **Hash** over refs/CLAUDE.md/skeleton → fires on edits that don't change ctx's meaning (noise), OR misses architecture that changed in *code* but not in a hashed doc (false calm). Loom's staleness model is "trustworthy, directional" — a global-ctx badge that cries wolf or lies violates that principle. Better none than untrustworthy.
- Your accurate method (AI checks at plan-finish whether ctx sections are affected) is exactly the **auto-firing inference we already killed** — and you already judged it not worth building. Agreed.

So: **no stale badge for global ctx.** Refresh is *always* available, and we show a plain **"last refreshed: {date}"** — a cheap, honest recency signal you decide on yourself. (If you ever want a non-inference nudge, the one honest deterministic hint is a count — "N threads reached done since last refresh" — but I'd ship with just the date and add the count only if it earns its keep.)

This shrinks the slice again — the hardest, most dubious piece is gone. Revised buildable slice:
1. Drop `scope:"weave"` from `loom_refresh_ctx`; delete the weave-ctx path.
2. Generate: default pillar template when absent, preserve-existing-sections when present, + seed-skeleton-only mode.
3. No auto-staleness; refresh always available; show "last refreshed: {date}".
4. Extension: `loom/ctx.md` node with Refresh + last-refreshed date.
5. CLI `loom refresh-ctx` (`--skeleton` for seed-only).
6. Sweep docs + the reports oversized-ctx suggestion to global-only; refactor our own `loom/ctx.md` to the template (shed the rules/concept duplication).

Your floor: does the template draft match what you pictured — the headings, the CLAUDE.md-split note at the top, the Documentation-map "when to load" pillar? Tweak the pillar set and I'll lock it; then this is ready to promote to an idea/design.

## Rafa:

I like the Pillars template. 
As you mentioned we need to refactor our own ctx.md to the template and drop the rules/concept duplication. This could fold in. By doing it maybe we discover new template sections needed.

Important and the reason this thread raised again MCP <-> CLI <-> Extension parity. For example, we need a CLI loom refresh context to mirror mcp loom_refresh_context 

Spin up a thread + idea for `AI checks at plan-finish whether ctx sections are affected — auto-firing ctx update inference` in case we do this in the future, it is nice to have, not needed feature

update idea + write design

## AI:

Template locked. Done in this turn:

- **Updated the idea** (`idea.md`) — now states the settled decision (global-only / A-plus), the four-level information model, what ships, and the parked items. No longer an open A/B fork.
- **Wrote the design** (`design.md`, draft) — information model · pillar template · the three refresh modes (generate / seed-skeleton-only / preserve-existing-sections) · no-auto-staleness + "last refreshed: {date}" · a tri-surface parity table (MCP `loom_refresh_ctx` global-only ⇄ CLI `loom refresh-ctx` `--skeleton` ⇄ extension ctx node) · the fold-in refactor of our own `loom/ctx.md` · doc sweep · a 6-step build slice.
- **Spun up the parked thread** — `core-engine/ctx-auto-refresh-inference` with an idea capturing "AI checks at plan-finish whether ctx sections are affected." Marked future/nice-to-have, `depends_on` this thread, with the detect-only (no-inference) variant noted as the honest half worth revisiting first.

Two things for you:

1. **Parked thread weave** — I placed it in `core-engine` beside the other ctx threads (ctx-load, ctx-generate, ctx-naming). If you'd rather it live in `ai-integration` (it *is* an auto-inference feature), say so and I'll `loom_move_thread` it.
2. The **fold-in** you flagged — refactoring our own `loom/ctx.md` onto the template — is step 5 of the slice, deliberately *after* the generator exists so we dogfood the real path and let it surface any missing template sections.

The design captures the CLI↔MCP↔extension parity as a first-class table, since that's what reopened the thread. Ready to review the design, or promote it to a plan when you're happy.

Next: your review of `design.md` (and the parked-thread weave call).

## Rafa:

I marked idea, design done
write plan

## AI:

Wrote `plan-001` — *Global-only ctx: pillar template, refresh recency, tri-surface parity*. Six steps, dependency-ordered:

1. **Remove weave scope** — delete `scope:"weave"` from `loom_refresh_ctx` + layers below; clean removal, no shim. *(no blockers)*
2. **Pillar template + refresh modes + `last_refreshed`** — default-when-absent, preserve-existing-sections, `skeletonOnly` mode; date stamp on write. *(after 1)*
3. **CLI `loom refresh-ctx` (+ `--skeleton`)** — the parity mirror. *(after 2)*
4. **Extension ctx node** — Refresh action + "last refreshed: {date}". *(after 2)*
5. **Dogfood** — refactor our own `loom/ctx.md` through the real generator, shed the CLAUDE.md duplication, fold discoveries back into the template. *(after 2)*
6. **Doc + reports sweep** to global-only, incl. the CLAUDE.md ⇄ template sync and the reports oversized-ctx suggestion. *(after 3, 4, 5)*

Steps carry real file hints (`refreshCtx.ts`, `ctxBody.ts`, `buildCtxSource.ts`, tree/extension, the new CLI command). No req is locked on this thread, so steps cite no `satisfies` — say the word if you want a `req.md` first and I'll gate the plan against it.

Two callbacks still open from earlier: the **parked-thread weave** (core-engine vs ai-integration), and whether you want a `req` before starting.

Next: review `plan-001`; when you're happy, `start plan` (or `do step 1`) and I'll implement.

## Rafa:

weave is ok, req not needed
I started the plan
do plan

## AI:

`plan-001` is **done** — all six steps shipped, full `test-all` green, `loom refresh-ctx` verified end-to-end. What landed:

1. **ctx is global-only** — `scope:"weave"` gone from `loom_refresh_ctx` and every layer under it (incl. the context assembler's weave-ctx auto-load branch, which the plan hadn't named — found and removed during step 6).
2. **Pillar template** — `DEFAULT_CTX_PILLARS` + skeleton builder in core; `loom_refresh_ctx` now: seeds the skeleton on a fresh doc, preserves existing headings on an existing one, and has a `skeleton_only` mode. `last_refreshed` stamped on every write.
3. **CLI `loom refresh-ctx --skeleton`** — parity gap closed (moved out of the parity test's exception list into a real twin).
4. **Extension** — the root Context node now shows `refreshed {date}`; removed the dead per-weave/per-thread ctx sections.
5. **Dogfood** — our own `loom/ctx.md` rebuilt on the pillars; the old "Rules" section (CLAUDE.md duplication) and concept/glossary restatement are gone. The six defaults fit with no gaps, so nothing folded back into the template.
6. **Sweep** — refs, CLAUDE.md ⇄ template, and the reports oversized-ctx **weave-ctx nudge removed** (not just reworded — it only existed to suggest weave ctx).

**Two design notes worth your eye:**
- `loom_refresh_ctx` is *assemble-not-generate* — the agent summarises the returned source; there's no server-side inference. So the pillar template ships two ways: the `skeleton_only` seed body, and the `template` section list handed to the agent. The pure-terminal `loom refresh-ctx` (no AI) therefore prints a brief rather than writing prose; `--skeleton` is 100% standalone. This matched the design's intent, so I didn't stop — flagging it because it's the one place the mechanism differs from "a generator constant."
- `last_refreshed` on our ctx.md is now `2026-07-14` (I ran the real command to verify + stamp it), so the extension has a live recency line to show.

The parked thread `core-engine/ctx-auto-refresh-inference` (idea only) is standing by for the future.

Nothing is committed — the tree is dirty with the implementation. Want me to commit it?

Next: waiting on your go to commit (or any review notes).