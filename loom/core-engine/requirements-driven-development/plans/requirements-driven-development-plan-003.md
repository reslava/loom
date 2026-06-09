---
type: plan
id: pl_01KTDYGX7CN9GNSQ8QC7ZW2VZ9
title: RDD Phase 2 follow-up — make the refine family req-aware
status: done
created: "2026-06-06T00:00:00.000Z"
updated: "2026-06-06T00:00:00.000Z"
version: 2
design_version: 1
req_version: 1
tags: []
parent_id: de_01KTBA3MSAGGDWC5G55A49JN4T
requires_load: []
target_version: 0.1.0
steps:
  - id: app-make-req-aware-and-stop
    order: 1
    status: done
    description: "app — make `refinePlan` req-aware and stop stripping `Satisfies`. Switch its `SYSTEM_PROMPT` to the 6-column steps table (`Done | # | Step | Files touched | Blocked by | Satisfies`); instruct it to treat the injected req's ❌ Excluded / ⛓ Constraints as hard boundaries, cover ✅ Included, and emit/preserve `satisfies` ids per step. Re-parse the refined table with `parseStepsTable` so satisfies round-trips into the saved table. No step-count/banned-step policy in the prompt (EX1)."
    files_touched: [packages/app/src/refinePlan.ts, tests/plan-table-utils.test.ts (or new refine test)]
    blocked_by: []
    satisfies: [IN5, IN3]
  - id: app-make-and-framing-aware
    order: 2
    status: done
    description: app — make `refineDesign` and `refineIdea` framing-aware. Have the prompt respect the injected req's Excluded/Constraints on refine (no scope reintroduction); add an `extraContext` param to `refineIdea` (it lacks one today). No schema change, no `satisfies` (design/idea have no step table).
    files_touched: [packages/app/src/refineDesign.ts, packages/app/src/refineIdea.ts, tests]
    blocked_by: []
    satisfies: [IN3]
  - id: mcp-refine-tools-assemble-the-thread
    order: 3
    status: done
    description: "mcp — refine tools assemble the thread context bundle. `loom_refine_plan` / `loom_refine_design` / `loom_refine_idea` resolve the doc's weave+thread from its path, call `handleContextResource('loom://context/thread/{weave}/{thread}')`, and pass it as `extraContext` (prepended to any caller-supplied `context_ids`) — same split generate uses, so the app use-cases stay pure/IO-free (C1)."
    files_touched: [packages/mcp/src/tools/refinePlan.ts, packages/mcp/src/tools/refineDesign.ts, packages/mcp/src/tools/refineIdea.ts]
    blocked_by: []
    satisfies: [IN9, C1, IN3]
  - id: mcp-surface-on
    order: 4
    status: done
    description: mcp — surface `satisfies` on `loom_list_plan_steps`. Add the per-step `satisfies` array to the tool's output projection (it currently returns order/description/files/done/blockedBy but drops citations), so the step-picker can show the contract it enforces.
    files_touched: [packages/mcp/src/tools/listPlanSteps.ts, packages/mcp/tests/integration.test.ts]
    blocked_by: []
    satisfies: [IN5, IN9]
  - id: build-full-test-green-and-smoke
    order: 5
    status: done
    description: "build + full test green, and smoke the regression + the win. Run build-all and test-all. Smoke: (a) refine a plan that already carries `Satisfies` → ids survive (regression closed); (b) refine a plan in a thread with a locked req → it emits `satisfies` and `checkReqCoverage` now reports those Included ids covered; (c) refine a design in a req thread → no Excluded scope reintroduced; (d) `loom_list_plan_steps` returns `satisfies`."
    files_touched: []
    blocked_by: []
    satisfies: [IN5, IN6]
---
# RDD Phase 2 follow-up — make the refine family req-aware

## Goal

Close the refine-path gap left by Phase 2: `refine_plan` / `refine_design` / `refine_idea` all read the bare doc and never assemble thread context, so none see the locked `req`. Worse, `refinePlan`'s prompt emits the legacy 5-column table and silently strips any `Satisfies` citations. Make the refine family use the same `loom://context/thread/...` bundle the generate family already uses (req injected first), and make `refine_plan` preserve and emit `satisfies`. Also surface `satisfies` on the `loom_list_plan_steps` projection so the citation is visible where steps are rendered. This extends the always-load (`IN3`) and planner-citation (`IN5`) guarantees to the refine write-path and the step-picker surface, wired app→mcp per the layering constraint (`C1`, `IN9`). Root-cause fix — refine predates the unified context pipeline.

Hard boundary (`EX1`): do NOT copy generate.ts's step-count / banned-step policy into the refine prompts. Scope boundaries come from the user's `req`, never from generator policy.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | app — make `refinePlan` req-aware and stop stripping `Satisfies`. Switch its `SYSTEM_PROMPT` to the 6-column steps table (`Done \| # \| Step \| Files touched \| Blocked by \| Satisfies`); instruct it to treat the injected req's ❌ Excluded / ⛓ Constraints as hard boundaries, cover ✅ Included, and emit/preserve `satisfies` ids per step. Re-parse the refined table with `parseStepsTable` so satisfies round-trips into the saved table. No step-count/banned-step policy in the prompt (EX1). | packages/app/src/refinePlan.ts, tests/plan-table-utils.test.ts (or new refine test) | — | IN5, IN3 |
| ✅ | 2 | app — make `refineDesign` and `refineIdea` framing-aware. Have the prompt respect the injected req's Excluded/Constraints on refine (no scope reintroduction); add an `extraContext` param to `refineIdea` (it lacks one today). No schema change, no `satisfies` (design/idea have no step table). | packages/app/src/refineDesign.ts, packages/app/src/refineIdea.ts, tests | — | IN3 |
| ✅ | 3 | mcp — refine tools assemble the thread context bundle. `loom_refine_plan` / `loom_refine_design` / `loom_refine_idea` resolve the doc's weave+thread from its path, call `handleContextResource('loom://context/thread/{weave}/{thread}')`, and pass it as `extraContext` (prepended to any caller-supplied `context_ids`) — same split generate uses, so the app use-cases stay pure/IO-free (C1). | packages/mcp/src/tools/refinePlan.ts, packages/mcp/src/tools/refineDesign.ts, packages/mcp/src/tools/refineIdea.ts | — | IN9, C1, IN3 |
| ✅ | 4 | mcp — surface `satisfies` on `loom_list_plan_steps`. Add the per-step `satisfies` array to the tool's output projection (it currently returns order/description/files/done/blockedBy but drops citations), so the step-picker can show the contract it enforces. | packages/mcp/src/tools/listPlanSteps.ts, packages/mcp/tests/integration.test.ts | — | IN5, IN9 |
| ✅ | 5 | build + full test green, and smoke the regression + the win. Run build-all and test-all. Smoke: (a) refine a plan that already carries `Satisfies` → ids survive (regression closed); (b) refine a plan in a thread with a locked req → it emits `satisfies` and `checkReqCoverage` now reports those Included ids covered; (c) refine a design in a req thread → no Excluded scope reintroduced; (d) `loom_list_plan_steps` returns `satisfies`. | — | — | IN5, IN6 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
