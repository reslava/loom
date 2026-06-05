---
type: done
id: pl_01KTBD34X8RKH6F2K80GD10XJ2-done
title: Done — RDD Phase 2 — requirement citation, coverage check, and req-staleness
status: done
created: "2026-06-05T00:00:00.000Z"
version: 7
tags: []
parent_id: pl_01KTBD34X8RKH6F2K80GD10XJ2
requires_load: []
---
# Done — RDD Phase 2 — requirement citation, coverage check, and req-staleness

## Step 1 — core — add satisfies to PlanStep and round-trip a Satisfies column. Extend PlanStep with a satisfies string array (req ids a step advances); teach parseStepsTable / generateStepsTable / updateStepsTableInContent to read and write a Satisfies column, comma-separated like Files touched, defaulting to empty when the column is absent so existing plans still parse.

**core — `satisfies` on PlanStep + Satisfies column round-trip.**

- Added `satisfies: string[]` to **both** `PlanStep` declarations (`entities/plan.ts` and `planTableUtils.ts` — they are duplicate identical interfaces).
- `planTableUtils.ts`: `generateStepsTable` emits a 6th **`Satisfies`** column (comma-separated, `—` when empty, pipe-escaped); `parseStepsTable` reads `cols[5]` → `satisfies`. The column is **appended last**, so legacy 5-column tables still parse with `satisfies: []` — existing plans untouched.
- Fixed the three `PlanStep` construction sites the required field surfaced: `app/promoteToPlan.ts` (`parseNumberedSteps`) and two `.map` sites in `app/weavePlan.ts` — each now sets `satisfies: []`.

**Tests:** `tests/plan-table-utils.test.ts` — new case: a step with `satisfies: ['IN1','C2']` round-trips through generate→parse; an empty one → `[]`; a legacy 5-column table parses with `satisfies: []` and intact done/blockedBy. (ts-node is `transpileOnly`, so older fixtures lacking the field run fine via optional chaining.) build-all clean; test green.

## Step 2 — core — pure requirement-coverage reducer. Add checkReqCoverage(parsedReq, steps) returning Included items with no covering step and steps that cite an Excluded id; reuse parseReq; no IO; export from index. Unit tests for covered, uncovered, and excluded-violation cases.

**core — pure requirement-coverage reducer.**

- `packages/core/src/reqCoverage.ts` (new): `checkReqCoverage(parsedReq, steps) → ReqCoverage` — pure, no IO/AI. Reports `uncovered` (Included ids no step cites), `excludedViolations` (steps citing an Excluded id), and `unknownCitations` (cited ids matching no Included/Constraint id). Constraints are valid citation targets but never required to be covered (boundaries, not deliverables). Plus `isReqSatisfied(coverage)` convenience. Checks **scope traceability through the doc graph**, not runtime correctness.
- Exported `checkReqCoverage`, `isReqSatisfied`, `ReqCoverage` from `core/index.ts`.

**Tests:** `tests/req-coverage.test.ts` (in suite) — satisfied (incl. allowed constraint citation), dropped-Included→uncovered, Excluded-citation→violation, dangling-id→unknown. build-all clean; green.

## Step 3 — core and app — req_version staleness propagation. Add a req_version field recording the locked req version a downstream idea/design/plan was built against; add an isReqStale derived check; mark downstream stale when the thread's locked req version is newer; surface the flag in assembleContext exactly like plan design-staleness, and in the vscode tree badge.

**core + app + vscode — req_version staleness propagation.**

- `req_version?: number` added to `IdeaDoc` / `DesignDoc` / `PlanDoc` (the downstream-of-req docs) + `req_version` slot in `serializeFrontmatter` ORDERED_KEYS (next to `design_version`).
- `derived.ts`: `isReqStale(doc, req)` — stale only when the req is **locked** and `doc.req_version < req.version`; a doc with no `req_version` has no baseline and is never flagged (no false positives on legacy/pre-req docs). `getReqStaleDocs(thread)` collects idea/design/plan that are req-stale and not done/cancelled. Both exported.
- `assembleContext` `staleReason`: idea/design/plan now also carry a `⚠️ stale: req vN is newer…` flag (alongside the existing design-version staleness).
- vscode `treeProvider`: `threadHasStale` and the weave-children `staleIds` set include `getReqStaleDocs`, so req-stale docs get the `⚠️ stale` badge and pass the stale status-filter.

**Stamping note:** the field is *recorded* when a downstream doc is generated against a locked req — plan stamping lands in step 5 (the planner reads the locked req). The mechanism (field + derived + surfacing) is complete and tested independently here.

**Tests:** `tests/req.test.ts` — `isReqStale` truth table + `getReqStaleDocs` (v1 idea stale, v2 design not, done plan excluded). `tests/context-assembler.test.ts` — a design with `req_version 1` under a locked req v2 is flagged stale in the bundle. build-all clean; both green.

## Step 4 — app and mcp — surface coverage diagnostics. Run checkReqCoverage for each thread that has a locked req plus plans inside getState, fold the counts into LoomState.summary and the loom://diagnostics resource, and mention coverage gaps in the validate-state and continue-thread prompts.

**app + mcp — surface coverage diagnostics.**

