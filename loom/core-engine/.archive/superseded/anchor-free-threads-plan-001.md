---
type: plan
id: anchor-free-threads-plan-001
title: "Implement Anchor‑Free Threads (Phased Migration)"
status: done
created: 2026-04-20
version: 1
tags: [thread, domain-model, graph, zero-friction, migration, deferred]
parent_id: anchor-free-threads-design
target_version: "0.7.0"
requires_load: [anchor-free-threads-design]
supersedes: [draft-threads-plan-001]
---

# Plan — Implement Anchor‑Free Threads (Phased Migration)

| | |
|---|---|
| **Created** | 2026-04-20 |
| **Status** | DEFERRED |
| **Design** | `anchor-free-threads-design.md` |
| **Target version** | 0.7.0 |

---

# Goal

Transform Loom's thread model from a linear, design‑centric structure to a zero‑friction, graph‑based workbench. A thread is any folder under `threads/` containing at least one Loom document. Physical grouping is separate from logical relationships (`parent_id`). The implementation will follow a **phased migration strategy** to minimize risk and keep the system stable at each step.

---

# Phased Migration Strategy

Due to the significant impact of changing `Thread` from a single `design` to `designs[]`, this plan is structured in three phases.

| Phase | Goal | Success Criteria |
| :--- | :--- | :--- |
| **1. Internal Model** | Introduce the new `Thread` structure while maintaining backward compatibility via a `getPrimaryDesign()` helper. | All existing tests pass. No visible change in CLI or VS Code. |
| **2. Incremental Refactor** | Update each layer (`core`, `fs`, `app`, `cli`, `vscode`) to work with multiple designs. | Each layer's tests pass after refactoring. System remains fully functional. |
| **3. Cleanup** | Remove the `getPrimaryDesign()` helper and any deprecated code. | System fully supports anchor‑free threads. No dead code remains. |

---

# Steps

## Phase 1: Internal Model

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1.1 | Redefine `Thread` interface with `designs[]` | `packages/core/src/entities/thread.ts` | — |
| ✅ | 1.2 | Add `getPrimaryDesign(thread: Thread): DesignDoc \| undefined` helper | `packages/core/src/entities/thread.ts` | Step 1.1 |
| ✅ | 1.3 | Update `getThreadStatus` to use the refined plan‑only priority order | `packages/core/src/derived.ts` | Step 1.1 |
| ✅ | 1.4 | Update `loadThread` to return `null` for empty folders | `packages/fs/src/repositories/threadRepository.ts` | Step 1.1 |
| ✅ Not needed (no dependency) | 1.5 | Update `buildLinkIndex` to use `getPrimaryDesign()` where needed | `packages/fs/src/repositories/linkRepository.ts` | Step 1.2 |
| ✅ | 1.6 | Run full test suite to verify no regressions | All packages | Steps 1.1‑1.5 |

---

### Step 1.1 — Redefine `Thread` Interface

**File:** `packages/core/src/entities/thread.ts`

```typescript
import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';
import { Document } from './document';

export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE' | 'BLOCKED';
export type ThreadPhase = 'ideating' | 'designing' | 'planning' | 'implementing';

export interface Thread {
    id: string;
    ideas: IdeaDoc[];
    designs: DesignDoc[];
    plans: PlanDoc[];
    contexts: CtxDoc[];
    allDocs: Document[];
}

/**
 * Temporary helper to maintain backward compatibility during migration.
 * Returns the first design in the array (or the one with role: 'primary' if present).
 * @deprecated Will be removed in Phase 3.
 */
export function getPrimaryDesign(thread: Thread): DesignDoc | undefined {
    const primary = thread.designs.find(d => d.role === 'primary');
    return primary || thread.designs[0];
}
```

---

### Step 1.2 — Add `getPrimaryDesign` Helper

*Included in Step 1.1 above.*

---

### Step 1.3 — Update `getThreadStatus` (Refined Plan‑Only Priority)

**File:** `packages/core/src/derived.ts`

```typescript
import { Thread, ThreadStatus } from './entities/thread';

export function getThreadStatus(thread: Thread): ThreadStatus {
    const plans = thread.plans;
    
    // 1. Implementing wins over everything
    if (plans.some(p => p.status === 'implementing')) {
        return 'IMPLEMENTING';
    }
    
    // 2. All plans done -> thread done
    if (plans.length > 0 && plans.every(p => p.status === 'done')) {
        return 'DONE';
    }
    
    // 3. Any plan active or draft?
    if (plans.some(p => p.status === 'active' || p.status === 'draft')) {
        return 'ACTIVE';
    }
    
    // 4. Any plan blocked? (Only reached if no plan is implementing/active/draft)
    if (plans.some(p => p.status === 'blocked')) {
        return 'BLOCKED';
    }
    
    // 5. Fallback: thread has ideas/designs but no plans yet
    return 'ACTIVE';
}
```

---

### Step 1.4 — Update `loadThread` to Return `null` for Empty Folders

**File:** `packages/fs/src/repositories/threadRepository.ts`

```typescript
export async function loadThread(loomRoot: string, threadId: string, index?: LinkIndex): Promise<Thread | null> {
    const threadPath = resolveThreadPath(loomRoot, threadId);
    if (!await fs.pathExists(threadPath)) {
        throw new Error(`Thread directory not found: ${threadPath}`);
    }
    
    const files = await findMarkdownFiles(threadPath);
    const docs: Document[] = [];
    
    for (const file of files) {
        try {
            docs.push(await loadDoc(file) as Document);
        } catch (e) {
            if (e instanceof FrontmatterParseError) {
                console.warn(`Skipping ${file}: ${e.message}`);
            } else {
                throw e;
            }
        }
    }
    
    // Empty folder is not a thread
    if (docs.length === 0) {
        return null;
    }
    
    const ideas = docs.filter(d => d.type === 'idea') as IdeaDoc[];
    const designs = docs.filter(d => d.type === 'design') as DesignDoc[];
    const plans = docs.filter(d => d.type === 'plan') as PlanDoc[];
    const contexts = docs.filter(d => d.type === 'ctx') as CtxDoc[];
    
    // Validation warnings (optional, using provided index)
    // ...
    
    return {
        id: threadId,
        ideas,
        designs,
        plans,
        contexts,
        allDocs: docs,
    };
}
```

---

### Step 1.5 — Update `buildLinkIndex` to Use `getPrimaryDesign()`

**File:** `packages/fs/src/repositories/linkRepository.ts`

```typescript
import { getPrimaryDesign } from '../../../core/dist/entities/thread';

// Inside buildLinkIndex, where we previously accessed thread.design:
// const primaryDesign = getPrimaryDesign(thread);
// Use primaryDesign instead of thread.design
```

---

### Step 1.6 — Run Full Test Suite

```bash
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/weave-workflow.test.ts
```

All tests must pass before proceeding to Phase 2.

---

## Phase 2: Incremental Refactor

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 2.1 | Refactor `core` consumers to use `designs[]` directly | `packages/core/src/derived.ts`, `validation.ts` | Phase 1 |
| ✅ | 2.2 | Refactor `fs` layer | `packages/fs/src/repositories/linkRepository.ts` | Phase 1 |
| ✅ | 2.3 | Refactor `app` layer use‑cases | ✅`getState.ts`, `summarise.ts`, `validate.ts`, `weaveDesign.ts`, `weavePlan.ts`, `status.ts` | Phase 1 |
| ✅ | 2.4 | Refactor `cli` commands | `status.ts`, `validate.ts` | Phase 1 |
| ✅ | 2.5 | Refactor `vscode` tree provider | `treeProvider.ts` | Phase 1 |
| ✅ Multi-loom ⏳ Deferred (test update needed) | 2.6 | Run full test suite after each layer | All packages | — |

---

## Phase 3: Cleanup

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 3.1 | Remove `getPrimaryDesign()` helper | `packages/core/src/entities/thread.ts` | Phase 2 |
| ✅ | 3.2 | Remove `validateSinglePrimaryDesign` | `packages/core/src/validation.ts` | Phase 2 |
| ✅ | 3.3 | Update documentation to reflect anchor‑free model | `README.md`, `references/` | Phase 2 |
| ✅ | 3.4 | Run final full test suite | All packages | Steps 3.1‑3.3 |

---

# Outcome

- Threads can originate from any document type.
- Empty folders are ignored.
- Thread status reflects execution progress of plans.
- The UI provides global creation tools and contextual inline actions.
- The codebase is clean, with no deprecated helpers.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |