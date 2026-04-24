---
type: plan
id: enforce-single-primary-design-plan-001
title: "Enforce Single Primary Design per Thread"
status: active
created: 2026-04-18
version: 1
tags: [validation, thread, design, core]
parent_id: core-engine-design
target_version: "0.5.0"
requires_load: [core-engine-design]
---

# Plan — Enforce Single Primary Design per Thread

| | |
|---|---|
| **Created** | 2026-04-18 |
| **Status** | DRAFT |
| **Design** | `core-engine-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Ensure every Loom thread contains **exactly one** primary design document. Threads with zero or multiple primary designs are invalid. This eliminates ambiguity in thread resolution, staleness detection, and workflow state derivation.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Add `validateSinglePrimaryDesign` to `core/src/validation.ts` | `packages/core/src/validation.ts` | — |
| 🔳 | 2 | Update `validate` CLI command to include this check | `packages/cli/src/commands/validate.ts` | Step 1 |
| 🔳 | 3 | Update `loadThread` to throw error on zero/multiple primary designs | `packages/fs/src/repositories/threadRepository.ts` | Step 1 |
| 🔳 | 4 | Update `app/src/status.ts` to reflect invalid threads correctly | `packages/app/src/status.ts` | Step 3 |
| 🔳 | 5 | Run full test suite | All packages, `tests/*` | Step 4 |

---

## Step 1 — Add `validateSinglePrimaryDesign` to `validation.ts`

**File:** `packages/core/src/validation.ts`

```typescript
import { Document, DesignDoc } from './types';

export function validateSinglePrimaryDesign(docs: Document[]): ValidationIssue | null {
    const primaryDesigns = docs.filter(d => d.type === 'design' && (d as DesignDoc).role === 'primary');
    if (primaryDesigns.length === 0) {
        return {
            documentId: 'thread',
            severity: 'error',
            message: 'Thread has no primary design document.',
        };
    }
    if (primaryDesigns.length > 1) {
        const ids = primaryDesigns.map(d => d.id).join(', ');
        return {
            documentId: 'thread',
            severity: 'error',
            message: `Thread has multiple primary designs: ${ids}. Only one is allowed.`,
        };
    }
    return null;
}
```

---

## Step 2 — Update `validate` CLI Command

**File:** `packages/cli/src/commands/validate.ts`

Inside `validateThreadWithIndex`, after gathering `docs`, add:

```typescript
const primaryIssue = validateSinglePrimaryDesign(docs);
if (primaryIssue) {
    issues.push(primaryIssue.message);
}
```

---

## Step 3 — Update `loadThread` to Throw on Invalid Primary Design Count

**File:** `packages/fs/src/repositories/threadRepository.ts`

Replace the current primary design detection with a strict count check:

```typescript
const primaryDesigns = docs.filter(d => d.type === 'design' && (d as DesignDoc).role === 'primary') as DesignDoc[];

if (primaryDesigns.length === 0) {
    throw new Error(`No primary design found for thread '${threadId}'`);
}
if (primaryDesigns.length > 1) {
    const ids = primaryDesigns.map(d => d.id).join(', ');
    throw new Error(`Thread '${threadId}' has multiple primary designs: ${ids}`);
}

const primaryDesign = primaryDesigns[0];
```

---

## Step 4 — Update `app/src/status.ts`

When a thread fails to load due to this error, `status` should report `INVALID`. This is already handled by the try/catch in `status`; no change required.

---

## Step 5 — Run Full Test Suite

```bash
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
npx ts-node --project tests/tsconfig.json tests/weave-workflow.test.ts
```

All tests must pass. New tests should be added to verify that threads with multiple primary designs are rejected.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
