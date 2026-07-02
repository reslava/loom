---
type: plan
id: pl_01KWJ9A6SGJ7D39FR0CRH03YGR
title: Remove orphaned jest tests — one harness
status: done
created: 2026-07-02
updated: 2026-07-02
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: audit-orphaned-files-vs-current-source
    order: 1
    status: done
    description: "For each orphaned file (planFilters, documentFilters, sorting, threadFilters), determine per tested function: does the imported source module + function still exist with a compatible signature? Is it already exercised by a root tests/ script or an integration test? Is it used at all by app/cli/mcp/vscode? Produce a keep-and-port / drop verdict per function and record it."
    files_touched: [packages/core/test/filters/planFilters.test.ts, packages/core/test/filters/documentFilters.test.ts, packages/core/test/filters/sorting.test.ts, packages/core/test/filters/threadFilters.test.ts, packages/core/src/filters/planFilters.ts, packages/core/src/filters/documentFilters.ts, packages/core/src/filters/sorting.ts, packages/core/src/filters/weaveFilters.ts]
    blocked_by: []
    satisfies: []
  - id: port-genuinely-unique-coverage-to-the
    order: 2
    status: done
    description: For functions the audit flags as still-existing, still-used, and not otherwise covered, write tests/core-filters.test.ts in the root harness style (import from packages/core/dist, use the custom assert from tests/test-utils.ts, end with run().catch(e => process.exit(1))) and add its run_test line to scripts/test-all.sh. If the audit finds nothing worth porting (e.g. the functions are dead or already covered), skip the file and record the reason in the done note.
    files_touched: [tests/core-filters.test.ts, scripts/test-all.sh]
    blocked_by: [audit-orphaned-files-vs-current-source]
    satisfies: []
  - id: delete-the-orphaned-jest-files-and
    order: 3
    status: done
    description: Remove the four packages/core/test/filters/*.test.ts files and the now-empty packages/core/test/ directory so no unexecuted *.test.ts remains in the repo.
    files_touched: [packages/core/test/filters/]
    blocked_by: [port-genuinely-unique-coverage-to-the]
    satisfies: []
  - id: verify-one-harness-refresh-the-claude
    order: 4
    status: done
    description: Run ./scripts/build-all.sh then ./scripts/test-all.sh and confirm green. Update the test-architecture paragraph in CLAUDE.md so it no longer references the now-deleted orphaned files under packages/*/test/, while keeping the rule that new tests go in root tests/ (never jest-style). Confirm no *.test.ts outside root tests/ (+ packages/mcp/tests/integration.test.ts) remains.
    files_touched: [CLAUDE.md, scripts/test-all.sh]
    blocked_by: [delete-the-orphaned-jest-files-and]
    satisfies: []
---
# Remove orphaned jest tests — one harness

## Goal

Unify the repo on its single, actually-run test harness (root `tests/` ts-node scripts + the custom `assert` in `tests/test-utils.ts`) by removing the four orphaned jest-style files under `packages/core/test/filters/` (threadFilters, documentFilters, sorting, planFilters). Nothing runs them today — no jest config, no jest dep, no per-package `test` script — so they are a false coverage signal, and at least `threadFilters.test.ts` imports a source module (`src/filters/threadFilters`) that no longer exists (the source has `weaveFilters.ts`), so it wouldn't even compile. Per the idea's settled option A, first audit each file and port any genuinely-unique coverage of still-existing, still-used functions into a root `tests/` script, then delete the orphaned tree. End state: no `*.test.ts` in the repo goes unexecuted by `test-all.sh`, and the test architecture note in CLAUDE.md no longer points at deleted files while keeping the "don't author jest-style tests" rule.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | For each orphaned file (planFilters, documentFilters, sorting, threadFilters), determine per tested function: does the imported source module + function still exist with a compatible signature? Is it already exercised by a root tests/ script or an integration test? Is it used at all by app/cli/mcp/vscode? Produce a keep-and-port / drop verdict per function and record it. | packages/core/test/filters/planFilters.test.ts, packages/core/test/filters/documentFilters.test.ts, packages/core/test/filters/sorting.test.ts, packages/core/test/filters/threadFilters.test.ts, packages/core/src/filters/planFilters.ts, packages/core/src/filters/documentFilters.ts, packages/core/src/filters/sorting.ts, packages/core/src/filters/weaveFilters.ts | — | — |
| ✅ | 2 | For functions the audit flags as still-existing, still-used, and not otherwise covered, write tests/core-filters.test.ts in the root harness style (import from packages/core/dist, use the custom assert from tests/test-utils.ts, end with run().catch(e => process.exit(1))) and add its run_test line to scripts/test-all.sh. If the audit finds nothing worth porting (e.g. the functions are dead or already covered), skip the file and record the reason in the done note. | tests/core-filters.test.ts, scripts/test-all.sh | audit-orphaned-files-vs-current-source | — |
| ✅ | 3 | Remove the four packages/core/test/filters/*.test.ts files and the now-empty packages/core/test/ directory so no unexecuted *.test.ts remains in the repo. | packages/core/test/filters/ | port-genuinely-unique-coverage-to-the | — |
| ✅ | 4 | Run ./scripts/build-all.sh then ./scripts/test-all.sh and confirm green. Update the test-architecture paragraph in CLAUDE.md so it no longer references the now-deleted orphaned files under packages/*/test/, while keeping the rule that new tests go in root tests/ (never jest-style). Confirm no *.test.ts outside root tests/ (+ packages/mcp/tests/integration.test.ts) remains. | CLAUDE.md, scripts/test-all.sh | delete-the-orphaned-jest-files-and | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
