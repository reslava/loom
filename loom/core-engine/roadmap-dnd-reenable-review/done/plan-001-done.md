---
type: done
id: pl_01KWH5F3QDBS1MD76TXXVS9HGF-done
title: Done — Re-enable roadmap priority DnD
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: pl_01KWH5F3QDBS1MD76TXXVS9HGF
requires_load: []
---
# Done — Re-enable roadmap priority DnD

## Step 1 — Route handleDrop on the roadmapEnabled flag (symmetric with handleDrag): in roadmap mode take the ROADMAP_MIME priority-reorder path; otherwise the TREE_MIME thread-move path. Removes the MIME-presence shadowing.

Restructured `handleDrop` in `packages/vscode/src/tree/roadmapDnd.ts` to branch on `this.viewStateManager.getState().roadmapEnabled` first — symmetric with `handleDrag` and with the tree-layout switch. In roadmap mode it now takes the `ROADMAP_MIME` priority-reorder path; otherwise the `TREE_MIME` thread-move path (`handleTreeDrop`). This removes the previous top-of-method `dataTransfer.get(TREE_MIME)` check that could return truthy for the declared-but-unset MIME and shadow the reorder path.

Root cause: the regression entered with the tree-move DnD commit (`147e437`), which prepended the TREE_MIME check ahead of the roadmap path; before that `handleDrop` had only the roadmap path, so priority DnD always worked.

Verified: `./scripts/build-all.sh` green (incl. vscode typecheck); Rafa confirmed the priority drag reorders correctly after a Reload Window. Shipped in `fix(vscode): route roadmap DnD by roadmapEnabled, not MIME presence`.
