---
type: plan
id: vscode-extension-plan-008
title: "VS Code Polish — Idea Inline Buttons & Minor UX Fixes"
status: implementing
created: 2026-04-23
version: 1
tags: [vscode, polish, ux, inline-buttons]
parent_id: vscode-extension-design
child_ids: []
requires_load: [vscode-extension-design, vscode-extension-plan-006]
design_version: 1
---

# VS Code Polish — Idea Inline Buttons & Minor UX Fixes

## Goal

Fix small UX issues identified during real usage of the extension.

## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 1 | Fix idea node inline buttons — remove `Weave Design`, keep only `Promote To Design`. Set `contextValue = 'idea'` on idea tree nodes; update `package.json` `when` clause for `loom.weaveDesign` to exclude `viewItem == idea` | `packages/vscode/src/tree/treeProvider.ts`, `packages/vscode/package.json` | — |
| ✅ | 2 | Add `reslava-loom.user.name` setting in `package.json` configuration | `packages/vscode/package.json` | — |
| ✅ | 3 | Rename `ai-chats/` → `chats/` in all read/write paths; update `chatNew.ts` to save into `chats/` subdir | `packages/fs/src/utils/pathUtils.ts`, `packages/fs/src/repositories/weaveRepository.ts`, `packages/fs/src/repositories/threadRepository.ts`, `packages/app/src/chatNew.ts` | — |
| ✅ | 4 | Support empty weave/thread dirs: remove `allDocs.length === 0` guard in `loadWeave`; update `listThreadDirs` to include any non-reserved subdir; collapse state for empty nodes | `packages/fs/src/repositories/weaveRepository.ts`, `packages/fs/src/utils/pathUtils.ts`, `packages/vscode/src/tree/treeProvider.ts` | — |
| ✅ | 5 | `loom.weaveCreate` command — prompt for weave ID, create dir, refresh | `packages/vscode/src/commands/weaveCreate.ts` (new), `packages/vscode/src/extension.ts`, `packages/vscode/package.json` | — |
| ✅ | 6 | `loom.threadCreate` command — context-aware via `loom.selectedWeaveId` context key set on tree selection; hide button when no weave/child selected | `packages/vscode/src/commands/threadCreate.ts` (new), `packages/vscode/src/extension.ts`, `packages/vscode/package.json` | — |
| ✅ | 7 | `loom.chatNew` context-aware — route to `{weave}/chats/` or `{weave}/{thread}/chats/` based on selection; hide toolbar button when nothing selected | `packages/vscode/src/commands/chatNew.ts`, `packages/app/src/chatNew.ts`, `packages/vscode/package.json` | 3 |
| ✅ | 8 | Inline rename/delete/archive on all node types | `packages/vscode/src/commands/deleteItem.ts` (new), `packages/vscode/src/commands/archiveItem.ts` (new), `packages/vscode/src/extension.ts`, `packages/vscode/package.json` | — |

## Notes

- `loom.weaveDesign` should only appear on `thread`-level nodes, not on individual idea nodes.
  An idea node already has `Promote To Design` as its primary action — showing both is confusing.
- Root cause: `treeProvider.ts` may be setting idea nodes' `contextValue` to `thread` or leaving
  it unset, causing `when: viewItem == thread` to inadvertently match. Fix by explicitly setting
  `contextValue = 'idea'` and updating all relevant `when` clauses.
