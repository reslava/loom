---
type: plan
id: loom-management-app-extraction-plan-001
title: "Extract Loom Management Commands to Application Layer"
status: done
created: 2026-04-17
version: 1
tags: [app, cli, refactor, management]
parent_id: app-layer-refactor-design
target_version: "0.5.0"
requires_load: [app-layer-refactor-design]
---

# Plan — Extract Loom Management Commands to Application Layer

| | |
|---|---|
| **Created** | 2026-04-17 |
| **Status** | DRAFT |
| **Design** | `app-layer-refactor-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Move all orchestration logic for loom workspace management commands (`init`, `setup`, `switch`, `list`, `current`) out of the CLI layer into dedicated `app` use‑cases. This completes the application layer coverage, ensures zero duplication between CLI and future VS Code extension, and enforces the clean architecture pattern across the entire codebase.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Extract `init` use‑case from CLI | `app/src/init.ts`, `cli/src/commands/init.ts` | — |
| ✅ | 2 | Extract `setup` use‑case from CLI | `app/src/setup.ts`, `cli/src/commands/setup.ts` | — |
| ✅ | 3 | Extract `switch` use‑case from CLI | `app/src/switch.ts`, `cli/src/commands/switch.ts` | — |
| ✅ | 4 | Extract `list` use‑case from CLI | `app/src/list.ts`, `cli/src/commands/list.ts` | — |
| ✅ | 5 | Extract `current` use‑case from CLI | `app/src/current.ts`, `cli/src/commands/current.ts` | — |
| ✅ | 6 | Update `app/src/index.ts` barrel exports | `app/src/index.ts` | Steps 1‑5 |
| ✅ | 7 | Run full build and test suite | All packages, `tests/*` | Step 6 |

---

## Step 1 — Extract `init` Use‑Case

**File:** `app/src/init.ts`

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ConfigRegistry } from '../../core/dist';

export interface InitInput {
    force?: boolean;
}

export interface InitDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export async function initLoom(
    input: InitInput,
    deps: InitDeps
): Promise<{ path: string; name: string }> {
    const defaultPath = path.join(os.homedir(), 'looms', 'default');
    
    if (deps.fs.existsSync(defaultPath) && !input.force) {
        throw new Error(`Loom already exists at ${defaultPath}. Use --force to overwrite.`);
    }

    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'templates'));
    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'prompts'));
    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'schemas'));
    deps.fs.ensureDirSync(path.join(defaultPath, '.loom', 'cache'));
    deps.fs.ensureDirSync(path.join(defaultPath, 'chats'));
    deps.fs.ensureDirSync(path.join(defaultPath, 'threads'));
    deps.fs.ensureDirSync(path.join(defaultPath, 'references'));

    try {
        deps.registry.addLoom('default', defaultPath);
    } catch (e: any) {
        if (!e.message.includes('already exists')) throw e;
    }
    deps.registry.setActiveLoom('default');

    return { path: defaultPath, name: 'default' };
}
```

**Refactored CLI:** `cli/src/commands/init.ts`

```typescript
import chalk from 'chalk';
import { initLoom } from '../../../app/dist';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../core/dist';

export async function initCommand(options: { force?: boolean }): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const result = await initLoom({ force: options.force }, { fs, registry });
        console.log(chalk.green(`🧵 Loom initialized at ${result.path}`));
        console.log(chalk.green(`   Active loom: ${result.name}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
```

---

## Step 2 — Extract `setup` Use‑Case

**File:** `app/src/setup.ts`

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ConfigRegistry } from '../../core/dist';

export interface SetupInput {
    name: string;
    path?: string;
    switch?: boolean;
}

export interface SetupDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export async function setupLoom(
    input: SetupInput,
    deps: SetupDeps
): Promise<{ path: string; name: string; activated: boolean }> {
    const loomPath = input.path || path.join(os.homedir(), 'looms', input.name);
    
    if (deps.fs.existsSync(loomPath)) {
        throw new Error(`Directory already exists: ${loomPath}`);
    }

    deps.fs.ensureDirSync(path.join(loomPath, '.loom', 'templates'));
    deps.fs.ensureDirSync(path.join(loomPath, '.loom', 'prompts'));
    deps.fs.ensureDirSync(path.join(loomPath, '.loom', 'schemas'));
    deps.fs.ensureDirSync(path.join(loomPath, '.loom', 'cache'));
    deps.fs.ensureDirSync(path.join(loomPath, 'chats'));
    deps.fs.ensureDirSync(path.join(loomPath, 'threads'));
    deps.fs.ensureDirSync(path.join(loomPath, 'references'));

    try {
        deps.registry.addLoom(input.name, loomPath);
    } catch (e: any) {
        if (e.message.includes('already exists')) {
            throw new Error(`Loom '${input.name}' is already registered. Use 'loom switch ${input.name}'.`);
        }
        throw e;
    }

    const shouldSwitch = input.switch !== false;
    if (shouldSwitch) {
        deps.registry.setActiveLoom(input.name);
    }

    return { path: loomPath, name: input.name, activated: shouldSwitch };
}
```

**Refactored CLI:** `cli/src/commands/setup.ts` (thin wrapper).

---

## Step 3 — Extract `switch` Use‑Case

**File:** `app/src/switch.ts`

```typescript
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../core/dist';

export interface SwitchInput {
    name: string;
}

export interface SwitchDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export async function switchLoom(
    input: SwitchInput,
    deps: SwitchDeps
): Promise<{ name: string; path: string }> {
    const looms = deps.registry.listLooms();
    const target = looms.find(l => l.name === input.name);
    if (!target) {
        throw new Error(`Loom '${input.name}' not found.`);
    }

    const resolvedPath = deps.registry.resolveLoomPath(target.path);
    if (!deps.fs.existsSync(resolvedPath)) {
        throw new Error(`Loom path does not exist: ${resolvedPath}`);
    }

    deps.registry.setActiveLoom(input.name);
    return { name: input.name, path: resolvedPath };
}
```

**Refactored CLI:** `cli/src/commands/switch.ts` (thin wrapper).

---

## Step 4 — Extract `list` Use‑Case

**File:** `app/src/list.ts`

```typescript
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../core/dist';

export interface ListDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export interface LoomListEntry {
    name: string;
    path: string;
    exists: boolean;
    isActive: boolean;
}

export async function listLooms(deps: ListDeps): Promise<LoomListEntry[]> {
    const looms = deps.registry.listLooms();
    const active = deps.registry.getActiveLoom();
    
    return looms.map(loom => {
        const resolved = deps.registry.resolveLoomPath(loom.path);
        return {
            name: loom.name,
            path: resolved,
            exists: deps.fs.existsSync(resolved),
            isActive: loom.path === active,
        };
    });
}
```

**Refactored CLI:** `cli/src/commands/list.ts` (thin wrapper).

---

## Step 5 — Extract `current` Use‑Case

**File:** `app/src/current.ts`

```typescript
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../core/dist';

export interface CurrentDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
}

export interface CurrentLoomInfo {
    name: string | null;
    path: string | null;
    exists: boolean;
}

export async function currentLoom(deps: CurrentDeps): Promise<CurrentLoomInfo> {
    const active = deps.registry.getActiveLoom();
    if (!active) {
        return { name: null, path: null, exists: false };
    }

    const looms = deps.registry.listLooms();
    const current = looms.find(l => l.path === active);
    const resolved = deps.registry.resolveLoomPath(active);
    
    return {
        name: current?.name || null,
        path: resolved,
        exists: deps.fs.existsSync(resolved),
    };
}
```

**Refactored CLI:** `cli/src/commands/current.ts` (thin wrapper).

---

## Step 6 — Update `app/src/index.ts` Barrel Exports

```typescript
export { initLoom, InitInput, InitDeps } from './init';
export { setupLoom, SetupInput, SetupDeps } from './setup';
export { switchLoom, SwitchInput, SwitchDeps } from './switch';
export { listLooms, LoomListEntry, ListDeps } from './list';
export { currentLoom, CurrentLoomInfo, CurrentDeps } from './current';
```

---

## Step 7 — Run Full Build and Test Suite

```bash
./scripts/build-all.sh
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
```

All tests must pass.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |