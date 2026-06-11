---
type: idea
id: id_01KTV4H68TX91DYCG331W68BWR
title: Plan step-CRUD tools
status: done
created: "2026-06-11T00:00:00.000Z"
updated: 2026-06-11
version: 2
tags: []
parent_id: null
requires_load: []
---
# Plan step-CRUD tools

## What we want to build

Complete the plan-step editing surface and make step *restructuring* safe:

1. **`loom_add_step`** — insert a new step at a position (append / before / after an existing step).
2. **`loom_remove_step`** — delete a pending step.
3. **Fix the order-keyed detail-section problem** that makes restructuring unsafe today.

## Why it matters

1.4.0 shipped `loom_update_step` (amend a step's fields) and `loom_reorder_steps` (reorder), but the step surface is still incomplete and has a latent flaw:

- **No add/remove.** You can amend or reorder steps, but to *add* or *delete* one you must recreate the whole plan (archive + `loom_create_plan`). That's the gap we hit while revising the claude-md-sync plan.
- **Detail prose drifts under restructuring (latent bug, already in 1.4.0).** A plan body's per-step detail lives in `### Step N — {title}` sections **keyed by the order number N**, and `title`/`detail` are *not* persisted to frontmatter (body owns prose). So `loom_reorder_steps` / a future add/remove keep the generated `## Steps` *table* correct but leave the `### Step N` headings and detail prose pointing at the wrong (or a removed) step. The reorder tool we just shipped already has this gap — it just hasn't bitten yet because reordered plans rarely carry detail sections.

## Success criteria

- Add a step at any position, and remove a pending step, via MCP — no plan recreation.
- After *any* structural change (reorder / add / remove), the body's per-step detail sections stay correct: no stale `### Step N` headings, no orphaned detail for a removed step.
- Done/cancelled steps remain immutable (rejected by add-adjacent and remove, consistent with `update_step`/`reorder`).
- `loom_update_whole_plan` is explicitly **not** built — a wholesale approach change is a new plan (archive + recreate), which is the honest semantic.

## Relation to prior work

Extends the [[mcp-new-tools-idea]] step tools (`update_step` / `reorder_steps`). The detail-keying fix is the foundational piece — without it, add/remove inherit the same drift `reorder_steps` already has.