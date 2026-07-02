---
type: idea
id: id_01KWGW7S6SRKFZX34ZS0BBDJ04
title: Remove orphaned jest tests — one test harness
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: null
requires_load: []
---
# Remove orphaned jest tests — one test harness

## What

`packages/core/test/**/*.test.ts` are written jest-style (`describe`/`it`/`expect`) but **nothing runs them**: there is no jest config, no per-package `test` script, and `scripts/test-all.sh` only runs standalone `ts-node` scripts from the root `tests/` dir. So those files are dead — a false signal of coverage.

## Why it matters

- **Dead tests rot and mislead.** A contributor (or the AI) sees `planFilters.test.ts` and assumes core filter logic is under test; it isn't. Bugs can land green.
- **Two apparent harnesses, one real.** The split (root `tests/` ts-node + custom `assert` vs `packages/*/test/` jest) is exactly what made an earlier step author a test in the wrong place. The test architecture is now documented in `CLAUDE.md`, but the orphaned files should also go so the repo has one obvious harness.

## Options (for design to settle)

- **A — delete the orphaned jest files.** If any of their assertions cover logic not otherwise tested, port that coverage to a root `tests/{name}.test.ts` first, then delete. Fewest moving parts; matches the harness the suite actually uses.
- **B — adopt jest for `packages/*` and wire it into `test-all.sh`.** Keeps the files, but adds a second framework + config to maintain for little gain at current scale.

**Lean: A.** Unify on the existing root ts-node harness; port any unique coverage, then delete the jest files. Revisit B only if per-package unit testing volume grows enough to want a real runner.

## Success criteria

- No `*.test.ts` in the repo that is never executed by `test-all.sh`.
- Any coverage worth keeping from the deleted jest files survives as a root `tests/` script.
- One documented, actually-run test harness.

## Scope note

Discovered while implementing `plan-blockedby-id-normalization` (a step's test was mistakenly authored in the orphaned `packages/core/test/` location). Kept out of that thread; this is its own small cleanup.
