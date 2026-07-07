---
type: idea
id: id_01KWY5G05RHV3EN90EREP46ZYW
title: Validate cross-plan pl_ blockedBy refs at write time
status: draft
created: 2026-07-07
version: 1
tags: []
parent_id: null
requires_load: []
---
# Validate cross-plan pl_ blockedBy refs at write time

## What

`resolveBlockedByIds` now rejects an unknown *step* slug (the `"s1"` bug — see [[plan-blockedby-id-normalization]]), but a **cross-plan** blocker — an entry naming another plan (`pl_…`, or the legacy `"{slug}-plan-NNN"` form) — is still **passed through unvalidated**. Nothing checks that the referenced plan actually exists at write time. So `blockedBy: ["pl_01DOESNOTEXIST"]` is accepted and persisted verbatim, exactly the silent-dangling-edge shape we just closed for sibling steps — one deliberately-left-open seam.

This thread decides whether (and how) to validate that a cross-plan `pl_…` blocker resolves to a real plan when it is written.

## Why it matters

A `blockedBy` edge is a promise the roadmap and the blocked-steps view rely on: `isStepBlocked` treats a *missing* target plan as **blocked** (best-effort — `packages/core/src/planUtils.ts`). That means a typo'd or stale `pl_…` id doesn't error and doesn't render as broken — it silently pins the step as *permanently blocked* against a plan that will never complete because it doesn't exist. The step quietly drops out of "doable" forever, and nothing tells the author why. That is the same class of harm as the `"s1"` dangling step edge, just one level up (plan-to-plan instead of step-to-step) and arguably worse, because "blocked" *looks* like a legitimate state.

The principle this thread inherits: **no dependency edge is ever lost — or silently falsified — at write time.**

## The hard part (why this is its own thread, not a one-liner)

Two reasons the step-slug fix doesn't just extend to plan ids:

1. **The resolver can't see other plans.** `resolveBlockedByIds(entries, orderedStepIds, selfId?)` is a pure function that knows only *this* plan's step ids. Validating a `pl_…` id requires a plan-existence oracle (the link index / a plan registry), which lives in `fs`/`app`, not in the pure `core` helper. So either the check moves up to the layer that holds the index, or the helper gains an injected `planExists?: (id) => boolean` predicate. That's an architecture decision (keep `core` pure vs. widen the signature).

2. **Unlike a sibling step, a cross-plan target may legitimately not exist yet.** When you author a plan, every sibling step id is known — so an unknown sibling slug can only be a mistake, and a hard throw is correct. But a cross-plan dependency can be authored *before* the plan it points at is created (planning forward across a weave). A hard throw there could block a legitimate authoring order. So the policy question is real: **hard-throw on unknown `pl_…`** (symmetry with steps, forces create-order) **vs. warn-and-store** (surface it in diagnostics/validate, don't block) **vs. keep best-effort** (status quo).

## Sketch (for design to settle)

- Decide the **policy**: throw / warn / status-quo for an unknown `pl_…` at write time — and whether it differs by call path (`create_plan` vs `add_step`/`update_step`).
- Decide the **seam**: inject a `planExists` predicate into `resolveBlockedByIds` (keeps one resolver, widens signature) **vs.** validate in the app use-case / reducer that already holds the link index (keeps `core` pure, adds a second check site). Lean toward whichever preserves the single-normalizer invariant this thread family fought for.
- Reconcile with `isStepBlocked`'s read-time "missing plan ⇒ blocked": if writes are validated, the read-time fallback becomes back-compat only (same shape as the ordinal fallback today).
- Consider surfacing existing dangling `pl_…` refs via `loom://diagnostics` / `loom_validate` regardless of the write-time decision — a detection net for edges already on disk.

## Success criteria

- A `blockedBy` naming a non-existent plan is handled by an explicit, documented policy (not silent pass-through) on every write path.
- A `blockedBy` naming an **existing** plan still succeeds unchanged.
- The single-resolver invariant is preserved or consciously, justifiably broken.
- `isStepBlocked`'s behavior is reconciled with the new write-time contract (no double meaning for "missing plan").

## Open questions for design

- Hard-throw vs. warn vs. best-effort for an unknown `pl_…` — and does forward-referencing a not-yet-created plan need to stay legal?
- Where does plan-existence get checked — injected predicate into the pure resolver, or a validation pass in the layer holding the link index?
- Do we also want a migration/audit that flags cross-plan blockers already dangling in live plans?
