---
type: plan
id: vscode-extension-plan-005
title: "Implement groupByThread — Thread‑Based Tree View"
status: done, but it was implemented inline 
created: 2026-04-11
updated: 2026-04-18
version: 2
design_version: 1
tags: [vscode, tree, viewmodel, grouping, thread]
parent_id: vscode-extension-design
target_version: "0.5.0"
requires_load: [vscode-extension-design]
---

# Plan — Implement groupByThread (Thread‑Based Tree View)

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Updated** | 2026-04-18 |
| **Status** | DRAFT |
| **Design** | `vscode-extension-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Implement `groupByThread` in the ViewModel to enable grouping documents by Thread. This transforms the tree from a flat/type‑based structure into a hierarchical, work‑centric view organized around primary designs and their related documents. The implementation must use the existing `app/status` use‑case and the `LinkIndex` to resolve relationships efficiently.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Create Thread builder utility using `app/status` and `LinkIndex` | `packages/vscode/src/domain/threadBuilder.ts` | — |
| 🔳 | 2 | Implement relationship resolution via `LinkIndex` | `packages/vscode/src/domain/threadBuilder.ts` | Step 1 |
| 🔳 | 3 | Build Thread collection from documents | `packages/vscode/src/domain/threadBuilder.ts` | Step 2 |
| 🔳 | 4 | Integrate Thread builder into ViewModel | `packages/vscode/src/view/viewModel.ts` | Step 3 |
| 🔳 | 5 | Implement `groupByThread` tree projection | `packages/vscode/src/view/viewModel.ts` | Step 4 |
| 🔳 | 6 | Handle orphan documents | `packages/vscode/src/view/viewModel.ts` | Step 5 |
| 🔳 | 7 | Add basic sorting | `packages/vscode/src/view/viewModel.ts` | Step 5 |

---

## Step 1 — Create Thread Builder Utility

**File:** `packages/vscode/src/domain/threadBuilder.ts`

```typescript
import { Thread } from '@loom/core';
import { Document } from '@loom/core';
import { LinkIndex } from '@loom/core';

export function buildThreads(docs: Document[], index: LinkIndex): Thread[] {
    // Implementation in Step 3
}
```

The builder will use the `LinkIndex` to efficiently traverse `parent_id` relationships instead of scanning all documents repeatedly.

---

## Step 2 — Implement Relationship Resolution

**File:** `packages/vscode/src/domain/threadBuilder.ts`

```typescript
function resolvePrimaryDesign(
    doc: Document,
    index: LinkIndex
): DesignDoc | undefined {
    const visited = new Set<string>();
    let current: Document | undefined = doc;

    while (current?.parent_id) {
        if (visited.has(current.id)) return undefined; // cycle guard
        visited.add(current.id);

        const parentId = current.parent_id;
        const parentEntry = index.documents.get(parentId);
        if (!parentEntry) return undefined;

        // We need the full document; for now, assume we can load it or it's cached
        const parent = documentCache.get(parentId);
        if (!parent) return undefined;

        if (parent.type === 'design' && (parent as DesignDoc).role === 'primary') {
            return parent as DesignDoc;
        }

        current = parent;
    }

    return undefined;
}
```

**Note:** This step may require a `DocumentCache` that maps IDs to loaded documents. The `app/status` use‑case can provide the full thread data, so we may not need to re‑implement resolution here. Instead, we can rely on `app/status` to return fully resolved threads.

**Simpler approach:** Use `app/status` with `verbose: true` to get structured thread data directly, avoiding manual resolution entirely.

---

## Step 3 — Build Thread Collection from Documents

**File:** `packages/vscode/src/domain/threadBuilder.ts`

```typescript
import { status } from '../../../../app/dist/status';
import { getActiveLoomRoot, loadThread, buildLinkIndex } from '../../../../fs/dist';
import * as fs from 'fs-extra';

export async function buildThreads(): Promise<Thread[]> {
    const index = await buildLinkIndex();
    const result = await status(
        { verbose: true },
        { getActiveLoomRoot, loadThread, buildLinkIndex, fs }
    );
    // result.list contains thread summaries; we need full thread data
    const threads: Thread[] = [];
    if (result.list) {
        for (const t of result.list) {
            const thread = await loadThread(t.id);
            threads.push(thread);
        }
    }
    return threads;
}
```

This leverages the existing `app` layer and ensures consistency with the CLI.

---

## Step 4 — Integrate Thread Builder into ViewModel

**File:** `packages/vscode/src/view/viewModel.ts`

```typescript
import { Thread } from '@loom/core';
import { buildThreads } from '../domain/threadBuilder';

export class LoomViewModel {
    private threads: Thread[] = [];
    private orphanDocs: Document[] = [];

    async refresh(): Promise<void> {
        this.threads = await buildThreads();
        // Orphan detection handled in Step 6
    }

    // ... rest of class
}
```

---

## Step 5 — Implement `groupByThread` Tree Projection

**File:** `packages/vscode/src/view/viewModel.ts`

```typescript
private groupByThread(): TreeNode[] {
    const nodes: TreeNode[] = [];

    for (const thread of this.threads) {
        nodes.push({
            type: 'group',
            label: `🧵 ${thread.id}`,
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            threadId: thread.id,
            children: [
                this.createSection('Primary Design', [thread.design]),
                this.createSection('Supporting Designs', thread.supportingDesigns),
                this.createSection('Plans', thread.plans),
                this.createSection('Ideas', thread.idea ? [thread.idea] : []),
                this.createSection('Contexts', thread.contexts),
            ].filter(Boolean) as TreeNode[],
        });
    }

    return nodes;
}

private createSection(label: string, docs: Document[]): TreeNode | undefined {
    if (!docs.length) return undefined;
    return {
        type: 'group',
        label,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        children: docs.map(d => this.createDocNode(d)),
    };
}
```

---

## Step 6 — Handle Orphan Documents

**File:** `packages/vscode/src/view/viewModel.ts`

```typescript
private groupByThread(): TreeNode[] {
    const nodes: TreeNode[] = [];
    const assignedIds = new Set<string>();

    for (const thread of this.threads) {
        thread.allDocs.forEach(d => assignedIds.add(d.id));
        // ... create thread node
    }

    // Find orphan docs
    const allDocs = await this.getAllDocuments(); // from fs layer
    const orphans = allDocs.filter(d => !assignedIds.has(d.id));

    if (orphans.length) {
        nodes.push({
            type: 'group',
            label: 'Unassigned',
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            children: orphans.map(d => this.createDocNode(d)),
        });
    }

    return nodes;
}
```

---

## Step 7 — Add Basic Sorting

**File:** `packages/vscode/src/view/viewModel.ts`

```typescript
private sortThreads(threads: Thread[]): Thread[] {
    return threads.sort((a, b) => a.id.localeCompare(b.id));
}

private sortDocs(docs: Document[]): Document[] {
    return docs.sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id));
}
```

Apply sorting when building the tree.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |