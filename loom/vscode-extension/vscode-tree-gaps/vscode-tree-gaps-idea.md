---
type: idea
id: id_01KR1QRDW09RAHQ8FMTYJM2E3Z
title: "Fix minor tree gaps: orphaned dones, missing status icons, summary node"
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Fix minor tree gaps: orphaned dones, missing status icons, summary node

## Problem

Three small visual gaps in the tree that don't warrant separate threads:

1. **Orphaned done docs** — `dones.find(d => d.parent_id === p.id)` only shows a done doc nested under its plan. A done doc whose parent plan was deleted (or has a mismatched parent_id) is completely invisible. No warning, no fallback placement.

2. **BLOCKED/CANCELLED thread icons** — `getThreadStatus` can return `BLOCKED` or `CANCELLED` but `getThreadIcon` has no case for either (falls through to the default thread icon). Same gap in `getWeaveIcon` for BLOCKED. Silent.

3. **Summary header node** — `LoomState.summary` contains `stalePlans`, `blockedSteps`, `activeWeaves`, `implementingWeaves` etc., all computed but not surfaced. A root-level informational row ("⚠️ 3 stale · 2 blocked") would give a dashboard glance without noise when the workspace is clean.

Note: the summary node overlaps with `vscode-staled` Fix 4. Coordinate: if `vscode-staled` lands first, skip it here.

## Idea

Batch fix in `treeProvider.ts`:
- Collect orphaned done docs (dones with no matching plan) during `getThreadChildren` and append them to the thread's loose children or under a "Done (orphaned)" label.
- Add `BLOCKED` and `CANCELLED` cases to `getThreadIcon` and `getWeaveIcon` using appropriate codicons (`warning`, `error`).
- Add summary row in `getRootChildren` (or defer to `vscode-staled`).

## Next step

plan
