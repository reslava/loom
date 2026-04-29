---
type: plan
id: vscode-mcp-refactor-plan-002
title: "DoStep Button via MCP Sampling — Plan 002"
status: draft
created: 2026-04-29
version: 1
tags: [vscode, mcp, sampling, do-step]
parent_id: vscode-mcp-refactor-design
child_ids: []
requires_load: [vscode-mcp-refactor-design, vscode-mcp-refactor-plan-001]
target_release: "0.5.0"
actual_release: null
design_version: 1
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

| # | Step | Status | Notes |
|---|------|--------|-------|
| 1 | Add `sampling/createMessage` handler to `mcp-client.ts` | ⬜ | Register on the stdio client. Handler reads prompt + system msg from request, calls existing `makeAIClient().complete(...)`, returns result in MCP sampling format. |
| 2 | Revert `chatReply.ts` to use `loom_generate_chat_reply` | ⬜ | Remove the `makeAIClient()` bypass added in plan-001 step 3. Now that step 1 is in place, the original sampling-based flow works. |
| 3 | Verify `loom_do_step` tool exists on MCP server (add if missing) | ⬜ | Tool reads next non-blocked step + thread context, builds prompt, calls `server.createMessage`, applies file edits, marks step done via app, writes the matching `-done.md`. |
| 4 | Add `loom.doStep` extension command | ⬜ | New file `packages/vscode/src/commands/doStep.ts`. Receives selected plan node; calls `mcp.callTool('loom_do_step', { planId: node.doc.id })`; refreshes tree. |
| 5 | Add toolbar button on plan nodes | ⬜ | `package.json` contributions: command icon + `view/item/context` entry with `when: viewItem == plan && viewItem != plan-done`. Inline-only, not in context menu. |
| 6 | Manual test in Extension Development Host | ⬜ | Build extension, reload window, select an active plan, click DoStep. Verify: code edits applied, plan step marked ✅, `-done.md` updated, tree refreshed. |

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
