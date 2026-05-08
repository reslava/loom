---
type: done
id: pl_01KR478CKGVA1VHR1S8JTJJJW4-done
title: Done — Add toolbar button to toggle Loom document-to-tree synchronization
status: done
created: "2026-05-08T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KR478CKGVA1VHR1S8JTJJJW4
requires_load: []
---
# Done — Add toolbar button to toggle Loom document-to-tree synchronization

## Step 1 — Add a new boolean state variable (e.g., `syncDocToTreeEnabled`) in the Loom Explorer state/context, defaulting to `true`.

Added `syncDocToTreeEnabled: boolean` to the `ViewState` interface and set it to `true` in `defaultViewState` in `packages/vscode/src/view/viewState.ts`. The field will be persisted automatically by `ViewStateManager` which already serialises the full `ViewState` to `workspaceState` under the key `loom.viewState`.

## Step 2 — Create a toolbar button component that uses two codeicon icons (e.g., `sync-ignored` and `sync-enabled`) and toggles the state on click.

Added toolbar toggle button using the same two-command / context-key pattern as `loom.toggleArchived` / `loom.toggleArchivedOff`.

**package.json:**
- Two commands: `loom.toggleSyncDocToTree` (icon `$(eye)`, shown when sync is enabled — click to disable) and `loom.toggleSyncDocToTreeOff` (icon `$(eye-closed)`, shown when sync is disabled — click to enable).
- Two `view/title` menu entries at `navigation@6` with `when` clauses on `loom.syncDocToTreeEnabled` context key. `loom.refresh` shifted to `navigation@7`.

**extension.ts:**
- Context key `loom.syncDocToTreeEnabled` initialised from persisted `viewState` immediately after `ViewStateManager` is created.
- Both `loom.toggleSyncDocToTree` and `loom.toggleSyncDocToTreeOff` registered; each flips the boolean, calls `viewStateManager.update()`, and updates the context key so VS Code swaps the visible button instantly.

## Step 3 — Modify the document-open handler to only sync the opened Loom document to the tree when `syncDocToTreeEnabled` is `true`.

Added an early-return guard to `onDidChangeActiveTextEditor` in `extension.ts`: `if (!viewStateManager.getState().syncDocToTreeEnabled) return;` — placed immediately after the `!editor` guard, before any `treeProvider` or `treeView` calls. When the toggle is off, the handler exits without revealing the node, so no doc→tree sync occurs.

## Step 4 — Ensure tree node click still always opens the corresponding Loom document regardless of the toggle state.

No code change needed. Verified in `treeProvider.ts` (lines 546–644): every document/chat/plan/done `TreeNode` is assigned `node.command = { command: 'vscode.open', arguments: [vscode.Uri.file(filePath)] }`. VS Code executes this command directly when the user clicks the node — it is not mediated by `onDidChangeActiveTextEditor` or any handler we touched. The Step 3 guard only blocks the reverse path (doc→tree reveal); the tree→doc `vscode.open` fires unconditionally regardless of `syncDocToTreeEnabled`.

## Step 5 — Persist the toggle state (e.g., in extension settings or workspace state) so it survives reloads.

No additional code needed — persistence is already wired by the existing `ViewStateManager` infrastructure.

**Why it already works:**
- `ViewStateManager` constructor: `this.state = { ...defaultViewState, ...workspaceState.get<ViewState>('loom.viewState') }` — restores the full `ViewState` (including `syncDocToTreeEnabled`) from VS Code's per-workspace `workspaceState` on every reload.
- `ViewStateManager.update()`: `this.workspaceState.update('loom.viewState', this.state)` — persists the full state on every call. Both toggle commands added in Step 2 call `viewStateManager.update({ syncDocToTreeEnabled: enabled })`, so every toggle is immediately persisted.
- The `setContext('loom.syncDocToTreeEnabled', ...)` call added at activation time in Step 2 reads from the restored persisted state, so the correct toolbar button (enabled or disabled icon) is shown immediately after a reload without any extra write.
