---
type: plan
id: pl_01KX5W1M0T8MDRPEMX62357RWP
title: Slug/Ulid naming sweep — app + mcp internals + consumer output shapes
status: done
created: 2026-07-10
updated: 2026-07-10
version: 1
design_version: 1
tags: []
parent_id: de_01KX5VRFJEQ75RT4QNNJ2TAHSV
requires_load: []
target_version: 0.1.0
steps:
  - id: tier-1a-app-internals
    order: 1
    status: done
    description: "Rename app-layer slug-carrying weaveId/threadId → weaveSlug/threadSlug: use-case locals, deps type params (loadWeave/runEvent), the getState({ weaveId }) options field, AND (decision B) the app query use-case interface field names — input filters ({ threadId }) and output shapes ({ id, threadId, title }) across the query use-cases. Rename per-occurrence, verifying each carries a slug (not a th_ ULID → that would be *Ulid)."
    files_touched: ["packages/app/src/*.ts"]
    blocked_by: []
    satisfies: []
  - id: tier-1b-mcp-tool-internals
    order: 2
    status: done
    description: "Rename the identical safe-internal pattern in packages/mcp/src/tools/*: runEvent closures and the `const weaveId = args['weave_slug']` / `const threadId = args['thread_ulid']` locals. The schema keys (args['weave_slug']) do NOT change — only the locals read from them."
    files_touched: [packages/mcp/src/tools/addStep.ts, packages/mcp/src/tools/completeStep.ts, packages/mcp/src/tools/removeStep.ts, packages/mcp/src/tools/reorderSteps.ts, packages/mcp/src/tools/updateStep.ts, packages/mcp/src/tools/recordRelease.ts, packages/mcp/src/tools/generate.ts, packages/mcp/src/tools/doStep.ts, packages/mcp/src/tools/startPlan.ts, packages/mcp/src/tools/refreshCtx.ts]
    blocked_by: []
    satisfies: []
  - id: tier-1c-core-fs-slug-fields
    order: 3
    status: done
    description: "Tier 1c (decision B2) — rename slug-carrying weaveId/threadId → weaveSlug/threadSlug in packages/core (derived.ts stale+roadmap shapes, entities/thread.ts Thread.weaveId, linkIndex, idUtils param + comments) and packages/fs (repository slug fields), plus sweep tests/. Excludes only the documented non-goals: WorkflowEvent.planId and the frontmatter `id` field. Thread.id (entity identity slug, bare `id`) is left as-is."
    files_touched: [packages/core/src/derived.ts, packages/core/src/entities/thread.ts, packages/core/src/linkIndex.ts, packages/core/src/idUtils.ts, "packages/fs/src/*.ts", "tests/*.ts"]
    blocked_by: []
    satisfies: []
  - id: tier-2a-state-query-param
    order: 4
    status: done
    description: "Rename the loom://state?weaveId= input query param to ?weaveSlug= and sweep its in-repo callers (mcp tests, extension). No back-compat alias — clean rename per the clean-code contract."
    files_touched: [packages/mcp/src/resources/state.ts]
    blocked_by: [tier-1a-app-internals, tier-1b-mcp-tool-internals]
    satisfies: []
  - id: tier-2b-diagnostics-output
    order: 5
    status: done
    description: "Rename the loom://diagnostics output shape { weaveId, threadId } → { weaveSlug, threadSlug } (interface fields + the two assignment sites weaveId: weave.id / threadId: thread.id) and sweep any diagnostics-output reader."
    files_touched: [packages/mcp/src/resources/diagnostics.ts]
    blocked_by: [tier-1a-app-internals, tier-1b-mcp-tool-internals]
    satisfies: []
  - id: tier-2c-getstaleplans-output-cli-readers
    order: 6
    status: done
    description: Rename the loom_get_stale_plans output fields weaveId/threadId → weaveSlug/threadSlug at their definition, then let the compiler surface every CLI reader (roadmap.ts, recordRelease.ts, backfillReleases.ts, migrate.ts) and rename them to the new keys.
    files_touched: [packages/mcp/src/tools/getStalePlans.ts, packages/cli/src/commands/roadmap.ts, packages/cli/src/commands/recordRelease.ts, packages/cli/src/commands/backfillReleases.ts, packages/cli/src/commands/migrate.ts]
    blocked_by: [tier-1a-app-internals, tier-1b-mcp-tool-internals]
    satisfies: []
  - id: doc-sync
    order: 7
    status: done
    description: "Doc sync: update the live-API doc refs to the renamed surfaces — README.md:232 (`?weaveId=`→`?weaveSlug=`), mcp-reference.md:79 (state filter), CLAUDE-template-reference.md:52 (state filter), implementation-contract-reference.md:54 (runEvent signature, also fixes its mislabeled `threadId` first arg). Fold in the slug-placeholder fixes: loom-context-pipeline-reference.md:133,172 (`{weaveId}/{threadId}`→`{weaveSlug}/{threadSlug}`). Verify-only (no matches expected): packages/*/README.md, docs/*.md, LOOM_CLAUDE_MD template. Do NOT touch api-naming-reference.md / api-audit-reference.md (they cite the banned pattern deliberately) or any frozen loom/** history."
    files_touched: [README.md, loom/refs/mcp-reference.md, loom/refs/CLAUDE-template-reference.md, loom/refs/implementation-contract-reference.md, loom/refs/loom-context-pipeline-reference.md, loom/refs/app-query-use-cases-reference.md]
    blocked_by: [tier-2a-state-query-param, tier-2b-diagnostics-output, tier-2c-getstaleplans-output-cli-readers]
    satisfies: []
  - id: closure-gate
    order: 8
    status: done
    description: "Final sweep + verification: build-all + test-all green, then the grep gate `rg 'weaveId|threadId' packages/{app,mcp,cli}/src` must return only the documented non-goals (expected: none in app/mcp/cli). This is the mechanical proof the initiative is closed."
    files_touched: [packages/app/src, packages/mcp/src, packages/cli/src]
    blocked_by: [tier-2a-state-query-param, tier-2b-diagnostics-output, tier-2c-getstaleplans-output-cli-readers]
    satisfies: []
