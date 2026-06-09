---
type: plan
id: pl_01KR1QSHJATBYZZCD8RW3RHW2N
title: Wire diagnostics to file changes
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: in-extension
    order: 1
    status: done
    description: In extension.ts, replace the file watcher's debouncedRefresh handler (which calls treeProvider.refresh()) with debouncedSyncAndRefresh (which calls syncAndRefresh()). syncAndRefresh already calls both treeProvider.refresh() and updateDiagnostics, so no extra debounce is needed — just point the watcher at the right function.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: verify-the-debounce-interval-is-appropriate
    order: 2
    status: done
    description: "Verify the debounce interval is appropriate for diagnostics: syncAndRefresh runs validate(all:true) which scans all weave files. If the workspace is large, consider a longer debounce (e.g. 800ms) for the diagnostics path specifically to avoid hammering on rapid saves."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: build-and-smoke-test-save-a
    order: 3
    status: done
    description: "Build and smoke-test: save a doc with a broken parent_id, confirm the VS Code Problems panel updates without a manual refresh. Confirm the tree also refreshes correctly."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Wire diagnostics to file changes

| | |
|---|---|
| **Created** | 2026-05-07 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Make updateDiagnostics run on every file change so structural validation issues surface immediately, not just on activation or manual refresh.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | In extension.ts, replace the file watcher's debouncedRefresh handler (which calls treeProvider.refresh()) with debouncedSyncAndRefresh (which calls syncAndRefresh()). syncAndRefresh already calls both treeProvider.refresh() and updateDiagnostics, so no extra debounce is needed — just point the watcher at the right function. | — | — | — |
| ✅ | 2 | Verify the debounce interval is appropriate for diagnostics: syncAndRefresh runs validate(all:true) which scans all weave files. If the workspace is large, consider a longer debounce (e.g. 800ms) for the diagnostics path specifically to avoid hammering on rapid saves. | — | — | — |
| ✅ | 3 | Build and smoke-test: save a doc with a broken parent_id, confirm the VS Code Problems panel updates without a manual refresh. Confirm the tree also refreshes correctly. | — | — | — |
---

### Step 1 — In extension.ts, replace the file watcher's debouncedRefresh handler (which calls treeProvider.refresh()) with debouncedSyncAndRefresh (which calls syncAndRefresh()). syncAndRefresh already calls both treeProvider.refresh() and updateDiagnostics, so no extra debounce is needed — just point the watcher at the right function.

<!-- Detailed spec. -->

---

### Step 2 — Verify the debounce interval is appropriate for diagnostics: syncAndRefresh runs validate(all:true) which scans all weave files. If the workspace is large, consider a longer debounce (e.g. 800ms) for the diagnostics path specifically to avoid hammering on rapid saves.

<!-- Detailed spec. -->

---

### Step 3 — Build and smoke-test: save a doc with a broken parent_id, confirm the VS Code Problems panel updates without a manual refresh. Confirm the tree also refreshes correctly.

<!-- Detailed spec. -->

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
