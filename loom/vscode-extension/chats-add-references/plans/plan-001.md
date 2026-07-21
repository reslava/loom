---
type: plan
id: pl_01KY1KM335CXG2XJ8541G126XE
title: Wire "Add References…" menu to chat docs
status: done
created: 2026-07-21
updated: 2026-07-21
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: added-to-the-menu-regex-in
    order: 1
    status: done
    description: Added `chat` to the `loom.addRequiresLoad` menu `when` regex in packages/vscode/package.json (`/^(idea|design|plan|chat)/`), exposing the "Add References…" right-click item on chat docs; the command handler was already doc-type-agnostic and chats carry requires_load which the context pipeline resolves. Updated the addRequiresLoad.ts empty-selection error message to include chat. Built all packages and ran the full test suite (23 passed).
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Wire "Add References…" menu to chat docs

## Goal

Added `chat` to the `loom.addRequiresLoad` menu `when` regex in packages/vscode/package.json (`/^(idea|design|plan|chat)/`), exposing the "Add References…" right-click item on chat docs; the command handler was already doc-type-agnostic and chats carry requires_load which the context pipeline resolves. Updated the addRequiresLoad.ts empty-selection error message to include chat. Built all packages and ran the full test suite (23 passed).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Added `chat` to the `loom.addRequiresLoad` menu `when` regex in packages/vscode/package.json (`/^(idea\|design\|plan\|chat)/`), exposing the "Add References…" right-click item on chat docs; the command handler was already doc-type-agnostic and chats carry requires_load which the context pipeline resolves. Updated the addRequiresLoad.ts empty-selection error message to include chat. Built all packages and ran the full test suite (23 passed). | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
