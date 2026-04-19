---
type: design
id: vscode-extension-design
title: "VS Code Extension — Loom Visual Layer Design"
status: active
created: 2026-04-18
version: 1
tags: [vscode, extension, ui, design]
parent_id: workflow-design-v2
child_ids: [vscode-extension-plan-004, vscode-extension-plan-005, vscode-extension-plan-006]
requires_load: []
---

# VS Code Extension — Loom Visual Layer Design

## Goal

Define the architecture and behavior of the Loom VS Code extension. The extension provides a visual interface for Loom workflows, acting as a **thin presentation layer** that reuses the exact same `app` use‑cases as the CLI. It enables developers to view threads, inspect document state, and execute workflow actions directly from their editor.

## Context

Loom currently has a fully functional CLI built on a clean architecture (`cli` → `app` → `core` / `fs`). The CLI commands are thin wrappers that delegate all orchestration to `app` use‑cases. This design ensures zero duplication and makes it straightforward to add alternative interfaces.

The VS Code extension is the natural next step. It will provide:

- A tree view of threads and their documents.
- Command palette actions for all workflow operations.
- File decorations for stale plans and blocked steps.
- Real‑time updates via file watchers.

This document establishes the extension's architecture, operational constraints, and integration patterns.

## Operational Mode: Mono‑Loom Only

The VS Code extension operates exclusively in **mono‑loom mode**. It activates only when a `.loom/` directory is present in the workspace root and completely ignores the global registry (`~/.loom/config.yaml`).

**Rationale:**
- VS Code is workspace‑scoped. Developers expect project‑specific tools to work immediately within the opened folder.
- Multi‑loom management is a CLI‑centric workflow; bringing global registry awareness into the IDE adds unnecessary complexity.
- A future optional setting (`loom.multiLoom.enabled`) may be considered based on user demand, but it is out of scope for the initial release.

**Implications:**
- The extension does not include `loom switch`, `loom list`, or any global registry interactions.
- The tree view always reflects the threads within the current workspace.
- The active loom root is resolved by walking up from the workspace root to find `.loom/`.

## Architecture Overview

The extension follows the same layered pattern as the CLI:

```
VS Code Extension (Presentation)
        │
        ▼
      app/ (Use‑Cases)
        │
        ▼
   core/ + fs/ (Domain + Infrastructure)
```

**Key Principles:**
- Extension commands are **thin wrappers** that parse user input (e.g., from QuickPick or input boxes) and delegate to `app` use‑cases.
- The tree view uses `app` query use‑cases (`listThreads`, `getThread`) to fetch data.
- File watchers use the `fs` layer's incremental index updates and refresh the tree view.
- No business logic lives in the extension; it is purely a presentation layer.

## Core Components

### 1. Tree View (`LoomTreeProvider`)

The primary UI element is a tree view in the Explorer sidebar. It displays:

- All threads in the workspace.
- Each thread's documents (primary design, supporting designs, plans, ideas, contexts).
- Status indicators (✅ done, 🔄 implementing, ⚠️ stale, 🔒 blocked).

**Data Source:** The tree provider calls `app/listThreads` and `app/getThread` use‑cases. It does **not** read the filesystem directly.

### 2. Commands

All workflow actions are exposed as VS Code commands (Command Palette and context menus). Each command delegates to the corresponding `app` use‑case:

| Command | `app` Use‑Case |
| :--- | :--- |
| `loom.weaveIdea` | `weaveIdea` |
| `loom.weaveDesign` | `weaveDesign` |
| `loom.weavePlan` | `weavePlan` |
| `loom.finalize` | `finalize` |
| `loom.rename` | `rename` |
| `loom.refineDesign` | `runEvent(REFINE_DESIGN)` |
| `loom.startPlan` | `runEvent(START_IMPLEMENTING_PLAN)` |
| `loom.completeStep` | `completeStep` |
| `loom.summarise` | `summarise` |
| `loom.validate` | `validate` |

Commands that require user input (e.g., title, step number) use VS Code's `showInputBox` or `showQuickPick` APIs.

### 3. File Watcher

A file watcher monitors `**/threads/**/*.md` for changes. On any change, it:

1. Calls `updateIndexForFile` (incremental link index update).
2. Refreshes the tree view.
3. Updates diagnostics for broken links.

The watcher is registered on extension activation and disposed on deactivation.

### 4. Diagnostics

The extension contributes diagnostics (squiggles) for broken `parent_id` references, missing required fields, and stale plans. Diagnostics are updated on file changes and on initial activation via the `validate` use‑case.

## Dependency Injection

The extension follows the same dependency injection pattern as the CLI. Use‑cases receive their dependencies explicitly:

```typescript
const deps = {
    getActiveLoomRoot,
    loadThread,
    saveDoc,
    fs,
    // ... other dependencies
};
```

This ensures testability and consistency across the CLI and extension.

## User Personalization

The extension respects the `loom.user.name` VS Code setting. This name is used in:

- Document body generation (e.g., `## {{user.name}}:` in chat headers).
- AI interaction prompts.

See `vscode-extension-user-personalization-design.md` for details.

## Toolbar & ViewState

The tree view supports grouping by type, thread, status, or release. Toolbar buttons and a QuickPick selector allow users to change the grouping mode. ViewState is persisted in `workspaceState`.

See `vscode-extension-toolbar-design.md` for details.

## Open Questions

- Should the extension auto‑reveal the currently active thread based on recent edits?
- How to handle large workspaces with hundreds of threads? (Pagination / virtual scrolling may be needed post‑MVP.)

## Next Steps

Implementation proceeds via the following plans:

- `vscode-extension-plan-004.md` — Core extension structure and tree view.
- `vscode-extension-plan-005.md` — Thread‑based grouping.
- `vscode-extension-plan-006.md` — Toolbar controls and actions.
