---
type: plan
id: pl_01KQYDFDDFQ9DNQR4GBWDMN7WA
title: DoStep Button via MCP Sampling — Plan 002
status: done
created: "2026-04-29T00:00:00.000Z"
version: 1
design_version: 1
tags: [vscode, mcp, sampling, do-step]
parent_id: de_01KQYDFDDFZT3CVEBS43EJHVWT
requires_load: [de_01KQYDFDDFZT3CVEBS43EJHVWT, pl_01KQYDFDDF0GDECC668E23SX01]
target_release: 0.5.0
actual_release: null
---

# DoStep Button via MCP Sampling — Plan 002

Implements the **AI-driven button workflow** described in [loom/refs/loom.md](../../../refs/loom.md):
the user clicks a button, the AI does real work (writes code, writes the `-done.md`),
the plan ticks forward.

Architecture: **Option A — MCP sampling** (decided in chat). The VS Code extension's
MCP thin client implements `sampling/createMessage`, routing inference requests to the
extension's configured AI client. This unlocks every `loom_generate_*` MCP tool from
the extension and keeps AI logic in the MCP server (single source of truth, also
reachable from CLI / Claude Code).

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Add `sampling/createMessage` handler to `mcp-client.ts` | `packages/vscode/src/mcp-client.ts` | — |
| ✅ | 2 | Revert `chatReply.ts` to use `loom_generate_chat_reply` | `packages/vscode/src/commands/chatReply.ts` | — |
| ✅ | 3 | Add `loom_do_step` tool to MCP server | `packages/mcp/src/tools/doStep.ts`, `packages/mcp/src/server.ts` | — |
| ✅ | 4 | Update `loom.doStep` extension command to call MCP | `packages/vscode/src/commands/doStep.ts` | 3 |
| ✅ | 5 | Toolbar button on plan nodes | `packages/vscode/package.json` | — |
| ✅ | 6 | Manual test in Extension Development Host | — | 4, 5 |
## Definition of Done

- `mcp-client.ts` correctly handles `sampling/createMessage` requests; returns inference results to the MCP server.
- `loom.chatReply` works end-to-end via the original sampling flow (no `makeAIClient()` bypass).
- `loom.doStep` button appears on plan nodes in the tree.
- Clicking DoStep on an active plan: implements the next step, marks it done in the plan, writes `-done.md`, refreshes the tree.
- Failure modes (no AI configured, sampling timeout, tool error) surface as readable VS Code error notifications, not silent failures.

## Notes

- This plan depends on the `loom_do_step` MCP tool. If it doesn't exist yet, step 3 must implement it on the server side first.
- After this plan ships, the same sampling handler unlocks future AI buttons (WriteDone, RefineDesign, RefinePlan, PromoteToDesign, etc.) — they just need their corresponding MCP tools.
- Out of scope: `DoSteps` (multi-step) and `DoAllSteps`. Those become trivial loops over `loom.doStep` once step 1 ships.
