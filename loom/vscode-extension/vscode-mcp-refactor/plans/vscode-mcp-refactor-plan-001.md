---
type: plan
id: pl_01KQYDFDDF0GDECC668E23SX01
title: Refactor VS Code Extension to Use MCP — Plan 001
status: done
created: "2026-04-27T00:00:00.000Z"
updated: "2026-06-06T00:00:00.000Z"
version: 3
tags: [vscode, mcp, implementation]
parent_id: de_01KQYDFDDFZT3CVEBS43EJHVWT
requires_load: [de_01KQYDFDDFZT3CVEBS43EJHVWT]
steps:
  - id: create-the-mcp-client
    order: 1
    status: done
    description: Create the `mcp-client.ts` wrapper — a stdio-based MCP client exposing exactly `readResource`, `callTool`, `callPrompt`.
    files_touched: [packages/vscode/src/mcp-client.ts]
    blocked_by: []
    satisfies: [IN1, C2]
  - id: update-the-tree-provider-to-use
    order: 2
    status: done
    description: "Update the tree provider to use MCP — replace `getState()` calls with `mcp.readResource('loom://state')`."
    files_touched: [packages/vscode/src/tree/treeProvider.ts]
    blocked_by: []
    satisfies: [IN2, C1]
  - id: implement-the-chat-command-via-mcp
    order: 3
    status: done
    description: Implement the chat command via MCP — `loom.chatReply` calls `loom_create_chat` + `loom_generate_chat_reply` with the selected chat node's id.
    files_touched: [packages/vscode/src/commands/chatReply.ts]
    blocked_by: []
    satisfies: [IN3]
  - id: implement-weaveidea-via-mcp-calls-the
    order: 4
    status: done
    description: Implement weaveIdea via MCP — calls the `loom_create_idea` tool.
    files_touched: [packages/vscode/src/commands/weaveIdea.ts]
    blocked_by: []
    satisfies: [IN3]
  - id: implement-the-remaining-commands-via-mcp
    order: 5
    status: done
    description: Implement the remaining commands via MCP — weaveDesign, weavePlan, startPlan, completeStep, closePlan, rename, finalize, chatNew all migrated to MCP tools.
    files_touched: [packages/vscode/src/commands/]
    blocked_by: []
    satisfies: [IN3]
  - id: remove-app-imports-from-the-extension
    order: 6
    status: done
    description: Remove app imports from the extension — all migrated; a few AI-heavy / event-based files intentionally retained app imports where no MCP equivalent existed at the time.
    files_touched: [packages/vscode/]
    blocked_by: []
    satisfies: [IN4, C1]
---
# Refactor VS Code Extension to Use MCP — Plan 001

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Create the `mcp-client.ts` wrapper — a stdio-based MCP client exposing exactly `readResource`, `callTool`, `callPrompt`. | packages/vscode/src/mcp-client.ts | — | IN1, C2 |
| ✅ | 2 | Update the tree provider to use MCP — replace `getState()` calls with `mcp.readResource('loom://state')`. | packages/vscode/src/tree/treeProvider.ts | — | IN2, C1 |
| ✅ | 3 | Implement the chat command via MCP — `loom.chatReply` calls `loom_create_chat` + `loom_generate_chat_reply` with the selected chat node's id. | packages/vscode/src/commands/chatReply.ts | — | IN3 |
| ✅ | 4 | Implement weaveIdea via MCP — calls the `loom_create_idea` tool. | packages/vscode/src/commands/weaveIdea.ts | — | IN3 |
| ✅ | 5 | Implement the remaining commands via MCP — weaveDesign, weavePlan, startPlan, completeStep, closePlan, rename, finalize, chatNew all migrated to MCP tools. | packages/vscode/src/commands/ | — | IN3 |
| ✅ | 6 | Remove app imports from the extension — all migrated; a few AI-heavy / event-based files intentionally retained app imports where no MCP equivalent existed at the time. | packages/vscode/ | — | IN4, C1 |
## Definition of Done

- All app-layer imports removed from `packages/vscode/`.
- Code compiles without errors.
- Tree view displays state from MCP.
- All command buttons call MCP tools/prompts.
- Tests pass (unit tests with MCP client mocked).

## Notes

- Test approach: Option A (minimal) — verify code compiles and logic is correct; defer Extension Host testing (honours `EX1` — live VS Code Extension Host testing is out of scope for this plan).
- Domain logic (validation, state consistency, reducers) stays in app/MCP, never the extension (honours `EX2`).
- Deferred: UI/UX polish (after the architecture refactor).
- MCP server must be running for integration testing.

> **Recovered 2026-06-06** from git commit `d023adb` — the original 6-step table was silently wiped by an earlier doc migration (the old `| # | Step | Status | Notes |` format failed to parse, so the table was overwritten with an empty one). Restored faithfully in the current 6-column format.