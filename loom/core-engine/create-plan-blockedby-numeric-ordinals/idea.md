---
type: idea
id: id_01KWJE0CZJG37MM3V1V3CH81GK
title: resolveBlockedByIds silently drops numeric ordinal blockedBy entries
status: draft
created: 2026-07-02
version: 1
tags: []
parent_id: null
requires_load: []
---
# resolveBlockedByIds silently drops numeric ordinal blockedBy entries

## What

`resolveBlockedByIds` (`packages/core/src/planUtils.ts`) should normalize a numeric ordinal `blockedBy` entry (e.g. `1`, `2`) to the target step's slug id — the same way it already normalizes the *string* forms `"1"` / `"Step 1"`. Today it silently discards numbers.

## The bug (observed while dogfooding)

Creating a plan via `loom_create_plan` with `steps[].blockedBy: [1]` (JSON numbers) produced steps with `blockedBy: []` — the edges vanished with no error. The `plan-blockedby-id-normalization` work made string ordinals resolve, but numeric ordinals fall through.

## Root cause

In `resolveBlockedByIds`, the per-entry coercion is:

```ts
const entry = typeof raw === 'string' ? raw.trim() : '';
if (entry === '') continue;   // <-- numeric entries hit this and are dropped
```

The ordinal→slug regex (`/^(?:Step\s+)?(\d+)$/i`) only ever runs on strings. A JSON number arriving from an MCP/tool caller is coerced to `''` and skipped by the empty-guard — a **silent** drop, not a thrown error. The declared parameter type is `string[]`, but the real callers (MCP tool JSON, hand-authored payloads) can and do pass numbers.

## Fix direction (for design to settle)

- Accept numbers at the normalization boundary: coerce `typeof raw === 'number'` to `String(raw)` *before* the empty-guard, so numeric ordinals flow through the existing ordinal regex and resolve identically to `"1"`.
- Treat `resolveBlockedByIds` as the single source of truth — fix it there, not per-call-site, so every path (create_plan, add_step, update_step, promote) benefits at once.
- Consider whether an out-of-band value (empty string, non-numeric junk) should keep silently dropping or should throw. Leaning: unknown/garbage entries should be a loud error, consistent with the existing invalid-ordinal throw — silent loss of a dependency edge is the actual harm here.

## Success criteria

- `loom_create_plan` (and the other step-authoring paths) resolve `blockedBy: [1]` identically to `["1"]` — to the target step's slug id.
- A regression test in the root `tests/` suite covers numeric-ordinal `blockedBy` on create_plan.
- No dependency edge is ever lost silently: an unresolvable entry throws rather than disappearing.

## Non-goals

- Not changing the on-disk `blockedBy` representation (always slug ids in frontmatter).
- Not a new tool — a fix inside the existing normalization primitive.

## Provenance

Found while authoring `loom/core-engine/quick-ship-plan/` plan-001 — see [[quick-ship-plan]]. Related prior work: [[plan-blockedby-id-normalization]].