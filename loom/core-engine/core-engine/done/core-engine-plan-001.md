---
type: plan
id: core-engine-plan-001
title: "Core Engine Implementation — Types and Reducers"
status: done
created: 2026-04-10
updated: 2026-04-14
version: 2
design_version: 3
tags: [loom, core, engine, types, reducers]
parent_id: core-engine-design
target_version: "0.1.0"
requires_load: [core-engine-design]
---

# Plan — Core Engine Types and Reducers

| | |
|---|---|
| **Created** | 2026-04-10 |
| **Updated** | 2026-04-14 |
| **Status** | DRAFT |
| **Design** | `core-engine-design.md` (v3) |
| **Target version** | 0.1.0 |

---

# Goal

Implement the minimal core engine for the document-driven REslava Loom system:
- document types
- reducers (design + plan)
- orchestrator (`applyEvent`)
- derived state functions

This establishes the foundation for filesystem integration and future CLI/VSIX components.

---

# Steps

| Done | # | Step | Files touched |
|---|---|---|---|
| ✅ | 1 | Define TypeScript core types | `packages/core/src/types.ts` |
| ✅ | 2 | Implement design reducer | `packages/core/src/designReducer.ts` |
| ✅ | 3 | Implement plan reducer | `packages/core/src/planReducer.ts` |
| ✅ | 4 | Implement applyEvent orchestrator | `packages/core/src/applyEvent.ts` |
| ✅ | 5 | Implement derived state functions | `packages/core/src/derived.ts` |
| ✅ | 6 | Basic tests / usage example | `packages/core/test/` |

---

## Step 1 — Define TypeScript Core Types

**File:** `packages/core/src/types.ts`

Define the base document types aligned with the REslava Loom frontmatter schema.

```typescript
export type DocumentType = 'idea' | 'design' | 'plan' | 'ctx';

export type DesignStatus = 'draft' | 'active' | 'closed' | 'done' | 'cancelled';
export type PlanStatus = 'draft' | 'active' | 'implementing' | 'done' | 'blocked' | 'cancelled';
export type IdeaStatus = 'draft' | 'active' | 'done' | 'cancelled';
export type CtxStatus = 'draft' | 'active' | 'done' | 'cancelled';

export type DocumentStatus = DesignStatus | PlanStatus | IdeaStatus | CtxStatus;

export interface BaseDoc {
  type: DocumentType;
  id: string;
  title: string;
  status: DocumentStatus;
  created: string;        // YYYY-MM-DD
  updated?: string;
  version: number;
  tags: string[];
  parent_id: string | null;
  child_ids: string[];
  requires_load: string[];
}

export interface DesignDoc extends BaseDoc {
  type: 'design';
  status: DesignStatus;
  target_release?: string;
  actual_release?: string | null;
  refined?: boolean;
}

export interface PlanDoc extends BaseDoc {
  type: 'plan';
  status: PlanStatus;
  design_version: number;
  target_version: string;
  staled?: boolean;
  steps: PlanStep[];
}

export interface PlanStep {
  order: number;
  description: string;
  done: boolean;
  files_touched: string[];
}

export interface IdeaDoc extends BaseDoc {
  type: 'idea';
  status: IdeaStatus;
}

export interface CtxDoc extends BaseDoc {
  type: 'ctx';
  status: CtxStatus;
  source_version?: number;
}

export type Document = IdeaDoc | DesignDoc | PlanDoc | CtxDoc;

export interface Thread {
  id: string;
  idea?: IdeaDoc;
  design: DesignDoc;
  plans: PlanDoc[];
  contexts: CtxDoc[];
  allDocs: Document[];
}

// Derived thread state
export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE';
export type ThreadPhase = 'ideating' | 'designing' | 'planning' | 'implementing';
```

---

## Step 2 — Implement Design Reducer

**File:** `packages/core/src/designReducer.ts`

Pure function that applies events to a `DesignDoc`.

```typescript
import { DesignDoc, DesignStatus } from './types';

export type DesignEvent =
  | { type: 'CREATE_DESIGN' }
  | { type: 'ACTIVATE_DESIGN' }
  | { type: 'CLOSE_DESIGN' }
  | { type: 'REOPEN_DESIGN' }
  | { type: 'REFINE_DESIGN' }
  | { type: 'FINALISE_DESIGN' }
  | { type: 'CANCEL_DESIGN' };

export function designReducer(doc: DesignDoc, event: DesignEvent): DesignDoc {
  switch (event.type) {
    case 'CREATE_DESIGN':
      return { ...doc, status: 'draft' };

    case 'ACTIVATE_DESIGN':
      if (doc.status !== 'draft') throw new Error('Invalid transition');
      return { ...doc, status: 'active' };

    case 'CLOSE_DESIGN':
      if (doc.status !== 'active') throw new Error('Invalid transition');
      return { ...doc, status: 'closed' };

    case 'REOPEN_DESIGN':
      if (doc.status !== 'closed') throw new Error('Invalid transition');
      return { ...doc, status: 'active' };

    case 'REFINE_DESIGN':
      if (!['active', 'closed', 'done'].includes(doc.status)) {
        throw new Error('Invalid transition');
      }
      return {
        ...doc,
        status: 'active',
        version: doc.version + 1,
        refined: true,
        updated: new Date().toISOString().split('T')[0],
      };

    case 'FINALISE_DESIGN':
      if (doc.status !== 'active') throw new Error('Invalid transition');
      return { ...doc, status: 'done', updated: new Date().toISOString().split('T')[0] };

    case 'CANCEL_DESIGN':
      if (['draft', 'active', 'closed'].includes(doc.status)) {
        return { ...doc, status: 'cancelled', updated: new Date().toISOString().split('T')[0] };
      }
      throw new Error('Invalid transition');

    default:
      return doc;
  }
}
```

