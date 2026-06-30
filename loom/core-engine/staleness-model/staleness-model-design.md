---
type: design
id: de_01KWCR8E1NC37G0GW05A14X9C9
title: Trustworthy staleness — directional, version-based model
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: id_01KWCR77B6N0EKJR6S0XTMPP1S
requires_load: []
---
# Trustworthy staleness — directional, version-based model

## Design conversation

The model is settled (see the `align-stale-surfaces` chats and Rafa's sign-off): one directional, version-based rule along `idea → design → req → plan`, with `req` depending on `design` (design-first workflow). This design is the implementation architecture; the canonical spec is [staleness-reference](../../refs/staleness-reference.md) — keep them in lockstep.

## Implementation architecture

### 1. Version & `updated` bump only on a content edit

`packages/mcp/src/tools/updateDoc.ts` — increment `version` + set `updated: today()` **only** when `content` is provided (and differs from the current body). A status-only / `requires_load`-only update preserves both. Audit `packages/app/src/finalize.ts` (draft→active must not bump) and `packages/app/src/closePlan.ts:71` (a plan's own version shouldn't move on a pure status close). This is the prerequisite that makes version baselines meaningful.

### 2. `design` gets an `idea_version` baseline

- Add `idea_version?: number` to `DesignDoc` (`packages/core/src/entities/design.ts`).
- `weaveDesign` stamps it to the idea's **live** version via a `parentIdeaVersion(threadPath)` helper (mirror `parentDesignVersion`); `refineDesign` re-stamps it.
- Retire the date-based `design_behind_idea`.

### 3. Reverse `design ↔ req` (req depends on design)

- `createReq`: `parent_id` = the thread **design** when present (fallback idea, then null).
- Add `design_version?: number` to `ReqDoc`; `createReq` / `amendReq` stamp the design's live version.
- **Remove** `req_version` stamping from `weaveDesign` (design no longer depends on req).
- Drop idea & design from req-staleness — req-staleness now applies to **plans only** (handled in `staleEntries`); `getReqStaleDocs` is removed or narrowed to plans.

### 4. Rewrite `staleEntries` (`packages/core/src/derived.ts`)

Four directional version reasons, nothing else:

| reason | predicate |
|--------|-----------|
| `design_stale` | `design.idea_version < idea.version` |
| `req_stale` | `req.design_version < design.version` |
| `plan_design_stale` | `plan.design_version < design.version` |
| `plan_req_stale` | `plan.req_version < req.version` |

Delete `idea_behind_design`, `design_behind_idea`, and the multi-candidate `req_version` block. `StaleReasonKind` updated; `actionable` flag unchanged (done/cancelled/closed → false). `getStaleDocs` reason strings follow.

### 5. Backfill / migrate existing docs

Extend the migration toolkit (mirror `backfillDesignVersions`, `--dry-run`, idempotent): stamp `idea_version` on every design (= its idea's current version), `design_version` on every req (= its design's current version), and migrate each `req.parent_id` idea→design. One command, runnable here + downstream.

### 6. Tests + reference alignment

Rewrite `tests/stale-parity.test.ts` for the directional model; add assertions that **no upstream doc is ever flagged** (an idea is never stale) and a full **chain-reconciliation** test (edit idea → design→req→plans go stale in turn, each refine clears its own). Keep `staleness-reference.md` in sync.

## Decisions

- **Baseline naming** — `design.idea_version`, `req.design_version`, `plan.design_version`/`req_version`: uniform `<parent>_version`, matching the existing plan fields.
- **`updated` is part of (1)** — the date axis is gone, but `updated` still shouldn't move on status-only edits (it's a spec-change signal elsewhere and in `getStaleDocs` history ordering).
- **req remains optional** — plan keeps its direct `design_version` edge so req-less threads still detect design drift.

## Non-goals

- A separate `spec_version` field (rejected upstream — overkill).
- Re-deriving what counts as stale beyond the four edges above.
