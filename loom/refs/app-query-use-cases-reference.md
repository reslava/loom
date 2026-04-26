---
type: reference
id: app-query-use-cases-reference
title: "Application Layer Query Use‑Cases Reference"
status: active
created: 2026-04-18
version: 1
tags: [app, query, cli, vscode, reference]
requires_load: []
---

# Application Layer Query Use‑Cases Reference

This document catalogs the planned query use‑cases for the `app` layer. These use‑cases provide read‑only access to Loom's state and are designed to be consumed identically by both the CLI and the VS Code extension.

All use‑cases follow the dependency injection pattern established in the `app` layer.

## 1. Thread Queries

### `listThreads`

**Purpose:** Return a summary of all threads in the active loom.

**Input:**
```typescript
interface ListThreadsInput {
    filter?: {
        status?: ThreadStatus[];
        phase?: ThreadPhase[];
    };
}
```

**Output:**
```typescript
interface ThreadSummary {
    id: string;
    status: ThreadStatus;
    phase: ThreadPhase;
    designTitle: string;
    designVersion: number;
    planCount: number;
    plansDone: number;
}
```

### `getThread`

**Purpose:** Return detailed information about a specific thread.

**Input:**
```typescript
interface GetThreadInput {
    threadId: string;
}
```

**Output:** `Thread` (the full aggregate).

---

## 2. Document Queries

### `listDesigns`

**Purpose:** List all design documents across threads, with optional filters.

**Input:**
```typescript
interface ListDesignsInput {
    filter?: {
        status?: DesignStatus[];
        role?: 'primary' | 'supporting';
        threadId?: string;
    };
}
```

**Output:**
```typescript
interface DesignSummary {
    id: string;
    threadId: string;
    title: string;
    status: DesignStatus;
    role: 'primary' | 'supporting';
    version: number;
    targetRelease?: string;
}
```

### `listPlans`

**Purpose:** List all plan documents across threads, with optional filters.

**Input:**
```typescript
interface ListPlansInput {
    filter?: {
        status?: PlanStatus[];
        threadId?: string;
        staled?: boolean;
    };
}
```

**Output:**
```typescript
interface PlanSummary {
    id: string;
    threadId: string;
    title: string;
    status: PlanStatus;
    designVersion: number;
    targetVersion: string;
    staled: boolean;
    stepsTotal: number;
    stepsDone: number;
}
```

### `listIdeas`

**Purpose:** List all idea documents across threads.

**Input:**
```typescript
interface ListIdeasInput {
    filter?: {
        status?: IdeaStatus[];
        threadId?: string;
    };
}
```

**Output:**
```typescript
interface IdeaSummary {
    id: string;
    threadId: string;
    title: string;
    status: IdeaStatus;
}
```

### `listContexts`

**Purpose:** List all context documents (checkpoints and summaries).

**Input:**
```typescript
interface ListContextsInput {
    filter?: {
        threadId?: string;
        type?: 'summary' | 'checkpoint'; // derived from source_version presence
    };
}
```

**Output:**
```typescript
interface ContextSummary {
    id: string;
    threadId: string;
    title: string;
    status: CtxStatus;
    sourceVersion?: number; // present for summaries
}
```

---

## 3. Dependency & Blocking Queries

### `getBlockedSteps`

**Purpose:** Return all steps that are currently blocked, with their blockers.

**Input:** None (or optional `threadId` filter).

**Output:**
```typescript
interface BlockedStepInfo {
    planId: string;
    threadId: string;
    stepOrder: number;
    stepDescription: string;
    blockedBy: string[];
}
```

### `getStalePlans`

**Purpose:** Return all plans marked as `staled` (design version mismatch).

**Input:** None (or optional `threadId` filter).

**Output:** `PlanSummary[]` (with `staled: true`).

---

## 4. Workflow State Queries

### `getNextActions`

**Purpose:** Return the next unblocked, incomplete step for each active plan. This helps users know exactly what to work on.

**Input:** None (or optional `threadId` filter).

**Output:**
```typescript
interface NextAction {
    planId: string;
    threadId: string;
    stepOrder: number;
    stepDescription: string;
}
```

---

## 5. Metadata Queries

### `getStatistics`

**Purpose:** Return aggregate statistics about the active loom.

**Input:** None.

**Output:**
```typescript
interface LoomStatistics {
    threadCount: number;
    activeThreads: number;
    implementingThreads: number;
    doneThreads: number;
    totalPlans: number;
    stalePlans: number;
    blockedSteps: number;
}
```

---

## Implementation Notes

- All use‑cases should be implemented in `packages/app/src/queries/`.
- They should depend on the `fs` layer for data access (`loadThread`, `buildLinkIndex`, etc.).
- The CLI and VS Code extension will call these use‑cases directly, passing the appropriate dependencies.
- Filtering should be performed in the use‑case, not in the presentation layer, to ensure consistency.

## Next Steps

- Create `app-query-use-cases-plan-001.md` to implement these queries incrementally.
- Prioritize queries needed for the VS Code tree view (`listThreads`, `getThread`).