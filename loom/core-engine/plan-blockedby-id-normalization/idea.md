---
type: idea
id: id_01KVA8QBDJHGNRZQFNJ87PAYZ3
title: loom_create_plan should normalize blockedBy ordinals to step-id slugs
status: done
created: 2026-06-17
version: 1
tags: []
parent_id: null
requires_load: []
---
# loom_create_plan should normalize blockedBy ordinals to step-id slugs

## What

When `loom_create_plan` is called with `steps[].blockedBy` entries written as 1-based ordinals (e.g. `["1","2"]`), the tool stores them **verbatim** instead of resolving them to the target steps' stable id slugs. `loom_update_step` with the same slug values does resolve/keep them correctly — only the create path leaves raw ordinals behind.

## Why it matters

Step `blockedBy` is documented (and schema-commented) as referencing stable step **ids** precisely because ids "survive reordering" — that is the whole point of the slug identity. A positional ordinal does not: insert, remove, or reorder a step and `["1","2"]` silently points at the wrong steps (or an out-of-range slot). So a plan authored in a single `loom_create_plan` call is born with a fragile dependency graph, while the exact same graph authored via `loom_update_step` is durable. That inconsistency is a latent correctness bug, not a cosmetic one.

It surfaced live while authoring `roadmap-release-version-plan-001`: every `blockedBy` came back as ordinals and had to be re-written to slugs with ten follow-up `loom_update_step` calls — a round-trip that should not exist.

## Sketch (for design to settle)

- In the `loom_create_plan` step-construction path (app/core, wherever `PlanStep` records are built), apply the **same** ordinal→id normalization that the rest of the step tooling already understands: a numeric `blockedBy` entry maps to the id of the step at that 1-based position; a non-numeric entry is treated as an already-resolved step/plan id and passed through.
- Ordinals remain accepted on input (legacy-friendly), but are **persisted as ids** — so the stored frontmatter is always slug-based and reorder-safe.
- Reuse the existing resolver rather than writing a second one; if no shared helper exists, extract one so create and update share a single normalization.

## Success criteria

- `loom_create_plan` with `blockedBy: ["1","2"]` persists the corresponding step-id slugs, not the ordinals.
- A round-trip (create → `loom_list_plan_steps`) shows slug ids in `blockedBy`.
- Reordering a freshly-created plan's steps keeps the dependency edges pointing at the same logical steps.
- No second normalization codepath — create and update converge on one helper.

## Open questions for design

- Is there already a shared ordinal→id resolver (used by `loom_update_step` / `isStepBlocked`) to reuse, or does one need extracting?
- Should a numeric entry that is out of range (no step at that position) error at create time, or pass through unresolved? (Lean: error — it can only be a mistake.)
