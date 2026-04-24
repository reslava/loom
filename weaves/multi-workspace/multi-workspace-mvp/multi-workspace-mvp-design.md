---
type: design
id: multi-workspace-mvp-design
title: "Minimal Multi-Loom Workspace Support (MVP)"
status: done
created: 2026-04-14
version: 2
tags: [loom, workspace, cli, mvp]
parent_id: null
child_ids: [multi-workspace-plan-001]
requires_load: []
target_release: "0.2.0"
actual_release: null
---

# Minimal Multi-Loom Workspace Support (MVP)

## Goal

Implement a **minimal, file-based global registry** for managing multiple independent Loom workspaces. This provides a safe "test loom" environment for CLI development without requiring the full VS Code integration planned for a later phase.

## Context

Developing the CLI directly on the `reslava-loom` source repository is risky. A separate test loom allows safe experimentation. The full multi-loom architecture was designed in `multi-workspace-design.md` (parent), but a full implementation is a larger deliverable. This document defines a **lean subset** that can be delivered immediately after `core-engine-plan-002` (Filesystem layer) and before `core-engine-plan-003` (CLI).

# CHAT

## Rafa:
I need a test loom before building the full CLI. Let's do a minimal version of multi-loom first.

## AI:
Agreed. We can implement a simple global registry and the `loom init` and `loom switch` commands. This gives you isolated workspaces without any VS Code UI changes.

### 1. Global Registry

A single YAML file at `~/.loom/config.yaml` tracks all known looms.

**Schema:**
```yaml
# ~/.loom/config.yaml
active_loom: "../looms/test"

looms:
  - name: "default"
    path: "../looms/default"
    created: "2026-04-14T10:00:00Z"
  - name: "test"
    path: "../looms/test"
    created: "2026-04-14T11:00:00Z"
```

**Rules:**
- Paths are relative to the config file's directory (`~/.loom/`).
- If the file doesn't exist, the CLI assumes a single implicit loom at the current working directory (mono‑loom mode).
- The CLI reads this file to determine the active loom root.
- Commands that operate on threads resolve paths relative to the active loom root.

#### 1.1 Active Loom Resolution Priority

The `getActiveLoomRoot()` function resolves the active loom using the following strict order:

1.  **Local Mono‑Loom (Priority):** Walk up the directory tree from the current working directory, searching for a `.loom/` directory. If found, that directory is the active loom root. **The global registry is completely ignored in this case.**

2.  **Global Multi‑Loom (Fallback):** If no local `.loom/` directory is found, read the global registry at `~/.loom/config.yaml`. If an `active_loom` is set and the path exists, that path is the active loom root.

3.  **Error:** If neither a local `.loom/` nor a valid global active loom is found, throw an error with remediation steps.

**Rationale:** This priority ensures that Loom behaves as a project‑local tool by default, aligning with developer expectations when working inside a Loom‑enabled repository. The global registry is used only when operating outside of any Loom project.

### 2. Commands

| Command | Description |
|---------|-------------|
| `loom init` | Create a new loom at `~/looms/default/`, initialize `.loom/` structure, register it, and set as active. |
| `loom setup <name>` | Create a named loom at `~/looms/<name>/`, register it, optionally switch to it. |
| `loom switch <name>` | Change the active loom in `~/.loom/config.yaml`. |
| `loom list` | Display all registered looms with their paths and active status. |
| `loom current` | Show the name and path of the currently active loom. |

**Example:**
```bash
# First-time setup
loom init

# Create a test loom
loom setup test

# Switch to it
loom switch test

# Weave a thread safely in the test loom
loom weave idea "Fake Feature"
```

### 3. Loom Directory Structure (Reinforced)

Each loom contains:
```
~/looms/<name>/
├── .loom/                # Local configuration and cache
│   ├── workflow.yml      # (optional, falls back to built‑in default)
│   ├── templates/
│   ├── prompts/
│   └── cache/
├── chats/
├── threads/
└── references/
```

### 4. Implementation Notes

- **Backward Compatibility:** If `~/.loom/config.yaml` is absent, the CLI treats the current working directory as the active loom (implicit mono‑loom mode).
- **No VS Code Changes:** The tree view continues to display only the currently open workspace. Multi‑loom grouping in the UI is deferred.
- **Error Handling:** If a registered loom path no longer exists, `loom list` shows it as `[missing]` and `loom switch` refuses to activate it.

### 5. Integration with Core Engine

The filesystem layer (`packages/fs`) will expose a function `getActiveLoomRoot()` that:

1. Checks for `~/.loom/config.yaml` and returns the resolved active loom path.
2. If not found, walks up from `process.cwd()` looking for a `.loom/` directory.
3. Falls back to `process.cwd()`.

This function is used by all file operations to resolve the correct base path.

## Decision

Implement the minimal multi‑loom registry as described. Insert this plan after `core-engine-plan-002` and before `core-engine-plan-003`. This provides a safe test environment for CLI development.

## Next Steps

- Create `threads/multi-workspace/plans/multi-workspace-plan-001.md`.
