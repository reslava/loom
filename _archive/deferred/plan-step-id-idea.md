---
type: idea
id: plan-step-id-idea
title: "Stable Plan Step Identifiers"
status: deferred
created: 2026-04-16
version: 1
tags: [plan, step, id, refactoring, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Stable Plan Step Identifiers

## Problem
Currently, plan steps are referenced by their **1‑based index** (`Step 1`, `Step 2`) in the `Blocked by` column. This creates fragility when steps are reordered, inserted, or deleted—dependencies silently break, leading to incorrect blocker resolution and confusion.

## Idea
Give each `PlanStep` a **stable, unique identifier** (`stepId`) that is generated when the step is created. Use this `stepId` for all cross‑step references. The `order` field continues to control display sequence, but dependencies reference the immutable `stepId`.

**Proposed `PlanStep` interface:**
```typescript
interface PlanStep {
    id: string;          // e.g., "step-20260416-001" or slug like "define-types"
    order: number;       // display order, mutable
    description: string;
    done: boolean;
    files_touched: string[];
    blockedBy: string[]; // now stores stepIds or planIds
}
```

## Why Now (Deferred)
- The current index‑based system is **sufficient for MVP**.
- Implementing stable IDs requires changes to the Markdown table parser, generator, reducer, and link index.
- Deferring this work keeps the current phase focused on architectural refactoring.

## Open Questions
- Should `stepId` be user‑visible in the Markdown table, or hidden in frontmatter?
- Should we auto‑generate a slug from the step description, or use a timestamp‑based ID?
- How to handle backward compatibility for existing plans?

## Next Step
Re‑evaluate after the `app` layer refactor and import cleanup are complete. Create `plan-step-id-design.md` and a corresponding implementation plan when ready.

**Status: Deferred for post‑MVP consideration.**