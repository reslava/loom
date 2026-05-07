---
type: idea
id: id_01KQYDFDDE7A0KBG4RQB3SZK4D
title: Thread Status Filter
status: done
created: "2026-04-23T00:00:00.000Z"
updated: "2026-05-06T00:00:00.000Z"
version: 2
tags: [vscode, filter, thread, status, ux]
parent_id: null
requires_load: []
---

# Thread Status Filter

## Problem

Once Phase 4 lands, a weave can have many threads — some active, some implementing, some done. The tree view will show all threads by default, which becomes noisy as completed threads accumulate.

## Idea

Extend the existing `statusFilter` in `ViewState` to apply at the **Thread** level (not just plan/doc level). Add filter presets to the toolbar:

| Preset | statuses shown |
| :--- | :--- |
| Active | `active` |
| Implementing | `implementing` |
| Active + Implementing *(default)* | `active`, `implementing` |
| Done | `done` |
| All | *(no filter)* |

Thread status is derived (same priority logic as `getWeaveStatus` today, scoped to one thread's plans). A thread with all plans closed → `done`. A thread with an implementing plan → `implementing`. Otherwise `active`.

## Benefits

- Done threads disappear from the default view without any file movement.
- Archive (`_archive/`) stays reserved for permanently cancelled/irrelevant threads — not routine completion.
- Filter is reversible: toggle to "All" or "Done" to review history.
- Pairs naturally with the group-by-status grouping mode already in the tree provider.

## Out of Scope

- Moving thread folders on completion — not needed with filters.
- Persisting filter selection across sessions — nice to have, not essential (use `defaultViewState`).
