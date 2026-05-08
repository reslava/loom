---
type: design
id: de_01KQYDFDDC911HGHRQGZV1ZSCA
title: Staleness Management
status: done
created: "2026-05-04T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: id_01KQYDFDDCKTVHTZZE0NTS504V
requires_load: []
---
# Staleness Management — Design

## Goal

Design the staleness detection, propagation, and notification mechanism so that when a parent doc changes, child docs are visibly flagged as stale and the user can refine them in order.

## Context

Loom already tracks `version` on every doc and `design_version` on plans. `loom_get_stale_plans` detects mismatches. `loom_get_stale_docs` detects stale children (parent updated after child). The infrastructure exists — this design is about making staleness proactive, visible, and actionable.

## Architecture

### Staleness chain

```
idea → design → plan
  │       │
  └───────┴──→ context summaries (ctx)
```

Chats are the **thinking surface** and do **not** auto-stale ideas. Chat activity may be a *hint* that an idea wants refining, but staleness is set only by an explicit `refine` or `generate` on the parent.

When a doc at any level is updated:
1. Its `version` increments.
2. All `child_ids` are marked stale (their `parent_version` is now behind).

### Detection rules

| Parent change | Children stale |
|--------------|----------------|
| Idea updated | Design |
| Design updated | Plans, Ctx |
| Plan updated | Done (if linked) |

### Refine propagation

When the user clicks *Refine* on a stale doc:
1. Load the doc + its current parent doc(s) + thread context.
2. AI rewrites the stale doc against the up-to-date parent.
3. Version bumps on the refined doc — its children go stale (cascade).

**Child-driven, not parent-driven.** Refining an idea doesn't silently rewrite the design. It marks the design stale. The user decides when to refine it.

### Visibility in tree

- Stale docs get a `⚠` icon in the tree view.
- `loom://summary` includes `staleDocs` count.
- `loom://diagnostics` lists which docs are stale and why.

### Resolved design questions

- **Should implementing a plan be blocked if its design is stale?** → Warn, not block (for now).
- **Should chat messages auto-stale an idea, or only on explicit refine?** → Explicit only. Chats are thinking surface.