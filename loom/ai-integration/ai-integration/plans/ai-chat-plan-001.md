---
type: plan
id: pl_01KQYDFDD840P09SBPJCM9MMTB
title: AI Chat Reply — Core Loop
status: done
created: "2026-04-22T00:00:00.000Z"
version: 1
design_version: 3
tags: [ai, chat, vscode, core]
parent_id: de_01KQYDFDD88BTYTQ61S0Q9W02V
requires_load: [de_01KQYDFDD88BTYTQ61S0Q9W02V]
target_version: 0.3.0
steps: []
---

# AI Chat Reply — Core Loop

## Goal

Implement the minimum viable AI chat loop:
1. `loom.chatNew` — creates a weave-scoped `*-chat.md` document
2. `loom.chatReply` — reads the open chat doc, calls the configured AI provider, appends `## AI:` block

Provider is configurable (DeepSeek / OpenAI-compatible API). Full chat history sent on every call (no summarization yet).

## Decisions

- **Chat doc type:** New `type: chat` added to `DocumentType` in `core`.
- **Chat doc location:** `weaves/{weaveId}/{weaveId}-chat-{NNN}.md` for weave-scoped chats. `weaves/ai-chats/` reserved for workspace-level meta-conversations (not managed by commands).
- **Naming:** `{weaveId}-chat-001`, `{weaveId}-chat-002`, … (auto-incremented, same pattern as plan IDs).
- **Conversation format:** `## Rafa:` / `## AI:` headers, parsed from raw Markdown. No structured frontmatter for turns.
- **Context strategy:** Send full history on every call. Summarization deferred.
- **Provider abstraction:** `AIClient` interface in `core`. Concrete OpenAI-compatible client in `vscode/src/ai/`. Injected via `deps` in `app` use-cases (standard pattern).

## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 1 | Add `'chat'` to `DocumentType`; add `ChatDoc` entity | `core/src/entities/base.ts`, `core/src/entities/chat.ts`, `core/src/index.ts` | — |
| ✅ | 2 | `generateChatId` utility | `core/src/idUtils.ts` | 1 |
| ✅ | 3 | `AIClient` interface in `core` | `core/src/ai.ts`, `core/src/index.ts` | — |
| ✅ | 4 | `app/chatNew` use-case | `app/src/chatNew.ts` | 1, 2 |
| ✅ | 5 | `app/chatReply` use-case | `app/src/chatReply.ts` | 3 |
| ✅ | 6 | Concrete `OpenAIClient` + `makeAIClient` factory | `vscode/src/ai/openAIClient.ts`, `vscode/src/ai/makeAIClient.ts` | 3 |
| ✅ | 7 | VS Code settings contribution (provider, apiKey, model, baseUrl) | `vscode/package.json` | — |
| ✅ | 8 | `loom.chatNew` command | `vscode/src/commands/chatNew.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 4, 7 |
| ✅ | 9 | `loom.chatReply` command | `vscode/src/commands/chatReply.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 5, 6, 7 |
| ✅ | 10 | Show chat docs in tree view | `vscode/src/tree/treeProvider.ts` | 1 |
| ✅ | 11 | Build all + smoke test end-to-end | `scripts/build-all.sh` | 10 |

## Notes

- Steps 1–3 are `core` changes — rebuild `core` before `app`. Rebuild `app` before `vscode`.
- Step 6: the client only needs `fetch` (Node 18+) or the `openai` npm package. Prefer `openai` SDK — DeepSeek is API-compatible with it.
- Step 9: `chatReply` detects the currently open editor file. If it's not a `*-chat.md`, show an error message.
- Step 10: chat nodes appear under their weave, below plans. `contextValue: 'chat'`. Inline button: `loom.chatReply`.
