---
type: plan
id: pl_01KQYDFDDAR92PJY3E98KNG2T9
title: Extract Path Utilities
status: done
created: "2026-04-16T00:00:00.000Z"
version: 1
design_version: 1
tags: [refactor, utilities, path, filesystem]
parent_id: de_01KQYDFDDAGJ0Q2B1E1R2ZQ67W
requires_load: [de_01KQYDFDDAGJ0Q2B1E1R2ZQ67W]
target_version: 0.4.0
steps:
  - id: create-pathutils
    order: 1
    status: done
    description: Create `pathUtils.ts` with core traversal functions
    files_touched: ["`packages/fs/src/pathUtils.ts`"]
    blocked_by: []
    satisfies: []
  - id: refactor-finalize
    order: 2
    status: done
    description: Refactor `finalize.ts` to use `pathUtils`
    files_touched: ["`packages/cli/src/commands/finalize.ts`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: refactor-rename
    order: 3
    status: done
    description: Refactor `rename.ts` to use `pathUtils`
    files_touched: ["`packages/cli/src/commands/rename.ts`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: refactor-buildlinkindex
    order: 4
    status: done
    description: Refactor `buildLinkIndex.ts` to use `pathUtils`
    files_touched: ["`packages/fs/src/buildLinkIndex.ts`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: remove-duplicated-functions-from-refactored-files
    order: 5
    status: done
    description: Remove duplicated functions from refactored files
    files_touched: [All above]
    blocked_by: [Steps 2-4]
    satisfies: []
  - id: run-full-test-suite
    order: 6
    status: done
    description: Run full test suite
    files_touched: ["`tests/*`"]
    blocked_by: [Step 5]
    satisfies: []
---

# Extract Path Utilities

| | |
|---|---|
| **Created** | 2026-04-16 |
| **Status** | DRAFT |
| **Design** | `body-generators-design.md` |
| **Target version** | 0.4.0 |

---

# Goal

Centralize all filesystem path resolution and traversal logic into a single module (`packages/fs/src/pathUtils.ts`). This eliminates duplication across `finalize.ts`, `rename.ts`, `buildLinkIndex.ts`, and future commands.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Create `pathUtils.ts` with core traversal functions | `packages/fs/src/pathUtils.ts` | — | — |
| ✅ | 2 | Refactor `finalize.ts` to use `pathUtils` | `packages/cli/src/commands/finalize.ts` | Step 1 | — |
| ✅ | 3 | Refactor `rename.ts` to use `pathUtils` | `packages/cli/src/commands/rename.ts` | Step 1 | — |
| ✅ | 4 | Refactor `buildLinkIndex.ts` to use `pathUtils` | `packages/fs/src/buildLinkIndex.ts` | Step 1 | — |
| ✅ | 5 | Remove duplicated functions from refactored files | All above | Steps 2-4 | — |
| ✅ | 6 | Run full test suite | `tests/*` | Step 5 | — |
---

## Step 1 — Create `pathUtils.ts`

**File:** `packages/fs/src/pathUtils.ts`

Export the following functions:

```typescript
export async function findMarkdownFiles(dir: string): Promise<string[]>
export async function findDocumentById(loomRoot: string, id: string): Promise<string | null>
export async function findThreadPath(loomRoot: string, threadId: string): Promise<string | null>
export async function gatherAllDocumentIds(loomRoot: string): Promise<Set<string>>
```

Implementation will be copied from existing functions in `finalize.ts`, `rename.ts`, and `buildLinkIndex.ts`.

---

## Step 2 — Refactor `finalize.ts`

Replace local `findDocumentByTempId` and `gatherAllDocumentIds` with imports from `pathUtils`.

---

## Step 3 — Refactor `rename.ts`

Replace local `findDocumentById`, `gatherAllDocumentIds`, and `findMarkdownFiles` with imports from `pathUtils`.

---

## Step 4 — Refactor `buildLinkIndex.ts`

Replace local `findMarkdownFiles` with import from `pathUtils`.

---

## Step 5 — Remove Duplicated Functions

Delete the now‑unused local functions from the refactored files.

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