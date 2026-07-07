---
type: chat
id: ch_01KWWSGN8XRDQ9VWRTPMRDX9EV
title: "Recurrence: unknown string blockedBy stored as dangling edge"
status: active
created: 2026-07-06
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 1
---
# Recurrence: unknown string blockedBy stored as dangling edge

## Rafa:

## AI:

Filing a **recurrence** of the silent-dangling-`blockedBy` class, found while dogfooding `loom_create_plan` in `vscode-extension/reduce-onboarding-friction` (plan-001). Second time this bites — noting it here because this thread owns `blockedBy` normalization and [[create-plan-blockedby-numeric-ordinals]] already shipped a partial fix.

## What happened

Created a 9-step plan and passed intra-plan deps as `blockedBy: ["s1"]`, `["s2"]`, `["s5"]`, `["s8"]` in the same `loom_create_plan` call — an (incorrect) guess that steps were addressed by `s{ordinal}`. Actual step ids are **kebab slugs** derived from the title (`spawn-prototype-gate`, `bundle-mcp-server-into-vsix`, …). Result: every one of those entries was **stored verbatim as a dangling reference** — no error, no drop, just a broken edge that renders literally in the Blocked-by column. The step-1 gate silently did not hold. I only caught it by reading the plan back and repaired all 9 with `loom_update_step`.

## Why the prior fix didn't catch it

The [[create-plan-blockedby-numeric-ordinals]] work made `resolveBlockedByIds` (`packages/core/src/planUtils.ts`):
- resolve numeric/string ordinals (`1`, `"1"`, `"Step 1"`) to slugs, and
- **throw on malformed non-string/non-integer entries.**

But `"s1"` is a *well-formed string that is not an ordinal*. It doesn't match the ordinal regex `/^(?:Step\s+)?(\d+)$/i`, and it isn't a wrong *type*, so it falls into the "assume it's already a slug id" pass-through — and that pass-through **never validates the string against the plan's actual step ids**. Unknown-but-well-formed slugs are accepted and persisted as dangling edges.

## Root cause (one sentence)

`resolveBlockedByIds` validates *type* and resolves *ordinals*, but does not validate that a resolved/pass-through **slug actually matches an existing step id (or referenced plan id)** — so any unknown string survives as a silent dangling `blockedBy`.

## Fix direction

- After ordinal resolution, **validate every remaining `blockedBy` string against the set of the plan's step ids + any referenced `pl_`/plan ids**; throw on unknown, consistent with this thread's stated principle *"No dependency edge is ever lost silently."*
- Keep the fix in the single `resolveBlockedByIds` primitive so `create_plan` / `add_step` / `update_step` / `promote` all benefit.
- Regression test: `create_plan` with a bogus `blockedBy: ["s1"]` **throws** (today it silently stores it).

## Secondary UX note

Intra-plan `blockedBy` in the *create* call is inherently awkward because the caller can't know the generated slugs yet. Worth considering letting `create_plan` accept sibling refs by **step index** (1-based, resolved after id generation), so a one-shot plan with dependencies doesn't require a create-then-`update_step` repair pass. Cross-plan `pl_` ULID refs already work in-create.