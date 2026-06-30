---
type: plan
id: pl_01KTPMHVP5N3Y8HNFYY42CMSR4
title: Plan Steps in Frontmatter — Implementation Plan
status: done
created: 2026-06-09
updated: 2026-06-09
version: 1
design_version: 2
tags: []
parent_id: de_01KTPKWX3A4CSVNK24MRNFF3RN
requires_load: []
target_version: 0.1.0
actual_release: 1.3.0
steps:
  - id: core-model-migration-single-serializer-reducer
    order: 1
    status: done
    description: Core model migration + single serializer + reducer. New `PlanStep` (id, order, status enum, title, description, files, blocked_by, satisfies, detail; drop `done`); fold `generatePlanBody`+`generateStepsTable`+`updateStepsTableInContent` into one `serializePlanBody()`; `parseStepsTable` extended to fill new fields (migration-only); reducer COMPLETE_STEP→status; sweep every `.done`/"Step N" reader across all packages so build-all stays green; round-trip invariant test.
    files_touched: [packages/core/src/entities/plan.ts, packages/core/src/reducers/planReducer.ts, packages/core/src/planUtils.ts, packages/core/src/planTableUtils.ts, packages/core/src/bodyGenerators/planBody.ts, packages/core/src/filters/planFilters.ts, packages/core/src/validation.ts, packages/core/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: source-of-truth-flip
    order: 2
    status: done
    description: Source-of-truth flip. Loader reads frontmatter `steps` (read-only body-parse fallback for legacy docs); saver regenerates body via `serializePlanBody`; `serializeFrontmatter` handles the nested step-object array.
    files_touched: [packages/fs/src/serializers/frontmatterLoader.ts, packages/fs/src/serializers/frontmatterSaver.ts, packages/core/src/serializers/frontmatterUtils.ts]
    blocked_by: [1]
    satisfies: []
  - id: create-path
    order: 3
    status: done
    description: Create path. `loom_create_plan` accepts a structured `steps` object array (+ step-id synthesis); drop `content`→table parsing from creation.
    files_touched: [packages/app/src/weavePlan.ts, packages/mcp/src/tools/createPlan.ts, packages/core/src/idUtils.ts]
    blocked_by: [1, 2]
    satisfies: []
  - id: refine-promote-generate-updatedoc-route-through
    order: 4
    status: done
    description: Refine / promote / generate / updateDoc route through the serializer; stop hand-parsing plan bodies on the live path.
    files_touched: [packages/app/src/refinePlan.ts, packages/app/src/promoteToPlan.ts, packages/mcp/src/tools/generate.ts, packages/mcp/src/tools/updateDoc.ts]
    blocked_by: [1, 2]
    satisfies: []
  - id: step-tools-readers-surface-status-id
    order: 5
    status: done
    description: Step tools & readers surface status/id meaningfully (status symbols, step-id refs, do-next-step, blocked listing) across mcp / cli / vscode.
    files_touched: [packages/mcp/src/tools/listPlanSteps.ts, packages/mcp/src/tools/completeStep.ts, packages/mcp/src/prompts/doNextStep.ts, packages/app/src/getState.ts, packages/cli/src/commands/status.ts, packages/vscode/src/tree/treeProvider.ts]
    blocked_by: [1]
    satisfies: []
  - id: command-body-frontmatter-id-synthesis-idempotent
    order: 6
    status: done
    description: "`loom migrate-plan-steps` command: body→frontmatter, id synthesis, idempotent, `--dry-run`, batch + single-doc; migrate this repo's plans; test against the chord-flow project."
    files_touched: [packages/app/src/migratePlanSteps.ts, packages/cli/src/commands/migratePlanSteps.ts, packages/cli/src/index.ts]
    blocked_by: [2, 3]
    satisfies: []
  - id: contract-docs
    order: 7
    status: done
    description: Contract docs. LOOM_CLAUDE_MD template + root CLAUDE.md state the structured-steps contract; keep both surfaces in sync.
    files_touched: [packages/app/src/installWorkspace.ts, CLAUDE.md]
    blocked_by: [3]
    satisfies: []
---
# Plan Steps in Frontmatter — Implementation Plan

## Goal

Implement the design: make frontmatter `steps` the single source of truth, with one canonical serializer owning the body view, a `status` enum replacing `done`, stable step ids for `blocked_by`, and an explicit `loom migrate-plan-steps` command for backward compatibility. Build via `./scripts/build-all.sh` and verify with `./scripts/test-all.sh` after every step. Step 1 is intentionally wide — the `done`→`status` type change cascades, so it sweeps all readers in one move to keep the build green; steps 2–7 are clean verticals.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Core model migration + single serializer + reducer. New `PlanStep` (id, order, status enum, title, description, files, blocked_by, satisfies, detail; drop `done`); fold `generatePlanBody`+`generateStepsTable`+`updateStepsTableInContent` into one `serializePlanBody()`; `parseStepsTable` extended to fill new fields (migration-only); reducer COMPLETE_STEP→status; sweep every `.done`/"Step N" reader across all packages so build-all stays green; round-trip invariant test. | packages/core/src/entities/plan.ts, packages/core/src/reducers/planReducer.ts, packages/core/src/planUtils.ts, packages/core/src/planTableUtils.ts, packages/core/src/bodyGenerators/planBody.ts, packages/core/src/filters/planFilters.ts, packages/core/src/validation.ts, packages/core/src/index.ts | — | — |
| ✅ | 2 | Source-of-truth flip. Loader reads frontmatter `steps` (read-only body-parse fallback for legacy docs); saver regenerates body via `serializePlanBody`; `serializeFrontmatter` handles the nested step-object array. | packages/fs/src/serializers/frontmatterLoader.ts, packages/fs/src/serializers/frontmatterSaver.ts, packages/core/src/serializers/frontmatterUtils.ts | 1 | — |
| ✅ | 3 | Create path. `loom_create_plan` accepts a structured `steps` object array (+ step-id synthesis); drop `content`→table parsing from creation. | packages/app/src/weavePlan.ts, packages/mcp/src/tools/createPlan.ts, packages/core/src/idUtils.ts | 1, 2 | — |
| ✅ | 4 | Refine / promote / generate / updateDoc route through the serializer; stop hand-parsing plan bodies on the live path. | packages/app/src/refinePlan.ts, packages/app/src/promoteToPlan.ts, packages/mcp/src/tools/generate.ts, packages/mcp/src/tools/updateDoc.ts | 1, 2 | — |
| ✅ | 5 | Step tools & readers surface status/id meaningfully (status symbols, step-id refs, do-next-step, blocked listing) across mcp / cli / vscode. | packages/mcp/src/tools/listPlanSteps.ts, packages/mcp/src/tools/completeStep.ts, packages/mcp/src/prompts/doNextStep.ts, packages/app/src/getState.ts, packages/cli/src/commands/status.ts, packages/vscode/src/tree/treeProvider.ts | 1 | — |
| ✅ | 6 | `loom migrate-plan-steps` command: body→frontmatter, id synthesis, idempotent, `--dry-run`, batch + single-doc; migrate this repo's plans; test against the chord-flow project. | packages/app/src/migratePlanSteps.ts, packages/cli/src/commands/migratePlanSteps.ts, packages/cli/src/index.ts | 2, 3 | — |
| ✅ | 7 | Contract docs. LOOM_CLAUDE_MD template + root CLAUDE.md state the structured-steps contract; keep both surfaces in sync. | packages/app/src/installWorkspace.ts, CLAUDE.md | 3 | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

---

<!-- step:core-model-migration-single-serializer-reducer -->
### Step 1 — Core model migration + single serializer + reducer

- `entities/plan.ts` — replace `PlanStep` with the v2 shape: `id`, `order`, `status: 'pending'|'in_progress'|'done'|'cancelled'`, `title`, `description`, `files`, `blocked_by`, `satisfies`, `detail?`. Remove `done`.
- `planTableUtils.ts` + `bodyGenerators/planBody.ts` — collapse into one pure `serializePlanBody(steps, { goal }) -> string`: `## Goal` → 6-col `## Steps` table → `### Legend` → one `### Step N — {title}` section per step (from `detail`). Symbol renders from `status`. Keep `parseStepsTable` but extend it to populate the new fields (it is now migration-only).
- `reducers/planReducer.ts` — COMPLETE_STEP sets `status='done'`; auto-complete when all non-cancelled steps are done. Reducer stays pure.
- `planUtils.ts` — `findNextStep` (`step.done`→`status!=='done'`); `isStepBlocked` resolves internal blockers by **step id**, cross-plan by plan-id.
- `filters/planFilters.ts`, `validation.ts`, and every other `.done` reader (`app/completeStep.ts`, `app/validate.ts`, `mcp/resources/diagnostics.ts`, etc.) swept to `status` in the same step.
- **Done when:** `build-all` green, `test-all` green, and `parseStepsTable(serializePlanBody(steps)) === steps` passes for arbitrary step arrays.

<!-- step:source-of-truth-flip -->
### Step 2 — Source-of-truth flip (loader / saver)

- `frontmatterLoader.ts` — if frontmatter has `steps`, use it; the body table is ignored. If absent (legacy), parse the body **read-only** so the doc still loads. No write-back on load.
- `frontmatterSaver.ts` — regenerate the body from `doc.steps` via `serializePlanBody`.
- `frontmatterUtils.ts` (`serializeFrontmatter`) — serialize the nested step-object array under `steps`, after `target_version`/`req_version`, preserving canonical key order.
- **Done when:** a frontmatter-native plan round-trips (save→load→save byte-stable); a legacy plan with no frontmatter steps still loads.

<!-- step:create-path -->
### Step 3 — Create path

- `weavePlan.ts` — build `doc.steps` from a structured input array; drop the `content`→`parseStepsTable` branch. Synthesize each `id`.
- `mcp/tools/createPlan.ts` — schema takes `steps` as objects (`{ title, description, files?, blockedBy?, satisfies?, detail? }`); `goal` prose stays. `content` (if kept) is Goal/Notes prose only, never parsed for steps.
- `idUtils.ts` — `generateStepId(title|description, existingIds)` (slug, collisions suffixed `-2`).
- **Done when:** creating a plan with structured steps yields a canonical body + frontmatter steps; round-trip test passes.

<!-- step:refine-promote-generate-updatedoc-route-through -->
### Step 4 — Refine / promote / generate / updateDoc

- `refinePlan.ts`, `promoteToPlan.ts`, `mcp/tools/generate.ts` — emit bodies via `serializePlanBody`; build structured steps rather than re-parsing regenerated markdown.
- `mcp/tools/updateDoc.ts` — stop re-deriving `steps` from the body on plan edits; the Steps section is serializer-owned, step changes go through step tools.
- **Done when:** refine/promote/generate produce frontmatter-truth plans; `loom_update_doc` on a plan never rewrites its steps from the body.

<!-- step:step-tools-readers-surface-status-id -->
### Step 5 — Step tools & readers surface status / id

- mcp step tools (`listPlanSteps`, `completeStep`, `doStep`, `getBlockedSteps`, `startPlan`, `closePlan`) + `prompts/doNextStep.ts` — read frontmatter steps, surface `status` symbol and step `id`.
- `app/getState.ts`, `cli/commands/status.ts`, `vscode/tree/treeProvider.ts` — render the four statuses (icons) and step ids.
- **Done when:** `do-next-step`, `complete_step`, and blocked-step listing work end-to-end on a frontmatter-native plan, showing correct status.

<!-- step:command-body-frontmatter-id-synthesis-idempotent -->
### Step 6 — Migration command

- `app/migratePlanSteps.ts` — use-case: for each legacy plan, `parseStepsTable` (+ `parseNumberedSteps` fallback) → structured steps with synthesized ids → write to frontmatter. Idempotent (skips already-migrated docs). Returns a per-doc report.
- `cli/commands/migratePlanSteps.ts` + `cli/index.ts` — `loom migrate-plan-steps [--dry-run] [docId]`, batch or single.
- Migrate this repo's existing plans; then run against `J:/src/chord-flow` to shake out very-legacy edge cases.
- **Done when:** dry-run reports correctly, apply converts this repo's plans, and chord-flow's plans migrate cleanly (or the failures are captured as findings).

<!-- step:contract-docs -->
### Step 7 — Contract docs

- `installWorkspace.ts` (`LOOM_CLAUDE_MD`) — document the structured-steps contract so launched agents pass `steps`, never a hand-formatted table.
- root `CLAUDE.md` — mirror the shared rule (the two CLAUDE.md surfaces must stay in sync).
- **Done when:** both surfaces updated and consistent.

## Notes

- No req doc exists for this thread, so `Satisfies` is empty across all steps.
- Per the clean-over-legacy rule there are **no compatibility shims**: the `done`→`status` change cascades in Step 1, and the legacy body-parse in the loader is a read-only bridge retired by the Step 6 migration, not a permanent dual source of truth.
