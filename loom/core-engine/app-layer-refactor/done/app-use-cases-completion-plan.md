---
type: plan
id: app-use-cases-completion-plan
title: "Complete Application Layer Use‑Cases and Thin CLI Wrappers"
status: done
created: 2026-04-17
version: 1
tags: [app, cli, refactor, use-cases]
parent_id: app-layer-refactor-design
target_version: "0.5.0"
requires_load: [app-layer-refactor-design]
---

# Plan — Complete Application Layer Use‑Cases and Thin CLI Wrappers

| | |
|---|---|
| **Created** | 2026-04-17 |
| **Status** | DRAFT |
| **Design** | `app-layer-refactor-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Move all remaining orchestration logic out of the CLI layer into dedicated `app` use‑cases. Implement the missing `weaveDesign` and `weavePlan` use‑cases to complete the core workflow. Refactor existing CLI commands to become thin wrappers that only handle user input and output. This establishes a clean, reusable application layer that can be shared identically between the CLI and the future VS Code extension.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Extract `weaveIdea` use‑case from CLI | `app/src/weaveIdea.ts`, `cli/src/commands/weave.ts` | — |
| ✅ | 2 | Implement `weaveDesign` use‑case | `app/src/weaveDesign.ts` | Step 1 |
| ✅ | 3 | Implement `weavePlan` use‑case | `app/src/weavePlan.ts` | Step 1 |
| ✅ | 4 | Add `weave design` and `weave plan` CLI commands | `cli/src/commands/weaveDesign.ts`, `cli/src/commands/weavePlan.ts`, `cli/src/index.ts` | Steps 2, 3 |
| ✅ | 5 | Refactor remaining CLI commands to use `app` layer exclusively | `cli/src/commands/*.ts` | Step 1 |
| ✅ | 6 | Update `app/src/index.ts` barrel exports | `app/src/index.ts` | Steps 1‑4 |
| ✅ | 7 | Run full build and test suite | All packages, `tests/*` | Step 6 |

---

## Step 1 — Extract `weaveIdea` Use‑Case from CLI

Move the orchestration logic currently in `cli/src/commands/weave.ts` into a new use‑case file.

**File:** `app/src/weaveIdea.ts`

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../fs/dist';
import { generateTempId, toKebabCaseId } from '../../core/dist';
import { createBaseFrontmatter, serializeFrontmatter } from '../../core/dist';
import { generateIdeaBody } from '../../core/dist';

export interface WeaveIdeaInput {
    title: string;
    thread?: string;
}

export interface WeaveIdeaDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    fs: typeof fs;
}

export async function weaveIdea(
    input: WeaveIdeaInput,
    deps: WeaveIdeaDeps
): Promise<{ tempId: string; filePath: string }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const threadName = input.thread || toKebabCaseId(input.title);
    const threadPath = path.join(threadsDir, threadName);

    await deps.fs.ensureDir(threadPath);

    const tempId = generateTempId('idea');
    const frontmatter = createBaseFrontmatter('idea', tempId, input.title);
    const content = generateIdeaBody(input.title);

    const frontmatterYaml = serializeFrontmatter(frontmatter);
    const output = `${frontmatterYaml}\n${content}`;
    const filePath = path.join(threadPath, `${tempId}.md`);

    await deps.fs.outputFile(filePath, output);

    return { tempId, filePath };
}
```

**Update `cli/src/commands/weave.ts`** to become a thin wrapper:

```typescript
import chalk from 'chalk';
import { weaveIdea } from '../../../app/dist';
import { getActiveLoomRoot } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function weaveIdeaCommand(title: string, options: { thread?: string }): Promise<void> {
    try {
        const result = await weaveIdea(
            { title, thread: options.thread },
            { getActiveLoomRoot, fs }
        );
        console.log(chalk.green(`🧵 Idea woven at ${result.filePath}`));
        console.log(chalk.gray(`   Temporary ID: ${result.tempId}`));
        console.log(chalk.gray(`   Run 'loom finalize ${result.tempId}' when the title is final.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
```

---

## Step 2 — Implement `weaveDesign` Use‑Case (with Auto‑Finalize)

Create the use‑case for generating a design document from an existing idea. If the idea is not yet finalized (has a temporary ID), it is **automatically finalized** before the design is created. This eliminates friction in the happy path.

**File:** `app/src/weaveDesign.ts`

**Key additions:**
- `findIdeaFile()` locates any idea document (temporary or finalized) in the thread.
- If the idea ID starts with `new-`, the use‑case calls `finalizeIdea()` (inline or via `finalize` use‑case) to generate a permanent ID and update the idea's status to `active`.
- After auto‑finalization, the design is created with `parent_id` pointing to the finalized idea.

**Behavior:**
| Scenario | Result |
| :--- | :--- |
| Thread has finalized idea | Creates design linked to that idea. |
| Thread has temporary idea only | Auto‑finalizes idea, then creates design. |
| No idea in thread | Throws error: "No idea found." |

---

## Step 3 — Implement `weavePlan` Use‑Case

**Implemented.** The `weavePlan` use‑case creates a new plan document. If the parent design is not already `done`, it is automatically finalized.

**Persistence Correction:**  
The original implementation used direct `fs.outputFile` for the plan document. This has been **corrected** to use `saveDoc` from the `fs` layer, ensuring:
- `_path` is never serialized to frontmatter.
- The steps table is correctly generated via `generateStepsTable`.
- Consistent YAML formatting via `serializeFrontmatter`.

The `weavePlan` use‑case now depends on `saveDoc` and uses it for both the auto‑finalized design and the new plan document.

Create the use‑case for generating a plan from a finalized design.

**File:** `app/src/weavePlan.ts`

---

## Step 4 — Add `weave design` and `weave plan` CLI Commands

Create thin CLI wrappers for the new use‑cases.

**File:** `cli/src/commands/weaveDesign.ts`

```typescript
import chalk from 'chalk';
import { weaveDesign } from '../../../app/dist';
import { getActiveLoomRoot, loadThread } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function weaveDesignCommand(threadId: string, options: { title?: string }): Promise<void> {
    try {
        const result = await weaveDesign(
            { threadId, title: options.title },
            { getActiveLoomRoot, loadThread, fs }
        );
        console.log(chalk.green(`🧵 Design woven at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
```

**File:** `cli/src/commands/weavePlan.ts`

```typescript
import chalk from 'chalk';
import { weavePlan } from '../../../app/dist';
import { getActiveLoomRoot, loadThread } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function weavePlanCommand(threadId: string, options: { title?: string; goal?: string }): Promise<void> {
    try {
        const result = await weavePlan(
            { threadId, title: options.title, goal: options.goal },
            { getActiveLoomRoot, loadThread, fs }
        );
        console.log(chalk.green(`🧵 Plan woven at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
```

**Update `cli/src/index.ts`** to register the new commands.

---

## Step 5 — Refactor Remaining CLI Commands

Ensure all existing CLI commands (`finalize`, `rename`, `refine`, `startPlan`, `completeStep`, `summarise`, `validate`, `status`) are thin wrappers that delegate to the corresponding `app` use‑cases. (This was largely done in `app-layer-refactor-plan-001`; this step is a verification pass.)

---

## Step 6 — Update `app/src/index.ts` Barrel Exports

Add the new use‑cases to the barrel export.

```typescript
export { weaveIdea, WeaveIdeaInput, WeaveIdeaDeps } from './weaveIdea';
export { weaveDesign, WeaveDesignInput, WeaveDesignDeps } from './weaveDesign';
export { weavePlan, WeavePlanInput, WeavePlanDeps } from './weavePlan';
```

---

## Step 7 — Run Full Build and Test Suite

```bash
./scripts/build-all.sh
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
```

All tests must pass. CLI commands should behave identically to before.

---

# Outcome

- Complete, reusable `app` layer covering the full happy‑path workflow.
- CLI commands are thin presentation wrappers.
- Zero code duplication between CLI and future VS Code extension.
- All document persistence flows through `saveDoc`, ensuring consistent frontmatter formatting and no `_path` leakage.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |