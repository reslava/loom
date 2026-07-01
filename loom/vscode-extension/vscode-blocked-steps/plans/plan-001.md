---
type: plan
id: pl_01KR1QMHV0RTMJ2N8XE068G2GY
title: Surface blocked steps per-plan
status: done
created: 2026-05-07
updated: 2026-05-08
version: 1
design_version: 3
tags: []
parent_id: de_01KR1QJJS01WWY5KWEAZ1X0GFB
requires_load: []
target_version: 0.1.0
actual_release: 0.5.0
steps:
  - id: import-isstepblocked-from-reslava-loom-core
    order: 1
    status: done
    description: Import isStepBlocked from @reslava-loom/core/dist/planUtils in treeProvider.ts.
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: compute-blockedcount-in-createplannode-filter-plan
    order: 2
    status: done
    description: "Compute blockedCount in createPlanNode: filter plan.steps for !done steps, call isStepBlocked(s, plan, this.state!.index) for each, count results."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: update-description-logic-in-createplannode-when
    order: 3
    status: done
    description: "Update description logic in createPlanNode: when blockedCount > 0 and all pending steps are blocked show '{progress} · {blockedCount} blocked 🚫'; when some but not all are blocked show next unblocked step with '({blockedCount} blocked)' suffix."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: adjust-contextvalue-introduce-plan-implementing-blocked
    order: 4
    status: done
    description: "Adjust contextValue: introduce plan-implementing-blocked when all pending steps are blocked; keep plan-implementing-doable only when at least one unblocked pending step exists. Update package.json when clauses if the DoStep button needs suppressing for plan-implementing-blocked."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: build-and-smoke-test-run-build
    order: 5
    status: done
    description: "Build and smoke-test: run build-all.sh, verify a plan with a blockedBy dependency shows the blocked suffix, DoStep is hidden/disabled when all pending steps are blocked, and normal plans are unaffected."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Surface blocked steps per-plan

| | |
|---|---|
| **Created** | 2026-05-07 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Compute per-plan blocked-step counts in the tree provider, surface them as description suffixes, and adjust contextValue so the DoStep button is suppressed when all pending steps are blocked.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Import isStepBlocked from @reslava-loom/core/dist/planUtils in treeProvider.ts. | — | — | — |
| ✅ | 2 | Compute blockedCount in createPlanNode: filter plan.steps for !done steps, call isStepBlocked(s, plan, this.state!.index) for each, count results. | — | — | — |
| ✅ | 3 | Update description logic in createPlanNode: when blockedCount > 0 and all pending steps are blocked show '{progress} · {blockedCount} blocked 🚫'; when some but not all are blocked show next unblocked step with '({blockedCount} blocked)' suffix. | — | — | — |
| ✅ | 4 | Adjust contextValue: introduce plan-implementing-blocked when all pending steps are blocked; keep plan-implementing-doable only when at least one unblocked pending step exists. Update package.json when clauses if the DoStep button needs suppressing for plan-implementing-blocked. | — | — | — |
| ✅ | 5 | Build and smoke-test: run build-all.sh, verify a plan with a blockedBy dependency shows the blocked suffix, DoStep is hidden/disabled when all pending steps are blocked, and normal plans are unaffected. | — | — | — |
---

<!-- step:import-isstepblocked-from-reslava-loom-core -->
### Step 1 — Import isStepBlocked from @reslava-loom/core/dist/planUtils in treeProvider.ts.

<!-- Detailed spec. -->

---

<!-- step:compute-blockedcount-in-createplannode-filter-plan -->
### Step 2 — Compute blockedCount in createPlanNode: filter plan.steps for !done steps, call isStepBlocked(s, plan, this.state!.index) for each, count results.

<!-- Detailed spec. -->

---

<!-- step:update-description-logic-in-createplannode-when -->
### Step 3 — Update description logic in createPlanNode: when blockedCount > 0 and all pending steps are blocked show '{progress} · {blockedCount} blocked 🚫'; when some but not all are blocked show next unblocked step with '({blockedCount} blocked)' suffix.

<!-- Detailed spec. -->

---

<!-- step:adjust-contextvalue-introduce-plan-implementing-blocked -->
### Step 4 — Adjust contextValue: introduce plan-implementing-blocked when all pending steps are blocked; keep plan-implementing-doable only when at least one unblocked pending step exists. Update package.json when clauses if the DoStep button needs suppressing for plan-implementing-blocked.

<!-- Detailed spec. -->

---

<!-- step:build-and-smoke-test-run-build -->
### Step 5 — Build and smoke-test: run build-all.sh, verify a plan with a blockedBy dependency shows the blocked suffix, DoStep is hidden/disabled when all pending steps are blocked, and normal plans are unaffected.

<!-- Detailed spec. -->

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
