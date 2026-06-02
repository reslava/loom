---
type: done
id: pl_01KT3FNB25446NP4J0C6YEK9KH-done
title: "Done — create-with-body: one-call doc body + sampling-free promote"
status: done
created: "2026-06-02T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KT3FNB25446NP4J0C6YEK9KH
requires_load: []
---
# Done — create-with-body: one-call doc body + sampling-free promote

## Step 1 — Thread an optional content/body through the create use-cases: weaveIdea, weaveDesign, weavePlan (and create_reference). When provided, it replaces the generated stub so the doc is born at version 1 with real content; when omitted, behaviour is unchanged.

Threaded an optional `content` through the three create use-cases.

**Files:**
- `packages/app/src/weaveIdea.ts` — added `content?` to `WeaveIdeaInput`; both branches now use `input.content ?? generateIdeaBody(...)`.
- `packages/app/src/weaveDesign.ts` — added `content?` to `WeaveDesignInput`; both branches use `input.content ?? generateDesignBody(...)`.
- `packages/app/src/weavePlan.ts` — added `content?` to `WeavePlanInput`; both branches now use `input.content ?? generatePlanBody(...)` for the body. **Plan-specific:** when `content` is supplied, frontmatter `steps` are parsed from it via `parseStepsTable` (keeping the body table and frontmatter steps in sync, mirroring `updateDoc`); `content` takes precedence over `goal`/`steps`. Imported `parseStepsTable` from the core barrel.

When `content` is omitted, behaviour is unchanged (generated stub).

**Note:** `create_reference` has no app use-case — its body is written inline in the MCP tool — so its content handling is done in step 2 alongside its schema, not here.

## Step 2 — Expose the optional body arg on the MCP tool schemas: loom_create_idea, loom_create_design, loom_create_plan, loom_create_reference. Update tool descriptions.

Exposed the optional body arg on all four create-tool schemas and wired it into the use-case calls. Used `content` as the arg name across all four for consistency with `loom_update_doc`.

**Files:**
- `packages/mcp/src/tools/createIdea.ts` — added `content` to schema + passed into `weaveIdea` input; description notes one-call body and that the doc is born `draft`.
- `packages/mcp/src/tools/createDesign.ts` — same.
- `packages/mcp/src/tools/createPlan.ts` — added `content` to schema + passed into `weavePlan` input; description explains content takes precedence over goal/steps and its steps table is parsed into frontmatter steps.
- `packages/mcp/src/tools/createReference.ts` — added `content`; body = provided content (newline-normalized) when present, else the existing placeholder. Description notes reference docs are born `active` (no draft gate). (This is the create_reference body logic deferred from step 1, since it has no app use-case.)

## Step 3 — Add optional body to loom_promote: when body is supplied, skip the samplingAiClient path and write the body directly — this unblocks promote in Claude Code sessions.

Added optional inline body to `loom_promote`, bypassing sampling.

**App use-cases** (`packages/app/src/promoteToIdea.ts`, `promoteToDesign.ts`, `promoteToPlan.ts`): added optional `title?` + `body?` to each input. When `body` is provided: skip the empty-source check and the `aiClient.complete` call; `title = input.title ?? doc.title`; the body is written verbatim (no `# title` prepend, since the agent owns the full markdown). When `body` is omitted, the AI/sampling path is unchanged.
- `promoteToPlan`: steps are parsed from the provided body — `parseStepsTable` first (how plans are normally structured), numbered-list fallback; errors if neither yields steps. Imported `parseStepsTable`.

**MCP tool** (`packages/mcp/src/tools/promote.ts`): added `title` + `body` args to the schema, passed through to the promote use-cases via the `target` object. Rewrote the description: `body` skips sampling and is the path to use in Claude Code (where server→client sampling is blocked); for target "plan" the body must contain a Steps table or numbered Steps list. `samplingAiClient` is still constructed but is only invoked on the no-body (sampling) path.

This unblocks `loom_promote` in Claude Code sessions for the first time.

## Step 4 — Confirm finalize semantics: body-on-create stays status: draft (no auto-finalize); draft→active remains the explicit human gate. create_reference stays born active.

Confirmed finalize semantics — verification step, no code change required.

`createBaseFrontmatter` (packages/core/src/frontmatterUtils.ts) sets `status: 'draft'` and `version: 1`. The body-on-create changes only swap the body source (`input.content ?? generated`) and never touch status, so:
- **idea / design** — born `status: draft`, `version: 1` (with the real body in one call; no auto-finalize, no version bump). This replaces the old create-shell (v1) → update-body (v2) two-step, so the doc now lands at v1 with content.
- **plan** — keeps its pre-existing status (`active` in a thread, `draft` at weave root); body-on-create did not alter it.
- **reference** — still written `status: active` directly (no draft gate), as before.

`draft → active` remains an explicit, separate operation (`loom_finalize_doc` / `loom_update_doc status=active`). No auto-finalize was added on any create path.

## Step 5 — Tests: a single create call produces a doc at version 1 with the provided body; promote with body produces the target doc without invoking sampling.

Added `tests/create-with-body.test.ts` (registered in `scripts/test-all.sh`). Real-fs, ts-node, custom `assert`.

Exercises the app create use-cases directly (and `create_reference` via its MCP handle), plus the promote use-cases with a **throwing AI client** (`complete()` throws) to prove the body path never invokes sampling. Assertions:
1. create idea with body → body present, born `version: 1`, `status: draft`.
2. create design with body → body present, v1, draft.
3. create plan with body (steps table) → body present, frontmatter `steps` parsed from the table (2 steps), v1.
4. create reference with body → body present, born `status: active`.
5. promote chat→idea with body → body written verbatim (no `# title` prepend), born draft, and the throwing AI client was never called (no sampling).
6. promote chat→plan with body (steps table) → steps parsed from the body (2), no sampling.

One fix during testing: corrected an assertion — `promoteToIdea` links the new idea to its weave/thread *scope* (`idScope`), not the source doc id (only design/plan link to the source `doc.id`).

Build clean; the new test passes; the full `test-all.sh` suite passes (all 9 MCP integration tests green, including the touched `loom_find_doc` / `loom_create_idea` / `loom_complete_step` paths).
