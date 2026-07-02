---
type: chat
id: ch_01KWJ90CYC1DKT4YXYQMVZDXTF
title: test-harness-unify Chat
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 3
---
# test-harness-unify Chat

## Rafa:

read idea
if is fully grounded consider if we need a design/plan or just a plan is enough, write next doc

## AI:

Read the idea. It's fully grounded: clear What/Why, success criteria, scope note, and — crucially — the one real decision (A: unify on the root ts-node harness vs B: adopt jest) is already made *with justification*. Nothing about architecture or API is left open.

**Verdict: plan only, no design doc.** A design exists to settle *how* when the how is genuinely open. Here the how is settled by the idea; what remains is a bounded audit + a mechanical delete. A design doc would be ceremony, and the idea itself frames this as "its own small cleanup."

One thing I confirmed while grounding that sharpens the plan: the four files live under `packages/core/test/filters/` and at least one is worse than merely un-run — `threadFilters.test.ts` imports `../../src/filters/threadFilters`, which **doesn't exist** (the source module is `weaveFilters.ts`). So it wouldn't even compile. That's why step 1 is a real per-file audit — "does the tested function still exist, is it used, is it covered elsewhere" — rather than a blind port. The port only preserves coverage of functions that still exist *and* are still used *and* aren't already tested; if a function is dead or already covered, we drop rather than port.

Wrote **plan-001 — "Remove orphaned jest tests — one harness"** (4 steps):

1. **Audit orphaned files vs current source** — per-function keep-and-port / drop verdict.
2. **Port genuinely-unique coverage** → new `tests/core-filters.test.ts` in root-harness style + wire into `test-all.sh` (skip if nothing worth porting).
3. **Delete** the four files and the now-empty `packages/core/test/` tree.
4. **Verify** build-all + test-all green, and refresh the CLAUDE.md test-architecture note so it stops naming deleted files while keeping the "no jest-style tests" rule.

No req in this thread, which is fine — req is optional. Ready to start on step 1 when you give the go.

## Rafa:

I started the plan
Do whole plan

In case is needed update CLAUDE.md section `**Test architecture` line 148

if you finish all, append report here
then commit

## AI:

Whole plan done — all 4 steps ✅, plan auto-transitioned to `done`. Build clean, `test-all` green (`✅ All tests passed`).

**Report**

- **Audit (step 1):** verdict was *nothing worth porting*. Cross-checked the four files against current `packages/core/src/filters/*` + all usages via the core index + root `tests/`:
  - `threadFilters.test.ts` — imports `src/filters/threadFilters`, which **doesn't exist** (source is `weaveFilters.ts`). Wouldn't compile.
  - `sorting.test.ts` — imports `sortThreadsById`, which **doesn't exist** (source has `sortWeavesById`). Wouldn't compile.
  - `planFilters.test.ts` — calls `filterPlansWithBlockedSteps(plans)`, but the current signature needs a 2nd `LinkIndex` arg. Wouldn't compile.
  - `documentFilters.test.ts` — the only one that still compiles, but the functions it covers are unused.
  - The functions actually used in prod are `filterWeavesBy{Status,Phase,Id}` + `sortWeavesById` (called by `app/getState.ts`), already covered indirectly by the getState-exercising suite. The orphaned tests cover *different* functions — nonexistent or dead — so nothing met "still-existing **and** still-used **and** untested."
- **Port (step 2):** skipped, no `tests/core-filters.test.ts` created — porting would only preserve dead-code coverage.
- **Delete (step 3):** removed the whole `packages/core/test/` tree. `packages/**/*.test.ts` now resolves to just `packages/mcp/tests/integration.test.ts`, which *is* run by `test-all.sh`.
- **Verify + docs (step 4):** updated the `**Test architecture` note in `CLAUDE.md` (line 148) — dropped the present-tense "any `*.test.ts` under `packages/*/test/` **is** orphaned" wording (it named files that no longer exist) and kept a durable rule: a jest-style test there would never run, so never author one; every test goes in root `tests/`.

**One finding worth flagging (out of scope, left untouched):** `filterDocuments*`, `filterPlans*`, and `sortDocuments*` are **dead exported source** — public core-index API called by no layer. This idea was scoped to orphaned *tests*, and deleting them touches the public core surface, so I didn't. Could be a small follow-up thread ("prune unused core filter exports") if you want the source cleaned too.

Committing now.