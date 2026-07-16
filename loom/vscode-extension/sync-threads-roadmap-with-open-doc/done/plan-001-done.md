---
type: done
id: pl_01KXMS6CF95NYFWM80GPBQ3WCV-done
title: Done — sync-threads-roadmap-with-open-doc Plan
status: done
created: 2026-07-16
version: 8
tags: []
parent_id: pl_01KXMS6CF95NYFWM80GPBQ3WCV
requires_load: []
---
# Done — sync-threads-roadmap-with-open-doc Plan

## Step 1 — Add a filePathToThreadKey index to LoomTreeProvider, built from full state each refresh, plus a getThreadNodeByFilePath() accessor.

Added the view-agnostic doc→thread resolver to `LoomTreeProvider` (`packages/vscode/src/tree/treeProvider.ts`):

- New field `private filePathToThreadKey = new Map<string, string>()` (absolute doc path → `"weaveSlug/threadSlug"`).
- Cleared it in `getRootChildren` alongside the other node-map clears.
- New `private buildFilePathToThreadKey(state)` maps each present doc's `(doc as any)._path` → `${weave.id}/${t.id}` over `t.req, t.idea, t.design, t.manifest, ...t.plans, ...t.dones, ...t.chats, ...(t.refDocs ?? [])`. Called before the view branch, so populated in both views.
- New accessor `getThreadNodeByFilePath(filePath)` → thread key → `threadKeyToNode.get(key)`.

**Follow-up fix (found during verification — scenario 2 failed):** `threadKeyToNode` was only populated for nodes whose `contextValue` starts with `'thread'`. In Roadmap view the thread node's `contextValue` is `'roadmap-thread'`, so it was never indexed and `getThreadNodeByFilePath` returned undefined in Roadmap view. Broadened the `buildNodeMaps` guard to also match `contextValue === 'roadmap-thread'`, so thread-level nodes land in `threadKeyToNode` in both views. This is what makes IN1/IN2/IN3 actually resolve in Roadmap view. Satisfies IN2, C1, C2.

## Step 2 — Extract the inline editor-change sync into a single syncActiveEditorToTree() primitive with exact-node-then-thread-node fallback.

Extracted the sync into one primitive in `packages/vscode/src/extension.ts`:

- Added `function syncActiveEditorToTree()` beside `syncAndRefresh`. It early-returns when `syncDocToTreeEnabled` is off (keeps disabled a no-op), reads `vscode.window.activeTextEditor` itself (so toggle callers with no editor in hand can invoke it), then resolves `treeProvider.getNodeByFilePath(path) ?? treeProvider.getThreadNodeByFilePath(path)` and reveals with `{ select: true, focus: false, expand: true }`.
- Replaced the inline body of the `onDidChangeActiveTextEditor` handler with `() => syncActiveEditorToTree()`.

Preferring the exact doc node preserves Threads-view precision (IN5); the shared primitive is the single call site for all triggers (IN6); the exact-then-thread fallback delivers Roadmap-view selection (IN1). Satisfies IN1, IN5, IN6.

## Step 3 — Wire the view toggle to re-sync after the tree rebuild settles.

Wired the view toggle to re-sync (`packages/vscode/src/extension.ts`): `toggleRoadmap` is `async` and re-syncs after the rebuild.

**Round-2 fixes (verification found the toggle + view-visibility cases still failed while editor-change worked):**

Root cause was timing, not resolution — editor-change reveals against an already-painted tree and worked in both views, but the toggle reveals immediately after a full rebuild, before VS Code has painted the new rows, and `reveal` is silently dropped for an unrendered row (there's no "tree rendered" event to await).

- Added `syncActiveEditorToTreeDeferred()` — yields one macrotask (`setTimeout(…, 0)`) so the render settles before `reveal`.
- `toggleRoadmap`: dropped the redundant `treeProvider.refresh()` (it double-fired the tree event alongside `waitForRefresh()`); now just `await treeProvider.waitForRefresh()` (which fires the rebuild itself and resolves when the node maps are current) then `syncActiveEditorToTreeDeferred()`.
- New trigger `treeView.onDidChangeVisibility(e => e.visible && syncActiveEditorToTreeDeferred())` — covers the two cases Rafa also reported: switching away to another sidebar tool and back to Loom, and opening VS Code with a doc already open. Node maps persist from the last build, so a deferred reveal suffices. (This extends the "keep sync" intent beyond IN3 to view-visibility.)

Satisfies IN3, C3.

## Step 4 — Sync to the current doc immediately when the doc→tree sync is re-enabled.

Sync-on-re-enable (`packages/vscode/src/extension.ts`): both `loom.toggleSyncDocToTree` and `loom.toggleSyncDocToTreeOff` now call `syncActiveEditorToTree()` after flipping the flag and setting the context key. Because the primitive early-returns when `syncDocToTreeEnabled` is false, the call needs no branching — it jumps to the currently-open doc when turning sync on and is inert when turning it off. Satisfies IN4.

## Step 5 — Build and manually verify the four scenarios; confirm no Threads-view regression.

`./scripts/build-all.sh` green throughout (no TS errors). All scenarios verified working by Rafa in a reloaded Extension Host:

1. Roadmap view — opening any doc (plan / older chat / req) selects its roadmap node. ✅
2. Show roadmap ↔ Show threads toggle with a doc open — selection persists. ✅
3. Sync off → switch docs → sync on — jumps to current doc. ✅
4. Switch to another sidebar tool and back to Loom — selects the open doc. ✅
5. Threads view — exact doc node still selects (no regression). ✅
6. Startup / window reload with a doc already open — selects it without needing an editor switch. ✅

Two follow-up triggers were added during verification beyond the original three (all reuse the one `syncActiveEditorToTree` primitive via a deferred variant): `treeView.onDidChangeVisibility` (view re-appears) and an initial activation sync after the first tree build settles (`waitForRefresh().then(deferred)`) for the already-open doc on startup. Satisfies C4.
