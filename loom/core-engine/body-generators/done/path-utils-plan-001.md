---
type: plan
id: path-utils-plan-001
title: "Extract Path Utilities"
status: done
created: 2026-04-16
version: 1
design_version: 1
tags: [refactor, utilities, path, filesystem]
parent_id: body-generators-design
target_version: "0.4.0"
requires_load: [body-generators-design]
---

# Plan — Extract Path Utilities

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

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Create `pathUtils.ts` with core traversal functions | `packages/fs/src/pathUtils.ts` | — |
| ✅ | 2 | Refactor `finalize.ts` to use `pathUtils` | `packages/cli/src/commands/finalize.ts` | Step 1 |
| ✅ | 3 | Refactor `rename.ts` to use `pathUtils` | `packages/cli/src/commands/rename.ts` | Step 1 |
| ✅ | 4 | Refactor `buildLinkIndex.ts` to use `pathUtils` | `packages/fs/src/buildLinkIndex.ts` | Step 1 |
| ✅ | 5 | Remove duplicated functions from refactored files | All above | Steps 2-4 |
| ✅ | 6 | Run full test suite | `tests/*` | Step 5 |

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