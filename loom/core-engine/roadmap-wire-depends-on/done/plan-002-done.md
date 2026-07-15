---
type: done
id: pl_01KXKF6N4RY75CXTN3GFW80D25-done
title: "Done — Fix: Set Dependencies menu missing in roadmap view"
status: done
created: 2026-07-15
version: 1
tags: []
parent_id: pl_01KXKF6N4RY75CXTN3GFW80D25
requires_load: []
---
# Done — Fix: Set Dependencies menu missing in roadmap view

Quick-shipped — recorded already-completed work:

1. Widened the loom.setThreadDeps context-menu when-clause in packages/vscode/package.json from `viewItem =~ /^thread/` to `viewItem =~ /^(roadmap-)?thread/` so the item also matches roadmap-view thread nodes (contextValue `roadmap-thread`, treeProvider.ts) — it previously only appeared in the normal tree, never the roadmap where it's meant to be used. Rebuilt and ran the suite (23/23) green.
