---
type: done
id: pl_01KWJDPNA1V25053GMBHY97YRR-done
title: Done — quick-ship-plan Plan
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: pl_01KWJDPNA1V25053GMBHY97YRR
requires_load: []
---
# Done — quick-ship-plan Plan

## Step 1 — Add packages/app/src/quickShip.ts — an app use-case quickShip(input, deps) => result that composes the existing use-cases into one call, producing exactly one done plan: create the plan (steps = the description entries), start it, complete every step, append the done doc, close the plan. Accept description: string | string[] (each entry becomes one step, all marked done at once — no numeric cap). Branch on target: existing { weaveId, threadId }, or { weaveId, newThread: { slug, title } } which first mints the thread via the existing createThread use-case before creating the plan. Reuse existing app use-cases / runEvent events (weavePlan, finalize/start, completeStep, appendDone, closePlan, thread) — no new IO primitives, reducers stay pure. Export from packages/app/src/index.ts. Must never edit an existing plan.

Added `packages/app/src/quickShip.ts` — app use-case `quickShip(input, deps)` composing `weavePlan` → `START_IMPLEMENTING_PLAN` (runEvent) → `completeStep`×N → `closePlan(notes)`. Accepts `description: string | string[]` (normalized to a non-empty trimmed list, no cap); branches on exactly one of `threadId` (existing) or `newThread: { slug, title }` (minted via `createThread`). Discovery: there is no app-level `appendDone` (it lives only in the MCP tool layer), so the done record is written via `closePlan`'s existing `notes` path — a cleaner composition with no layering violation and no new IO. Exported from `packages/app/src/index.ts`. Never edits an existing plan; never runs inference.

## Step 2 — Add packages/mcp/src/tools/quickShip.ts registering loom_quick_ship with schema { weaveId, threadId?, newThread?: { slug, title }, description: string | string[] }, validating that exactly one of threadId / newThread is supplied, and calling the app quickShip use-case. Register the tool in packages/mcp/src/server.ts. The loom://catalog entry auto-generates from the registry. Emit the standard tool result (new plan id + thread id).

Added `packages/mcp/src/tools/quickShip.ts` registering `loom_quick_ship` (schema: weaveId, threadId?, newThread?{slug,title}, description: string|string[] via oneOf, notes?), wrapping the app use-case with a strict `loadWeave` (null → throw, since completeStep/closePlan flatMap over `weave.threads`). Registered in `packages/mcp/src/server.ts` under the `plan` group; the `loom://catalog` entry auto-generates. The 'exactly one target' guard lives in the app use-case so every caller inherits it.

## Step 3 — Add tests/quick-ship.test.ts in the standalone ts-node style (import built dist, custom assert from tests/test-utils.ts, run().catch(...process.exit(1))). Cover: (a) existing-thread single-line description → exactly one done plan appears in state, its one step ✅; (b) existing-thread array description → one done plan with all steps ✅; (c) new-thread branch → the thread is minted (thread.md) and carries a done plan; (d) invariant — an already-existing implementing plan in the thread is left untouched. Add a run_test tests/quick-ship.test.ts line to scripts/test-all.sh. Requires ./scripts/build-all.sh before ./scripts/test-all.sh since tests import dist.

Added `tests/quick-ship.test.ts` (standalone ts-node, dist import, custom assert) with 5 cases: (a) existing-thread single line → one done plan, step ✅; (b) existing-thread array → one done plan, all steps ✅; (c) new-thread branch → thread.md minted + done plan; (d) invariant — a pre-existing implementing plan is byte-identical after quick-ship, and a NEW plan (plan-002) is minted; (e) validation — missing/both target and empty description throw. Wired `run_test tests/quick-ship.test.ts` into `scripts/test-all.sh`. Full suite green (build-all + test-all, incl. MCP integration). Also drove the `loom_quick_ship` MCP handler directly against a temp root to confirm the wrapper path.
