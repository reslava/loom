---
type: plan
id: pl_01KXMS6CF95NYFWM80GPBQ3WCV
title: sync-threads-roadmap-with-open-doc Plan
status: done
created: 2026-07-16
updated: 2026-07-16
version: 1
design_version: 1
tags: []
parent_id: de_01KXMRVF617KKJC0316833FB8F
requires_load: []
target_version: 0.1.0
actual_release: 1.27.0
steps:
  - id: state-derived-doc-thread-resolver
    order: 1
    status: done
    description: Add a filePathToThreadKey index to LoomTreeProvider, built from full state each refresh, plus a getThreadNodeByFilePath() accessor.
    files_touched: [packages/vscode/src/tree/treeProvider.ts]
    blocked_by: []
    satisfies: [IN2, C1, C2]
  - id: one-sync-primitive
    order: 2
    status: done
    description: Extract the inline editor-change sync into a single syncActiveEditorToTree() primitive with exact-node-then-thread-node fallback.
    files_touched: [packages/vscode/src/extension.ts]
    blocked_by: [state-derived-doc-thread-resolver]
    satisfies: [IN1, IN5, IN6]
  - id: sync-across-show-roadmap-show-threads
    order: 3
    status: done
    description: Wire the view toggle to re-sync after the tree rebuild settles.
    files_touched: [packages/vscode/src/extension.ts]
    blocked_by: [one-sync-primitive]
    satisfies: [IN3, C3]
  - id: sync-on-re-enable
    order: 4
    status: done
    description: Sync to the current doc immediately when the doc→tree sync is re-enabled.
    files_touched: [packages/vscode/src/extension.ts]
    blocked_by: [one-sync-primitive]
    satisfies: [IN4]
  - id: build-manual-verification
    order: 5
    status: done
    description: Build and manually verify the four scenarios; confirm no Threads-view regression.
    files_touched: [packages/vscode/src/extension.ts, packages/vscode/src/tree/treeProvider.ts]
    blocked_by: [one-sync-primitive, sync-across-show-roadmap-show-threads, sync-on-re-enable]
    satisfies: [C4]
---
# sync-threads-roadmap-with-open-doc Plan

## Goal

Make the editor→tree sync view-agnostic and trigger-agnostic. Build a state-derived filePathToThreadKey index so any open doc resolves to its owning thread node in either view, extract the sync into one syncActiveEditorToTree() primitive, and wire it to the editor-change, view-toggle, and sync-re-enable triggers. All work is confined to packages/vscode/.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a filePathToThreadKey index to LoomTreeProvider, built from full state each refresh, plus a getThreadNodeByFilePath() accessor. | packages/vscode/src/tree/treeProvider.ts | — | IN2, C1, C2 |
| ✅ | 2 | Extract the inline editor-change sync into a single syncActiveEditorToTree() primitive with exact-node-then-thread-node fallback. | packages/vscode/src/extension.ts | state-derived-doc-thread-resolver | IN1, IN5, IN6 |
| ✅ | 3 | Wire the view toggle to re-sync after the tree rebuild settles. | packages/vscode/src/extension.ts | one-sync-primitive | IN3, C3 |
| ✅ | 4 | Sync to the current doc immediately when the doc→tree sync is re-enabled. | packages/vscode/src/extension.ts | one-sync-primitive | IN4 |
| ✅ | 5 | Build and manually verify the four scenarios; confirm no Threads-view regression. | packages/vscode/src/extension.ts, packages/vscode/src/tree/treeProvider.ts | one-sync-primitive, sync-across-show-roadmap-show-threads, sync-on-re-enable | C4 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:state-derived-doc-thread-resolver -->
### Step 1 — State-derived doc→thread resolver

Declare `private filePathToThreadKey = new Map<string, string>()`. Clear it in getRootChildren alongside the other map clears (~treeProvider.ts:144). After state loads, iterate every weave→thread and map each present doc's `(doc as any)._path` → `${weave.id}/${t.id}` over the fields: `t.req, t.idea, t.design, t.manifest, ...t.plans, ...t.dones, ...t.chats, ...(t.refDocs ?? [])`. Add `getThreadNodeByFilePath(filePath): TreeNode | undefined` that looks up the thread key then returns `this.threadKeyToNode.get(key)` (same map the view-specific node build already fills, so it yields the roadmap thread node in Roadmap view and the thread node in Threads view). Build the index independent of `roadmapEnabled` so it's populated in both views.

<!-- step:one-sync-primitive -->
### Step 2 — One sync primitive

Define `function syncActiveEditorToTree(): void` closing over treeProvider, treeView, viewStateManager. Body: early-return if `!syncDocToTreeEnabled`; read `vscode.window.activeTextEditor` itself (not an arg) and early-return if none; `const node = treeProvider.getNodeByFilePath(path) ?? treeProvider.getThreadNodeByFilePath(path)`; if node, `treeView.reveal(node, { select: true, focus: false, expand: true })`. Replace the inline body of the `onDidChangeActiveTextEditor` handler (~extension.ts:135) with a call to it. Preferring the exact node keeps Threads-view precision (IN5); the flag early-return keeps disabled a no-op (EX5).

<!-- step:sync-across-show-roadmap-show-threads -->
### Step 3 — Sync across Show roadmap / Show threads

Make `toggleRoadmap` async (~extension.ts:203). After `treeProvider.refresh()`, `await treeProvider.waitForRefresh()` then `syncActiveEditorToTree()`, so node maps (threadKeyToNode) are current before resolving. It's only used as a command handler, so async is fine.

<!-- step:sync-on-re-enable -->
### Step 4 — Sync on re-enable

In toggleSyncDocToTree / toggleSyncDocToTreeOff (~extension.ts:192), after flipping the flag and setting the context key, call `syncActiveEditorToTree()`. When toggled off it early-returns inside the primitive, so no branching needed here.

<!-- step:build-manual-verification -->
### Step 5 — Build + manual verification

Run ./scripts/build-all.sh, Reload Window. Verify: (1) Roadmap view — open a plan / older chat / req of a thread → its roadmap node selects; (2) toggle Show roadmap ↔ Show threads with a doc open → selection persists; (3) turn sync off, switch docs, turn sync on → jumps to current doc; (4) Threads view — exact doc node still selects (no regression).
