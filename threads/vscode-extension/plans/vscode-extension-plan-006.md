---
type: plan
id: vscode-extension-plan-006
title: "Implement VSCode Toolbar (View Controls & Actions)"
status: draft
created: 2026-04-11
updated: 2026-04-18
version: 2
design_version: 1
tags: [vscode, toolbar, ui, viewstate, app-layer]
parent_id: vscode-extension-design
target_version: "0.6.0"
requires_load: [vscode-extension-toolbar-design, vscode-extension-plan-004, vscode-extension-plan-005]
---

# Plan — Implement VSCode Toolbar (View Controls & Actions)

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Updated** | 2026-04-18 |
| **Status** | DRAFT |
| **Design** | `vscode-extension-toolbar-design.md` |
| **Target version** | 0.6.0 |

---

# Goal

Implement a fully functional VSCode toolbar system for the Loom view, including:

- View controls (grouping, filters) that modify `ViewState`.
- Context‑aware action buttons that invoke `app` use‑cases.
- Command registration and binding.
- Tree refresh triggered by `ViewState` changes.

All commands **must** delegate to the `app` layer and **not** contain orchestration logic.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Define commands in `package.json` | `packages/vscode/package.json` | — |
| 🔳 | 2 | Contribute view toolbar UI in `package.json` | `packages/vscode/package.json` | Step 1 |
| 🔳 | 3 | Implement `ViewStateManager` | `packages/vscode/src/view/viewStateManager.ts` | — |
| 🔳 | 4 | Register commands in `extension.ts` | `packages/vscode/src/extension.ts` | Steps 1, 3 |
| 🔳 | 5 | Bind commands to `ViewState` updates | `packages/vscode/src/commands/view.ts` | Step 4 |
| 🔳 | 6 | Implement grouping selector (QuickPick) | `packages/vscode/src/commands/grouping.ts` | Step 5 |
| 🔳 | 7 | Implement filter controls (text, archived) | `packages/vscode/src/commands/filter.ts` | Step 5 |
| 🔳 | 8 | Implement action commands (weave, refine, start‑plan, etc.) | `packages/vscode/src/commands/actions.ts` | Step 5 |
| 🔳 | 9 | Add context‑based enable/disable using `when` clauses | `packages/vscode/package.json` | Step 2 |
| 🔳 | 10 | Connect refresh cycle | `packages/vscode/src/extension.ts` | All |

---

## Step 1 — Define Commands in `package.json`

Add all toolbar‑related commands to the `contributes.commands` section. Each command ID follows the pattern `loom.<action>`.

```json
{
  "contributes": {
    "commands": [
      { "command": "loom.setGroupingType", "title": "Group by Type" },
      { "command": "loom.setGroupingThread", "title": "Group by Thread" },
      { "command": "loom.setGroupingStatus", "title": "Group by Status" },
      { "command": "loom.setGroupingRelease", "title": "Group by Release" },
      { "command": "loom.setTextFilter", "title": "Filter by Text" },
      { "command": "loom.toggleArchived", "title": "Toggle Archived" },
      { "command": "loom.focusThread", "title": "Focus Thread" },
      { "command": "loom.weaveIdea", "title": "Weave Idea" },
      { "command": "loom.weaveDesign", "title": "Weave Design" },
      { "command": "loom.weavePlan", "title": "Weave Plan" },
      { "command": "loom.newChat", "title": "New Chat" },
      { "command": "loom.refineDesign", "title": "Refine Design" },
      { "command": "loom.startPlan", "title": "Start Plan" },
      { "command": "loom.completeStep", "title": "Complete Step" }
    ]
  }
}
```

---

## Step 2 — Contribute View Toolbar UI

Attach commands to the view toolbar using `menus.view/title`. Use `when` clauses to control visibility based on the active view and selected node context.