---

## Step 3 — Implement Plan Reducer

**File:** `packages/core/src/planReducer.ts`

```typescript
import { PlanDoc } from './types';

export type PlanEvent =
  | { type: 'CREATE_PLAN' }
  | { type: 'ACTIVATE_PLAN' }
  | { type: 'START_IMPLEMENTING_PLAN' }
  | { type: 'COMPLETE_STEP'; stepIndex: number }
  | { type: 'FINISH_PLAN' }
  | { type: 'BLOCK_PLAN' }
  | { type: 'UNBLOCK_PLAN' }
  | { type: 'CANCEL_PLAN' };

export function planReducer(doc: PlanDoc, event: PlanEvent): PlanDoc {
  const updated = new Date().toISOString().split('T')[0];

  switch (event.type) {
    case 'CREATE_PLAN':
      return { ...doc, status: 'draft' };

    case 'ACTIVATE_PLAN':
      if (doc.status !== 'draft') throw new Error('Invalid transition');
      return { ...doc, status: 'active', updated };

    case 'START_IMPLEMENTING_PLAN':
      if (doc.status !== 'active') throw new Error('Invalid transition');
      return { ...doc, status: 'implementing', updated };

    case 'COMPLETE_STEP': {
      const steps = [...doc.steps];
      if (steps[event.stepIndex]) {
        steps[event.stepIndex].done = true;
      }
      // Auto-transition to done if all steps complete
      const allDone = steps.every(s => s.done);
      return {
        ...doc,
        steps,
        status: allDone ? 'done' : doc.status,
        updated,
      };
    }

    case 'FINISH_PLAN':
      if (doc.status !== 'implementing') throw new Error('Invalid transition');
      return { ...doc, status: 'done', updated };

    case 'BLOCK_PLAN':
      if (!['active', 'implementing'].includes(doc.status)) throw new Error('Invalid transition');
      return { ...doc, status: 'blocked', updated };

    case 'UNBLOCK_PLAN':
      if (doc.status !== 'blocked') throw new Error('Invalid transition');
      return { ...doc, status: 'active', updated };

    case 'CANCEL_PLAN':
      if (['draft', 'active', 'implementing', 'blocked'].includes(doc.status)) {
        return { ...doc, status: 'cancelled', updated };
      }
      throw new Error('Invalid transition');

    default:
      return doc;
  }
}
```

---

## Step 4 — Implement `applyEvent` Orchestrator

**File:** `packages/core/src/applyEvent.ts`

```typescript
import { Thread, Document } from './types';
import { designReducer, DesignEvent } from './designReducer';
import { planReducer, PlanEvent } from './planReducer';

export type WorkflowEvent = DesignEvent | PlanEvent | { type: 'CHECK_THREAD' } | { type: 'SUMMARIZE_CONTEXT' };

export function applyEvent(thread: Thread, event: WorkflowEvent): Thread {
  const updatedDocs = thread.allDocs.map(doc => {
    if (event.type.startsWith('DESIGN') || event.type === 'REFINE_DESIGN') {
      if (doc.type === 'design' && doc.id === thread.design.id) {
        return designReducer(doc, event as DesignEvent);
      }
    }

    if (event.type.startsWith('PLAN') || event.type === 'COMPLETE_STEP') {
      // Find the target plan (assuming event has planId or similar)
      if (doc.type === 'plan' && (event as any).planId === doc.id) {
        return planReducer(doc, event as PlanEvent);
      }
    }

    return doc;
  });

  // Rebuild thread from updated documents
  const design = updatedDocs.find(d => d.type === 'design') as any;
  const plans = updatedDocs.filter(d => d.type === 'plan') as any[];

  return {
    ...thread,
    design,
    plans,
    allDocs: updatedDocs,
  };
}
```

---

## Step 5 — Implement Derived State Functions

**File:** `packages/core/src/derived.ts`

```typescript
import { Thread, ThreadStatus, ThreadPhase } from './types';

export function getThreadStatus(thread: Thread): ThreadStatus {
  const allDocs = thread.allDocs;

  if (allDocs.some(d => d.status === 'cancelled')) {
    return 'CANCELLED';
  }
  if (allDocs.some(d => d.type === 'plan' && d.status === 'implementing')) {
    return 'IMPLEMENTING';
  }
  if (allDocs.some(d => d.status === 'active' || d.status === 'draft')) {
    return 'ACTIVE';
  }
  if (thread.plans.length > 0 && thread.plans.every(p => p.status === 'done')) {
    return 'DONE';
  }
  return 'ACTIVE';
}

export function getThreadPhase(thread: Thread): ThreadPhase {
  const { idea, design, plans } = thread;

  if (plans.some(p => p.status === 'implementing' || p.status === 'done')) {
    return 'implementing';
  }
  if (plans.length > 0) {
    return 'planning';
  }
  if (design) {
    return 'designing';
  }
  return 'ideating';
}

export function isPlanStale(plan: any, design: any): boolean {
  return plan.design_version < design.version;
}
```

---

## Step 6 — Basic Tests / Usage Example

**File:** `packages/core/test/applyEvent.test.ts`

```typescript
import { applyEvent } from '../src/applyEvent';
import { Thread } from '../src/types';

describe('applyEvent', () => {
  test('REFINE_DESIGN increments version and sets refined flag', () => {
    const thread: Thread = {
      id: 'test-thread',
      design: {
        type: 'design',
        id: 'test-design',
        status: 'active',
        version: 1,
      },
      plans: [],
      allDocs: [/* ... */],
    } as any;

    const updated = applyEvent(thread, { type: 'REFINE_DESIGN' });
    expect(updated.design.version).toBe(2);
    expect(updated.design.refined).toBe(true);
  });
});
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |