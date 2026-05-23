---
type: plan
id: pl_01KREGDY1Q17GB3R40K975R1FH
title: Simple Chat Levels Implementation
status: done
created: "2026-05-12T00:00:00.000Z"
updated: "2026-05-14T00:00:00.000Z"
version: 2
design_version: 1
tags: []
parent_id: de_01KREGDKW50DT3ZS8HVBNRV8V2
requires_load: []
target_version: 0.1.0
---
# Simple Chat Levels Implementation

| | |
|---|---|
| **Created** | 2026-05-12 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Simplify VS Code extension chat levels: remove global and weave chats, keep only thread chats and refs/chats. Fix ESC cancel bug across all creation and promote commands.
---

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Fix ESC cancel bug in all promote and creation commands (promoteToIdea, promoteToDesign, promoteToPlan, weaveIdea) — guard every showInputBox call so undefined return exits early instead of falling through | — | — |
| ✅ | 2 | Update loom_create_chat MCP tool — add type: 'thread' | 'refs' parameter so the tool knows where to place the chat without inferring from context | — |
| ✅ | 3 | Update installWorkspace.ts — remove loom/Chats folder creation, add loom/refs/chats/ folder creation | — | — |
| ✅ | 4 | Update extension tree view and create-chat command — render and create chats only at thread level (loom/{weave}/{thread}/chats/), remove global and weave chat nodes | — | — |
| ✅ | 5 | Update extension Refs/Chats command — create chat at loom/refs/chats/ and wire promote to produce loom/refs/{id}-reference.md | — | — |
| ✅ | 6 | Update loom/refs/architecture-reference.md — document the simplified chat structure (thread chats + refs/chats only) | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
