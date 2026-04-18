---
type: plan
id: loom-state-entity-plan-001
title: "Implement LoomState Entity and getState Use‑Case"
status: active
created: 2026-04-19
version: 1
tags: [state, core, app, cli, refactor]
parent_id: loom-state-entity-idea
target_version: "0.6.0"
requires_load: [loom-state-entity-idea]
---

# Plan — Implement LoomState Entity and getState Use‑Case

| | |
|---|---|
| **Created** | 2026-04-19 |
| **Status** | DRAFT |
| **Design** | `loom-state-entity-idea.md` |
| **Target version** | 0.6.0 |

---

# Goal

Introduce a centralized `LoomState` entity that represents the complete derived state of the active loom. Implement a single `app/getState` use‑case that orchestrates loading all threads, building the link index, and assembling the state. Refactor the CLI `status` command to consume `getState`, and prepare the foundation for the VS Code tree view and future state caching.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Create `entities/state.ts` with `LoomState` interface | `packages/core/src/entities/state.ts` | — |
| 🔳 | 2 | Create `app/src/getState.ts` use‑case | `packages/app/src/getState.ts` | Step 1 |
| 🔳 | 3 | Refactor CLI `status` command to use `getState` | `packages/cli/src/commands/status.ts` | Step 2 |
| 🔳 | 4 | Update `app/src/index.ts` barrel export | `packages/app/src/index.ts` | Step 2 |
| 🔳 | 5 | Run full test suite | All packages, `tests/*` | Step 3 |

---

## Step 1 — Create `entities/state.ts`

**File:** `packages/core/src/entities/state.ts`

```typescript
import { Thread } from './thread';

export type LoomMode = 'mono' | 'multi';

export interface LoomState {
    /** The absolute path to the active loom root. */
    loomRoot: string;
    
    /** The operational mode: mono‑loom (local) or multi‑loom (global registry). */
    mode: LoomMode;
    
    /** The name of the active loom (for multi‑loom) or '(local)' for mono‑loom. */
    loomName: string;
    
    /** All threads in the active loom. */
    threads: Thread[];
    
    /** Timestamp when this state was generated. */
    generatedAt: string;
    
    /** Summary statistics. */
    summary: {
        totalThreads: number;
        activeThreads: number;
        implementingThreads: number;
        doneThreads: number;
        totalPlans: number;
        stalePlans: number;
        blockedSteps: number;
    };
}
```

---

## Step 2 — Create `app/src/getState.ts` Use‑Case

**File:** `packages/app/src/getState.ts`

```typescript
import { getActiveLoomRoot } from '../../fs/dist';
import { loadThread } from '../../fs/dist';
import { buildLinkIndex } from '../../fs/dist';
import { ConfigRegistry } from '../../core/dist/registry';
import { LoomState, LoomMode } from '../../core/dist/entities/state';
import { Thread } from '../../core/dist/entities/thread';
import { getThreadStatus } from '../../core/dist/derived';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface GetStateDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    loadThread: typeof loadThread;
    buildLinkIndex: typeof buildLinkIndex;
    registry: ConfigRegistry;
    fs: typeof fs;
}

export async function getState(deps: GetStateDeps): Promise<LoomState> {
    const loomRoot = deps.getActiveLoomRoot();
    const registry = deps.registry;
    
    // Determine mode and loom name
    const isMono = registry.isMonoLoom();
    const mode: LoomMode = isMono ? 'mono' : 'multi';
    const loomName = isMono ? '(local)' : (registry.getActiveLoomName() || 'unknown');
    
    // Load all threads
    const threadsDir = path.join(loomRoot, 'threads');
    const threads: Thread[] = [];
    
    if (deps.fs.existsSync(threadsDir)) {
        const entries = await deps.fs.readdir(threadsDir);
        for (const entry of entries) {
            const threadPath = path.join(threadsDir, entry);
            const stat = await deps.fs.stat(threadPath);
            if (stat.isDirectory() && entry !== '_archive') {
                try {
                    const thread = await deps.loadThread(entry);
                    threads.push(thread);
                } catch (e) {
                    // Skip invalid threads; they will be reported by validate
                }
            }
        }
    }
    
    // Build link index for statistics
    const index = await deps.buildLinkIndex();
    
    // Calculate summary statistics
    const totalThreads = threads.length;
    const activeThreads = threads.filter(t => getThreadStatus(t) === 'ACTIVE').length;
    const implementingThreads = threads.filter(t => getThreadStatus(t) === 'IMPLEMENTING').length;
    const doneThreads = threads.filter(t => getThreadStatus(t) === 'DONE').length;
    const totalPlans = threads.reduce((sum, t) => sum + t.plans.length, 0);
    const stalePlans = threads.reduce((sum, t) => sum + t.plans.filter(p => p.staled).length, 0);
    
    let blockedSteps = 0;
    for (const thread of threads) {
        for (const plan of thread.plans) {
            if (plan.steps) {
                for (const step of plan.steps) {
                    if (!step.done && step.blockedBy && step.blockedBy.length > 0) {
                        blockedSteps++;
                    }
                }
            }
        }
    }
    
    return {
        loomRoot,
        mode,
        loomName,
        threads,
        generatedAt: new Date().toISOString(),
        summary: {
            totalThreads,
            activeThreads,
            implementingThreads,
            doneThreads,
            totalPlans,
            stalePlans,
            blockedSteps,
        },
    };
}
```

**Note:** `ConfigRegistry.getActiveLoomName()` is a new helper method that must be added to `registry.ts`:

```typescript
getActiveLoomName(): string | null {
    const active = this.registry.active_loom;
    if (!active) return null;
    const loom = this.registry.looms.find(l => l.path === active);
    return loom?.name || null;
}
```

---

## Step 3 — Refactor CLI `status` Command

**File:** `packages/cli/src/commands/status.ts`

Replace the existing logic with a call to `getState`.

```typescript
import chalk from 'chalk';
import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadThread, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist/registry';
import * as fs from 'fs-extra';

function colorStatus(status: string): string {
    switch (status) {
        case 'DONE': return chalk.green(status);
        case 'IMPLEMENTING': return chalk.blue(status);
        case 'ACTIVE': return chalk.yellow(status);
        case 'CANCELLED': return chalk.red(status);
        default: return status;
    }
}

export async function statusCommand(
    threadId?: string,
    options?: { verbose?: boolean; json?: boolean; tokens?: boolean }
): Promise<void> {
    const registry = new ConfigRegistry();
    const state = await getState({ getActiveLoomRoot, loadThread, buildLinkIndex, registry, fs });

    if (options?.json) {
        console.log(JSON.stringify(state, null, 2));
        return;
    }

    if (threadId) {
        const thread = state.threads.find(t => t.id === threadId);
        if (!thread) {
            console.error(chalk.red(`❌ Thread '${threadId}' not found.`));
            process.exit(1);
        }
        // Detailed thread display (reuse existing verbose logic)
        // ...
    } else {
        console.log(chalk.bold(`\n🧵 Loom: ${state.loomName} (${state.mode})\n`));
        if (state.threads.length === 0) {
            console.log(chalk.yellow('No threads found.'));
            return;
        }
        for (const t of state.threads) {
            const status = getThreadStatus(t);
            console.log(`  ${t.id.padEnd(25)} ${colorStatus(status)}`);
        }
    }
}
```

---

## Step 4 — Update `app/src/index.ts` Barrel Export

```typescript
export { getState, GetStateDeps } from './getState';
```

---

## Step 5 — Run Full Test Suite

```bash
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/weave-workflow.test.ts
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
