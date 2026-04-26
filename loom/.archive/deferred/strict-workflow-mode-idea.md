---
type: idea
id: strict-workflow-mode-idea
title: "Strict Workflow Mode — Require Explicit State Transitions"
status: deferred
created: 2026-04-17
version: 1
tags: [workflow, configuration, teams, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Strict Workflow Mode — Require Explicit State Transitions

## Problem
The current happy path auto‑finalizes ideas when creating a design, and auto‑marks designs as `done` when creating a plan. This is delightful for solo developers but may bypass intentional review gates in team environments. Teams may want to enforce explicit `loom finalize` and `loom refine-design` commands.

## Idea
Introduce a configuration option in `.loom/workflow.yml`:

```yaml
workflow:
  strictMode: true   # Default: false
```

When `strictMode` is `true`:
- `weaveDesign` fails if the idea is not already `active` or `done`.
- `weavePlan` fails if the design is not already `done`.
- Users must explicitly run `loom finalize` and `loom refine-design` to advance state.

This gives teams control over their workflow gates without sacrificing the smooth solo experience.

## Why Defer
- The frictionless happy path is ideal for MVP adoption.
- Configuration system adds complexity that is not yet needed.
- Real‑world usage patterns will inform the best design for strict mode.

## Open Questions
- Should strict mode also require explicit `activate` for plans?
- Should there be a middle ground (e.g., `warn` instead of `fail`)?
- How should strict mode interact with the VS Code extension?

## Next Step
Re‑evaluate after gathering feedback from early team adopters. Create `strict-workflow-mode-design.md` and a corresponding implementation plan.

**Status: Deferred for post‑MVP consideration.**
```

---

### 📦 Commit Step 3

```bash
git add -A
git commit -m "feat(app): implement weavePlan use-case with auto-finalize design

- Add weavePlan use-case in app layer
- Auto-mark design as 'done' if not already finalized
- Add weave plan CLI command
- Update barrel exports
- Add strict-workflow-mode deferred idea"