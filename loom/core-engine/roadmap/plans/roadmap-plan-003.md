---
type: plan
id: pl_01KV408365QQGYX687RVYKGM03
title: Derived Roadmap — Merge Present+Future
status: done
created: 2026-06-14
updated: 2026-06-14
version: 1
design_version: 1
req_version: 1
tags: []
parent_id: de_01KV3GPTMNXT66C4N73WAFN7ZW
requires_load: []
target_version: 0.1.0
actual_release: 1.8.0
steps:
  - id: unified-roadmap-in-the-read-model
    order: 1
    status: done
    description: "In core/derived.ts, replace RoadmapView's future[]/present[] with one canonical roadmap: RoadmapNode[] = present+future in one topo+priority order (each node keeps its status + blockedOn). Drop the future/present fields. Update buildRoadmap and its unit tests to cover the combined ordering: deps ordered before dependents, priority resolving slack across the active/pending boundary, deterministic stable secondary."
    files_touched: [packages/core/src/derived.ts, tests/]
    blocked_by: []
    satisfies: [IN3, C3, C5]
  - id: cli-loom-roadmap-one-roadmap-band
    order: 2
    status: done
    description: Collapse loom roadmap's Future/Present bands into a single Roadmap band rendering roadmap[] in order, each row showing status + blocked-on; History band unchanged (incl. --group-by-thread). Update the CLI output test.
    files_touched: [packages/cli/src/commands/roadmap.ts, tests/]
    blocked_by: [step-1]
    satisfies: [IN7]
  - id: extension-merge-into-one-roadmap-tree
    order: 3
    status: done
    description: Merge the Future and Present tree sections into one Roadmap node rendering roadmap[]. Drag-reorder now spans the whole list; the existing depends_on pre-check already refuses any drop that lands a thread before a dependency regardless of status. The All / Roadmap / History filter maps Roadmap to the single node. tsc --noEmit clean.
    files_touched: [packages/vscode/src/]
    blocked_by: [step-1]
    satisfies: [IN8, IN9, IN10]
  - id: docs-reference-docs
    order: 4
    status: done
    description: Update USER_GUIDE.md, EXTENSION_USER_GUIDE.md, CLI_USER_GUIDE.md and the cli/vscode reference docs that describe three bands to the merged Roadmap + History model.
    files_touched: [docs/, loom/refs/]
    blocked_by: [step-2, step-3]
    satisfies: [IN7, IN8]
---
# Derived Roadmap — Merge Present+Future

## Goal

Merge the roadmap's Present and Future bands into one drag-orderable Roadmap view, keeping History separate. The active/pending split is a derived status overlay, not an ordering boundary, so splitting it into two sibling nodes invented a drag barrier absent from the data (one authored priority per thread, one topo+priority order). buildRoadmap now exposes a single canonical roadmap[] = present+future in one topo+priority order; future/present are dropped. Both the CLI and the extension render that one order, with status shown per-row. Pure presentation + one read-model field change on top of the shipped roadmap; no new derivation semantics beyond surfacing the order that already existed.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | In core/derived.ts, replace RoadmapView's future[]/present[] with one canonical roadmap: RoadmapNode[] = present+future in one topo+priority order (each node keeps its status + blockedOn). Drop the future/present fields. Update buildRoadmap and its unit tests to cover the combined ordering: deps ordered before dependents, priority resolving slack across the active/pending boundary, deterministic stable secondary. | packages/core/src/derived.ts, tests/ | — | IN3, C3, C5 |
| ✅ | 2 | Collapse loom roadmap's Future/Present bands into a single Roadmap band rendering roadmap[] in order, each row showing status + blocked-on; History band unchanged (incl. --group-by-thread). Update the CLI output test. | packages/cli/src/commands/roadmap.ts, tests/ | step-1 | IN7 |
| ✅ | 3 | Merge the Future and Present tree sections into one Roadmap node rendering roadmap[]. Drag-reorder now spans the whole list; the existing depends_on pre-check already refuses any drop that lands a thread before a dependency regardless of status. The All / Roadmap / History filter maps Roadmap to the single node. tsc --noEmit clean. | packages/vscode/src/ | step-1 | IN8, IN9, IN10 |
| ✅ | 4 | Update USER_GUIDE.md, EXTENSION_USER_GUIDE.md, CLI_USER_GUIDE.md and the cli/vscode reference docs that describe three bands to the merged Roadmap + History model. | docs/, loom/refs/ | step-2, step-3 | IN7, IN8 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
