---
type: plan
id: pl_01KR250PHSM2EASRGSPW9697PM
title: Stale/blocked tree tweaks
status: done
created: 2026-05-07
updated: 2026-05-07
version: 1
design_version: 3
tags: []
parent_id: de_01KR1QJGJV3V1J44JQX1FEVNSA
requires_load: []
target_version: 0.1.0
actual_release: 0.5.0
steps:
  - id: gate-stale-badge-on-active-docs
    order: 1
    status: done
    description: "Gate stale badge on active docs only: in createPlanNode guard isStale with plan.status !== 'done' && plan.status !== 'cancelled'; in getWeaveChildren guard stale idea with idea.status !== 'done' and stale design with design.status !== 'done' && design.status !== 'closed'. Build and verify done plans no longer show ⚠️ stale."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-stale-pseudo-status-to-the
    order: 2
    status: done
    description: "Add 'stale' pseudo-status to the status filter: extend StatusFilter type and filterWeaves to treat 'stale' as matching any thread that contains at least one stale plan (design_version < design.version on a non-done plan) or a stale idea/design. Wire the new option into the filter bar UI so the user can select 'stale' and collapse the tree to only affected threads."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-blocked-pseudo-status-to-the
    order: 3
    status: done
    description: "Add 'blocked' pseudo-status to the status filter: extend filterWeaves to treat 'blocked' as matching any thread whose implementing plans contain at least one step with a non-empty blockedBy array pointing to an unfinished predecessor. Wire into the filter bar UI alongside 'stale'."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Stale/blocked tree tweaks

| | |
|---|---|
| **Created** | 2026-05-07 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Three follow-up fixes to the stale detection feature: skip stale badge on already-done/cancelled docs, add a 'stale' pseudo-status filter to the tree filter bar, and add a 'blocked' pseudo-status filter to surface plans that have blocked steps.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Gate stale badge on active docs only: in createPlanNode guard isStale with plan.status !== 'done' && plan.status !== 'cancelled'; in getWeaveChildren guard stale idea with idea.status !== 'done' and stale design with design.status !== 'done' && design.status !== 'closed'. Build and verify done plans no longer show ⚠️ stale. | — | — | — |
| ✅ | 2 | Add 'stale' pseudo-status to the status filter: extend StatusFilter type and filterWeaves to treat 'stale' as matching any thread that contains at least one stale plan (design_version < design.version on a non-done plan) or a stale idea/design. Wire the new option into the filter bar UI so the user can select 'stale' and collapse the tree to only affected threads. | — | — | — |
| ✅ | 3 | Add 'blocked' pseudo-status to the status filter: extend filterWeaves to treat 'blocked' as matching any thread whose implementing plans contain at least one step with a non-empty blockedBy array pointing to an unfinished predecessor. Wire into the filter bar UI alongside 'stale'. | — | — | — |
---

<!-- step:gate-stale-badge-on-active-docs -->
### Step 1 — Gate stale badge on active docs only: in createPlanNode guard isStale with plan.status !== 'done' && plan.status !== 'cancelled'; in getWeaveChildren guard stale idea with idea.status !== 'done' and stale design with design.status !== 'done' && design.status !== 'closed'. Build and verify done plans no longer show ⚠️ stale.

<!-- Detailed spec. -->

---

<!-- step:add-stale-pseudo-status-to-the -->
### Step 2 — Add 'stale' pseudo-status to the status filter: extend StatusFilter type and filterWeaves to treat 'stale' as matching any thread that contains at least one stale plan (design_version < design.version on a non-done plan) or a stale idea/design. Wire the new option into the filter bar UI so the user can select 'stale' and collapse the tree to only affected threads.

<!-- Detailed spec. -->

---

<!-- step:add-blocked-pseudo-status-to-the -->
### Step 3 — Add 'blocked' pseudo-status to the status filter: extend filterWeaves to treat 'blocked' as matching any thread whose implementing plans contain at least one step with a non-empty blockedBy array pointing to an unfinished predecessor. Wire into the filter bar UI alongside 'stale'.

<!-- Detailed spec. -->

---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
