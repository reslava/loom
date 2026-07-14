---
type: plan
id: pl_01KXG0H9CZ9S9HJTBM56CBM6HV
title: "Global-only ctx: pillar template, refresh recency, tri-surface parity"
status: done
created: 2026-07-14
updated: 2026-07-14
version: 1
design_version: 1
tags: []
parent_id: de_01KXG0081KSJXYKTD6HYWK75XN
requires_load: []
target_version: 0.1.0
steps:
  - id: remove-weave-scope-ctx-is-global
    order: 1
    status: done
    description: "Delete the scope:\"weave\" path from loom_refresh_ctx and every layer under it, so ctx resolves to a single loom/ctx.md (no loom/{weave}/ctx.md). Clean removal, no deprecation shim."
    files_touched: [packages/mcp/src/tools/refreshCtx.ts, packages/app/src/buildCtxSource.ts, packages/core/src/bodyGenerators/ctxBody.ts, tests/ctx-load.test.ts]
    blocked_by: []
    satisfies: []
  - id: pillar-template-refresh-modes-last-refreshed
    order: 2
    status: done
    description: "Give the ctx generator a project-agnostic default pillar template (Architecture · API & contracts · Stack · Build/Test/CI · Documentation map · AI collaboration). Refresh: generate-from-template when ctx.md is absent, preserve-existing-sections when present, and a skeletonOnly mode that writes only the headings + authoring hints (no inference). Stamp last_refreshed (date) in frontmatter on every write."
    files_touched: [packages/core/src/bodyGenerators/ctxBody.ts, packages/mcp/src/tools/refreshCtx.ts, packages/app/src/buildCtxSource.ts, tests/ctx-generate.test.ts]
    blocked_by: [remove-weave-scope-ctx-is-global]
    satisfies: []
  - id: cli-loom-refresh-ctx-mirror-skeleton
    order: 3
    status: done
    description: Add the CLI command mirroring the tool — loom refresh-ctx (global-only) with a --skeleton flag for seed-skeleton-only. Closes the concrete CLI↔MCP parity gap that reopened this thread.
    files_touched: [packages/cli/src/commands/refreshCtx.ts, packages/cli/src/index.ts, tests/commands.test.ts]
    blocked_by: [pillar-template-refresh-modes-last-refreshed]
    satisfies: []
  - id: extension-ctx-node-refresh-action-last
    order: 4
    status: done
    description: "Surface loom/ctx.md in the VS Code tree with a Refresh action and the 'last refreshed: {date}' recency line. First time ctx is visible in the human surface."
    files_touched: [packages/vscode/src/tree/treeProvider.ts, packages/vscode/src/extension.ts, packages/vscode/src/commands/refreshCtx.ts, packages/vscode/package.json]
    blocked_by: [pillar-template-refresh-modes-last-refreshed]
    satisfies: []
  - id: dogfood-refactor-our-own-loom-ctx
    order: 5
    status: done
    description: "Refresh loom/ctx.md onto the pillar template: drop the 'Rules — how to act in Loom' section (duplicates CLAUDE.md) and reduce the concept/glossary restatement to a one-line pointer; keep+expand architecture, API/naming, surface-forms. Fold any newly-discovered useful section back into the template constant."
    files_touched: [loom/ctx.md, packages/core/src/bodyGenerators/ctxBody.ts]
    blocked_by: [pillar-template-refresh-modes-last-refreshed]
    satisfies: []
  - id: doc-reports-sweep-to-global-only
    order: 6
    status: done
    description: Update every surface that describes ctx as global+weave to global-only, and reword the doc-graph-reports oversized-ctx suggestion away from the weave-ctx nudge.
    files_touched: [loom/refs/architecture-reference.md, loom/refs/workflow-reference.md, CLAUDE.md, packages/app/src/installWorkspace.ts, packages/core/src/reportKinds.ts]
    blocked_by: [cli-loom-refresh-ctx-mirror-skeleton, extension-ctx-node-refresh-action-last, dogfood-refactor-our-own-loom-ctx]
    satisfies: []
---
# Global-only ctx: pillar template, refresh recency, tri-surface parity

## Goal

