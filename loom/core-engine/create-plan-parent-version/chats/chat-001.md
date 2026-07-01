---
type: chat
id: ch_01KWBY8FJCXZ0PTPWZDRXEQV0C
title: create-plan-parent-version Chat
status: done
created: 2026-06-30
updated: 2026-06-30
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 11
---
# create-plan-parent-version Chat

## Rafa:

By dogfooding loom with chord flow I detected I big bug.

`loom_create_plan` does **not** capture the parent design's current version; it stamps `design_version: 1` unconditionally. Since designs are essentially never still at v1 when their plan is written, *every* plan is born "stale," and `loom_get_stale_plans` false-positives project-wide. The staleness *comparison* logic is fine; the *input* (`planDesignVersion`) is wrong at write time. **This is a Loom bug in `create_plan`**, worth a fix in the Loom repo (stamp `design_version` = the parent design's live version when minting the plan).

Also review if other creation tool, like create_design, create_design... tool have same bug

## AI:

Confirmed — and it's wider than `create_plan`. The read side (`isPlanStale`: `plan.design_version < design.version`) is correct; the `design_version` **baseline is mishandled at write time in three plan code paths**.

**1. `create_plan` (`weavePlan.ts`) — over-flags (your bug).** Both the thread path (`design_version: 1`, line 169) and the weave-root path (line 207) stamp a literal `1`. Since designs are past v1 by the time a plan is written, every plan is born stale. Root cause: it stamps a constant instead of reading the parent design's live version — even though *right beside it* the same function reads the live locked req version via `lockedReqVersion()` and stamps `req_version` correctly. The fix is symmetric: a `parentDesignVersion(threadPath)` helper that mirrors `lockedReqVersion` — load the design, return its `.version`. (Note: today the thread path only loads the design when `parentId` is absent; the helper must read it unconditionally to get the version.)

**2. `promote → plan` (`promoteToPlan.ts`) — under-flags (inverse bug).** It never sets `design_version` at all, so promoted plans get `undefined`. `isPlanStale` then evaluates `undefined < version` → `false`, and `validate.ts` guards `!= null`, so a promoted plan is **never** flagged stale even when the design moves on. Same missing-baseline root cause, opposite symptom.

**3. `refine plan` (`refinePlan.ts`) — staleness never clears.** Refine spreads `...doc` and bumps `version` but never re-baselines `design_version`. So even after you refine a plan to catch up to an updated design, it stays "stale" forever — the very operation meant to *clear* staleness doesn't. (Sampling-fallback path, blocked in Claude Code, but a real bug on the API-key path.)

**Other creation tools — clean (your second ask).** I checked:
- `create_idea`: idea is top-of-chain, no versioned parent → no baseline field. Fine.
- `create_design`: design-vs-idea staleness is **date-based** (`getStaleDocs`: "parent updated after this doc"), not a numeric baseline — there is no `idea_version` field anywhere. And it already stamps `req_version` live. Fine.
- `create_req`: no versioned parent. Fine.

So the bug class is specific to **plans** (the only doc type with a numeric `design_version` baseline), but it lives in all three plan paths — create, promote, refine.

**One decision before I scope a fix (it changes the semantics):** what should `design_version` *mean*, and therefore what should refine do?
- **(A) "design version this plan was last reconciled against"** → refine re-stamps `design_version` = current design version (closes the stale→refine→clean loop). Requires widening `refinePlan` to load the parent design (it currently only has the plan's filePath). My lean — it's what makes staleness actually clearable.
- **(B) "design version at authoring, immutable"** → refine leaves it; staleness gets cleared by some other explicit action. Smaller change, but leaves the "refine doesn't clear stale" wart standing.

I lean **(A)**, scoping the fix to all three paths plus a regression test (mint a plan under a vN design, assert `design_version === N`; refine against v(N+1), assert it re-baselines).

STOP — waiting on the (A)/(B) semantics call before I draft an idea/plan.

## Rafa:

Of course, I thought it was already implemented this way.
Write plan

### Fixing bug in other projects

In order to fix the bug consequences in other projects like Chord Flow:
- I could manually update plans design_version fields

I think there is no mcp tool to update that field
Have you any better approach to do the fixes?

## AI:

On fixing existing plans across projects — manual edits are the wrong tool for three reasons: (1) `loom/**/*.md` writes are gated, (2) there's deliberately **no** MCP "set design_version" tool, and adding a free field-setter would re-introduce exactly the hand-drift this fix removes, and (3) it doesn't scale to Chord Flow + future projects.

Better approach: a one-shot **`loom backfill-design-versions`** maintenance command — same shape as the existing `backfill-releases` / `migrate-to-*` scripts. It walks every plan, looks up its parent thread design's *current* version, and re-stamps `design_version`. Run it once here, once in Chord Flow. Repeatable, gated-safe (it's a migration, not a hand edit), consistent.

