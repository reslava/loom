---
type: plan
id: pl_01KTV5CCCDWJP8BYVZ18DNE849
title: Plan step-CRUD tools
status: done
created: "2026-06-11T00:00:00.000Z"
updated: 2026-06-11
version: 1
design_version: 1
tags: []
parent_id: de_01KTV4J19RRZ2BENGHZW56P35S
requires_load: []
target_version: 0.1.0
steps:
  - id: id-keyed-detail-sections-saver-re
    order: 1
    status: done
    description: "Tag plan detail sections with <!-- step:{id} --> markers and make the plan saver re-key/reorder/prune them by id (preserving authored prose), alongside the existing table regen."
    files_touched: [packages/core/src/planTableUtils.ts, packages/fs/src/serializers/frontmatterSaver.ts]
    blocked_by: []
    satisfies: []
  - id: loom-add-step
    order: 2
    status: done
    description: ADD_STEP event + reducer (insert at append/before/after position, slug id, recompute order) + app use-case + MCP tool registered in the plan group.
    files_touched: [packages/core/src/events/planEvents.ts, packages/core/src/reducers/planReducer.ts, packages/core/src/applyEvent.ts, packages/app/src/addStep.ts, packages/mcp/src/tools/addStep.ts, packages/mcp/src/server.ts]
    blocked_by: [Id-keyed detail sections + saver re-keying (Option A foundation)]
    satisfies: []
  - id: loom-remove-step
    order: 3
    status: done
    description: REMOVE_STEP event + reducer (reject done/cancelled, strip blockedBy refs to it + report, recompute order) + app use-case + MCP tool.
    files_touched: [packages/core/src/events/planEvents.ts, packages/core/src/reducers/planReducer.ts, packages/core/src/applyEvent.ts, packages/app/src/removeStep.ts, packages/mcp/src/tools/removeStep.ts, packages/mcp/src/server.ts]
    blocked_by: [Id-keyed detail sections + saver re-keying (Option A foundation), loom_add_step]
    satisfies: []
  - id: tests
    order: 4
    status: done
    description: Reducer + handle tests for add/remove, plus the detail-section round-trip invariant under reorder/add/remove (the Option-A guarantee), including a reorder_steps detail-reflow regression.
    files_touched: [tests/step-crud.test.ts]
    blocked_by: [Id-keyed detail sections + saver re-keying (Option A foundation), loom_add_step, loom_remove_step]
    satisfies: []
  - id: docs-sync-build-release-1-5
    order: 5
    status: done
    description: Add add_step/remove_step to both CLAUDE.md surfaces (drift test enforces parity), CHANGELOG, build-all + test-all, lockstep bump to 1.5.0.
    files_touched: [CLAUDE.md, packages/app/src/installWorkspace.ts, CHANGELOG.md, packages/vscode/CHANGELOG.md]
    blocked_by: [Id-keyed detail sections + saver re-keying (Option A foundation), loom_add_step, loom_remove_step, Tests]
    satisfies: []
---
# Plan step-CRUD tools

## Goal

Complete the plan-step editing surface with loom_add_step + loom_remove_step, built on the foundational Option-A fix that makes per-step detail prose survive restructuring. Today detail sections are headed `### Step N — {title}` keyed by order number, and title/detail aren't in frontmatter, so reorder/add/remove drift them (the shipped loom_reorder_steps already has this latent gap). Option A: tag each detail section with a hidden `<!-- step:{id} -->` marker and have the plan saver re-key sections by id — preserve authored prose, reorder to match the frontmatter step order, prune orphans, stub new steps, render the `Step N` number from current order. Then add_step/remove_step are event-sourced like the 1.4.0 step tools (done/cancelled steps immutable; remove strips blockedBy references to the removed step and reports them; update_whole_plan stays rejected). Target release 1.5.0 (lockstep).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Tag plan detail sections with <!-- step:{id} --> markers and make the plan saver re-key/reorder/prune them by id (preserving authored prose), alongside the existing table regen. | packages/core/src/planTableUtils.ts, packages/fs/src/serializers/frontmatterSaver.ts | — | — |
| ✅ | 2 | ADD_STEP event + reducer (insert at append/before/after position, slug id, recompute order) + app use-case + MCP tool registered in the plan group. | packages/core/src/events/planEvents.ts, packages/core/src/reducers/planReducer.ts, packages/core/src/applyEvent.ts, packages/app/src/addStep.ts, packages/mcp/src/tools/addStep.ts, packages/mcp/src/server.ts | Id-keyed detail sections + saver re-keying (Option A foundation) | — |
| ✅ | 3 | REMOVE_STEP event + reducer (reject done/cancelled, strip blockedBy refs to it + report, recompute order) + app use-case + MCP tool. | packages/core/src/events/planEvents.ts, packages/core/src/reducers/planReducer.ts, packages/core/src/applyEvent.ts, packages/app/src/removeStep.ts, packages/mcp/src/tools/removeStep.ts, packages/mcp/src/server.ts | Id-keyed detail sections + saver re-keying (Option A foundation), loom_add_step | — |
| ✅ | 4 | Reducer + handle tests for add/remove, plus the detail-section round-trip invariant under reorder/add/remove (the Option-A guarantee), including a reorder_steps detail-reflow regression. | tests/step-crud.test.ts | Id-keyed detail sections + saver re-keying (Option A foundation), loom_add_step, loom_remove_step | — |
| ✅ | 5 | Add add_step/remove_step to both CLAUDE.md surfaces (drift test enforces parity), CHANGELOG, build-all + test-all, lockstep bump to 1.5.0. | CLAUDE.md, packages/app/src/installWorkspace.ts, CHANGELOG.md, packages/vscode/CHANGELOG.md | Id-keyed detail sections + saver re-keying (Option A foundation), loom_add_step, loom_remove_step, Tests | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

### Step 1 — Id-keyed detail sections + saver re-keying (Option A foundation)

Add a core function that, given the current body + the ordered frontmatter steps, parses existing `### …` detail sections by their `<!-- step:{id} -->` marker into an id→prose map, then re-emits them in frontmatter-step order: each as `<!-- step:{id} -->` + `### Step {order} — {title}` + preserved prose; prunes sections whose id is gone; stubs a new section for an id with no existing prose; renders the Step number from current order. Preserve Goal + any authored Notes. Wire into the plan save path (replacing/augmenting the table-only updateStepsTableInContent). Backfill: a marker-less body maps sections to ids best-effort by current order. This also retroactively fixes loom_reorder_steps's detail drift.

### Step 2 — loom_add_step

loom_add_step(planId, { description, title?, files?, blockedBy?, satisfies?, detail? }, position?) where position = append (default) | { after: stepId } | { before: stepId }. Reducer inserts a new step with a fresh slugifyStepId id at the position, recomputes order; allowed in draft/active/implementing/blocked. The new step's detail section is created by the step-1 saver mechanism.

### Step 3 — loom_remove_step

loom_remove_step(planId, stepId). Reducer rejects a done/cancelled step (immutable history); removes the step; strips blockedBy references to its id from the remaining steps and returns the list of steps whose blockers were stripped; recomputes order. The step's detail section is pruned by the step-1 saver mechanism.

### Step 4 — Tests

Pure reducer tests: ADD_STEP at append/before/after (order recomputed, slug id), REMOVE_STEP (reject done, strip+report blockedBy dependents). Saver round-trip: a plan with detail sections, after reorder/add/remove, has detail sections matching the new step order/set (by id), authored prose preserved, orphans pruned, new step stubbed — and a regression asserting loom_reorder_steps now reflows detail (the latent 1.4.0 gap).

### Step 5 — Docs sync, build, release 1.5.0

Add loom_add_step / loom_remove_step to the writes-breakdown in BOTH CLAUDE.md and the LOOM_CLAUDE_MD template (tests/claude-md-sync.test.ts verifies rule-set parity). Write CHANGELOG 1.5.0 notes (root) + vscode lockstep note. Run build-all + test-all. Bump all 7 package.json to 1.5.0 via scripts/bump-version.sh; commit + tag; push gated on Rafa.
