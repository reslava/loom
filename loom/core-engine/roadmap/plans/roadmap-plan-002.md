---
type: plan
id: pl_01KV3GYQ36HM981ACDCMCE3ZYN
title: Derived Roadmap — Extension Surface
status: active
created: "2026-06-14T00:00:00.000Z"
updated: 2026-06-14
version: 1
design_version: 1
tags: []
parent_id: de_01KV3GPTMNXT66C4N73WAFN7ZW
requires_load: []
target_version: 0.1.0
steps:
  - id: roadmap-toolbar-toggle
    order: 1
    status: pending
    description: Add a Roadmap toolbar button (Enabled/Disabled) that toggles the roadmap view in the extension.
    files_touched: [packages/vscode/src/, packages/vscode/package.json]
    blocked_by: [pl_01KV3GY83XJXDAGJ87HK64MRXS]
    satisfies: [IN8]
  - id: roadmap-panel
    order: 2
    status: pending
    description: "Render the roadmap panel: future (top), present (middle), history (bottom), with blocked-on annotations."
    files_touched: [packages/vscode/src/]
    blocked_by: [step-1]
    satisfies: [IN8]
  - id: filter-folds-to-all-history-roadmap
    order: 3
    status: pending
    description: When Roadmap is enabled, the existing filter offers all / history / roadmap instead of the current status filter.
    files_touched: [packages/vscode/src/]
    blocked_by: [step-2]
    satisfies: [IN9]
  - id: drag-to-reorder-priority
    order: 4
    status: pending
    description: Drag-to-reorder among independent threads writes soft priority via loom_set_priority; a drag violating a hard depends_on edge is refused.
    files_touched: [packages/vscode/src/]
    blocked_by: [step-2]
    satisfies: [IN10]
---
# Derived Roadmap — Extension Surface

## Goal

Render the proven roadmap read-model in the VS Code extension. Add a Roadmap toolbar toggle, a panel showing future/present/history bands, fold the existing filter to all/history/roadmap when enabled, and let the user drag-to-reorder independent threads — writing soft `priority` via loom_set_priority while refusing any drag that violates a hard `depends_on` edge. This phase is pure presentation on top of Plan-1's read-model and write tools; it adds no derivation logic.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| 🔳 | 1 | Add a Roadmap toolbar button (Enabled/Disabled) that toggles the roadmap view in the extension. | packages/vscode/src/, packages/vscode/package.json | pl_01KV3GY83XJXDAGJ87HK64MRXS | IN8 |
| 🔳 | 2 | Render the roadmap panel: future (top), present (middle), history (bottom), with blocked-on annotations. | packages/vscode/src/ | step-1 | IN8 |
| 🔳 | 3 | When Roadmap is enabled, the existing filter offers all / history / roadmap instead of the current status filter. | packages/vscode/src/ | step-2 | IN9 |
| 🔳 | 4 | Drag-to-reorder among independent threads writes soft priority via loom_set_priority; a drag violating a hard depends_on edge is refused. | packages/vscode/src/ | step-2 | IN10 |
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
