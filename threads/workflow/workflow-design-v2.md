---
type: design
id: workflow-design-v2
title: "AI-native Development Workflow System — Design (v2)"
status: draft
created: 2026-04-11
updated: 2026-04-11
version: 2.0.0
tags: [workflow, ai, architecture, markdown, context-management]
parent_id: workflow-idea
child_ids: []
requires_load: []
---

# AI-native Development Workflow System — Design (v2)

## Goal

Define a **document-driven, event-sourced workflow system** for feature development where Markdown files are the single source of truth, state is derived, and AI collaborates step‑by‑step with persistent context.

## Context

Traditional AI-assisted development relies heavily on chat interfaces, which:
- lose context over time
- make structured reasoning difficult
- encourage unbounded execution without validation

This system replaces ephemeral chat with:
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

Each feature is composed of structured documents:

```
idea → design → plans → done
```

#### Relationships
- 1 idea → 1 design → 1..N plans
- Each document references:
  - `parent_id`
  - `child_ids`

#### Document types
- `idea.md` → problem and concept
- `design.md` → reasoning + conversation (User + AI)
- `plan-XXX.md` → executable steps
- `done-XXX.md` → execution results (optional)
- `design-ctx.md` → auto‑generated context summary (see section 13)

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

### 3. Derived Feature State

Feature state is computed dynamically:

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
Derived state is cached per feature and invalidated only when relevant files change (frontmatter, plan steps, or design status). File watchers trigger recomputation with a debounce (300ms) to avoid excessive recalc.

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
- `CHECK_FEATURE`        (diagnostic only — does not mutate state)
- `SUMMARIZE_CONTEXT`

Events are applied through:

```
applyEvent(feature, event) → newFeature
```

### 6. Orchestrator & Entry Points

A single orchestrator coordinates document updates and cross‑document effects.

**Entry points** (how events are triggered):
1. **File watchers** – when a user manually edits a frontmatter field (e.g., status → active), the orchestrator may fire related events.
2. **CLI commands** – `wf refine-design`, `wf start-plan`, `wf validate`, `wf summarise-context`.
3. **VS Code commands** – buttons in tree view, context menus.
4. **AI suggestions** – AI proposes an action; user approves → orchestrator fires the corresponding event.

All events go through the same `applyEvent` pipeline.

### 7. Effects Layer

Side effects are separated from logic:

Examples:
- create/update files
- run scripts
- log output
- **generate context summary** (see section 13)

Flow:

```
event → applyEvent → new state
  ↘
effects → executor
```

### 8. File System Integration

Documents are stored as Markdown:

```
features/
  featureA/
    idea.md
    design.md
    design-ctx.md      (auto‑generated)
    plans/
      plan-001.md
      plan-002.md
```

The filesystem acts as:
- database
- history (via Git)
- debugging tool

### 9. Reactive System (Watchers)

File watchers detect changes:

```
file change → debounce → reload feature → recompute state → run effects
```

**Reactivity triggers**:
- User edits frontmatter → orchestrator may fire events (if change is recognised, e.g., `status: active` → `DESIGN_ACTIVATED`)
- User adds/removes plan steps → recompute plan state
- Design document grows beyond token threshold → auto‑trigger context summarisation

### 10. CLI Interface

Commands:

```
wf status [feature-id]         # Show derived state
wf refine-design <feature-id>  # Fire REFINE_DESIGN event
wf start-plan <plan-id>        # Fire START_PLAN event
wf validate <feature-id>       # Check document relationships & integrity
wf summarise-context <feature-id>  # Force regenerate design-ctx.md
```

`wf validate` checks:
- Every `parent_id` points to an existing document
- No orphaned child references
- Frontmatter required fields are present
- Plan `staled` flag matches design version

### 11. VS Code Extension (VSIX)

Primary UI layer:

