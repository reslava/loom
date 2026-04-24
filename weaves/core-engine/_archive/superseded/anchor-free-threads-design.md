---
type: design
id: anchor-free-threads-design
title: "Anchor‑Free Threads — Zero‑Friction, Graph‑Based Workflows"
status: active
created: 2026-04-20
version: 3
tags: [thread, domain-model, graph, zero-friction, ui]
parent_id: core-engine-design
child_ids: [anchor-free-threads-plan-001]
requires_load: [core-engine-design]
supersedes: [draft-threads-design]
---

# Anchor‑Free Threads — Zero‑Friction, Graph‑Based Workflows

## Goal

Transform Loom from a linear, design‑centric workflow into a **zero‑friction, graph‑based workbench**. A thread is simply a folder in `threads/` containing any Loom documents. Physical grouping (the folder) is separate from logical relationships (`parent_id`). The UI provides global creation tools and contextual inline actions that intelligently adapt based on the current document graph.

## Core Principles

1. **A Thread is a Folder**  
   Any directory under `threads/` that contains at least one Loom document (`.md` file with valid frontmatter) is a valid thread. Empty directories are ignored. There is no required "primary" document.

2. **Physical ≠ Logical**  
   - **Physical location** (the thread folder) indicates the *primary* association.  
   - **Logical relationships** are captured via `parent_id` and `child_ids` links.  
   A plan in `vscode-extension/` can have `parent_id` pointing to a design in `core-engine/`.

3. **Cancelled Documents are Archived**  
   When a document is cancelled, it is moved to `_archive/cancelled/`. It no longer affects the thread's derived state.

4. **Zero Friction Creation**  
   Commands like `weave idea`, `weave design`, and `weave plan` create the thread directory if it doesn't exist. No prerequisites.

5. **State is Derived from Plans**  
   `ThreadStatus` reflects the execution progress of the thread's plans. The priority order is explicit and deterministic.

6. **UI Adapts to Context**  
   Toolbar buttons provide global, context‑free actions. Tree node inline buttons offer contextual actions and are dynamically shown or hidden based on the current document relationships.

## Domain Model Changes

### 1. `Thread` Entity (`core/src/entities/thread.ts`)

```typescript
export interface Thread {
    id: string;                    // folder name
    ideas: IdeaDoc[];              // all ideas in the folder
    designs: DesignDoc[];          // all designs
    plans: PlanDoc[];              // all plans
    contexts: CtxDoc[];            // all contexts
    allDocs: Document[];
}
```

- The singular `idea` and `design` fields are removed.
- There is no "primary" designation.

### 2. `ThreadStatus` Derivation (Final)

The thread's status reflects the holistic state of all its documents, with execution progress (plans) taking priority.

| Priority | Status | Condition |
| :--- | :--- | :--- |
| 1 | `IMPLEMENTING` | Any plan has `status: 'implementing'`. |
| 2 | `DONE` | **All documents** in the thread are `'done'` (and at least one plan exists). |
| 3 | `ACTIVE` | At least one plan is `'draft'` or `'active'`. |
| 4 | `BLOCKED` | At least one plan is `'blocked'`. |
| 5 | `ACTIVE` | Fallback (e.g., only ideas or designs exist). |

**Rationale:** A thread is only truly `DONE` when every piece of work—ideas, designs, and plans—is finalized. If a design is still `draft` while all plans are `done`, the feature is not complete. This ensures the status accurately reflects the user's remaining work.

