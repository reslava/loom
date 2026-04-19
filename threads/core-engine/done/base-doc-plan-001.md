---
type: plan
id: base-doc-plan-001
title: "Extract BaseDoc Interface with Generic Status"
status: done
created: 2026-04-17
version: 1
tags: [core, entities, refactor, typescript]
parent_id: base-doc-design
target_version: "0.5.0"
requires_load: [base-doc-design]
---

# Plan — Extract BaseDoc Interface with Generic Status

| | |
|---|---|
| **Created** | 2026-04-17 |
| **Status** | DRAFT |
| **Design** | `base-doc-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Extract a generic `BaseDoc<TStatus>` interface and update all existing document entities (`IdeaDoc`, `DesignDoc`, `PlanDoc`, `CtxDoc`) to extend it. This eliminates duplication of common fields, enforces compile‑time status safety, and establishes a clean foundation for future document types.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create `entities/base.ts` with `BaseDoc`, `DocumentType` | `packages/core/src/entities/base.ts` | — |
| ✅ | 2 | Update `entities/idea.ts` to extend `BaseDoc<IdeaStatus>` | `packages/core/src/entities/idea.ts` | Step 1 |
| ✅ | 3 | Update `entities/design.ts` to extend `BaseDoc<DesignStatus>` | `packages/core/src/entities/design.ts` | Step 1 |
| ✅ | 4 | Update `entities/plan.ts` to extend `BaseDoc<PlanStatus>` | `packages/core/src/entities/plan.ts` | Step 1 |
| ✅ | 5 | Update `entities/ctx.ts` to extend `BaseDoc<CtxStatus>` | `packages/core/src/entities/ctx.ts` | Step 1 |
| ✅ | 6 | Update `index.ts` to re‑export `BaseDoc` and `DocumentType` | `packages/core/src/index.ts` | Steps 1‑5 |
| ✅ | 7 | Run full build and test suite | All packages, `tests/*` | Step 6 |

---

## Step 1 — Create `entities/base.ts`

**File:** `packages/core/src/entities/base.ts`

```typescript
export type DocumentType = 'idea' | 'design' | 'plan' | 'ctx';

export interface BaseDoc<TStatus extends string = string> {
    type: DocumentType;
    id: string;
    title: string;
    status: TStatus;
    created: string;
    updated?: string;
    version: number;
    tags: string[];
    parent_id: string | null;
    child_ids: string[];
    requires_load: string[];
    content: string;
    _path?: string;
}
```

---

## Step 2 — Update `entities/idea.ts`

```typescript
import { BaseDoc } from './base';

export type IdeaStatus = 'draft' | 'active' | 'done' | 'cancelled';

export interface IdeaDoc extends BaseDoc<IdeaStatus> {
    type: 'idea';
    status: IdeaStatus;
}
```

---

## Step 3 — Update `entities/design.ts`

```typescript
import { BaseDoc } from './base';

export type DesignStatus = 'draft' | 'active' | 'closed' | 'done' | 'cancelled';

export interface DesignDoc extends BaseDoc<DesignStatus> {
    type: 'design';
    status: DesignStatus;
    role?: 'primary' | 'supporting';
    target_release?: string;
    actual_release?: string | null;
    refined?: boolean;
}
```

---

## Step 4 — Update `entities/plan.ts`

```typescript
import { BaseDoc } from './base';

export type PlanStatus = 'draft' | 'active' | 'implementing' | 'done' | 'blocked' | 'cancelled';

export interface PlanStep {
    order: number;
    description: string;
    done: boolean;
    files_touched: string[];
    blockedBy: string[];
}

export interface PlanDoc extends BaseDoc<PlanStatus> {
    type: 'plan';
    status: PlanStatus;
    design_version: number;
    target_version: string;
    staled?: boolean;
    steps: PlanStep[];
}
```

---

## Step 5 — Update `entities/ctx.ts`

```typescript
import { BaseDoc } from './base';

export type CtxStatus = 'draft' | 'active' | 'done' | 'cancelled';

export interface CtxDoc extends BaseDoc<CtxStatus> {
    type: 'ctx';
    status: CtxStatus;
    source_version?: number;
}
```

---

## Step 6 — Update `packages/core/src/index.ts`

Add re‑exports for the new base types:

```typescript
// ============================================================================
// Base Document
// ============================================================================
export { BaseDoc, DocumentType } from './entities/base';
```

The full `index.ts` will now include these alongside the existing entity, event, reducer, and utility exports.

---

## Step 7 — Run Full Build and Test Suite

```bash
./scripts/build-all.sh
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
```

All tests must pass. The refactor should be behavior‑neutral.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |