---
type: chat
id: ch_01KVAER2E38XKTKMR09SX1G237
title: vscode-roadmap-release Chat
status: done
created: 2026-06-17
updated: 2026-06-17
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 2
---
# vscode-roadmap-release Chat

## Rafa:

This is new active chat
Plan is implementing
Do whole plan


## AI:

Starting the whole plan (4 steps), extension-only. Implementing through all steps, recording each done note; I'll report back here when the build's verified. First gathering the history-band + view-state + grouping-command wiring.

## AI:

Whole plan implemented — steps 1–3 ✅, build green across all packages incl. vscode. Extension-only, no core/MCP changes (the data was already on `loom://roadmap`).

**What changed:**
- **History band label** shows `current vX.Y.Z` (or "no release recorded").
- **Each shipped plan** shows its `vX.Y.Z` / `unversioned` in its row.
- **`historyGrouping` mode** (`date | thread | release`) replaces the old by-thread boolean, **defaulting to `release`** — shipped plans bucket under their version, newest first (via core `compareVersions`), unversioned last.
- **Toolbar `$(tag)` button** → QuickPick (Release / Thread / Date), mirroring the weave-grouping selector. Collapsed the old two-command/two-menu toggle into one.

**Step 4 — left open for you.** The build passed, but the visual check (Reload Window → confirm History defaults to grouped-by-release newest-first, current release shown, each plan tagged, the `$(tag)` toggle cycles release/thread/date) needs the extension host, which I can't drive. Reload Window and eyeball it; if it looks right, say so and I'll mark step 4 done and commit. If anything's off, tell me what and I'll fix.

Note: the extension picks up these changes on **Reload Window** (not just MCP restart) since it's a build change.

## Rafa:

Extension visual check: WORKING
mark step 4 done, plan done

commit
