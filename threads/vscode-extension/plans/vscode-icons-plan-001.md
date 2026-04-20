---
type: plan
id: vscode-icons-plan-001
title: "Create Custom SVG Icons for VS Code Extension"
status: deferred
created: 2026-04-20
version: 1
tags: [vscode, icons, design, deferred]
parent_id: vscode-icons-design
target_version: "0.6.0"
requires_load: [vscode-icons-design]
---

# Plan — Create Custom SVG Icons for VS Code Extension

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

# Steps

| Done | # | Step | Files touched |
|---|---|---|---|
| 🔳 | 1 | Design SVG for `loom` (activity bar) | `media/icons/loom.svg` |
| 🔳 | 2 | Design SVG for `thread` | `media/icons/thread.svg` |
| 🔳 | 3 | Design SVG for `idea` | `media/icons/idea.svg` |
| 🔳 | 4 | Design SVG for `design` | `media/icons/design.svg` |
| 🔳 | 5 | Design SVG for `plan` | `media/icons/plan.svg` |
| 🔳 | 6 | Design SVG for `ctx` | `media/icons/ctx.svg` |
| 🔳 | 7 | Design SVGs for actions (delete, archive, cancel, generate) | `media/icons/action*.svg` |
| 🔳 | 8 | Uncomment `setIconBaseUri` in `extension.ts` | `packages/vscode/src/extension.ts` |
| 🔳 | 9 | Test icon display in tree view and toolbar | — |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |