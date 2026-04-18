---
type: plan
id: body-generators-plan-001
title: "Implement Document Body Generators"
status: done
created: 2026-04-16
version: 1
design_version: 1
tags: [refactor, generators, templates, body]
parent_id: body-generators-design
target_version: "0.4.0"
requires_load: [body-generators-design]
---

# Plan — Implement Document Body Generators

| | |
|---|---|
| **Created** | 2026-04-16 |
| **Status** | DRAFT |
| **Design** | `body-generators-design.md` |
| **Target version** | 0.4.0 |

---

# Goal

Replace hardcoded document templates and the `.loom/templates/` directory with pure TypeScript body generators. This ensures a single source of truth for document structure and simplifies document creation.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create `ideaBody.ts` generator | `packages/core/src/bodyGenerators/ideaBody.ts` | — |
| ✅ | 2 | Create `designBody.ts` generator | `packages/core/src/bodyGenerators/designBody.ts` | — |
| ✅ | 3 | Create `planBody.ts` generator | `packages/core/src/bodyGenerators/planBody.ts` | — |
| ✅ | 4 | Create `ctxBody.ts` generator | `packages/core/src/bodyGenerators/ctxBody.ts` | — |
| ✅ | 5 | Update `weave.ts` to use generators | `packages/cli/src/commands/weave.ts` | Steps 1-4 |
| ✅ | 6 | Update `summarise.ts` to use `ctxBody` | `packages/cli/src/commands/summarise.ts` | Step 4 |
| ✅ | 7 | Update test utilities to use generators | `tests/test-utils.ts` | Steps 1-4 |
| ✅ | 8 | Remove `.loom/templates/` directory | `.loom/templates/` | Step 5 |
| ✅ | 9 | Run full test suite | `tests/*` | All |

---

## Step 1 — Create `ideaBody.ts`

**File:** `packages/core/src/bodyGenerators/ideaBody.ts`

```typescript
export function generateIdeaBody(title: string): string {
    return `# ${title}

## Problem
<!-- What pain or gap does this idea address? -->

## Idea
<!-- The core concept in 2-3 sentences. -->

## Why now
<!-- What makes this worth pursuing at this point? -->

## Open questions
<!-- What needs to be answered before committing to a design? -->

## Next step
<!-- design | spike | discard -->
`;
}
```

---

## Step 2 — Create `designBody.ts`

**File:** `packages/core/src/bodyGenerators/designBody.ts`

```typescript
export function generateDesignBody(title: string, userName: string = 'User'): string {
    return `# ${title}

## Goal
<!-- What does this design solve? One paragraph. -->

## Context
<!-- Background, constraints, prior art, related designs. -->

# CHAT

## ${userName}:
<!-- Start here — describe the problem or idea to explore. -->
`;
}
```

---

## Step 3 — Create `planBody.ts`

**File:** `packages/core/src/bodyGenerators/planBody.ts`

```typescript
export function generatePlanBody(title: string, goal?: string): string {
    const goalSection = goal ? `\n${goal}\n` : '\n<!-- One paragraph: what this plan implements and why. -->\n';
    
    return `# Plan — ${title}

| | |
|---|---|
| **Created** | ${new Date().toISOString().split('T')[0]} |
| **Status** | DRAFT |
| **Design** | \`{design-id}.md\` |
| **Target version** | {X.X.X} |

---

# Goal
${goalSection}
---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | {Step description} | \`src/...\` | — |

---

## Step 1 — {Step description}

<!-- Detailed spec for Step 1. -->

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
`;
}
```

---

## Step 4 — Create `ctxBody.ts`

**File:** `packages/core/src/bodyGenerators/ctxBody.ts`

```typescript
export interface CtxSummaryData {
    goal: string;
    context: string;
    decisions: string[];
    questions: string[];
    plans: Array<{ id: string; status: string; progress: string }>;
}

export function generateCtxBody(data: CtxSummaryData): string {
    const decisions = data.decisions.map(d => `- ${d}`).join('\n');
    const questions = data.questions.map(q => `- ${q}`).join('\n');
    const plans = data.plans.map(p => `- ${p.id} (status: ${p.status}, progress: ${p.progress})`).join('\n');
    
    return `# Design Context Summary

## Problem Statement
${data.goal}

## Context
${data.context}

## Key Decisions Made
${decisions}

## Open Questions
${questions}

## Active Plans
${plans}

---
*Generated: ${new Date().toISOString()}*
`;
}
```

---

## Step 5 — Update `weave.ts`

Replace hardcoded template strings with calls to `generateIdeaBody`.

---

## Step 6 — Update `summarise.ts`

Replace manual body construction with `generateCtxBody`.

---

## Step 7 — Update `test-utils.ts`

Replace inline template strings in `createDesignDoc` with `generateDesignBody`.

---

## Step 8 — Remove Templates Directory

```bash
rm -rf ~/.loom/templates
rm -rf .loom/templates
```

---

## Step 9 — Run Tests

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