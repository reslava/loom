---
type: plan
id: workflow-plan-005-group-by-feature
title: "Implement groupByFeature (Feature-Based Tree View)"
status: active
created: 2026-04-11
version: 1
tags: [feature, tree, viewmodel, grouping]
design_id: workflow-feature-model
target_version: 0.5.0
requires_load: [workflow-feature-model]
---

# Feature — Implement groupByFeature

| | |
|---|---|
| **Created** | 2026-04-11 |
| **Status** | DRAFT |
| **Design** | `wf/plans/design/workflow-feature-model-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Implement `groupByFeature` in the ViewModel to enable grouping documents by Feature. This will transform the tree from a flat/type-based structure into a hierarchical, work-centric view organized around Designs and their related documents.

---

# Steps

| # | Done | Step | Files touched |
|---|---|---|---|
| 1 | — | Create Feature builder utility | `src/domain/featureBuilder.ts` |
| 2 | — | Implement relationship resolution | `src/domain/featureBuilder.ts` |
| 3 | — | Build Feature collection from docs | `src/domain/featureBuilder.ts` |
| 4 | — | Integrate Feature builder into ViewModel | `src/view/viewModel.ts` |
| 5 | — | Implement groupByFeature tree projection | `src/view/viewModel.ts` |
| 6 | — | Handle orphan documents | `src/view/viewModel.ts` |
| 7 | — | Add basic sorting (optional) | `src/view/viewModel.ts` |

---

## Step 1 — Create Feature Builder Utility

Create a domain module responsible for constructing Features from documents.

```ts
// src/domain/featureBuilder.ts

export interface Feature {
  id: string;

  design: BaseDoc;

  plans: BaseDoc[];
  ideas: BaseDoc[];
  contexts: BaseDoc[];

  allDocs: BaseDoc[];
}
````

---

## Step 2 — Implement Relationship Resolution

Implement ancestry resolution to find the Design root.

```ts
function resolveDesign(
  doc: BaseDoc,
  docsById: Map<string, BaseDoc>
): BaseDoc | undefined {

  const visited = new Set<string>();
  let current: BaseDoc | undefined = doc;

  while (current?.parent_id) {
    if (visited.has(current.id)) return undefined; // cycle guard
    visited.add(current.id);

    const parent = docsById.get(current.parent_id);
    if (!parent) return undefined;

    if (parent.type === 'design') return parent;

    current = parent;
  }

  return undefined;
}
```

---

## Step 3 — Build Feature Collection

```ts
export function buildFeatures(docs: BaseDoc[]): Feature[] {
  const docsById = new Map(docs.map(d => [d.id, d]));

  const features: Record<string, Feature> = {};

  // Initialize from designs
  docs.forEach(doc => {
    if (doc.type === 'design') {
      features[doc.id] = {
        id: doc.id,
        design: doc,
        plans: [],
        ideas: [],
        contexts: [],
        allDocs: [doc]
      };
    }
  });

  // Assign other docs
  docs.forEach(doc => {
    if (doc.type === 'design') return;

    const design = resolveDesign(doc, docsById);
    if (!design) return;

    const feature = features[design.id];
    if (!feature) return;

    feature.allDocs.push(doc);

    switch (doc.type) {
      case 'plan':
        feature.plans.push(doc);
        break;
      case 'idea':
        feature.ideas.push(doc);
        break;
      case 'ctx':
        feature.contexts.push(doc);
        break;
    }
  });

  return Object.values(features);
}
```

---

## Step 4 — Integrate into ViewModel

```ts
import { buildFeatures } from '../domain/featureBuilder';

private groupByFeature(docs: BaseDoc[]): TreeNode[] {
  const features = buildFeatures(docs);

  return features.map(feature => this.createFeatureNode(feature));
}
```

---

## Step 5 — Feature Tree Projection

Create hierarchical nodes.

```ts
private createFeatureNode(feature: Feature): TreeNode {
  return {
    type: 'group',
    label: feature.design.title,
    collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
    children: [
      this.createSection('Design', [feature.design]),
      this.createSection('Plans', feature.plans),
      this.createSection('Ideas', feature.ideas),
      this.createSection('Contexts', feature.contexts)
    ].filter(Boolean)
  };
}
```

---

### Section Helper

```ts
private createSection(label: string, docs: BaseDoc[]): TreeNode | undefined {
  if (!docs.length) return undefined;

  return {
    type: 'group',
    label,
    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
    children: docs.map(d => this.createDocNode(d))
  };
}
```

---

## Step 6 — Handle Orphan Documents

Docs without a valid Design should still be visible.

```ts
private appendOrphans(
  nodes: TreeNode[],
  docs: BaseDoc[]
): TreeNode[] {

  const assignedIds = new Set<string>();

  nodes.forEach(featureNode => {
    featureNode.children?.forEach(section => {
      section.children?.forEach(docNode => {
        if (docNode.doc) assignedIds.add(docNode.doc.id);
      });
    });
  });

  const orphans = docs.filter(d => !assignedIds.has(d.id));

  if (!orphans.length) return nodes;

  return [
    ...nodes,
    {
      type: 'group',
      label: 'Unassigned',
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      children: orphans.map(d => this.createDocNode(d))
    }
  ];
}
```

Integrate into `groupByFeature`.

---

## Step 7 — Sorting (Optional but Recommended)

Basic ordering improves UX.

```ts
private sortDocs(docs: BaseDoc[]): BaseDoc[] {
  return docs.sort((a, b) => a.title.localeCompare(b.title));
}
```

Apply to:

* feature sections
* feature list

---

# Notes

* Feature building MUST remain pure (no VSCode dependencies)
* ViewModel handles projection only
* TreeProvider remains unchanged

---

# Expected Result

```text
Feature A (Design Title)
 ├── Design
 │    └── Design doc
 ├── Plans
 │    ├── Plan 1
 │    └── Plan 2
 ├── Ideas
 └── Contexts

Feature B
 ...
```

---

# Next Step

* Integrate Feature grouping into UI (toolbar toggle)
* Add "Focus Feature" mode
* Connect feature status filtering