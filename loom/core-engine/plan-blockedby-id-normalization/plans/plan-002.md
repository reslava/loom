---
type: plan
id: pl_01KWY3JHVVDT992JEPN4JT39T6
title: Validate blockedBy slugs + make sibling refs discoverable
status: done
created: 2026-07-07
updated: 2026-07-07
version: 1
design_version: 1
tags: []
parent_id: de_01KWGTDV2BKCYGE8THQYVBPXT3
requires_load: []
target_version: 0.1.0
actual_release: 1.20.0
steps:
  - id: validate-pass-through-slugs-in-resolveblockedbyids
    order: 1
    status: done
    description: "In resolveBlockedByIds (packages/core/src/planUtils.ts): after ordinal resolution, validate every remaining entry — any non-numeric, non-pl_ entry that is NOT in orderedStepIds throws. The Error message names the offending value, lists the valid step ids, and states the 1-based ordinal form (e.g. use \"1\" for the first step). pl_ entries still pass through (cross-plan, best-effort). Result stays deduped; self-reference still rejected. Add unit tests: unknown slug ('s1') throws; known slug passes; pl_ passes; ordinal still resolves; error message contains the valid-id list + ordinal hint."
    files_touched: [packages/core/src/planUtils.ts, packages/core/test/]
    blocked_by: []
    satisfies: []
  - id: confirm-every-write-path-surfaces-the
    order: 2
    status: done
    description: "Verify buildStructuredSteps (create), the ADD_STEP / UPDATE_STEP reducers, and promote all reach the validated resolver and surface the throw as a clean tool error with no partial write. Add integration tests: create_plan with blockedBy ['s1'] throws (today it silently stores); add_step / update_step with an unknown slug throws; a valid ordinal and a valid slug and a pl_ id all still succeed."
    files_touched: [packages/app/src/weavePlan.ts, packages/core/src/events/planEvents.ts, tests/]
    blocked_by: [validate-pass-through-slugs-in-resolveblockedbyids]
    satisfies: []
  - id: tighten-blockedby-schema-descriptions-discoverability
    order: 3
    status: done
    description: "Update the blockedBy field descriptions in the create_plan, add_step, and update_step MCP tool schemas (packages/mcp) to state the accepted forms explicitly: a 1-based ordinal ('1','2') referencing sibling step position, an existing step-id slug, or a cross-plan 'pl_…' id — and never an invented 's1'-style id. This is the discoverability half so agents use the forms that already work."
    files_touched: [packages/mcp/src/]
    blocked_by: []
    satisfies: []
  - id: build-test-and-record-done
    order: 4
    status: done
    description: Run ./scripts/build-all.sh then ./scripts/test-all.sh; fix any fallout. Append the implementation record to the thread's done doc.
    files_touched: [scripts/build-all.sh, scripts/test-all.sh]
    blocked_by: [confirm-every-write-path-surfaces-the, tighten-blockedby-schema-descriptions-discoverability]
    satisfies: []
---
# Validate blockedBy slugs + make sibling refs discoverable

## Goal

Close the second silent-dangling-blockedBy gap found while dogfooding loom_create_plan (chat-002): resolveBlockedByIds resolves ordinals and throws on wrong TYPES, but a well-formed non-ordinal string (e.g. "s1") falls into the "assume it's already a slug" pass-through, which never validates it against the plan's real step ids — so it persists as a dangling edge with no error. Fix (1): make the resolver validate every pass-through entry against the known step-id set and throw on unknown, upholding this thread's principle "no dependency edge is ever lost silently." Fix (2) is NOT a new codepath: 1-based step-index refs already resolve at create (the create-plan-blockedby-numeric-ordinals fix wired ordinals through buildStructuredSteps); the residue is discoverability — the agent guessed "s1" because it did not know "1" already works. So (2) = a helpful throw message that names the offending value, lists valid step ids, and states the ordinal form, plus tightening the blockedBy field descriptions in the create_plan / add_step / update_step MCP schemas so agents stop inventing "s1"-style ids. Cross-plan pl_ refs stay best-effort pass-through (consistent with isStepBlocked: missing plan = blocked), so the resolver validates only non-pl_ entries.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | In resolveBlockedByIds (packages/core/src/planUtils.ts): after ordinal resolution, validate every remaining entry — any non-numeric, non-pl_ entry that is NOT in orderedStepIds throws. The Error message names the offending value, lists the valid step ids, and states the 1-based ordinal form (e.g. use "1" for the first step). pl_ entries still pass through (cross-plan, best-effort). Result stays deduped; self-reference still rejected. Add unit tests: unknown slug ('s1') throws; known slug passes; pl_ passes; ordinal still resolves; error message contains the valid-id list + ordinal hint. | packages/core/src/planUtils.ts, packages/core/test/ | — | — |
| ✅ | 2 | Verify buildStructuredSteps (create), the ADD_STEP / UPDATE_STEP reducers, and promote all reach the validated resolver and surface the throw as a clean tool error with no partial write. Add integration tests: create_plan with blockedBy ['s1'] throws (today it silently stores); add_step / update_step with an unknown slug throws; a valid ordinal and a valid slug and a pl_ id all still succeed. | packages/app/src/weavePlan.ts, packages/core/src/events/planEvents.ts, tests/ | validate-pass-through-slugs-in-resolveblockedbyids | — |
| ✅ | 3 | Update the blockedBy field descriptions in the create_plan, add_step, and update_step MCP tool schemas (packages/mcp) to state the accepted forms explicitly: a 1-based ordinal ('1','2') referencing sibling step position, an existing step-id slug, or a cross-plan 'pl_…' id — and never an invented 's1'-style id. This is the discoverability half so agents use the forms that already work. | packages/mcp/src/ | — | — |
| ✅ | 4 | Run ./scripts/build-all.sh then ./scripts/test-all.sh; fix any fallout. Append the implementation record to the thread's done doc. | scripts/build-all.sh, scripts/test-all.sh | confirm-every-write-path-surfaces-the, tighten-blockedby-schema-descriptions-discoverability | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
