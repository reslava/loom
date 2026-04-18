---
type: design
id: core-engine-design
title: "REslava Loom — Core Engine Design"
status: active
created: 2026-04-11
updated: 2026-04-14
version: 3
tags: [loom, core, architecture, markdown, context-management]
parent_id: loom-core-engine-idea
child_ids: [loom-core-engine-plan-001, loom-core-engine-plan-002, loom-core-engine-plan-003]
requires_load: []
target_release: "0.1.0"
actual_release: null
---

# REslava Loom — Core Engine Design

## Goal

Define a **document-driven, event-sourced workflow system** for thread development where Markdown files are the single source of truth, state is derived, and AI collaborates step‑by‑step with persistent context.

## Context

Traditional AI-assisted development relies heavily on chat interfaces, which:
- lose context over time
- make structured reasoning difficult
- encourage unbounded execution without validation

REslava Loom replaces ephemeral chat with:
- persistent documents
- explicit workflow stages
- controlled execution
- **automatic context summarisation** for LLM session continuity

Design principles:

- Documents are the **single source of truth**
- State is **derived**, not centrally stored
- AI operates **step-by-step with human approval**
- The system is **flexible but surfaces inconsistencies clearly**
- Everything is **Git-native (Markdown-based)**
- **Context windows are managed** via generated `-ctx.md` files

---

## Core Concepts

### 1. Document Model

Each thread is composed of structured documents:

```
idea → design → plans → done
```

#### Relationships
- 1 idea → 1 design → 1..N plans
- Each document references:
  - `parent_id`
  - `child_ids`

#### Document types
- `*-idea.md` → problem and concept
- `*-design.md` → reasoning + conversation (User + AI)
- `*-plan-*.md` → executable steps
- `*-ctx.md` → auto‑generated context summary

### 2. Documents as Source of Truth

All system state is stored in document frontmatter:

- `status`
- `version`
- `staled`
- `steps_completed`
- etc.

There is:
- ❌ no global workflow state
- ❌ no central state machine

Instead:
- ✅ state is computed from documents

### 3. Derived Thread State

Thread state is computed dynamically:

#### Status
- `CANCELLED` → any doc cancelled
- `IMPLEMENTING` → any plan implementing
- `ACTIVE` → any doc draft/active
- `DONE` → all plans done

#### Phase
- `ideating`
- `designing`
- `planning`
- `implementing`

Derived from document presence and status.

#### Caching for Performance
Derived state is cached per thread and invalidated only when relevant files change (frontmatter, plan steps, or design status). File watchers trigger recomputation with a debounce (300ms) to avoid excessive recalc.

### 4. Minimal State Machines

Only two state machines exist:

#### Design State Machine

```
draft → active → closed → done
  ↘
  cancelled
```

- `draft` → AI-created
- `active` → user + AI interaction
- `closed` → editing paused
- `done` → finalized and plans generated
- `cancelled` → abandoned

Special behavior:
- `REFINE`:
  - increments version
  - sets `refined: true`
  - reopens design (`active`)
  - invalidates plans

#### Plan State Machine

```
draft → active → implementing → done
  ↘        ↘
blocked   cancelled
```

- Tracks execution progress
- Includes step-level tracking

Special properties:
- `staled: true` → design changed after plan creation

### 5. Event-Driven Architecture

System behavior is driven by events:

- `CREATE_DESIGN`
- `REFINE_DESIGN`
- `CREATE_PLAN`
- `START_PLAN`
- `STEP_DONE`
- `CHECK_THREAD`        (diagnostic only — does not mutate state)
- `SUMMARIZE_CONTEXT`

Events are applied through:

```
applyEvent(thread, event) → newThread
```

### 6. Orchestrator & Entry Points

A single orchestrator coordinates document updates and cross‑document effects.

**Entry points** (how events are triggered):
1. **File watchers** – when a user manually edits a frontmatter field (e.g., status → active), the orchestrator may fire related events.
2. **CLI commands** – `loom refine-design`, `loom start-plan`, `loom validate`, `loom summarise-context`.
3. **VS Code commands** – buttons in tree view, context menus.
4. **AI suggestions** – AI proposes an action; user approves → orchestrator fires the corresponding event.

All events go through the same `applyEvent` pipeline.

### 7. Effects Layer

Side effects are separated from logic:

Examples:
- create/update files
- run scripts
- log output
- **generate context summary**

Flow:

```
event → applyEvent → new state
  ↘
effects → executor
```

### 8. File System Integration

Documents are stored as Markdown:

```
threads/
  payment-system/
    payment-system-idea.md
    payment-system-design.md
    payment-system-ctx.md      (auto‑generated)
    plans/
      payment-system-plan-001.md
      payment-system-plan-002.md
```

The filesystem acts as:
- database
- history (via Git)
- debugging tool

### 9. Reactive System (Watchers)

File watchers detect changes:

```
file change → debounce → reload thread → recompute state → run effects
```

**Reactivity triggers**:
- User edits frontmatter → orchestrator may fire events
- User adds/removes plan steps → recompute plan state
- Design document grows beyond token threshold → auto‑trigger context summarisation

### 10. CLI Interface

Commands:

```
loom status [thread-id]         # Show derived state
loom refine-design <thread-id>  # Fire REFINE_DESIGN event
loom start-plan <plan-id>       # Fire START_PLAN event
loom validate <thread-id>       # Check document relationships & integrity
loom summarise-context <thread-id>  # Force regenerate -ctx.md
```

`loom validate` checks:
- Every `parent_id` points to an existing document
- No orphaned child references
- Frontmatter required fields are present
- Plan `staled` flag matches design version

### 11. VS Code Extension (VSIX)

Primary UI layer:

- Tree view of threads with derived status badges
- Commands (palette + context menus):
  - start plan
  - refine design
  - validate thread
  - regenerate context
