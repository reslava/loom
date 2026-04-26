---
type: design
id: draft-threads-design
title: "Draft Threads — Unfinalized Ideas as Lightweight Threads"
status: draft
created: 2026-04-19
version: 1
tags: [thread, idea, domain-model, deferred]
parent_id: core-engine-design
child_ids: [draft-threads-plan-001]
requires_load: [core-engine-design]
---

# Draft Threads — Unfinalized Ideas as Lightweight Threads

## Goal

Extend the domain model to treat directories containing only an unfinalized idea as valid **draft threads**. This ensures ideas are visible in the CLI and VS Code tree view immediately after creation, providing a seamless "idea first" workflow.

## Context

Currently, `loadThread` requires a primary design to consider a directory a valid `Thread`. Unfinalized ideas (those with temporary IDs like `new-*-idea.md`) are invisible in the UI until the user runs `loom finalize` or creates a design. This breaks the mental model: the user wove an idea, but it doesn't appear under "Ideas" when grouping by type.

This design proposes treating idea‑only directories as **draft threads**, with `phase: 'ideating'` and `status: 'ACTIVE'`. The `Thread` entity is updated to make `design` optional, and validation rules are relaxed to allow zero primary designs when an idea exists.

## Proposed Changes

### 1. Domain Model (`core`)

- `Thread.design` becomes optional (`design?: DesignDoc`).
- `getThreadStatus` returns `'ACTIVE'` for draft threads.
- `getThreadPhase` returns `'ideating'` for draft threads.

### 2. Filesystem Layer (`fs`)

- `loadThread` detects directories with only an idea file and returns a valid `Thread` object with `design: undefined`.

### 3. Validation (`core`)

- `validateSinglePrimaryDesign` does not error when zero primary designs exist but an idea is present.

### 4. CLI & VS Code

- `loom status` shows draft threads with a `💡` indicator.
- Tree view naturally displays draft threads under "Threads" and in type groupings.

## Benefits

- Ideas appear immediately after `loom weave idea`.
- Grouping by type shows ideas under "Ideas".
- The workflow feels seamless: weave → see → finalize → design appears.
- The domain model accurately reflects the `ideating` phase.

## Open Questions

- Should draft threads have a distinct `ThreadStatus` (e.g., `'IDEATING'`) instead of `'ACTIVE'`?
- How should `loom validate` report draft threads? (They are valid, but may have warnings about missing design.)

## Decision

Adopt the draft thread model as described. Implementation is deferred until the core VS Code extension commands are complete.

## Next Steps

- Create `draft-threads-plan-001.md`.