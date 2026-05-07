---
type: design
id: de_01KQYDFDDE0PPQX6WSKFF5XBQB
title: Toolbar & ViewState Interaction Model
status: done
created: "2026-04-11T00:00:00.000Z"
updated: "2026-04-14T00:00:00.000Z"
version: 2
tags: [ui, toolbar, viewstate, vscode, loom]
parent_id: de_01KQYDFDDEQ81VMM0SPD1P1DBM
requires_load: [de_01KQYDFDDEQ81VMM0SPD1P1DBM]
target_release: 0.4.0
actual_release: null
---

# Toolbar & ViewState Interaction Model — REslava Loom

## Goal

Define how the toolbar controls (grouping, filtering, actions) interact with the ViewState and how those changes affect the thread‑based tree rendering. This ensures a consistent, predictable, and extensible UI behavior within the REslava Loom VS Code extension.

## Context

With the introduction of:
- ViewModel (projection layer)
- Thread model (hierarchical grouping)
- Filtering (status, text)

the UI must provide a way for users to control how data is visualized. The toolbar becomes the **control surface** for ViewState.

# CHAT

## Rafa:
Define how toolbar interacts with ViewState and thread grouping.

## AI:
Toolbar → ViewState → ViewModel → TreeProvider → UI. Toolbar modifies ViewState; ViewState drives projection; ViewModel builds tree; TreeProvider renders.

### 1. ViewState as Single Source of Truth

```ts
interface ViewState {
  grouping: 'type' | 'thread' | 'status' | 'release';
  textFilter?: string;
  statusFilter: string[];
  showArchived: boolean;
  focusedThreadId?: string;
  activeLoom?: string;  // For multi‑loom display
}
```

**Key Rule:** UI never manipulates tree directly — only updates ViewState.

### 2. Toolbar Structure

#### Toolbar 1 — View Controls

```text
[ Group By ▼ ]  [ Search 🔍 ]  [ Active ✓ ] [ Archived ]
```

| Control | Options | Effect |
|---------|---------|--------|
| Grouping Selector | Type, Thread, Status, Release | `viewState.grouping = 'thread'` → refresh |
| Text Filter | Input field | `viewState.textFilter = input` (debounced) |
| Status Toggles | Active, Done, Cancelled | Updates `statusFilter` |
| Archived Toggle | Show/Hide | `viewState.showArchived = !current` |

#### Toolbar 2 — Actions (Context‑aware)

```text
[ Weave Idea ] [ Weave Design ] [ Weave Plan ] [ New Chat ]
```

Action visibility depends on selected node:

| Action | Visible when | Behavior |
|--------|--------------|----------|
| Weave Idea | Always | Standalone or linked to thread |
| Weave Design | Idea or thread selected | Attach to thread |
| Weave Plan | Design selected | Attach to design |
| New Chat | Any node | Create chat in `chats/` |

**Design Decision:** Prefer **disable with tooltip**, not hide.

### 3. Thread Grouping Interaction

When `grouping = 'thread'`, tree becomes:

```text
🧵 Thread: Payment System
 ├── 📄 Design
 ├── 📋 Plans
 ├── 💡 Ideas
 └── 📚 Contexts
```

**Filtering Behavior:** Filters apply **before grouping** — `docs → filter → groupByThread`. Empty sections are hidden; entire thread hidden if no docs pass filter.

### 4. Focus Thread Mode

New control: `[ Focus Mode ]` — sets `viewState.focusedThreadId`. Only one thread rendered. Clear by clicking again.

### 5. Multi‑Loom Awareness

When multiple looms are registered, toolbar includes a loom selector:

```text
[ 🧵 default ▼ ]  [ Group By ▼ ]  ...
```

Switching looms updates the active loom via `loom switch` and refreshes the tree.

### 6. ViewModel Integration

```ts
buildTree(state: ViewState): TreeNode[] {
  let docs = this.store.getAllDocs(state.activeLoom);
  docs = this.applyFilters(docs, state);
  let nodes = state.grouping === 'thread' 
    ? this.groupByThread(docs) 
    : this.groupByType(docs);
  if (state.focusedThreadId) {
    nodes = nodes.filter(n => n.threadId === state.focusedThreadId);
  }
  return nodes;
}
```

### 7. Archive Sections

Archived threads are shown in a separate collapsible section when `showArchived: true`. They are **not** grouped by thread — simple flat list.

### 8. UX Principles

- **Predictability:** Same filters apply across all groupings.
- **Stability:** Toolbar actions do not shift layout.
- **Progressive Disclosure:** Advanced modes (thread, focus) are optional.
- **Performance:** Filtering happens once; grouping uses filtered dataset.

### 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty tree | Show "No results found" |
| Partial thread | Allowed (e.g., only plans visible) |
| Orphan docs | Shown in "Unassigned" group |

### 10. Future Extensions

- **Saved Views:** Named presets of ViewState.
- **Quick Filters:** My Work, Recent, Active Only.
- **Inline Editing:** Change status directly from tree.

## Decision

ViewState is the **only mutable UI state**. Toolbar is a **pure controller of ViewState**. Thread grouping is a **projection**, not a structure. Filtering always happens **before grouping**.

## Next Steps

- Implement toolbar commands.
- Wire ViewState mutation handlers.
- Connect refresh cycle.
