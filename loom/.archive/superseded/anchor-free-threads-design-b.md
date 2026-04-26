---
type: design
id: anchor-free-threads-design
title: "Anchor‑Free Threads — Zero‑Friction, Graph‑Based Workflows"
status: active
created: 2026-04-20
version: 2
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
   Any directory under `threads/` that contains at least one Loom document (`.md` file with valid frontmatter) is a valid thread. There is no required “primary” document.

2. **Physical ≠ Logical**  
   - **Physical location** (the thread folder) indicates the *primary* association.  
   - **Logical relationships** are captured via `parent_id` and `child_ids` links.  
   A plan in `vscode-extension/` can have `parent_id` pointing to a design in `core-engine/`.

3. **Zero Friction Creation**  
   Commands like `weave idea`, `weave design`, and `weave plan` create the thread directory if it doesn't exist. No prerequisites.

4. **State is Derived from the Graph**  
   `ThreadStatus` and `ThreadPhase` are computed from the most advanced document in the folder.

5. **UI Adapts to Context**  
   Toolbar buttons provide global, context‑free actions. Tree node inline buttons offer contextual actions (e.g., "Create Plan" on a design) and are dynamically shown or hidden based on the current document relationships (using `LinkIndex` and `LoomState`).

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
- There is no “primary” designation.

### 2. `ThreadStatus` and `ThreadPhase` (`core/src/derived.ts`)

- **Status:** Derived from the most “active” document status (e.g., if any plan is `implementing`, thread is `IMPLEMENTING`).
- **Phase:** Derived from the presence of document types (e.g., if plans exist, phase is `implementing` or `planning`; if only ideas exist, phase is `ideating`).

### 3. `loadThread` (`fs/src/repositories/threadRepository.ts`)

- Scans the folder for all `.md` files.
- Returns a `Thread` object regardless of which document types are present.
- No error is thrown if a primary design is missing.

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

### 3. Dynamic Button Visibility (Implementation Sketch)

The `LoomTreeProvider` already holds `LoomState` (which includes the `LinkIndex`). When creating a tree node, we can evaluate simple predicates:

```typescript
private createIdeaNode(idea: IdeaDoc, thread: Thread): TreeNode {
    const hasDesign = thread.designs.some(d => d.parent_id === idea.id);
    const buttons: vscode.TreeItemButton[] = [];
    if (!hasDesign) {
        buttons.push({
            command: 'loom.weaveDesignFromIdea',
            title: 'Create Design',
            iconPath: icon(Icons.design),
            tooltip: 'Create a design linked to this idea',
        });
    }
    // ...
}
```

The `LinkIndex` can also be used to check cross‑thread relationships if needed.

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
- The user remains in full control of the table content.

### Phase 2: Intelligent Assistance (Post‑MVP)
- **Autocomplete for `Blocked by`:** In VS Code, typing `Step` or a plan ID triggers suggestions from the `LinkIndex`.
- **Warning Squiggles:** Visual feedback in the editor for broken references (e.g., `Step 5` when only 3 steps exist).
- **Inline Actions:** Tree node buttons like `[Add Step]` that append a new row to the table.
- **No Visual Drag‑and‑Drop Reordering:** Markdown tables are simple, universal, and Git‑friendly. Keeping them as the primary interface avoids the complexity of a custom webview editor.

## Reorganization & Drag‑and‑Drop (Future)

- Moving a document to a different thread folder updates its physical location. The system offers to update all inbound `parent_id` links (similar to a refactoring).
- The `rename` use‑case can be extended to handle directory moves and reference updates.

## Benefits

| Benefit | Description |
| :--- | :--- |
| **Zero Friction** | Start a thread with any document type. No prerequisites. |
| **Graph Flexibility** | Link documents freely across threads. |
| **Intelligent UI** | Inline buttons appear only when relevant, reducing clutter. |
| **True Visibility** | Every document appears immediately; nothing is hidden. |
| **Simpler Mental Model** | A thread is just a folder. Loom provides structure without imposing it. |

## Supersedes

This design completely replaces `draft-threads-design.md`.

## Open Questions

- Should the VS Code tree show a warning if a thread folder is empty? (An empty folder is not a thread—it has no documents.)
- How should `loom status` display threads with no design? (Show phase `ideating` and status `ACTIVE`.)

## Decision

Adopt the anchor‑free thread model with the UI interaction model described. Implementation is deferred until the core VS Code extension commands are complete.

## Next Steps

- Execute `anchor-free-threads-plan-001.md`.