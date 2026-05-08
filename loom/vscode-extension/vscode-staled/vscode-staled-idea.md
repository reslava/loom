---
type: idea
id: id_01KR1PS5JDB6P8WC93CZKDGAM8
title: Stale doc detection and visualization in the VS Code tree
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Stale doc detection and visualization in the VS Code tree

## Problem

The tree shows a `⚠️ stale` badge on plan nodes but the detection is unreliable: it reads `plan.staled` (a frontmatter boolean flag) instead of computing `isPlanStale(plan, design)` from version numbers. These two can disagree — if a design is refined but the MCP tool doesn't set the flag, the plan silently misses the badge.

Beyond plans, the tree shows no stale indicator at all for idea or design nodes. `getStaleDocs` (MCP tool) detects stale ideas and designs via parent-update timestamp heuristic, but the result is never wired into the tree. The user has no way to see stale ideas or designs without manually running validate or calling the MCP tool directly.

The `LoomState.summary` block includes `stalePlans` and `blockedSteps` counts that are computed on every state load but never surfaced anywhere in the UI.

## Idea

Replace `plan.staled` flag checks in `createPlanNode` with inline `isPlanStale(plan, thread.design)` version math. Extend stale badge coverage to idea and design nodes by running the parent-update timestamp check during tree build (same logic as `getStaleDocs`). Optionally add a summary header node at the root showing stale and blocked counts from `LoomState.summary`.

## Why now

Staleness detection is already computed server-side on every state load — the data is there, just not reaching the UI. Every time a design is refined and plans silently go stale, the user loses trust in the badge. Fixing the reliability of existing badges is low-risk and high-value before adding new features.

## Open questions

- Should stale ideas/designs come from a separate `loom_get_stale_docs` MCP call on each tree refresh, or should we inline the timestamp logic into the tree builder using the state already in memory?
- What's the right visual for a summary node: root-level informational row, tooltip on the root, or status bar item?
- Should stale ideas/designs show a badge only when the parent was updated, or also when the doc's own `version` is behind a sibling?

## Next step

design
