---
type: plan
id: workflow-plan-006-toolbar
title: "Implement VSCode Toolbar (View Controls & Actions)"
status: active
created: 2026-04-11
version: 1
tags: [toolbar, vscode, commands, ui, viewstate]
design_id: workflow-toolbar-viewstate
target_version: 0.6.0
requires_load: [workflow-toolbar-viewstate, workflow-feature-model]
---

# Feature — Implement VSCode Toolbar

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Status** | DRAFT |
| **Design** | `wf/plans/design/workflow-toolbar-viewstate-design.md` |
| **Target version** | 0.6.0 |

---

# Goal

Implement a fully functional VSCode toolbar system for the workflow view, including:

- View controls (grouping, filters)
- Context-aware action buttons
- Command registration
- Binding toolbar actions to ViewState
- Triggering Tree refresh

---

# Steps

| # | Done | Step | Files touched |
|---|---|---|---|
| 1 | — | Define commands in package.json | `package.json` |
| 2 | — | Contribute view toolbar UI | `package.json` |
| 3 | — | Implement ViewState manager | `src/view/viewStateManager.ts` |
| 4 | — | Register commands in extension.ts | `src/extension.ts` |
| 5 | — | Bind commands to ViewState updates | `src/extension.ts` |
| 6 | — | Implement grouping selector | `src/commands/grouping.ts` |
| 7 | — | Implement filter controls | `src/commands/filter.ts` |
| 8 | — | Implement action commands | `src/commands/actions.ts` |
| 9 | — | Add context-based enable/disable | `package.json` |
| 10 | — | Connect refresh cycle | `src/extension.ts` |

---

## Step 1 — Define Commands

Add commands to `package.json`.

```json
{
  "contributes": {
    "commands": [
      { "command": "workflow.setGroupingType", "title": "Group by Type" },
      { "command": "workflow.setGroupingFeature", "title": "Group by Feature" },
      { "command": "workflow.setGroupingTag", "title": "Group by Tag" },
      { "command": "workflow.setGroupingStatus", "title": "Group by Status" },

      { "command": "workflow.setTextFilter", "title": "Filter by Text" },
      { "command": "workflow.toggleShowDone", "title": "Toggle Done" },
      { "command": "workflow.toggleShowCancelled", "title": "Toggle Cancelled" },

      { "command": "workflow.createIdea", "title": "Create Idea" },
      { "command": "workflow.createDesign", "title": "Create Design" },
      { "command": "workflow.createPlan", "title": "Create Plan" },
      { "command": "workflow.createContext", "title": "Create Context" }
    ]
  }
}
````

---

## Step 2 — Contribute Toolbar UI

Attach commands to the view toolbar.

```json
{
  "contributes": {
    "menus": {
      "view/title": [
        {
          "command": "workflow.setGroupingType",
          "when": "view == workflowView",
          "group": "navigation@1"
        },
        {
          "command": "workflow.setGroupingFeature",
          "when": "view == workflowView",
          "group": "navigation@2"
        },
        {
          "command": "workflow.setTextFilter",
          "when": "view == workflowView",
          "group": "navigation@3"
        },

        {
          "command": "workflow.createIdea",
          "when": "view == workflowView",
          "group": "actions@1"
        },
        {
          "command": "workflow.createPlan",
          "when": "view == workflowView && viewItem == design",
          "group": "actions@2"
        }
      ]
    }
  }
}
```

---

## Step 3 — ViewState Manager

Centralize state mutation.

```ts
// src/view/viewStateManager.ts

export class ViewStateManager {
  private state: ViewState;

  constructor(initial: ViewState) {
    this.state = initial;
  }

  getState(): ViewState {
    return this.state;
  }

  update(partial: Partial<ViewState>): ViewState {
    this.state = { ...this.state, ...partial };
    return this.state;
  }
}
```

---

## Step 4 — Register Commands

```ts
// extension.ts

const viewStateManager = new ViewStateManager(defaultViewState);

context.subscriptions.push(
  vscode.commands.registerCommand('workflow.setGroupingType', () => {
    viewStateManager.update({ grouping: 'type' });
    treeProvider.refresh();
  })
);

context.subscriptions.push(
  vscode.commands.registerCommand('workflow.setGroupingFeature', () => {
    viewStateManager.update({ grouping: 'feature' });
    treeProvider.refresh();
  })
);
```

---

## Step 5 — Bind Commands to ViewState

Pattern:

```ts
function updateViewStateAndRefresh(update: Partial<ViewState>) {
  viewStateManager.update(update);
  treeProvider.refresh();
}
```

---

## Step 6 — Grouping Selector

Option A (simple):

* separate buttons (Type / Feature / Tag / Status)

Option B (better UX, later):

* QuickPick menu

```ts
await vscode.window.showQuickPick([
  'type',
  'feature',
  'tag',
  'status'
]);
```

---

## Step 7 — Filter Controls

### Text Filter

```ts
const input = await vscode.window.showInputBox({
  placeHolder: 'Filter documents...'
});

updateViewStateAndRefresh({ textFilter: input });
```

---

### Toggle Done

```ts
const current = viewStateManager.getState().showDone;

updateViewStateAndRefresh({
  showDone: !current
});
```

---

## Step 8 — Action Commands

Example:

```ts
vscode.commands.registerCommand('workflow.createPlan', (node: TreeNode) => {
  if (!node.doc || node.doc.type !== 'design') return;

  // create plan linked to design.id
});
```

---

## Step 9 — Context-Based Enable/Disable

Use `contextValue` from TreeItem.

```ts
item.contextValue = 'design';
```

In `package.json`:

```json
{
  "when": "viewItem == design"
}
```

---

## Step 10 — Refresh Cycle

All commands MUST end with:

```ts
treeProvider.refresh();
```

---

# Notes

* Toolbar commands must NOT:

  * manipulate tree directly
  * bypass ViewState

* Always:

  ```text
  Command → ViewState → ViewModel → Tree
  ```

---

# Expected Result

Toolbar:

```text
[ Type ] [ Feature ] [ Filter 🔍 ] | [ +Idea ] [ +Plan ]
```

Behavior:

* switching grouping updates tree
* filters apply instantly
* actions enabled depending on selection

---

# Next Step

* Implement QuickPick-based grouping selector (better UX)
* Add Focus Feature command
* Persist ViewState (workspace storage)