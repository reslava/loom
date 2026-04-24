---
type: plan
id: linkRepository-fix-plan-001
title: "Fix linkRepository.ts — threads → weaves directory"
status: done
created: 2026-04-22
version: 1
tags: [bugfix, fs, linkRepository]
parent_id: vscode-extension-design
child_ids: []
requires_load: []
---

# Plan — Fix linkRepository.ts (threads → weaves)

| | |
|---|---|
| **Created** | 2026-04-22 |
| **Status** | DONE |
| **Bug** | `buildLinkIndex` scanned `threads/` (non-existent); link index was always empty |
| **Impact** | `loom validate`, diagnostics, and all cross-reference checks were silent no-ops |

---

## Root Cause

`packages/fs/src/repositories/linkRepository.ts` line 10:

```typescript
const threadsDir = path.join(loomRoot, 'threads');  // ❌ wrong
```

The project renamed `threads/` → `weaves/` during the anchor-free migration (plan `anchor-free-threads-plan-001`). `getState.ts` and `weaveRepository.ts` were updated but `linkRepository.ts` was missed.

Because `fs.existsSync(threadsDir)` returned `false`, `buildLinkIndex` returned an empty index on every call. No errors were thrown.

---

## Fix

| Done | # | Step | Files touched |
|------|---|------|---------------|
| ✅ | 1 | Change `'threads'` → `'weaves'` in `buildLinkIndex` | `packages/fs/src/repositories/linkRepository.ts:10` |

```typescript
// Before
const threadsDir = path.join(loomRoot, 'threads');

// After
const threadsDir = path.join(loomRoot, 'weaves');
```

---

## Acceptance Criterion

`buildLinkIndex(loomRoot)` returns a non-empty index with all documents from `weaves/` when the workspace has content.

---

## Notes

- `updateIndexForFile` is unaffected — it receives an explicit `filePath`, not a directory.
- The unused `loomRoot` parameter in `updateIndexForFile` is a pre-existing TS hint (6133); not addressed here.
