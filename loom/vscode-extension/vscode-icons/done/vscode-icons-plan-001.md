---
type: plan
id: pl_01KQYDFDDE726GPWH38HDT0EFE
title: Create Custom SVG Icons for VS Code Extension
status: done
created: "2026-04-20T00:00:00.000Z"
version: 1
tags: [vscode, icons, design, deferred]
parent_id: de_01KQYDFDDEC8J06R4624YH86QZ
requires_load: [de_01KQYDFDDEC8J06R4624YH86QZ]
target_version: 0.6.0
steps:
  - id: design-svg-for-activity-bar
    order: 1
    status: done
    description: Design SVG for `loom` (activity bar)
    files_touched: ["`media/icons/loom.svg`"]
    blocked_by: []
    satisfies: []
  - id: design-svg-for
    order: 2
    status: done
    description: Design SVG for `thread`
    files_touched: ["`media/icons/thread.svg`"]
    blocked_by: []
    satisfies: []
  - id: design-svg-for-2
    order: 3
    status: done
    description: Design SVG for `idea`
    files_touched: ["`media/icons/idea.svg`"]
    blocked_by: []
    satisfies: []
  - id: design-svg-for-3
    order: 4
    status: done
    description: Design SVG for `design`
    files_touched: ["`media/icons/design.svg`"]
    blocked_by: []
    satisfies: []
  - id: design-svg-for-4
    order: 5
    status: done
    description: Design SVG for `plan`
    files_touched: ["`media/icons/plan.svg`"]
    blocked_by: []
    satisfies: []
  - id: design-svg-for-5
    order: 6
    status: done
    description: Design SVG for `ctx`
    files_touched: ["`media/icons/ctx.svg`"]
    blocked_by: []
    satisfies: []
  - id: design-svgs-for-actions-delete-archive
    order: 7
    status: done
    description: Design SVGs for actions (delete, archive, cancel, generate)
    files_touched: ["`media/icons/action*.svg`"]
    blocked_by: []
    satisfies: []
  - id: uncomment-in-extension
    order: 8
    status: done
    description: Uncomment `setIconBaseUri` in `extension.ts`
    files_touched: ["`packages/vscode/src/extension.ts`"]
    blocked_by: []
    satisfies: []
  - id: test-icon-display-in-tree-view
    order: 9
    status: done
    description: Test icon display in tree view and toolbar
    files_touched: []
    blocked_by: []
    satisfies: []
---

# Create Custom SVG Icons for VS Code Extension

| | |
|---|---|
| **Created** | 2026-04-20 |
| **Status** | DEFERRED |
| **Design** | `vscode-icons-design.md` |
| **Target version** | 0.6.0 |

---

# Goal

Create custom SVG icons for all Loom document types and actions, replacing the Codicon fallbacks. This gives the extension a unique, polished visual identity.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Design SVG for `loom` (activity bar) | `media/icons/loom.svg` | — | — |
| ✅ | 2 | Design SVG for `thread` | `media/icons/thread.svg` | — | — |
| ✅ | 3 | Design SVG for `idea` | `media/icons/idea.svg` | — | — |
| ✅ | 4 | Design SVG for `design` | `media/icons/design.svg` | — | — |
| ✅ | 5 | Design SVG for `plan` | `media/icons/plan.svg` | — | — |
| ✅ | 6 | Design SVG for `ctx` | `media/icons/ctx.svg` | — | — |
| ✅ | 7 | Design SVGs for actions (delete, archive, cancel, generate) | `media/icons/action*.svg` | — | — |
| ✅ | 8 | Uncomment `setIconBaseUri` in `extension.ts` | `packages/vscode/src/extension.ts` | — | — |
| ✅ | 9 | Test icon display in tree view and toolbar | — | — | — |
---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |