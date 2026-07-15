---
type: design
id: de_01KXJQ6CS3D94ST0HGCA3KM1BB
title: Cross-plan blocker validation — warn-and-store via an injected planExists predicate
status: done
created: 2026-07-15
version: 1
idea_version: 1
tags: []
parent_id: id_01KWY5G05RHV3EN90EREP46ZYW
requires_load: []
---
# Cross-plan blocker validation — warn-and-store via an injected planExists predicate

## Decision summary

Settled with Rafa in [chat-001](chats/chat-001.md):

1. **Policy — warn-and-store.** An unknown cross-plan `pl_…` blocker is **never rejected and never silently pinned**. The edge is stored verbatim (as today) *and* surfaced as a diagnostic. This keeps forward-referencing a not-yet-created plan legal while guaranteeing the edge is never silently falsified.
2. **Seam — an injected `planExists` predicate.** Plan-existence resolution enters through `resolveBlockedByIds(entries, orderedStepIds, selfId?, planExists?)`. The single normalizer stays single; `core` stays pure (the predicate is dependency-injected — the caller closes over the link index and hands in a function; no IO in core).
3. **`isStepBlocked` demoted to back-compat.** Its read-time "missing plan ⇒ blocked" rule stops being the primary contract and becomes a back-compat fallback for edges already on disk — same treatment the ordinal fallback got.
4. **Detection net — a step-level `dangling_dep` twin.** Standing detection lives in `loom_validate` / `loom://diagnostics`, mirroring the roadmap's existing `dangling_dep` diagnostic one layer down.

## Why this shape (grounding)

The roadmap layer is the precedent. `derived.ts` already handles a thread whose `depends_on` names a non-existent `th_` by **storing it and emitting a `dangling_dep` diagnostic** — not by throwing. Cross-plan step blockers are the same class of edge one layer down (step→plan vs thread→thread), so the right design makes the step layer **symmetric** with the thread layer that already works. This is why warn-and-store (not hard-throw) is correct here even though the sibling-step fix hard-throws: an unknown *sibling step* is always a mistake; an unknown *plan* may be a legitimate forward reference.

Inherited principle: **no dependency edge is ever lost — or silently falsified — at write time.** Warn-and-store loses nothing (edge stored) and falsifies nothing (edge surfaced), so it satisfies the principle without forbidding forward-authoring.

## Architecture

### The normalizer — `resolveBlockedByIds`

Classification of each `blockedBy` entry, with the optional `planExists` predicate injected:

| Entry kind | `planExists` present? | Behavior |
|------------|----------------------|----------|
| Known sibling **step** slug | — | resolve to step id, store (unchanged) |
| Unknown sibling **step** slug | — | **throw** (unchanged — always a mistake) |
| Cross-plan `pl_…` / legacy `{slug}-plan-NNN`, **resolves** | yes | store (no warning) |
| Cross-plan ref, **does not resolve** | yes | **store + emit warning** (warn-and-store) |
| Cross-plan ref | no (`planExists` omitted) | store verbatim, best-effort (back-compat for pure-core callers) |

Return shape changes from `string[]` to `{ ids: string[]; warnings: BlockedByWarning[] }`. This is the one ripple through callers (`create_plan`, `add_step`, `update_step` app use-cases). Callers that don't surface warnings ignore the field; the write still succeeds.

`BlockedByWarning` carries at least `{ kind: 'dangling_plan_ref', ref: string, stepId: string }` so the tool response can echo an advisory ("heads-up: `pl_…` doesn't resolve yet — stored, will clear when that plan exists").

### Two surfacing moments — advisory vs standing

- **Write-time advisory (transient).** When a write path holds a `planExists` (it has the link index), an unknown `pl_…` returns a non-blocking warning in the tool result. Immediate feedback for the authoring agent; does not block or mutate policy.
- **Standing detection (durable).** The real net is recomputed from persisted state, like the roadmap's `dangling_dep`: `loom_validate` / `loom://diagnostics` walks every plan step's `blockedBy`, and flags any `pl_…` that doesn't resolve to an existing plan as a step-level `dangling_dep` (with `{ weaveSlug, threadSlug, planId, stepId, ref }`). This catches edges written before this change and edges written by pure-core callers without a predicate.

The advisory is convenience; the standing diagnostic is the guarantee. Even if a write path can't produce `planExists`, the standing net still surfaces the edge — so the "no silent falsification" property does **not** depend on every write path having the predicate.

### `planExists` — cheapness check (Rafa's #2)

`planExists` must be derivable from the link index we already build **once per `getState`** — no extra pass. The app use-cases that call the resolver run inside a state load that already has the index; the predicate is a closure over the plan set. Confirm during implementation that the link index (or plan registry) exposes plan-id membership in O(1); if it forces a second index build, revisit — but by construction it should not (the index already maps every doc id).

## Edge cases

- **Forward reference that later resolves.** Authored while the target plan doesn't exist → warned + stored; once the plan is created, the standing diagnostic stops reporting it. No re-write of the blocked plan needed (the edge was always the real ULID).
- **Legacy `{slug}-plan-NNN` form.** Must resolve through the same predicate (normalize to `pl_…` first if the link index keys on ULID), so both blocker forms get identical treatment.
- **Self-reference / cycles across plans.** Out of scope for this thread — the roadmap owns cycle detection at the thread layer; step-level cross-plan cycles are not introduced here. Note but don't build.
- **`update_step` / `add_step` amending a `blockedBy`.** Same resolver, same predicate, same warn-and-store — the policy is uniform across all three write paths (no per-path strictness), per the chat decision.

## Success criteria (from the idea, now concrete)

- [ ] A `blockedBy` naming a non-existent plan is **stored, not rejected**, on every write path, and surfaced as a step-level `dangling_dep` diagnostic.
- [ ] A `blockedBy` naming an **existing** plan succeeds unchanged, no warning.
- [ ] Unknown sibling **step** slug still throws (regression guard).
- [ ] `resolveBlockedByIds` remains the single normalizer; `core` stays pure (predicate injected, no IO).
- [ ] `isStepBlocked`'s "missing plan ⇒ blocked" is demoted to a documented back-compat fallback, no longer the primary contract.
- [ ] The standing net flags cross-plan blockers already dangling in live plans (migration/audit story).

## Open for plan phase (not decisions — sequencing)

- Exact `BlockedByWarning` / step-`dangling_dep` field names and where they join the existing `loom://diagnostics` payload.
- Whether the advisory warning is echoed by all three write tools or just `create_plan` (leaning all three, cheap).
- Test coverage: resolver unit (each classification row), an app-level write-path test (warn returned, edge stored), and a diagnostics test (dangling `pl_…` surfaces).

## Related

- [[plan-blockedby-id-normalization]] — the sibling-step `"s1"` fix this thread extends one layer up.
- Roadmap `dangling_dep` in `packages/core/src/derived.ts` — the thread-layer precedent this mirrors.
- `isStepBlocked` in `packages/core/src/planUtils.ts` — the read-time rule being demoted.