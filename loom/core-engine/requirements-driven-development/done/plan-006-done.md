---
type: done
id: pl_01KTZ0XWBKF77YR5G1JCCAABEW-done
title: Done — RDD v1.7.0 (B) — cite requirements on done steps
status: done
created: "2026-06-12T00:00:00.000Z"
version: 3
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

## Step 3 — **build + test + finish the 1.7.0 release.** `./scripts/build-all.sh` + `./scripts/test-all.sh` green. Add a B note to the 1.7.0 CHANGELOG entries (citation-only amend on done steps). Then finish the release: commit all of 1.7.0 (A + B) to `main`, tag `v1.7.0`, and push the tag explicitly (lightweight tag won't ride `--follow-tags`).

**build + test + finish 1.7.0 release.**

- Updated `loom_update_step`'s tool description (`packages/mcp/src/tools/updateStep.ts`) to state the citation-only-on-done-step exception (it previously claimed done steps are always rejected).
- Added the cite-on-done item to the root `CHANGELOG.md` 1.7.0 entry.
- `./scripts/build-all.sh` + `./scripts/test-all.sh` green (17/17 integration + all unit).
- Committed all of 1.7.0 (A + B) to `main` as `f82fc56` (38 files), tagged **`v1.7.0`** (annotated), pushed `main` + the tag explicitly. The release workflow extracts the `[1.7.0]` CHANGELOG section as the GitHub release notes.

Thread is green (`loom_verify_req` → 0 uncovered). Both plan-005 (A) and plan-006 (B) are done.
