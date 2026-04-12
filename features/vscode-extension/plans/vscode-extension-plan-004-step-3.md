---
type: plan
id: workflow-plan-004-step
title: "TreeProvider v2 + ViewModel (Grouping & Filtering)"
status: active
created: 2026-04-11
version: 1
tags: [tree, viewmodel, ui, filtering]
design_id: workflow-vscode-extension
target_version: 0.4.0
requires_load: []
---

# Feature — TreeProvider v2 + ViewModel

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Status** | DRAFT |
| **Design** | `wf/plans/design/workflow-vscode-extension-design.md` |
| **Target version** | 0.4.0 |

---

# Goal

Introduce a ViewModel layer to support flexible grouping and filtering in the workflow tree. This decouples UI rendering from data logic and enables multiple projections (by type, feature, tag, status) while keeping TreeProvider simple and maintainable.

---

# Steps

| # | Done | Step | Files touched |
|---|---|---|---|
| 1 | — | Define ViewState | `src/view/viewState.ts` |
| 2 | — | Implement ViewModel core | `src/view/viewModel.ts` |
| 3 | — | Add filtering logic | `src/view/viewModel.ts` |
| 4 | — | Add grouping strategies | `src/view/viewModel.ts` |
| 5 | — | Refactor TreeProvider to use ViewModel | `src/tree/treeProvider.ts` |
| 6 | — | Add refresh integration | `src/extension.ts` |
| 7 | — | Prepare hooks for future feature grouping | `src/view/viewModel.ts` |

---

## Step 1 — Define ViewState

Represents the current UI state (grouping + filters).

```ts
export type GroupingMode = 'type' | 'feature' | 'tag' | 'status';

export interface ViewState {
  grouping: GroupingMode;

  textFilter?: string;

  statusFilter: string[]; 
  // default: ['active', 'implementing', 'draft']

  showDone: boolean;
  showCancelled: boolean;
}
````

Default state:

```ts
export const defaultViewState: ViewState = {
  grouping: 'type',
  textFilter: '',
  statusFilter: ['active', 'implementing', 'draft'],
  showDone: false,
  showCancelled: false
};
```

---

## Step 2 — Implement ViewModel Core

ViewModel transforms raw documents into TreeNodes.

```ts
export class WorkflowViewModel {
  constructor(private store: WorkflowStore) {}

  buildTree(state: ViewState): TreeNode[] {
    let docs = this.store.getAllDocs();

    docs = this.applyFilters(docs, state);

    switch (state.grouping) {
      case 'type':
        return this.groupByType(docs);

      case 'status':
        return this.groupByStatus(docs);

      case 'tag':
        return this.groupByTag(docs);

      case 'feature':
        return this.groupByFeature(docs);

      default:
        return [];
    }
  }
}
```

---

## Step 3 — Filtering Logic

```ts
private applyFilters(docs: BaseDoc[], state: ViewState): BaseDoc[] {
  return docs.filter(doc => {
    // Status filter
    if (!state.statusFilter.includes(doc.status)) {
      if (doc.status === 'done' && !state.showDone) return false;
      if (doc.status === 'cancelled' && !state.showCancelled) return false;
      if (!['done', 'cancelled'].includes(doc.status)) return false;
    }

    // Text filter
    if (state.textFilter) {
      const text = state.textFilter.toLowerCase();
      const matches =
        doc.title.toLowerCase().includes(text) ||
        doc.id.toLowerCase().includes(text);

      if (!matches) return false;
    }

    return true;
  });
}
```

---

## Step 4 — Grouping Strategies

### Group by Type

```ts
private groupByType(docs: BaseDoc[]): TreeNode[] {
  const groups: Record<string, BaseDoc[]> = {
    idea: [],
    design: [],
    plan: [],
    ctx: []
  };

  docs.forEach(doc => {
    groups[doc.type].push(doc);
  });

  return Object.entries(groups).map(([type, docs]) => ({
    type: 'group',
    label: this.labelForType(type),
    collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
    children: docs.map(d => this.createDocNode(d))
  }));
}
```

---

### Group by Status

```ts
private groupByStatus(docs: BaseDoc[]): TreeNode[] {
  const groups: Record<string, BaseDoc[]> = {};

  docs.forEach(doc => {
    if (!groups[doc.status]) {
      groups[doc.status] = [];
    }
    groups[doc.status].push(doc);
  });

  return Object.entries(groups).map(([status, docs]) => ({
    type: 'group',
    label: status,
    collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
    children: docs.map(d => this.createDocNode(d))
  }));
}
```

---

### Group by Tag (basic version)

```ts
private groupByTag(docs: BaseDoc[]): TreeNode[] {
  const groups: Record<string, BaseDoc[]> = {};

  docs.forEach(doc => {
    const tags = doc.tags ?? [];

    tags.forEach(tag => {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(doc);
    });
  });

  return Object.entries(groups).map(([tag, docs]) => ({
    type: 'group',
    label: `#${tag}`,
    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
    children: docs.map(d => this.createDocNode(d))
  }));
}
```

---

### Group by Feature (placeholder)

```ts
private groupByFeature(docs: BaseDoc[]): TreeNode[] {
  // TEMP: fallback to type grouping
  // Will be replaced when feature model is defined

  return this.groupByType(docs);
}
```

---

## Step 5 — TreeProvider Refactor

TreeProvider becomes thin:

```ts
export class WorkflowTreeProvider implements vscode.TreeDataProvider<TreeNode> {

  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private viewModel: WorkflowViewModel,
    private viewState: ViewState
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    return this.toTreeItem(node);
  }

  getChildren(node?: TreeNode): Thenable<TreeNode[]> {
    if (!node) {
      return Promise.resolve(this.viewModel.buildTree(this.viewState));
    }

    return Promise.resolve(node.children ?? []);
  }
}
```

---

## Step 6 — Refresh Integration

```ts
// After loading or updating documents
store.setDocs(docs);
treeProvider.refresh();
```

---

## Step 7 — Future Hooks (Feature Model Ready)

Prepare for:

```ts
interface Feature {
  id: string;
  design: BaseDoc;
  plans: BaseDoc[];
  ideas: BaseDoc[];
}
```

Future method:

```ts
private groupByFeature(docs: BaseDoc[]): TreeNode[] {
  // Will use parent_id relationships
}
```

---

# Notes

* TreeProvider must NOT:

  * read filesystem
  * parse files
  * contain grouping logic

* ViewModel is the only place where:

  * grouping
  * filtering
  * projection logic lives

---

# Next Step

Define Feature model:

* Design as root
* Plans linked via parent_id
* Ideas optionally linked
* Context documents attached

This will enable:

* grouping by feature
* focus mode
* hierarchical navigation