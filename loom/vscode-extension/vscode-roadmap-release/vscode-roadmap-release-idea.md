---
type: idea
id: id_01KVADBMKVNECGWH8PMJP4TDHV
title: Surface release versions in the extension's roadmap history view
status: draft
created: 2026-06-17
version: 1
tags: []
parent_id: null
requires_load: []
---
# Surface release versions in the extension's roadmap history view

## What

Wire the new release data ([[roadmap-release-version-idea]]) into the VS Code extension's roadmap tree. `loom://roadmap` now carries `currentRelease` and `history[].release`, but the extension's history band ignores both.

## Why it matters

The CLI already shows current release + per-plan version + `--group-by-release`; the extension — the human surface — shows none of it. The roadmap history is the validated-useful view, so the release dimension should be first-class there.

## Spec (from Rafa)

The roadmap History band should:
- **Show the current release** (e.g. `current: v1.9.2`) somewhere prominent on the roadmap/history.
- **Show each shipped plan's release version** on its node.
- **Sort history by release version *or* by date** (date is the current behaviour).
- **Offer a group-by-release** view (buckets shipped plans under their `vX.Y.Z`).
- **Default** the history view to **grouped and sorted by release version** (newest release first).

## Sketch (for the plan to settle)

- Data is already present from `loom://roadmap` (`currentRelease`, `history[].release`) — no MCP/core change; this is extension-only.
- `createHistoryBand` gains a `release` grouping branch (versions descending via the core `compareVersions`/`maxVersion` util); `createShippedPlanNode` shows `[vX.Y.Z]`.
- Replace the boolean `groupByThread` with a history view mode (`date | thread | release`), persisted in view state, toggled by a toolbar command, defaulting to `release`.
- Surface `currentRelease` on the History band label (or a small header node).

## Non-goals

- No core/MCP changes — the read-model already exposes everything.
- Does not touch the weave-tree `release` grouping (already repointed to `plan.actual_release`).

## Success criteria

- History defaults to grouped-by-release, newest version first, with the current release shown.
- Each shipped plan shows its `vX.Y.Z`.
- A toolbar toggle switches history between date / thread / release views.
