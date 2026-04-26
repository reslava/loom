---
type: idea
id: meta-plan-idea
title: "Meta‑Plan — Roadmap, Epic, or Sprint"
status: deferred
created: 2026-04-16
version: 1
tags: [plan, roadmap, epic, sprint, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Meta‑Plan — Roadmap, Epic, or Sprint

## Problem
Loom currently models work at the thread level (one design → multiple plans). There is no built‑in way to group multiple threads into higher‑level constructs like epics, milestones, or sprints. Users who want to plan across multiple features must do so outside the system, losing the benefits of structured dependency tracking and staleness detection.

## Idea
Introduce a special type of plan—a **Meta‑Plan**—that contains a list of **child plans** (or child threads) instead of executable steps. This allows users to model:

- **Roadmaps:** A sequence of major features with ordering and blocking.
- **Epics:** A collection of related threads that together deliver a larger goal.
- **Sprints:** A time‑boxed list of work items.

**Proposed model:**
- A new document type: `meta-plan` (or `type: plan` with `role: meta`).
- Instead of `steps`, it has a `children` array of thread/plan IDs.
- It supports `blocked_by` relationships between children.
- The VS Code tree view could show nested threads under the meta‑plan.

## Why Defer
- This is a significant extension to the document model and link index.
- It's better to validate the core workflow with real users before adding higher‑level abstractions.
- The `app` layer refactor and Fast Plans will provide a cleaner foundation for this feature.

## Open Questions
- Should meta‑plans have their own statuses (e.g., `planned`, `in_progress`, `completed`)?
- How should progress roll up from child threads?
- Should meta‑plans be allowed to contain other meta‑plans (nested roadmaps)?
- Should they be stored in a separate directory (e.g., `roadmaps/`) or alongside threads?

## Next Step
Re‑evaluate after Fast Plans are implemented and real‑world usage patterns emerge. Create `meta-plan-design.md` and a corresponding implementation plan.

**Status: Deferred for post‑MVP consideration.**