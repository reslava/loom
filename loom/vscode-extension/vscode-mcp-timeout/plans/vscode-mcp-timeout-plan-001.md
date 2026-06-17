---
type: plan
id: pl_01KR1QSQ3V1KK0SGNNYZ5HZJHA
title: Unify MCP timeout handling
status: done
created: 2026-05-07
updated: 2026-05-07
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 0.5.0
steps:
  - id: extract-ismcptimeout-e-unknown-boolean-helper
    order: 1
    status: done
    description: "Extract isMcpTimeout(e: unknown): boolean helper — checks e.message for '32001' or 'timed out', matching the logic already in treeProvider.ts getRootChildren."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: extract-handlemcperror-e-unknown-treeprovider-loomtreeprovider
    order: 2
    status: done
    description: "Extract handleMcpError(e: unknown, treeProvider: LoomTreeProvider): never helper — if isMcpTimeout(e): call disposeMCP(), call treeProvider.refresh() (which shows the reconnect node), then show a vscode.window.showErrorMessage with 'MCP timed out — reconnecting…'. Always re-throw so the calling command's catch can exit cleanly."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: wire-handlemcperror-into-the-catch-blocks
    order: 3
    status: done
    description: "Wire handleMcpError into the catch blocks of: doStep, refine (design + idea + plan), chatReply, generate (design, plan, global ctx), closePlan, startPlan, completeStep. These are the commands that make AI-bound MCP tool calls and are most likely to time out."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: build-and-smoke-test-simulate-a
    order: 4
    status: done
    description: "Build and smoke-test: simulate a timeout (temporarily lower AI_TOOL_TIMEOUT_MS to 1ms, trigger doStep), confirm the tree shows the reconnect node and the error message appears."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Unify MCP timeout handling

| | |
|---|---|
| **Created** | 2026-05-07 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Extract a shared MCP error handler so all command paths offer reconnect on timeout, not just the tree-load path.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Extract isMcpTimeout(e: unknown): boolean helper — checks e.message for '32001' or 'timed out', matching the logic already in treeProvider.ts getRootChildren. | — | — | — |
| ✅ | 2 | Extract handleMcpError(e: unknown, treeProvider: LoomTreeProvider): never helper — if isMcpTimeout(e): call disposeMCP(), call treeProvider.refresh() (which shows the reconnect node), then show a vscode.window.showErrorMessage with 'MCP timed out — reconnecting…'. Always re-throw so the calling command's catch can exit cleanly. | — | — | — |
| ✅ | 3 | Wire handleMcpError into the catch blocks of: doStep, refine (design + idea + plan), chatReply, generate (design, plan, global ctx), closePlan, startPlan, completeStep. These are the commands that make AI-bound MCP tool calls and are most likely to time out. | — | — | — |
| ✅ | 4 | Build and smoke-test: simulate a timeout (temporarily lower AI_TOOL_TIMEOUT_MS to 1ms, trigger doStep), confirm the tree shows the reconnect node and the error message appears. | — | — | — |
---

<!-- step:extract-ismcptimeout-e-unknown-boolean-helper -->
### Step 1 — Extract isMcpTimeout(e: unknown): boolean helper — checks e.message for '32001' or 'timed out', matching the logic already in treeProvider.ts getRootChildren.

<!-- Detailed spec. -->

---

<!-- step:extract-handlemcperror-e-unknown-treeprovider-loomtreeprovider -->
### Step 2 — Extract handleMcpError(e: unknown, treeProvider: LoomTreeProvider): never helper — if isMcpTimeout(e): call disposeMCP(), call treeProvider.refresh() (which shows the reconnect node), then show a vscode.window.showErrorMessage with 'MCP timed out — reconnecting…'. Always re-throw so the calling command's catch can exit cleanly.

<!-- Detailed spec. -->

---

<!-- step:wire-handlemcperror-into-the-catch-blocks -->
### Step 3 — Wire handleMcpError into the catch blocks of: doStep, refine (design + idea + plan), chatReply, generate (design, plan, global ctx), closePlan, startPlan, completeStep. These are the commands that make AI-bound MCP tool calls and are most likely to time out.

<!-- Detailed spec. -->

---

<!-- step:build-and-smoke-test-simulate-a -->
### Step 4 — Build and smoke-test: simulate a timeout (temporarily lower AI_TOOL_TIMEOUT_MS to 1ms, trigger doStep), confirm the tree shows the reconnect node and the error message appears.

<!-- Detailed spec. -->

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
