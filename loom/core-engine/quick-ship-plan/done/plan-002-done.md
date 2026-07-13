---
type: done
id: pl_01KXE8PZZNFMP3RMR8D5HD8HGT-done
title: Done — quick-ship-plan Plan
status: done
created: 2026-07-13
version: 1
tags: []
parent_id: pl_01KXE8PZZNFMP3RMR8D5HD8HGT
requires_load: []
---
# Done — quick-ship-plan Plan

Quick-shipped — recorded already-completed work:

1. Add an optional `title` param to loom_quick_ship (app QuickShipInput → createPlan title, and the MCP tool schema/passthrough) so quick-shipped plans get descriptive roadmap titles instead of the generic `{thread} Plan` default; extend tests/quick-ship.test.ts to assert the passed title and the fallback default.
