---
type: design
id: anchor-free-threads-design
title: "Anchor‑Free Threads — Zero‑Friction, Graph‑Based Workflows"
status: active
created: 2026-04-20
version: 1
tags: [thread, domain-model, graph, zero-friction]
parent_id: core-engine-design
child_ids: [anchor-free-threads-plan-001]
requires_load: [core-engine-design]
supersedes: [draft-threads-design]
---

# Anchor‑Free Threads — Zero‑Friction, Graph‑Based Workflows

## Goal

Transform Loom from a linear, design‑centric workflow into a **zero‑friction, graph‑based workbench**. Threads can originate from any document type—`idea`, `design`, or `plan`—and relationships are established freely via `parent_id` links. This empowers developers to work the way they think, not the way the tool dictates.

## Context

The current model requires every thread to have a primary design. This enforces a linear `idea → design → plan` progression, which creates friction:

- Users cannot quickly sketch a plan for a trivial task without first creating an idea and a design.
- Ideas are invisible until a design is created.
- The tool imposes a methodology rather than supporting the developer's natural flow.

The draft‑threads proposal (`draft-threads-design.md`) was a step toward visibility, but it retained the design‑centric anchor. This design goes further: **a thread is simply a directory containing any Loom documents.** Relationships are optional and can be established at any time.

## Core Principles

1. **Any Document Can Anchor a Thread**  
   A thread directory is valid if it contains at least one Loom document (`idea`, `design`, or `plan`). There is no required "primary" document.

2. **Relationships Are a Graph**  
   Documents link via `parent_id` and `child_ids`. These links can form any topology—an idea can have multiple designs, a plan can refine an idea directly, etc.

3. **State Is Derived from the Graph**  
   `ThreadStatus` and `ThreadPhase` are computed from the most advanced document in the directory, not from a single anchor.

4. **Zero Friction Creation**  
   Commands like `weave idea`, `weave design`, and `weave plan` create the document and the thread directory if it doesn't exist. No prerequisites.

## Domain Model Changes

### 1. `Thread` Entity (`core/src/entities/thread.ts`)

```typescript
export interface Thread {
    id: string;
    ideas: IdeaDoc[];          // All ideas in the directory
    designs: DesignDoc[];      // All designs
    plans: PlanDoc[];          // All plans
    contexts: CtxDoc[];        // All contexts
    allDocs: Document[];       // All documents
}
```

- The singular `idea` and `design` fields are removed.
- There is no "primary" designation—any document can be the entry point.

### 2. `ThreadStatus` and `ThreadPhase` (`core/src/derived.ts`)

- **Status:** Derived from the most "active" document status (e.g., if any plan is `implementing`, thread is `IMPLEMENTING`).
- **Phase:** Derived from the presence of document types (e.g., if plans exist, phase is `implementing` or `planning`; if only ideas exist, phase is `ideating`).

### 3. `loadThread` (`fs/src/repositories/threadRepository.ts`)

- Scans the directory for all `.md` files.
- Returns a `Thread` object regardless of which document types are present.
- No error is thrown if a primary design is missing.

### 4. Validation (`core/src/validation.ts`)

- Removes `validateSinglePrimaryDesign`.
- Adds warnings for orphaned `parent_id` links, but does not require any specific document to exist.

## Benefits

| Benefit | Description |
| :--- | :--- |
| **Zero Friction** | Start a thread with an idea, a design, or a plan—whatever fits the task. |
| **Graph Flexibility** | Link documents freely; support non‑linear workflows (e.g., multiple designs exploring alternatives, plans refining ideas directly). |
| **True Visibility** | Every document appears in the UI immediately; nothing is hidden. |
| **Simpler Mental Model** | A thread is just a folder of related documents. Loom provides structure without imposing it. |

## Supersedes

This design completely replaces `draft-threads-design.md`. The draft‑threads concept was a partial solution; anchor‑free threads are the full realization.

## Open Questions

- How should the VS Code tree view represent threads without a primary design? (Suggestion: show the "newest" or "most advanced" document as the thread label.)
- Should `loom status` display a warning if a thread has no documents? (A thread directory with no documents is invalid; creation commands ensure at least one document exists.)

## Decision

Adopt the anchor‑free thread model. Implement after the core VS Code extension commands are complete.

## Next Steps

- Create `anchor-free-threads-plan-001.md`.