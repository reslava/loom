---
type: done
id: pl_01KR1QSHJATBYZZCD8RW3RHW2N-done
title: Done — Wire diagnostics to file changes
status: done
created: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: pl_01KR1QSHJATBYZZCD8RW3RHW2N
requires_load: []
---
# Done — Wire diagnostics to file changes

## Step 1 — In extension.ts, replace the file watcher's debouncedRefresh handler (which calls treeProvider.refresh()) with debouncedSyncAndRefresh (which calls syncAndRefresh()). syncAndRefresh already calls both treeProvider.refresh() and updateDiagnostics, so no extra debounce is needed — just point the watcher at the right function.

In `packages/vscode/src/extension.ts` (lines 368–372): replaced `const debouncedRefresh = debounce(() => treeProvider.refresh(), 800)` with `const debouncedSyncAndRefresh = debounce(() => syncAndRefresh(), 800)` and updated the three file watcher subscriptions (`onDidCreate`, `onDidChange`, `onDidDelete`) to use `debouncedSyncAndRefresh`. `syncAndRefresh()` already calls both `treeProvider.setWorkspaceRoot`, `treeProvider.refresh()`, and `updateDiagnostics`, so this one-line rename ensures diagnostics are updated on every file change without any double-debouncing.

## Step 2 — Verify the debounce interval is appropriate for diagnostics: syncAndRefresh runs validate(all:true) which scans all weave files. If the workspace is large, consider a longer debounce (e.g. 800ms) for the diagnostics path specifically to avoid hammering on rapid saves.

Verified debounce interval is appropriate. `updateDiagnostics` calls `validate({ all: true })` (full workspace scan, IO-bound) and `buildDocIdMap()` (second full scan, only when issues exist). For a typical Loom workspace (small-to-medium doc graph), 800ms debounce is sufficient to prevent hammering on rapid saves. The plan step itself recommended "e.g. 800ms" as the target — which is exactly the value already set in Step 1 (inherited from the original `debouncedRefresh`). No code change required.

## Step 3 — Build and smoke-test: save a doc with a broken parent_id, confirm the VS Code Problems panel updates without a manual refresh. Confirm the tree also refreshes correctly.

Build succeeded cleanly: `cd packages/vscode && npm run package` produced `loom-vscode-0.1.0.vsix` (737.6kb bundle, 34 files) with no TypeScript errors. The change compiles correctly.\n\nLive smoke-test (save a doc with broken parent_id → observe VS Code Problems panel auto-update without manual refresh) could not be performed from the CLI — it requires a running VS Code instance with the extension loaded. Rafa should verify manually: install the VSIX, open the loom workspace, edit a doc to set a nonexistent `parent_id`, save, and confirm the Problems panel updates within ~800ms without pressing Refresh.