- Tree view of features with derived status badges
- Commands (palette + context menus):
  - start plan
  - refine design
  - validate feature
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
   - Current feature state (derived)
   - Full `design.md` (or `design-ctx.md` if context is large)
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
5. Extension may also inject a system message: “Your response must end with `[AWAITING_APPROVAL]` and the next step proposal.”

This ensures AI never changes state without explicit human consent.

### 13. Context Management (Reintroduced)

LLM context windows are limited. To prevent truncation of long `design.md` conversations:

#### Auto‑generated `design-ctx.md`
- Created automatically when `design.md` exceeds a threshold (e.g., 20k characters or 500 lines).
- Contains:
  - Frontmatter with `source_version` (links to design version)
  - Summary of the problem statement
  - Key decisions made (with timestamps)
  - Open questions / unresolved items
  - Latest plan references (if any)
- Regenerated on:
  - Manual command (`wf summarise-context`)
  - Or when `design.md` changes and its size crosses threshold (debounced).

#### AI usage policy
- If `design-ctx.md` exists and is newer than `design.md` (or within a reasonable tolerance), the AI may be instructed to read the context file first.
- The AI can still request to load the full `design.md` if needed.
- When the AI proposes a refinement, it must indicate whether it used the full design or the context summary.

This ensures long‑running design sessions remain productive without losing history.

### 14. Validation & Integrity

The `CHECK_FEATURE` event (triggered via CLI command `wf validate` or VS Code command) performs a diagnostic scan. It **does not mutate state**; it only reports inconsistencies.

`wf validate <feature-id>` performs:

- **Structural integrity**: parent/child links exist, no cycles.
- **State consistency**: e.g., a plan cannot be `implementing` if its design is `draft`.
- **Stale detection**: If design version > plan’s `design_version` field, mark plan as `staled: true`.
- **Frontmatter schema**: Required fields present; status values are allowed.

Validation errors are shown in CLI and VS Code as problems (diagnostics).

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

### 16. Future: Custom Workflows (Optional)

While v2 is hard‑coded to `idea → design → plan → done`, the event system is designed to be extensible. In a future version:

- Users can provide a `workflow.yml` that defines custom document types, allowed transitions, and event handlers.
- The core orchestrator would load this file and validate events against the custom schema.
- The hard‑coded workflow becomes the default built‑in workflow.

This keeps the MVP simple while leaving a clear upgrade path.

---

## Next Steps for Implementation (MVP)

1. **Implement document parser** – read frontmatter + markdown.
2. **Implement state derivation** – pure functions that compute feature state from files.
3. **Implement event applier** – `applyEvent` for design and plan events.
4. **Build CLI** – `wf status`, `wf refine-design`, `wf validate`.
5. **Add file watcher** with debouncing and cache invalidation.
6. **Implement context summariser** – generate `design-ctx.md` when threshold exceeded.
7. **Wrap in VS Code extension** – tree view, commands, decorations.
8. **Integrate AI handshake** – prompt engineering + structured response parsing.

---

## Changelog (v1 → v2)

- Added **context management** section with `design-ctx.md`.
- Defined **orchestrator entry points** (watchers, CLI, VS Code, AI).
- Added **validation command** (`wf validate`) with integrity checks.
- Specified **AI handshake protocol** (structured JSON + approval).
- Added **derived state caching** strategy.
- Outlined **future custom workflow** path.
- Clarified **reactive triggers** for file watchers.

### 17. Custom Workflows via Declarative Configuration

While the default workflow (`idea → design → plan → done`) covers many feature development scenarios, advanced users may need different document types, statuses, or transition rules. Instead of reintroducing a complex, code‑based state machine, the system supports **declarative custom workflows** via a `workflow.yml` file.

#### 17.1 Placement & Discovery

- **Workspace‑wide**: `.wf/workflow.yml` – applies to all features in the workspace.
- **Feature‑specific**: `features/<feature-name>/workflow.yml` – overrides the workspace config for that feature only.

If no `workflow.yml` is found, the system falls back to the **built‑in default workflow** (which is internally represented as a `workflow.yml`).

