---
type: plan
id: pl_01KXKF6N4RY75CXTN3GFW80D25
title: "Fix: Set Dependencies menu missing in roadmap view"
status: done
created: 2026-07-15
updated: 2026-07-15
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: widened-the-loom-setthreaddeps-context-menu
    order: 1
    status: done
    description: Widened the loom.setThreadDeps context-menu when-clause in packages/vscode/package.json from `viewItem =~ /^thread/` to `viewItem =~ /^(roadmap-)?thread/` so the item also matches roadmap-view thread nodes (contextValue `roadmap-thread`, treeProvider.ts) — it previously only appeared in the normal tree, never the roadmap where it's meant to be used. Rebuilt and ran the suite (23/23) green.
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Fix: Set Dependencies menu missing in roadmap view

## Goal

Widened the loom.setThreadDeps context-menu when-clause in packages/vscode/package.json from `viewItem =~ /^thread/` to `viewItem =~ /^(roadmap-)?thread/` so the item also matches roadmap-view thread nodes (contextValue `roadmap-thread`, treeProvider.ts) — it previously only appeared in the normal tree, never the roadmap where it's meant to be used. Rebuilt and ran the suite (23/23) green.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Widened the loom.setThreadDeps context-menu when-clause in packages/vscode/package.json from `viewItem =~ /^thread/` to `viewItem =~ /^(roadmap-)?thread/` so the item also matches roadmap-view thread nodes (contextValue `roadmap-thread`, treeProvider.ts) — it previously only appeared in the normal tree, never the roadmap where it's meant to be used. Rebuilt and ran the suite (23/23) green. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
