---
type: plan
id: pl_01KQYDFDDBA0NCCYJBBYA3QRW1
title: Move Thread and Derived Types to entities/thread.ts
status: done
created: 2026-04-18
version: 1
tags: [core, entities, refactor]
parent_id: de_01KQYDFDDB802XEJM0S329T9WW
requires_load: [de_01KQYDFDDB802XEJM0S329T9WW]
target_version: 0.5.0
actual_release: 0.1.0
steps:
  - id: create-entities-thread
    order: 1
    status: done
    description: Create `entities/thread.ts` with `Thread`, `ThreadStatus`, `ThreadPhase`
    files_touched: ["`packages/core/src/entities/thread.ts`"]
    blocked_by: []
    satisfies: []
  - id: update-types
    order: 2
    status: done
    description: Update `types.ts` to re‑export from `entities/thread`
    files_touched: ["`packages/core/src/types.ts`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: update-all-imports-to-use-directly
    order: 3
    status: done
    description: Update all imports to use `entities/thread` directly (optional)
    files_touched: ["`packages/*/src/**/*.ts`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: run-full-build-and-test-suite
    order: 4
    status: done
    description: Run full build and test suite
    files_touched: [All packages]
    blocked_by: [Step 3]
    satisfies: []
---

# Move Thread and Derived Types to entities/thread.ts

| | |
|---|---|
| **Created** | 2026-04-18 |
| **Status** | DRAFT |
| **Design** | `core-engine-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Complete domain restructuring by moving `Thread`, `ThreadStatus`, and `ThreadPhase` from `types.ts` into a dedicated `entities/thread.ts` module. This leaves `types.ts` as a minimal facade or allows its eventual removal.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Create `entities/thread.ts` with `Thread`, `ThreadStatus`, `ThreadPhase` | `packages/core/src/entities/thread.ts` | — | — |
| ✅ | 2 | Update `types.ts` to re‑export from `entities/thread` | `packages/core/src/types.ts` | Step 1 | — |
| ✅ | 3 | Update all imports to use `entities/thread` directly (optional) | `packages/*/src/**/*.ts` | Step 1 | — |
| ✅ | 4 | Run full build and test suite | All packages | Step 3 | — |
---

## Step 1 — Create `entities/thread.ts`

```typescript
import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';
import { Document } from '../types';

export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE';
export type ThreadPhase = 'ideating' | 'designing' | 'planning' | 'implementing';

export interface Thread {
    id: string;
    idea?: IdeaDoc;
    design: DesignDoc;
    supportingDesigns: DesignDoc[];
    plans: PlanDoc[];
    contexts: CtxDoc[];
    allDocs: Document[];
}
```

---

## Step 2 — Update `types.ts`

Add re‑export:
```typescript
export { Thread, ThreadStatus, ThreadPhase } from './entities/thread';
```

---

## Step 3 — Update Imports (Optional)

Gradually migrate imports from `'../../core/dist/types'` to `'../../core/dist/entities/thread'`. This can be done incrementally.

---

## Step 4 — Run Tests

```bash
./scripts/build-all.sh
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |