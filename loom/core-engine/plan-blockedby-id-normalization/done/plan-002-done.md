---
type: done
id: pl_01KWY3JHVVDT992JEPN4JT39T6-done
title: Done — Validate blockedBy slugs + make sibling refs discoverable
status: done
created: 2026-07-07
version: 1
tags: []
parent_id: pl_01KWY3JHVVDT992JEPN4JT39T6
requires_load: []
---
# Done — Validate blockedBy slugs + make sibling refs discoverable

## Step 1 — In resolveBlockedByIds (packages/core/src/planUtils.ts): after ordinal resolution, validate every remaining entry — any non-numeric, non-pl_ entry that is NOT in orderedStepIds throws. The Error message names the offending value, lists the valid step ids, and states the 1-based ordinal form (e.g. use "1" for the first step). pl_ entries still pass through (cross-plan, best-effort). Result stays deduped; self-reference still rejected. Add unit tests: unknown slug ('s1') throws; known slug passes; pl_ passes; ordinal still resolves; error message contains the valid-id list + ordinal hint.

Added pass-through validation to `resolveBlockedByIds` (`packages/core/src/planUtils.ts`). After ordinal resolution, a non-numeric entry is now classified: a plan id (`pl_…` or legacy `"{slug}-plan-NNN"`, via the new `isPlanIdRef` helper) passes through best-effort; an entry matching a known id in `orderedStepIds` passes through; **anything else throws**. The throw names the offending value, lists the valid step ids, and points at the 1-based ordinal form — turning the silent dangling `"s1"` edge into a loud, teaching error. Updated the JSDoc contract accordingly.

Unit tests (`tests/resolve-blockedby-ids.test.ts`): the former `['-1'] → passes through` assertion (itself an instance of the bug) now asserts a throw; added `'s1'` throws with a message containing the valid-id list and the ordinal hint; added a legacy `demo-plan-001` plan-id pass-through case.

## Step 2 — Verify buildStructuredSteps (create), the ADD_STEP / UPDATE_STEP reducers, and promote all reach the validated resolver and surface the throw as a clean tool error with no partial write. Add integration tests: create_plan with blockedBy ['s1'] throws (today it silently stores); add_step / update_step with an unknown slug throws; a valid ordinal and a valid slug and a pl_ id all still succeed.

Verified every write path reaches the validated resolver with the **full** ordered step-id list, so valid sibling slugs never wrongly throw:
- create — `buildStructuredSteps` (`packages/app/src/weavePlan.ts`) two-pass: assigns all ids, then resolves against `orderedStepIds` (all steps).
- `UPDATE_STEP` reducer — `orderedIds = doc.steps.map(...)` (full list).
- `ADD_STEP` reducer — `orderedIds = next.map(...)` (full list incl. the new step).
- `REMOVE_STEP` — strips references to the removed id from survivors (already-resolved slugs), no re-resolution needed.

No code change required here — the wiring was already correct. Added integration coverage (`tests/blockedby-normalization.test.ts`): create with `['s1']` throws `unknown step id "s1"`; `UPDATE_STEP` and `ADD_STEP` with an unknown slug throw identically; existing ordinal/slug/`pl_`/reorder cases still pass.

## Step 3 — Update the blockedBy field descriptions in the create_plan, add_step, and update_step MCP tool schemas (packages/mcp) to state the accepted forms explicitly: a 1-based ordinal ('1','2') referencing sibling step position, an existing step-id slug, or a cross-plan 'pl_…' id — and never an invented 's1'-style id. This is the discoverability half so agents use the forms that already work.

Tightened the `blockedBy` field descriptions in the three step-authoring MCP schemas so agents stop inventing `"s1"`-style ids (the discoverability half — 1-based ordinal resolution already works at create):
- `packages/mcp/src/tools/createPlan.ts` — states the accepted forms and notes that in the create call generated slugs aren't known yet, so reference siblings by ordinal (`"1"` = first step).
- `packages/mcp/src/tools/addStep.ts` and `updateStep.ts` — slug / ordinal / `pl_…`, and an explicit "unknown value is rejected, not silently stored."

## Step 4 — Run ./scripts/build-all.sh then ./scripts/test-all.sh; fix any fallout. Append the implementation record to the thread's done doc.

Ran `./scripts/build-all.sh` (all packages green) then `./scripts/test-all.sh` — full suite passed, no fallout from the stricter resolver. Confirmed the two touched test files individually: `resolve-blockedby-ids.test.ts` and `blockedby-normalization.test.ts` both green with the new throw cases.
