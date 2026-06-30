---
type: idea
id: id_01KWCR77B6N0EKJR6S0XTMPP1S
title: Trustworthy staleness — directional, version-based model
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: null
requires_load: []
---
# Trustworthy staleness — directional, version-based model

## Problem

Staleness detection is Loom's core feature, and it was **untrustworthy** — to the point Rafa said he no longer trusts it. Three independent failures (diagnosed across the `align-stale-surfaces` chats):

1. **Computed three different ways** (getState summary, the VS Code tree, `getStaleDocs`) with divergent axes/direction/done-handling → surfaces disagreed. *(Fixed in `align-stale-surfaces`: one `staleEntries` predicate.)*
2. **Non-directional** — a bidirectional date check flagged the *idea* as stale when its *design* changed (`idea_behind_design`). Staleness must flow downstream only.
3. **Date-based + version-polluted** — staleness compared `updated` timestamps (fragile), and *status-only* updates (mark done / finalize) bumped `version`/`updated`, cascading false staleness to children.

Plus a structural error: `req.parent_id = idea`, and the code stamps `req_version` on the *design* — i.e. it treats the **design as depending on the req** (req-first). The real workflow is design-first: `chat → idea → design → req → plan → done`, so **req depends on design**.

## Goal

One rule, everywhere: **a child is stale when an upstream dependency's version moved past the child's stamped baseline** — `child.<parent>_version < parent.version`. Directional (downstream only), version-based (no dates). Canonical spec: [staleness-reference](../../refs/staleness-reference.md).

## Scope (this thread folds in the former `version-on-content-only`)

1. **Version-on-content-only** — `version` + `updated` bump only on a content edit; status-only / requires_load-only updates touch neither (`updateDoc`; audit `finalize` / `closePlan`).
2. **`design` gets an `idea_version` baseline** (stamped live from the idea); retire the date-based `design_behind_idea`.
3. **Reverse `design ↔ req`** — `req.parent_id` → design; `req` gets a `design_version` baseline; remove `req_version` from the design and drop idea/design from req-staleness (req-staleness ⇒ plans only).
4. **Rewrite `staleEntries`** to the four directional version reasons (`design_stale`, `req_stale`, `plan_design_stale`, `plan_req_stale`); delete `idea_behind_design` and all date drift.
5. **Backfill / migrate** — stamp `idea_version` on designs, `design_version` on reqs, and migrate `req.parent_id` idea→design on existing docs (mirrors the `design_version` backfill).
6. **Tests + reference alignment** — directional assertions (no upstream flags), the chain reconciliation, and parity.

## Success criteria

- `loom stale` and the extension agree **and** are trustworthy.
- No upstream-direction flags ever (an idea is never stale).
- Editing a design flags its req + plans — never its idea.
- Marking a doc done flags nothing.
- Every edge is the same rule: `child.<parent>_version < parent.version`.

## Supersedes

The `version-on-content-only` thread (its decision A is item 1 here). That thread is archived in favour of this one.
