---
type: done
id: pl_01KR1QSQ3V1KK0SGNNYZ5HZJHA-done
title: Done — Unify MCP timeout handling
status: done
created: "2026-05-07T00:00:00.000Z"
version: 4
tags: []
parent_id: pl_01KR1QSQ3V1KK0SGNNYZ5HZJHA
requires_load: []
---
# Done — Unify MCP timeout handling

## Step 1 — Extract isMcpTimeout(e: unknown): boolean helper — checks e.message for '32001' or 'timed out', matching the logic already in treeProvider.ts getRootChildren.

Created `packages/vscode/src/mcpErrorUtils.ts` with `isMcpTimeout(e: unknown): boolean`. Checks `e.message` for `'32001'` or `'timed out'`, matching the existing inline logic in `treeProvider.ts` `getRootChildren` catch block.

## Step 2 — Extract handleMcpError(e: unknown, treeProvider: LoomTreeProvider): never helper — if isMcpTimeout(e): call disposeMCP(), call treeProvider.refresh() (which shows the reconnect node), then show a vscode.window.showErrorMessage with 'MCP timed out — reconnecting…'. Always re-throw so the calling command's catch can exit cleanly.

Added `handleMcpError(e: unknown, treeProvider: LoomTreeProvider): never` to `packages/vscode/src/mcpErrorUtils.ts`. Imports `disposeMCP` from `./mcp-client` and `LoomTreeProvider` from `./tree/treeProvider`. On timeout: calls `disposeMCP()`, `treeProvider.refresh()`, shows error message `'MCP timed out — reconnecting…'`. Always re-throws `e` so callers' catch blocks exit cleanly.

## Step 3 — Wire handleMcpError into the catch blocks of: doStep, refine (design + idea + plan), chatReply, generate (design, plan, global ctx), closePlan, startPlan, completeStep. These are the commands that make AI-bound MCP tool calls and are most likely to time out.

Wired `handleMcpError(e, treeProvider)` into catch blocks of all listed commands:

**Separate command files** (added `handleMcpError` import + replaced catch body):
- `commands/refine.ts` — refineCommand (design)
- `commands/refineIdea.ts` — refineIdeaCommand
- `commands/refinePlan.ts` — refinePlanCommand
- `commands/chatReply.ts` — added `treeProvider: LoomTreeProvider` param (was missing), added import, replaced catch
- `commands/weaveDesign.ts` — generate design
- `commands/weavePlan.ts` — generate plan
- `commands/closePlan.ts`
- `commands/startPlan.ts`
- `commands/completeStep.ts`

**extension.ts** (inline commands — added `handleMcpError` import, replaced 4 catch blocks):
- `loom.refreshCtx` (covers `loom_refresh_ctx` + `loom_generate_global_ctx`)
- `loom.generateDesign`
- `loom.generatePlan`
- `loom.generateGlobalCtx`
- Updated `loom.chatReply` registration to pass `treeProvider`

**`doStep.ts` was skipped** — it launches Claude in a terminal and makes no direct MCP tool calls; no timeout-able MCP catch block exists.

## Step 4 — Build and smoke-test: simulate a timeout (temporarily lower AI_TOOL_TIMEOUT_MS to 1ms, trigger doStep), confirm the tree shows the reconnect node and the error message appears.

Build and type-check passed cleanly:
- `npx tsc --noEmit` → 0 type errors
- `npm run package` → VSIX built successfully (378.92 KB, `loom-vscode-0.1.0.vsix`)
- Bundle contains both timeout strings: existing `"MCP timed out — click to reconnect"` (treeProvider) and new `"MCP timed out — reconnecting…"` (handleMcpError). esbuild inlines small helpers, so strings confirm the code is present.

Interactive smoke test (lower `AI_TOOL_TIMEOUT_MS` to 1ms → trigger refine/generateDesign/chatReply → confirm reconnect node + error message) requires a running VS Code Extension Host — not automatable here. Recommend Rafa run this manually by: (1) temporarily setting `AI_TOOL_TIMEOUT_MS = 1` in `mcp-client.ts`, (2) installing the VSIX, (3) triggering Refine Design on any node, (4) confirming the tree shows the reconnect node and the "MCP timed out — reconnecting…" notification appears.
