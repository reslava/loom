---
type: design
id: workflow-toolbar-viewstate-design
title: "Toolbar & ViewState Interaction Model"
status: draft
created: 2026-04-11
version: 1.0.0
tags: [ui, toolbar, viewstate, feature, interaction]
parent_id: workflow-vscode-extension
child_ids: []
requires_load: [workflow-feature-model]
---

# Toolbar & ViewState Interaction Model

## Goal

Define how the toolbar controls (grouping, filtering, actions) interact with the ViewState and how those changes affect the Feature-based tree rendering. This ensures a consistent, predictable, and extensible UI behavior.

---

## Context

With the introduction of:

- ViewModel (projection layer)
- Feature model (hierarchical grouping)
- Filtering (status, text)

the UI must provide a way for users to control how data is visualized.

The toolbar becomes the **control surface** for ViewState.

---

# CHAT

## User:
Define how toolbar interacts with ViewState and Feature grouping.

## AI:

## Core Concept

```text
Toolbar → ViewState → ViewModel → TreeProvider → UI
````

* Toolbar modifies ViewState
* ViewState drives projection
* ViewModel builds tree
* TreeProvider renders

---

## ViewState as Single Source of Truth

```ts
interface ViewState {
  grouping: 'type' | 'feature' | 'tag' | 'status';

  textFilter?: string;

  statusFilter: string[];

  showDone: boolean;
  showCancelled: boolean;

  focusedFeatureId?: string;
}
```

### Key Rule

> UI never manipulates tree directly — only updates ViewState.

---

## Toolbar Structure

### Toolbar 1 — View Controls

Controls visualization.

```text
[ Group By ▼ ]  [ Search 🔍 ]  [ Active ✓ ] [ Done ] [ Cancelled ]
```

#### Controls

##### 1. Grouping Selector

Options:

```text
Type | Feature | Tag | Status
```

Effect:

```ts
viewState.grouping = 'feature';
```

Triggers:

```ts
treeProvider.refresh();
```

---

##### 2. Text Filter

Input field.

Effect:

```ts
viewState.textFilter = input;
```

Behavior:

* applied live (debounced recommended)
* filters across all groupings

---

##### 3. Status Filter Toggles

Controls visibility:

```ts
viewState.statusFilter = ['active', 'implementing', 'draft'];
viewState.showDone = false;
viewState.showCancelled = false;
```

---

### Toolbar 2 — Actions

Context-aware commands.

```text
[ +Idea ] [ +Design ] [ +Plan ] [ +Ctx ]
```

---

## Action Visibility Rules

Actions depend on selected node.

| Action         | Visible when          | Behavior             |
| -------------- | --------------------- | -------------------- |
| Create Idea    | always                | standalone or linked |
| Create Design  | idea or root selected | attach to idea       |
| Create Plan    | design selected       | attach to design     |
| Create Context | any node              | attach to selected   |

---

### Design Decision: Hide vs Disable

Decision:

> Prefer **disable with tooltip**, not hide

Reason:

* avoids UI shifting
* improves discoverability

---

## Feature Grouping Interaction

### When grouping = 'feature'

Tree becomes:

```text
Feature (Design)
 ├── Design
 ├── Plans
 ├── Ideas
 └── Contexts
```

---

### Filtering Behavior

Filters apply **before grouping**:

```ts
docs → filter → groupByFeature
```

Effect:

* Feature may appear partially filled
* Empty sections are hidden
* Entire feature hidden if no docs pass filter

---

### Focus Feature Mode

New control:

```text
[ Focus Mode ]
```

Behavior:

```ts
viewState.focusedFeatureId = feature.id;
```

Effect:

```text
Only one feature is rendered
```

---

### Clearing Focus

```ts
viewState.focusedFeatureId = undefined;
```

---

## ViewModel Integration

```ts
buildTree(state: ViewState): TreeNode[] {
  let docs = this.store.getAllDocs();

  docs = this.applyFilters(docs, state);

  let nodes = [];

  switch (state.grouping) {
    case 'feature':
      nodes = this.groupByFeature(docs);
      break;
    default:
      nodes = this.groupByType(docs);
  }

  if (state.focusedFeatureId) {
    nodes = nodes.filter(n => this.isFeatureNode(n, state.focusedFeatureId));
  }

  return nodes;
}
```

---

## Archive Sections (Done / Cancelled)

Separate UI sections:

```text
Active Work (Tree)

Archive
 ├── Done (list)
 └── Cancelled (list)
```

---

### Behavior

* NOT grouped by feature
* simple flat lists
* respect `showDone` / `showCancelled`

---

## UX Principles

### 1. Predictability

* same filters apply across all groupings

---

### 2. Stability

* toolbar actions do not shift layout

---

### 3. Progressive Disclosure

* advanced modes (feature, focus) are optional

---

### 4. Performance

* filtering happens once
* grouping uses filtered dataset

---

## Edge Cases

### Empty Tree

If no results:

```text
No results found
```

---

### Partial Feature

Allowed:

```text
Feature A
 ├── Plans (1)
```

---

### Orphan Docs

Shown in:

```text
Unassigned
```

---

## Future Extensions

### Saved Views

```ts
ViewPreset {
  name: string;
  state: ViewState;
}
```

---

### Quick Filters

```text
My Work | Recent | Active Only
```

---

### Inline Editing

* change status directly from tree
* update ViewState automatically

---

## Decision

* ViewState is the **only mutable UI state**
* Toolbar is a **pure controller of ViewState**
* Feature grouping is a **projection**, not a structure
* Filtering always happens **before grouping**

---

## Open Questions

* Should focus mode persist across sessions?
* Should grouping preference be workspace-specific?
* Should archive sections be collapsible or separate views?

---

## Next Step

Implement:

* Toolbar commands
* ViewState mutation handlers
* Bind UI controls to ViewState updates
* Connect refresh cycle
