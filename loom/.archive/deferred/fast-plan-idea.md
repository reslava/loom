---
type: idea
id: fast-plan-idea
title: "Fast Plan — Lightweight Plan Without Design"
status: deferred
created: 2026-04-16
version: 1
tags: [plan, lightweight, workflow, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Fast Plan — Lightweight Plan Without Design

## Problem
The current workflow requires every thread to have a `design.md` document before plans can be created. For small, well‑understood tasks (e.g., "fix typo in README", "add a simple utility function"), the design phase feels like unnecessary overhead. Users either skip Loom entirely for such tasks or create placeholder designs that add noise.

## Idea
Allow creation of a **standalone plan** that does not require a parent design. This "Fast Plan" would be a minimal thread containing only a `plan-*.md` file (and optional chats). The system would treat it as a valid thread with a simplified lifecycle.

**Key characteristics:**
- `parent_id: null` on the plan document.
- Thread folder contains only the plan file.
- `loom status` would show a phase like `fast-planning` or simply `planning`.
- `loom validate` would not require a design document for these threads.
- Can later be "promoted" to a full design‑backed plan if needed.

## Why Defer
- The current `app` layer refactor will make implementing this feature clean and isolated.
- The core thread model currently assumes a design exists; relaxing this requires careful changes to `loadThread`, `validate`, and derived state.
- Fast Plans are a nice‑to‑have, not a blocker for MVP.

## Open Questions
- Should Fast Plans be visually distinct in the VS Code tree view?
- Should we allow converting a Fast Plan into a regular plan (by attaching a design)?
- How should staleness detection work for Fast Plans (they have no `design_version`)?

## Next Step
Re‑evaluate after the `app` layer refactor is complete. Create `fast-plan-design.md` and a corresponding implementation plan.

**Status: Deferred for post‑MVP consideration.**