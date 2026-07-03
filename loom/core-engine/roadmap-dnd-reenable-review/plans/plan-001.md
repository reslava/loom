---
type: plan
id: pl_01KWH5F3QDBS1MD76TXXVS9HGF
title: Re-enable roadmap priority DnD
status: done
created: 2026-07-02
updated: 2026-07-02
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 1.14.0
steps:
  - id: route-handledrop-by-roadmapenabled
    order: 1
    status: done
    description: "Route handleDrop on the roadmapEnabled flag (symmetric with handleDrag): in roadmap mode take the ROADMAP_MIME priority-reorder path; otherwise the TREE_MIME thread-move path. Removes the MIME-presence shadowing."
    files_touched: [packages/vscode/src/tree/roadmapDnd.ts]
    blocked_by: []
    satisfies: []
---
# Re-enable roadmap priority DnD

## Goal

Restore roadmap-band priority drag-and-drop, which regressed when thread-move DnD was added. `handleDrop` inferred its mode from which MIME was present, so a `dataTransfer.get(TREE_MIME)` check (TREE_MIME being a declared dragMimeType that can surface truthy) ran first and shadowed the roadmap priority-reorder path whenever the view was in roadmap mode. The fix routes `handleDrop` on the same `roadmapEnabled` flag that `handleDrag` and the tree layout already use, making the two handlers symmetric and the routing deterministic instead of MIME-presence-dependent.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Route handleDrop on the roadmapEnabled flag (symmetric with handleDrag): in roadmap mode take the ROADMAP_MIME priority-reorder path; otherwise the TREE_MIME thread-move path. Removes the MIME-presence shadowing. | packages/vscode/src/tree/roadmapDnd.ts | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
