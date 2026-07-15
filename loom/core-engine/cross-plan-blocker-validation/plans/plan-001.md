---
type: plan
id: pl_01KXJQMTHRF6P553GWKS7B1RNR
title: Warn-and-store cross-plan blockers via injected planExists
status: done
created: 2026-07-15
updated: 2026-07-15
version: 1
design_version: 1
tags: []
parent_id: de_01KXJQ6CS3D94ST0HGCA3KM1BB
requires_load: []
target_version: 0.1.0
steps:
  - id: normalizer-inject-planexists-return-ids-warnings
    order: 1
    status: done
    description: Add optional planExists predicate to resolveBlockedByIds; return { ids, warnings } and implement the classification table (known step slug → resolve+store; unknown step slug → throw, unchanged; cross-plan ref resolves → store; cross-plan ref unresolved with predicate → store + BlockedByWarning; cross-plan ref with no predicate → store best-effort). Keep core pure — predicate is injected, no IO. Normalize legacy {slug}-plan-NNN before the existence check.
    files_touched: [packages/core/src/planUtils.ts, packages/core/src/index.ts, packages/core/src/reducers/planReducer.ts]
    blocked_by: []
    satisfies: []
  - id: wire-planexists-into-the-three-write
    order: 2
    status: done
    description: "Option B (reducer stays pure). Leave the planReducer resolveBlockedByIds calls (ADD_STEP/UPDATE_STEP) predicate-free — they take .ids and store cross-plan edges verbatim, unchanged. Inject planExists (a closure over the already-loaded link index, no extra pass) only where the index lives: createPlan's direct resolver call, plus a small app-layer existence check in addStep/updateStep. Surface the resulting dangling-plan warnings as a non-blocking advisory in each tool result. The standing diagnostic (step 3) — not this advisory — is the guarantee."
    files_touched: [packages/app/src/createPlan.ts, packages/app/src/addStep.ts, packages/app/src/updateStep.ts]
    blocked_by: [normalizer-inject-planexists-return-ids-warnings]
    satisfies: []
  - id: standing-detection-step-level-dangling-dep
    order: 3
    status: done
    description: "Recompute from persisted state: walk every plan step's blockedBy, flag any cross-plan pl_… (or normalized legacy form) that does not resolve to an existing plan as a step-level dangling_dep diagnostic { weaveSlug, threadSlug, planId, stepId, ref }. Surface through loom_validate / loom://diagnostics, reusing the same resolution logic as step 1. This is the durable guarantee and the migration net for edges already on disk."
    files_touched: [packages/app/src/validate.ts, packages/core/src/validation.ts]
    blocked_by: [normalizer-inject-planexists-return-ids-warnings]
    satisfies: []
  - id: demote-isstepblocked-missing-plan-rule-to
    order: 4
    status: done
    description: Change isStepBlocked's 'missing plan ⇒ blocked' from primary contract to a documented back-compat fallback (comment referencing the standing diagnostic as the primary surface), matching how the ordinal fallback was handled. No behavioral change to a resolvable blocker.
    files_touched: [packages/core/src/planUtils.ts]
    blocked_by: [standing-detection-step-level-dangling-dep]
    satisfies: []
  - id: tests-reference-doc-sweep
    order: 5
    status: done
    description: Add resolver classification unit test (one assertion per table row incl. the still-throws unknown-step guard), an app write-path test (unresolved pl_ returns a warning AND the edge is stored), and a diagnostics test (a dangling pl_ surfaces as step-level dangling_dep). Wire each into scripts/test-all.sh. Update loom/refs/mcp-reference.md with the new diagnostic kind. Run build-all then test-all.
    files_touched: [tests/cross-plan-blocker-validation.test.ts, scripts/test-all.sh, loom/refs/mcp-reference.md]
    blocked_by: [normalizer-inject-planexists-return-ids-warnings, wire-planexists-into-the-three-write, standing-detection-step-level-dangling-dep, demote-isstepblocked-missing-plan-rule-to]
    satisfies: []
---
# Warn-and-store cross-plan blockers via injected planExists

## Goal

