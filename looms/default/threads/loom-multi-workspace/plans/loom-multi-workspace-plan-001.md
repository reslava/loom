---
type: plan
id: loom-multi-workspace-plan-001
title: "Implement Minimal Multi-Loom Workspace Support"
status: draft
created: 2026-04-14
version: 1
design_version: 1
tags: [loom, workspace, cli]
parent_id: loom-multi-workspace-mvp-design
target_version: 0.2.0
requires_load: [loom-multi-workspace-mvp-design]
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