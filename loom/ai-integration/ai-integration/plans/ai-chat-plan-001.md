---
type: plan
id: pl_01KQYDFDD840P09SBPJCM9MMTB
title: AI Chat Reply — Core Loop
status: done
created: 2026-04-22
version: 1
design_version: 4
tags: [ai, chat, vscode, core]
parent_id: de_01KQYDFDD88BTYTQ61S0Q9W02V
requires_load: [de_01KQYDFDD88BTYTQ61S0Q9W02V]
target_version: 0.3.0
actual_release: 0.2.0
steps:
  - id: add-to
    order: 1
    status: done
    description: Add `'chat'` to `DocumentType`; add `ChatDoc` entity
    files_touched: ["`core/src/entities/base.ts`", "`core/src/entities/chat.ts`", "`core/src/index.ts`"]
    blocked_by: []
    satisfies: []
  - id: utility
    order: 2
    status: done
    description: "`generateChatId` utility"
    files_touched: ["`core/src/idUtils.ts`"]
    blocked_by: [1]
    satisfies: []
  - id: interface-in
    order: 3
    status: done
    description: "`AIClient` interface in `core`"
    files_touched: ["`core/src/ai.ts`", "`core/src/index.ts`"]
    blocked_by: []
    satisfies: []
  - id: use-case
    order: 4
    status: done
    description: "`app/chatNew` use-case"
    files_touched: ["`app/src/chatNew.ts`"]
    blocked_by: [1, 2]
    satisfies: []
  - id: use-case-2
    order: 5
    status: done
    description: "`app/chatReply` use-case"
    files_touched: ["`app/src/chatReply.ts`"]
    blocked_by: [3]
    satisfies: []
  - id: concrete-factory
    order: 6
    status: done
    description: Concrete `OpenAIClient` + `makeAIClient` factory
    files_touched: ["`vscode/src/ai/openAIClient.ts`", "`vscode/src/ai/makeAIClient.ts`"]
    blocked_by: [3]
    satisfies: []
  - id: vs-code-settings-contribution-provider-apikey
    order: 7
    status: done
    description: VS Code settings contribution (provider, apiKey, model, baseUrl)
    files_touched: ["`vscode/package.json`"]
    blocked_by: []
    satisfies: []
  - id: loom
    order: 8
    status: done
    description: "`loom.chatNew` command"
    files_touched: ["`vscode/src/commands/chatNew.ts`", "`vscode/src/extension.ts`", "`vscode/package.json`"]
    blocked_by: [4, 7]
    satisfies: []
  - id: loom-2
    order: 9
    status: done
    description: "`loom.chatReply` command"
    files_touched: ["`vscode/src/commands/chatReply.ts`", "`vscode/src/extension.ts`", "`vscode/package.json`"]
    blocked_by: [5, 6, 7]
    satisfies: []
  - id: show-chat-docs-in-tree-view
    order: 10
    status: done
    description: Show chat docs in tree view
    files_touched: ["`vscode/src/tree/treeProvider.ts`"]
    blocked_by: [1]
    satisfies: []
  - id: build-all-smoke-test-end-to
    order: 11
    status: done
    description: Build all + smoke test end-to-end
    files_touched: ["`scripts/build-all.sh`"]
    blocked_by: [10]
    satisfies: []
---

# AI Chat Reply — Core Loop

## Goal

Implement the minimum viable AI chat loop:
1. `loom.chatNew` — creates a weave-scoped `*-chat.md` document
2. `loom.chatReply` — reads the open chat doc, calls the configured AI provider, appends `## AI:` block

Provider is configurable (DeepSeek / OpenAI-compatible API). Full chat history sent on every call (no summarization yet).


## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add `'chat'` to `DocumentType`; add `ChatDoc` entity | `core/src/entities/base.ts`, `core/src/entities/chat.ts`, `core/src/index.ts` | — | — |
| ✅ | 2 | `generateChatId` utility | `core/src/idUtils.ts` | 1 | — |
| ✅ | 3 | `AIClient` interface in `core` | `core/src/ai.ts`, `core/src/index.ts` | — | — |
| ✅ | 4 | `app/chatNew` use-case | `app/src/chatNew.ts` | 1, 2 | — |
| ✅ | 5 | `app/chatReply` use-case | `app/src/chatReply.ts` | 3 | — |
| ✅ | 6 | Concrete `OpenAIClient` + `makeAIClient` factory | `vscode/src/ai/openAIClient.ts`, `vscode/src/ai/makeAIClient.ts` | 3 | — |
| ✅ | 7 | VS Code settings contribution (provider, apiKey, model, baseUrl) | `vscode/package.json` | — | — |
| ✅ | 8 | `loom.chatNew` command | `vscode/src/commands/chatNew.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 4, 7 | — |
| ✅ | 9 | `loom.chatReply` command | `vscode/src/commands/chatReply.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 5, 6, 7 | — |
| ✅ | 10 | Show chat docs in tree view | `vscode/src/tree/treeProvider.ts` | 1 | — |
| ✅ | 11 | Build all + smoke test end-to-end | `scripts/build-all.sh` | 10 | — |
### Notes

- Steps 1–3 are `core` changes — rebuild `core` before `app`. Rebuild `app` before `vscode`.
- Step 6: the client only needs `fetch` (Node 18+) or the `openai` npm package. Prefer `openai` SDK — DeepSeek is API-compatible with it.
- Step 9: `chatReply` detects the currently open editor file. If it's not a `*-chat.md`, show an error message.
- Step 10: chat nodes appear under their weave, below plans. `contextValue: 'chat'`. Inline button: `loom.chatReply`.
