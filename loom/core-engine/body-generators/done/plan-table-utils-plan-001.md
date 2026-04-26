---
type: plan
id: plan-table-utils-plan-001
title: "Extract Plan Table Utilities"
status: done
created: 2026-04-16
version: 1
design_version: 1
tags: [refactor, utilities, markdown, table, plan]
parent_id: body-generators-design
target_version: "0.4.0"
requires_load: [body-generators-design]
---

# Plan — Extract Plan Table Utilities

| | |
|---|---|
| **Created** | 2026-04-16 |
| **Status** | DRAFT |
| **Design** | `body-generators-design.md` |
| **Target version** | 0.4.0 |

---

# Goal

Centralize all Markdown table parsing and generation for plan steps into a single module (`packages/core/src/planTableUtils.ts`). This isolates the fragile table format logic and eliminates duplication between `load.ts` and `save.ts`.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create `planTableUtils.ts` with `parseStepsTable` and `generateStepsTable` | `packages/core/src/planTableUtils.ts` | — |
| ✅  | 2 | Refactor `load.ts` to use `parseStepsTable` | `packages/fs/src/load.ts` | Step 1 |
| ✅ | 3 | Refactor `save.ts` to use `generateStepsTable` | `packages/fs/src/save.ts` | Step 1 |
| ✅ | 4 | Remove duplicated table logic from `load.ts` and `save.ts` | Both files | Steps 2-3 |
| ✅ | 5 | Run full test suite | `tests/*` | Step 4 |

---

## Step 1 — Create `planTableUtils.ts`

**File:** `packages/core/src/planTableUtils.ts`

```typescript
export interface PlanStep {
    order: number;
    description: string;
    done: boolean;
    files_touched: string[];
    blockedBy: string[];
}

/**
 * Parses the steps table from a plan document's Markdown content.
 */
export function parseStepsTable(content: string): PlanStep[] {
    const steps: PlanStep[] = [];
    
    const stepsSectionMatch = content.match(/# Steps\s*\n([\s\S]*?)(?=\n---|\n##|$)/i);
    if (!stepsSectionMatch) return steps;
    
    const section = stepsSectionMatch[1];
    const lines = section.split('\n');
    
    for (const line of lines) {
        if (!line.includes('|') || line.includes('|---')) continue;
        if (line.includes('Done') && line.includes('Step')) continue;
        
        const cols = line.split('|').map(c => c.trim()).filter(c => c !== '');
        if (cols.length < 4) continue;
        
        const doneSymbol = cols[0];
        const order = parseInt(cols[1], 10);
        const description = cols[2];
        const filesTouched = (cols[3] === '—' || cols[3] === '-') ? [] : cols[3].split(',').map(s => s.trim());
        const blockedByRaw = cols[4] || '—';
        
        const done = doneSymbol === '✅';
        const blockedBy = (blockedByRaw === '—' || blockedByRaw === '-') ? [] : blockedByRaw.split(',').map(s => s.trim());
        
        if (!isNaN(order)) {
            steps.push({ order, description, done, files_touched: filesTouched, blockedBy });
        }
    }
    
    return steps;
}

/**
 * Generates the steps table Markdown from an array of plan steps.
 */
export function generateStepsTable(steps: PlanStep[]): string {
    if (!steps.length) return '';
    
    const header = '| Done | # | Step | Files touched | Blocked by |';
    const separator = '|---|---|---|---|---|';
    const rows = steps.map(s => {
        const done = s.done ? '✅' : '🔳';
        const files = s.files_touched?.length ? s.files_touched.join(', ') : '—';
        const blockers = s.blockedBy?.length ? s.blockedBy.join(', ') : '—';
        return `| ${done} | ${s.order} | ${s.description} | ${files} | ${blockers} |`;
    });
    
    return [header, separator, ...rows].join('\n');
}

/**
 * Replaces or appends the steps table in the given document content.
 */
export function updateStepsTableInContent(originalContent: string, steps: PlanStep[]): string {
    const newTable = generateStepsTable(steps);
    
    const stepsRegex = /# Steps\s*\n([\s\S]*?)(?=\n---|\n##|$)/i;
    if (stepsRegex.test(originalContent)) {
        return originalContent.replace(stepsRegex, `# Steps\n\n${newTable}`);
    }
    
    const goalRegex = /(# Goal\s*\n[\s\S]*?)(?=\n---|\n##|$)/i;
    if (goalRegex.test(originalContent)) {
        return originalContent.replace(goalRegex, `$1\n\n# Steps\n\n${newTable}`);
    }
    
    return `${originalContent}\n\n# Steps\n\n${newTable}`;
}
```

---

## Step 2 — Refactor `load.ts`

**File:** `packages/fs/src/load.ts`

- Import `parseStepsTable` from `../../core/dist/planTableUtils`.
- Replace the local `parseStepsTable` function with the imported version.
- Delete the local implementation.

---

## Step 3 — Refactor `save.ts`

**File:** `packages/fs/src/save.ts`

- Import `updateStepsTableInContent` from `../../core/dist/planTableUtils`.
- Replace the local `generateStepsTable` logic with a call to `updateStepsTableInContent(doc.content, doc.steps)`.
- Delete the local `generateStepsTable` function.

---

## Step 4 — Remove Duplicated Logic

Ensure no residual table parsing or generation code remains in `load.ts` or `save.ts`.

---

## Step 5 — Run Tests

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