---
type: chat
id: table-steps-chat-001
title: table-steps
status: done
created: 2026-05-06
version: 1
tags: []
parent_id: null
requires_load: []
---
# CHAT

## Rafa:

### Plan table steps
- I observe when AI create a plan using mcp do not create table for steps:

```markdown
# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
```

AI just create Steps description, for example, 
like you did in `loom/core-engine/doc-ids/plans/doc-ids-plan-001.md`
`## ✅ Step 1 — ULID minter + type prefix table`

We need to force AI using loom to create the `table steps` to be used with `DoSteps`



## AI:

Good catch. I traced the full path and found two root causes.

**Root cause 1 — `loom_create_plan` has no `steps` parameter.**

`packages/mcp/src/prompts/weavePlan.ts` tells the AI to call `loom_create_plan` with "the steps array", but `loom_create_plan`'s tool definition has no `steps` input. The app-layer `weavePlan()` also has no `steps` param. So the steps are silently dropped, and `generatePlanBody()` produces a placeholder table with a generic `{Step description}` row.

**Root cause 2 — the follow-up `loom_update_doc` call drops the table.**

After `loom_create_plan` creates the skeleton, AI calls `loom_update_doc` to write the actual plan body. When it does, it writes `## Step N — ...` sections for detail but doesn't maintain the `# Steps` table — the table either disappears or becomes empty (which is exactly what happened in `doc-ids-plan-001.md`: `# Steps` section present, table body gone, steps as bare section headers below).

**The fix — add `steps` to `loom_create_plan` and pipe it to `generatePlanBody`.**

Make `generatePlanBody(title, goal, steps?)` accept a `steps: string[]`. When steps are provided, populate both representations from the same source:

```markdown
# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | First step description | `src/...` | — |
| 🔳 | 2 | Second step description | `src/...` | — |

---

## Step 1 — First step description

<!-- Detailed spec. -->

---

## Step 2 — Second step description

<!-- Detailed spec. -->
```

The steps array is the single source of truth — both the table and the section headers are generated from it. No drift possible.

**Cascade:**
- `generatePlanBody(title, goal?, steps?)` in `packages/core/src/bodyGenerators/planBody.ts`
- `WeavePlanInput.steps?: string[]` in `packages/app/src/weavePlan.ts`
- `loom_create_plan` tool schema — add `steps: { type: "array", items: { type: "string" } }` input
- `weavePlan.ts` prompt — already asks AI to generate a steps JSON array and pass it; now the tool will actually use it

This removes the need for a follow-up `loom_update_doc` to populate steps — one `loom_create_plan` call creates a complete, table-correct plan.

Want me to draft a plan for this?

## Rafa:

- Create a plan
- Do the entire plan

## AI:

Creating the plan now, then executing all steps.

## AI:

**Finding before executing:** `loom_update_doc` is broken post-ULID migration.

`findDocumentById` in `packages/fs/src/utils/pathUtils.ts:44` searches for a file named `{id}.md`. Pre-ULID that worked because filenames matched ids. Post-ULID, filenames are `table-steps-plan-001.md` but ids are `pl_01KQYFA0DCH6H1PZ2AYXRJC1RX` — lookup always returns null. Every `loom_update_doc` call on any doc has been failing since the migration.

Fixing this as step 0 (prerequisite), then proceeding with the plan.

## AI:

**Plan complete — all code changes done and build passing.**

**Changes made:**

`packages/fs/src/utils/pathUtils.ts` — Prerequisite fix: `findDocumentById` and `gatherAllDocumentIds` were searching by filename (`{id}.md`) instead of reading the frontmatter `id` field. Post-ULID migration every doc's filename is human-readable while its id is a ULID, so all `loom_update_doc` calls were returning "Document not found". Fixed both functions to parse frontmatter with `yaml` and match on the `id` field.

`packages/core/src/bodyGenerators/planBody.ts` — `generatePlanBody(title, goal?, steps?)` now accepts a `steps?: string[]`. When provided, generates a populated steps table (one `🔳` row per step) and a detailed `## Step N — ...` section per step from the same array. Without steps, keeps existing placeholder behaviour.

`packages/app/src/weavePlan.ts` — `WeavePlanInput` gains `steps?: string[]`; passed through to `generatePlanBody` in both the thread branch and the weave-root branch.

`packages/mcp/src/tools/createPlan.ts` — Tool schema gains `steps` (array of strings). Value forwarded to `weavePlan`.

Build: `npm run package` exits clean (VSIX packaged, no TS errors).

**Note:** the plan doc itself still shows the old placeholder body because `loom_update_doc` ran against the old server binary (before the fix was compiled in). The doc will be updatable after the MCP server restarts with the new dist.

## Rafa:

`loom/ai-integration/table-steps/plans/table-steps-plan-001.md` is empty, just a draft

i restarted mcp

check fixes creating the plan