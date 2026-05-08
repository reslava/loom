---
type: plan
id: pl_01KQYDFDDBQQJG41AVKYW539PR
title: Doc IDs — ULID migration
status: done
created: "2026-05-05T00:00:00.000Z"
updated: "2026-05-05T00:00:00.000Z"
version: 2
design_version: 1
tags: []
parent_id: de_01KQYDFDDBE8A6JD6P57DM5HV4
requires_load: []
target_version: 0.1.0
---
# Plan — Doc IDs — ULID migration

| | |
|---|---|
| **Created** | 2026-05-05 |
| **Status** | DRAFT |
| **Design** | `doc-ids-design.md` v3 |
| **Target version** | 0.6.0 |

---

# Goal

Implement ULID-based doc identity end-to-end: mint ULIDs at creation, rewrite existing frontmatter, update the link index, adjust repo lookups, update the MCP surface, rename ctx files to plain `ctx.md`, consolidate weave-local refs into `loom/refs/`, ship the migration script, and add validation diagnostics.

---

# Steps


---

## ✅ Step 3 — Link index rewrite

**Goal:** replace the slug-primary link index with a ULID-primary index, add slug secondary index for refs, add backlink index.

**Changes in `packages/fs/src/linkRepository.ts`:**

- `buildLinkIndex(docs)` returns a new `LinkIndex` shape:
  ```ts
  interface LinkIndex {
    byId: Map<string, string>;          // ULID → absolute file path
    bySlug: Map<string, string>;        // slug → ULID (refs only)
    backlinks: Map<string, string[]>;   // ULID → [ULID] of docs that reference it
  }
  ```
- Backlinks are built from `parent_id` and each entry in `requires_load` (resolve slug → ULID via `bySlug` first).
- `resolveId(index, idOrSlug)` — accepts ULID or slug, returns ULID (or null if not found). Used by all consumers.
- Update all call sites in `app/` that use the old index shape.
- `buildLinkIndex` is still called once per `getState`, result passed through — no N+1.

**Acceptance:** `getState` builds successfully with the new index. Backlinks for a design doc include its child plans. `requires_load` slugs resolve to ULIDs.

---

## ✅ Step 4 — Repo + loader — lookup by `id` in frontmatter

**Goal:** all repo lookups use the `id` field in frontmatter as primary key; file path becomes a derived value from the index.

**Changes:**

- `packages/fs/src/weaveRepository.ts` — `loadWeave` registers each doc by its `id` (ULID or semantic). File path stored in the link index, not as a key.
- `packages/fs/src/threadRepository.ts` — `loadThread` walks the thread folder, parses frontmatter, registers each doc by `id`. Plan discovery still uses filename pattern (for ordering), but the canonical reference uses `id`.
- Remove any code that derives a doc's `id` from its filename. The `id` field in frontmatter is always authoritative.
- `getDoc(index, id)` — single lookup function used by both repos; `id` can be ULID or semantic.

**Acceptance:** loading a thread whose files have been moved (but frontmatter `id` unchanged) still returns the correct doc graph. Tests cover a moved-file scenario.

---

## ✅ Step 5 — MCP surface

**Goal:** MCP tools mint ULIDs at creation, refs get slug support, rename and find work by ULID/slug, and `validate-state` surfaces the new diagnostics.

**Changes in `packages/mcp/src/`:**

- **`loom_create_*` tools** (`createIdea`, `createDesign`, `createPlan`, `createChat`, `createDone`): call `generateDocId(type)` to mint the `id` field. Refs additionally accept a `slug` param (required for `createReference` if that tool exists; otherwise the migration script handles existing refs).
- **`loom_rename`**: for refs (`type: reference`), signature becomes `(id, newSlug)`. Atomically:
  1. Update the ref's `slug` frontmatter.
  2. Walk every doc in `loom/` that has this slug in `requires_load` and rewrite the entry.
  Uses `loom_update_doc` internally; does not bypass reducers.
- **`loom_find_doc`**: accept ULID or slug. Resolve via `resolveId(index, idOrSlug)`, return the doc.
- **`loom://doc/{id}` resource**: new shape. Takes ULID (or slug for refs). Returns doc body + frontmatter. Distinct from `loom://thread-context` (which is folder-based and bundles multiple docs).
- **`validate-state` additions**:
  - `requires_load` entry slug doesn't resolve to a ref doc → diagnostic `UNRESOLVED_SLUG`.
  - `id` is a ULID but prefix doesn't match `type` → diagnostic `ID_PREFIX_MISMATCH`.
  - `parent_id` ULID not found in index → diagnostic `BROKEN_PARENT`.

**Acceptance:** MCP integration test (7/7 green). A newly created idea has a `id_` ULID. `loom_find_doc("vision")` returns the vision ref. `validate-state` surfaces `UNRESOLVED_SLUG` for a doc with a bad `requires_load` entry.

---

## ✅ Step 6 — Migration script (`migrate-to-ulid.ts`)

**Goal:** one-shot, idempotent script that migrates the current `loom/` tree to ULID identity in a single atomic pass.

**Location:** `scripts/migrate-to-ulid.ts`

**Passes (in order, per design section 9):**

1. **Inventory** — walk `loom/`, parse every doc's frontmatter. Build map: semantic-id → { filePath, type, content }. Detect all weave-local `refs/` folders.
2. **Mint ULIDs** — for each non-ctx doc that still has a semantic id, generate `generateDocId(type)`. Build mapping: old-id → new-ULID. Ctx docs keep semantic id. If a doc already has a ULID id, skip (idempotent).
3. **Rewrite frontmatter** — for each doc:
   - Replace `id` (ULID for non-ctx; semantic for ctx).
   - Replace `parent_id` via the mapping (fail loudly on missing).
   - Drop `child_ids`.
   - Refs: ensure `slug` derived from filename (kebab-cased, drop `.md`). Fail if absent and not derivable.
   - Non-refs: drop `slug` if present.
   - Reorder keys via `serializeFrontmatter`.
4. **Rewrite `requires_load`** — resolve each entry against the slug index. Fail if an entry points at a non-ref.
5. **Rename ctx files** — `loom/loom-ctx.md` → `loom/ctx.md`; `loom/{weave}/{weave}-ctx.md` → `loom/{weave}/ctx.md`; `loom/{weave}/{thread}/{thread}-ctx.md` → `loom/{weave}/{thread}/ctx.md`. Only where filename isn't already plain.
6. **Consolidate weave-local refs** — for each weave-local ref: derive slug, move to `loom/refs/{slug}.md`, update `slug` frontmatter, fail loudly on collision (list every conflict). Remove emptied folders.
7. **Rebuild link index** — build fresh from disk; verify every `parent_id` and `requires_load` resolves.
8. **Verify** — run `getState`, confirm no diagnostics. Any failure: restore original tree (scratch-dir swap pattern).

**Flags:**
- `--dry-run` — print what would change, touch nothing.
- `--verbose` — print each file rewritten.

**Acceptance:** running `--dry-run` on the current repo prints all expected changes with no errors. A full run on a fixture tree produces a valid ULID-identity tree. Re-running on the already-migrated tree is a no-op (idempotent). Collision test: two weave-local refs with the same filename → script aborts with a clear error.

---

## ✅ Step 7 — Test fixtures + legacy test cleanup

**Goal:** bring the test suite in sync with the ULID identity world; remove pre-thread-layout legacy tests.

**Changes:**

- **Fixture trees** (used by integration tests): re-run `migrate-to-ulid.ts --verbose` on each fixture; commit the rewritten fixtures.
- **`tests/id-management.test.ts`**: add tests for `generateDocId`, `parseDocId`, `isUlidId`.
- **`tests/weave-workflow.test.ts`**: currently expects ideas at `loom/{weave}/{tempId}.md` (flat-at-weave-root, pre-thread layout). Rewrite against current thread layout, or delete if the scenario is covered by `workspace-workflow.test.ts`.
- **`tests/workspace-workflow.test.ts`**: currently expects chat docs in `ai-chats/` (pre-thread layout). Rewrite against current layout (`loom/{weave}/chats/`).
- **MCP integration test** (`packages/mcp/tests/integration.test.ts`): verify that created docs have ULID ids with correct prefixes.
- Run full suite: `./scripts/test-all.sh`. All 7 MCP integration tests green; legacy-layout tests either rewritten and green or deleted.

**Acceptance:** `./scripts/test-all.sh` exits 0 with no skips. No test references `ai-chats/` or flat-at-weave-root idea paths.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
