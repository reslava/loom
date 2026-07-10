---
type: reference
id: rf_01KWCR6TQVMBM47SZAACPZFPJ7
title: loom — Staleness Model
status: active
created: 2026-06-30
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
slug: staleness
description: "Canonical Loom staleness model: the dependency graph, version-based baselines, the single directional rule, and which operations create vs clear staleness."
---
# loom — Staleness Model

The canonical spec for how Loom decides a doc is **stale**. One rule, applied along the doc dependency graph. This doc is the source of truth; `staleEntries` (core) implements it and every surface (the `loom stale` CLI, `loom_get_stale_docs`, the VS Code tree) consumes that one predicate.

## The one rule

> **A doc is stale when an upstream dependency it was built against has been revised since.**
> Concretely: `child.<parent>_version < parent.version`.

Two invariants follow:

- **Directional — downstream only.** Staleness flows parent → child. A parent is **never** stale because a child changed. (You don't revise the idea because its design evolved.)
- **Version-based, not date-based.** Every edge compares a *stamped baseline version* on the child against the parent's current `version`. No `updated`-timestamp comparisons — those are fragile (any touch moves them) and non-directional.

## The dependency graph

```
idea ──▶ design ──▶ req ──▶ plan ──▶ done
            └──────────────▶ plan
```

- **design** depends on **idea**
- **req** depends on **design** (req crystallizes scope from a complete design — req is authored *after* the design)
- **plan** depends on **design** AND **req** (a plan implements the design and honours the req scope)
- **done** records a plan — terminal, never actionable-stale

`req` is **optional**: a thread may have no req. That is why `plan` keeps a *direct* edge to `design` (a req-less thread's plan must still go stale when its design moves).

## Baselines (each child stamps its parent's version at write/refine time)

| Child | Parent | Baseline field on child | Stale when |
|-------|--------|-------------------------|------------|
| design | idea | `idea_version` | `design.idea_version < idea.version` |
| req | design | `design_version` | `req.design_version < design.version` |
| plan | design | `design_version` | `plan.design_version < design.version` |
| plan | req | `req_version` | `plan.req_version < req.version` |

A baseline is stamped to the parent's **live** version when the child is created or refined, and **fallback** is the floor (`1`) only when the parent does not yet exist.

## Reasons (the only stale signals)

| Reason | Edge | Meaning |
|--------|------|---------|
| `design_stale` | design ← idea | the idea was revised after the design |
| `req_stale` | req ← design | the design was revised after the req |
| `plan_design_stale` | plan ← design | the design was revised after the plan |
| `plan_req_stale` | plan ← req | the req was revised after the plan |

There is **no** reason that flags an idea, and none that flags a doc because something *downstream* of it changed. If you find yourself wanting one, the model is being violated.

## Actionable vs historical

Every stale hit carries an `actionable` flag: **false** when the flagged doc is `done`/`cancelled` (a design also when `closed`) — finished work that needs no action. Surfaces default to the **actionable** view:

- VS Code tree badge + Stale filter → actionable only.
- `loom stale` → actionable only; `loom stale --all` → include historical.
- `loom_get_stale_docs` → actionable; `all: true` → include historical.

Because all surfaces read the one `staleEntries` predicate, they can never disagree.

## State transitions — who creates and who clears staleness

Staleness is created by a parent's **version** advancing, and cleared by the child **re-stamping** its baseline (which happens on refine).

| Operation | Effect | Creates staleness | Clears staleness |
|-----------|--------|-------------------|------------------|
| edit idea content | `idea.version++` | design (and transitively req, plans) | — |
| refine design | `design.version++`, re-stamp `idea_version` | req, plans | the design's own (`design_stale`) |
| amend req | `req.version++`, re-stamp `design_version` | plans | the req's own (`req_stale`) |
| refine plan | re-stamp `design_version` + `req_version` | — | the plan's own (both) |
| **set status (mark done / activate, status only)** | **no version/`updated` change** | nothing | — |

The chain reconciles in order: *edit idea → design stale → refine design → req stale → refine req → plans stale → refine plans.* Each hop is explicit.

### version & `updated` change ONLY on a content edit

A status transition via set-status (mark done, activate draft→active) or a `requires_load`-only edit is **lifecycle**, not a spec change — it must **not** bump `version` or `updated`. Otherwise a finished parent would cascade false staleness to its children. `version` means "spec revision."

## Anti-patterns (explicitly rejected)

- ❌ **Upstream staleness** — flagging an idea because its design changed (`idea_behind_design`). Backwards; removed.
- ❌ **Date-based drift** — comparing `idea.updated` vs `design.updated`. Fragile and non-directional; replaced by `idea_version`.
- ❌ **Reverse design↔req** — treating the design as depending on the req (stamping `req_version` on the design). The design is upstream of the req; removed.
- ❌ **Status bumps version** — marking a doc done invalidating its children. Removed.