Make ctx global-only and bring the single loom/ctx.md up to par: remove weave-scope from loom_refresh_ctx, give the generator a customizable pillar template (default-when-absent, preserve-existing-sections, plus a no-inference seed-skeleton mode), replace untrustworthy auto-staleness with an honest "last refreshed: {date}" recency stamp, and close the CLI↔MCP↔extension parity gap that reopened this thread. Then dogfood it by refactoring our own loom/ctx.md onto the template (shedding the CLAUDE.md rule/concept duplication) and sweep the docs + the doc-graph-reports oversized-ctx suggestion to global-only.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Delete the scope:"weave" path from loom_refresh_ctx and every layer under it, so ctx resolves to a single loom/ctx.md (no loom/{weave}/ctx.md). Clean removal, no deprecation shim. | packages/mcp/src/tools/refreshCtx.ts, packages/app/src/buildCtxSource.ts, packages/core/src/bodyGenerators/ctxBody.ts, tests/ctx-load.test.ts | — | — |
| ✅ | 2 | Give the ctx generator a project-agnostic default pillar template (Architecture · API & contracts · Stack · Build/Test/CI · Documentation map · AI collaboration). Refresh: generate-from-template when ctx.md is absent, preserve-existing-sections when present, and a skeletonOnly mode that writes only the headings + authoring hints (no inference). Stamp last_refreshed (date) in frontmatter on every write. | packages/core/src/bodyGenerators/ctxBody.ts, packages/mcp/src/tools/refreshCtx.ts, packages/app/src/buildCtxSource.ts, tests/ctx-generate.test.ts | remove-weave-scope-ctx-is-global | — |
| ✅ | 3 | Add the CLI command mirroring the tool — loom refresh-ctx (global-only) with a --skeleton flag for seed-skeleton-only. Closes the concrete CLI↔MCP parity gap that reopened this thread. | packages/cli/src/commands/refreshCtx.ts, packages/cli/src/index.ts, tests/commands.test.ts | pillar-template-refresh-modes-last-refreshed | — |
| ✅ | 4 | Surface loom/ctx.md in the VS Code tree with a Refresh action and the 'last refreshed: {date}' recency line. First time ctx is visible in the human surface. | packages/vscode/src/tree/treeProvider.ts, packages/vscode/src/extension.ts, packages/vscode/src/commands/refreshCtx.ts, packages/vscode/package.json | pillar-template-refresh-modes-last-refreshed | — |
| ✅ | 5 | Refresh loom/ctx.md onto the pillar template: drop the 'Rules — how to act in Loom' section (duplicates CLAUDE.md) and reduce the concept/glossary restatement to a one-line pointer; keep+expand architecture, API/naming, surface-forms. Fold any newly-discovered useful section back into the template constant. | loom/ctx.md, packages/core/src/bodyGenerators/ctxBody.ts | pillar-template-refresh-modes-last-refreshed | — |
| ✅ | 6 | Update every surface that describes ctx as global+weave to global-only, and reword the doc-graph-reports oversized-ctx suggestion away from the weave-ctx nudge. | loom/refs/architecture-reference.md, loom/refs/workflow-reference.md, CLAUDE.md, packages/app/src/installWorkspace.ts, packages/core/src/reportKinds.ts | cli-loom-refresh-ctx-mirror-skeleton, extension-ctx-node-refresh-action-last, dogfood-refactor-our-own-loom-ctx | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:remove-weave-scope-ctx-is-global -->
### Step 1 — Remove weave scope — ctx is global-only

Drop the `scope` param and the weave-ctx write branch; update the tool schema/description to global-only. Remove or adjust any test asserting weave-ctx generation. Verify no caller (extension/CLI) still passes scope:"weave".

<!-- step:pillar-template-refresh-modes-last-refreshed -->
### Step 2 — Pillar template + refresh modes + last_refreshed stamp

Template constant lives in the core body generator (not a file). Header carries the CLAUDE.md-split note. Preserve-existing means: parse current headings and re-pour content under them, never rewriting the section structure. Add skeletonOnly to the tool + app path. last_refreshed added to the ctx frontmatter schema/serializer if not already present.

<!-- step:cli-loom-refresh-ctx-mirror-skeleton -->
### Step 3 — CLI loom refresh-ctx mirror (+ --skeleton)

Human-first CLI surface; no scope/weave args (global-only). Wire into the command registry and help. Add a test asserting it generates loom/ctx.md and that --skeleton writes headings-only.

<!-- step:extension-ctx-node-refresh-action-last -->
### Step 4 — Extension ctx node — Refresh action + last-refreshed date

Add a ctx node (global). Its Refresh command calls loom_refresh_ctx via the MCP client (extension imports no app). Show last_refreshed from frontmatter. Optional: a Seed skeleton action.

<!-- step:dogfood-refactor-our-own-loom-ctx -->
### Step 5 — Dogfood — refactor our own loom/ctx.md onto the template

Run through the real generator path (loom_refresh_ctx) so we dogfood the shipped behavior, not a hand-edit. Discoveries → update the default template constant from step 2.

<!-- step:doc-reports-sweep-to-global-only -->
### Step 6 — Doc + reports sweep to global-only

Keep CLAUDE.md and the LOOM_CLAUDE_MD template in sync (claude-md-sync test). workflow-reference ctx line 'global + weave' → 'global'. architecture-reference doc-type table + stale rules. Reword the plan-006/reportKinds oversized-ctx suggestion. Run test-all (claude-md-sync gate).
