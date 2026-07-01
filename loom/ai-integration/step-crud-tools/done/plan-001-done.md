---
type: done
id: pl_01KTV5CCCDWJP8BYVZ18DNE849-done
title: Done — Plan step-CRUD tools
status: done
created: "2026-06-11T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KTV5CCCDWJP8BYVZ18DNE849
requires_load: []
---
# Done — Plan step-CRUD tools

## Step 1 — Tag plan detail sections with <!-- step:{id} --> markers and make the plan saver re-key/reorder/prune them by id (preserving authored prose), alongside the existing table regen.

**Option A foundation — id-keyed per-step detail sections + saver re-keying.**

Files edited:
- `packages/core/src/planTableUtils.ts`
  - `serializePlanBody` now emits a hidden `<!-- step:{id} -->` marker line above each `### Step N — {title}` detail section (was order-keyed only).
  - New exported `rekeyDetailSections(content, steps)`: parses existing detail sections by their marker (or, for a marker-less legacy body, maps them to step ids best-effort by document order), then re-emits them **in frontmatter step order** — authored prose + title preserved, `Step N` re-rendered from current `order`, orphaned sections (id no longer in plan) pruned, and a freshly-added step's transient `detail` stubbed in. Preserves the Goal/Steps/Legend preamble and any non-detail trailing section (e.g. `### Notes`) verbatim. Idempotent.
  - Helpers added: `stepMarker`, `STEP_MARKER_RE`, `STEP_HEADING_RE`, `stripStepNumber`, `renderDetailSections`.
- `packages/core/src/index.ts` — export `rekeyDetailSections`.
- `packages/fs/src/serializers/frontmatterSaver.ts` — after `updateStepsTableInContent` (table regen), call `rekeyDetailSections(bodyContent, steps)` on the plan save path so detail sections track steps by id on every save. This also retroactively fixes the latent detail-drift in the already-shipped `loom_reorder_steps`.

Decisions: prose precedence = authored body section wins over a step's transient `detail`; a step with neither yields no section (also the pruning mechanism); backfill is positional in step order (one-time legacy bridge — after the first save every section carries a stable marker).

Verified via a throwaway script against the dist build: legacy backfill adds markers without reordering; reorder reflows sections by id and renumbers; remove prunes the orphan; add stubs the new step's detail; second pass is byte-identical (idempotent). `./scripts/build-all.sh` clean.

## Step 2 — ADD_STEP event + reducer (insert at append/before/after position, slug id, recompute order) + app use-case + MCP tool registered in the plan group.

**ADD_STEP — event + reducer + app use-case + MCP tool.** Event-sourced, mirrors the 1.4.0 step tools.

Files:
- `packages/core/src/events/planEvents.ts` — added `NewStep` interface (description required; title/files_touched/blockedBy/satisfies/detail optional), `StepPosition` type (`'append' | { after } | { before }`), and the `ADD_STEP` event to `PlanEvent`.
- `packages/core/src/reducers/planReducer.ts` — `ADD_STEP` case + `leadingTerminalCount` helper. Status-guarded to draft/active/implementing/blocked (same as UPDATE_STEP). Resolves the insert index from `position` (append default; after→refIdx+1, before→refIdx; unknown ref id rejected). **Leading-block guard:** a new pending step cannot be inserted before the contiguous leading done/cancelled block — same history invariant REORDER_STEPS enforces (this is the success-criterion "rejected by add-adjacent, consistent with reorder"). Mints a fresh id via `slugifyStepId` (collision-safe against existing ids), carries `title`/`detail` transiently on the model (so the Option-A saver from step 1 stubs the body detail section), recomputes `order` 1..n.
- `packages/core/src/applyEvent.ts` — added `ADD_STEP` to the plan-event dispatch list.
- `packages/app/src/addStep.ts` (new) — `addStep(input, deps)`: resolves weave, validates description, maps `files`→`files_touched`, runs the event via `runEvent`, returns the reloaded `{ plan }`.
- `packages/mcp/src/tools/addStep.ts` (new) — `loom_add_step` tool. Args: planId, description (required), title, files, blockedBy, satisfies, detail, and `after`/`before` (mutually exclusive; neither = append). Registered in the `plan` group in `packages/mcp/src/server.ts`.

Design note (not a new decision — the consistent reading of the resolved design): a new step inserts only at or after the leading done/cancelled block; inserting before it is rejected rather than silently reordering history.

Verified against the dist build: append/before/after positioning + order recompute, slug-collision suffixing, transient `detail` carried onto the new step, leading-done guard rejects `before` a done step while `append` past it works, and bad position-ref / empty-description / done-plan-status are all rejected. `./scripts/build-all.sh` clean.

## Step 3 — REMOVE_STEP event + reducer (reject done/cancelled, strip blockedBy refs to it + report, recompute order) + app use-case + MCP tool.

**REMOVE_STEP — event + reducer + app use-case + MCP tool.** Event-sourced, strip-and-report semantics (resolved decision 2).

