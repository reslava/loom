---
type: done
id: pl_01KWJ9A6SGJ7D39FR0CRH03YGR-done
title: Done — Remove orphaned jest tests — one harness
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: pl_01KWJ9A6SGJ7D39FR0CRH03YGR
requires_load: []
---
# Done — Remove orphaned jest tests — one harness

## Step 1 — For each orphaned file (planFilters, documentFilters, sorting, threadFilters), determine per tested function: does the imported source module + function still exist with a compatible signature? Is it already exercised by a root tests/ script or an integration test? Is it used at all by app/cli/mcp/vscode? Produce a keep-and-port / drop verdict per function and record it.

**Audit verdict: nothing worth porting.** Cross-checked the four orphaned files against current `packages/core/src/filters/*` + usage across `app/cli/mcp/vscode` (via `packages/core/src/index.ts` exports) + root `tests/`.

| Orphaned file | Tested symbols | Status vs current source | Used in prod? | Verdict |
|---|---|---|---|---|
| `threadFilters.test.ts` | `filterThreadsBy{Status,Phase,Id}` from `src/filters/threadFilters` | **Module doesn't exist** — source is `weaveFilters.ts` (`filterWeavesBy*`). Would not compile. | n/a | drop |
| `sorting.test.ts` | `sortThreadsById`, `sortDocumentsBy{Created,Title}` | `sortThreadsById` **doesn't exist** (source has `sortWeavesById`). Would not compile. | `sortDocuments*` exported-but-unused | drop |
| `planFilters.test.ts` | `filterPlansBy{Staleness,TargetVersion}`, `filterPlansWithBlockedSteps` | `filterPlansWithBlockedSteps` signature drifted — now requires a 2nd `LinkIndex` arg; test calls it with one. Would not compile. | all three exported-but-unused | drop |
| `documentFilters.test.ts` | `filterDocumentsBy{Type,Status,Title}` | Compiles against current source. | exported-but-unused | drop |

**Key finding:** the functions genuinely used in production are `filterWeavesBy{Status,Phase,Id}` + `sortWeavesById` (consumed by `app/getState.ts:139-150`) — and they already have indirect coverage via the getState-exercising suite (state-summary, workspace-workflow). The orphaned tests cover *different* functions: either nonexistent (`threadFilters`, `sortThreadsById`) or existent-but-dead (`filterDocuments*`, `filterPlans*`, `sortDocuments*` — exported from the core index but called by no layer). Per the idea's criterion (port coverage of still-existing **and** still-used functions), none qualifies; porting would preserve dead-code coverage, exactly what the idea warns against.

**Out-of-scope finding surfaced for a possible follow-up:** `filterDocuments*`, `filterPlans*`, and `sortDocuments*` are dead exported source (unused public core API). Deleting the *source* is beyond this idea's scope (which is orphaned *tests*) and touches the public core surface — left untouched, flagged in the report.

## Step 2 — For functions the audit flags as still-existing, still-used, and not otherwise covered, write tests/core-filters.test.ts in the root harness style (import from packages/core/dist, use the custom assert from tests/test-utils.ts, end with run().catch(e => process.exit(1))) and add its run_test line to scripts/test-all.sh. If the audit finds nothing worth porting (e.g. the functions are dead or already covered), skip the file and record the reason in the done note.

**Skipped — nothing to port** (see Step 1 verdict). No `tests/core-filters.test.ts` created and no `run_test` line added to `scripts/test-all.sh`. The only still-used filter/sort functions (`filterWeaves*`, `sortWeavesById`) are already exercised indirectly through `getState` by the existing suite, so a dedicated port would add no unique coverage.

## Step 3 — Remove the four packages/core/test/filters/*.test.ts files and the now-empty packages/core/test/ directory so no unexecuted *.test.ts remains in the repo.

Deleted the entire orphaned tree `packages/core/test/` (all four `filters/*.test.ts` files + the now-empty dir) via `rm -rf packages/core/test`. Confirmed `packages/**/*.test.ts` now resolves to only `packages/mcp/tests/integration.test.ts`, which IS executed by `test-all.sh` (line 198). Left `packages/core/test.js` and `test-registry.js` untouched — they are `.js` fixtures, not orphaned `.test.ts`, and outside this idea's scope.

## Step 4 — Run ./scripts/build-all.sh then ./scripts/test-all.sh and confirm green. Update the test-architecture paragraph in CLAUDE.md so it no longer references the now-deleted orphaned files under packages/*/test/, while keeping the rule that new tests go in root tests/ (never jest-style). Confirm no *.test.ts outside root tests/ (+ packages/mcp/tests/integration.test.ts) remains.

`./scripts/build-all.sh` clean; `./scripts/test-all.sh` green — final line `18 passed, 0 failed` in the MCP integration group and `✅ All tests passed`. Updated the `**Test architecture` paragraph in `CLAUDE.md` (line 148): replaced the present-tense "any `*.test.ts` under `packages/*/test/` **is** *orphaned*" wording (which named files that no longer exist) with a durable rule — "a jest-style `*.test.ts` placed under `packages/*/test/` would never run, so never author one there; every test goes in root `tests/`." No change needed to `scripts/test-all.sh` (never referenced the orphaned files). Success criteria met: no unexecuted `*.test.ts` in the repo, no coverage lost, one documented harness.
