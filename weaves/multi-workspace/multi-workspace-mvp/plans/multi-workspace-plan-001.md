---
type: plan
id: multi-workspace-plan-001
title: "Implement Minimal Multi-Loom Workspace Support"
status: done
created: 2026-04-14
updated: 2026-04-14
version: 2
design_version: 1
tags: [loom, workspace, cli]
parent_id: multi-workspace-mvp-design
target_version: "0.2.0"
requires_load: [multi-workspace-mvp-design]
---

# Plan — Implement Minimal Multi-Loom Workspace Support

| | |
|---|---|
| **Created** | 2026-04-14 |
| **Updated** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `multi-workspace-mvp-design.md` |
| **Target version** | 0.2.0 |

---

# Goal

Implement a minimal global registry for Loom workspaces, enabling the `loom init`, `loom setup`, `loom switch`, `loom list`, and `loom current` commands. This provides a safe "test loom" environment for CLI development and establishes the foundation for multi‑loom support.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create `ConfigRegistry` class | `packages/core/src/registry.ts` | `core-engine-plan-002` |
| ✅ | 2 | Implement `getActiveLoomRoot()` in filesystem layer | `packages/fs/src/utils.ts` |
| ✅ | 3 | Implement `loom init` command | `packages/cli/src/commands/init.ts` |
| ✅ | 4 | Implement `loom setup` command | `packages/cli/src/commands/setup.ts` |
| ✅ | 5 | Implement `loom switch` command | `packages/cli/src/commands/switch.ts` |
| ✅ | 6 | Implement `loom list` command | `packages/cli/src/commands/list.ts` |
| ✅ | 7 | Implement `loom current` command | `packages/cli/src/commands/current.ts` |
| ✅ | 8 | Update all filesystem operations to use `getActiveLoomRoot()` | `packages/fs/src/*.ts` |
| ✅ | 9 | Test with mono‑loom and multi‑loom scenarios | `looms/test/` |

---

## Step 1 — Create `ConfigRegistry` Class

**File:** `packages/core/src/registry.ts`

Manage the global `~/.loom/config.yaml` file.

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';

export interface LoomEntry {
  name: string;
  path: string;        // Relative to ~/.loom/
  created: string;     // ISO timestamp
}

export interface LoomRegistry {
  active_loom: string | null;
  looms: LoomEntry[];
}

const CONFIG_DIR = path.join(os.homedir(), '.loom');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.yaml');

export class ConfigRegistry {
  private registry: LoomRegistry;

  constructor() {
    this.registry = this.load();
  }

  private load(): LoomRegistry {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { active_loom: null, looms: [] };
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return yaml.parse(content) || { active_loom: null, looms: [] };
  }

  private save(): void {
    fs.ensureDirSync(CONFIG_DIR);
    fs.writeFileSync(CONFIG_PATH, yaml.stringify(this.registry));
  }

  getActiveLoom(): string | null {
    return this.registry.active_loom;
  }

  setActiveLoom(name: string): void {
    const exists = this.registry.looms.some(l => l.name === name);
    if (!exists) {
      throw new Error(`Loom '${name}' not found`);
    }
    this.registry.active_loom = `../looms/${name}`;
    this.save();
  }

  addLoom(name: string, customPath?: string): void {
    const relativePath = customPath ? path.relative(CONFIG_DIR, customPath) : `../looms/${name}`;
    const existing = this.registry.looms.find(l => l.name === name);
    if (existing) {
      throw new Error(`Loom '${name}' already exists`);
    }
    this.registry.looms.push({
      name,
      path: relativePath,
      created: new Date().toISOString(),
    });
    this.save();
  }

  listLooms(): LoomEntry[] {
    return this.registry.looms;
  }

  resolveLoomPath(relativePath: string): string {
    return path.resolve(CONFIG_DIR, relativePath);
  }
}
```

---

## Step 2 — Implement `getActiveLoomRoot()` in Filesystem Layer

**File:** `packages/fs/src/utils.ts`

Update the function to use the registry and fallback to local `.loom/` discovery.

```typescript
import * as path from 'path';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../core/src/registry';

export function getActiveLoomRoot(): string {
  const registry = new ConfigRegistry();
  const active = registry.getActiveLoom();
  
  if (active) {
    const resolved = registry.resolveLoomPath(active);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  // Fallback: search for .loom/ in current directory or ancestors
  let current = process.cwd();
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, '.loom'))) {
      return current;
    }
    current = path.dirname(current);
  }

  // Ultimate fallback
  return process.cwd();
}
```

---

## Step 3 — Implement `loom init` Command

**File:** `packages/cli/src/commands/init.ts`

```typescript
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { ConfigRegistry } from '../../../core/src/registry';