Close the last silent-dangling-edge seam in blockedBy: a cross-plan `pl_…` (or legacy `{slug}-plan-NNN`) blocker that names a non-existent plan is currently stored verbatim and read by isStepBlocked as permanently blocked, with nothing telling the author. Implement warn-and-store: the edge is always stored (forward-referencing a not-yet-created plan stays legal), an injected `planExists` predicate lets the single normalizer `resolveBlockedByIds` return a non-blocking advisory at write time, and a standing step-level `dangling_dep` diagnostic — mirroring the roadmap's thread-layer precedent — is the durable guarantee that no edge is ever silently falsified. Unknown sibling *step* slugs still hard-throw (unchanged). isStepBlocked's "missing plan ⇒ blocked" is demoted to a documented back-compat fallback.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add optional planExists predicate to resolveBlockedByIds; return { ids, warnings } and implement the classification table (known step slug → resolve+store; unknown step slug → throw, unchanged; cross-plan ref resolves → store; cross-plan ref unresolved with predicate → store + BlockedByWarning; cross-plan ref with no predicate → store best-effort). Keep core pure — predicate is injected, no IO. Normalize legacy {slug}-plan-NNN before the existence check. | packages/core/src/planUtils.ts, packages/core/src/index.ts, packages/core/src/reducers/planReducer.ts | — | — |
| ✅ | 2 | Option B (reducer stays pure). Leave the planReducer resolveBlockedByIds calls (ADD_STEP/UPDATE_STEP) predicate-free — they take .ids and store cross-plan edges verbatim, unchanged. Inject planExists (a closure over the already-loaded link index, no extra pass) only where the index lives: createPlan's direct resolver call, plus a small app-layer existence check in addStep/updateStep. Surface the resulting dangling-plan warnings as a non-blocking advisory in each tool result. The standing diagnostic (step 3) — not this advisory — is the guarantee. | packages/app/src/createPlan.ts, packages/app/src/addStep.ts, packages/app/src/updateStep.ts | normalizer-inject-planexists-return-ids-warnings | — |
| ✅ | 3 | Recompute from persisted state: walk every plan step's blockedBy, flag any cross-plan pl_… (or normalized legacy form) that does not resolve to an existing plan as a step-level dangling_dep diagnostic { weaveSlug, threadSlug, planId, stepId, ref }. Surface through loom_validate / loom://diagnostics, reusing the same resolution logic as step 1. This is the durable guarantee and the migration net for edges already on disk. | packages/app/src/validate.ts, packages/core/src/validation.ts | normalizer-inject-planexists-return-ids-warnings | — |
| ✅ | 4 | Change isStepBlocked's 'missing plan ⇒ blocked' from primary contract to a documented back-compat fallback (comment referencing the standing diagnostic as the primary surface), matching how the ordinal fallback was handled. No behavioral change to a resolvable blocker. | packages/core/src/planUtils.ts | standing-detection-step-level-dangling-dep | — |
| ✅ | 5 | Add resolver classification unit test (one assertion per table row incl. the still-throws unknown-step guard), an app write-path test (unresolved pl_ returns a warning AND the edge is stored), and a diagnostics test (a dangling pl_ surfaces as step-level dangling_dep). Wire each into scripts/test-all.sh. Update loom/refs/mcp-reference.md with the new diagnostic kind. Run build-all then test-all. | tests/cross-plan-blocker-validation.test.ts, scripts/test-all.sh, loom/refs/mcp-reference.md | normalizer-inject-planexists-return-ids-warnings, wire-planexists-into-the-three-write, standing-detection-step-level-dangling-dep, demote-isstepblocked-missing-plan-rule-to | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:normalizer-inject-planexists-return-ids-warnings -->
### Step 1 — Normalizer: inject planExists, return {ids,warnings}

New exported `BlockedByWarning` type: `{ kind: 'dangling_plan_ref'; ref: string; stepId: string }`. Return shape changes `string[]` → `{ ids: string[]; warnings: BlockedByWarning[] }` — this is the one signature ripple, handled in step 2.

<!-- step:wire-planexists-into-the-three-write -->
### Step 2 — Wire planExists into the three write paths + surface advisory

Confirm the link index exposes plan-id membership in O(1) here (Rafa's cheapness check); if it forces a second build, stop and revisit the seam.