One honest caveat on its semantics: because the bug overwrote the real authoring baseline with a constant `1`, the true "what design version was this plan written against" is **lost** — we can't reconstruct legitimate staleness that predates the fix. So backfill is a *reset*: it declares every existing plan current as of now (`design_version` = current design version). Any plan that happened to be legitimately stale gets silently marked clean. That's acceptable because the signal is currently 100% noise anyway — but the command gets a `--dry-run` so you can eyeball the diffs (and skip any plan you know is genuinely behind) before it writes.

Plan written — `create-plan-parent-version-plan-001`. It folds the generator fix (create + promote + refine, semantics A) and the backfill command into one thread. Steps:
1. `parentDesignVersion()` helper (mirrors `lockedReqVersion`).
2. Fix `create_plan` — stamp live design version on both paths.
3. Fix `promote → plan` — stamp the baseline it currently omits.
4. Fix `refine plan` — re-baseline `design_version` so refine clears staleness.
5. `backfill-design-versions` use-case + CLI command (`--dry-run`).
6. Regression tests across all four behaviours.

## Rafa:

I already started the plan
Do whole plan

## AI:

Whole plan implemented, built, and tested — `plan-001` is `done` (all 6 steps ✅). Summary:

**Generator fix (write-time baseline now live):**
- `parentDesignVersion()` helper added to `weavePlan.ts` (mirrors `lockedReqVersion`) — single source of truth, reused by all four paths.
- `create_plan`: thread path stamps the design's live version (was constant `1`); the same read also resolves the parent link (removed a duplicate design load). Weave-root path keeps `1` (no thread design to baseline against — never evaluated by `getStalePlans`).
- `promote → plan`: now stamps `design_version` (+`target_version`) instead of omitting it (was the inverse, never-stale bug).
- `refine plan`: re-baselines `design_version` to the current design (semantics A), so refine finally clears staleness. Needed `fs` on `RefinePlanDeps`; the one app caller (`mcp/tools/refinePlan.ts`) updated.

**Backfill:** `loom backfill-design-versions [--dry-run]` (app use-case + CLI command, mirrors the `normalizeDates` migration). Idempotent, dry-run safe.

**Tests:** new `tests/design-version-baseline.test.ts` covers create / stale-detect / refine-clears / promote / backfill(dry-run+real+idempotent). Fixed `refine-plan.test.ts` for the new dep. `build-all` + `test-all` both green.

**One thing for you to decide before I touch data — I did NOT run the real backfill.** The `--dry-run` on this repo reports it would re-baseline **58 plans**. That includes two fingerprints:
- `design_version: 1 → N` — the constant-1 bug (most of them).
- `design_version: — → N` — plans that had *no* baseline at all (e.g. `archive-management/...plan-001`, `core-engine/move-thread-to-entities-plan-001`): that's the **promote bug**, confirmed live in this repo.

Running it for real rewrites 58 loom docs in one commit (and the same command then cleans up Chord Flow). Want me to run `loom backfill-design-versions` here now, or do you want to eyeball the dry-run list first / commit the code fix on its own first?

## Rafa:

Commit

### Stale

in VSCode extension I can read on root tree node: `3 stale...`
but If I run `loom stale` shows 63 stale documents, nostly plans design_version behind
why is this difference, what is really showing the VSCode extension?
showing 3 instead of 63 has been dangerous, letting the bug survive

I tested `loom backfill-design-versions --dry-run` it looks correct, it will fix 58 plans
I think we could ran it and commit, agree?

## AI:

