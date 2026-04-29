---
type: reference
id: toolbar-icons-map-reference
title: "VS Code Toolbar Icons Mapping Reference"
status: active
created: 2026-04-20
version: 1
tags: [vscode, icons, toolbar, reference]
requires_load: []
---

# VS Code Toolbar Icons Mapping Reference

## Purpose

This document records the mapping between the **unified icon identifiers** (from the `Icons` constant in `icons.ts`) and the **Codicon IDs** used for toolbar buttons in the Loom VS Code extension.

Because VS Code's `package.json` does not support dynamic icon resolution, toolbar icons must use Codicon IDs or static resource paths. This document serves as the single source of truth to ensure visual consistency across all icons.

## Icon Mapping Table

| Unified Constant (`Icons`) | Purpose | Toolbar Codicon ID |
| :--- | :--- | :--- |
| `idea` | Idea document | `lightbulb` |
| `design` | Design document | `symbol-structure` |
| `plan` | Plan document | `checklist` |
| `ctx` | Context document | `note` |
| `thread` | Thread / Loom view | `project` |
| `actionDelete` | Delete action | `trash` |
| `actionArchive` | Archive action | `archive` |
| `actionCancel` | Cancel action | `close` |
| `actionGenerate` | Generate / AI action | `sparkle` |

## Usage in `package.json`

When adding a new toolbar button to the extension's `package.json`, refer to this table to select the correct Codicon ID.

**Example:**
```json
{
    "command": "loom.weavePlan",
    "title": "Loom: Weave Plan",
    "icon": "$(checklist)"
}
```

## Future Custom Icons

When custom SVG icons are added to `media/icons/`, the `icon` property in `package.json` can be updated to point directly to the SVG file path, maintaining consistency with the tree view icons.

**Example:**
```json
{
    "command": "loom.weavePlan",
    "title": "Loom: Weave Plan",
    "icon": {
        "light": "media/icons/plan.svg",
        "dark": "media/icons/plan.svg"
    }
}
```

## Related Files

- `packages/vscode/src/icons.ts` – Unified icon management for tree view and commands.
- `packages/vscode/package.json` – Toolbar and command icon definitions.
