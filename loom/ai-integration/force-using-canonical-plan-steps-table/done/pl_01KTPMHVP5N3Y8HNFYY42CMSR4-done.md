---
type: done
id: pl_01KTPMHVP5N3Y8HNFYY42CMSR4-done
title: Done — Plan Steps in Frontmatter — Implementation Plan
status: done
created: "2026-06-09T00:00:00.000Z"
version: 7
tags: []
parent_id: pl_01KTPMHVP5N3Y8HNFYY42CMSR4
requires_load: []
---
# Done — Plan Steps in Frontmatter — Implementation Plan

## Step 1 — Core model migration + single serializer + reducer. New `PlanStep` (id, order, status enum, title, description, files, blocked_by, satisfies, detail; drop `done`); fold `generatePlanBody`+`generateStepsTable`+`updateStepsTableInContent` into one `serializePlanBody()`; `parseStepsTable` extended to fill new fields (migration-only); reducer COMPLETE_STEP→status; sweep every `.done`/"Step N" reader across all packages so build-all stays green; round-trip invariant test.

Core model migration + single serializer + reducer. `PlanStep` gained `id`, `status` enum (`pending|in_progress|done|cancelled`), `title`, `detail?`; dropped the `done` boolean. Folded `generatePlanBody` + `generateStepsTable` + `updateStepsTableInContent` into one `serializePlanBody()` — which immediately killed a latent **5-col vs 6-col table drift** (the two generators disagreed on the Satisfies column). `planReducer` COMPLETE_STEP → `status='done'`; auto-completes when all steps are done/cancelled. `isStepBlocked` resolves internal blockers by stable **step id** first, falling back to legacy "Step N" ordinals. Swept every `.done` reader across core/app/mcp/cli/vscode and **removed two duplicate `PlanStep` definitions** (in `planTableUtils.ts` and `vscode/commands/doStep.ts`). Added a `parse(serialize(steps)) === steps` round-trip invariant test. Build + full suite green.

## Step 2 — Source-of-truth flip. Loader reads frontmatter `steps` (read-only body-parse fallback for legacy docs); saver regenerates body via `serializePlanBody`; `serializeFrontmatter` handles the nested step-object array.

Source-of-truth flip. The loader (`frontmatterLoader`) now prefers a structured `steps` block from frontmatter; only a legacy doc with no such block falls back to a **read-only** body-table parse. Provenance is recorded in a transient `_stepsFromFrontmatter` marker. The saver (`frontmatterSaver`) persists the steps block **only for frontmatter-native plans** — so saving a legacy plan (e.g. via `complete_step`) never silently migrates it; migration is exclusively the Step 6 command. The body table is regenerated as a *view* that preserves authored Goal / `### Step N` detail / Notes prose. Added `serializeStepsBlock` (snake_case YAML; in-memory `blockedBy` → persisted `blocked_by`) and its inverse `parseFrontmatterSteps`. `title`/`detail` are intentionally **not** persisted (body owns that prose — no duplication, no drift). Byte-stable save→load→save round-trip test + legacy-fallback test.

## Step 3 — Create path. `loom_create_plan` accepts a structured `steps` object array (+ step-id synthesis); drop `content`→table parsing from creation.

