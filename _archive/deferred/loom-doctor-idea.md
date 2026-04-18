---
type: idea
id: loom-doctor-idea
title: "`loom doctor` — Diagnostic and Repair Command"
status: deferred
created: 2026-04-17
version: 1
tags: [cli, diagnostics, repair, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# `loom doctor` — Diagnostic and Repair Command

## Problem
Loom relies on consistent frontmatter, valid `parent_id` links, and matching file names. When things break (due to manual edits, merge conflicts, or file renames), users must manually run `loom validate` and then fix issues by hand. There is no automated repair mechanism.

## Idea
Introduce a `loom doctor` command that:

- **Diagnoses** common issues:
  - Broken `parent_id` links (orphaned documents).
  - Dangling `child_ids` references.
  - Mismatched file names and `id` fields.
  - Missing required frontmatter fields.
  - Stale link index cache.
- **Repairs** issues automatically when possible:
  - Remove broken `parent_id` references.
  - Update file names to match `id` fields.
  - Regenerate the link index.
- **Reports** issues that require manual intervention.

**Proposed syntax:**
```bash
loom doctor [--fix] [--dry-run]
```

## Why Defer
- The current `loom validate` provides diagnostic visibility; manual repair is sufficient for MVP.
- Automated repair logic requires careful design to avoid data loss.
- Higher‑priority architectural work (Validation Extraction, VS Code extension) should come first.

## Open Questions
- Should `loom doctor` also fix stale `design_version` mismatches?
- How to handle repair of `Blocked by` references?
- Should there be a `--backup` flag to save original files before repair?

## Next Step
Re‑evaluate after the VS Code extension is stable. Create `loom-doctor-design.md` and a corresponding implementation plan.

**Status: Deferred for post‑MVP consideration.**


