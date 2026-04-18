Excellent, Rafa. Path B it is. We'll weave the safety net first. 🧵

Here is the design document and the corresponding implementation plan for the minimal multi-loom support, designed to fit neatly into our existing roadmap.

---

### 📄 1. Design Document: `features/loom-multi-workspace/loom-multi-workspace-design.md`

```markdown
---
type: design
id: loom-multi-workspace-design
title: "Minimal Multi-Loom Workspace Support"
status: active
created: 2026-04-14
version: 1
tags: [loom, workspace, cli, configuration]
parent_id: workflow-design-v2
child_ids: [loom-multi-workspace-plan-001]
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
```

---

### 📄 2. Implementation Plan: `features/loom-multi-workspace/plans/loom-multi-workspace-plan-001.md`

```markdown
---
type: plan
id: loom-multi-workspace-plan-001
title: "Implement Minimal Multi-Loom Workspace Support"
status: draft
created: 2026-04-14
version: 1
design_version: 1
tags: [loom, workspace, cli]
parent_id: loom-multi-workspace-design
target_version: 0.2.0
requires_load: [loom-multi-workspace-design]
---

# Feature — Implement Minimal Multi-Loom Workspace Support

| | |
|---|---|
| **Created** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `loom-multi-workspace-design.md` |
| **Target version** | 0.2.0 |

---

# Goal

Implement a minimal global registry for Loom workspaces, enabling the `loom setup`, `loom switch`, `loom list`, and `loom current` commands. This provides a safe "test loom" environment for CLI development.

---

# Steps

| # | Done | Step | Files touched |
|---|---|---|---|
| 1 | — | Create `ConfigRegistry` class to read/write `~/.loom/config.yaml` | `packages/core/src/registry.ts` |
| 2 | — | Implement `loom setup <name>` command | `packages/cli/src/commands/setup.ts` |
| 3 | — | Implement `loom switch <name>` command | `packages/cli/src/commands/switch.ts` |
| 4 | — | Implement `loom list` command | `packages/cli/src/commands/list.ts` |
| 5 | — | Implement `loom current` command | `packages/cli/src/commands/current.ts` |
| 6 | — | Update all filesystem operations to resolve paths from active loom root | `packages/fs/*` |
| 7 | — | Add backward-compatible single-loom mode | `packages/cli/src/index.ts` |

---

## Step 1 — Create `ConfigRegistry` class

**File:** `packages/core/src/registry.ts`

**Responsibilities:**
- Locate `~/.loom/config.yaml` (using `os.homedir()`).
- If missing, return a default registry with `active_loom: null` and empty `looms` array.
- Provide methods:
  - `getActiveLoom(): string | null`
  - `setActiveLoom(path: string): void`
  - `addLoom(name: string, path: string): void`
  - `listLooms(): LoomEntry[]`
  - `save(): void`

**Data structures:**
```typescript
interface LoomEntry {
  name: string;
  path: string;
  created: string; // ISO timestamp
}

interface LoomRegistry {
  active_loom: string | null;
  looms: LoomEntry[];
}
```

---

## Step 2 — Implement `loom setup <name>`

**File:** `packages/cli/src/commands/setup.ts`

**Behavior:**
1. Parse `--path <path>` option (default: `./<name>`).
2. Resolve to absolute path.
3. Create directory if it doesn't exist.
4. Create `.loom/` subdirectory with default templates (copied from the CLI's built-in templates).
5. Register the loom in `~/.loom/config.yaml`.
6. Set as active loom (unless `--no-switch` flag is present).
7. Print success message with the new loom's path.

---

## Step 3 — Implement `loom switch <name>`

**File:** `packages/cli/src/commands/switch.ts`

**Behavior:**
1. Load registry.
2. Find loom entry by `name`.
3. If not found, error: "No loom registered with name 'X'."
4. If the path no longer exists, error: "Loom path does not exist. Run `loom setup` to recreate or edit ~/.loom/config.yaml."
5. Update `active_loom` in registry and save.
6. Print: "Switched to loom 'X' at /path/to/loom."

---

## Step 4 — Implement `loom list`

**File:** `packages/cli/src/commands/list.ts`

**Behavior:**
1. Load registry.
2. Print table:

```
LOOMS
  default      /Users/rafa/workspaces/reslava-loom
* test         /Users/rafa/workspaces/test-loom
  experimental /Users/rafa/workspaces/exp-loom [missing]
```
3. Use `*` to indicate active loom.

---

## Step 5 — Implement `loom current`

**File:** `packages/cli/src/commands/current.ts`

**Behavior:**
1. Load registry.
2. If `active_loom` is set and path exists, print name and path.
3. If no active loom, print: "No active loom. Run `loom switch <name>` or operate in single-loom mode."

---

## Step 6 — Update Filesystem Operations

**Files:** `packages/fs/src/*.ts`

**Changes:**
- Introduce a `getActiveLoomRoot(): string` function.
- If registry has `active_loom`, return that path.
- If no registry exists, return `process.cwd()` (single-loom mode).
- All file operations (`loadFeature`, `saveDoc`, etc.) call this function to resolve the base path.

---

## Step 7 — Backward-Compatible Single-Loom Mode

**File:** `packages/cli/src/index.ts`

**Behavior:**
- Before executing any command that requires a loom root, call `getActiveLoomRoot()`.
- If it returns `process.cwd()` (no registry, no active loom), operate directly in the current directory.
- No migration required for existing single-loom users.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
```

These two documents provide a complete blueprint for the minimal multi-loom support. With this in place, you'll have your test loom ready before the CLI grows too complex.

Shall I weave these files into the repository structure now, Rafa? 🧵✨