---
type: design
id: plan-steps-v2-design
title: "Plan Steps v2 — Structured Steps in Frontmatter"
status: draft
created: 2026-04-16
version: 1.0.0
tags: [plan, steps, architecture, post-mvp]
parent_id: core-engine-design
child_ids: []
requires_load: []
---

# Plan Steps v2 — Structured Steps in Frontmatter

## Goal

Replace the Markdown table as the **primary source of truth** for plan steps with a structured `steps` array in YAML frontmatter. The Markdown table becomes a **generated view** for human readability, ensuring consistency and enabling richer step metadata.

## Context

The current implementation uses a Markdown table as the only representation of plan steps. While human‑friendly, this approach has limitations:

- Fragile parsing and generation logic.
- No stable step identifiers (dependencies rely on mutable `Step N` references).
- Limited step metadata (only `done` status, no timestamps or detailed state).
- Difficult for AI agents to generate and update reliably.

As Loom evolves toward AI‑first collaboration, structured data is essential.

### Target Model

```typescript
interface PlanStep {
    id: string;                           // stable identifier, e.g., "step-define-types"
    order: number;                        // display order, mutable
    status: 'pending' | 'implementing' | 'done' | 'cancelled' | 'deferred';
    title: string;
    description: string;
    updated?: string;                     // ISO date
    blocked_by: Array<{
        type: 'step' | 'plan';
        id: string;
    }>;
}