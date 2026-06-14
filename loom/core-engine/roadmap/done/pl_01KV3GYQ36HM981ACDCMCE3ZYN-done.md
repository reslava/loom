---
type: done
id: pl_01KV3GYQ36HM981ACDCMCE3ZYN-done
title: Done — Derived Roadmap — Extension Surface
status: done
created: "2026-06-14T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KV3GYQ36HM981ACDCMCE3ZYN
requires_load: []
---
# Done — Derived Roadmap — Extension Surface

## Step 1 — Add a Roadmap toolbar button (Enabled/Disabled) that toggles the roadmap view in the extension.

Added the Roadmap toolbar toggle.
- `view/viewState.ts`: new `roadmapEnabled: boolean` (default false) on `ViewState` (persisted via `ViewStateManager`).
- `extension.ts`: `loom.toggleRoadmap` / `loom.toggleRoadmapOff` commands (shared handler) flip the flag, set the `loom.roadmapEnabled` context key, update the view title, and refresh; context key seeded on activation.
- `package.json`: two `view/title` buttons (`$(map)` "Show Roadmap" when off / `$(list-tree)` "Show Threads" when on) gated on `loom.roadmapEnabled`; grouping + text-filter buttons hidden in roadmap mode.
- View title now reads "Roadmap" (rather than the status-filter label) when enabled.

## Step 2 — Render the roadmap panel: future (top), present (middle), history (bottom), with blocked-on annotations.

Rendered the roadmap panel as a TreeView re-layout (decision: option A, not a webview — Rafa 2026-06-14).
- `tree/treeProvider.ts`: when `roadmapEnabled`, `getRootChildren` reads `loom://roadmap` via the MCP client and returns three band sections instead of the weave tree — **Future** (`$(milestone)`), **Present** (`$(play-circle)`), **History** (`$(history)`).
- Future/Present nodes (`createRoadmapNode`): labelled `weave/thread`, status codicon, `pN` priority (hidden when default), and a `⛔ blocked on <weave/thread,…>` annotation resolved from `blockedOn` ULIDs — the cross-weave headline. Click opens the thread's design → idea → manifest (resolved from `loom://state`, which the tree already loads).
- A diagnostics row (`⚠️ N roadmap diagnostics`) surfaces cycle/dangling/missing-manifest findings with details in the tooltip.
- Pure renderer over the read-model — no derivation added. `lastRoadmap` is cached for the drag controller (Step 4).

## Step 3 — When Roadmap is enabled, the existing filter offers all / history / roadmap instead of the current status filter.

Folded the filter to roadmap bands.
- `view/viewState.ts`: new `RoadmapBand = 'all' | 'history' | 'roadmap'` and `roadmapBand` field (default 'all').
- `commands/filter.ts`: `setStatusFilter` now branches — in roadmap mode it shows a band picker (All = future+present+history, Roadmap = future+present, History = shipped only) writing `roadmapBand`; outside roadmap mode it behaves exactly as before. Per the chat note, no redundant "Active or Implementing" value: the Present band already subsumes it.
- `treeProvider.getRoadmapChildren` honours `roadmapBand` (renders only the selected bands).
- View title shows `Roadmap · <band>` when a non-`all` band is selected.

## Step 4 — Drag-to-reorder among independent threads writes soft priority via loom_set_priority; a drag violating a hard depends_on edge is refused.

Drag-to-reorder → soft priority.
- New `tree/roadmapDnd.ts` — `RoadmapDragAndDropController` (a `vscode.TreeDragAndDropController<TreeNode>`), registered on the `loom.threads` tree view in `extension.ts`.
- Drag a Future/Present node onto another in the **same band**; the controller rebuilds that band's order (source re-inserted before the drop target, or appended when dropped on the band header) and renumbers it with spaced priorities (×10), calling `loom_set_priority(threadUlid, priority)` only for nodes whose priority changed.
- **Hard-edge pre-check:** if the new order would place any node before an in-band `depends_on` target, the drop is refused with a warning — instant client feedback. The read-model's Kahn topo sort is the ultimate backstop (priority only orders the dependency-free slack; it can never override an edge), so a "bad" priority simply has no visible effect.
- Cross-band drops and nodes without a `th_` ULID are ignored; errors surface via a warning + refresh.

## Step 5 — When Roadmap is enabled, the History band can group shipped plans by thread via an opt-in toggle (default flat, newest-first), mirroring the CLI's `loom roadmap --group-by-thread`.

History group-by-thread toggle (the step added this session per Rafa's "include it").
- `view/viewState.ts`: `groupHistoryByThread: boolean` (default false).
- `extension.ts`: `loom.toggleGroupHistory` / `loom.toggleGroupHistoryOff` (shared handler) flip the flag, set `loom.groupHistoryByThread`, and refresh; context key seeded on activation.
- `package.json`: two `view/title` toggles visible **only** in roadmap mode (`$(list-flat)` "Group History by Thread" when flat / `$(list-tree)` "Flatten History" when grouped).
- `tree/treeProvider.createHistoryBand`: when on, shipped plans are grouped under their `weave/thread` heading (each group newest-first); when off, a flat newest-first list (`date · weave/thread`). Pure rendering over `loom://roadmap`'s `history` (each `ShippedPlan` carries `weaveId`/`threadId`) — mirrors `cli/src/commands/roadmap.ts`'s `--group-by-thread`, no read-model change.

**Plan-2 verification:** `build-all` clean, `tsc --noEmit` (vscode) clean, full `test-all` green (multi-loom + 17 MCP integration tests). UI behaviour itself needs a manual Reload-Window check in the extension host.
