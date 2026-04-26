---
type: design
id: multi-workspace-design
title: "Multi-Loom Workspaces & Thematic Vocabulary"
status: done
created: 2026-04-14
version: 1
tags: [loom, workspace, ux, vocabulary, architecture, vision]
parent_id: workflow-design-v2
child_ids: [multi-workspace-mvp-design]
requires_load: []
---

# Minimal Multi-Loom Workspace Support

## Goal

Implement a **minimal, file-based registry** for managing multiple independent Loom workspaces. This provides a safe "test loom" environment for CLI development without requiring the full VS Code integration planned for Phase 3.

## Context

Developing the CLI directly on the `reslava-loom` source repository is risky. A separate test loom allows safe experimentation. The multi-loom architecture was designed in `loom-multi-workspace-design.md` (parent), but a full implementation is a Phase 3 deliverable. This document defines a **lean subset** that can be delivered immediately after `core-engine-plan-002` (Filesystem layer).

# CHAT

## Rafa:
I need a test loom before building the full CLI. Let's do a minimal version of multi-loom first.

## AI:
Agreed. We can implement a simple global registry and the `loom setup` and `loom switch` commands. This gives you isolated workspaces without any VS Code UI changes.

### 1. Global Registry

A single YAML file at `~/.loom/config.yaml` tracks all known looms.

**Schema:**
```yaml
# ~/.loom/config.yaml
active_loom: "/Users/rafa/workspaces/test-loom"
looms:
  - path: "/Users/rafa/workspaces/reslava-loom"
    name: "default"
    created: "2026-04-14T10:00:00Z"
  - path: "/Users/rafa/workspaces/test-loom"
    name: "test"
    created: "2026-04-14T11:00:00Z"
```

**Rules:**
- If the file doesn't exist, the CLI assumes a single implicit loom at the current working directory (backward compatible).
- The CLI reads this file to determine the active loom path.
- Commands that operate on documents (`weave`, `status`, `validate`) resolve paths relative to the active loom root.

### 2. Commands

| Command | Description |
|---------|-------------|
| `loom setup <name>` | Create a new loom directory, initialize `.loom/`, and register it in `~/.loom/config.yaml`. Optionally set as active. |
| `loom switch <name>` | Change the active loom in `~/.loom/config.yaml`. |
| `loom list` | Display all registered looms with their paths and active status. |
| `loom current` | Show the name and path of the currently active loom. |

**Example:**
```bash
# Create a test loom
loom setup test --path ~/workspaces/test-loom

# Switch to it
loom switch test

# Weave a thread safely in the test loom
loom weave idea "Fake Feature"
```

### 3. Loom Directory Structure (Reinforced)

Each loom contains:
```
<loom-root>/
├── .loom/                # Local configuration and cache
│   ├── workflow.yml      # (optional, falls back to default)
│   ├── templates/
│   └── cache/
├── chats/
├── threads/              # Formerly "features"
└── references/
```

### 4. Implementation Notes

- **Backward Compatibility:** If `~/.loom/config.yaml` is absent, the CLI treats the current working directory as the active loom (implicit single-loom mode).
- **No VS Code Changes:** The tree view continues to display only the currently open workspace. Multi-loom grouping in the UI is deferred to Phase 3.
- **Error Handling:** If a registered loom path no longer exists, `loom list` shows it as `[missing]` and `loom switch` refuses to activate it.

### 5. Open Questions

- Should `loom setup` automatically run `loom switch`? **Yes**, with a `--no-switch` flag to opt out.
- Should we support `loom delete <name>`? **Defer to Phase 3.** Manual config file editing is acceptable for MVP.

## Decision

Implement the minimal multi-loom registry as described. Insert this plan after `core-engine-plan-002` and before `core-engine-plan-003` (CLI). This provides a safe test environment for CLI development.

## Next Steps

- Create `features/loom-multi-workspace/plans/loom-multi-workspace-plan-001.md`.