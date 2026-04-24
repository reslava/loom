---
type: design
id: dependency-tracking-design
title: "Dependency Tracking in Plans and Across Plans"
status: active
created: 2026-04-14
version: 1
tags: [dependency, plan, workflow, blocking]
parent_id: core-engine-design
child_ids: []
requires_load: []
target_release: "0.3.0"
actual_release: null
---

# Dependency Tracking in Plans and Across Plans

## Goal

Define a simple, human-readable mechanism to track dependencies between steps within a plan and across different plans. This enables clear execution order, reduces confusion, and lays the foundation for future automation (e.g., `loom status` warnings).

## Context

During implementation, it became evident that certain steps cannot start until others are complete. Within a plan, this is straightforward (e.g., Step 2 requires Step 1's types). Across plans, this is equally important (e.g., `core-engine-plan-003` (CLI) cannot begin until `multi-workspace-plan-001` (multi‑loom) is finished).

While `requires_load` in frontmatter signals document dependencies for AI context, it does not block human execution. A dedicated "Blocked by" column in the steps table provides immediate visibility and serves as a contract for execution order.

# CHAT

## Rafa:
We need to track dependencies within plans and across plans. I suggest adding a "Blocked by" column to the steps table. For cross‑plan dependencies, we can reference the other plan's ID. What do you think?

## AI:
This is a pragmatic, low‑friction solution. It keeps dependency information where the executor is already looking—the steps table. Let's define the semantics clearly.

### 1. Step‑Level Dependencies (Within a Plan)

Each row in the steps table may specify what must be completed before that step can begin.

**Format:**
```markdown
| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Define TypeScript core types | `packages/core/src/types.ts` | — |
| 🔳 | 2 | Implement design reducer | `packages/core/src/designReducer.ts` | Step 1 |
| 🔳 | 3 | Implement plan reducer | `packages/core/src/planReducer.ts` | Step 1 |
| 🔳 | 4 | Implement applyEvent orchestrator | `packages/core/src/applyEvent.ts` | Steps 2, 3 |
```

**Rules:**
- `—` means no dependencies; can start immediately.
- `Step N` means the step cannot start until Step N is marked ✅.
- Multiple dependencies are comma‑separated: `Steps 2, 3`.
- A step blocked by another step that is cancelled (`❌`) must be re‑evaluated.

### 2. Plan‑Level Dependencies (Across Plans)

When an entire plan depends on the completion of another plan, this is captured in the first step of the dependent plan.

**Format:**
```markdown
| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Setup CLI project structure | `packages/cli/` | `multi-workspace-plan-001` |
```

**Rules:**
- Reference the `id` of the blocking plan document (e.g., `multi-workspace-plan-001`).
- The step (and therefore the plan) should not start until the blocking plan is marked `status: done`.
- Multiple blocking plans are comma‑separated.

### 3. Human Workflow

The executor (human or AI agent) should:
1. Review the "Blocked by" column before starting a step.
2. Verify that all blockers are resolved (✅ for steps, `status: done` for plans).
3. If a blocker is not resolved, work on an unblocked step or pause.

### 4. Future Automation

With this structured data, future versions of `loom status` could:
- Highlight blocked steps in the CLI output.
- Warn if a user attempts to start a blocked step.
- Suggest the next available unblocked step.

The table format is easily parseable by the same Markdown parser that reads frontmatter.

### 5. Relation to `requires_load`

| Field | Purpose |
|-------|---------|
| `requires_load` | Ensures AI context includes necessary documents. Informational only. |
| `Blocked by` (table) | Defines execution order contract. Actionable by human/CI. |

Both serve distinct, complementary roles.

## Decision

Adopt the "Blocked by" column in all plan steps tables. Use step numbers for internal dependencies and plan IDs for cross‑plan dependencies. Document this convention in `DOCUMENTATION_GUIDE.md` and the plan template.

## Next Steps

- Update `plan-template.md` with the new column.
- Annotate existing plans (`core-engine-plan-002`, `core-engine-plan-003`, `multi-workspace-plan-001`) with appropriate blockers.
- Add a note in `DOCUMENTATION_GUIDE.md` about dependency tracking.