Done — two commits on `main`:
- `3622a34 fix:` the generator fix (create/promote/refine) + backfill command + tests.
- `060f063 chore:` ran `loom backfill-design-versions` — 58 plans re-baselined (plus a few incidental full-ISO→YYYY-MM-DD date canonicalizations from saveDoc's round-trip, the same hygiene `loom migrate` does).

End-to-end check: `loom stale` went **63 → 25**, and **0** are now `design_version`-behind. The false positives are gone.

### Why the extension showed 3 but `loom stale` showed 63

They use **different staleness predicates** — and the gap is entirely a *status filter*:

- **Extension** root badge reads `summary.stalePlans` (`getState.ts:142`), which counts stale plans **excluding `done`/`cancelled`**. Its per-plan tree badge (`treeProvider.ts:842`) does the same (`plan.status !== 'done' && …`). So it only ever shows *actionable* stale plans → **3**.
- **`loom stale`** → `getStaleDocs` → `getStalePlans` (`derived.ts:46`) applies **no status filter at all**, so it also counts stale *done* plans (shipped work that can't be re-implemented), plus date-based parent-updated-after staleness on done docs → **63**.

So neither was "lying" — but they disagreed, and the extension's lower number is the *more* meaningful one (a done plan being behind a later design isn't actionable). The danger you hit is real though: the two surfaces should **agree**, and the noisy CLI number is the one that actually exposed the create_plan bug (via Chord Flow), while the extension's quiet "3" hid it.

### Recommended follow-up (not done — your call)

The clean fix is to make `getStaleDocs`/`getStalePlans` **exclude `done`/`cancelled`** too, matching the extension everywhere. That alone would collapse `loom stale` close to the extension's count and make the two consistent. The remaining 25 are now *all* date-based (parent updated after doc), and most are done docs/designs — i.e. the same done-doc noise, just via the date path rather than design_version.

Want me to spin a small thread for "align stale surfaces (exclude done/cancelled in getStaleDocs)"? It's a ~3-line change in `derived.ts` plus a test, and it's the thing that makes the dashboard trustworthy going forward.

## Rafa:

VSCode extension now shows 1 stale, if I filter by `Stale` shows thread:`core-engine/event-save-scope`
If I run `loom stale` shows 25 stale docs but I can not find anything from `core-engine/event-save-scope`

Could you check this?

### TODO

spin a small thread for "align stale surfaces (exclude done/cancelled in getStaleDocs)"
but loom stale should produce same stale results, filtered same way than extension but with a option param like `all` to show unfiltered results, agree?

## AI:

Checked it — `event-save-scope` exposes that the surfaces use **different staleness models**, not just different filters.

That thread has: idea `draft` (updated 05-25), design `draft` v3 (updated 05-27), plan `done` (design_version 3 = design v3 → *not* design_version-stale), and **no req**. So:
- **Extension flags it** via `threadHasStale` → the "design updated after idea, idea not done" branch (`treeProvider.ts:295`): the idea is "behind" its design. Same signal feeds the root "1 stale" badge (a `staleIdea`).
- **`loom stale` misses it** because `getStaleDocs` only walks `parent_id → child` date drift (a child is stale when its parent moved). The idea is **not** a child of the design (the design's parent is the idea, not vice-versa), so this *reverse-direction* "idea behind design" signal is structurally invisible to it. `getStaleDocs` also ignores **req-staleness** entirely — another axis the extension filter checks via `getReqStaleDocs`.

So there are effectively three staleness implementations that don't agree:
1. `getState` summary — design_version (non-done) + bidirectional idea↔design date.
2. extension Stale filter — req-staleness + design_version (non-done) + bidirectional idea↔design date.
3. `loom stale`/`getStaleDocs` — design_version (NO done filter) + `parent_id`-directed date only; no req, no reverse-direction idea drift.

**Agreed on your `--all` design** — and I'd widen the thread's goal from "exclude done in getStaleDocs" to **"one canonical staleness predicate in `core`, consumed by every surface"**, because the event-save-scope case proves a done-filter alone won't make them agree (different axes + direction). `loom stale` defaults to the actionable/filtered set (matching the extension) and gains `--all` for the unfiltered set.

Spun the thread: **`core-engine/align-stale-surfaces`** with an idea capturing this. It's the real fix; "small" undersells it slightly (it's a unification, ~one core function + rewiring three call sites + a test), but it's the thing that makes the dashboard trustworthy. Idea's in draft for your review — not designing or building it yet.

## Rafa:

I marked `event-save-scope` idea and design `done` now extension shows 0 stale. 
All loom docs in a thread done should be marked done, that was the mistake.

About synchronising `loom stale` and extension, both should call same `app` use case so they get same result, correct?

Refine the idea
Write design

## AI:

Correct on both counts.

**Yes — one shared computation is the whole design.** Staleness is a pure derivation over loaded state, so it belongs in `core` (one predicate), with `app` exposing it and both surfaces as thin consumers. Per the layering rule the extension can't call `app` directly — it reads the computed set off `loom://state` (attached in `getState`, the way `reqCoverage` already is) and **stops recomputing** `threadHasStale` locally. The CLI calls the same `getStaleDocs` use case. Same core function → identical results by construction.

**And your done-marking observation is the symptom behind the noise:** a chunk of what showed as "stale" was just finished docs left in `draft`. Excluding `done`/`cancelled` from the *actionable* set fixes that without relying on manual hygiene — though marking finished docs done stays good practice. I captured it as a footnote, not a system requirement.

Refined the idea (now spells out the shared-computation mechanism + the workflow footnote) and wrote the design — `align-stale-surfaces-design.md`, draft. It lays out:
- **core** — one `staleEntries(weave)` predicate with a typed `reason` union (design_version / req_version / idea↔design both directions) + an `actionable` flag.
- **app** — `getStaleDocs` becomes a thin wrapper; `getState` attaches the set like `reqCoverage`.
- **extension** — delete `threadHasStale` + the `staleIds` recompute; read the attached set (zero local staleness logic).
- **cli** — `loom stale [--all]`.
- plus a parity test.

I flagged **three open decisions** in the design for you (A: one predicate + `actionable` flag vs two funcs — I recommend one; B: attach-to-state vs a dedicated `loom://stale` resource — I recommend attach-to-state; C: surface both date directions — recommend yes). Design is draft, nothing built. Want to settle A/B/C, or promote straight to a plan?