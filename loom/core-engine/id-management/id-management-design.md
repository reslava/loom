---
type: design
id: id-management-design
title: "Automatic Document ID Management"
status: active
created: 2026-04-15
version: 1
tags: [id, linking, ux, automation]
parent_id: core-engine-design
child_ids: [id-management-plan-001]
requires_load: [core-engine-design]
target_release: "0.3.0"
actual_release: null
---

# Automatic Document ID Management

## Goal

Eliminate manual document ID maintenance by providing automatic, stable, descriptive ID generation and a refactoring‑style rename command that updates all inbound references. This removes a major friction point and ensures link integrity across the entire Loom system.

## Context

Currently, document IDs are manually maintained in frontmatter. Users must invent unique IDs, remember to update `child_ids` when creating new documents, and manually fix broken links after renaming a file or changing an ID. This is error‑prone and creates silent breakage.

The link index (`link-index-design.md`) will provide fast relationship queries, but it cannot prevent broken links caused by manual ID changes. This design addresses the root cause by making ID management fully automatic.

# CHAT

## Rafa:
We need automatic ID generation and a safe rename command. Manual IDs are too fragile.

## AI:
Agreed. Let's define the rules.

### 1. ID Generation Rules

| Document State | ID Format | Example |
|----------------|-----------|---------|
| **Draft (temporary)** | `new-{type}-{timestamp}` | `new-idea-20260415120000` |
| **Finalized (permanent)** | `{kebab-case-title}-{type}` | `add-dark-mode-design` |

**Rules:**
- Permanent IDs are generated **only when the document is finalized** (status becomes `active` or `done`).
- The title is converted to kebab‑case: lowercase, hyphens for spaces, alphanumeric only.
- The type suffix is always appended (`-idea`, `-design`, `-plan`, `-ctx`).
- If the generated ID already exists, a numeric suffix is added: `add-dark-mode-design-2`.

### 2. Document Lifecycle & ID Transitions

| Phase | ID | File Name |
|-------|-----|-----------|
| Created via `loom weave idea "Idea"` | `new-idea-{timestamp}` | `new-idea-{timestamp}.md` |
| User edits title and content | (unchanged) | (unchanged) |
| User runs `loom finalize <doc-id>` | Generates permanent ID from **current title** | Renames file to permanent ID |
| Document is now `active` | Permanent ID | Permanent file name |

### 3. The `loom rename` Command

```bash
loom rename <old-id> "<New Title>"
```

**Behavior:**
1. Validates that `old-id` exists and is in a finalized state (`active`, `closed`, `done`, `implementing`).
2. Generates a new permanent ID from the new title.
3. **Updates all inbound references** in other documents (`parent_id`, `child_ids`, `Blocked by` columns).
4. Renames the file on disk.
5. Updates the document's own `id` and `title` fields.
6. Logs all changes for auditability.

### 4. Integration with File Watcher

| Watcher Event | System Response |
|---------------|-----------------|
| File renamed outside Loom | Detect mismatch between file name and `id` field. Show warning: "File renamed manually. Run `loom repair` to fix." |
| `id` field manually edited | Detect mismatch. Show warning. Offer to run `loom repair`. |

### 5. The `loom repair` Command Enhancements

`loom repair` will offer to:
- Fix mismatched file names and `id` fields.
- Update stale references after a manual rename.
- Regenerate temporary IDs if needed.

## Decision

Adopt the automatic ID management rules and the `loom rename` command. Implement this **before** the link index to ensure the index operates on stable, reliable identifiers.

## Next Steps

- Create `id-management-plan-001.md` for implementation.