Create path. `weavePlan` and `loom_create_plan` now take a structured `steps` array of objects (`{ description, title?, files?, blockedBy?, satisfies?, detail? }`); a plan created this way is **born frontmatter-native** (ids synthesized, `status: pending`, body generated via `serializePlanBody`). The tool description explicitly steers agents to pass data, not a hand-formatted table — the direct fix for the original chord-flow failure. `title`/`detail` are create-time seed inputs (they render the body's `### Step N` sections) and are not persisted to frontmatter. **Deviation from plan:** did not add `generateStepId` to `idUtils` — reused the existing `slugifyStepId` rather than duplicate an id-generator. New structured-create test (legacy content-create test still passing).

## Step 4 — Refine / promote / generate / updateDoc route through the serializer; stop hand-parsing plan bodies on the live path.

Refine / promote / generate / updateDoc routed through the serializer. `generate.ts` hands generated steps to `weavePlan` as structured data (no markdown round-trip); `promoteToPlan` marks promoted plans frontmatter-native; `refinePlan` preserves status + Satisfies citations into frontmatter; `updateDoc` only re-derives steps from the body for **legacy** plans (a native plan's body edit touches prose, never steps). **The `content` create-path was removed** from `loom_create_plan` and `weavePlan` — plans are now structured-only (idea/design/reference keep `content`). This makes a stepless/non-canonical plan **structurally impossible to create**: the original chord-flow failure mode is closed at the tool boundary. The MCP integration test now creates its citing-plan via structured `steps` against a live `loom mcp` subprocess (end-to-end verification).

## Step 5 — Step tools & readers surface status/id meaningfully (status symbols, step-id refs, do-next-step, blocked listing) across mcp / cli / vscode.

Step tools & readers surface the stable step `id`. `loom_list_plan_steps` returns each step's `id`; the `do-next-step` instruction shows it ("Implement step 3 (id: foo): …"); `getBlockedSteps` (+ `loom_get_blocked_steps` / `loom blocked`) carries `stepId` so a blocked listing shows both the blocked step's id and its blockers' ids — the full dependency graph in stable handles. Status rendering (the four symbols in CLI/tree, status-aware `do-next-step`/`getState`/filters) was already complete from Step 1's sweep, so this step was small. Integration test asserts the step `id` is present via the live subprocess.

## Step 6 — `loom migrate-plan-steps` command: body→frontmatter, id synthesis, idempotent, `--dry-run`, batch + single-doc; migrate this repo's plans; test against the chord-flow project.

Migration command. New `app/migratePlanSteps.ts` use-case + `loom migrate-plan-steps [docId] [--dry-run]` CLI: legacy body-table plans → frontmatter-native, **idempotent** (skips already-native), and **never destructive** — a plan whose table can't be parsed is reported `unparseable` and left byte-identical (so a foreign/legacy table is never silently emptied). Test covers legacy→migrated, native→skip, foreign-table→unparseable, idempotent re-run. **Applied:** this repo → 81 migrated / 6 unparseable / 1 no-steps; chord-flow → 6 migrated. All 88 plans here + 6 in chord-flow load clean afterward.

**Serializer bug found via this dogfooding (root cause in Step 2's `serializeFrontmatter`, fixed here):** a single lax quoting rule served both YAML contexts, so (1) an inline `[a, b]` array item containing `, ` / `: ` / brackets / backticks and (2) a block scalar *starting* with a reserved indicator (backtick / `@`) both produced invalid YAML that broke the next load. Fixed by splitting `needsBlockQuote` vs `needsFlowQuote` (leading-indicator detection + backslash escaping); 2 regression tests added. Recovery: reverted via git, re-migrated; one untracked chord-flow plan hand-repaired (stripped its corrupted block, re-migrated). **7 holdouts** (pre-canonical column layouts / heading-style steps) left untouched by decision — old/done threads that still load fine.

## Step 7 — Contract docs. LOOM_CLAUDE_MD template + root CLAUDE.md state the structured-steps contract; keep both surfaces in sync.

Contract docs. The `LOOM_CLAUDE_MD` template (`installWorkspace.ts`) and the repo-root `CLAUDE.md` now both state the structured-steps contract: create a plan with `goal` + a `steps` array of objects, **never** a Markdown table; Loom owns the canonical table; steps live in frontmatter (source of truth); the body table is a generated view; `loom_create_plan` no longer accepts `content` (idea/design/reference still do). Corrected the old "idea/design/plan all accept `content`" line in both surfaces. Both CLAUDE.md surfaces kept in sync per the two-surfaces contract. Build + full suite green.
