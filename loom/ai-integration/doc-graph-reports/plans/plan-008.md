---
type: plan
id: pl_01KXE6RTJK0KRQA08Y28V0WPWE
title: Always-render empty Reports/Refs/Context tree nodes + Generate Weave Report action
status: done
created: 2026-07-13
updated: 2026-07-13
version: 1
design_version: 2
tags: []
parent_id: de_01KXAV5RB06F8E13CC9VKC22WE
requires_load: []
target_version: 0.1.0
steps:
  - id: always-render-the-top-level-cross
    order: 1
    status: done
    description: Always render the top-level cross-weave Reports tree node even with zero reports (dropped the crossWeaveReports.length>0 guard in treeProvider) so its inline Generate Report button is reachable in a fresh workspace — fixes the chicken-and-egg where the first report could never be created
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: applied-the-same-always-render-empty
    order: 2
    status: done
    description: Applied the same always-render empty-state fix to the global Refs node and the global Context node, each with a click-to-generate placeholder child wired to Create Reference / Refresh Ctx respectively; per-weave/thread ctx & refs subsections stay data-driven
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: added-a-generate-weave-report-right
    order: 3
    status: done
    description: Added a Generate Weave Report right-click action on weave nodes (new loom.generateWeaveReport command + ai@1 menu binding) reusing generateReportCommand, which pre-fills the weave filter from the weave node's slug
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: rebuilt-with-build-all-sh-and
    order: 4
    status: done
    description: Rebuilt with build-all.sh and ran test-all.sh (23 passed, 0 failed); confirmed the new commands/placeholders are present in the built extension bundle
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Always-render empty Reports/Refs/Context tree nodes + Generate Weave Report action

## Goal

Quick-ship record of 4 completed changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Always render the top-level cross-weave Reports tree node even with zero reports (dropped the crossWeaveReports.length>0 guard in treeProvider) so its inline Generate Report button is reachable in a fresh workspace — fixes the chicken-and-egg where the first report could never be created | — | — | — |
| ✅ | 2 | Applied the same always-render empty-state fix to the global Refs node and the global Context node, each with a click-to-generate placeholder child wired to Create Reference / Refresh Ctx respectively; per-weave/thread ctx & refs subsections stay data-driven | — | — | — |
| ✅ | 3 | Added a Generate Weave Report right-click action on weave nodes (new loom.generateWeaveReport command + ai@1 menu binding) reusing generateReportCommand, which pre-fills the weave filter from the weave node's slug | — | — | — |
| ✅ | 4 | Rebuilt with build-all.sh and ran test-all.sh (23 passed, 0 failed); confirmed the new commands/placeholders are present in the built extension bundle | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
