---
type: design
id: de_01KTPKWX3A4CSVNK24MRNFF3RN
title: Plan Steps in Frontmatter — Structured Steps as Source of Truth
status: done
created: "2026-06-09T00:00:00.000Z"
updated: 2026-06-09
version: 2
tags: []
parent_id: null
requires_load: []
---
# Plan Steps in Frontmatter — Structured Steps as Source of Truth

## Goal

Make a plan's **structured `steps` array in YAML frontmatter the single source of truth**, and demote the Markdown steps table (and the `### Step N` detail sections) to a **generated view** that is always re-rendered from frontmatter. No plan body is ever hand-authored or re-parsed on the live path; the AI provides steps as structured data, and one serializer owns the markdown.

**Vision check.** This serves Loom's core promise — *derived state from documents drives the step-by-step approval loop*. Today a plan whose body table the regex can't parse silently yields zero steps, which breaks `do-next-step` / `complete_step`. It removes the manual step of a human noticing a malformed plan and hand-fixing the table so the parser sees it. On-vision.

## Problem (root cause)

Steps are **not persisted** today — `frontmatterLoader.ts:46` re-derives `doc.steps = parseStepsTable(body)` on *every load*. The Markdown table is the de-facto source of truth, and every cut/split/data-loss bug we've hit lives in that regex round-trip (the h3-boundary guard, pipe-escaping, and "don't wipe a populated table with an empty parse" guard in `planTableUtils.ts` are all scar tissue defending it). Three concrete consequences:

1. **Silent zero-step plans.** A non-canonical table (the chord-flow failure that started this thread) parses to `[]` and saves without error.
2. **Format drift between two serializers.** `generatePlanBody` (`planBody.ts`) emits a **5-column** table (no `Satisfies`); `generateStepsTable` (`planTableUtils.ts`) emits **6**. A plan is born 5-col and silently rewritten to 6-col on first save.
3. **Mutable dependency refs.** `blocked_by` holds `"Step N"` ordinals (`planUtils.ts:21`); reorder a plan and the dependency graph corrupts. And `done: boolean` (`entities/plan.ts:8`) cannot represent the 🔄 in-progress / ❌ cancelled states the Legend already defines.

## Decision (the spine)

- **Source of truth = frontmatter `steps` (structured).** Body table + `### Step N` sections = generated view, re-rendered on every mutation.
- **One canonical serializer** is the *only* writer of plan bodies. `parseStepsTable` survives for **migration only**.
- **Status enum replaces the `done` boolean.** The table symbol is a pure render of `status`.
- **Stable per-step `id`.** `blocked_by` references step ids (internal) and plan-ids (cross-plan), never ordinals.
- **Backward compatibility via one-shot migration, not a permanent fallback** (a forever body-fallback is a dual source of truth that keeps the bug class alive).

## Data model

```typescript
interface PlanStep {
  id: string;          // stable slug, unique within the plan (survives reorder)
  order: number;       // display order (mutable)
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  title: string;       // short — the "### Step N — {title}" heading
  description: string; // the table "Step" cell (the long form)
  files: string[];     // "Files touched"
  blocked_by: string[];// step ids (internal) + plan-ids (cross-plan)
  satisfies: string[]; // req handles (IN/C)
  detail?: string;     // markdown body for the "### Step N" section
}
```

Symbol render: 🔳 pending · 🔄 in_progress · ✅ done · ❌ cancelled.

`steps` is serialized into plan frontmatter (after `target_version` / `req_version`) by `serializeFrontmatter`, which already enforces key order. A malformed body table becomes a **cosmetic** glitch, never data loss.

## Canonical serializer

Collapse `generatePlanBody` + `generateStepsTable` + `updateStepsTableInContent` into a single `serializePlanBody(steps, { goal }) -> string` (core, pure) that emits: `## Goal` → 6-column `## Steps` table → `### Legend` → one `### Step N — {title}` section per step (from `detail`). It is the sole writer, used by create / save / complete_step / refine / generate / promote.

**Invariant test:** `parseStepsTable(serializePlanBody(steps)) === steps` for arbitrary step arrays — proves write and read agree, and catches any serializer regression before ship.

## Source-of-truth rules (loader / saver)

