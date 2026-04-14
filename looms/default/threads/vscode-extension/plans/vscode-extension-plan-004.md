---
type: plan
id: vscode-extension-plan-004
title: "VSIX MVP — VS Code Extension"
status: draft
created: 2026-04-11
updated: 2026-04-14
version: 2
design_version: 1
tags: [vscode, extension, ui, tree, viewmodel]
parent_id: vscode-extension-design
target_version: "0.4.0"
requires_load: [vscode-extension-design, vscode-extension-toolbar-design, vscode-extension-user-personalization-design]
---

# Plan — VSIX MVP (VS Code Extension)

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Updated** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `vscode-extension-design.md` |
| **Target version** | 0.4.0 |

---

# Goal

Build a minimal VS Code extension (VSIX) to visualize and interact with REslava Loom. This MVP focuses on:

- Thread tree view (like `loom status`)
- Basic commands (start plan, refine design)
- Reacting to file changes
- ViewModel layer for flexible grouping and filtering
- **Immediate detection and visualization of broken document links**

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Setup VSIX project | `packages/vscode/` | — |
| 🔳 | 2 | Register extension activation | `packages/vscode/src/extension.ts` | Step 1 |
| 🔳 | 3 | Implement TreeProvider v2 + ViewModel (Grouping & Filtering) | `packages/vscode/src/tree/`, `packages/vscode/src/view/` | Step 2 |
| 🔳 | 4 | Register Tree View in package.json | `packages/vscode/package.json` | Step 3 |
| 🔳 | 5 | Integrate loadThread from filesystem layer | `packages/vscode/src/store.ts` | Step 3 |
| 🔳 | 6 | Implement commands (refine, start plan) | `packages/vscode/src/commands/` | Step 5 |
| 🔳 | 7 | Add file watcher (VS Code API) | `packages/vscode/src/watcher.ts` | Step 5 |
| 🔳 | 7.1 | Add diagnostics for broken parent_id links | `packages/vscode/src/diagnostics.ts` | Step 7 |
| 🔳 | 7.2 | Auto‑update child_ids on document creation | `packages/vscode/src/commands/weave.ts` | Step 6 |
| 🔳 | 7.3 | Show warning on file deletion if referenced | `packages/vscode/src/watcher.ts` | Step 7 |
| 🔳 | 8 | Test in VS Code Extension Host | — | All |

---

## Step 1 — Setup VSIX Project

Initialize extension using `yo code` or manually. Create TypeScript project structure:

```
packages/vscode/
├── src/
│   ├── extension.ts
│   ├── tree/
│   ├── view/
│   ├── commands/
│   ├── diagnostics/
│   └── watcher/
├── package.json
└── tsconfig.json
```

---

## Step 2 — Register Extension Activation

In `extension.ts`:

- Activate on workspace open (when `.loom/` is present).
- Register tree provider, commands, watchers, and diagnostics.
- Initialize ViewState manager.

---

## Step 3 — Implement TreeProvider v2 + ViewModel (Grouping & Filtering)

*(Detailed implementation as previously provided — unchanged)*

---

## Step 4 — Register Tree View in package.json

*(Detailed implementation as previously provided — unchanged)*

---

## Step 5 — Integrate loadThread from Filesystem Layer

*(Detailed implementation as previously provided — unchanged)*

---

## Step 6 — Implement Commands (Refine, Start Plan, Weave)

### 6.1 Weave Commands (Auto‑Maintain child_ids)

When `Loom: Weave Plan` is invoked, the extension automatically maintains bidirectional links.

**File:** `packages/vscode/src/commands/weave.ts`

```typescript
import * as vscode from 'vscode';
import { loadThread, saveThread } from '../../../fs/src';
import { generatePlanId } from '../../../fs/src/utils';

export async function weavePlan(designDoc: DesignDoc): Promise<void> {
  const thread = await loadThread(designDoc.id.split('-design')[0]);
  const existingPlanIds = thread.plans.map(p => p.id);
  const planId = generatePlanId(thread.id, existingPlanIds);

  const planDoc: PlanDoc = {
    type: 'plan',
    id: planId,
    title: `Plan — ${planId}`,
    status: 'draft',
    created: new Date().toISOString().split('T')[0],
    version: 1,
    design_version: designDoc.version,
    tags: [],
    parent_id: designDoc.id,
    target_version: designDoc.target_release || '0.1.0',
    requires_load: [],
    steps: [],
  };

  // 1. Update design's child_ids
  designDoc.child_ids = [...(designDoc.child_ids || []), planId];
  
  // 2. Save both documents
  await saveThread({ ...thread, design: designDoc, plans: [...thread.plans, planDoc] });
  
  // 3. Open the new plan file
  const planPath = getDocumentPath(planDoc, thread.id);
  await vscode.window.showTextDocument(vscode.Uri.file(planPath));
}
```

