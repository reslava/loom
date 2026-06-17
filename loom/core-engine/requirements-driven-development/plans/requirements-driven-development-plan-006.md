---
type: plan
id: pl_01KTZ0XWBKF77YR5G1JCCAABEW
title: RDD v1.7.0 (B) — cite requirements on done steps
status: done
created: 2026-06-12
updated: 2026-06-12
version: 1
design_version: 1
req_version: 2
tags: []
parent_id: de_01KTBA3MSAGGDWC5G55A49JN4T
requires_load: []
target_version: 0.1.0
actual_release: 1.7.0
steps:
  - id: core-citation-only-update-step-on
    order: 1
    status: done
    description: "**core — citation-only UPDATE_STEP on done step / done plan.** In `planReducer` UPDATE_STEP: detect a citation-only patch (`satisfies !== undefined` && `description`/`files_touched`/`blockedBy` all `undefined`). Relax the plan-level guard to also allow status `done` when citation-only (else unchanged: draft|active|implementing|blocked). Relax the step-level guard so a `done` target is mutable when citation-only; a `cancelled` step (and a non-citation patch on a done step) still throws the immutable-history error. Unit tests in `tests/`: cite `satisfies` on a done step of a done plan → ok; a `description` patch on a done step → still rejected; citation on a cancelled step → rejected."
    files_touched: [packages/core/src/reducers/planReducer.ts, tests/plan-step-crud.test.ts (or core reducer test)]
    blocked_by: []
    satisfies: []
  - id: close-the-coverage-gaps-via-citation
    order: 2
    status: done
    description: "**close the coverage gaps via citation.** After the step-1 build + MCP reconnect, use the relaxed `loom_update_step` to cite the four uncovered handles on the done steps that implemented them: `IN1` → plan-001's `req`-doctype step; `IN10` + `IN11` → plan-005 step 1 (core: `diffReqHandles` guard + `~dropped` parse/coverage); `IN12` → plan-005 step 3 (mcp: `loom_amend_req`). Preserve each step's existing `satisfies` (append, don't replace). Then `loom_verify_req` for the thread → expect 0 uncovered."
    files_touched: ["loom/core-engine/requirements-driven-development/plans/* (via loom_update_step)"]
    blocked_by: []
    satisfies: []
  - id: build-test-finish-the-1-7
    order: 3
    status: done
    description: "**build + test + finish the 1.7.0 release.** `./scripts/build-all.sh` + `./scripts/test-all.sh` green. Add a B note to the 1.7.0 CHANGELOG entries (citation-only amend on done steps). Then finish the release: commit all of 1.7.0 (A + B) to `main`, tag `v1.7.0`, and push the tag explicitly (lightweight tag won't ride `--follow-tags`)."
    files_touched: [CHANGELOG.md, packages/vscode/CHANGELOG.md, git]
    blocked_by: []
    satisfies: []
---
# RDD v1.7.0 (B) — cite requirements on done steps

## Goal

Close the coverage hole the amend dogfood exposed: once a step is `done`, there is currently no way to record that it satisfies a requirement (`loom_update_step` is rejected at both the plan level — a `done` plan — and the step level — a done step). This bites whenever a requirement is added or clarified mid-thread via `loom_amend_req` + re-lock, leaving permanently uncoverable Included handles (here: `IN1`, `IN10`, `IN11`, `IN12`). The fix is principled, not a workaround: `satisfies` is **traceability metadata** ("what this work served"), not the immutable record of what was done, so a **citation-only** patch (`satisfies` present; `description`/`files`/`blockedBy` absent) may amend a done step and a done plan. A `cancelled` step still rejects it (cancelled work satisfies nothing). One narrow rule in `planReducer`, no new tool surface. Folds into the 1.7.0 release. Steps authored via loom_add_step (dogfooding step CRUD).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | **core — citation-only UPDATE_STEP on done step / done plan.** In `planReducer` UPDATE_STEP: detect a citation-only patch (`satisfies !== undefined` && `description`/`files_touched`/`blockedBy` all `undefined`). Relax the plan-level guard to also allow status `done` when citation-only (else unchanged: draft\|active\|implementing\|blocked). Relax the step-level guard so a `done` target is mutable when citation-only; a `cancelled` step (and a non-citation patch on a done step) still throws the immutable-history error. Unit tests in `tests/`: cite `satisfies` on a done step of a done plan → ok; a `description` patch on a done step → still rejected; citation on a cancelled step → rejected. | packages/core/src/reducers/planReducer.ts, tests/plan-step-crud.test.ts (or core reducer test) | — | — |
| ✅ | 2 | **close the coverage gaps via citation.** After the step-1 build + MCP reconnect, use the relaxed `loom_update_step` to cite the four uncovered handles on the done steps that implemented them: `IN1` → plan-001's `req`-doctype step; `IN10` + `IN11` → plan-005 step 1 (core: `diffReqHandles` guard + `~dropped` parse/coverage); `IN12` → plan-005 step 3 (mcp: `loom_amend_req`). Preserve each step's existing `satisfies` (append, don't replace). Then `loom_verify_req` for the thread → expect 0 uncovered. | loom/core-engine/requirements-driven-development/plans/* (via loom_update_step) | — | — |
| ✅ | 3 | **build + test + finish the 1.7.0 release.** `./scripts/build-all.sh` + `./scripts/test-all.sh` green. Add a B note to the 1.7.0 CHANGELOG entries (citation-only amend on done steps). Then finish the release: commit all of 1.7.0 (A + B) to `main`, tag `v1.7.0`, and push the tag explicitly (lightweight tag won't ride `--follow-tags`). | CHANGELOG.md, packages/vscode/CHANGELOG.md, git | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
