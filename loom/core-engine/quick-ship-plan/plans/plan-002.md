---
type: plan
id: pl_01KXE8PZZNFMP3RMR8D5HD8HGT
title: "Quick-ship: descriptive plan title param"
status: done
created: 2026-07-13
updated: 2026-07-13
version: 1
design_version: 1
tags: []
parent_id: de_01KWJD3J9MB1XC6XE32QXWDWGA
requires_load: []
target_version: 0.1.0
actual_release: 1.24.0
steps:
  - id: add-an-optional-param-to-loom
    order: 1
    status: done
    description: Add an optional `title` param to loom_quick_ship (app QuickShipInput → createPlan title, and the MCP tool schema/passthrough) so quick-shipped plans get descriptive roadmap titles instead of the generic `{thread} Plan` default; extend tests/quick-ship.test.ts to assert the passed title and the fallback default.
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Quick-ship: descriptive plan title param

## Goal

Add an optional `title` param to loom_quick_ship (app QuickShipInput → createPlan title, and the MCP tool schema/passthrough) so quick-shipped plans get descriptive roadmap titles instead of the generic `{thread} Plan` default; extend tests/quick-ship.test.ts to assert the passed title and the fallback default.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add an optional `title` param to loom_quick_ship (app QuickShipInput → createPlan title, and the MCP tool schema/passthrough) so quick-shipped plans get descriptive roadmap titles instead of the generic `{thread} Plan` default; extend tests/quick-ship.test.ts to assert the passed title and the fallback default. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
