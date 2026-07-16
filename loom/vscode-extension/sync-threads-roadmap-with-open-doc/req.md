---
type: req
id: rq_01KXMS5NJNVPDWS0KV8XDAXT12
title: Sync the tree to the active doc across all views and triggers — Requirements
status: locked
created: 2026-07-16
updated: 2026-07-16
version: 1
design_version: 1
tags: []
parent_id: de_01KXMRVF617KKJC0316833FB8F
requires_load: []
---
# Sync the tree to the active doc across all views and triggers — Requirements

### ✅ Included

- `IN1` In Roadmap view, when the active editor's document changes, select the roadmap node of that document's owning thread.
- `IN2` Resolve **any** doc of a thread (idea, design, req, manifest, any plan, any done, any chat, any ref doc) to its thread — not only the thread's representative doc.
- `IN3` When the `Show roadmap` / `Show threads` toolbar toggle is clicked with a doc open, re-select the corresponding node in the newly-shown view.
- `IN4` When the doc→tree sync is re-enabled, immediately select the node for the currently-open doc (don't wait for the next editor switch).
- `IN5` Preserve existing Threads-view behavior: an exact doc node is still selected when one exists (doc-level precision, no regression).
- `IN6` Collapse the sync into one `syncActiveEditorToTree()` primitive invoked from all three triggers (editor change, view toggle, sync re-enable).

### ❌ Excluded

- `EX1` Reverse sync (tree-click → open doc) — already exists via node commands.
- `EX2` Changing `resolveThreadDocPath` / the representative-doc choice for a thread click.
- `EX3` Any change outside `packages/vscode/` (no app/core/fs/MCP surface changes).
- `EX4` Syncing loose-fiber or global docs that belong to no thread (they have no roadmap node; remain a no-op).
- `EX5` New behavior when `syncDocToTreeEnabled` is off — sync stays a no-op while disabled.

### ⛓ Constraints

- `C1` Doc→thread resolution builds a `filePathToThreadKey` index from the full `loom://state` already read each refresh — no filesystem access and no path-string parsing in the extension.
- `C2` Node lookup goes through the existing `threadKeyToNode` map so the same call resolves the correct node in either view without branching on `roadmapEnabled`.
- `C3` The toggle trigger must sync only after the tree rebuild settles (`waitForRefresh()`), so node maps are current when resolving.
- `C4` Verification is manual (extension UI wiring is outside the `dist`/`ts-node` test harness); no root-`tests/` case is required for this change.
