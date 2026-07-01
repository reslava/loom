---
type: plan
id: pl_01KQYDFDDEEXYF1QV01H62GX1C
title: Wire thread & chat custom SVG icons
status: done
created: "2026-04-24T00:00:00.000Z"
version: 1
tags: [vscode, icons, thread, chat]
parent_id: de_01KQYDFDDEC8J06R4624YH86QZ
requires_load: [de_01KQYDFDDEC8J06R4624YH86QZ]
steps:
  - id: add-to-map-fallback
    order: 1
    status: done
    description: "Add `thread` to `Icons` map + `CodiconMap` (fallback: `git-branch`). Add `getThreadIcon(status)`."
    files_touched: ["`packages/vscode/src/icons.ts`"]
    blocked_by: []
    satisfies: []
  - id: wire-in-replaces
    order: 2
    status: done
    description: Wire `getThreadIcon` in `createThreadNode` (replaces `getWeaveIcon`).
    files_touched: ["`packages/vscode/src/tree/treeProvider.ts`"]
    blocked_by: []
    satisfies: []
  - id: add-to-map-fallback-2
    order: 3
    status: done
    description: "Add `chat` to `Icons` map + `CodiconMap` (fallback: `comment-discussion`)."
    files_touched: ["`packages/vscode/src/icons.ts`"]
    blocked_by: []
    satisfies: []
  - id: wire-icon-icons
    order: 4
    status: done
    description: Wire `icon(Icons.chat)` in `createChatNode` (replaces hardcoded `ThemeIcon`).
    files_touched: ["`packages/vscode/src/tree/treeProvider.ts`"]
    blocked_by: []
    satisfies: []
  - id: add-to-chat-docs-surfacing-as
    order: 5
    status: done
    description: Add `case 'chat'` to `getDocumentIcon` — chat docs surfacing as loose fibers were hitting `default` → design icon.
    files_touched: ["`packages/vscode/src/icons.ts`"]
    blocked_by: []
    satisfies: []
---

# Wire thread & chat custom SVG icons

| | |
|---|---|
| **Created** | 2026-04-24 |
| **Status** | DONE |
| **Design** | `vscode-icons-design.md` |

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add `thread` to `Icons` map + `CodiconMap` (fallback: `git-branch`). Add `getThreadIcon(status)`. | `packages/vscode/src/icons.ts` | — | — |
| ✅ | 2 | Wire `getThreadIcon` in `createThreadNode` (replaces `getWeaveIcon`). | `packages/vscode/src/tree/treeProvider.ts` | — | — |
| ✅ | 3 | Add `chat` to `Icons` map + `CodiconMap` (fallback: `comment-discussion`). | `packages/vscode/src/icons.ts` | — | — |
| ✅ | 4 | Wire `icon(Icons.chat)` in `createChatNode` (replaces hardcoded `ThemeIcon`). | `packages/vscode/src/tree/treeProvider.ts` | — | — |
| ✅ | 5 | Add `case 'chat'` to `getDocumentIcon` — chat docs surfacing as loose fibers were hitting `default` → design icon. | `packages/vscode/src/icons.ts` | — | — |