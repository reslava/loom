---
type: plan
id: vscode-icons-plan-002
title: "Wire thread & chat custom SVG icons"
status: done
created: 2026-04-24
version: 1
tags: [vscode, icons, thread, chat]
parent_id: vscode-icons-design
child_ids: []
requires_load: [vscode-icons-design]
---

# Plan — Wire thread & chat custom SVG icons

| | |
|---|---|
| **Created** | 2026-04-24 |
| **Status** | DONE |
| **Design** | `vscode-icons-design.md` |

## Steps

| Done | # | Step | Files touched |
|------|---|------|---------------|
| ✅ | 1 | Add `thread` to `Icons` map + `CodiconMap` (fallback: `git-branch`). Add `getThreadIcon(status)`. | `packages/vscode/src/icons.ts` |
| ✅ | 2 | Wire `getThreadIcon` in `createThreadNode` (replaces `getWeaveIcon`). | `packages/vscode/src/tree/treeProvider.ts` |
| ✅ | 3 | Add `chat` to `Icons` map + `CodiconMap` (fallback: `comment-discussion`). | `packages/vscode/src/icons.ts` |
| ✅ | 4 | Wire `icon(Icons.chat)` in `createChatNode` (replaces hardcoded `ThemeIcon`). | `packages/vscode/src/tree/treeProvider.ts` |
| ✅ | 5 | Add `case 'chat'` to `getDocumentIcon` — chat docs surfacing as loose fibers were hitting `default` → design icon. | `packages/vscode/src/icons.ts` |