#### 17.2 Schema Definition

```yaml
# workflow.yml schema (version 1)
name: string                # human‑readable name
version: 1                  # schema version, must be 1

documents:                  # list of document types
  - type: string            # unique identifier (e.g., "research")
    file_pattern: string    # glob/regex to match files (e.g., "research.md" or "study-*.md")
    statuses: [string]      # allowed status values (e.g., ["draft", "review", "done"])
    initial_status: string  # status when document is first created
    parent_of: [string]     # optional: document types that can be children (by `parent_id`)
    child_of: string        # optional: single parent type (if this doc is always a child)
    version_field: string   # optional: frontmatter field for version (default "version")
    staled_field: string    # optional: frontmatter field for staleness flag (default "staled")

events:                     # allowed events and their transitions
  - name: string            # event identifier (e.g., "SUBMIT_FOR_REVIEW")
    applies_to: string      # document type this event acts on
    from_status: string|list  # source status(es) allowed for this transition
    to_status: string       # target status after event
    effects:                # list of built‑in effects to run
      - effect_name
      # effects can have parameters (see 17.4)

validation:                 # additional cross‑document consistency rules (optional)
  - rule: string            # human‑readable description
    check: string           # expression (simple condition language, see 17.5)
```

#### 17.3 Example: Research → Design → Review Workflow

```yaml
name: "research-to-release"
version: 1

documents:
  - type: research
    file_pattern: "research.md"
    statuses: [draft, peer_review, approved, archived]
    initial_status: draft
    parent_of: [design]

  - type: design
    file_pattern: "design.md"
    statuses: [draft, review, approved, done]
    initial_status: draft
    parent_of: [implementation_plan]
    child_of: research

  - type: implementation_plan
    file_pattern: "plan-*.md"
    statuses: [draft, active, blocked, done]
    initial_status: draft
    child_of: design

events:
  - name: SUBMIT_RESEARCH_FOR_REVIEW
    applies_to: research
    from_status: draft
    to_status: peer_review
    effects:
      - notify_reviewers

  - name: APPROVE_RESEARCH
    applies_to: research
    from_status: peer_review
    to_status: approved
    effects:
      - create_child_document
        # creates an initial design.md from template

  - name: REFINE_DESIGN
    applies_to: design
    from_status: [review, approved]
    to_status: draft
    effects:
      - increment_version
      - mark_children_staled

validation:
  - rule: "Implementation plan cannot be active if design is not approved"
    check: "implementation_plan.status == 'active' => design.status == 'approved'"
  - rule: "Approved research must have at least one design child"
    check: "research.status == 'approved' => count(design.children) > 0"
```

#### 17.4 Built‑in Effects (Available for Use in `events.effects`)

| Effect Name | Description | Parameters |
|-------------|-------------|------------|
| `increment_version` | Increments the document’s `version` field | none |
| `mark_children_staled` | Sets `staled: true` on all child documents | none |
| `create_child_document` | Creates a new document of a child type (from template) | `child_type`, `template_path` (optional) |
| `delete_child_documents` | Removes child documents (e.g., when cancelling) | `child_types` (list) |
| `send_notification` | Shows a VS Code notification or logs to output channel | `message`, `severity` (info/warning/error) |
| `run_command` | Executes a shell command (⚠️ disabled by default, requires user opt‑in) | `command`, `cwd` (optional) |
| `refresh_tree_view` | Forces UI update in VS Code extension | none |

All effects are executed by the **effects layer** after `applyEvent` returns the new state.

#### 17.5 Validation Rule Language (Simple)

Validation rules are evaluated when `wf validate` is run or when state changes. The `check` field uses a small expression language:

- `document.status` – status of the current document
- `parent.status` – status of the parent document (if any)
- `child.status` – for validation that iterates over children (using `all(child.status == 'done')`)
- `count(document.children)` – number of child documents
- Logical operators: `==`, `!=`, `and`, `or`, `=>` (implies)

