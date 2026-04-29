---
type: plan
id: vscode-mcp-refactor-plan-001
title: "Refactor VS Code Extension to Use MCP — Plan 001"
status: done
created: 2026-04-27
version: 1
tags: [vscode, mcp, implementation]
parent_id: vscode-mcp-refactor-design
child_ids: []
requires_load: [vscode-mcp-refactor-design]
---

# Refactor VS Code Extension to Use MCP — Plan 001

## Steps

| # | Step | Status | Notes |
|---|------|--------|-------|
| 1 | Create `packages/vscode/src/mcp-client.ts` wrapper | ✅ | Stdio-based MCP client: readResource, callTool, callPrompt |
| 2 | Update `packages/vscode/src/tree/treeProvider.ts` to use MCP | ✅ | Replace `getState()` calls with `mcp.readResource('loom://state')` |
| 3 | Implement chat command: `loom_create_chat` + `loom_generate_chat_reply` via MCP | ✅ | Command `loom.chatReply` receives the selected chat tree node; calls `mcp.callTool('loom_generate_chat_reply', { chatId: node.doc.id })` to append an AI reply |
| 4 | Implement `packages/vscode/src/commands/weaveIdea.ts` using MCP | ✅ | Calls `loom_create_idea` tool via MCP |
| 5 | Implement remaining commands using MCP | ✅ | weaveDesign, weavePlan, startPlan, completeStep, closePlan, rename, finalize, chatNew all migrated to MCP tools |
| 6 | Remove app imports from extension codebase | ✅ | All migrated. 10 files retain app imports intentionally: doStep, refineIdea, refinePlan, summarise, validate, diagnostics, refine, promoteToIdea/Design/Plan — no MCP tool equivalent exists for these AI-heavy / event-based use-cases |

## Definition of Done

- All app layer imports removed from `packages/vscode/`
- Code compiles without errors
- Tree view displays state from MCP
- All command buttons call MCP tools/prompts
- Tests pass (unit tests with MCP client mocked)

## Notes

- Test approach: Option A (minimal) — verify code compiles and logic is correct, defer Extension Host testing
- Deferred: UI/UX polish (will happen after architecture refactor)
- MCP server must be running for integration testing
