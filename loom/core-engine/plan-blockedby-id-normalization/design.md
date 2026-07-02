---
type: design
id: de_01KWGTDV2BKCYGE8THQYVBPXT3
title: loom_create_plan should normalize blockedBy ordinals to step-id slugs
status: done
created: 2026-07-02
version: 1
idea_version: 1
tags: []
parent_id: id_01KVA8QBDJHGNRZQFNJ87PAYZ3
requires_load: []
---
# loom_create_plan should normalize blockedBy ordinals to step-id slugs

## Problem

`loom_create_plan` persists step `blockedBy` entries **verbatim**. When they arrive as 1-based ordinals (`["1","2"]`) they are stored as ordinals, not resolved to the target steps' stable id slugs — so a plan born in one `create` call has a fragile dependency graph that silently mis-points the moment a step is inserted, removed, or reordered. The same graph authored via `loom_update_step` ends up slug-based. That inconsistency is a latent correctness bug.

## Root cause (grounded in the code)

- **Create stores raw.** `buildStructuredSteps` (`packages/app/src/weavePlan.ts`) assigns each step `id: slugifyStepId(title||description, taken)` but sets `blockedBy: s.blockedBy ?? []` with **no normalization**. Ordinals survive verbatim into frontmatter.
- **Read tolerates ordinals.** `isStepBlocked` (`packages/core/src/planUtils.ts`) parses a `"Step N"` / `"N"` blocker as a *legacy fallback* (`parseInt`), so stored ordinals appear to "work" at read time — which is exactly what masks the bug until a reorder shifts positions.
- **No shared write-time resolver exists.** The `UPDATE_STEP` / `ADD_STEP` reducers (`packages/core/src/events/planEvents.ts`) carry `blockedBy` through as-is; they "keep slugs correctly" only because callers usually pass slugs, not because anything normalizes ordinals. So there is no single normalization codepath today — create and update simply both pass through.

## Decisions

1. **Normalize at write time; persist slugs.** Ordinals stay accepted on input (legacy-friendly) but are stored as step-id slugs, so frontmatter is always reorder-safe.
2. **One shared pure helper in `core`.** Add `resolveBlockedByIds(entries: string[], orderedStepIds: string[]): string[]`:
   - A numeric entry (`"1"`) or `"Step N"` form → `orderedStepIds[N-1]`.
   - A non-numeric entry that is already a known step-id slug **or** a plan id (`pl_…`, cross-plan blocker) → **passed through** unchanged.
   - An out-of-range numeric entry (no step at that 1-based position) → **throw** at write time. *Decision: error, not silent pass-through — it can only be a mistake* (matches the idea's lean).
   - Result deduped; a step resolving to its own id is rejected (self-block).
3. **All write paths converge on that helper — no second codepath.** Call it from:
   - `buildStructuredSteps` in `weavePlan.ts` (two-pass: assign all step ids by order first, then resolve each step's `blockedBy` against that ordered id list).
   - the `ADD_STEP` and `UPDATE_STEP` reducers, which already hold the full ordered step list, so a numeric `blockedBy` supplied to update/add is normalized identically.
4. **Leave `isStepBlocked`'s read-time ordinal fallback in place.** It stays as back-compat for plans already on disk with legacy stored ordinals; once writes are always slugs it simply stops being exercised by new plans. (Removing it is a separate cleanup, not this thread.)

## Scope

**In:** the `resolveBlockedByIds` core helper + tests; wiring it into create (`buildStructuredSteps`) and the add/update-step reducers; the out-of-range error.

**Out (note for later):** a one-off migration that rewrites *already-stored* ordinal `blockedBy` in existing plans to slugs. Not needed for correctness going forward (new writes are clean), and the one plan that hit this — `roadmap-release-version-plan-001` — was already hand-fixed. Revisit only if audit finds stale ordinals in live plans.

## Testing

- `loom_create_plan` with `blockedBy: ["1","2"]` → persists the corresponding step-id slugs.
- Round-trip (create → `loom_list_plan_steps`) shows slug ids in `blockedBy`.
- Reordering a freshly-created plan's steps keeps the edges pointing at the same logical steps.
- Out-of-range ordinal at create/add/update → errors.
- A `pl_…` plan-id and an already-slug entry pass through untouched.
- `add_step` / `update_step` with a numeric `blockedBy` normalize identically (single-helper parity).
