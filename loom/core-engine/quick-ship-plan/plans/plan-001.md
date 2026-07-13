---
type: plan
id: pl_01KWJDPNA1V25053GMBHY97YRR
title: Quick-ship one-call done-plan recorder (loom_quick_ship)
status: done
created: 2026-07-02
updated: 2026-07-13
version: 1
design_version: 1
tags: []
parent_id: de_01KWJD3J9MB1XC6XE32QXWDWGA
requires_load: []
target_version: 0.1.0
actual_release: 1.14.0
steps:
  - id: app-use-case-quickship
    order: 1
    status: done
    description: "Add packages/app/src/quickShip.ts — an app use-case quickShip(input, deps) => result that composes the existing use-cases into one call, producing exactly one done plan: create the plan (steps = the description entries), start it, complete every step, append the done doc, close the plan. Accept description: string | string[] (each entry becomes one step, all marked done at once — no numeric cap). Branch on target: existing { weaveId, threadId }, or { weaveId, newThread: { slug, title } } which first mints the thread via the existing createThread use-case before creating the plan. Reuse existing app use-cases / runEvent events (weavePlan, finalize/start, completeStep, appendDone, closePlan, thread) — no new IO primitives, reducers stay pure. Export from packages/app/src/index.ts. Must never edit an existing plan."
    files_touched: [packages/app/src/quickShip.ts, packages/app/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: mcp-tool-loom-quick-ship
    order: 2
    status: done
    description: "Add packages/mcp/src/tools/quickShip.ts registering loom_quick_ship with schema { weaveId, threadId?, newThread?: { slug, title }, description: string | string[] }, validating that exactly one of threadId / newThread is supplied, and calling the app quickShip use-case. Register the tool in packages/mcp/src/server.ts. The loom://catalog entry auto-generates from the registry. Emit the standard tool result (new plan id + thread id)."
    files_touched: [packages/mcp/src/tools/quickShip.ts, packages/mcp/src/server.ts]
    blocked_by: [app-use-case-quickship]
    satisfies: []
  - id: test-quick-ship-end-to-end
    order: 3
    status: done
    description: "Add tests/quick-ship.test.ts in the standalone ts-node style (import built dist, custom assert from tests/test-utils.ts, run().catch(...process.exit(1))). Cover: (a) existing-thread single-line description → exactly one done plan appears in state, its one step ✅; (b) existing-thread array description → one done plan with all steps ✅; (c) new-thread branch → the thread is minted (thread.md) and carries a done plan; (d) invariant — an already-existing implementing plan in the thread is left untouched. Add a run_test tests/quick-ship.test.ts line to scripts/test-all.sh. Requires ./scripts/build-all.sh before ./scripts/test-all.sh since tests import dist."
    files_touched: [tests/quick-ship.test.ts, scripts/test-all.sh]
    blocked_by: [mcp-tool-loom-quick-ship]
    satisfies: []
---
# Quick-ship one-call done-plan recorder (loom_quick_ship)

## Goal

Implement `loom_quick_ship`: a one-call affordance that records already-done work as exactly one new done plan (composing createPlan → startPlan → completeStep×N → appendDone → closePlan), with two target branches (existing thread or mint a new thread) and `description: string | string[]`. MCP tool is the primitive; CLI + extension button are deferred to a follow-up. Invariant: always produces exactly one new done plan; never touches an existing plan; never implements code.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add packages/app/src/quickShip.ts — an app use-case quickShip(input, deps) => result that composes the existing use-cases into one call, producing exactly one done plan: create the plan (steps = the description entries), start it, complete every step, append the done doc, close the plan. Accept description: string \| string[] (each entry becomes one step, all marked done at once — no numeric cap). Branch on target: existing { weaveId, threadId }, or { weaveId, newThread: { slug, title } } which first mints the thread via the existing createThread use-case before creating the plan. Reuse existing app use-cases / runEvent events (weavePlan, finalize/start, completeStep, appendDone, closePlan, thread) — no new IO primitives, reducers stay pure. Export from packages/app/src/index.ts. Must never edit an existing plan. | packages/app/src/quickShip.ts, packages/app/src/index.ts | — | — |
| ✅ | 2 | Add packages/mcp/src/tools/quickShip.ts registering loom_quick_ship with schema { weaveId, threadId?, newThread?: { slug, title }, description: string \| string[] }, validating that exactly one of threadId / newThread is supplied, and calling the app quickShip use-case. Register the tool in packages/mcp/src/server.ts. The loom://catalog entry auto-generates from the registry. Emit the standard tool result (new plan id + thread id). | packages/mcp/src/tools/quickShip.ts, packages/mcp/src/server.ts | app-use-case-quickship | — |
| ✅ | 3 | Add tests/quick-ship.test.ts in the standalone ts-node style (import built dist, custom assert from tests/test-utils.ts, run().catch(...process.exit(1))). Cover: (a) existing-thread single-line description → exactly one done plan appears in state, its one step ✅; (b) existing-thread array description → one done plan with all steps ✅; (c) new-thread branch → the thread is minted (thread.md) and carries a done plan; (d) invariant — an already-existing implementing plan in the thread is left untouched. Add a run_test tests/quick-ship.test.ts line to scripts/test-all.sh. Requires ./scripts/build-all.sh before ./scripts/test-all.sh since tests import dist. | tests/quick-ship.test.ts, scripts/test-all.sh | mcp-tool-loom-quick-ship | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
