---
type: design
id: workflow-feature-model-design
title: "Workflow Feature Model"
status: active
created: 2026-04-11
updated: 2026-04-13
version: 2.0.0
tags: [feature, model, relationships, architecture]
parent_id: workflow-design
child_ids: []
requires_load: [references/workspace-directory-structure-reference.md]
---

# Workflow Feature Model

## Goal

Define a clear and extensible model for representing a **Feature** as a first-class concept in the workflow system. This model enables grouping documents (designs, plans, ideas, contexts) into meaningful units, unlocking advanced UI capabilities such as grouping by feature, focus mode, and hierarchical navigation.

## Context

Documents (idea, design, plan, ctx) are connected through `parent_id` / `child_ids` references. The TreeProvider groups them by type, which is useful but does not reflect how real work is organized.

In practice, users work on **features**, not isolated documents. A feature typically includes:

- one idea (optional precursor)
- one **primary** design (the anchor and source of identity)
- one or more **supporting** designs (scoped sub-topics)
- multiple plans (implementation steps, owned by primary or supporting designs)
- context documents (session checkpoints and auto-generated summaries)

The model must:

- emerge naturally from existing Markdown docs
- require no database
- derive from relationships (not duplicate state)
- support multiple designs per feature without ambiguity
- support future extensions (epics, ownership, etc.)

---

## Design Roles

A feature has exactly **one primary design** and any number of **supporting designs**.

```yaml
# Primary design — required, exactly one per feature
# Defines the feature identity. Anchor for all other documents.
role: primary

# Supporting design — optional, many allowed
# Scoped sub-topic owned by the feature (e.g. webhooks, security, auth).
# Sorted by `created` date — no manual ordering needed.
role: supporting
```

### Rules

| Rule | Description |
|------|-------------|
| Exactly one `role: primary` per feature | Enforced by validator |
| Primary design filename matches feature name | Convention: `{feature-id}-design.md` |
| Supporting design filename uses topic suffix | Convention: `{feature-id}-design-{topic}.md` |
| Supporting designs sorted by `created` date | No explicit `order` field needed |
| Plans may hang off primary OR supporting design | Feature identity always resolves to primary |

---

## Feature as a Computed Structure

Feature is **not persisted**. It is built at runtime from documents:

```ts
interface Feature {
  id: string;               // = primary design id

  idea?: BaseDoc;           // optional

  primaryDesign: BaseDoc;   // required — anchor
  supportingDesigns: BaseDoc[]; // sorted by created date

  plans: BaseDoc[];         // parent_id → primary or supporting design
  contexts: BaseDoc[];      // session checkpoints and summaries

  allDocs: BaseDoc[];
}
```

---

## Relationship Rules

### Primary design → Feature anchor

```yaml
# payment-system-design.md
type: design
role: primary
id: payment-system-design
parent_id: payment-system-idea   # optional — links back to idea
```

Feature ID = primary design ID.

### Supporting design → Primary design

```yaml
# payment-system-design-webhooks.md
type: design
role: supporting
id: payment-system-design-webhooks
parent_id: payment-system-design  # always points to primary
```

Supporting designs always have `parent_id` pointing to the **primary design**, never to another supporting design.

### Plan → Primary or Supporting design

```yaml
# plan owned by primary design
parent_id: payment-system-design

# plan owned by a supporting design
parent_id: payment-system-design-webhooks
```

Both are valid. The plan belongs to the feature because its parent resolves to the primary design.

### Idea → Primary design (optional)

```yaml
# payment-system-idea.md
type: idea
id: payment-system-idea
parent_id: null   # ideas are often the starting point, no parent
```

The primary design references the idea via `parent_id: payment-system-idea`. This makes the idea a precursor, not a child.

### Context → Any document in the feature

```yaml
ctx.parent_id = payment-system-design           # attached to primary
ctx.parent_id = payment-system-design-webhooks  # attached to supporting
ctx.parent_id = payment-system-plan-001         # attached to a plan
```

Contexts belong to a feature if they resolve (upward) to its primary design.

---

## Resolution Algorithm

### Goal

Given all documents in the workspace, build the complete set of Features.

### Step 1 — Index all documents

```ts
const docsById = new Map<string, BaseDoc>();
docs.forEach(doc => docsById.set(doc.id, doc));
```

### Step 2 — Find all primary designs

```ts
const primaryDesigns = docs.filter(
  d => d.type === 'design' && d.role === 'primary'
);
```

### Step 3 — Resolve ancestry to primary design

