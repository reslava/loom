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

| ✅ | 9 | `reference` doc type in icons — add `reference` key to `Icons` + `CodiconMap` (codicon `references`); add `refs` folder icon entry (codicon `library`); update `getDocumentIcon` to return `reference` icon for `type === 'reference'` | `packages/vscode/src/icons.ts` | — |
| ✅ | 10 | `refs/` folder in tree — `refs` already in `RESERVED_SUBDIR_NAMES`; load `{weave}/refs/` and `{weave}/{thread}/refs/` docs into `refDocs` on Weave/Thread; add `refDocs` field to core entities; render as "References" section via `createRefsSection` in treeProvider | `packages/core/src/entities/weave.ts`, `packages/core/src/entities/thread.ts`, `packages/core/src/applyEvent.ts`, `packages/fs/src/repositories/weaveRepository.ts`, `packages/fs/src/repositories/threadRepository.ts`, `packages/vscode/src/tree/treeProvider.ts` | 9 |
| ✅ | 11 | GroupBy type — add `reference` group to `groupByType` | `packages/vscode/src/tree/treeProvider.ts` | 9 |
| ✅ | 12 | Default grouping = `thread` — already set in `defaultViewState`; no change needed | `packages/vscode/src/view/viewState.ts` | — |
| ✅ | 13 | Toolbar status filter presets — new command `loom.setStatusFilter` with quick-pick: "All"/"Active"/"Implementing"; added to toolbar `navigation@8`; archive/refresh shifted to @9/@10 | `packages/vscode/src/commands/filter.ts`, `packages/vscode/src/extension.ts`, `packages/vscode/package.json` | — |

| ✅ | 14 | Global context files — add `globalDocs: LoomDoc[]` field to `LoomState` in `packages/core/src/entities/state.ts`; update `getState.ts` to scan `{loomRoot}/*.md` (outside any weave dir) and populate `globalDocs`; render as top-level "Global Context" section in treeProvider; add toolbar button `loom.generateGlobalCtx` (icon `book`) to generate/refine global ctx via MCP | `packages/core/src/entities/state.ts`, `packages/app/src/getState.ts`, `packages/vscode/src/tree/treeProvider.ts`, `packages/vscode/src/extension.ts`, `packages/vscode/package.json` | — |
| ✅ | 15 | Filter by status at thread level — change filter logic so weaves always show but only threads matching `statusFilter` are included; use custom SVG icon `packages/vscode/media/icons/filter.svg` for `loom.setStatusFilter` command; move its toolbar position one slot left (navigation@7, push archive/refresh to @8/@9) | `packages/vscode/src/tree/treeProvider.ts`, `packages/vscode/package.json` | — |
| ✅ | 16 | Filter by text icon — change `loom.setTextFilter` command icon to codicon `search` (magnifying glass) in `package.json` | `packages/vscode/package.json` | — |
| ✅ | 17 | Thread constraint inline buttons — set `contextValue` on thread nodes to encode which doc types already exist (e.g. `thread-has-idea`, `thread-has-idea-design`); in `package.json` `when` clauses: hide `loom.generateIdea` when thread already has an idea; hide `loom.generateDesign` when thread already has a design; swap `loom.generateCtx` → `loom.refineCtx` when thread already has a ctx | `packages/vscode/src/tree/treeProvider.ts`, `packages/vscode/package.json` | — |
| ✅ | 18 | MCP timeout recovery — catch `MCP error -32001` in `treeProvider.getChildren`; on timeout show an error node with "⚠ MCP timed out — click to retry" that triggers `treeProvider.refresh()`; also register a `loom.retryMcp` command wired to a tree-title button so the user can recover without restarting VS Code | `packages/vscode/src/tree/treeProvider.ts`, `packages/vscode/src/extension.ts`, `packages/vscode/package.json` | — |

## Notes

- `loom.weaveDesign` should only appear on `thread`-level nodes, not on individual idea nodes.
  An idea node already has `Promote To Design` as its primary action — showing both is confusing.
- Root cause: `treeProvider.ts` may be setting idea nodes' `contextValue` to `thread` or leaving
  it unset, causing `when: viewItem == thread` to inadvertently match. Fix by explicitly setting
  `contextValue = 'idea'` and updating all relevant `when` clauses.
