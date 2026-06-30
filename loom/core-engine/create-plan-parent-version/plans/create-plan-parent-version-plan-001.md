---
type: plan
id: pl_01KWBZFDXRVCEWPMR3C6RKJM3X
title: Fix design_version baseline (create / promote / refine) + backfill
status: done
created: 2026-06-30
updated: 2026-06-30
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: add-parentdesignversion-helper
    order: 1
    status: done
    description: "Add a parentDesignVersion(threadPath, deps) app helper mirroring lockedReqVersion: load the thread's {threadId}-design.md and return its version (undefined when no design exists). Single source of truth reused by create/promote/refine/backfill."
    files_touched: [packages/app/src/weavePlan.ts]
    blocked_by: []
    satisfies: []
  - id: fix-create-plan-to-stamp-live
    order: 2
    status: done
    description: "In weavePlan replace the hardcoded design_version: 1 on both the thread path and the weave-root path with the helper result. Refactor the thread path so the design is read unconditionally (today it loads only when parentId is absent) and reuse it for both parent linkage and the version. Keep a sensible fallback for weave-root plans that have no thread design."
    files_touched: [packages/app/src/weavePlan.ts]
    blocked_by: []
    satisfies: []
  - id: fix-promote-plan-to-stamp-the
    order: 3
    status: done
    description: In promoteToPlan stamp design_version from the parent design's live version (via the helper) when promoting into a thread, instead of omitting the field. This closes the inverse bug where promoted plans were never flagged stale.
    files_touched: [packages/app/src/promoteToPlan.ts]
    blocked_by: []
    satisfies: []
  - id: re-baseline-design-version-on-refine
    order: 4
    status: done
    description: In refinePlan, derive the thread path from the plan filePath, load the parent design, and re-stamp design_version = current design version on the refined doc so refine actually clears staleness. Today refine spreads ...doc and bumps version but leaves the stale baseline untouched.
    files_touched: [packages/app/src/refinePlan.ts]
    blocked_by: []
    satisfies: []
  - id: add-backfill-design-versions-use-case
    order: 5
    status: done
    description: New backfillDesignVersions app use-case + a `loom backfill-design-versions` CLI command (with --dry-run) that walks every plan, resolves its parent thread design's current version, and re-stamps design_version. Mirrors the backfill-releases / migrate-to-* pattern. One-time data repair, runnable per project (this repo + Chord Flow).
    files_touched: [packages/app/src/backfillDesignVersions.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: regression-tests-across-all-four-behaviours
    order: 6
    status: done
    description: "Tests: (a) create a plan under a design at vN asserts design_version === N; (b) bump design to v(N+1) flags the plan stale; (c) refine the plan re-baselines design_version to N+1 and clears staleness; (d) promote into a thread carries the live design version; (e) backfill re-stamps a plan stuck at 1 under a vN design to N, and --dry-run writes nothing."
    files_touched: [tests/design-version-baseline.test.ts, tests/refine-plan.test.ts]
    blocked_by: []
    satisfies: []
---
# Fix design_version baseline (create / promote / refine) + backfill

## Goal

Plans must record the parent design's live version as their `design_version` staleness baseline at write time, not a hardcoded constant. Today `create_plan` stamps `design_version: 1` unconditionally (every plan born stale → project-wide false positives in `get_stale_plans`), `promoteToPlan` omits the field entirely (plans never flagged stale), and `refinePlan` never re-baselines it (refine can't clear staleness). The read side (`isPlanStale`) is correct; only the write-time baseline is wrong. Fix all three plan write paths to stamp the live design version — mirroring how the same code already reads the live locked req version via `lockedReqVersion` — and add a one-shot `backfill-design-versions` command to repair existing plans in this repo and downstream projects (Chord Flow), since the original authoring baseline was overwritten and is unrecoverable.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a parentDesignVersion(threadPath, deps) app helper mirroring lockedReqVersion: load the thread's {threadId}-design.md and return its version (undefined when no design exists). Single source of truth reused by create/promote/refine/backfill. | packages/app/src/weavePlan.ts | — | — |
| ✅ | 2 | In weavePlan replace the hardcoded design_version: 1 on both the thread path and the weave-root path with the helper result. Refactor the thread path so the design is read unconditionally (today it loads only when parentId is absent) and reuse it for both parent linkage and the version. Keep a sensible fallback for weave-root plans that have no thread design. | packages/app/src/weavePlan.ts | — | — |
| ✅ | 3 | In promoteToPlan stamp design_version from the parent design's live version (via the helper) when promoting into a thread, instead of omitting the field. This closes the inverse bug where promoted plans were never flagged stale. | packages/app/src/promoteToPlan.ts | — | — |
| ✅ | 4 | In refinePlan, derive the thread path from the plan filePath, load the parent design, and re-stamp design_version = current design version on the refined doc so refine actually clears staleness. Today refine spreads ...doc and bumps version but leaves the stale baseline untouched. | packages/app/src/refinePlan.ts | — | — |
| ✅ | 5 | New backfillDesignVersions app use-case + a `loom backfill-design-versions` CLI command (with --dry-run) that walks every plan, resolves its parent thread design's current version, and re-stamps design_version. Mirrors the backfill-releases / migrate-to-* pattern. One-time data repair, runnable per project (this repo + Chord Flow). | packages/app/src/backfillDesignVersions.ts, packages/cli/src/index.ts | — | — |
| ✅ | 6 | Tests: (a) create a plan under a design at vN asserts design_version === N; (b) bump design to v(N+1) flags the plan stale; (c) refine the plan re-baselines design_version to N+1 and clears staleness; (d) promote into a thread carries the live design version; (e) backfill re-stamps a plan stuck at 1 under a vN design to N, and --dry-run writes nothing. | tests/design-version-baseline.test.ts, tests/refine-plan.test.ts | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
