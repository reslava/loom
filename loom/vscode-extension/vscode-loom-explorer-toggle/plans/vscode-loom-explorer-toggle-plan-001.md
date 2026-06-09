---
type: plan
id: pl_01KR478CKGVA1VHR1S8JTJJJW4
title: Add toolbar button to toggle Loom document-to-tree synchronization
status: done
created: "2026-05-08T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 1
tags: []
parent_id: id_01KR44SK18Q6X2DS730RTRBDN8
requires_load: []
steps:
  - id: add-a-new-boolean-state-variable
    order: 1
    status: done
    description: Add a new boolean state variable (e.g., `syncDocToTreeEnabled`) in the Loom Explorer state/context, defaulting to `true`.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: create-a-toolbar-button-component-that
    order: 2
    status: done
    description: Create a toolbar button component that uses two codeicon icons (e.g., `sync-ignored` and `sync-enabled`) and toggles the state on click.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: modify-the-document-open-handler-to
    order: 3
    status: done
    description: Modify the document-open handler to only sync the opened Loom document to the tree when `syncDocToTreeEnabled` is `true`.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: ensure-tree-node-click-still-always
    order: 4
    status: done
    description: Ensure tree node click still always opens the corresponding Loom document regardless of the toggle state.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: persist-the-toggle-state-e
    order: 5
    status: done
    description: Persist the toggle state (e.g., in extension settings or workspace state) so it survives reloads.
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Add toolbar button to toggle Loom document-to-tree synchronization

## Goal
Implement a toggle button in the toolbar that enables or disables synchronization from Loom documents to the tree view, while keeping tree-to-document sync always active.

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a new boolean state variable (e.g., `syncDocToTreeEnabled`) in the Loom Explorer state/context, defaulting to `true`. | — | — | — |
| ✅ | 2 | Create a toolbar button component that uses two codeicon icons (e.g., `sync-ignored` and `sync-enabled`) and toggles the state on click. | — | — | — |
| ✅ | 3 | Modify the document-open handler to only sync the opened Loom document to the tree when `syncDocToTreeEnabled` is `true`. | — | — | — |
| ✅ | 4 | Ensure tree node click still always opens the corresponding Loom document regardless of the toggle state. | — | — | — |
| ✅ | 5 | Persist the toggle state (e.g., in extension settings or workspace state) so it survives reloads. | — | — | — |
### Notes
- The toggle should not affect the tree-to-document direction at all.
- Use distinct, clear icons for enabled/disabled states from the built-in codeicon library.