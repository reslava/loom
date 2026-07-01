---
type: done
id: pl_01KTDYGX7CN9GNSQ8QC7ZW2VZ9-done
title: Done — RDD Phase 2 follow-up — make the refine family req-aware
status: done
created: "2026-06-06T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KTDYGX7CN9GNSQ8QC7ZW2VZ9
requires_load: []
---
# Done — RDD Phase 2 follow-up — make the refine family req-aware

## Step 1 — app — make `refinePlan` req-aware and stop stripping `Satisfies`. Switch its `SYSTEM_PROMPT` to the 6-column steps table (`Done | # | Step | Files touched | Blocked by | Satisfies`); instruct it to treat the injected req's ❌ Excluded / ⛓ Constraints as hard boundaries, cover ✅ Included, and emit/preserve `satisfies` ids per step. Re-parse the refined table with `parseStepsTable` so satisfies round-trips into the saved table. No step-count/banned-step policy in the prompt (EX1).

`packages/app/src/refinePlan.ts`: switched `SYSTEM_PROMPT` to the 6-column steps table (added `Satisfies`) and added req-boundary instructions (Excluded/Constraints as hard boundaries, cover Included, cite IN/C ids; never cite EX positively; no step-count/banned-step policy per EX1).

Root-cause discovery: `frontmatterSaver` regenerates the plan table from `PlanDoc.steps` (`updateStepsTableInContent`), so the AI's literal table was being **discarded** — refine couldn't touch steps at all, and the original "strips Satisfies" framing was incomplete. Fix re-parses the refined body via `parseStepsTable` and **merges** against the loaded steps: `done` is always preserved from the prior step (refine never changes completion), and `satisfies` falls back to the prior citation when the AI omits it (never silently stripped) but takes the AI's value when provided. A malformed/tableless reply falls back to the existing steps (never wipes the plan).

## Step 2 — app — make `refineDesign` and `refineIdea` framing-aware. Have the prompt respect the injected req's Excluded/Constraints on refine (no scope reintroduction); add an `extraContext` param to `refineIdea` (it lacks one today). No schema change, no `satisfies` (design/idea have no step table).

`packages/app/src/refineDesign.ts` + `refineIdea.ts`: added a req-boundary instruction to both SYSTEM_PROMPTs (respect injected Excluded/Constraints, don't reintroduce excluded scope). `refineIdea` gained an `extraContext?` input + the prepend-as-"Additional Context" plumbing it lacked (refineDesign already had it). No schema change, no `satisfies` (design/idea have no step table).

## Step 3 — mcp — refine tools assemble the thread context bundle. `loom_refine_plan` / `loom_refine_design` / `loom_refine_idea` resolve the doc's weave+thread from its path, call `handleContextResource('loom://context/thread/{weave}/{thread}')`, and pass it as `extraContext` (prepended to any caller-supplied `context_ids`) — same split generate uses, so the app use-cases stay pure/IO-free (C1).

New `packages/mcp/src/tools/refineContext.ts` → `buildRefineExtraContext(root, canonicalId, contextIds)`: assembles the doc's Unified Context bundle via `handleContextResource('loom://context/{id}?mode=refine')` (which injects the locked req before the parent chain) and appends any caller `context_ids`. Used the doc-id context form rather than path-parsing weave/thread — the pipeline resolves the thread itself. All three mcp refine tools (`refinePlan`/`refineDesign`/`refineIdea`) now call it with the canonical id from `resolveDocIdOrThrow`; their old inline context_ids loops were deleted. Context IO stays in mcp; app use-cases remain pure/IO-free (C1).

## Step 4 — mcp — surface `satisfies` on `loom_list_plan_steps`. Add the per-step `satisfies` array to the tool's output projection (it currently returns order/description/files/done/blockedBy but drops citations), so the step-picker can show the contract it enforces.

`packages/mcp/src/tools/listPlanSteps.ts`: added `satisfies: s.satisfies ?? []` to the per-step output projection (was dropped — the picker couldn't show the citation it enforces). Integration test gained an assertion: create a plan citing `IN1`, then `loom_list_plan_steps` returns that step with `satisfies` including `IN1`.

## Step 5 — build + full test green, and smoke the regression + the win. Run build-all and test-all. Smoke: (a) refine a plan that already carries `Satisfies` → ids survive (regression closed); (b) refine a plan in a thread with a locked req → it emits `satisfies` and `checkReqCoverage` now reports those Included ids covered; (c) refine a design in a req thread → no Excluded scope reintroduced; (d) `loom_list_plan_steps` returns `satisfies`.

`build-all` green; `test-all` green (all unit suites + **13/13** MCP integration, incl. the new `satisfies` projection test). New `tests/refine-plan.test.ts` (registered in `test-all.sh`) smokes refinePlan with a stub AIClient + real fs round-trip — 3 cases pass: (a) a 5-col reply preserves prior `Satisfies` and `done` (regression closed, on-disk table carries IN1/IN2); (b) a 6-col reply re-cites a step (IN2→IN3); (c) a tableless reply keeps existing steps (no wipe).

Note on smoke (b)/(c) from the plan: the *live* AI refine path is sampling-only (blocked in CLI), so it's covered deterministically by the stub-client test rather than a live extension run. The earlier in-session Verify already proved `satisfies → checkReqCoverage` end-to-end (thread coverage 9→5 uncovered after plan-003 cited IN3/IN5/IN6/IN9).
