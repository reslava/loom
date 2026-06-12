---
type: done
id: pl_01KTZ0XWBKF77YR5G1JCCAABEW-done
title: Done — RDD v1.7.0 (B) — cite requirements on done steps
status: done
created: "2026-06-12T00:00:00.000Z"
version: 2
tags: []
parent_id: pl_01KTZ0XWBKF77YR5G1JCCAABEW
requires_load: []
---
# Done — RDD v1.7.0 (B) — cite requirements on done steps

## Step 1 — **core — citation-only UPDATE_STEP on done step / done plan.** In `planReducer` UPDATE_STEP: detect a citation-only patch (`satisfies !== undefined` && `description`/`files_touched`/`blockedBy` all `undefined`). Relax the plan-level guard to also allow status `done` when citation-only (else unchanged: draft|active|implementing|blocked). Relax the step-level guard so a `done` target is mutable when citation-only; a `cancelled` step (and a non-citation patch on a done step) still throws the immutable-history error. Unit tests in `tests/`: cite `satisfies` on a done step of a done plan → ok; a `description` patch on a done step → still rejected; citation on a cancelled step → rejected.

**core — citation-only `UPDATE_STEP` on a done step / done plan.**

- `packages/core/src/reducers/planReducer.ts` UPDATE_STEP: compute `citationOnly = patch.satisfies !== undefined && description/files_touched/blockedBy all undefined`. Plan-level `assertStatus` now allows `done` (in addition to draft|active|implementing|blocked) when `citationOnly`. Step-level guard split: a `cancelled` step always rejects (cancelled work satisfies nothing); a `done` step rejects only when **not** citation-only. So `satisfies` is amendable on completed work, every other field stays immutable history.
- Test `tests/step-crud.test.ts` (new block B2): citation-only patch amends a done step of a done plan (step stays done, plan stays done); `description` edit on a done step rejected; mixed `satisfies+files_touched` patch on a done step rejected; citing a cancelled step rejected; `satisfies` on a pending step unchanged.

Build green; full `test-all` green (incl. the new block + all 17 MCP integration).

## Step 2 — **close the coverage gaps via citation.** After the step-1 build + MCP reconnect, use the relaxed `loom_update_step` to cite the four uncovered handles on the done steps that implemented them: `IN1` → plan-001's `req`-doctype step; `IN10` + `IN11` → plan-005 step 1 (core: `diffReqHandles` guard + `~dropped` parse/coverage); `IN12` → plan-005 step 3 (mcp: `loom_amend_req`). Preserve each step's existing `satisfies` (append, don't replace). Then `loom_verify_req` for the thread → expect 0 uncovered.

**close the coverage gaps via citation (live).** After the MCP reconnect, cited the four uncovered handles onto the done steps that implemented them, via the relaxed `loom_update_step` (citation-only path):
- `IN1` → plan-001 step `core-entity-wiring` (the `ReqDoc`/`parseReq` doc-type).
- `IN10` + `IN11` → plan-005 step `core-dropped-status-model-diffreqhandles-guard` (now `[IN2, IN6, C2, IN10, IN11]`).
- `IN12` → plan-005 step `mcp-rename-tool-to-loom-amend` (now `[IN4, C3, IN12]`).

`loom_verify_req` → `{ uncovered: [], excludedViolations: [], unknownCitations: [] }`. The thread is green. This *is* the live dogfood of B: requirements added mid-thread (IN10–12) were cited onto already-done steps, which the old reducer would have refused at both the plan and step level.