---

## Step 7 — Add File Watcher (VS Code API)

**File:** `packages/vscode/src/watcher.ts`

```typescript
import * as vscode from 'vscode';
import { LoomStore } from './store';
import { LoomTreeProvider } from './tree/treeProvider';
import { validateThread } from './diagnostics';

export function setupFileWatcher(
  store: LoomStore,
  treeProvider: LoomTreeProvider,
  diagnosticCollection: vscode.DiagnosticCollection
): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher('**/threads/**/*.md');

  const onChange = async (uri: vscode.Uri) => {
    await store.loadAll();
    treeProvider.refresh();
    
    // Run validation on the affected thread
    const threadId = extractThreadId(uri);
    if (threadId) {
      const issues = await validateThread(threadId);
      updateDiagnostics(uri, issues, diagnosticCollection);
    }
  };

  watcher.onDidChange(onChange);
  watcher.onDidCreate(onChange);
  watcher.onDidDelete(async (uri) => {
    await store.loadAll();
    treeProvider.refresh();
    
    // Check for broken references (Step 7.3)
    const brokenLinks = await findBrokenLinks(uri);
    if (brokenLinks.length > 0) {
      vscode.window.showWarningMessage(
        `Deleted file was referenced by: ${brokenLinks.join(', ')}`,
        'Show Details'
      ).then(selection => {
        if (selection === 'Show Details') {
          // Open the affected files
        }
      });
    }
  });

  return watcher;
}
```

---

## Step 7.1 — Add Diagnostics for Broken parent_id Links

**File:** `packages/vscode/src/diagnostics.ts`

```typescript
import * as vscode from 'vscode';
import { loadThread } from '../../../fs/src';
import { Document } from '../../../core/src/types';

export async function validateThread(threadId: string): Promise<DiagnosticIssue[]> {
  const thread = await loadThread(threadId);
  const issues: DiagnosticIssue[] = [];
  const allIds = new Set(thread.allDocs.map(d => d.id));

  for (const doc of thread.allDocs) {
    if (doc.parent_id && !allIds.has(doc.parent_id)) {
      issues.push({
        documentId: doc.id,
        severity: vscode.DiagnosticSeverity.Warning,
        message: `Parent document '${doc.parent_id}' not found.`,
        range: findFrontmatterRange(doc, 'parent_id'),
      });
    }
  }

  return issues;
}

export function updateDiagnostics(
  uri: vscode.Uri,
  issues: DiagnosticIssue[],
  collection: vscode.DiagnosticCollection
): void {
  const diagnostics: vscode.Diagnostic[] = issues.map(issue => 
    new vscode.Diagnostic(issue.range, issue.message, issue.severity)
  );
  collection.set(uri, diagnostics);
}
```

---

## Step 7.2 — Auto‑update child_ids on Document Creation

Already covered in **Step 6** (`weavePlan`). This ensures `child_ids` stays in sync when creating new child documents through Loom commands.

---

## Step 7.3 — Show Warning on File Deletion if Referenced

**File:** `packages/vscode/src/watcher.ts` (addition)

```typescript
async function findBrokenLinks(deletedUri: vscode.Uri): Promise<string[]> {
  const deletedId = path.basename(deletedUri.fsPath, '.md');
  const loomRoot = getActiveLoomRoot();
  const allDocs = await findAllDocuments(loomRoot);
  
  return allDocs
    .filter(doc => doc.parent_id === deletedId || doc.child_ids?.includes(deletedId))
    .map(doc => doc.id);
}
```

---

## Step 8 — Test in VS Code Extension Host

Run extension, open a test loom, and verify:
- Tree view renders threads and documents.
- Commands trigger events and update files.
- File watcher refreshes UI automatically.
- Broken `parent_id` links show yellow squiggles and tree view warnings.
- Deleting a referenced file shows a warning.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |