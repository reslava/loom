---
type: design
id: de_01KTV4J19RRZ2BENGHZW56P35S
title: Plan step-CRUD tools
status: draft
created: "2026-06-11T00:00:00.000Z"
updated: 2026-06-11
version: 3
tags: []
parent_id: id_01KTV4H68TX91DYCG331W68BWR
requires_load: []
---
# Plan step-CRUD tools

## Overview

Two new event-sourced tools (`loom_add_step`, `loom_remove_step`) that complete step CRUD, plus the foundational fix that makes them — and the already-shipped `loom_reorder_steps` — safe for plans that carry per-step detail prose. Same architecture as the 1.4.0 step tools: `ADD_STEP` / `REMOVE_STEP` events → pure reducer in `packages/core` → app use-case → MCP tool, writing through `runEvent`.

## The foundational decision (resolve this first)

Everything else depends on this. Today `title`/`detail` are **body-owned** (not in frontmatter), and the body's detail sections are headed `### Step N — {title}` — **keyed by order number N**. Any reorder/add/remove shifts N, so the headings/prose drift from the table. The generated `## Steps` table is fine (regenerated from frontmatter); the detail sections are not. Two ways to fix:

### Option A — key detail sections by stable step id (recommended)
Render detail sections under a stable, id-based anchor instead of an order number — e.g. `### {step-id} — {title}` or a hidden `<!-- step:{id} -->` marker above each `### …` heading. The plan saver then regenerates/prunes detail sections **by id** from the step model: reorder reflows them, add creates one, remove drops the orphan. `title`/`detail` stay body-authored (the "body owns prose" philosophy holds), they just become *addressable*.
- **Pro:** prose stays human-authored and editable in place; smallest change to the current model; fixes `reorder_steps`'s latent gap too.
- **Con:** the saver has to parse + rewrite detail sections (more than today's table-only regenerate); headings get a slightly less pretty `### {id}` form (or we keep `### Step N — title` as a *generated* view but drive it from id order).

### Option B — persist `title`/`detail` to frontmatter, fully generate the body
Move `title`/`detail` into the frontmatter `steps` block; the entire body (table + detail sections) becomes a pure generated projection.
- **Pro:** body is 100% derived; no body-parsing in the saver.
- **Con:** reverses the deliberate "body owns prose" decision; frontmatter steps get bulky; authored Markdown detail now lives in YAML (awkward to write/read); larger migration.

**Decision: A (chosen).** It fixes the real problem (addressability) with the least violence to the current design, and it's the prerequisite the add/remove tools sit on top of. Detail sections become id-addressable (a `<!-- step:{id} -->` marker above each `### Step N — {title}` heading; the `Step N` number stays a generated view of current order); the plan saver regenerates/prunes detail sections by id alongside the table.

## `loom_add_step`
```
loom_add_step(planId, { description, title?, files?, blockedBy?, satisfies?, detail? }, position?)
```
- `position`: `append` (default) | `{ after: stepId }` | `{ before: stepId }`.
- New stable slug id (via `slugifyStepId`), inserted at the position; `order` recomputed 1..n. New detail section created (per the Option-A mechanism).
- Allowed in draft/active/implementing/blocked (same as `update_step`).

## `loom_remove_step`
```
loom_remove_step(planId, stepId)
```
- **Rejects** a done/cancelled step (immutable history — same guard as `update_step`).
- Handles `blockedBy` references *to* the removed step: strip them from other steps (and report which were stripped), so no dangling blocker. (Alternative: reject with the dependent list — decide during design; lean "strip + report" for ergonomics.)
- Removes the step + its detail section; recompute `order`.

## Out of scope
- `loom_update_whole_plan` — rejected. A wholesale approach change is a new plan (archive + `loom_create_plan`); a whole-replace tool risks clobbering done-step history for no real gain.

## Build / test
Reducer cases (`ADD_STEP`/`REMOVE_STEP`) with pure tests (mirror `tests/mcp-new-tools.test.ts`), incl. the detail-section round-trip under reorder/add/remove (the Option-A invariant); app use-cases; MCP tools registered in the `plan` group; CLAUDE.md writes-breakdown updated in **both** surfaces (the drift test enforces parity); lockstep version bump.

## Resolved decisions
1. **Detail-section keying → Option A.** Detail sections are addressed by stable step **id**, not order N; the saver regenerates/prunes them by id. `title`/`detail` stay body-authored prose.
2. **`remove_step` dependents → strip-and-report.** Removing a step strips `blockedBy` references to it from the remaining steps and reports which were stripped — no dangling blocker, no hard reject on dependents.
3. **Detail-heading form → keep the readable `### Step N — {title}` as a generated view (driven by id order), with a hidden `<!-- step:{id} -->` marker on the line above each section for stable id addressing.** Pretty headings *and* id-stable keying — the saver finds/rewrites sections by the marker, renders the `Step N` number from current order.