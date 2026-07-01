---
type: plan
id: pl_01KTBD34X8RKH6F2K80GD10XJ2
title: RDD Phase 2 — requirement citation, coverage check, and req-staleness
status: done
created: 2026-06-05
updated: 2026-06-06
version: 3
design_version: 2
tags: []
parent_id: de_01KTBA3MSAGGDWC5G55A49JN4T
requires_load: []
target_version: 0.1.0
actual_release: 1.0.0
steps:
  - id: core-add-satisfies-to-planstep-and
    order: 1
    status: done
    description: core — add satisfies to PlanStep and round-trip a Satisfies column (design §5.1). Extend PlanStep with a satisfies string array (Included/Constraint ids a step advances); teach parseStepsTable / generateStepsTable / updateStepsTableInContent to read and write a Satisfies column, comma-separated like Files touched, defaulting to empty when the column is absent so existing plans still parse — this is the table round-trip of the §5.1 PlanStep field.
    files_touched: [packages/core/src/entities/plan.ts, packages/core/src/planTableUtils.ts, tests/plan-table-utils.test.ts]
    blocked_by: []
    satisfies: [IN5, C1]
  - id: core-pure-requirement-coverage-reducer-design
    order: 2
    status: done
    description: core — pure requirement-coverage reducer (design §5.2). Add checkReqCoverage(parsedReq, steps) returning Included items with no covering step and steps that cite an Excluded id; reuse parseReq; no IO; checks scope traceability through the doc graph, not functional correctness; export from index. Unit tests for covered, uncovered, and excluded-violation cases.
    files_touched: [packages/core/src/reqCoverage.ts, packages/core/src/index.ts, tests/req-coverage.test.ts]
    blocked_by: []
    satisfies: [IN6, C2]
  - id: core-and-app-req-version-staleness
    order: 3
    status: done
    description: core and app — req_version staleness propagation (design §5.4). Add a req_version field recording the locked req version a downstream idea/design/plan was built against (parallel to plan design_version); add an isReqStale derived check; mark downstream stale when the thread's locked req version is newer; surface the flag in assembleContext exactly like plan design-staleness, and in the vscode tree badge.
    files_touched: [packages/core/src/entities (idea/design/plan), packages/core/src/derived.ts, packages/core/src/frontmatterUtils.ts, packages/app/src/context/assembleContext.ts, packages/vscode/src/tree/treeProvider.ts, tests]
    blocked_by: []
    satisfies: [IN8, C5]
  - id: app-and-mcp-surface-coverage-diagnostics
    order: 4
    status: done
    description: "app and mcp — surface coverage diagnostics (design §5.2, surfacing). Run checkReqCoverage for each thread that has a locked req plus plans inside getState, fold the counts into LoomState.summary and the loom://diagnostics resource alongside stale/blocked-step, and mention coverage gaps in the validate-state and continue-thread prompts."
    files_touched: [packages/app/src/getState.ts, packages/mcp/src/resources/diagnostics.ts, packages/mcp/src/prompts/validateState.ts, packages/mcp/tests/integration.test.ts]
    blocked_by: []
    satisfies: [IN6, IN9]
  - id: mcp-planner-cites-requirements-as-it
    order: 5
    status: done
    description: mcp — planner cites requirements as it generates (design §5.1, prevention). Teach loom_generate_plan and the weave-plan prompt to read the thread's locked req, hand Excluded and Constraints in as hard boundaries (never cited positively), and emit satisfies ids per step; keep loom_create_plan accepting steps that carry satisfies. Prevention collapses most verification into the cheap structural check.
    files_touched: [packages/mcp/src/tools/generate.ts, packages/mcp/src/prompts/weavePlan.ts, packages/app/src/weavePlan.ts]
    blocked_by: []
    satisfies: [IN5, IN9]
  - id: semantic-backstop-design-5
    order: 6
    status: done
    description: "semantic backstop (design §5.3). Add a loom_verify_req sampling tool (extension path) with a CLI agent fallback — same logic, two delivery paths, exactly like generate: given the locked req and a plan, flag steps that implement an Excluded item or restate an Included item with no covering citation, phrased differently; surface it as an extension diagnostic command."
    files_touched: [packages/mcp/src/tools/verifyReq.ts, packages/mcp/src/server.ts, packages/vscode/src/commands/req.ts, packages/vscode/package.json]
    blocked_by: []
    satisfies: [IN7, C4, IN9]
  - id: build-and-full-test-green-and
    order: 7
    status: done
    description: "build and full test green and smoke. Run build-all and test-all. Smoke: a plan step citing an Excluded id is flagged by checkReqCoverage; an Included id with no covering step is flagged uncovered; re-locking a req to version+1 marks a downstream design stale; the planner emits satisfies for a thread with a locked req."
    files_touched: []
    blocked_by: []
    satisfies: [IN5, IN6, IN8]
