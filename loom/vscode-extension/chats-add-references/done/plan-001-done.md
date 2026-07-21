---
type: done
id: pl_01KY1KM335CXG2XJ8541G126XE-done
title: Done — Wire "Add References…" menu to chat docs
status: done
created: 2026-07-21
version: 1
tags: []
parent_id: pl_01KY1KM335CXG2XJ8541G126XE
requires_load: []
---
# Done — Wire "Add References…" menu to chat docs

Quick-shipped — recorded already-completed work:

1. Added `chat` to the `loom.addRequiresLoad` menu `when` regex in packages/vscode/package.json (`/^(idea|design|plan|chat)/`), exposing the "Add References…" right-click item on chat docs; the command handler was already doc-type-agnostic and chats carry requires_load which the context pipeline resolves. Updated the addRequiresLoad.ts empty-selection error message to include chat. Built all packages and ran the full test suite (23 passed).
