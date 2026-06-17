---
type: plan
id: pl_01KVADCEW02VQ3F899TG0Z1N5V
title: Surface release versions in the extension roadmap history
status: active
created: 2026-06-17
updated: 2026-06-17
version: 1
design_version: 1
tags: []
parent_id: id_01KVADBMKVNECGWH8PMJP4TDHV
requires_load: []
target_version: 0.1.0
steps:
  - id: show-current-and-per-plan-release
    order: 1
    status: pending
    description: Render the current release on the History band label (e.g. `History (N) · current v1.9.2`) from `roadmap.currentRelease`, and add a `[vX.Y.Z]` tag to each shipped-plan node's description in `createShippedPlanNode`.
    files_touched: [packages/vscode/src/tree/treeProvider.ts]
    blocked_by: []
    satisfies: []
  - id: release-grouping-and-mode
    order: 2
    status: pending
    description: Replace the boolean `groupByThread` history toggle with a history view mode (`date | thread | release`) in view state; add a `release` grouping branch in `createHistoryBand` that buckets shipped plans under their version, versions descending via core `compareVersions`. Default the mode to `release`.
    files_touched: [packages/vscode/src/tree/treeProvider.ts, packages/vscode/src/view/viewState.ts, packages/vscode/src/view/viewStateManager.ts]
    blocked_by: [show-current-and-per-plan-release]
    satisfies: []
  - id: toolbar-command
    order: 3
    status: pending
    description: Add a toolbar command to cycle/select the history view mode (date/thread/release) and register it (command + menu contribution) in package.json; wire it to the view-state setter.
    files_touched: [packages/vscode/src/commands/grouping.ts, packages/vscode/package.json]
    blocked_by: [release-grouping-and-mode]
    satisfies: []
  - id: build-and-verify
    order: 4
    status: pending
    description: "`./scripts/build-all.sh`, Reload Window, and manually verify: history defaults to grouped-by-release newest-first, current release shown, each plan tagged, toggle switches date/thread/release."
    files_touched: []
    blocked_by: [toolbar-command]
    satisfies: []
---
# Surface release versions in the extension roadmap history

## Goal

Extension-only change wiring the release data already exposed by loom://roadmap (currentRelease, history[].release) into the roadmap tree: show the current release, label each shipped plan with its version, add a group-by-release history view, and default the history view to grouped-and-sorted-by-release (newest version first). No core/MCP changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| 🔳 | 1 | Render the current release on the History band label (e.g. `History (N) · current v1.9.2`) from `roadmap.currentRelease`, and add a `[vX.Y.Z]` tag to each shipped-plan node's description in `createShippedPlanNode`. | packages/vscode/src/tree/treeProvider.ts | — | — |
| 🔳 | 2 | Replace the boolean `groupByThread` history toggle with a history view mode (`date \| thread \| release`) in view state; add a `release` grouping branch in `createHistoryBand` that buckets shipped plans under their version, versions descending via core `compareVersions`. Default the mode to `release`. | packages/vscode/src/tree/treeProvider.ts, packages/vscode/src/view/viewState.ts, packages/vscode/src/view/viewStateManager.ts | show-current-and-per-plan-release | — |
| 🔳 | 3 | Add a toolbar command to cycle/select the history view mode (date/thread/release) and register it (command + menu contribution) in package.json; wire it to the view-state setter. | packages/vscode/src/commands/grouping.ts, packages/vscode/package.json | release-grouping-and-mode | — |
| 🔳 | 4 | `./scripts/build-all.sh`, Reload Window, and manually verify: history defaults to grouped-by-release newest-first, current release shown, each plan tagged, toggle switches date/thread/release. | — | toolbar-command | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