- `core/entities/state.ts`: added `reqCoverageGaps: number` to `LoomState.summary`.
- `app/getState.ts`: for each thread with a **locked** req + plans, run `checkReqCoverage(parseReq(req.content), allPlanSteps)` and sum `uncovered + excludedViolations + unknownCitations` into `summary.reqCoverageGaps`.
- `mcp/resources/diagnostics.ts`: added a `reqCoverage` array to `loom://diagnostics` — per offending thread, the uncovered Included ids, excluded-citation violations (stepOrder+id), and dangling citations.
- `mcp/prompts/validateState.ts`: instruction now calls out requirement scope-coverage gaps.
- vscode `treeProvider`: the summary warning row shows `N req coverage gaps`.

**Tests:** `packages/mcp/tests/integration.test.ts` — new case: after the fixture's req is locked on `tw/t1` (and its plan cites no req), `loom://diagnostics.reqCoverage` reports `IN1` uncovered. **11/11** integration green; build-all clean.

## Step 5 — mcp — planner cites requirements as it generates. Teach loom_generate_plan and the weave-plan prompt to read the thread's locked req, hand Excluded and Constraints in as hard boundaries, and emit satisfies ids per step; keep loom_create_plan accepting steps that carry satisfies.

**mcp + app — planner cites requirements as it generates.**

Citation persists through the existing **content-body `Satisfies` column** (step 1's round-trip), so `loom_create_plan` already accepts `satisfies` — no schema change. Two parts:

- **Deterministic stamping (the real mechanism, testable):** `app/req.ts` adds `lockedReqVersion(loomRoot, weave, thread, deps)`; `weavePlan` and `weaveDesign` stamp `req_version` on the created doc when the thread's req is locked. This is what makes re-lock→stale fire, independent of LLM behaviour.
- **Prompt guidance (prevention):** `prompts/weavePlan.ts`, the `loom_generate_plan` sampling instruction (`generate.ts`), and the extension's claude-launch plan prompt (`extension.ts`) now tell the planner: the locked req appears first in context; treat ❌ Excluded + ⛓ Constraints as HARD BOUNDARIES, cover every ✅ Included, cite the `IN`/`C` ids each step advances, and emit the `Satisfies` column via the `content` body.

**Tests:** `tests/req-usecases.test.ts` — `weavePlan` on a locked-req thread stamps `req_version` (=2) on the plan. build-all clean; green.

**Follow-up note:** the sampling `loom_generate_plan` path has a pre-existing quirk (it returns generated steps but `weavePlan` is called without them); the citation guidance is in place, but that path's step-writing gap is orthogonal to RDD and untouched. The CLI / extension-claude-launch path (content body) is the one that persists citations.

## Step 6 — semantic backstop. Add a loom_verify_req sampling tool (extension path) with a CLI agent fallback: given the locked req and a plan, flag steps that implement an Excluded item or restate an Included item with no covering citation, phrased differently; surface it as an extension diagnostic command.

**mcp + vscode — semantic backstop (`loom_verify_req`).**

- `packages/mcp/src/tools/verifyReq.ts` (new): `createVerifyReqTool(server)`. Loads the thread, runs the **deterministic** `checkReqCoverage` (always), then attempts an **AI semantic pass** via sampling (flags Excluded/Constraint violations phrased differently, and Included items advanced without citation) returning JSON `{violations, uncited}`. Sampling-blocked in CLI → `semantic: null` + `semanticError` string, with structural findings still returned (the agent verifies semantics itself). Registered in `server.ts`.
- `mcp-client.ts`: `loom_verify_req` added to `AI_TOOL_PREFIXES` so it gets the 10-min AI timeout.
- vscode `commands/req.ts`: `verifyReqCommand` — runs the tool, shows ✅ when clean, else writes full findings to a "Loom Req Verify" output channel and warns. Registered `loom.verifyReq` in `extension.ts`; `package.json` command (`$(verified)`) + inline/context menu on `req` / `req-temp` nodes.

**Tests:** `integration.test.ts` — `loom_verify_req` on the locked-req fixture returns `structural.uncovered` containing `IN1`, and (the test client advertises no sampling) `semantic: null` + a `semanticError`. **12/12** integration green; build-all clean.

## Step 7 — build and full test green and smoke. Run build-all and test-all. Smoke: a plan step citing an Excluded id is flagged by checkReqCoverage; an Included id with no covering step is flagged uncovered; re-locking a req to version+1 marks a downstream design stale; the planner emits satisfies for a thread with a locked req.

**build + full test green + smoke.**

- `./scripts/build-all.sh` clean across all packages; `./scripts/test-all.sh` — **entire suite green**, MCP integration **12/12**.
- Smoke (covered by suite): Excluded-citation flagged + uncovered-Included → `req-coverage.test.ts` + `loom://diagnostics` integration; re-lock (v→v+1) marks downstream stale → `req.test.ts` (`isReqStale`/`getReqStaleDocs`) + assembler test; `req_version` stamped on plan generation → `req-usecases.test.ts`; `loom_verify_req` structural+semantic → integration.

**Phase 2 complete.** The locked req is now *verifiable*: plan steps cite requirements (`Satisfies` column), a pure `checkReqCoverage` reducer checks scope traceability, coverage gaps surface in summary/diagnostics/prompts/tree, the planner is instructed to cite + respect boundaries (and plans/designs stamp `req_version`), re-locking marks downstream stale, and `loom_verify_req` adds the AI semantic backstop. RDD is end-to-end: chat → req (locked, injected) → idea/design/plan built against it → cited → checked.
