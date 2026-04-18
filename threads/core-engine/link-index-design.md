---
type: design
id: link-index-design
title: "Structured Link Index for Document Relationships"
status: active
created: 2026-04-14
version: 1
tags: [linking, index, validation, performance]
parent_id: core-engine-design
child_ids: [link-index-plan-001]
requires_load: [core-engine-design]
target_release: "0.2.0"
actual_release: null
---

# Structured Link Index for Document Relationships

## Goal

Define a lightweight, fast, and deterministic index of all document relationships within a Loom workspace. The index enables instant validation of `parent_id`/`child_ids` links and `Blocked by` step dependencies, providing real‑time feedback in the VS Code extension and accurate dependency resolution in the CLI.

## Context

REslava Loom relies on explicit, structured relationships:
- `parent_id` and `child_ids` in frontmatter define the document hierarchy.
- The `Blocked by` column in plan steps tables defines execution dependencies.

These relationships are critical for thread resolution, staleness propagation, and workflow guidance. Currently, validation requires scanning all documents, and broken links are only discovered when `loom validate` is run manually.

This design introduces a **structured link index** that is:
- **Fast to build** – only parses frontmatter and plan steps tables.
- **Easy to maintain** – incremental updates on file changes.
- **Zero false positives** – only explicit, intended relationships are tracked.

# CHAT

## Rafa:
We need a fast, reliable way to track `parent_id`, `child_ids`, and `Blocked by` dependencies. Full-text backlinks are overkill. Let's design a minimal index.

## AI:
Agreed. A focused index on these three fields is exactly what Loom needs.

### 1. Index Structure

The index is an in‑memory data structure maintained by the VS Code extension and used by CLI commands.

```typescript
interface LinkIndex {
  // Document ID -> Document metadata
  documents: Map<string, {
    path: string;
    type: DocumentType;
    exists: boolean;
  }>;

  // parent_id -> Set of child document IDs
  children: Map<string, Set<string>>;

  // Document ID -> its parent_id (if any)
  parent: Map<string, string>;

  // Plan ID -> Array of step dependencies
  stepBlockers: Map<string, {
    step: number;
    blockedBy: string[];  // "Step N" or "plan-id"
  }[]>;
}
```

### 2. Building the Index

The index is built by scanning all `.md` files in `threads/`.

**Algorithm:**
1. For each `.md` file, parse frontmatter to extract `id`, `type`, `parent_id`, `child_ids`.
2. Populate `documents`, `parent`, and `children` maps.
3. For each plan document, parse the steps table to extract `Blocked by` values.
4. Populate `stepBlockers` map.

**Time Complexity:** O(N) where N is the number of documents. With hundreds of documents, this takes milliseconds.

### 3. Incremental Updates

The VS Code file watcher updates the index incrementally:

| Event | Action |
|-------|--------|
| File created | Add document to index; update `children` of its parent. |
| File changed | Re‑parse frontmatter and steps; update index entries. |
| File deleted | Remove from index; mark as missing in `documents` map (keep for orphan detection). |

### 4. Validation Queries

With the index, validation becomes instant:

```typescript
function getOrphanedDocuments(index: LinkIndex): string[] {
  const orphans: string[] = [];
  for (const [docId, parentId] of index.parent) {
    if (!index.documents.has(parentId)) {
      orphans.push(docId);
    }
  }
  return orphans;
}

function getDanglingChildIds(index: LinkIndex): string[] {
  const dangling: string[] = [];
  for (const [parentId, children] of index.children) {
    for (const childId of children) {
      if (!index.documents.has(childId)) {
        dangling.push(`${parentId} -> ${childId}`);
      }
    }
  }
  return dangling;
}

function getBlockedSteps(index: LinkIndex, planId: string): StepBlocker[] {
  const blockers = index.stepBlockers.get(planId) || [];
  return blockers.filter(b => {
    return b.blockedBy.some(dep => !isDependencySatisfied(dep, index));
  });
}
```

### 5. Integration Points

| Component | How It Uses the Index |
|-----------|-----------------------|
| VS Code Tree View | Shows ⚠️ icon for documents with broken `parent_id`. |
| VS Code Diagnostics | Underlines invalid `parent_id` values in frontmatter. |
| `loom validate` | Returns list of orphaned documents and dangling references. |
| `loom status` | Resolves `Blocked by` dependencies to suggest next steps. |

### 6. Performance Considerations

- **Memory:** A typical workspace with 500 documents uses < 5 MB.
- **Rebuild time:** Full rebuild on extension activation takes < 50ms.
- **Incremental updates:** Single file change updates in < 5ms.

### 7. Limitations

- The index does not track implicit relationships (e.g., mentions in freeform text). This is intentional.
- Cross‑loom references are not supported (each loom has its own index).

## Decision

Implement the `LinkIndex` as described. Maintain it in memory within the VS Code extension, and expose it to CLI commands via a shared module. Use incremental updates to keep it fresh.

## Next Steps

- Create `link-index-plan-001.md` for implementation.
