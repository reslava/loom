---
type: plan
id: pl_01KV3GYQ36HM981ACDCMCE3ZYN
title: Derived Roadmap — Extension Surface
status: done
created: 2026-06-14
updated: 2026-06-14
version: 1
design_version: 1
tags: []
parent_id: de_01KV3GPTMNXT66C4N73WAFN7ZW
requires_load: []
target_version: 0.1.0
actual_release: 1.8.0
steps:
  - id: roadmap-toolbar-toggle
    order: 1
    status: done
    description: Add a Roadmap toolbar button (Enabled/Disabled) that toggles the roadmap view in the extension.
    files_touched: [packages/vscode/src/, packages/vscode/package.json]
    blocked_by: [pl_01KV3GY83XJXDAGJ87HK64MRXS]
    satisfies: [IN8]
  - id: roadmap-panel
    order: 2
    status: done
    description: "Render the roadmap panel: future (top), present (middle), history (bottom), with blocked-on annotations."
    files_touched: [packages/vscode/src/]
    blocked_by: [step-1]
    satisfies: [IN8]
  - id: filter-folds-to-all-history-roadmap
    order: 3
    status: done
    description: When Roadmap is enabled, the existing filter offers all / history / roadmap instead of the current status filter.
    files_touched: [packages/vscode/src/]
    blocked_by: [step-2]
    satisfies: [IN9]
  - id: drag-to-reorder-priority
    order: 4
    status: done
    description: Drag-to-reorder among independent threads writes soft priority via loom_set_priority; a drag violating a hard depends_on edge is refused.
    files_touched: [packages/vscode/src/]
    blocked_by: [step-2]
    satisfies: [IN10]
  - id: history-group-by-thread-toggle
    order: 5
    status: done
    description: When Roadmap is enabled, the History band can group shipped plans by thread via an opt-in toggle (default flat, newest-first), mirroring the CLI's `loom roadmap --group-by-thread`.
    files_touched: [packages/vscode/src/, packages/vscode/package.json]
    blocked_by: [roadmap-panel]
    satisfies: [IN8]
---
# Derived Roadmap — Extension Surface

## Goal

Render the proven roadmap read-model in the VS Code extension. Add a Roadmap toolbar toggle, a panel showing future/present/history bands, fold the existing filter to all/history/roadmap when enabled, and let the user drag-to-reorder independent threads — writing soft `priority` via loom_set_priority while refusing any drag that violates a hard `depends_on` edge. This phase is pure presentation on top of Plan-1's read-model and write tools; it adds no derivation logic.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a Roadmap toolbar button (Enabled/Disabled) that toggles the roadmap view in the extension. | packages/vscode/src/, packages/vscode/package.json | pl_01KV3GY83XJXDAGJ87HK64MRXS | IN8 |
| ✅ | 2 | Render the roadmap panel: future (top), present (middle), history (bottom), with blocked-on annotations. | packages/vscode/src/ | step-1 | IN8 |
| ✅ | 3 | When Roadmap is enabled, the existing filter offers all / history / roadmap instead of the current status filter. | packages/vscode/src/ | step-2 | IN9 |
| ✅ | 4 | Drag-to-reorder among independent threads writes soft priority via loom_set_priority; a drag violating a hard depends_on edge is refused. | packages/vscode/src/ | step-2 | IN10 |
| ✅ | 5 | When Roadmap is enabled, the History band can group shipped plans by thread via an opt-in toggle (default flat, newest-first), mirroring the CLI's `loom roadmap --group-by-thread`. | packages/vscode/src/, packages/vscode/package.json | roadmap-panel | IN8 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:roadmap-toolbar-toggle -->
### Step 1 — Roadmap toolbar toggle

Add a `Roadmap` toolbar command + enabled/disabled state. When disabled, the tree behaves as today; when enabled, it switches to the roadmap rendering (next step). Reads loom://roadmap via the extension's MCP client — no direct app imports.

<!-- step:roadmap-panel -->
### Step 2 — Roadmap panel

Render the three bands from the RoadmapView: future (pending/blocked in dependency-then-priority order, each blocked node showing what it's blocked on), present (active/implementing), history (shipped plans newest-first, group-by-thread). One glance = where the project stands. Cross-weave blocked-on is the headline element.

<!-- step:filter-folds-to-all-history-roadmap -->
### Step 3 — Filter folds to all/history/roadmap

When the Roadmap toggle is enabled, the filter control switches its options to `all / history / roadmap`. Note (from chat): the roadmap's present band already subsumes the proposed Active-or-Implementing combined filter — keep that in mind to avoid a redundant third status-filter value.

<!-- step:drag-to-reorder-priority -->
### Step 4 — Drag-to-reorder → priority

Drag-to-reorder calls loom_set_priority for the moved thread. The hard dependency graph is inviolable: a drag that would place a thread before something it depends on is refused (client pre-check for instant feedback + server-side validation in loom_set_thread_deps/loom_set_priority as the backstop). Reorder = setting priority within the slack the dependencies allow, never overriding them.

<!-- step:history-group-by-thread-toggle -->
### Step 5 — History group-by-thread toggle

Add a `Group History by Thread` toolbar toggle, visible only when the Roadmap view is enabled. Off (default): the History band renders shipped plans as a flat newest-first list (`weave/thread · date · plan title`). On: shipped plans are grouped under their `weave/thread` heading, each group's plans newest-first. Pure rendering over `loom://roadmap`'s `history` (each `ShippedPlan` already carries `weaveId`/`threadId`) — no read-model change, mirroring `packages/cli/src/commands/roadmap.ts`'s `--group-by-thread`.