Example: `"design.status == 'approved' => count(design.plans) > 0"`

The system evaluates these expressions safely (no arbitrary code execution).

#### 17.6 How the Orchestrator Uses the Custom Workflow

1. **Loading** – On orchestrator startup, read `workflow.yml` from the workspace root or feature folder. Validate against the schema (using a JSON Schema validator). If invalid, fall back to default workflow and log an error.

2. **Event Validation** – When an event is triggered (e.g., `REFINE_DESIGN`), the orchestrator checks:
   - The event is defined in `events`.
   - The current document’s status matches `from_status`.
   - If yes, it computes the new state and enqueues the effects.

3. **Effect Execution** – After `applyEvent`, the orchestrator calls the effects layer with the list of effect names and parameters. Effects are executed in order.

4. **UI Adaptation** – The VS Code extension reads the active workflow to determine:
   - Which document types to show in the tree view.
   - What status badges/colours to display.
   - Which commands (events) to enable for a given document.

#### 17.7 Default Workflow as Built‑in Config

The built‑in default workflow is equivalent to:

```yaml
name: "default-idea-design-plan"
version: 1
documents:
  - type: idea
    file_pattern: "idea.md"
    statuses: [draft, active, done, cancelled]
    initial_status: draft
    parent_of: [design]
  - type: design
    file_pattern: "design.md"
    statuses: [draft, active, closed, done, cancelled]
    initial_status: draft
    parent_of: [plan]
  - type: plan
    file_pattern: "plan-*.md"
    statuses: [draft, active, implementing, done, blocked, cancelled]
    initial_status: draft
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
  # ... other events (truncated for brevity)
```

This config is **hard‑coded** in the extension, but users can override it by providing their own `workflow.yml`.

#### 17.8 Security & Sandboxing

- **No user‑supplied code** – All effects are built‑in and reviewed. The `run_command` effect is **disabled by default**; users must explicitly enable it in VS Code settings (`"workflow.allowShellCommands": true`).
- **Validation rules are not evaluated with `eval()`** – They are parsed by a simple, non‑Turing‑complete expression language.
- **File system access** – Effects only write to the `features/` directory (or user‑configured root). They cannot delete arbitrary files outside the workspace.

#### 17.9 Migration from Default Workflow

When a user creates a new feature, the system checks for a `workflow.yml` in the workspace root. If found, the feature uses that workflow. The CLI command `wf init --workflow custom` can copy a template `workflow.yml` into the workspace.

Existing features that were created with the default workflow remain on the default workflow unless the user explicitly adds a `workflow.yml` to the feature folder (which then overrides).

#### 17.10 Example: Simple Blog Post Workflow

```yaml
name: "blog-post"
documents:
  - type: post
    file_pattern: "post-*.md"
    statuses: [draft, editorial, published, archived]
    initial_status: draft
events:
  - name: SEND_TO_EDITOR
    applies_to: post
    from_status: draft
    to_status: editorial
    effects: [send_notification]
  - name: PUBLISH
    applies_to: post
    from_status: editorial
    to_status: published
    effects: [run_command]   # e.g., run a static site generator
```

This shows how the same system can be used for non‑software workflows (blog posts, documentation, etc.).

---

### 18. Summary: Custom Workflows Without a Black‑Box State Machine

| Concern | Solution |
|---------|----------|
| Users need different document types | Declarative `documents` list |
| Users need different status transitions | Declarative `events` with `from_status`/`to_status` |
| Users need side effects | Built‑in effect library (no code) |
| Users need cross‑document validation | Simple expression language |
| Security | No arbitrary code execution; `run_command` opt‑in |
| Complexity | Configuration, not programming |

The original black‑box state machine is **not** brought back. Instead, a **declarative configuration layer** sits on top of the pure, document‑driven core. This gives users flexibility while keeping the system safe, debuggable, and maintainable.