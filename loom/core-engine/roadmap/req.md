---
type: req
id: rq_01KV3HH7DNC60WN07ZMC8JZM4M
title: Derived Roadmap — Requirements
status: locked
created: 2026-06-14
updated: 2026-06-14
version: 2
design_version: 10
tags: []
parent_id: de_01KV3GPTMNXT66C4N73WAFN7ZW
requires_load: []
---
# Derived Roadmap — Requirements

### ✅ Included

- `IN1` `thread.md` doc type — authored-only frontmatter: `th_` ULID `id`, `title`, soft `priority`, `depends_on`
- `IN2` Load `thread.md` onto `Thread.manifest`; index `th_` ULIDs so `depends_on` resolves cross-weave
- `IN3` Pure `buildRoadmap(state)` read-model — status overlay including dependency **blocked-on**, topological + priority ordering, done-plan history, cycle/dangling diagnostics
- `IN4` `loom://roadmap` MCP resource + cycle/dangling/missing-manifest findings folded into `loom://diagnostics` and `validate-state`
- `IN5` Validated thread write tools (`loom_create_thread`, `loom_set_priority`, `loom_set_thread_deps`) plus first-`loom_create_*` auto-scaffold seam
- `IN6` `loom migrate` backfill command — idempotent, `--dry-run`, shipped in the `loom` binary for downstream installs
- `IN7` `loom roadmap` CLI — ASCII two-band renderer: one **Roadmap** band (present+future in a single topo+priority order, status + blocked-on per row) and **History**
- `IN8` Extension Roadmap toolbar toggle + panel: a single drag-orderable **Roadmap** node (present+future in one order, status per-row) and a separate **History** band
- `IN9` Filter folds to all / roadmap / history when Roadmap is enabled
- `IN10` Drag-to-reorder writes soft `priority` among dependency-free slack, spanning the whole Roadmap list regardless of a thread's status

### ❌ Excluded

- `EX1` No central or hand-authored roadmap file / list — the view is derived
- `EX2` No `status` field stored on `thread.md` — status is always derived
- `EX3` No new PM/planning system — a read-model plus a single soft-priority integer only
- `EX4` Drag-reorder never overrides hard `depends_on` edges

### ⛓ Constraints

- `C1` Reads never mutate — a thread missing `thread.md` surfaces as a diagnostic, never a silent write
- `C2` `depends_on` references threads by `th_` ULID, never by folder path (rename / move / cross-weave safe)
- `C3` `buildRoadmap` is pure (no IO) and lives in `core`; every delivery layer is a thin renderer over it
- `C4` `thread.md` stays out of the `Document` union (never counts as a deliverable) and has no staleness
- `C5` Re-deriving the roadmap over unchanged docs is deterministic — present+future resolve to one canonical ordered `roadmap[]`, status is per-node and never an ordering boundary