---
# Slug/Ulid naming sweep — app + mcp internals + consumer output shapes

## Goal

Pure, behavior-preserving rename so every weave/thread reference reads unambiguously — a slug is *Slug, a ULID is *Ulid, and *Id never means "slug" — across the corrected boundary from the idea: app-layer internals, mcp/src/tools internals, the three slug-carrying consumer surfaces (state?weaveId=, loom://diagnostics output, loom_get_stale_plans output) and their CLI readers. No control flow, schema, or output values change — only identifier spellings and three JSON keys. Done in two risk tiers (invisible internals → consumer surfaces), each ending build-all/test-all green, with a final grep gate proving zero stragglers in packages/{app,mcp,cli}/src so the naming initiative can be declared closed. Core WorkflowEvent.planId, extension internals, and frontmatter id are explicit non-goals.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Rename app-layer slug-carrying weaveId/threadId → weaveSlug/threadSlug: use-case locals, deps type params (loadWeave/runEvent), the getState({ weaveId }) options field, AND (decision B) the app query use-case interface field names — input filters ({ threadId }) and output shapes ({ id, threadId, title }) across the query use-cases. Rename per-occurrence, verifying each carries a slug (not a th_ ULID → that would be *Ulid). | packages/app/src/*.ts | — | — |
| ✅ | 2 | Rename the identical safe-internal pattern in packages/mcp/src/tools/*: runEvent closures and the `const weaveId = args['weave_slug']` / `const threadId = args['thread_ulid']` locals. The schema keys (args['weave_slug']) do NOT change — only the locals read from them. | packages/mcp/src/tools/addStep.ts, packages/mcp/src/tools/completeStep.ts, packages/mcp/src/tools/removeStep.ts, packages/mcp/src/tools/reorderSteps.ts, packages/mcp/src/tools/updateStep.ts, packages/mcp/src/tools/recordRelease.ts, packages/mcp/src/tools/generate.ts, packages/mcp/src/tools/doStep.ts, packages/mcp/src/tools/startPlan.ts, packages/mcp/src/tools/refreshCtx.ts | — | — |
| ✅ | 3 | Tier 1c (decision B2) — rename slug-carrying weaveId/threadId → weaveSlug/threadSlug in packages/core (derived.ts stale+roadmap shapes, entities/thread.ts Thread.weaveId, linkIndex, idUtils param + comments) and packages/fs (repository slug fields), plus sweep tests/. Excludes only the documented non-goals: WorkflowEvent.planId and the frontmatter `id` field. Thread.id (entity identity slug, bare `id`) is left as-is. | packages/core/src/derived.ts, packages/core/src/entities/thread.ts, packages/core/src/linkIndex.ts, packages/core/src/idUtils.ts, packages/fs/src/*.ts, tests/*.ts | — | — |
| ✅ | 4 | Rename the loom://state?weaveId= input query param to ?weaveSlug= and sweep its in-repo callers (mcp tests, extension). No back-compat alias — clean rename per the clean-code contract. | packages/mcp/src/resources/state.ts | tier-1a-app-internals, tier-1b-mcp-tool-internals | — |
| ✅ | 5 | Rename the loom://diagnostics output shape { weaveId, threadId } → { weaveSlug, threadSlug } (interface fields + the two assignment sites weaveId: weave.id / threadId: thread.id) and sweep any diagnostics-output reader. | packages/mcp/src/resources/diagnostics.ts | tier-1a-app-internals, tier-1b-mcp-tool-internals | — |
| ✅ | 6 | Rename the loom_get_stale_plans output fields weaveId/threadId → weaveSlug/threadSlug at their definition, then let the compiler surface every CLI reader (roadmap.ts, recordRelease.ts, backfillReleases.ts, migrate.ts) and rename them to the new keys. | packages/mcp/src/tools/getStalePlans.ts, packages/cli/src/commands/roadmap.ts, packages/cli/src/commands/recordRelease.ts, packages/cli/src/commands/backfillReleases.ts, packages/cli/src/commands/migrate.ts | tier-1a-app-internals, tier-1b-mcp-tool-internals | — |
| ✅ | 7 | Doc sync: update the live-API doc refs to the renamed surfaces — README.md:232 (`?weaveId=`→`?weaveSlug=`), mcp-reference.md:79 (state filter), CLAUDE-template-reference.md:52 (state filter), implementation-contract-reference.md:54 (runEvent signature, also fixes its mislabeled `threadId` first arg). Fold in the slug-placeholder fixes: loom-context-pipeline-reference.md:133,172 (`{weaveId}/{threadId}`→`{weaveSlug}/{threadSlug}`). Verify-only (no matches expected): packages/*/README.md, docs/*.md, LOOM_CLAUDE_MD template. Do NOT touch api-naming-reference.md / api-audit-reference.md (they cite the banned pattern deliberately) or any frozen loom/** history. | README.md, loom/refs/mcp-reference.md, loom/refs/CLAUDE-template-reference.md, loom/refs/implementation-contract-reference.md, loom/refs/loom-context-pipeline-reference.md, loom/refs/app-query-use-cases-reference.md | tier-2a-state-query-param, tier-2b-diagnostics-output, tier-2c-getstaleplans-output-cli-readers | — |
| ✅ | 8 | Final sweep + verification: build-all + test-all green, then the grep gate `rg 'weaveId\|threadId' packages/{app,mcp,cli}/src` must return only the documented non-goals (expected: none in app/mcp/cli). This is the mechanical proof the initiative is closed. | packages/app/src, packages/mcp/src, packages/cli/src | tier-2a-state-query-param, tier-2b-diagnostics-output, tier-2c-getstaleplans-output-cli-readers | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:tier-1a-app-internals -->
### Step 1 — Tier 1a — app internals

Locals in addStep, removeStep, updateStep, reorderSteps, completeStep, closePlan, doStep, promote*/weave*/validate/searchDocs/recordRelease/quickShip, plus migrateThreads, migrateLayout, buildCtxSource, backfillDesignVersions. Rename the parameter name in the `loadWeave: (loomRoot, weaveId)` and `runEvent: (weaveId, event)` deps type signatures (positional callers unaffected). getState options field is a NAMED key — grep every `getState({ weaveId:` call site across app+mcp+cli+tests and rename together. Ends build-all/test-all green.

<!-- step:tier-1b-mcp-tool-internals -->
### Step 2 — Tier 1b — mcp tool internals

Same class as Tier 1a — invisible internals, zero consumer risk. Ends build-all/test-all green. This completes the Tier-1 checkpoint that Tier 2 depends on.

<!-- step:tier-1c-core-fs-slug-fields -->
### Step 3 — Tier 1c — core + fs slug fields (B2)

Under B2 this is the atomic root of the whole rename: Thread.weaveId and the core derived shapes are re-exported/consumed everywhere, so once they change the compiler drives the rename through app/mcp/cli/vscode/tests in one green build. Poster child: entities/thread.ts:43 Thread.weaveId (a slug named weaveId — the exact pre-ULID-era ambiguity).

<!-- step:tier-2a-state-query-param -->
### Step 4 — Tier 2a — state query param

resources/state.ts:14,26,28. Grep for `state?weaveId=` across the repo and rename every caller in the same step.

<!-- step:tier-2b-diagnostics-output -->
### Step 5 — Tier 2b — diagnostics output

diagnostics.ts:15-16 (interface) and :60-61 (assignments). TypeScript surfaces typed readers as compile errors; sweep the extension diagnostics view/tests.

<!-- step:tier-2c-getstaleplans-output-cli-readers -->
### Step 6 — Tier 2c — getStalePlans output + CLI readers

getStalePlans.ts:29-30. First confirm the source shape of the CLI fields (n.weaveId/s.weaveId/h.threadId/c.weaveId) — trace whether they originate from getStalePlans/roadmap/release app functions or a separate roadmap-node type; rename at the definition so TypeScript flags every reader (the safety net).

<!-- step:doc-sync -->
### Step 7 — Doc sync

The docs-sync contract is a discipline, not a machine test, so this step makes it explicit for a "closed" thread. Grounded by grep on 2026-07-10. Note app-query-use-cases-reference.md also needs its ~15 `threadId` interface fields synced to match the decision-B Tier-1a rename. Excludes: the two convention docs that name `weaveId`/`threadId` as the anti-pattern, and the pre-existing deleted-`loom://thread-context` staleness in CLAUDE-template-reference.md:51,67 + loom-claude-own-vision.md:48 (a separate thread's leftover — noted, not absorbed here).

<!-- step:closure-gate -->
### Step 8 — Closure gate

If the grep returns anything in app/mcp/cli, it's an un-swept straggler to fix, not to document. Confirm no behavior change — pure rename.