- **Load** (`frontmatterLoader.ts`): if frontmatter has `steps` → that is truth, body ignored. If absent (legacy doc) → parse body **read-only** so the doc still loads, flag as un-migrated. No write-back on load.
- **Save** (`frontmatterSaver.ts`): regenerate body from `doc.steps` via the serializer (already the right direction; just sourced from frontmatter now).
- **Mark step done / any status change** mutates frontmatter `steps`, then the save regenerates the body view atomically. Both always move together — confirmed: the body can never diverge because it is a projection.

## Backward compatibility & migration

A new explicit **`loom migrate-plan-steps`** command + app use-case (mirrors `scripts/migrate-to-threads.ts`): body→frontmatter via `parseStepsTable` (+ `parseNumberedSteps` fallback for legacy non-canonical plans), synthesizing each step's `id` (slug from title/description, de-duped). Idempotent, batch + single-doc, `--dry-run`. **No implicit write-back on save** — the loader's body-parse is a read-only legacy bridge that the command retires. To be tested against the chord-flow project's existing plans. *(Sequenced last in the implementation plan.)*

## Call-site impact (full scan)

**A — Source-of-truth flip (spine):** `fs/serializers/frontmatterLoader.ts:46`, `fs/serializers/frontmatterSaver.ts:25`.

**B — Single serializer (core):** `core/bodyGenerators/planBody.ts`, `core/planTableUtils.ts` (`generateStepsTable`/`updateStepsTableInContent` fold in; `parseStepsTable` → migration-only), `core/index.ts` exports.

**C — Stop hand-parsing bodies on the live path:** `app/weavePlan.ts:65-70,101-106` (create from structured steps; drop `content`→parse), `mcp/tools/createPlan.ts` (schema: structured `steps`), `app/refinePlan.ts:62`, `app/promoteToPlan.ts:78`, `mcp/tools/generate.ts:213`, `mcp/tools/updateDoc.ts:40` (stop re-deriving steps from plan body).

**D — Status model boolean→enum + stable ids:** `core/entities/plan.ts` (`PlanStep`), `core/reducers/planReducer.ts` (COMPLETE_STEP sets `status`), `app/completeStep.ts:39`, `core/planUtils.ts` (`findNextStep` done→status, `isStepBlocked` "Step N"→step id), `core/filters/planFilters.ts`, `core/validation.ts`, `app/validate.ts`, `mcp/resources/diagnostics.ts`.

**E — Step readers / tools (surface new fields, no behavior change):** `mcp/tools/{completeStep,doStep,appendDone,listPlanSteps,getBlockedSteps,startPlan,closePlan}.ts`, `app/{doStep,getBlockedSteps,getState,closePlan}.ts`, `cli/commands/{completeStep,blocked,startPlan,status}.ts`, `vscode/commands/{completeStep,doStep,startPlan,closePlan}.ts`, `vscode/tree/treeProvider.ts`, `mcp/prompts/doNextStep.ts`; `core/reqCoverage.ts` + `mcp/tools/verifyReq.ts` (ensure `satisfies` intact).

**F — Migration:** new `cli/commands/migratePlanSteps.ts` + `app/migratePlanSteps.ts`.

**G — Contract docs:** `app/installWorkspace.ts` (LOOM_CLAUDE_MD) + root `CLAUDE.md` — state the structured-steps contract so launched agents pass `steps`, not a hand-formatted table.

## Open decisions

1. **Status set** — `pending | in_progress | done | cancelled`. Add `deferred`? (v2 had it; doc-level `PlanStatus` already has `blocked`/`implementing`.) Proposed: the four above.
2. **Per-step `updated` timestamp** — v2 proposed it; proposed here: defer (not now).
3. **`loom_create_plan` input** — `goal` (prose) + `steps` (object array, incl. `detail`). Drop `content`-table parsing entirely; if `content` stays it is Goal/Notes prose only, never parsed for steps. Confirm.
4. **Step id scheme** — slug from `title` (fallback `description`), collisions suffixed `-2`. Confirm.
5. **Cross-plan blockers** — keep plan-ids mixed into the same `blocked_by` array (resolver branches on id shape). Confirm.

## Out of scope / deferred

Per-step timestamps; richer status states beyond the four; any change to cross-plan blocker *resolution* semantics (still best-effort per existing `isStepBlocked`).
