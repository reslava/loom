---
type: plan
id: pl_01KQYDFDD8RBD7A0SF3C6MYGCC
title: AI Promote — Chat to Idea
status: done
created: 2026-04-22
version: 1
design_version: 4
tags: [ai, chat, idea, promote, vscode]
parent_id: de_01KQYDFDD88BTYTQ61S0Q9W02V
requires_load: [de_01KQYDFDD88BTYTQ61S0Q9W02V]
target_version: 0.3.0
actual_release: 0.2.0
steps:
  - id: use-case-calls-ai-parses-response
    order: 1
    status: done
    description: "`app/promoteIdea` use-case — calls AI, parses response, saves idea doc"
    files_touched: ["`app/src/promoteIdea.ts`"]
    blocked_by: []
    satisfies: []
  - id: loom
    order: 2
    status: done
    description: "`loom.promoteIdea` command"
    files_touched: ["`vscode/src/commands/promoteIdea.ts`", "`vscode/src/extension.ts`", "`vscode/package.json`"]
    blocked_by: [1]
    satisfies: []
  - id: add-inline-button-on-chat-nodes
    order: 3
    status: done
    description: Add inline button on chat nodes in tree view
    files_touched: ["`vscode/package.json`"]
    blocked_by: [2]
    satisfies: []
  - id: build-smoke-test
    order: 4
    status: done
    description: Build + smoke test
    files_touched: ["`scripts/build-all.sh`"]
    blocked_by: [3]
    satisfies: []
---

# AI Promote — Chat to Idea

## Goal

Implement `loom.promoteIdea`: reads the active `*-chat.md`, sends the conversation to the AI with a structured prompt, and creates a new idea doc in the weave from the AI's response.

This closes the first complete AI loop: **chat → AI reply → promote → idea doc**.


## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | `app/promoteIdea` use-case — calls AI, parses response, saves idea doc | `app/src/promoteIdea.ts` | — | — |
| ✅ | 2 | `loom.promoteIdea` command | `vscode/src/commands/promoteIdea.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 1 | — |
| ✅ | 3 | Add inline button on chat nodes in tree view | `vscode/package.json` | 2 | — |
| ✅ | 4 | Build + smoke test | `scripts/build-all.sh` | 3 | — |
### Notes

- Step 1: `promoteIdea` deps: `{ loadDoc, saveDoc, fs, aiClient, loomRoot }`. Reads chat by `filePath`, calls `aiClient.complete()` with a structured system prompt, parses `TITLE:` line, creates the idea doc.
- Step 2: Command detects active editor file path (same pattern as `chatReply`). If the chat doc has a `parent_id`, uses it as `weaveId`. Otherwise prompts the user.
- Step 3: `contextValue: 'chat'` already exists — add `loom.promoteIdea` as `inline@2` on chat nodes.
- The idea body from the AI replaces `generateIdeaBody` placeholder content entirely.
