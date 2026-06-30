---
type: idea
id: id_01KWCF3W7CMY1TT65SPC1R3NAB
title: Version & updated bump only on content edits
status: draft
created: 2026-06-30
version: 1
tags: []
parent_id: null
requires_load: []
---
# Version & updated bump only on content edits

## Problem

`loom_update_doc` (`packages/mcp/src/tools/updateDoc.ts:42`) bumps `version: doc.version + 1` **and** `updated: today()` on **every** update — including pure status transitions (mark `done`, finalize draft→active) and `requires_load`-only edits.

But staleness reads both signals as *"the spec changed, children must catch up"*:
- `version` — a plan is stale when `plan.design_version < design.version`.
- `updated` — the idea↔design date-drift axis compares `updated` timestamps.

So a **lifecycle** change masquerades as a **spec** change. Marking a parent design `done` bumps its `version` (→ child plans go stale) and its `updated` (→ trips the date-drift check). Observed live: marking `event-save-scope`'s design `done` moved it v3→v4 and made its plan stale; the same class recurred on fresh threads.

## Decision (A)

A **content edit** bumps `version` + `updated`. A **status-only** or **requires_load-only** update touches **neither**. `version` then means "spec revision" — exactly what staleness already assumes.

## Scope

- **`packages/mcp/src/tools/updateDoc.ts`** — only increment `version` / `updated` when `content` is provided (ideally only when it actually differs). The status-only / requires_load-only path preserves both.
- **Audit sibling write paths** for the same rule:
  - `finalize` (draft→active): no content change → no bump.
  - `closePlan` (`packages/app/src/closePlan.ts:71`): bumps version on done — a plan has no children so no cascade, but align for consistency.
  - `refinePlan` / `amendReq`: legitimately bump (genuine content/spec change) — leave as-is.
- **Test**: a status-only `update_doc` leaves `version` + `updated` unchanged; a content `update_doc` bumps both; marking a parent design `done` no longer makes its child plans stale.

## Relationship

Sibling to `align-stale-surfaces`: that unifies *how staleness is read* across surfaces; this fixes *how versions are written* so false staleness isn't generated at the source. Independent — either order.

## Non-goals

- A separate `spec_version` field distinct from `version` (rejected — new frontmatter field + migration + rewiring every comparison; overkill for a solo, event-sourced system).
