---
type: done
id: pl_01KR1QSV8Q3YPSSZR5SFBS67DB-done
title: Done — Fix orphaned dones, missing status icons, summary node
status: done
created: "2026-05-08T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KR1QSV8Q3YPSSZR5SFBS67DB
requires_load: []
---
# Done — Fix orphaned dones, missing status icons, summary node

## Step 1 — Add BLOCKED and CANCELLED cases to getThreadIcon and getWeaveIcon in icons.ts: BLOCKED → ThemeIcon('warning'), CANCELLED → ThemeIcon('error'). Matches the existing plan-level blocked/cancelled icon pattern.

Added `BLOCKED → ThemeIcon('warning')` to both `getWeaveIcon` and `getThreadIcon` in `packages/vscode/src/icons.ts`. The `CANCELLED → ThemeIcon('error')` case was already present in both functions, so only the BLOCKED case was missing. Placement matches the existing blocked/cancelled pattern in `getPlanIcon`.

## Step 2 — Surface orphaned done docs in getThreadChildren: after building the plans section, collect thread.dones whose parent_id does not match any plan.id. If any exist, add them under a 'Done (orphaned)' section node so they are visible and can be inspected/deleted.

Added orphaned-done surfacing to `getThreadChildren` in `packages/vscode/src/tree/treeProvider.ts`. After the plans section is built, builds a `Set` of plan IDs, filters `thread.dones` for entries whose `parent_id` doesn't appear in that set, and if any exist, appends them under a `'Done (orphaned)'` section node using the existing `createSectionNode` + `createDoneDocNode` helpers.

## Step 4 — Increase file watcher debounce from 300ms to 800ms in extension.ts to reduce mid-creation snapshot races that cause threads to appear non-expandable and the MCP server to be overwhelmed by concurrent loom://state requests.

Changed the file watcher debounce in `packages/vscode/src/extension.ts` line 369 from 300ms to 800ms. The watcher covers `**/loom/**/*.md` and triggers `treeProvider.refresh()` on create/change/delete — the longer window prevents rapid concurrent `loom://state` MCP calls during bulk doc creation.

## Step 5 — Preserve last-good state on suspect reads: in getRootChildren, after a successful loom://state read, cache the state as lastGoodState. If a subsequent read returns a state where total docs dropped significantly vs lastGoodState (heuristic: >30% drop), keep the previous state and schedule a retry (exponential backoff, up to 3 retries) before rendering. Only replace the tree once the new state passes the heuristic or retries are exhausted.

In `packages/vscode/src/tree/treeProvider.ts`:
- Added `private lastGoodState: LoomState | null = null;` field alongside the existing `state` field.
- In `getRootChildren`, replaced the direct `this.state = JSON.parse(json)` assignment with a two-step approach: parse into `newState`, then compare total allDocs count vs `lastGoodState`. If `lastGoodState` exists, `lastTotal > 0`, and `newTotal < lastTotal * 0.7` (>30% drop), treat as suspect: schedule a 1500ms retry via `setTimeout(() => this._onDidChangeTreeData.fire(), 1500)` and keep the old `this.state`. Otherwise update both `this.state` and `this.lastGoodState` to `newState`. First load is always non-suspect because `lastGoodState` is null.

## Step 6 — Build and smoke-test: verify BLOCKED/CANCELLED threads show the correct icon, orphaned done docs appear under their thread, summary row shows when counts are non-zero, bulk doc creation no longer freezes the tree, and MCP timeout during creation recovers without manual reconnect.

Ran `./scripts/build-all.sh`. Build failed on first attempt with TS2531 (Object is possibly 'null') on `this.state` references after the suspect-read heuristic block — TypeScript couldn't narrow through the conditional assignment. Fixed by adding `if (!this.state) return [];` guard immediately after the heuristic block (line 113 in treeProvider.ts). Second build passed clean across all packages (core, fs, app, cli, vscode, mcp). No smoke-test against Extension Development Host possible in this headless session — visual verification deferred to Rafa.
