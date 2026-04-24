---
type: plan
id: archived-document-link-handling-plan-001
title: "Handle Links to Archived Documents Gracefully"
status: active
created: 2026-04-18
version: 1
tags: [validation, link-index, archive, ux]
parent_id: core-engine-design
target_version: "0.5.0"
requires_load: [core-engine-design, link-index-design]
---

# Plan — Handle Links to Archived Documents Gracefully

| | |
|---|---|
| **Created** | 2026-04-18 |
| **Status** | DRAFT |
| **Design** | `core-engine-design.md` |
| **Target version** | 0.5.0 |

---

# Goal

Modify link validation and status display to treat references to **archived** documents as informational rather than errors. When a document is moved to `_archive/`, any inbound links (`parent_id`, `child_ids`, `Blocked by`) should not trigger validation errors, but should be displayed with an archive indicator (🗄️).

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Extend `DocumentEntry` with `archived` flag | `packages/core/src/linkIndex.ts` | — |
| 🔳 | 2 | Update `buildLinkIndex` to set `archived` based on path | `packages/fs/src/repositories/linkRepository.ts` | Step 1 |
| 🔳 | 3 | Modify `validateParentExists` to treat archived parents as valid | `packages/core/src/validation.ts` | Step 1 |
| 🔳 | 4 | Modify `getDanglingChildIds` to ignore archived children | `packages/core/src/validation.ts` | Step 1 |
| 🔳 | 5 | Update `loom status` to show archive indicator for archived references | `packages/app/src/status.ts`, `packages/cli/src/commands/status.ts` | Steps 3, 4 |
| 🔳 | 6 | Update `loom validate` to skip archived reference errors | `packages/cli/src/commands/validate.ts` | Steps 3, 4 |
| 🔳 | 7 | Run full test suite | All packages, `tests/*` | Step 6 |

---

## Step 1 — Extend `DocumentEntry` with `archived` Flag

**File:** `packages/core/src/linkIndex.ts`

```typescript
export interface DocumentEntry {
    path: string;
    type: DocumentType;
    exists: boolean;
    archived: boolean;   // ← new field
}
```

Update `createEmptyIndex` accordingly (not strictly necessary since it's a map).

---

## Step 2 — Update `buildLinkIndex` to Set `archived`

**File:** `packages/fs/src/repositories/linkRepository.ts`

When creating a `DocumentEntry`:

```typescript
const entry: DocumentEntry = {
    path: filePath,
    type: doc.type,
    exists: true,
    archived: filePath.includes('_archive'),   // ← new
};
```

---

## Step 3 — Modify `validateParentExists`

**File:** `packages/core/src/validation.ts`

```typescript
export function validateParentExists(doc: Document, index: LinkIndex): boolean {
    if (!doc.parent_id) return true;
    const parent = index.documents.get(doc.parent_id);
    if (!parent) return false;
    // Archived parents are considered valid (no error)
    return parent.exists || parent.archived;
}
```

---

## Step 4 — Modify `getDanglingChildIds`

**File:** `packages/core/src/validation.ts`

```typescript
export function getDanglingChildIds(doc: Document, index: LinkIndex): string[] {
    if (!doc.child_ids) return [];
    return doc.child_ids.filter(id => {
        const child = index.documents.get(id);
        if (!child) return true; // missing entirely
        // Archived children are NOT dangling
        return !child.exists && !child.archived;
    });
}
```

---

## Step 5 — Update `loom status` to Show Archive Indicator

**File:** `packages/app/src/status.ts` and `packages/cli/src/commands/status.ts`

When displaying a document that has a `parent_id` pointing to an archived document, add a visual indicator:

```typescript
const parentEntry = index.documents.get(doc.parent_id);
if (parentEntry?.archived) {
    console.log(`   🗄️ parent: ${doc.parent_id} (archived)`);
}
```

Similarly, for `child_ids` and `Blocked by` references.

---

## Step 6 — Update `loom validate` to Skip Archived Reference Errors

The changes in Steps 3 and 4 already prevent validation errors for archived links. Verify that `validate` no longer reports them.

---

## Step 7 — Run Full Test Suite

```bash
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
npx ts-node --project tests/tsconfig.json tests/weave-workflow.test.ts
```

All tests must pass. Add new tests to verify archived link behavior.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |