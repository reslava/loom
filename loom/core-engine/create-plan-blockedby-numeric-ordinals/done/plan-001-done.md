---
type: done
id: pl_01KWJGB84KN2Z2CVAPBB6K7K3X-done
title: Done — create-plan-blockedby-numeric-ordinals Plan
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: pl_01KWJGB84KN2Z2CVAPBB6K7K3X
requires_load: []
---
# Done — create-plan-blockedby-numeric-ordinals Plan

Quick-shipped — recorded already-completed work:

1. Coerce integer ordinals to string form in resolveBlockedByIds so numeric blockedBy (e.g. [1]) resolves to the step-id slug instead of being silently dropped
2. Throw on malformed non-string/non-integer blockedBy entries instead of silently dropping them (empty strings still skip — they carry no edge)
3. Extend tests/resolve-blockedby-ids.test.ts with JS-number ordinal, mixed, dedupe, out-of-range and malformed-throw cases