export async function initCommand(): Promise<void> {
  const defaultPath = path.join(os.homedir(), 'looms', 'default');
  
  // Create directory structure
  fs.ensureDirSync(path.join(defaultPath, '.loom', 'templates'));
  fs.ensureDirSync(path.join(defaultPath, '.loom', 'prompts'));
  fs.ensureDirSync(path.join(defaultPath, '.loom', 'cache'));
  fs.ensureDirSync(path.join(defaultPath, 'chats'));
  fs.ensureDirSync(path.join(defaultPath, 'threads'));
  fs.ensureDirSync(path.join(defaultPath, 'references'));
  
  // Copy built-in templates (from extension assets)
  // ...

  // Register in global registry
  const registry = new ConfigRegistry();
  registry.addLoom('default', defaultPath);
  registry.setActiveLoom('default');
  
  console.log(`🧵 Loom initialized at ${defaultPath}`);
  console.log(`   Active loom: default`);
}
```

---

## Step 4 — Implement `loom setup` Command

**File:** `packages/cli/src/commands/setup.ts`

```typescript
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { ConfigRegistry } from '../../../core/src/registry';

export async function setupCommand(name: string, options: { path?: string; switch?: boolean }): Promise<void> {
  const loomPath = options.path || path.join(os.homedir(), 'looms', name);
  
  // Create directory structure (similar to init)
  fs.ensureDirSync(path.join(loomPath, '.loom', 'templates'));
  // ... rest of directories
  
  const registry = new ConfigRegistry();
  registry.addLoom(name, loomPath);
  
  if (options.switch !== false) {
    registry.setActiveLoom(name);
    console.log(`🧵 Loom '${name}' created and activated at ${loomPath}`);
  } else {
    console.log(`🧵 Loom '${name}' created at ${loomPath}`);
  }
}
```

---

## Step 5 — Implement `loom switch` Command

**File:** `packages/cli/src/commands/switch.ts`

```typescript
import { ConfigRegistry } from '../../../core/src/registry';

export async function switchCommand(name: string): Promise<void> {
  const registry = new ConfigRegistry();
  const looms = registry.listLooms();
  const target = looms.find(l => l.name === name);
  
  if (!target) {
    console.error(`❌ Loom '${name}' not found.`);
    process.exit(1);
  }
  
  const resolved = registry.resolveLoomPath(target.path);
  const fs = require('fs-extra');
  if (!fs.existsSync(resolved)) {
    console.error(`❌ Loom path does not exist: ${resolved}`);
    process.exit(1);
  }
  
  registry.setActiveLoom(name);
  console.log(`🧵 Switched to loom '${name}' (${resolved})`);
}
```

---

## Step 6 — Implement `loom list` Command

**File:** `packages/cli/src/commands/list.ts`

```typescript
import { ConfigRegistry } from '../../../core/src/registry';

export async function listCommand(): Promise<void> {
  const registry = new ConfigRegistry();
  const looms = registry.listLooms();
  const active = registry.getActiveLoom();
  
  if (looms.length === 0) {
    console.log('No looms registered. Run `loom init` to create one.');
    return;
  }
  
  console.log('LOOMS');
  for (const loom of looms) {
    const marker = loom.path === active ? '*' : ' ';
    const resolved = registry.resolveLoomPath(loom.path);
    const fs = require('fs-extra');
    const exists = fs.existsSync(resolved);
    const status = exists ? '' : ' [missing]';
    console.log(`${marker} ${loom.name.padEnd(12)} ${resolved}${status}`);
  }
}
```

---

## Step 7 — Implement `loom current` Command

**File:** `packages/cli/src/commands/current.ts`

```typescript
import { ConfigRegistry } from '../../../core/src/registry';

export async function currentCommand(): Promise<void> {
  const registry = new ConfigRegistry();
  const active = registry.getActiveLoom();
  
  if (!active) {
    console.log('No active loom. Run `loom init` or `loom switch`.');
    return;
  }
  
  const looms = registry.listLooms();
  const current = looms.find(l => l.path === active);
  const resolved = registry.resolveLoomPath(active);
  
  console.log(`🧵 Active loom: ${current?.name || 'unknown'}`);
  console.log(`   Path: ${resolved}`);
}
```

---

## Step 8 — Update Filesystem Operations

**Files:** `packages/fs/src/loadThread.ts`, `saveThread.ts`, etc.

Replace all instances of `process.cwd()` with `getActiveLoomRoot()`.

```typescript
import { getActiveLoomRoot } from './utils';

export async function loadThread(threadId: string): Promise<Thread> {
  const loomRoot = getActiveLoomRoot();
  const threadPath = path.join(loomRoot, 'threads', threadId);
  // ...
}
```

---

## Step 9 — Test with Mono‑Loom and Multi‑Loom Scenarios

**Manual Test Plan:**

1. **Mono‑loom (no registry):**
   ```bash
   cd ~/dev/some-project
   mkdir -p .loom threads
   loom status   # Should use current directory
   ```

2. **Multi‑loom (with registry):**
   ```bash
   loom init
   loom setup test
   loom switch test
   loom weave idea "Test Feature"
   ls ~/looms/test/threads/   # Should show test-feature/
   ```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
