---
type: plan
id: pl_01KWJGB84KN2Z2CVAPBB6K7K3X
title: create-plan-blockedby-numeric-ordinals Plan
status: done
created: 2026-07-02
updated: 2026-07-02
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 1.14.0
steps:
  - id: coerce-integer-ordinals-to-string-form
    order: 1
    status: done
    description: Coerce integer ordinals to string form in resolveBlockedByIds so numeric blockedBy (e.g. [1]) resolves to the step-id slug instead of being silently dropped
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: throw-on-malformed-non-string-non
    order: 2
    status: done
    description: Throw on malformed non-string/non-integer blockedBy entries instead of silently dropping them (empty strings still skip — they carry no edge)
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: extend-tests-resolve-blockedby-ids-test
    order: 3
    status: done
    description: Extend tests/resolve-blockedby-ids.test.ts with JS-number ordinal, mixed, dedupe, out-of-range and malformed-throw cases
    files_touched: []
    blocked_by: []
    satisfies: []
---
# create-plan-blockedby-numeric-ordinals Plan

## Goal

Quick-ship record of 3 completed changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Coerce integer ordinals to string form in resolveBlockedByIds so numeric blockedBy (e.g. [1]) resolves to the step-id slug instead of being silently dropped | — | — | — |
| ✅ | 2 | Throw on malformed non-string/non-integer blockedBy entries instead of silently dropping them (empty strings still skip — they carry no edge) | — | — | — |
| ✅ | 3 | Extend tests/resolve-blockedby-ids.test.ts with JS-number ordinal, mixed, dedupe, out-of-range and malformed-throw cases | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