```json
{
  "contributes": {
    "menus": {
      "view/title": [
        { "command": "loom.setGroupingThread", "when": "view == loom.threads", "group": "navigation@1" },
        { "command": "loom.setTextFilter", "when": "view == loom.threads", "group": "navigation@2" },
        { "command": "loom.toggleArchived", "when": "view == loom.threads", "group": "navigation@3" },
        { "command": "loom.focusThread", "when": "view == loom.threads", "group": "navigation@4" },
        { "command": "loom.weaveIdea", "when": "view == loom.threads", "group": "actions@1" },
        { "command": "loom.weaveDesign", "when": "view == loom.threads && viewItem == thread", "group": "actions@2" },
        { "command": "loom.weavePlan", "when": "view == loom.threads && viewItem == design", "group": "actions@3" },
        { "command": "loom.newChat", "when": "view == loom.threads", "group": "actions@4" },
        { "command": "loom.refineDesign", "when": "view == loom.threads && viewItem == design", "group": "actions@5" }
      ]
    }
  }
}
```

---

## Step 3 — Implement `ViewStateManager`

**File:** `packages/vscode/src/view/viewStateManager.ts`

```typescript
import * as vscode from 'vscode';
import { ViewState, defaultViewState } from './viewState';

export class ViewStateManager {
    private state: ViewState;

    constructor(private workspaceState: vscode.Memento) {
        this.state = { ...defaultViewState, ...workspaceState.get<ViewState>('loom.viewState') };
    }

    getState(): ViewState {
        return this.state;
    }

    update(partial: Partial<ViewState>): ViewState {
        this.state = { ...this.state, ...partial };
        this.workspaceState.update('loom.viewState', this.state);
        return this.state;
    }

    reset(): ViewState {
        this.state = { ...defaultViewState };
        this.workspaceState.update('loom.viewState', this.state);
        return this.state;
    }
}
```

---

## Step 4 — Register Commands in `extension.ts`

```typescript
import { ViewStateManager } from './view/viewStateManager';
import { LoomTreeProvider } from './tree/treeProvider';

export function activate(context: vscode.ExtensionContext) {
    const viewStateManager = new ViewStateManager(context.workspaceState);
    const treeProvider = new LoomTreeProvider(viewStateManager);

    const refresh = () => treeProvider.refresh();

    context.subscriptions.push(
        vscode.commands.registerCommand('loom.setGroupingThread', () => {
            viewStateManager.update({ grouping: 'thread' });
            refresh();
        }),
        vscode.commands.registerCommand('loom.setTextFilter', async () => {
            const input = await vscode.window.showInputBox({ placeHolder: 'Filter threads...' });
            if (input !== undefined) {
                viewStateManager.update({ textFilter: input || undefined });
                refresh();
            }
        }),
        vscode.commands.registerCommand('loom.toggleArchived', () => {
            const current = viewStateManager.getState().showArchived;
            viewStateManager.update({ showArchived: !current });
            refresh();
        }),
        // ... register all other commands
    );
}
```

---

## Step 5 — Bind Commands to `ViewState` Updates

**File:** `packages/vscode/src/commands/view.ts`

```typescript
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';
import { ViewState } from '../view/viewState';

export function updateViewStateAndRefresh(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider,
    update: Partial<ViewState>
): void {
    manager.update(update);
    treeProvider.refresh();
}
```

---

## Step 6 — Implement Grouping Selector (QuickPick)

**File:** `packages/vscode/src/commands/grouping.ts`

```typescript
import * as vscode from 'vscode';
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';
import { updateViewStateAndRefresh } from './view';

export async function showGroupingSelector(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): Promise<void> {
    const options: vscode.QuickPickItem[] = [
        { label: '$(symbol-class) Type', description: 'Group by document type' },
        { label: '$(project) Thread', description: 'Group by feature thread' },
        { label: '$(git-commit) Status', description: 'Group by workflow status' },
        { label: '$(tag) Release', description: 'Group by target release' },
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select grouping mode',
    });

    if (selected) {
        const mode = selected.label.includes('Type') ? 'type' :
                     selected.label.includes('Thread') ? 'thread' :
                     selected.label.includes('Status') ? 'status' : 'release';
        updateViewStateAndRefresh(manager, treeProvider, { grouping: mode as any });
    }
}
```

---

## Step 7 — Implement Filter Controls

**File:** `packages/vscode/src/commands/filter.ts`

