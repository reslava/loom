---
type: done
id: pl_01KVADCEW02VQ3F899TG0Z1N5V-done
title: Done — Surface release versions in the extension roadmap history
status: done
created: 2026-06-17
version: 4
tags: []
parent_id: pl_01KVADCEW02VQ3F899TG0Z1N5V
requires_load: []
---
# Done — Surface release versions in the extension roadmap history

## Step 1 — Render the current release on the History band label (e.g. `History (N) · current v1.9.2`) from `roadmap.currentRelease`, and add a `[vX.Y.Z]` tag to each shipped-plan node's description in `createShippedPlanNode`.

`treeProvider.ts`: History band label now shows `current vX.Y.Z` (from `roadmap.currentRelease`) or `no release recorded` in its description. `createShippedPlanNode` gained a `showRelease` param and renders the release as `vX.Y.Z` / `unversioned` in the node description (and tooltip). Call site passes `roadmap.currentRelease` into `createHistoryBand`. Data was already on `loom://roadmap` — no MCP/core change.

## Step 2 — Replace the boolean `groupByThread` history toggle with a history view mode (`date | thread | release`) in view state; add a `release` grouping branch in `createHistoryBand` that buckets shipped plans under their version, versions descending via core `compareVersions`. Default the mode to `release`.

`viewState.ts`: replaced the boolean `groupHistoryByThread` with `historyGrouping: 'date' | 'thread' | 'release'` (new `HistoryGrouping` type), default **`release`**. `treeProvider.ts` `createHistoryBand` now branches on the mode: `release` buckets shipped plans by version, newest first via core `compareVersions` (unversioned bucket last, `tag` icon); `thread` keeps the existing thread grouping; `date` is the flat newest-first list. Imported `compareVersions` from core.

## Step 3 — Add a toolbar command to cycle/select the history view mode (date/thread/release) and register it (command + menu contribution) in package.json; wire it to the view-state setter.

`commands/grouping.ts`: added `showHistoryGroupingSelector` — a QuickPick (Release / Thread / Date) mirroring the existing weave-grouping selector; sets `historyGrouping` + refreshes. `extension.ts`: replaced the two boolean toggle commands (`toggleGroupHistory`/`Off`) with one `loom.selectHistoryGrouping`, and the `loom.groupHistoryByThread` context with `loom.historyGrouping` (string). `package.json`: collapsed the two toggle commands + two `when`-gated menu items into a single `loom.selectHistoryGrouping` command (`$(tag)` icon) + one menu entry shown when roadmap is enabled. Confirmed no dangling refs to the old symbols.

## Step 4 — `./scripts/build-all.sh`, Reload Window, and manually verify: history defaults to grouped-by-release newest-first, current release shown, each plan tagged, toggle switches date/thread/release.

`./scripts/build-all.sh` green (all packages incl. vscode compile clean). The visual verification — Reload Window, confirm History defaults to grouped-by-release newest-first with the current release shown, each plan tagged, and the `$(tag)` toolbar button switches release/thread/date — requires the extension host and is Rafa's to perform (I can't drive the IDE). Step left open pending that manual check.
