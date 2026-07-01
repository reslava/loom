---
type: idea
id: id_01KQYDFDDCKTVHTZZE0NTS504V
title: Staleness Management
status: done
created: "2026-05-04T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Staleness Management

## Problem

When a parent doc changes (idea refined, design updated), child docs go stale silently. Today the system detects staleness — `design_version` vs plan's `design_version` — but detection is passive. The user has to manually notice stale flags in the tree and click "Refine." There's no cascade: refining an idea doesn't automatically flag designs as stale; refining a design doesn't flag plans.

As the doc graph grows, staleness becomes the #1 source of context drift. AI working with stale context produces wrong designs and broken plans.

## Idea

A staleness management system where:

1. **Every doc update bumps version and marks children stale.** Writing to an idea makes its design stale; writing to a design makes its plans stale.
2. **The system proactively flags stale docs** in the tree/UI (stale icon, stale count in summary).
3. **Refine propagation:** when the user refines a doc, the system offers to also refine its stale children — not automatically, but as a suggestion.
4. **Child-driven refresh:** when refining a child doc (e.g., plan), the system loads the up-to-date parent (design) so the AI has current context.

## Why now

Loom already has version tracking and stale detection (`loom_get_stale_plans`). The infrastructure exists — this idea is about making it proactive instead of passive. It's the smallest step that turns staleness from "hidden drift" into "visible, actionable state."

## Open questions

- Cascade depth: should ctx summaries cascade automatically, or only on explicit refresh?
- How prominent should the stale flag be in the tree — icon only, or icon + count badge?

## Resolved (see design)

- Staleness **warns**, never blocks — user can always implement past a stale flag.
- Chats do **not** auto-stale ideas. Staleness is set only by explicit `refine` / `generate` on the parent.

## Next step

design