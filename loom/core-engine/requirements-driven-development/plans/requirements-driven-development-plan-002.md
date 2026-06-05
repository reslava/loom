---
type: plan
id: pl_01KTBD34X8RKH6F2K80GD10XJ2
title: RDD Phase 2 — requirement citation, coverage check, and req-staleness
status: done
created: "2026-06-05T00:00:00.000Z"
updated: 2026-06-05
version: 1
design_version: 1
tags: []
parent_id: de_01KTBA3MSAGGDWC5G55A49JN4T
requires_load: []
target_version: 0.1.0
---
# RDD Phase 2 — requirement citation, coverage check, and req-staleness

## Goal

Make the locked `req` *verifiable*, not just injected. Plan steps cite the requirements they advance (`satisfies`); a pure deterministic reducer checks scope coverage through the doc graph; the planner cites as it generates (prevention); an AI pass backstops the semantic gap; and re-locking a req marks downstream stale. This is the additive half the Phase 1 IDs were designed for — see `requirements-driven-development-design.md` §5. Layered core to mcp to vscode per the dependency rule.

Open sub-decision (defaulted, redirect before step 1 if wrong): `satisfies` is stored as a comma-separated **Satisfies table column** on plan steps (round-tripped like `Files touched`), not a frontmatter array — consistent with the current table-as-source-of-truth reality. Absent column parses as empty, so existing plans are untouched.

---

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | core — add satisfies to PlanStep and round-trip a Satisfies column. Extend PlanStep with a satisfies string array (req ids a step advances); teach parseStepsTable / generateStepsTable / updateStepsTableInContent to read and write a Satisfies column, comma-separated like Files touched, defaulting to empty when the column is absent so existing plans still parse. | packages/core/src/entities/plan.ts, packages/core/src/planTableUtils.ts, tests/plan-table-utils.test.ts | — |
| ✅ | 2 | core — pure requirement-coverage reducer. Add checkReqCoverage(parsedReq, steps) returning Included items with no covering step and steps that cite an Excluded id; reuse parseReq; no IO; export from index. Unit tests for covered, uncovered, and excluded-violation cases. | packages/core/src/reqCoverage.ts, packages/core/src/index.ts, tests/req-coverage.test.ts | — |
| ✅ | 3 | core and app — req_version staleness propagation. Add a req_version field recording the locked req version a downstream idea/design/plan was built against; add an isReqStale derived check; mark downstream stale when the thread's locked req version is newer; surface the flag in assembleContext exactly like plan design-staleness, and in the vscode tree badge. | packages/core/src/entities (idea/design/plan), packages/core/src/derived.ts, packages/core/src/frontmatterUtils.ts, packages/app/src/context/assembleContext.ts, packages/vscode/src/tree/treeProvider.ts, tests | — |
| ✅ | 4 | app and mcp — surface coverage diagnostics. Run checkReqCoverage for each thread that has a locked req plus plans inside getState, fold the counts into LoomState.summary and the loom://diagnostics resource, and mention coverage gaps in the validate-state and continue-thread prompts. | packages/app/src/getState.ts, packages/mcp/src/resources/diagnostics.ts, packages/mcp/src/prompts/validateState.ts, packages/mcp/tests/integration.test.ts | — |
| ✅ | 5 | mcp — planner cites requirements as it generates. Teach loom_generate_plan and the weave-plan prompt to read the thread's locked req, hand Excluded and Constraints in as hard boundaries, and emit satisfies ids per step; keep loom_create_plan accepting steps that carry satisfies. | packages/mcp/src/tools/generate.ts, packages/mcp/src/prompts/weavePlan.ts, packages/app/src/weavePlan.ts | — |
| ✅ | 6 | semantic backstop. Add a loom_verify_req sampling tool (extension path) with a CLI agent fallback: given the locked req and a plan, flag steps that implement an Excluded item or restate an Included item with no covering citation, phrased differently; surface it as an extension diagnostic command. | packages/mcp/src/tools/verifyReq.ts, packages/mcp/src/server.ts, packages/vscode/src/commands/req.ts, packages/vscode/package.json | — |
| ✅ | 7 | build and full test green and smoke. Run build-all and test-all. Smoke: a plan step citing an Excluded id is flagged by checkReqCoverage; an Included id with no covering step is flagged uncovered; re-locking a req to version+1 marks a downstream design stale; the planner emits satisfies for a thread with a locked req. | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |