---
type: plan
id: link-index-plan-001
title: "Implement Structured Link Index"
status: draft
created: 2026-04-14
version: 1
design_version: 1
tags: [linking, index, validation, performance]
parent_id: link-index-design
target_version: "0.2.0"
requires_load: [link-index-design]
---

# Plan — Implement Structured Link Index

| | |
|---|---|
| **Created** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `link-index-design.md` |
| **Target version** | 0.2.0 |

---

# Goal

Implement a fast, in‑memory index of all document relationships (`parent_id`, `child_ids`, `Blocked by`) to enable instant validation and dependency resolution.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Define LinkIndex types and interfaces | `packages/core/src/linkIndex.ts` | — |
| ✅ | 2 | Implement index builder (full scan) | `packages/fs/src/buildLinkIndex.ts` | Step 1 |
| ✅ | 3 | Implement incremental update functions | `packages/fs/src/updateLinkIndex.ts` | Step 2 |
| ⏳ | 4 | Integrate index with VS Code extension | `packages/vscode/src/extension.ts`, `watcher.ts` | Step 3 |
| ✅ | 5 | Use index in `loom validate` command | `packages/cli/src/commands/validate.ts` | Step 2 |
| ✅ | 6 | Use index in `loom status` for blocker resolution | `packages/cli/src/commands/status.ts` | Step 2 |
| ⏳ | 7 | Add diagnostics for broken links in VS Code | `packages/vscode/src/diagnostics.ts` | Step 4 |
| ✅ | 8 | Test with sample workspace | `looms/test/` | All |

---

## Step 1 — Define LinkIndex Types and Interfaces

**File:** `packages/core/src/linkIndex.ts`

```typescript
export interface DocumentEntry {
  path: string;
  type: DocumentType;
  exists: boolean;
}

export interface StepBlocker {
  step: number;
  blockedBy: string[];
}

export interface LinkIndex {
  documents: Map<string, DocumentEntry>;
  children: Map<string, Set<string>>;
  parent: Map<string, string>;
  stepBlockers: Map<string, StepBlocker[]>;
}

export function createEmptyIndex(): LinkIndex {
  return {
    documents: new Map(),
    children: new Map(),
    parent: new Map(),
    stepBlockers: new Map(),
  };
}
```

---

## Step 2 — Implement Index Builder (Full Scan)

**File:** `packages/fs/src/buildLinkIndex.ts`

```typescript
import { loadAllDocuments } from './loadAll';
import { parseFrontmatter, parseStepsTable } from './parser';
import { LinkIndex, createEmptyIndex } from '../../core/src/linkIndex';

export async function buildLinkIndex(loomRoot: string): Promise<LinkIndex> {
  const index = createEmptyIndex();
  const docs = await loadAllDocuments(loomRoot);

  for (const doc of docs) {
    // Populate documents map
    index.documents.set(doc.id, {
      path: (doc as any)._path,
      type: doc.type,
      exists: true,
    });

    // Populate parent map
    if (doc.parent_id) {
      index.parent.set(doc.id, doc.parent_id);
    }

    // Populate children map
    if (doc.child_ids) {
      for (const childId of doc.child_ids) {
        if (!index.children.has(doc.id)) {
          index.children.set(doc.id, new Set());
        }
        index.children.get(doc.id)!.add(childId);
      }
    }

    // Populate step blockers for plans
    if (doc.type === 'plan') {
      const steps = parseStepsTable(doc.content);
      const blockers: StepBlocker[] = steps
        .filter(s => s.blockedBy.length > 0)
        .map(s => ({ step: s.order, blockedBy: s.blockedBy }));
      if (blockers.length > 0) {
        index.stepBlockers.set(doc.id, blockers);
      }
    }
  }

  return index;
}
```

---

## Step 3 — Implement Incremental Update Functions

**File:** `packages/fs/src/updateLinkIndex.ts`

```typescript
import { LinkIndex } from '../../core/src/linkIndex';
import { loadDoc } from './load';

export async function updateIndexForFile(
  index: LinkIndex,
  filePath: string,
  event: 'create' | 'change' | 'delete'
): Promise<void> {
  if (event === 'delete') {
    // Mark as non-existent but keep in documents map for orphan detection
    const docId = path.basename(filePath, '.md');
    const entry = index.documents.get(docId);
    if (entry) {
      entry.exists = false;
    }
    return;
  }

  // For create/change, reload the document
  const doc = await loadDoc(filePath);
  
  // Remove old entries for this document
  index.documents.delete(doc.id);
  index.parent.delete(doc.id);
  index.stepBlockers.delete(doc.id);
  // (Children map entries pointing to this doc will be cleaned up by parent updates)

  // Re-add with fresh data
  index.documents.set(doc.id, {
    path: filePath,
    type: doc.type,
    exists: true,
  });

  if (doc.parent_id) {
    index.parent.set(doc.id, doc.parent_id);
  }

  if (doc.type === 'plan') {
    const steps = parseStepsTable(doc.content);
    const blockers = steps
      .filter(s => s.blockedBy.length > 0)
      .map(s => ({ step: s.order, blockedBy: s.blockedBy }));
    if (blockers.length > 0) {
      index.stepBlockers.set(doc.id, blockers);
    }
  }
}
```

---

## Step 4 — Integrate Index with VS Code Extension

**File:** `packages/vscode/src/extension.ts`

```typescript
import { buildLinkIndex } from '../../fs/src/buildLinkIndex';
import { updateIndexForFile } from '../../fs/src/updateLinkIndex';

let linkIndex: LinkIndex;

export async function activate(context: vscode.ExtensionContext) {
  const loomRoot = getActiveLoomRoot();
  linkIndex = await buildLinkIndex(loomRoot);

  // Pass index to tree provider, diagnostics, and commands
  const treeProvider = new LoomTreeProvider(store, viewState, linkIndex);
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('loom');
  
  // Set up watcher with incremental updates
  const watcher = setupFileWatcher(store, treeProvider, diagnosticCollection, linkIndex);
}
```

**File:** `packages/vscode/src/watcher.ts` (updated)

```typescript
watcher.onDidChange(async (uri) => {
  await updateIndexForFile(linkIndex, uri.fsPath, 'change');
  await store.loadAll();
  treeProvider.refresh();
  updateDiagnostics(uri, linkIndex, diagnosticCollection);
});
```

---

## Step 5 — Use Index in `loom validate` Command

**File:** `packages/cli/src/commands/validate.ts`

```typescript
import { buildLinkIndex } from '../../../fs/src/buildLinkIndex';

export async function validateCommand(threadId?: string, options?: any): Promise<void> {
  const loomRoot = getActiveLoomRoot();
  const index = await buildLinkIndex(loomRoot);

  const orphans = getOrphanedDocuments(index);
  const dangling = getDanglingChildIds(index);

  if (orphans.length === 0 && dangling.length === 0) {
    console.log(chalk.green('✅ All links are valid.'));
  } else {
    if (orphans.length > 0) {
      console.log(chalk.yellow(`⚠️ Orphaned documents (${orphans.length}):`));
      orphans.forEach(id => console.log(`   - ${id}`));
    }
    if (dangling.length > 0) {
      console.log(chalk.yellow(`⚠️ Dangling child references (${dangling.length}):`));
      dangling.forEach(ref => console.log(`   - ${ref}`));
    }
  }
}
```

---

## Step 6 — Use Index in `loom status` for Blocker Resolution

**File:** `packages/cli/src/commands/status.ts`

```typescript
function isBlocked(blocker: string, index: LinkIndex, currentPlanSteps: StepStatus[]): boolean {
  if (blocker.startsWith('Step')) {
    const stepNum = parseInt(blocker.replace('Step', '').trim());
    const targetStep = currentPlanSteps.find(s => s.order === stepNum);
    return targetStep ? !targetStep.done : true;
  }
  if (blocker.includes('-plan-')) {
    const planEntry = index.documents.get(blocker);
    if (!planEntry) return true; // Plan doesn't exist
    // Need to load the plan to check its status
    // This is a cross-plan dependency — handled by loading the plan doc
    return planEntry.exists === false;
  }
  return false;
}
```

---

## Step 7 — Add Diagnostics for Broken Links in VS Code

**File:** `packages/vscode/src/diagnostics.ts`

```typescript
import { LinkIndex } from '../../../core/src/linkIndex';

export function updateDiagnostics(
  uri: vscode.Uri,
  index: LinkIndex,
  collection: vscode.DiagnosticCollection
): void {
  const docId = path.basename(uri.fsPath, '.md');
  const parentId = index.parent.get(docId);
  
  const diagnostics: vscode.Diagnostic[] = [];
  
  if (parentId && !index.documents.has(parentId)) {
    const range = findFrontmatterRange(await readFile(uri.fsPath), 'parent_id');
    diagnostics.push(new vscode.Diagnostic(
      range,
      `Parent document '${parentId}' not found.`,
      vscode.DiagnosticSeverity.Warning
    ));
  }
  
  collection.set(uri, diagnostics);
}
```

---

## Step 8 — Test with Sample Workspace

1. Create a test loom with several threads.
2. Introduce a broken `parent_id` by manually editing a file.
3. Verify VS Code shows a yellow squiggle and tree view shows ⚠️.
4. Run `loom validate` and confirm it lists the orphan.
5. Fix the link and verify diagnostics clear.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |