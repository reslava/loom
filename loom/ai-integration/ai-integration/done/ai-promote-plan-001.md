---
type: plan
id: ai-promote-plan-001
title: "AI Promote — Chat to Idea"
status: done
created: 2026-04-22
version: 1
tags: [ai, chat, idea, promote, vscode]
parent_id: ai-integration-design
child_ids: []
requires_load: [ai-integration-design]
design_version: 3
target_version: "0.3.0"
steps: []
---

# AI Promote — Chat to Idea

## Goal

Implement `loom.promoteIdea`: reads the active `*-chat.md`, sends the conversation to the AI with a structured prompt, and creates a new idea doc in the weave from the AI's response.

This closes the first complete AI loop: **chat → AI reply → promote → idea doc**.

## Decisions

- **Mode:** Chat Mode only (no JSON handshake). The AI returns a plain-text title on the first line and the idea body below. Simpler than Action Mode, easier to validate.
- **Output format:** AI responds with:
  ```
  TITLE: <one-line idea title>

  <idea body in Markdown>
  ```
- **Idea creation:** Reuses `app/weaveIdea` internals — same frontmatter, same `generateIdeaBody` template but with AI content injected as body.
- **Weave ID:** Derived from the chat doc's `parent_id` field (set when the chat was created via `loom.chatNew`). Falls back to prompting the user if `parent_id` is null (workspace-level chats).
- **No auto-finalize:** The created idea starts as `draft` status. User reviews and finalizes manually.

## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 1 | `app/promoteIdea` use-case — calls AI, parses response, saves idea doc | `app/src/promoteIdea.ts` | — |
| ✅ | 2 | `loom.promoteIdea` command | `vscode/src/commands/promoteIdea.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 1 |
| ✅ | 3 | Add inline button on chat nodes in tree view | `vscode/package.json` | 2 |
| ✅ | 4 | Build + smoke test | `scripts/build-all.sh` | 3 |

## Notes

- Step 1: `promoteIdea` deps: `{ loadDoc, saveDoc, fs, aiClient, loomRoot }`. Reads chat by `filePath`, calls `aiClient.complete()` with a structured system prompt, parses `TITLE:` line, creates the idea doc.
- Step 2: Command detects active editor file path (same pattern as `chatReply`). If the chat doc has a `parent_id`, uses it as `weaveId`. Otherwise prompts the user.
- Step 3: `contextValue: 'chat'` already exists — add `loom.promoteIdea` as `inline@2` on chat nodes.
- The idea body from the AI replaces `generateIdeaBody` placeholder content entirely.