```ts
function resolvePrimaryDesign(
  doc: BaseDoc,
  docsById: Map<string, BaseDoc>,
  visited = new Set<string>()
): BaseDoc | undefined {

  if (visited.has(doc.id)) return undefined; // cycle guard
  visited.add(doc.id);

  if (doc.type === 'design' && doc.role === 'primary') return doc;

  if (!doc.parent_id) return undefined;

  const parent = docsById.get(doc.parent_id);
  if (!parent) return undefined;

  return resolvePrimaryDesign(parent, docsById, visited);
}
```

### Step 4 — Build Feature collection

```ts
function buildFeatures(docs: BaseDoc[]): Feature[] {
  const docsById = new Map(docs.map(d => [d.id, d]));
  const features: Record<string, Feature> = {};

  // Initialize from primary designs
  docs
    .filter(d => d.type === 'design' && d.role === 'primary')
    .forEach(design => {
      features[design.id] = {
        id: design.id,
        primaryDesign: design,
        supportingDesigns: [],
        idea: undefined,
        plans: [],
        contexts: [],
        allDocs: [design]
      };
    });

  // Assign all other docs
  docs
    .filter(d => !(d.type === 'design' && d.role === 'primary'))
    .forEach(doc => {
      const primary = resolvePrimaryDesign(doc, docsById);
      if (!primary) return; // orphan — shown in Unassigned

      const feature = features[primary.id];
      if (!feature) return;

      feature.allDocs.push(doc);

      if (doc.type === 'idea') {
        feature.idea = doc;
      } else if (doc.type === 'design' && doc.role === 'supporting') {
        feature.supportingDesigns.push(doc);
      } else if (doc.type === 'plan') {
        feature.plans.push(doc);
      } else if (doc.type === 'ctx') {
        feature.contexts.push(doc);
      }
    });

  // Sort supporting designs by created date
  Object.values(features).forEach(f => {
    f.supportingDesigns.sort(
      (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
    );
  });

  return Object.values(features);
}
```

---

## Tree Representation (Feature View)

```text
Feature: Payment System
 ├── Idea
 │    └── payment-system-idea.md
 ├── Design (primary)
 │    └── payment-system-design.md
 ├── Designs (supporting)
 │    ├── payment-system-design-webhooks.md
 │    └── payment-system-design-security.md
 ├── Plans
 │    ├── payment-system-plan-001.md  [primary]
 │    ├── payment-system-plan-002.md  [webhooks]
 │    └── payment-system-plan-003.md  [security]
 └── Contexts
      └── payment-system-ctx.md
```

Plans may optionally show which design they belong to (in brackets) for clarity.

---

## Validation Rules

| Rule | Check |
|------|-------|
| Exactly one primary design per feature directory | `count(designs where role == 'primary') == 1` |
| Supporting designs point to primary design | `supporting.parent_id == primary.id` |
| Plans resolve to a primary design | `resolvePrimaryDesign(plan) != undefined` |
| No circular `parent_id` references | Detected by cycle guard in resolution |

---

## Edge Cases

### Orphan documents

Documents that do not resolve to any primary design are not included in any feature. They appear in a fallback **Unassigned** group in the tree view. Running `wf validate` will list them with their file paths.

### Missing supporting design reference

If a plan's `parent_id` points to a supporting design that no longer exists, the plan becomes an orphan. `wf validate` detects and reports this.

### Feature with no plans

Valid — a feature in early design phase may have only a primary design and no plans yet. The tree renders it without a Plans section.

### Feature with no idea

Valid — ideas are optional. The tree renders without an Idea section.

---

## Future: Epics (Deferred)

An Epic is a Feature whose children are Features instead of Plans. The `parent_id` graph already supports this structurally. The tree view and resolution algorithm will need one additional level of nesting when this is implemented.

For now, the validator will not error on cross-feature `parent_id` references — it will simply leave them unresolved (orphans) without breaking anything.

---

## Decision

- Feature identity = **primary design id**
- Exactly **one primary design** per feature, many **supporting designs** allowed
- Supporting designs sorted by **`created` date** — no explicit `order` field
- Plans may hang off **primary or supporting** design — both resolve to the same feature
- Feature is a **computed aggregate** — never persisted, always derived
- No additional persistence layer required

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-11 | Initial specification. |
| 2.0.0 | 2026-04-13 | Added `role: primary / supporting` model. Updated resolution algorithm, tree representation, validation rules, and edge cases. Removed explicit `order` field — `created` date sort is sufficient. |
