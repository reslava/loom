---
type: plan
id: pl_01KRC1SPV7N6G1D6MW4JR04BDD
title: Install & extension post-install fixes
status: done
created: "2026-05-11T00:00:00.000Z"
updated: "2026-05-11T00:00:00.000Z"
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: a1-rename-installed-ctx-file-change
    order: 1
    status: done
    description: "A1 — Rename installed ctx file: change installWorkspace.ts to write ctx.md (not loom-ctx.md); make it a minimal project-agnostic template with no Loom-specific content"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: a2-fix
    order: 2
    status: done
    description: "A2 — Fix .mcp.json LOOM_ROOT path: resolve the real absolute workspace path at install time and write it in forward-slash format (j:/path/path)"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: a3-install-settings
    order: 3
    status: done
    description: "A3 — Install settings.json: add a write step in installWorkspace.ts to create .loom/settings.json with {\"user.name\": \"User:\", \"ai.model\": \"AI:\"}"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: b1-promote-from-chat-with-weave
    order: 4
    status: done
    description: "B1 — Promote from chat with weave/thread creation: from global chat prompt for weave (create if missing) then thread (create if missing); from weave chat prompt for thread only"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: b2-new-weave-always-available-add
    order: 5
    status: done
    description: "B2 — New Weave always available: add New Weave as a persistent right-click option and/or toolbar button so a fresh install has an entry point to create the first weave"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: b3-right-click-targets-clicked-node
    order: 6
    status: done
    description: "B3 — Right-click targets clicked node: fix right-click handler to use the node that was right-clicked, not the current tree selection"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: b4-weave-idea-title-fallback-if
    order: 7
    status: done
    description: "B4 — Weave Idea title fallback: if user leaves title empty, fall back to default {thread}-idea title instead of silently not creating the doc"
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Install & extension post-install fixes

| | |
|---|---|
| **Created** | 2026-05-11 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Fix issues found during first real install test in j:/temp_mvp: install output correctness (ctx filename, .mcp.json path, settings.json) and VS Code extension UX bugs (new weave entry point, right-click context, promote flow, Weave Idea title fallback).
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | A1 — Rename installed ctx file: change installWorkspace.ts to write ctx.md (not loom-ctx.md); make it a minimal project-agnostic template with no Loom-specific content | — | — | — |
| ✅ | 2 | A2 — Fix .mcp.json LOOM_ROOT path: resolve the real absolute workspace path at install time and write it in forward-slash format (j:/path/path) | — | — | — |
| ✅ | 3 | A3 — Install settings.json: add a write step in installWorkspace.ts to create .loom/settings.json with {"user.name": "User:", "ai.model": "AI:"} | — | — | — |
| ✅ | 4 | B1 — Promote from chat with weave/thread creation: from global chat prompt for weave (create if missing) then thread (create if missing); from weave chat prompt for thread only | — | — | — |
| ✅ | 5 | B2 — New Weave always available: add New Weave as a persistent right-click option and/or toolbar button so a fresh install has an entry point to create the first weave | — | — | — |
| ✅ | 6 | B3 — Right-click targets clicked node: fix right-click handler to use the node that was right-clicked, not the current tree selection | — | — | — |
| ✅ | 7 | B4 — Weave Idea title fallback: if user leaves title empty, fall back to default {thread}-idea title instead of silently not creating the doc | — | — | — |
---

### Step 1 — A1 — Rename installed ctx file: change installWorkspace.ts to write ctx.md (not loom-ctx.md); make it a minimal project-agnostic template with no Loom-specific content

<!-- Detailed spec. -->

---

### Step 2 — A2 — Fix .mcp.json LOOM_ROOT path: resolve the real absolute workspace path at install time and write it in forward-slash format (j:/path/path)

<!-- Detailed spec. -->

---

### Step 3 — A3 — Install settings.json: add a write step in installWorkspace.ts to create .loom/settings.json with {"user.name": "User:", "ai.model": "AI:"}

<!-- Detailed spec. -->

---

### Step 4 — B1 — Promote from chat with weave/thread creation: from global chat prompt for weave (create if missing) then thread (create if missing); from weave chat prompt for thread only

<!-- Detailed spec. -->

---

### Step 5 — B2 — New Weave always available: add New Weave as a persistent right-click option and/or toolbar button so a fresh install has an entry point to create the first weave

<!-- Detailed spec. -->

---

### Step 6 — B3 — Right-click targets clicked node: fix right-click handler to use the node that was right-clicked, not the current tree selection

<!-- Detailed spec. -->

---

### Step 7 — B4 — Weave Idea title fallback: if user leaves title empty, fall back to default {thread}-idea title instead of silently not creating the doc

<!-- Detailed spec. -->

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
