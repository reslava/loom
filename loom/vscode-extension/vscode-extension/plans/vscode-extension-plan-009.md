---
type: plan
id: pl_01KR0M5S5FZ13J6RNX6T3TKHRG
title: Update Toggle Archived button icon for enabled/disabled states
status: done
created: 2026-05-07
updated: 2026-06-06
version: 3
tags: []
parent_id: ch_01KR0EWEQMBSK5HJ1D0YGJ0R0K
requires_load: []
actual_release: 0.5.0
steps:
  - id: locate-the-source-file-e
    order: 1
    status: done
    description: Locate the source file (e.g., in `packages/vscode` extension code) where the button is rendered or its icon is set.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-a-conditional-check-for-the
    order: 2
    status: done
    description: Add a conditional check for the button's enabled/disabled state.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: set-the-icon-to-packages-vscode
    order: 3
    status: done
    description: Set the icon to `packages/vscode/media/icons/archive.svg` when enabled.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: set-the-icon-to-the-codeicon
    order: 4
    status: done
    description: Set the icon to the Codeicon `Archive` icon (via CSS class `codicon-archive` or equivalent SVG) when disabled.
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Update Toggle Archived button icon for enabled/disabled states

## Goal
Implement distinct icons for the "Toggle Archived" extension toolbar button: use the current `archive.svg` when enabled and the Codeicon `Archive` icon when disabled.

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Locate the source file (e.g., in `packages/vscode` extension code) where the button is rendered or its icon is set. | — | — | — |
| ✅ | 2 | Add a conditional check for the button's enabled/disabled state. | — | — | — |
| ✅ | 3 | Set the icon to `packages/vscode/media/icons/archive.svg` when enabled. | — | — | — |
| ✅ | 4 | Set the icon to the Codeicon `Archive` icon (via CSS class `codicon-archive` or equivalent SVG) when disabled. | — | — | — |
## Notes
- The implementation method depends on whether the button is defined via `package.json` commands (no native state-based icon support) or custom-rendered in a webview/tree view — confirm before coding.
- If using a webview, the icon swap can be done by toggling a CSS class on the button element.
