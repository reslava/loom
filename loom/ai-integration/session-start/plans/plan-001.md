---
type: plan
id: pl_01KWDB9R8XRCF7KDRMP81S5BGR
title: Cheap, scoped session start — plan
status: done
created: 2026-06-30
updated: 2026-06-30
version: 1
design_version: 1
tags: []
parent_id: de_01KWDB8SRZS3H5VP3PBVHYQQ0H
requires_load: []
target_version: 1.13.0
actual_release: 1.13.0
steps:
  - id: delete-dead-threadid-param
    order: 1
    status: done
    description: Remove the parsed-but-unused threadId param and its 'threadId requires weaveId' validation from the state resource handler.
    files_touched: [packages/mcp/src/resources/state.ts]
    blocked_by: []
    satisfies: []
  - id: add-tostatesummary-projection-helper
    order: 2
    status: done
    description: Add a pure toStateSummary(state) helper in core that projects LoomState to the summary shape (weave/thread skeleton + status + activePlanId + pendingStepCount + stale + summary counts), plus a unit test.
    files_touched: [packages/core/src/stateSummary.ts, packages/core/src/index.ts, tests/state-summary.test.ts]
    blocked_by: []
    satisfies: []
  - id: wire-shape-summary-into-the-state
    order: 3
    status: done
    description: "Add the shape=summary query param to loom://state: when present, return toStateSummary(state) serialized compactly (no indent). Add an MCP integration assertion that the summary read is small and omits step bodies."
    files_touched: [packages/mcp/src/resources/state.ts, packages/mcp/tests/integration.test.ts]
    blocked_by: [add-tostatesummary-projection-helper]
    satisfies: []
  - id: rewrite-the-session-start-protocol-both
    order: 4
    status: done
    description: "Update the session-start protocol in root CLAUDE.md and the LOOM_CLAUDE_MD template to the 5-step path (ctx → vision/workflow → catalog → state?shape=summary → pointed do-next-step/context-thread), keeping rule: markers aligned so claude-md-sync passes."
    files_touched: [CLAUDE.md, packages/app/src/installWorkspace.ts]
    blocked_by: [wire-shape-summary-into-the-state]
    satisfies: []
  - id: cli-parity-for-loom-status-optional
    order: 5
    status: done
    description: Render loom status from the same toStateSummary projection so the CLI is the human view of the session-start map.
    files_touched: [packages/cli/src/commands/statusCommand.ts]
    blocked_by: [add-tostatesummary-projection-helper]
    satisfies: []
---
# Cheap, scoped session start — plan

## Goal

Replace the ~2 MB session-start state read with a cheap always-loaded project map plus a deep load of only the pointed thread. Delete the dead threadId param, add a pure toStateSummary projection exposed via loom://state?shape=summary (compact, ~10–15 KB), and rewrite the session-start protocol in both CLAUDE.md surfaces to use it.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Remove the parsed-but-unused threadId param and its 'threadId requires weaveId' validation from the state resource handler. | packages/mcp/src/resources/state.ts | — | — |
| ✅ | 2 | Add a pure toStateSummary(state) helper in core that projects LoomState to the summary shape (weave/thread skeleton + status + activePlanId + pendingStepCount + stale + summary counts), plus a unit test. | packages/core/src/stateSummary.ts, packages/core/src/index.ts, tests/state-summary.test.ts | — | — |
| ✅ | 3 | Add the shape=summary query param to loom://state: when present, return toStateSummary(state) serialized compactly (no indent). Add an MCP integration assertion that the summary read is small and omits step bodies. | packages/mcp/src/resources/state.ts, packages/mcp/tests/integration.test.ts | add-tostatesummary-projection-helper | — |
| ✅ | 4 | Update the session-start protocol in root CLAUDE.md and the LOOM_CLAUDE_MD template to the 5-step path (ctx → vision/workflow → catalog → state?shape=summary → pointed do-next-step/context-thread), keeping rule: markers aligned so claude-md-sync passes. | CLAUDE.md, packages/app/src/installWorkspace.ts | wire-shape-summary-into-the-state | — |
| ✅ | 5 | Render loom status from the same toStateSummary projection so the CLI is the human view of the session-start map. | packages/cli/src/commands/statusCommand.ts | add-tostatesummary-projection-helper | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:delete-dead-threadid-param -->
### Step 1 — Delete dead threadId param

threadId is parsed and validated but never applied to weaveFilter. No consumer wants thread-scoped structured state (do-next-step + context/thread cover it). Delete the parse and the validation block.

<!-- step:add-tostatesummary-projection-helper -->
### Step 2 — Add toStateSummary projection helper

Pure map over the already-computed LoomState — no new traversal. Per thread: id, title, status, priority, activePlanId (null if none), pendingStepCount, stale (bool). Exclude steps, dones, chats, refDocs, allDocs, content, index. Reuse from the resource handler and (later) loom status.

<!-- step:wire-shape-summary-into-the-state -->
### Step 3 — Wire shape=summary into the state resource

Derive the projection from the same (cached) getState result — no second load path. Compact JSON.stringify (indent was ~28% of the full payload). Assert summary bytes << full bytes and that no step/content fields leak.

<!-- step:rewrite-the-session-start-protocol-both -->
### Step 4 — Rewrite the session-start protocol (both surfaces)

Step 4 becomes loom://state?shape=summary (always); the 🧵 Active line derives from it. Step 5 is the deep scoped load for the pointed thread only. Edit BOTH surfaces and mirror the rule: markers or tests/claude-md-sync.test.ts fails.

<!-- step:cli-parity-for-loom-status-optional -->
### Step 5 — CLI parity for loom status (optional)

Low priority — fold in only if cheap. Reuses the core helper from step 2.
