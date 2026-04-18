---
type: design
id: workflow-feature-model-design
title: "Workflow Feature Model"
status: draft
created: 2026-04-11
version: 1.0.0
tags: [feature, model, relationships, architecture]
parent_id: workflow-vscode-extension
role: supporting
child_ids: []
requires_load: []
---

# Workflow Feature Model

## Goal

Define a clear and extensible model for representing a **Feature** as a first-class concept in the workflow system. This model will enable grouping documents (designs, plans, ideas, contexts) into meaningful units, unlocking advanced UI capabilities such as grouping by feature, focus mode, and hierarchical navigation.

---

## Context

Currently, documents (idea, design, plan, ctx) are independent entities connected only through loose references (`parent_id`, `child_ids`). The TreeProvider groups them by type, which is useful but does not reflect how real work is organized.

In practice, users work on **features**, not isolated documents. A feature typically includes:

- one design (core definition)
- multiple plans (implementation steps)
- supporting ideas
- contextual documents

We need a model that:

- emerges naturally from existing markdown docs
- does not require a database
- is derived from relationships (not duplicated state)
- supports future extensions (status, ownership, etc.)

---

# CHAT

## User:
Define Feature model for grouping documents and enabling feature-based workflows.

## AI:

## Definition

A **Feature** is a logical unit of work composed of related documents, centered around a **Design** document.

```text
Feature
 ├── Design (root)
 ├── Plans
 ├── Ideas
 └── Contexts
````

The Design acts as the **anchor node**.

---

## Core Principles

### 1. Design is the root of a Feature

* Every feature MUST have exactly one Design
* A Design defines the feature identity
* Feature ID = Design ID

---

### 2. Relationships are derived (not stored redundantly)

We reuse existing fields:

```yaml
parent_id:
child_ids:
```

No new linkage system is introduced.

---

### 3. Feature is a computed structure

Feature is NOT persisted.

It is built at runtime:

```ts
interface Feature {
  id: string;

  design: BaseDoc;

  plans: BaseDoc[];
  ideas: BaseDoc[];
  contexts: BaseDoc[];

  allDocs: BaseDoc[];
}
```

---

## Relationship Rules

### Plan → Design

```text
plan.parent_id = design.id
```

Plans belong to a feature if:

```ts
doc.type === 'plan' && doc.parent_id === design.id
```

---

### Idea → Design (optional)

Two possible patterns:

#### Direct

```text
idea.parent_id = design.id
```

#### Indirect (via plan)

```text
idea.parent_id = plan.id
```

→ Must resolve recursively to Design

---

### Context → Any

Contexts are flexible:

```text
ctx.parent_id = design.id
ctx.parent_id = plan.id
ctx.parent_id = idea.id
```

They belong to a feature if they resolve to its Design.

---

## Resolution Algorithm

### Goal

Given all documents, build Features.

---

### Step 1 — Index documents

```ts
const docsById = new Map<string, BaseDoc>();
```

---

### Step 2 — Find all Designs

```ts
const designs = docs.filter(d => d.type === 'design');
```

---

### Step 3 — Resolve ancestry

Helper:

```ts
function resolveDesign(doc: BaseDoc): BaseDoc | undefined {
  let current = doc;

  while (current.parent_id) {
    const parent = docsById.get(current.parent_id);

    if (!parent) return undefined;

    if (parent.type === 'design') return parent;

    current = parent;
  }

  return undefined;
}
```

---

### Step 4 — Build Features

```ts
function buildFeatures(docs: BaseDoc[]): Feature[] {
  const features: Record<string, Feature> = {};

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

  docs.forEach(doc => {
    if (doc.type === 'design') return;

    const design = resolveDesign(doc);
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

## Tree Representation (Feature View)

```text
Feature: Payment System
 ├── Design
 ├── Plans
 │    ├── Plan A
 │    └── Plan B
 ├── Ideas
 └── Contexts
```

---

## Edge Cases

### 1. Orphan documents

Docs without valid parent chain:

* not included in any feature
* shown in fallback groups:

  * "Unassigned"
  * or default grouping

---

### 2. Multiple levels

Supports deep chains:

```text
Idea → Plan → Design
Ctx → Idea → Plan → Design
```

---

### 3. Circular references (invalid)

Must guard against:

```text
A → B → C → A
```

Solution:

* track visited nodes during resolution
* break on loop

---

## Future Extensions

### Feature Status

Derived from Design:

```ts
feature.status = feature.design.status;
```

---

### Feature Progress

```ts
progress = donePlans / totalPlans
```

---

### Focus Mode

Filter tree:

```text
only show one Feature
```

---

### Cross-feature links

Later:

```yaml
related_features:
```

---

## Decision

* Feature is a **computed domain model**
* Design is the **single source of truth**
* Relationships use existing `parent_id`
* No additional persistence layer required

---

## Open Questions

* Should Ideas always resolve to a Design, or can they be standalone?
* Should we allow multiple Designs per feature (epics)?
* Should Feature have its own metadata file in future?

---

## Next Step

Integrate Feature model into ViewModel:

* implement `groupByFeature`
* support feature-based filtering
* enable focus mode in TreeProvider