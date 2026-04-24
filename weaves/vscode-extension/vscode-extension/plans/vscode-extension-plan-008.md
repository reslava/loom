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

## Notes

- `loom.weaveDesign` should only appear on `thread`-level nodes, not on individual idea nodes.
  An idea node already has `Promote To Design` as its primary action — showing both is confusing.
- Root cause: `treeProvider.ts` may be setting idea nodes' `contextValue` to `thread` or leaving
  it unset, causing `when: viewItem == thread` to inadvertently match. Fix by explicitly setting
  `contextValue = 'idea'` and updating all relevant `when` clauses.