- File decorations:
  - stale plans (strikethrough or warning icon)
  - blocked steps
  - context summary available

Moves system from:
- pull-based (CLI)
→ push‑based (reactive UI)

### 12. AI Collaboration Model

AI operates under strict interaction rules:

- Works **step-by-step**
- Does not execute ahead blindly
- Requests clarification when needed
- Summarises completed steps
- **Proposes next step and waits for approval**

**Handshake protocol** (between AI and extension):
1. Extension injects into the AI's prompt:
   - Current thread state (derived)
   - Full `design.md` (or `-ctx.md` if context is large)
   - Latest plan steps (if any)
2. AI responds with a structured block:
   ```json
   {
     "proposed_action": "REFINE_DESIGN",
     "reasoning": "The user asked to add a new requirement...",
     "next_step_description": "Update design.md with security considerations",
     "requires_approval": true
   }
   ```
3. Extension presents the proposal to the user (diff preview).
4. User approves → extension fires the corresponding event → documents are updated.

This ensures AI never changes state without explicit human consent.

### 13. Context Management

LLM context windows are limited. To prevent truncation of long `design.md` conversations:

#### Auto‑generated `-ctx.md`
- Created automatically when `design.md` exceeds a threshold (e.g., 20k characters or 500 lines).
- Contains:
  - Frontmatter with `source_version` (links to design version)
  - Summary of the problem statement
  - Key decisions made (with timestamps)
  - Open questions / unresolved items
  - Latest plan references (if any)
- Regenerated on:
  - Manual command (`loom summarise-context`)
  - Or when `design.md` changes and its size crosses threshold (debounced).

#### AI usage policy
- If `-ctx.md` exists and is newer than `design.md` (or within a reasonable tolerance), the AI may be instructed to read the context file first.
- The AI can still request to load the full `design.md` if needed.

### 14. Validation & Integrity

The `CHECK_THREAD` event (triggered via CLI command `loom validate` or VS Code command) performs a diagnostic scan. It **does not mutate state**; it only reports inconsistencies.

`loom validate <thread-id>` performs:

- **Structural integrity**: parent/child links exist, no cycles.
- **State consistency**: e.g., a plan cannot be `implementing` if its design is `draft`.
- **Stale detection**: If design version > plan’s `design_version` field, mark plan as `staled: true`.
- **Frontmatter schema**: Required fields present; status values are allowed.

### 15. Flexibility vs Strictness

System philosophy:

> Flexible, but surfaces inconsistencies clearly

Examples:
- allow implementing stale plan
- but show warning:
  - "⚠ Plan is stale (design v2)"
- allow deleting a design that has plans
- but show orphaned child warning on next validation

No hard blocking, but strong guidance.

### 16. Custom Workflows via Declarative Configuration

Advanced users may need different document types, statuses, or transition rules. The system supports **declarative custom workflows** via `.loom/workflow.yml`.

#### 16.1 Placement & Discovery

- **Workspace‑wide**: `.loom/workflow.yml` – applies to all threads in the loom.
- **Thread‑specific**: `threads/<thread-name>/workflow.yml` – overrides the loom config for that thread only.

If no `workflow.yml` is found, the system falls back to the **built‑in default workflow**.

#### 16.2 Schema Definition

```yaml
name: string                # human‑readable name
version: 1                  # schema version

documents:
  - type: string            # e.g., "research"
    file_pattern: string    # e.g., "**/*-research.md"
    statuses: [string]      # allowed status values
    initial_status: string
    parent_of: [string]
    child_of: string
    version_field: string   # default "version"
    staled_field: string    # default "staled"

events:
  - name: string
    applies_to: string
    from_status: string|list
    to_status: string
    effects: [effect_name, ...]

validation:
  - rule: string
    check: string
```

#### 16.3 Built‑in Effects

| Effect Name | Description |
|-------------|-------------|
| `increment_version` | Increments the document’s `version` field |
| `mark_children_staled` | Sets `staled: true` on all child documents |
| `create_child_document` | Creates a new document of a child type |
| `delete_child_documents` | Removes child documents |
| `send_notification` | Shows a VS Code notification |
| `run_command` | Executes a shell command (disabled by default) |
| `refresh_tree_view` | Forces UI update in VS Code |

### 17. Default Workflow Reference

The built‑in default workflow is equivalent to:

```yaml
name: "default-loom-workflow"
version: 1

documents:
  - type: idea
    file_pattern: "**/*-idea.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    parent_of: [design]

  - type: design
    file_pattern: "**/*-design.md"
    statuses: [draft, active, closed, done, cancelled]
    initial_status: draft
    parent_of: [plan]
    child_of: idea

  - type: plan
    file_pattern: "**/*-plan-*.md"
    statuses: [draft, active, implementing, done, blocked, cancelled]
    initial_status: draft
    child_of: design

events:
  - name: REFINE_DESIGN
    applies_to: design
    from_status: [active, closed, done]
    to_status: active
    effects: [increment_version, mark_children_staled]

  - name: CREATE_PLAN
    applies_to: design
    from_status: done
    to_status: done
    effects: [create_child_document]
```

---

## Next Steps for Implementation (MVP)

1. **Implement document parser** – read frontmatter + markdown.
2. **Implement state derivation** – pure functions that compute thread state from files.
3. **Implement event applier** – `applyEvent` for design and plan events.
4. **Build CLI** – `loom status`, `loom refine-design`, `loom validate`.
5. **Add file watcher** with debouncing and cache invalidation.
6. **Implement context summariser** – generate `-ctx.md` when threshold exceeded.
7. **Wrap in VS Code extension** – tree view, commands, decorations.
8. **Integrate AI handshake** – prompt engineering + structured response parsing.