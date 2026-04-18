---
type: plan
id: vscode-extension-plan-004
title: "VS Code Extension — Loom Visual Layer"
status: draft
created: 2026-04-11
updated: 2026-04-18
version: 3
design_version: 1
tags: [vscode, extension, ui, tree, app-layer]
parent_id: vscode-extension-design
target_version: "0.5.0"
requires_load: [vscode-extension-design, vscode-extension-toolbar-design, vscode-extension-user-personalization-design]
---

# Plan — VS Code Extension (Loom Visual Layer)

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Updated** | 2026-04-18 |
| **Status** | DRAFT |
| **Design** | `vscode-extension-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Build a VS Code extension that provides a visual interface for Loom. The extension is a **thin presentation layer** that reuses the exact same `app` use‑cases as the CLI. It provides a tree view of threads, command palette actions, and file decorations.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Setup VSIX project structure | `packages/vscode/` | — |
| 🔳 | 2 | Register extension activation and deactivation | `packages/vscode/src/extension.ts` | Step 1 |
| 🔳 | 3 | Implement `LoomTreeProvider` using `app/status` | `packages/vscode/src/tree/treeProvider.ts` | Step 2 |
| 🔳 | 4 | Register Tree View in `package.json` | `packages/vscode/package.json` | Step 3 |
| 🔳 | 5 | Implement extension commands (delegating to `app` use‑cases) | `packages/vscode/src/commands/` | Step 3 |
| 🔳 | 6 | Add file watcher with link index incremental updates | `packages/vscode/src/watcher.ts` | Step 5 |
| 🔳 | 7 | Add diagnostics for broken links | `packages/vscode/src/diagnostics.ts` | Step 6 |
| 🔳 | 8 | Test in VS Code Extension Host | — | All |

---

## Step 1 — Setup VSIX Project Structure

Create `packages/vscode/` with standard VS Code extension layout:

```
packages/vscode/
├── src/
│   ├── extension.ts
│   ├── tree/
│   │   └── treeProvider.ts
│   ├── commands/
│   │   ├── weaveIdea.ts
│   │   ├── weaveDesign.ts
│   │   ├── weavePlan.ts
│   │   ├── finalize.ts
│   │   ├── rename.ts
│   │   ├── refine.ts
│   │   ├── startPlan.ts
│   │   ├── completeStep.ts
│   │   ├── summarise.ts
│   │   ├── validate.ts
│   │   └── status.ts
│   ├── watcher.ts
│   └── diagnostics.ts
├── package.json
└── tsconfig.json
```

---

## Step 2 — Register Extension Activation

**File:** `packages/vscode/src/extension.ts`

```typescript
import * as vscode from 'vscode';
import { LoomTreeProvider } from './tree/treeProvider';
import { setupFileWatcher } from './watcher';
import { updateDiagnostics } from './diagnostics';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {
    const treeProvider = new LoomTreeProvider();
    const treeView = vscode.window.createTreeView('loom.threads', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    registerCommands(context, treeProvider);

    const diagnosticCollection = vscode.languages.createDiagnosticCollection('loom');
    context.subscriptions.push(diagnosticCollection);

    const watcher = setupFileWatcher(treeProvider, diagnosticCollection);
    context.subscriptions.push(watcher);

    // Initial index build and diagnostics
    treeProvider.refresh();
    updateDiagnostics(diagnosticCollection);
}

export function deactivate() {}
```

---

## Step 3 — Implement `LoomTreeProvider` Using `app/status`

**File:** `packages/vscode/src/tree/treeProvider.ts`

```typescript
import * as vscode from 'vscode';
import { status } from '../../../../app/dist/status';
import { getActiveLoomRoot, loadThread } from '../../../../fs/dist';
import { buildLinkIndex } from '../../../../fs/dist';

export class LoomTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!element) {
            return this.getThreadNodes();
        }
        return element.children || [];
    }

    private async getThreadNodes(): Promise<vscode.TreeItem[]> {
        const result = await status(
            { verbose: false },
            { getActiveLoomRoot, loadThread, buildLinkIndex, fs: require('fs-extra') }
        );

        if (!result.list) return [];

        return result.list.map(t => {
            const item = new vscode.TreeItem(t.id, vscode.TreeItemCollapsibleState.Collapsed);
            item.description = t.status;
            item.contextValue = 'thread';
            item.iconPath = new vscode.ThemeIcon('symbol-class');
            return item;
        });
    }
}
```

---

## Step 4 — Register Tree View in `package.json`

```json
{
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "loom.threads",
          "name": "Loom",
          "icon": "resources/loom.svg"
        }
      ]
    }
  }
}
```

---

## Step 5 — Implement Extension Commands

Each command is a thin wrapper that calls the corresponding `app` use‑case.

**Example: `weaveIdea.ts`**
```typescript
import * as vscode from 'vscode';
import { weaveIdea } from '../../../../app/dist';
import { getActiveLoomRoot, saveDoc } from '../../../../fs/dist';
import * as fs from 'fs-extra';

export async function weaveIdeaCommand(): Promise<void> {
    const title = await vscode.window.showInputBox({ prompt: 'Idea title' });
    if (!title) return;

    try {
        const result = await weaveIdea(
            { title },
            { getActiveLoomRoot, saveDoc, fs }
        );
        vscode.window.showInformationMessage(`Idea woven: ${result.tempId}`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed: ${e.message}`);
    }
}
```

Similar wrappers for `weaveDesign`, `weavePlan`, `finalize`, `rename`, `refine`, `startPlan`, `completeStep`, `summarise`, `validate`, `status`.

---

## Step 6 — Add File Watcher

**File:** `packages/vscode/src/watcher.ts`

```typescript
import * as vscode from 'vscode';
import { LoomTreeProvider } from './tree/treeProvider';
import { updateIndexForFile } from '../../../../fs/dist';
import { buildLinkIndex } from '../../../../fs/dist';

let linkIndex = await buildLinkIndex();

export function setupFileWatcher(
    treeProvider: LoomTreeProvider,
    diagnosticCollection: vscode.DiagnosticCollection
): vscode.Disposable {
    const watcher = vscode.workspace.createFileSystemWatcher('**/threads/**/*.md');

    const onChange = async (uri: vscode.Uri) => {
        await updateIndexForFile(linkIndex, uri.fsPath, 'change');
        treeProvider.refresh();
        // updateDiagnostics(diagnosticCollection);
    };

    watcher.onDidChange(onChange);
    watcher.onDidCreate(onChange);
    watcher.onDidDelete(onChange);

    return watcher;
}
```

---

## Step 7 — Add Diagnostics for Broken Links

**File:** `packages/vscode/src/diagnostics.ts`

```typescript
import * as vscode from 'vscode';
import { validate } from '../../../../app/dist';
import { getActiveLoomRoot, buildLinkIndex, loadDoc } from '../../../../fs/dist';
import * as fs from 'fs-extra';

export async function updateDiagnostics(collection: vscode.DiagnosticCollection): Promise<void> {
    const result = await validate(
        { all: true },
        { getActiveLoomRoot, buildLinkIndex, loadDoc, fs }
    );

    for (const r of result.results) {
        if (r.issues.length === 0) continue;
        // Convert issues to VS Code diagnostics...
    }
}
```

---

## Step 8 — Test in VS Code Extension Host

Press `F5` to launch Extension Development Host. Open a loom workspace and verify the tree view and commands work.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