```typescript
import * as vscode from 'vscode';
import { ViewStateManager } from '../view/viewStateManager';
import { LoomTreeProvider } from '../tree/treeProvider';
import { updateViewStateAndRefresh } from './view';

export async function setTextFilter(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): Promise<void> {
    const current = manager.getState().textFilter;
    const input = await vscode.window.showInputBox({
        prompt: 'Filter documents by text',
        value: current,
        placeHolder: 'Enter search term...',
    });

    if (input !== undefined) {
        updateViewStateAndRefresh(manager, treeProvider, { textFilter: input || undefined });
    }
}

export function toggleArchived(
    manager: ViewStateManager,
    treeProvider: LoomTreeProvider
): void {
    const current = manager.getState().showArchived;
    updateViewStateAndRefresh(manager, treeProvider, { showArchived: !current });
}
```

---

## Step 8 — Implement Action Commands

Each action command is a thin wrapper that calls the corresponding `app` use‑case and refreshes the tree upon success.

**File:** `packages/vscode/src/commands/actions.ts`

```typescript
import * as vscode from 'vscode';
import { weaveIdea } from '../../../../app/dist';
import { weaveDesign } from '../../../../app/dist';
import { weavePlan } from '../../../../app/dist';
import { refineDesign } from '../../../../app/dist';
import { startPlan } from '../../../../app/dist';
import { completeStep } from '../../../../app/dist';
import { getActiveLoomRoot, saveDoc, loadThread } from '../../../../fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function weaveIdeaCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const title = await vscode.window.showInputBox({ prompt: 'Idea title' });
    if (!title) return;
    try {
        await weaveIdea({ title }, { getActiveLoomRoot, saveDoc, fs });
        vscode.window.showInformationMessage(`Idea woven: ${title}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed: ${e.message}`);
    }
}

export async function weaveDesignCommand(threadId: string, treeProvider: LoomTreeProvider): Promise<void> {
    try {
        const result = await weaveDesign({ threadId }, { getActiveLoomRoot, saveDoc, fs });
        vscode.window.showInformationMessage(`Design woven: ${result.id}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed: ${e.message}`);
    }
}

export async function weavePlanCommand(threadId: string, treeProvider: LoomTreeProvider): Promise<void> {
    try {
        const result = await weavePlan({ threadId }, { getActiveLoomRoot, loadThread, saveDoc, fs });
        vscode.window.showInformationMessage(`Plan woven: ${result.id}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed: ${e.message}`);
    }
}

export async function refineDesignCommand(threadId: string, treeProvider: LoomTreeProvider): Promise<void> {
    try {
        await refineDesign(threadId, { loadThread, saveDoc });
        vscode.window.showInformationMessage(`Design refined: ${threadId}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed: ${e.message}`);
    }
}

export async function startPlanCommand(planId: string, treeProvider: LoomTreeProvider): Promise<void> {
    try {
        await startPlan(planId, { loadThread, saveDoc });
        vscode.window.showInformationMessage(`Plan started: ${planId}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed: ${e.message}`);
    }
}

export async function completeStepCommand(planId: string, step: number, treeProvider: LoomTreeProvider): Promise<void> {
    try {
        await completeStep({ planId, step }, { loadThread, runEvent: async (tid, evt) => { /* ... */ } });
        vscode.window.showInformationMessage(`Step ${step} completed`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed: ${e.message}`);
    }
}
```

---

## Step 9 — Add Context‑Based Enable/Disable

In `LoomTreeProvider`, set `contextValue` on each `TreeItem`:

```typescript
getTreeItem(node: TreeNode): vscode.TreeItem {
    const item = new vscode.TreeItem(node.label, node.collapsibleState);
    if (node.type === 'group' && node.threadId) {
        item.contextValue = 'thread';
    } else if (node.doc) {
        item.contextValue = node.doc.type;
    }
    return item;
}
```

The `when` clauses in `package.json` (Step 2) will use these values.

---

## Step 10 — Connect Refresh Cycle

All commands that modify state must end with `treeProvider.refresh()`. This is already handled in the action wrappers above.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |