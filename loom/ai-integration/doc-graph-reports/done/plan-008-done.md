---
type: done
id: pl_01KXE6RTJK0KRQA08Y28V0WPWE-done
title: Done — doc-graph-reports Plan
status: done
created: 2026-07-13
version: 1
tags: []
parent_id: pl_01KXE6RTJK0KRQA08Y28V0WPWE
requires_load: []
---
# Done — doc-graph-reports Plan

Quick-shipped — recorded already-completed work:

1. Always render the top-level cross-weave Reports tree node even with zero reports (dropped the crossWeaveReports.length>0 guard in treeProvider) so its inline Generate Report button is reachable in a fresh workspace — fixes the chicken-and-egg where the first report could never be created
2. Applied the same always-render empty-state fix to the global Refs node and the global Context node, each with a click-to-generate placeholder child wired to Create Reference / Refresh Ctx respectively; per-weave/thread ctx & refs subsections stay data-driven
3. Added a Generate Weave Report right-click action on weave nodes (new loom.generateWeaveReport command + ai@1 menu binding) reusing generateReportCommand, which pre-fills the weave filter from the weave node's slug
4. Rebuilt with build-all.sh and ran test-all.sh (23 passed, 0 failed); confirmed the new commands/placeholders are present in the built extension bundle
