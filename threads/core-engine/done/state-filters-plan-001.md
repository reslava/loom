---
type: plan
id: state-filters-plan-001
title: "Implement Common State Filters and Sorting Utilities"
status: done
created: 2026-04-19
version: 1
tags: [state, filters, sorting, cli, vscode]
parent_id: loom-state-entity-idea
target_version: "0.6.0"
requires_load: [loom-state-entity-plan-001]
---

# Plan — Implement Common State Filters and Sorting Utilities

| | |
|---|---|
| **Created** | 2026-04-19 |
| **Status** | DRAFT |
| **Design** | `loom-state-entity-idea.md` |
| **Target version** | 0.6.0 |

---

# Goal

Build a suite of pure, reusable filter and sorting functions that operate on the `LoomState` entity. These utilities will power CLI commands like `loom list --filter status=active` and enable the VS Code tree view to dynamically group and sort threads and documents.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create `filters/threadFilters.ts` with thread‑level filters | `packages/core/src/filters/threadFilters.ts` | — |
| ✅ | 2 | Create `filters/documentFilters.ts` with document‑level filters | `packages/core/src/filters/documentFilters.ts` | — |
| ✅ | 3 | Create `filters/planFilters.ts` with plan‑level filters | `packages/core/src/filters/planFilters.ts` | — |
| ✅ | 4 | Create sorting utilities | `packages/core/src/filters/sorting.ts` | — |
| ✅ | 5 | Update `app/getState` to accept optional filter/sort parameters | `packages/app/src/getState.ts` | Steps 1‑4 |
| ✅ | 6 | Enhance CLI commands (`status`, `list`) to use filters | `packages/cli/src/commands/status.ts`, `list.ts` | Step 5 |
| 👉 | 7 | Add unit tests for filters and sorting | `packages/core/test/filters/` | Steps 1‑4 |
| ✅ | 8 | Run full integration test suite | `tests/*` | All |

---

## Step 1 — Create `threadFilters.ts`

**File:** `packages/core/src/filters/threadFilters.ts`

```typescript
import { Thread } from '../entities/thread';
import { ThreadStatus } from '../entities/thread';
import { getThreadStatus, getThreadPhase } from '../derived';

export function filterThreadsByStatus(threads: Thread[], statuses: ThreadStatus[]): Thread[] {
    return threads.filter(t => statuses.includes(getThreadStatus(t)));
}

export function filterThreadsByPhase(threads: Thread[], phases: string[]): Thread[] {
    return threads.filter(t => phases.includes(getThreadPhase(t)));
}

export function filterThreadsById(threads: Thread[], pattern: string): Thread[] {
    const regex = new RegExp(pattern, 'i');
    return threads.filter(t => regex.test(t.id));
}
```

---

## Step 2 — Create `documentFilters.ts`

**File:** `packages/core/src/filters/documentFilters.ts`

```typescript
import { Document } from '../entities/document';
import { DocumentStatus } from '../entities/document';

export function filterDocumentsByType<T extends Document>(docs: T[], types: string[]): T[] {
    return docs.filter(d => types.includes(d.type));
}

export function filterDocumentsByStatus<T extends Document>(docs: T[], statuses: DocumentStatus[]): T[] {
    return docs.filter(d => statuses.includes(d.status));
}

export function filterDocumentsByTitle<T extends Document>(docs: T[], pattern: string): T[] {
    const regex = new RegExp(pattern, 'i');
    return docs.filter(d => regex.test(d.title));
}
```

---

## Step 3 — Create `planFilters.ts`

**File:** `packages/core/src/filters/planFilters.ts`

```typescript
import { PlanDoc } from '../entities/plan';

export function filterPlansByStaleness(plans: PlanDoc[], staled: boolean): PlanDoc[] {
    return plans.filter(p => (p.staled ?? false) === staled);
}

export function filterPlansByTargetVersion(plans: PlanDoc[], version: string): PlanDoc[] {
    return plans.filter(p => p.target_version === version);
}

export function filterPlansWithBlockedSteps(plans: PlanDoc[]): PlanDoc[] {
    return plans.filter(p => p.steps?.some(s => !s.done && s.blockedBy?.length));
}
```

---

## Step 4 — Create Sorting Utilities

**File:** `packages/core/src/filters/sorting.ts`

```typescript
import { Thread } from '../entities/thread';
import { Document } from '../entities/document';

export function sortThreadsById(threads: Thread[], ascending: boolean = true): Thread[] {
    return [...threads].sort((a, b) => ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id));
}

export function sortDocumentsByCreated<T extends Document>(docs: T[], ascending: boolean = true): T[] {
    return [...docs].sort((a, b) => {
        const dateA = new Date(a.created).getTime();
        const dateB = new Date(b.created).getTime();
        return ascending ? dateA - dateB : dateB - dateA;
    });
}

export function sortDocumentsByTitle<T extends Document>(docs: T[], ascending: boolean = true): T[] {
    return [...docs].sort((a, b) => ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
}
```

---

## Step 5 — Update `app/getState` to Accept Filters and Sorting

Extend `GetStateInput` to include optional filter and sort parameters. Apply them before returning the state.

```typescript
export interface GetStateInput {
    threadFilter?: {
        status?: ThreadStatus[];
        phase?: string[];
        idPattern?: string;
    };
    sortBy?: 'id' | 'created';
    sortOrder?: 'asc' | 'desc';
}

export async function getState(deps: GetStateDeps, input?: GetStateInput): Promise<LoomState> {
    // ... existing loading logic ...

    let filteredThreads = threads;

    if (input?.threadFilter) {
        const { status, phase, idPattern } = input.threadFilter;
        if (status) filteredThreads = filterThreadsByStatus(filteredThreads, status);
        if (phase) filteredThreads = filterThreadsByPhase(filteredThreads, phase);
        if (idPattern) filteredThreads = filterThreadsById(filteredThreads, idPattern);
    }

    if (input?.sortBy === 'id') {
        filteredThreads = sortThreadsById(filteredThreads, input.sortOrder !== 'desc');
    }

    // Recalculate summary based on filtered threads
    // ...
}
```

---

## Step 6 — Enhance CLI Commands

Add `--filter` and `--sort` flags to `loom status` and `loom list`.

```bash
loom status --filter status=active,implementing --sort created:desc
loom list --filter phase=planning
```

Parse these flags and pass them to `getState`.

---

## Step 7 — Add Unit Tests

Create `packages/core/test/filters/` with test files for each filter module. Verify that filters and sorting behave correctly with sample data.

---

## Step 8 — Run Full Integration Test Suite

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