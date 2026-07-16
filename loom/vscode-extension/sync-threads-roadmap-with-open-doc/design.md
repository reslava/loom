---
type: design
id: de_01KXMRVF617KKJC0316833FB8F
title: Sync the tree to the active doc across all views and triggers
status: done
created: 2026-07-16
version: 1
idea_version: 1
tags: []
parent_id: id_01KXMREPXPN7WXJ29X6W70Q8SB
requires_load: []
---
# Sync the tree to the active doc across all views and triggers

## Overview

Make the "tree selection follows the open doc" sync **view-agnostic** and **trigger-agnostic** by (1) resolving any open file to its owning thread through a state-built index, and (2) collapsing the sync into one primitive called from every relevant trigger. All work lives in `packages/vscode/` — no app/core/fs/MCP changes.

## Current state (what we're changing)

- **The sync** is inlined in `extension.ts:135` (`onDidChangeActiveTextEditor`): gate on `syncDocToTreeEnabled` → `treeProvider.getNodeByFilePath(path)` → `treeView.reveal(node, { select: true, focus: false, expand: true })`.
- **`getNodeByFilePath`** (`treeProvider.ts:97`) reads `filePathToNode`, populated by `buildNodeMaps` over the *current view's* nodes. In Threads view that's every doc node; in Roadmap view it's one representative doc per thread (`resolveThreadDocPath`, `treeProvider.ts:563`). This exact-path map is why roadmap sync only lands on the representative doc.
- **The view toggle** `toggleRoadmap` (`extension.ts:203`) updates view state and calls `treeProvider.refresh()` — but never re-syncs to the active editor, so selection is dropped.
- **The sync toggle** `toggleSyncDocToTree` (`extension.ts:192`) flips the flag but doesn't sync the currently-open doc on re-enable.

The tree already reads the **full** `loom://state` each refresh (`readStateWithRetry`, `treeProvider.ts:150`), so every thread's docs and their `_path`s are already in memory — we don't need a new read.

## Design

### 1. A `filePathToThreadKey` index (the option-b resolver)

Add a `Map<string, string>` (absolute file path → `"weaveSlug/threadSlug"`) to `LoomTreeProvider`, cleared and rebuilt in `getRootChildren` alongside the existing map clears (`treeProvider.ts:144`). Build it directly from `this.state`, independent of view mode, over every doc-bearing field of each thread:

```
t.req, t.idea, t.design, t.manifest, ...t.plans, ...t.dones, ...t.chats, ...(t.refDocs ?? [])
```

For each present doc, map `(doc as any)._path → `${weave.id}/${t.id}``. This is authoritative (same source the tree renders from), needs no path parsing, and is identical in both views. Expose:

```ts
getThreadNodeByFilePath(filePath: string): TreeNode | undefined
```

which looks up the thread key, then returns the currently-visible node for it via the existing `threadKeyToNode` map (`getNodeByThreadId`). In Roadmap view `threadKeyToNode` holds the roadmap thread nodes; in Threads view it holds the thread nodes — so the same call resolves the right node per view, no branching on `roadmapEnabled`.

### 2. Resolution order in the sync

`getNodeByFilePath` (exact doc node) stays the **preferred** hit — in Threads view it selects the precise doc node (idea/plan/chat), which is more specific than the thread. Fall back to `getThreadNodeByFilePath` (thread-level) when there's no exact node — i.e. Roadmap view, or a doc the exact map doesn't cover:

```
node = getNodeByFilePath(path) ?? getThreadNodeByFilePath(path)
```

This keeps Threads-view behavior exactly as-is (doc-level precision) and adds thread-level fallback for Roadmap and uncovered docs — strictly additive.

### 3. One primitive: `syncActiveEditorToTree()`

Extract the inline handler body into a single function (in `extension.ts`, closing over `treeProvider`, `treeView`, `viewStateManager`):

```ts
function syncActiveEditorToTree(): void {
  if (!viewStateManager.getState().syncDocToTreeEnabled) return;
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const path = editor.document.uri.fsPath;
  const node = treeProvider.getNodeByFilePath(path) ?? treeProvider.getThreadNodeByFilePath(path);
  if (node) treeView.reveal(node, { select: true, focus: false, expand: true });
}
```

Note it reads `vscode.window.activeTextEditor` itself (not an `editor` arg) so the toggle callers can invoke it with no editor in hand.

### 4. Wire the triggers

- **Editor change** (`extension.ts:135`) — replace the inline body with `syncActiveEditorToTree()`.
- **View toggle** (`toggleRoadmap`, `extension.ts:203`) — after `treeProvider.refresh()`, await the rebuild then sync. The node maps are only valid after `getRootChildren` runs, so use the existing `waitForRefresh()` (the same primitive `revealDocAfterCreate` relies on):

  ```ts
  treeProvider.refresh();
  await treeProvider.waitForRefresh();
  syncActiveEditorToTree();
  ```
  (`toggleRoadmap` becomes `async`; it's only used as a command handler, so that's fine.)
- **Sync re-enable** (`toggleSyncDocToTree`, `extension.ts:192`) — after flipping the flag on, call `syncActiveEditorToTree()` so it jumps to the current doc immediately. (No-op when toggled off, since the primitive early-returns on the flag.)

### Edge cases

- **Non-Loom / loose-fiber / global docs** — not in any thread ⇒ absent from the index ⇒ both lookups miss ⇒ no-op (correct; they have no roadmap node).
- **Sync disabled** — the primitive early-returns, so the toggle wirings are inert until re-enabled.
- **Reveal of a `None`-collapsible roadmap node** — roadmap thread nodes are leaves; `reveal` with `expand: true` on a leaf is harmless (expand is a no-op).
- **Timing on toggle** — `waitForRefresh()` guarantees `buildNodeMaps` (hence `threadKeyToNode`) has run before we resolve; without the await we'd read stale maps.

## Testing

Extension UI wiring isn't in the `ts-node`/`dist` harness, so verification is manual (per the extension dev loop): `./scripts/build-all.sh` + Reload Window, then:

1. Roadmap view, open a plan / older chat / req of a thread → its roadmap node selects (previously silent).
2. Open a doc, click `Show roadmap` ↔ `Show threads` → selection persists across the toggle.
3. Turn sync off, switch docs, turn sync on → jumps to the current doc.
4. Threads view unchanged: exact doc node still selects (no regression from the fallback).

The `filePathToThreadKey` builder is pure map construction from state; if we want a guarded unit later it could move behind a small pure helper, but no root-`tests/` case is added here since the change is presentation wiring.

## Out of scope

- Reverse sync (tree-click → open doc) already exists via node `command`s.
- No changes to `resolveThreadDocPath` (representative-doc choice for a thread click is a separate concern).
