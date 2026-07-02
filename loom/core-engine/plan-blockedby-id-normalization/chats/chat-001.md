---
type: chat
id: ch_01KWGTPA7C70ZZZ6CSVKRPYS3W
title: plan-blockedby-id-normalization Chat
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 10
---
# plan-blockedby-id-normalization Chat

## AI:

(Rafa: copied here for context)

### 3. Design generated — `design.md` in the thread (review before I plan)

📄 `plan-blockedby-id-normalization/design.md` — created (draft).

I grounded it in the code. The load-bearing finding: **there is no shared write-time ordinal→id resolver today** — `buildStructuredSteps` stores `blockedBy` verbatim, and `isStepBlocked` only tolerates ordinals at *read* time (which is what hides the bug). So the fix introduces one. Two decisions I made in the design that shape the API/tests — confirm these and I'll generate the plan:

- **Out-of-range ordinal → error** (throw at write time), not silent pass-through. It can only be a mistake.
- **One core helper `resolveBlockedByIds(entries, orderedStepIds)`, shared by create *and* the add/update-step reducers** — so numeric `blockedBy` is normalized identically everywhere and there's no second codepath (what the idea asked for). Non-numeric slugs / `pl_…` plan-ids pass through; result deduped; self-block rejected.

I also scoped **out** a migration of *already-stored* ordinals in existing plans (new writes are clean; the one plan that hit this was hand-fixed) — flag if you'd rather include it.

**STOP — design decision.** Confirm the two calls above (or adjust), and I'll generate the plan, then stop again before implementing.

## Rafa:

I moved the chat here

Agreed 2 calls

You said:

> I also scoped **out** a migration of *already-stored* ordinals in existing plans (new writes are clean; the one plan that hit this was hand-fixed) — flag if you'd rather include it.

Please explain it briefly
Are you talking of another migration tool?
I think we could keep already done plans as they are, no need to migrate them

## AI:

### The migration — brief, and I agree with you

To be clear: **it is not a separate or existing tool.** I meant a *hypothetical* one-off sweep — the same shape as `loom migrate-layout` — that would rewrite `blockedBy` ordinals **already stored on disk** in existing plan files into slug ids. It's the "fix the data" counterpart to this thread's "fix the writer."

We don't need it, for the reason you gave:
- After this fix, every **new** write is clean.
- `isStepBlocked` still resolves legacy stored ordinals at **read** time (back-compat), so any existing plan that still has ordinals keeps working — it just isn't reorder-safe, which for a *finished* plan doesn't matter.
- The one plan that actually hit this (`roadmap-release-version-plan-001`) was already hand-fixed.

So: **no migration. Existing plans stay as-is.** Confirmed scoped out — the design already says this; nothing to change there.

### Plan generated — `plan-001.md` (4 steps)

📄 `plan-blockedby-id-normalization/plans/plan-001.md` — created.

1. **resolve-blockedby-ids-helper** — the pure core resolver + unit tests.
2. **wire-create-path** — into `buildStructuredSteps` (two-pass). *(blocked by 1)*
3. **wire-add-update-reducers** — same helper in `ADD_STEP`/`UPDATE_STEP`. *(blocked by 1)*
4. **integration-tests-and-build** — round-trip / reorder / out-of-range / passthrough tests + `build-all` + `test-all`. *(blocked by 2, 3)*

Nice live confirmation of the very bug: I wrote the plan's own `blockedBy` as **slug** ids and they persisted verbatim and correct — because the current tool only mangles *numeric* entries. That's exactly the asymmetry step 1 removes.

(Uncommitted so far this turn: the two `workflow.yml` ref cuts + this thread's new design & plan. I'll commit at your say-so.)

**STOP — plan ready, not started.** On your `go` I'll start the plan and implement **step 1** (the core resolver + its unit tests), then stop for review before wiring it in.

## Rafa:

commit the two `workflow.yml` ref cuts now

I started the plan
then do step 1

## AI:

## ✅ Step 1 — `resolveBlockedByIds` helper + tests

Added the pure resolver in `packages/core/src/planUtils.ts` — numeric / "Step N" → id at that 1-based position; slug / `pl_…` plan-id → passthrough; out-of-range ordinal → throws; deduped; self-block (via `selfId`) → throws. Exported it from `packages/core/src/index.ts`. Typecheck clean (`tsc --noEmit -p packages/core` → exit 0).