**Implementation:**
```typescript
export function getThreadStatus(thread: Thread): ThreadStatus {
    const allDocs = thread.allDocs;
    const plans = thread.plans;
    
    // 1. Implementing wins over everything
    if (plans.some(p => p.status === 'implementing')) {
        return 'IMPLEMENTING';
    }
    
    // 2. All documents done -> thread done (must have at least one plan)
    if (plans.length > 0 && allDocs.every(d => d.status === 'done')) {
        return 'DONE';
    }
    
    // 3. Any plan active or draft?
    if (plans.some(p => p.status === 'active' || p.status === 'draft')) {
        return 'ACTIVE';
    }
    
    // 4. Any plan blocked?
    if (plans.some(p => p.status === 'blocked')) {
        return 'BLOCKED';
    }
    
    // 5. Fallback
    return 'ACTIVE';
}

### 3. `loadThread` Contract (`fs/src/repositories/threadRepository.ts`)

- Scans the folder for all `.md` files.
- If the folder is empty, returns `null` (caller filters it out).
- Returns a `Thread` object regardless of which document types are present.

### 4. Validation (`core/src/validation.ts`)

- Removes `validateSinglePrimaryDesign`.
- Adds warnings for orphaned `parent_id` links, but does not require any specific document to exist.

## UI Interaction Model

### 1. Toolbar (Global Actions)

Toolbar buttons provide **context‑free creation**. They are always enabled and create documents with no parent (or prompt for a target thread).

| Button | Action |
| :--- | :--- |
| **Weave Idea** | Creates a new idea in a new or existing thread. |
| **Weave Design** | Creates a new design with no parent. |
| **Weave Plan** | Creates a new plan with no parent. |
| **New Chat** | Creates a new chat document. |

### 2. Tree Node Inline Buttons (Contextual Actions)

Each tree node can display one or more inline action buttons. These buttons are **dynamically shown or hidden** based on the current document graph, using the `LinkIndex` and `LoomState` to determine eligibility.

| Node Type | Inline Button | Visibility Condition |
| :--- | :--- | :--- |
| **Idea** | `[Create Design]` | Shown only if no design already has this idea as its `parent_id`. |
| **Design** | `[Create Plan]` | Always shown (multiple plans per design are allowed). |
| **Design** | `[Refine]` | Shown if design is not `cancelled` or `done`. |
| **Plan** | `[Complete Step]` | Shown if plan is `implementing` and has pending steps. |
| **Plan** | `[Block]` | Shown if plan is `active` or `implementing`. |

**Example Tree View:**

```
🧵 payment-system (ACTIVE)
   💡 payment-system-idea.md                [Create Design]
   📄 payment-system-design.md              [Create Plan] [Refine]
   📋 Plans
      📋 payment-system-plan-001.md         [Complete Step] [Block]
```

## Document Creation Commands

| Command | Behavior |
| :--- | :--- |
| `loom weave idea "Title" [--thread <name>]` | Creates `{thread}/new-*-idea.md`. If `--thread` omitted, creates a new folder from the title. |
| `loom weave design <thread> [--title <title>] [--parent <id>]` | Creates a design in the given thread. If `--parent` is provided, links to that document. |
| `loom weave plan <thread> [--title <title>] [--parent <id>]` | Creates a plan in the given thread. |

All creation commands auto‑create the thread directory if it doesn't exist.

## Plan Steps & Blocking UX

### Phase 1: Table‑Driven (MVP)
- User edits the Markdown steps table directly in the plan document.
- System parses the table into structured frontmatter `steps` on save.
- `loom status` displays blocker information using `isStepBlocked`.
- `loom validate` warns about broken `Blocked by` references.

### Phase 2: Intelligent Assistance (Post‑MVP)
- **Autocomplete for `Blocked by`:** Suggestions from the `LinkIndex`.
- **Warning Squiggles:** Visual feedback for broken references.
- **Inline Actions:** Tree node button `[Add Step]` to append a row.
- **No Visual Drag‑and‑Drop Reordering:** Markdown tables remain the primary interface.

## Reorganization & Drag‑and‑Drop (Future)

- Moving a document to a different thread folder updates its physical location. The system offers to update all inbound `parent_id` links.
- The `rename` use‑case can be extended to handle directory moves and reference updates.

## Migration Strategy (Phased)

Due to the significant impact of changing `Thread` from a single `design` to `designs[]`, implementation will follow a phased approach:

| Phase | Goal | Approach |
| :--- | :--- | :--- |
| **1. Internal Model** | Introduce `designs[]` while keeping a `getPrimaryDesign()` helper. | `Thread` gets the new structure. All existing consumers use the helper, which returns `designs[0]`. System remains stable. |
| **2. Incremental Refactor** | Update each layer to work with multiple designs. | Refactor `core`, then `fs`, then `app`, then `cli`, then `vscode`. Run tests after each layer. |
| **3. Remove Helper** | Delete `getPrimaryDesign()`. | System now fully supports anchor‑free threads. |

## Benefits

| Benefit | Description |
| :--- | :--- |
| **Zero Friction** | Start a thread with any document type. No prerequisites. |
| **Graph Flexibility** | Link documents freely across threads. |
| **Intelligent UI** | Inline buttons appear only when relevant. |
| **True Visibility** | Every document appears immediately. |
| **Simpler Mental Model** | A thread is just a folder. |

## Supersedes

This design completely replaces `draft-threads-design.md`.

## Open Questions

- Should the VS Code tree show a warning if a thread folder is empty? (Empty folders are ignored, so this is not applicable.)
- How should `loom status` display threads with no plans? (Show `ACTIVE`.)

## Decision

Adopt the anchor‑free thread model with the UI interaction model and phased migration strategy described. Implementation is deferred until the core VS Code extension commands are complete.

## Next Steps

- Execute `anchor-free-threads-plan-001.md` (to be updated with the phased migration steps).