---
type: plan
id: pl_01KR1QMG9ZKPB6464QWQP7J12Y
title: Stale doc detection and visualization
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-07T00:00:00.000Z"
version: 1
design_version: 1
tags: []
parent_id: de_01KR1QJGJV3V1J44JQX1FEVNSA
requires_load: []
target_version: 0.1.0
steps:
  - id: fix-createplannode-stale-condition-replace-plan
    order: 1
    status: done
    description: "Fix createPlanNode stale condition: replace plan.staled flag check with inline version math (plan.design_version < thread.design.version). Pass thread.design into createPlanNode from getThreadChildren."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: build-staleids-set-in-getweavechildren-getthreadchildren
    order: 2
    status: done
    description: "Build staleIds set in getWeaveChildren/getThreadChildren: for each thread compute stale ideas (idea.updated < design.updated) and stale designs (design.updated < idea.updated via parent_id). Thread staleIds: Set<string> through to createDocumentNode."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: apply-stale-badge-in-createdocumentnode-when
    order: 3
    status: done
    description: "Apply stale badge in createDocumentNode: when doc.id is in staleIds, append '⚠️ stale' to node.description. Update tooltip accordingly."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-summary-warning-row-in-getrootchildren
    order: 4
    status: done
    description: "Add summary warning row in getRootChildren: when state.summary.stalePlans > 0 or state.summary.blockedSteps > 0, prepend a non-clickable TreeItem showing the counts (e.g. '⚠️ 3 stale · 2 blocked')."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: build-and-smoke-test-run-build
    order: 5
    status: done
    description: "Build and smoke-test: run build-all.sh, open the extension in Extension Development Host, verify stale badges appear on plans whose design bumped, on ideas/designs with parent-update staleness, and that the summary row shows correct counts."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Stale doc detection and visualization

| | |
|---|---|
| **Created** | 2026-05-07 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Fix plan stale badge reliability, extend stale indicators to ideas and designs, and add a summary warning row to the tree root.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Fix createPlanNode stale condition: replace plan.staled flag check with inline version math (plan.design_version < thread.design.version). Pass thread.design into createPlanNode from getThreadChildren. | — | — | — |
| ✅ | 2 | Build staleIds set in getWeaveChildren/getThreadChildren: for each thread compute stale ideas (idea.updated < design.updated) and stale designs (design.updated < idea.updated via parent_id). Thread staleIds: Set<string> through to createDocumentNode. | — | — | — |
| ✅ | 3 | Apply stale badge in createDocumentNode: when doc.id is in staleIds, append '⚠️ stale' to node.description. Update tooltip accordingly. | — | — | — |
| ✅ | 4 | Add summary warning row in getRootChildren: when state.summary.stalePlans > 0 or state.summary.blockedSteps > 0, prepend a non-clickable TreeItem showing the counts (e.g. '⚠️ 3 stale · 2 blocked'). | — | — | — |
| ✅ | 5 | Build and smoke-test: run build-all.sh, open the extension in Extension Development Host, verify stale badges appear on plans whose design bumped, on ideas/designs with parent-update staleness, and that the summary row shows correct counts. | — | — | — |
---

### Step 1 — Fix createPlanNode stale condition: replace plan.staled flag check with inline version math (plan.design_version < thread.design.version). Pass thread.design into createPlanNode from getThreadChildren.

<!-- Detailed spec. -->

---

### Step 2 — Build staleIds set in getWeaveChildren/getThreadChildren: for each thread compute stale ideas (idea.updated < design.updated) and stale designs (design.updated < idea.updated via parent_id). Thread staleIds: Set<string> through to createDocumentNode.

<!-- Detailed spec. -->

---

### Step 3 — Apply stale badge in createDocumentNode: when doc.id is in staleIds, append '⚠️ stale' to node.description. Update tooltip accordingly.

<!-- Detailed spec. -->

---

### Step 4 — Add summary warning row in getRootChildren: when state.summary.stalePlans > 0 or state.summary.blockedSteps > 0, prepend a non-clickable TreeItem showing the counts (e.g. '⚠️ 3 stale · 2 blocked').

<!-- Detailed spec. -->

---

### Step 5 — Build and smoke-test: run build-all.sh, open the extension in Extension Development Host, verify stale badges appear on plans whose design bumped, on ideas/designs with parent-update staleness, and that the summary row shows correct counts.

<!-- Detailed spec. -->

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
