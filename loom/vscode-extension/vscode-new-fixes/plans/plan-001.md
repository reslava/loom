---
type: plan
id: pl_01KR119TRV94QJF6FG6GM4BB08
title: VSCode tree ctx/reference nodes, context menus, and requires_load picker
status: done
created: 2026-05-07
updated: 2026-05-07
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 0.5.0
steps:
  - id: add-context-and-references-folder-nodes
    order: 1
    status: done
    description: Add Context and References folder nodes to the tree — thread level shows *-ctx.md docs under Context and loom/refs/* under References; weave level shows weave-ctx docs; workspace root shows loom/ctx.md under a top-level Context node. Update treeProvider.ts to build these nodes from MCP state.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-right-click-context-menus-on
    order: 2
    status: done
    description: Add right-click context menus on special folder nodes — Chats/weave-Chats/thread-Chats → Create Chat (remove toolbar weave-chat button); Context/weave-Context → Create Ctx; References → Create Reference. Wire new contextValue entries in treeProvider and menu contributions in package.json.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-loom-create-reference-mcp-tool
    order: 3
    status: done
    description: "Add loom_create_reference MCP tool — accepts title and description, creates loom/refs/{id}-reference.md with correct frontmatter (type: reference, title, description). No body generation; returns the new doc id."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-loom-generate-reference-mcp-tool
    order: 4
    status: done
    description: Add loom_generate_reference MCP tool — if sampling is available, reads weave ideas/designs/ctx docs relevant to the thread, then generates a structured reference body (prose + diagram if applicable) and writes it into the doc created by loom_create_reference. Falls back gracefully if sampling unavailable.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-loom
    order: 5
    status: done
    description: Add loom.addRequiresLoad command — right-click on any idea/design/plan node → Add References…; shows multi-select QuickPick listing all loom/refs/*.md docs (title + filename); on confirm calls loom_update_doc to merge selected ids into requires_load frontmatter array of the target doc.
    files_touched: []
    blocked_by: []
    satisfies: []
---
# VSCode tree ctx/reference nodes, context menus, and requires_load picker

| | |
|---|---|
| **Created** | 2026-05-07 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Extend the VS Code extension tree and commands to surface ctx and reference docs, add right-click context menus on special folder nodes (Chats, Context, References), implement reference creation (MCP-side create + generate), and add a requires_load multi-picker command.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add Context and References folder nodes to the tree — thread level shows *-ctx.md docs under Context and loom/refs/* under References; weave level shows weave-ctx docs; workspace root shows loom/ctx.md under a top-level Context node. Update treeProvider.ts to build these nodes from MCP state. | — | — | — |
| ✅ | 2 | Add right-click context menus on special folder nodes — Chats/weave-Chats/thread-Chats → Create Chat (remove toolbar weave-chat button); Context/weave-Context → Create Ctx; References → Create Reference. Wire new contextValue entries in treeProvider and menu contributions in package.json. | — | — | — |
| ✅ | 3 | Add loom_create_reference MCP tool — accepts title and description, creates loom/refs/{id}-reference.md with correct frontmatter (type: reference, title, description). No body generation; returns the new doc id. | — | — | — |
| ✅ | 4 | Add loom_generate_reference MCP tool — if sampling is available, reads weave ideas/designs/ctx docs relevant to the thread, then generates a structured reference body (prose + diagram if applicable) and writes it into the doc created by loom_create_reference. Falls back gracefully if sampling unavailable. | — | — | — |
| ✅ | 5 | Add loom.addRequiresLoad command — right-click on any idea/design/plan node → Add References…; shows multi-select QuickPick listing all loom/refs/*.md docs (title + filename); on confirm calls loom_update_doc to merge selected ids into requires_load frontmatter array of the target doc. | — | — | — |
---

<!-- step:add-context-and-references-folder-nodes -->
### Step 1 — Add Context and References folder nodes to the tree — thread level shows *-ctx.md docs under Context and loom/refs/* under References; weave level shows weave-ctx docs; workspace root shows loom/ctx.md under a top-level Context node. Update treeProvider.ts to build these nodes from MCP state.

<!-- Detailed spec. -->

---

<!-- step:add-right-click-context-menus-on -->
### Step 2 — Add right-click context menus on special folder nodes — Chats/weave-Chats/thread-Chats → Create Chat (remove toolbar weave-chat button); Context/weave-Context → Create Ctx; References → Create Reference. Wire new contextValue entries in treeProvider and menu contributions in package.json.

<!-- Detailed spec. -->

---

<!-- step:add-loom-create-reference-mcp-tool -->
### Step 3 — Add loom_create_reference MCP tool — accepts title and description, creates loom/refs/{id}-reference.md with correct frontmatter (type: reference, title, description). No body generation; returns the new doc id.

<!-- Detailed spec. -->

---

<!-- step:add-loom-generate-reference-mcp-tool -->
### Step 4 — Add loom_generate_reference MCP tool — if sampling is available, reads weave ideas/designs/ctx docs relevant to the thread, then generates a structured reference body (prose + diagram if applicable) and writes it into the doc created by loom_create_reference. Falls back gracefully if sampling unavailable.

<!-- Detailed spec. -->

---

<!-- step:add-loom -->
### Step 5 — Add loom.addRequiresLoad command — right-click on any idea/design/plan node → Add References…; shows multi-select QuickPick listing all loom/refs/*.md docs (title + filename); on confirm calls loom_update_doc to merge selected ids into requires_load frontmatter array of the target doc.

<!-- Detailed spec. -->

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
