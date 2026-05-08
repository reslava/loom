---
type: idea
id: id_01KR1QRAAN6FP1HV6G55FBDS6X
title: Wire diagnostics to file changes for continuous validation
status: active
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-07T00:00:00.000Z"
version: 2
tags: []
parent_id: null
requires_load: []
---
# Wire diagnostics to file changes for continuous validation

## Problem

`updateDiagnostics` (structural validation: broken parent_id, dangling child_ids, stale plans) only runs inside `syncAndRefresh()`, which is called on: extension activation, `loom.refresh` command, and workspace folder changes. The file watcher (`loom/**/*.md`) calls only `treeProvider.refresh()` — not `syncAndRefresh()` — so editing a doc never triggers re-validation. Structural issues surface only on activation or manual refresh, not as the user works.

## Idea

Change the file watcher's debounced handler from `treeProvider.refresh()` to `syncAndRefresh()` so that every doc change triggers both a tree refresh and a diagnostics update. Since `syncAndRefresh` already debounces the tree refresh, no extra debouncing is needed — just unify the handler.

## Why now

One-line fix with high visibility value. Every other VS Code language tool updates diagnostics on save; Loom should too.

## Next step

plan