Files:
- `packages/core/src/events/planEvents.ts` — added `REMOVE_STEP` (`{ stepId, planId? }`) to `PlanEvent`.
- `packages/core/src/reducers/planReducer.ts` — `REMOVE_STEP` case. Status-guarded to draft/active/implementing/blocked. Rejects unknown step id, and rejects a done/cancelled step (immutable history — same guard wording as UPDATE_STEP). Removes the step, strips any `blockedBy` references to its id from the surviving steps (no dangling blocker), recomputes `order` 1..n.
- `packages/core/src/applyEvent.ts` — added `REMOVE_STEP` to the plan-event dispatch list.
- `packages/app/src/removeStep.ts` (new) — `removeStep(input, deps)`. Computes `strippedBlockers` (ids of surviving steps that referenced the removed step) from the **pre-removal** state — which the pure reducer strips exactly — runs the event, and returns `{ plan, strippedBlockers }` so the caller can re-thread deps.
- `packages/mcp/src/tools/removeStep.ts` (new) — `loom_remove_step(planId, stepId)`. Registered in the `plan` group in `packages/mcp/src/server.ts`.

The removed step's body detail section is pruned automatically by the step-1 Option-A saver (its id no longer appears in the step model, so `rekeyDetailSections` drops the orphan).

Verified against the dist build: removing a middle step recomputes order (a=1,c=2) and strips the `blockedBy:['b']` ref from the survivor; done / cancelled / unknown-id / done-plan-status are all rejected. `./scripts/build-all.sh` clean.

## Step 4 — Reducer + handle tests for add/remove, plus the detail-section round-trip invariant under reorder/add/remove (the Option-A guarantee), including a reorder_steps detail-reflow regression.

**Tests — `tests/step-crud.test.ts` (new), registered in `scripts/test-all.sh`.** Four sections, mirroring `tests/mcp-new-tools.test.ts` style (custom `assert`, dist imports, ts-node).

- **A. ADD_STEP reducer (pure):** append/before/after positioning + order recompute, slug id, transient `detail` carried, slug-collision suffixing (`a`→`a-2`), and guards: empty description, unknown position ref, add-on-done-plan, and the leading done/cancelled-block guard (reject `before` a done step; append past it works).
- **B. REMOVE_STEP reducer (pure):** removal + order recompute + blockedBy-ref strip; rejects done / cancelled / unknown-id.
- **C. `rekeyDetailSections` invariant (pure):** marker-less backfill maps sections to ids by order and preserves prose; reorder reflows sections by id (the **reorder_steps detail-reflow regression** — prose follows id not position, Step N re-rendered); add stubs the new id's transient detail; remove prunes the orphan; idempotent (byte-identical second pass).
- **D. Real-fs save round-trip (frontmatterSaver wiring):** `weavePlan` creates a plan with 3 detail-bearing steps → reorder/add/remove run through the app use-cases (`reorderSteps`/`addStep`/`removeStep`) via `runEvent` (which saves) → reload from disk each time and assert the saved body's `<!-- step:id -->` sections track the step order by id, prose stays attached through the saver, the added section persists, and the removed section is pruned. Also asserts `removeStep` returns `strippedBlockers`.

Helpers: `detailOrder(body)` (marker ids in document order) and `proseFor(body, id)` (prose under a section).

Result: `tests/step-crud.test.ts` passes all four sections. Re-ran `tests/plan-table-utils.test.ts` and `tests/plan-frontmatter-steps.test.ts` — both green, confirming the `serializePlanBody` marker change introduced no regression.

## Step 5 — Add add_step/remove_step to both CLAUDE.md surfaces (drift test enforces parity), CHANGELOG, build-all + test-all, lockstep bump to 1.5.0.

**Docs sync, build, test, lockstep bump to 1.5.0.**

- **Both CLAUDE.md surfaces (writes-breakdown):** added `loom_add_step` + `loom_remove_step` to the "Plan step edits" line in `CLAUDE.md` (recursive contract) and the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts` (project-agnostic, terser voice, backtick-escaped). No `<!-- rule:id -->` markers added/removed — the edit is inside an existing shared rule, so rule-set parity is preserved and both surfaces now name the same write-path tools. `tests/claude-md-sync.test.ts` passes (parity + verbatim invariants).
- **CHANGELOG (root):** wrote a 1.5.0 entry under `[Unreleased]` — Added (`loom_add_step`/`loom_remove_step` full step CRUD) + Fixed (id-keyed detail sections; retroactive `loom_reorder_steps` detail-drift fix). `bump-version.sh` then promoted it to `## [1.5.0] - 2026-06-11`.
- **CHANGELOG (vscode):** hand-added a `[1.5.0]` lockstep note (the bump script only rolls the root CHANGELOG).
- **Build + test:** `./scripts/build-all.sh` clean; `./scripts/test-all.sh` fully green (set -e, reached the "All tests passed" banner — includes the new `tests/step-crud.test.ts`, `claude-md-sync`, and the 16-test MCP integration suite).
- **Lockstep bump:** `bash scripts/bump-version.sh 1.5.0` — all 7 package.json now at 1.5.0 (verified by the script's own guard), CHANGELOG rolled.

**Release commit/tag/push — staged, gated on Rafa (per the plan).** Not executed. When Rafa gives the go:
```
git add -A
git commit -m "release: v1.5.0"
git tag v1.5.0
git push --follow-tags        # plus: git push origin v1.5.0  (lightweight tag — --follow-tags won't carry it)
```
Note (per known release gotcha): the tag is lightweight, so push it explicitly or the release workflow never triggers. Unrelated pre-existing working-tree changes under `loom/ai-integration/mcp-new-tools/` were left untouched.