---
# RDD Phase 2 — requirement citation, coverage check, and req-staleness

## Goal

Make the locked `req` *verifiable*, not just injected. Plan steps cite the requirements they advance (`satisfies`); a pure deterministic reducer checks scope coverage through the doc graph; the planner cites as it generates (prevention); an AI pass backstops the semantic gap; and re-locking a req marks downstream stale. This is the additive half the Phase 1 IDs were designed for — see `requirements-driven-development-design.md` §5. Layered core → mcp → vscode per the dependency rule.

Open sub-decision (defaulted, redirect before step 1 if wrong): `satisfies` is stored as a comma-separated **Satisfies table column** on plan steps (round-tripped like `Files touched`), not a frontmatter array — consistent with the current table-as-source-of-truth reality, and the round-trip surface for the `satisfies: string[]` field §5.1 adds to `PlanStep`. Absent column parses as empty, so existing plans are untouched.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | core — add satisfies to PlanStep and round-trip a Satisfies column (design §5.1). Extend PlanStep with a satisfies string array (Included/Constraint ids a step advances); teach parseStepsTable / generateStepsTable / updateStepsTableInContent to read and write a Satisfies column, comma-separated like Files touched, defaulting to empty when the column is absent so existing plans still parse — this is the table round-trip of the §5.1 PlanStep field. | packages/core/src/entities/plan.ts, packages/core/src/planTableUtils.ts, tests/plan-table-utils.test.ts | — | IN5, C1 |
| ✅ | 2 | core — pure requirement-coverage reducer (design §5.2). Add checkReqCoverage(parsedReq, steps) returning Included items with no covering step and steps that cite an Excluded id; reuse parseReq; no IO; checks scope traceability through the doc graph, not functional correctness; export from index. Unit tests for covered, uncovered, and excluded-violation cases. | packages/core/src/reqCoverage.ts, packages/core/src/index.ts, tests/req-coverage.test.ts | — | IN6, C2 |
| ✅ | 3 | core and app — req_version staleness propagation (design §5.4). Add a req_version field recording the locked req version a downstream idea/design/plan was built against (parallel to plan design_version); add an isReqStale derived check; mark downstream stale when the thread's locked req version is newer; surface the flag in assembleContext exactly like plan design-staleness, and in the vscode tree badge. | packages/core/src/entities (idea/design/plan), packages/core/src/derived.ts, packages/core/src/frontmatterUtils.ts, packages/app/src/context/assembleContext.ts, packages/vscode/src/tree/treeProvider.ts, tests | — | IN8, C5 |
| ✅ | 4 | app and mcp — surface coverage diagnostics (design §5.2, surfacing). Run checkReqCoverage for each thread that has a locked req plus plans inside getState, fold the counts into LoomState.summary and the loom://diagnostics resource alongside stale/blocked-step, and mention coverage gaps in the validate-state and continue-thread prompts. | packages/app/src/getState.ts, packages/mcp/src/resources/diagnostics.ts, packages/mcp/src/prompts/validateState.ts, packages/mcp/tests/integration.test.ts | — | IN6, IN9 |
| ✅ | 5 | mcp — planner cites requirements as it generates (design §5.1, prevention). Teach loom_generate_plan and the weave-plan prompt to read the thread's locked req, hand Excluded and Constraints in as hard boundaries (never cited positively), and emit satisfies ids per step; keep loom_create_plan accepting steps that carry satisfies. Prevention collapses most verification into the cheap structural check. | packages/mcp/src/tools/generate.ts, packages/mcp/src/prompts/weavePlan.ts, packages/app/src/weavePlan.ts | — | IN5, IN9 |
| ✅ | 6 | semantic backstop (design §5.3). Add a loom_verify_req sampling tool (extension path) with a CLI agent fallback — same logic, two delivery paths, exactly like generate: given the locked req and a plan, flag steps that implement an Excluded item or restate an Included item with no covering citation, phrased differently; surface it as an extension diagnostic command. | packages/mcp/src/tools/verifyReq.ts, packages/mcp/src/server.ts, packages/vscode/src/commands/req.ts, packages/vscode/package.json | — | IN7, C4, IN9 |
| ✅ | 7 | build and full test green and smoke. Run build-all and test-all. Smoke: a plan step citing an Excluded id is flagged by checkReqCoverage; an Included id with no covering step is flagged uncovered; re-locking a req to version+1 marks a downstream design stale; the planner emits satisfies for a thread with a locked req. | — | — | IN5, IN6, IN8 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |