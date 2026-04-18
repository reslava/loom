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
```

The `steps` array lives in the plan document's frontmatter.

## Design Principles

1. **Frontmatter is the source of truth.** The `steps` array defines the authoritative state.
2. **Markdown table is a generated view.** It is written on save and parsed on load only for backward compatibility or manual edits.
3. **AI agents work with structured data.** They generate and update the `steps` array directly, bypassing table parsing.
4. **Human users can still edit the table.** Changes are synchronized back to the frontmatter model.

## Data Flow

```
AI generates plan → writes frontmatter `steps` array
                           ↓
                    saveDoc serializes
                           ↓
                 Markdown table rendered under `# Steps`
                           ↓
               User may edit table (optional)
                           ↓
                  loadDoc parses table
                           ↓
            merges changes into frontmatter `steps`
                           ↓
                  Core model (Plan, Step[])
```

## Implementation Phases

| Phase | Scope | Behavior |
| :--- | :--- | :--- |
| **1. MVP** | Keep current table‑only approach | No changes. |
| **2. Dual‑Source (Optional)** | Add optional `steps` frontmatter field | If `steps` exists, it is used as the source of truth; table is regenerated on save. Manual table edits are merged back. |
| **3. Structured‑First** | Make `steps` required for new plans | AI‑generated plans use `steps` exclusively. Table becomes read‑only by default. |

## Benefits

- **Stable step IDs** enable robust dependency tracking.
- **Rich step statuses** (`implementing`, `deferred`) improve workflow visibility.
- **AI‑friendly generation** reduces parsing complexity.
- **Audit trail** via `updated` timestamps.
- **Clean separation of concerns** between data and presentation.

## Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| Human users find YAML editing intimidating | The Markdown table remains the primary editing interface; YAML is for AI and power users. |
| Inconsistency between table and frontmatter | `loadDoc` validates and merges changes; `loom validate` flags mismatches. |
| Migration of existing plans | Provide a `loom migrate plan` command to convert table‑based steps to structured `steps`. |

## Open Questions

- Should the `steps` array be hidden in the UI to avoid clutter?
- How to handle step reordering via the table?
- Should we support inline step status updates in the table (e.g., `[x]` checkboxes)?

## Decision

Adopt the phased approach. Implement Phase 2 (optional `steps` frontmatter) as the first post‑MVP enhancement to plan documents. This establishes the foundation for AI‑native plan generation without disrupting existing workflows.

## Next Steps

- Create `plan-steps-v2-plan-001.md` when ready to implement.
- Track as post‑MVP initiative.