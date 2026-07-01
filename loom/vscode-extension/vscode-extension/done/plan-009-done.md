---
type: done
id: pl_01KR0M5S5FZ13J6RNX6T3TKHRG-done
title: Done — Update Toggle Archived button icon for enabled/disabled states
status: done
created: "2026-05-07T00:00:00.000Z"
version: 4
tags: []
parent_id: pl_01KR0M5S5FZ13J6RNX6T3TKHRG
requires_load: []
---
# Done — Update Toggle Archived button icon for enabled/disabled states

## Step 1 — Locate the source file (e.g., in `packages/vscode` extension code) where the button is rendered or its icon is set.

Located the button icon source in `packages/vscode/package.json`:
- Command definition: `loom.toggleArchived` at ~lines 210-216 with static `media/icons/archive.svg` for both light/dark
- Menu contribution: `view/title` section at ~lines 408-412, shown when `view == loom.threads`
- Toggle logic: `packages/vscode/src/commands/filter.ts` — `toggleArchived()` flips `viewState.showArchived`
- Context key pattern: `packages/vscode/src/extension.ts` uses `vscode.commands.executeCommand('setContext', ...)` for other booleans (e.g. `loom.aiEnabled`)
- No context key for `showArchived` exists yet — it will need to be added for the conditional icon approach

## Step 2 — Add a conditional check for the button's enabled/disabled state.

Added `loom.showArchived` VS Code context key tracking:

1. `packages/vscode/src/commands/filter.ts` — `toggleArchived()` now captures the new boolean, then calls `vscode.commands.executeCommand('setContext', 'loom.showArchived', newState)` after updating the manager.
2. `packages/vscode/src/extension.ts` — Added one-liner immediately after `ViewStateManager` construction: `vscode.commands.executeCommand('setContext', 'loom.showArchived', viewStateManager.getState().showArchived)` so the context key reflects the persisted value at activation time.

This context key will be used in `package.json` `when` clauses in steps 3 and 4 to show the appropriate icon for each toggle state.

## Step 3 — Set the icon to `packages/vscode/media/icons/archive.svg` when enabled.

Updated `packages/vscode/package.json` menu contribution for `loom.toggleArchived`:
- Changed `when` from `"view == loom.threads"` to `"view == loom.threads && loom.showArchived"`
- The command definition's icon (`media/icons/archive.svg` for both light/dark) is unchanged — it already had the correct SVG
- Result: the filled archive.svg icon now only appears when `loom.showArchived` context key is true (archived panel is currently open/active)

## Step 4 — Set the icon to the Codeicon `Archive` icon (via CSS class `codicon-archive` or equivalent SVG) when disabled.

Added disabled-state icon via a companion command pattern (standard VS Code toggle approach):

1. `packages/vscode/package.json` — Added new command `loom.toggleArchivedOff` with `"icon": "$(archive)"` (the codicon, shown as the outline/inactive icon) in `contributes.commands`, immediately after the existing `loom.toggleArchived` entry.
2. `packages/vscode/package.json` — Added menu entry for `loom.toggleArchivedOff` in `view/title` with `when: "view == loom.threads && !loom.showArchived"` at `group: "navigation@5"` — the same slot as the enabled variant, so only one is ever visible.
3. `packages/vscode/src/extension.ts` — Registered `loom.toggleArchivedOff` pointing to the same `toggleArchived(viewStateManager, treeProvider)` handler.

Result: the toolbar now shows `$(archive)` codicon when archive is hidden, and `archive.svg` when archive is showing.