**One finding worth flagging:** the plan's step-1 `files_touched` pointed at `packages/core/test/` (jest), but **those jest files are orphaned** — `test-all.sh` runs standalone ts-node tests from the root `tests/` dir (custom `assert`, importing built `core/dist`), and core has no jest config or `test` script, so the `packages/core/test/*.test.ts` files never actually run. So I put the test where the suite lives: `tests/resolve-blockedby-ids.test.ts`, wired into `scripts/test-all.sh`. (Separately: those orphaned jest tests are latent dead weight — a cleanup candidate for another day, not this thread.)

**Deferred:** the functional test imports `core/dist`, so it runs green in **step 4** (`build-all` + `test-all`) rather than now — I verified the code compiles via the typecheck instead of pulling a full `build-all` forward.

Files: `packages/core/src/planUtils.ts`, `packages/core/src/index.ts`, `tests/resolve-blockedby-ids.test.ts`, `scripts/test-all.sh`. (Uncommitted — you only asked to commit the ref cuts.)

**Next — step 2 (`wire-create-path`):** wire `resolveBlockedByIds` into `buildStructuredSteps` in `packages/app/src/weavePlan.ts` as a two-pass build (assign all step ids by order, then resolve each step's `blockedBy` against that ordered id list, passing the step's own id as `selfId`). Files: `packages/app/src/weavePlan.ts`.

**STOP — waiting for `go`.**

## Rafa:

### about your flagging (line 87)

spin up a thread idea for the cleanup
also you usually forget this `test-all.sh runs standalone ts-node tests in the root tests/ dir with a custom assert` so maybe we could add a current test architecture to `loom/ctx.md` or `CLAUDE.md`, agree?

### Plan

Do 2,3,4

## AI:

## ✅ Steps 2–4 done — plan complete (auto-`done`)

**Step 2 — create path.** `buildStructuredSteps` (`weavePlan.ts`) is now a two-pass build: assign all step ids by order, then `resolveBlockedByIds(blockedBy, orderedStepIds, selfId)` per step. Ordinals persist as slug ids.

**Step 3 — reducers.** Same helper wired into `UPDATE_STEP` (resolve `patch.blockedBy` vs current order, `selfId = stepId`) and `ADD_STEP` (resolve the new step's `blockedBy` vs the final post-insert order). Create and update now converge on one codepath. *(Reducer was at `packages/core/src/reducers/planReducer.ts`, not the src-root path the plan guessed — corrected in the done doc.)*

**Step 4 — tests + build.** `tests/blockedby-normalization.test.ts` (wired into `test-all.sh`): create persists slugs; slug/`pl_…` passthrough; out-of-range throws; update & add normalize numerics; reorder keeps slug edges. **`build-all` green; `test-all` green — all suites, 0 failed (MCP integration 18/18).** Both new tests also pass in isolation.

### This turn also produced
- **CLAUDE.md** — a "Test architecture" note under Build and test (root `tests/` ts-node + custom `assert`; jest under `packages/*/test/` is orphaned) so this stops getting relearned.
- **New thread `test-harness-unify`** — an idea doc for removing the orphaned jest tests (lean: delete + port any unique coverage).

### Uncommitted (waiting on your `commit`)
The whole fix + side work is uncommitted. Suggested scoping — **two commits**:
1. `fix: normalize plan blockedBy ordinals to stable step-id slugs on every write path` — `planUtils.ts`, core `index.ts`, `reducers/planReducer.ts`, `weavePlan.ts`, the two `tests/*`, `test-all.sh`, this thread's design/plan/done + chat.
2. `chore: doc test architecture + spin up test-harness-unify idea` — `CLAUDE.md` + the new idea thread.

(Or one commit if you'd rather.)

**Next:** say `commit` and I'll land it, then it's green for `/do-release` (core is at `1.12.0`, so **1.13.0** is the right bump — which you trigger). Plan is done; nothing else pending in this thread.

## Rafa:

do both commits

## AI:

Landing both commits now:

1. **`fix:`** — the resolver + wiring (`planUtils.ts`, core `index.ts`, `reducers/planReducer.ts`, `weavePlan.ts`), both tests + `test-all.sh`, and this thread's idea/design/plan/done + chat.
2. **`chore:`** — the CLAUDE.md test-architecture note + the `test-harness-unify` idea.

Two things I'm **not** folding into these, so you can decide:
- **Your `workflow-run-command` archive** (extension move of `design.md`/`thread.md` → `loom/.archive/`) is still uncommitted. Want it as its own `chore: archive workflow-run-command` commit? Say the word.
- The `loom-entities-crud` chat log is left uncommitted — normal for a living chat that runs ahead of the last commit.

After these land, the fix is green for `/do-release` **1.13.0** whenever you trigger it.