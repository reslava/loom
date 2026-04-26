---
type: plan
id: validation-utils-plan-001
title: "Extract Validation Utilities"
status: done
created: 2026-04-16
version: 1
design_version: 1
tags: [refactor, validation, utilities]
parent_id: body-generators-design
target_version: "0.4.0"
requires_load: [body-generators-design]
---

# Plan — Extract Validation Utilities

| | |
|---|---|
| **Created** | 2026-04-16 |
| **Status** | DRAFT |
| **Design** | `body-generators-design.md` |
| **Target version** | 0.4.0 |

---

# Goal

Centralize all document relationship validation logic into pure functions within `packages/core/src/validation.ts`. This eliminates duplication between `loom validate`, the link index, and `loadThread`, and ensures consistent validation rules across the entire system.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create `validation.ts` with core validation functions | `packages/core/src/validation.ts` | — |
| ✅ | 2 | Refactor `validate.ts` CLI command to use utilities | `packages/cli/src/commands/validate.ts` | Step 1 |
| ✅ | 3 | Update `loadThread` to use validation utilities for warnings | `packages/fs/src/loadThread.ts` | Step 1 |
| ✅ | 4 | Integrate validation into link index builder | `packages/fs/src/buildLinkIndex.ts` | Step 1 |
| ✅ | 5 | Remove duplicated validation logic | All above | Steps 2-4 |
| ✅ | 6 | Run full test suite | `tests/*` | Step 5 |

---

## Step 1 — Create `validation.ts`

**File:** `packages/core/src/validation.ts`

```typescript
import { Document, PlanDoc, DesignDoc } from './types';
import { LinkIndex } from './linkIndex';

export interface ValidationIssue {
    documentId: string;
    severity: 'error' | 'warning';
    message: string;
}

/**
 * Checks if a document's parent_id exists in the index.
 */
export function validateParentExists(doc: Document, index: LinkIndex): boolean {
    if (!doc.parent_id) return true;
    return index.documents.has(doc.parent_id);
}

/**
 * Returns a list of child_ids that do not exist in the index.
 */
export function getDanglingChildIds(doc: Document, index: LinkIndex): string[] {
    if (!doc.child_ids) return [];
    return doc.child_ids.filter(id => !index.documents.has(id));
}

/**
 * Validates that a plan's design_version matches its parent design's version.
 */
export function validatePlanDesignVersion(plan: PlanDoc, index: LinkIndex): boolean {
    const parentId = plan.parent_id;
    if (!parentId) return true;
    
    const parentEntry = index.documents.get(parentId);
    if (!parentEntry) return false;
    
    // Note: This requires loading the parent document to check its version.
    // The full implementation will use a document cache.
    return true; // Placeholder
}

/**
 * Validates step blockers in a plan.
 * Returns an array of issues for each invalid blocker.
 */
export function validateStepBlockers(plan: PlanDoc, index: LinkIndex): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!plan.steps) return issues;
    
    for (const step of plan.steps) {
        if (!step.blockedBy) continue;
        
        for (const blocker of step.blockedBy) {
            // Check if blocker is a step within the same plan
            if (blocker.startsWith('Step ')) {
                const stepNum = parseInt(blocker.replace('Step ', ''), 10);
                if (isNaN(stepNum) || stepNum < 1 || stepNum > plan.steps.length) {
                    issues.push({
                        documentId: plan.id,
                        severity: 'error',
                        message: `Step ${step.order}: invalid blocker "${blocker}"`,
                    });
                }
                continue;
            }
            
            // Check if blocker is another plan
            if (blocker.includes('-plan-')) {
                if (!index.documents.has(blocker)) {
                    issues.push({
                        documentId: plan.id,
                        severity: 'warning',
                        message: `Step ${step.order}: blocked by missing plan "${blocker}"`,
                    });
                }
                continue;
            }
            
            // Unknown blocker format
            issues.push({
                documentId: plan.id,
                severity: 'warning',
                message: `Step ${step.order}: unknown blocker format "${blocker}"`,
            });
        }
    }
    
    return issues;
}

/**
 * Validates a design's role.
 */
export function validateDesignRole(doc: DesignDoc): ValidationIssue | null {
    if (!doc.role) {
        return {
            documentId: doc.id,
            severity: 'warning',
            message: 'Design missing role field (should be "primary" or "supporting")',
        };
    }
    if (doc.role !== 'primary' && doc.role !== 'supporting') {
        return {
            documentId: doc.id,
            severity: 'error',
            message: `Invalid role "${doc.role}" (must be "primary" or "supporting")`,
        };
    }
    return null;
}
```

---

## Step 2 — Refactor `validate.ts` CLI Command

Replace inline validation logic in `packages/cli/src/commands/validate.ts` with calls to the new utilities.

**Key changes:**
- Use `validateParentExists` to check `parent_id`.
- Use `getDanglingChildIds` for `child_ids`.
- Use `validateStepBlockers` for plan step dependencies.
- Use `validateDesignRole` for design documents.

---

## Step 3 — Update `loadThread.ts`

During thread loading, use the validation utilities to emit warnings for non‑critical issues (e.g., missing `role` field, stale plans).

---

## Step 4 — Integrate into Link Index Builder

In `buildLinkIndex.ts`, use the validation utilities to flag issues during the initial scan. This will allow the link index to pre‑compute validation results for faster queries.

---

## Step 5 — Remove Duplicated Logic

Delete any remaining inline validation code from the refactored files.

---

## Step 6 — Run Tests

```bash
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
