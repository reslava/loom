---
type: done
id: pl_01KXG0H9CZ9S9HJTBM56CBM6HV-done
title: "Done — Global-only ctx: pillar template, refresh recency, tri-surface parity"
status: done
created: 2026-07-14
version: 6
tags: []
parent_id: pl_01KXG0H9CZ9S9HJTBM56CBM6HV
requires_load: []
---
# Done — Global-only ctx: pillar template, refresh recency, tri-surface parity

## Step 1 — Delete the scope:"weave" path from loom_refresh_ctx and every layer under it, so ctx resolves to a single loom/ctx.md (no loom/{weave}/ctx.md). Clean removal, no deprecation shim.

Removed the weave-scope path from ctx — ctx is now global-only (one `loom/ctx.md`).

- `packages/app/src/buildCtxSource.ts` — dropped `CtxScope`, `buildWeaveSource`, and the weave branch of `ctxTarget`. `ctxTarget()` now takes no args (global `loom-ctx`); `buildCtxSource(state)` drops the `(scope, weaveSlug, …)` signature. Removed the now-unused `Document` import.
- `packages/mcp/src/tools/refreshCtx.ts` — dropped the `scope`/`weave_slug` inputs (schema now `{}`), the validation, and `scope` from the returned JSON; description reworded to global-only.
- `packages/app/src/index.ts` — removed the `CtxScope` re-export.
- `packages/core/src/frontmatterUtils.ts` — added `last_refreshed` to `ORDERED_KEYS` (right after `source_hash`) and `DATE_KEYS` so the recency stamp serializes deterministically and self-heals to canonical YYYY-MM-DD. (Also seeded `last_refreshed` into `buildCtxFrontmatter` here — the field's schema home; Step 2 wires the skeleton/template/refresh payload.)
- `tests/build-ctx-source.test.ts` — the real ctx-scope test (the plan's named `ctx-load.test.ts` doesn't exist). Removed the weave-source and `{weave}-ctx` target assertions; kept global source + `loom-ctx` target + hash/shell, and added a `last_refreshed:` assertion.

No deprecation shim (clean removal). Only caller of the changed signatures was `refreshCtx.ts` + this test.

## Step 2 — Give the ctx generator a project-agnostic default pillar template (Architecture · API & contracts · Stack · Build/Test/CI · Documentation map · AI collaboration). Refresh: generate-from-template when ctx.md is absent, preserve-existing-sections when present, and a skeletonOnly mode that writes only the headings + authoring hints (no inference). Stamp last_refreshed (date) in frontmatter on every write.

Pillar template + refresh modes + `last_refreshed`.

- `packages/core/src/bodyGenerators/ctxBody.ts` — replaced the unused legacy `generateCtxBody`/`CtxSummaryData` with the pillar template: `CtxPillar` interface, `DEFAULT_CTX_PILLARS` (Architecture · API & contracts · Stack · Build/Test/CI · Documentation map · AI collaboration — project-agnostic, no hardcoded ref links), `CTX_COMPANION_NOTE` (the CLAUDE.md-split note), `buildCtxSkeleton(title)` (H1 + note + `## heading` + `<!-- hint -->` + optional `→ Deep:`), `extractCtxHeadings(body)`, and `ctxTemplateHeadings(existingBody?)` (existing headings → preserve; else default pillars).
- `packages/core/src/index.ts` — export the new template surface, drop the `generateCtxBody` export.
- `packages/mcp/src/tools/refreshCtx.ts` — added `skeleton_only` input: writes ONLY the skeleton (headings + hints, no source/summary) for seeding. Default path now seeds the pillar skeleton on a fresh doc and preserves the existing body's headings on an existing one, and returns `{ template, preserveExisting, source }` so the agent summarises under the right sections. Preserves the doc's original `created` on restamp (was resetting to today).
- `packages/app/src/buildCtxSource.ts` — `buildCtxFrontmatter` takes an optional `created` (preserve on refresh) and always stamps `last_refreshed` (the honest recency signal — no stale badge, per design §4).
- Tests — new `tests/ctx-template.test.ts` (skeleton content + preserve-vs-default heading resolution), wired into `scripts/test-all.sh` after build-ctx-source.

Design note (discovered during impl): `loom_refresh_ctx` is *assemble-not-generate* (the agent summarises the returned source; no server-side inference). So the "pillar template" is delivered two ways — as the `skeleton_only` seed body, and as the `template` section list handed to the agent — rather than a hidden deterministic generator. Consistent with the design's intent; noted for the chat.

## Step 3 — Add the CLI command mirroring the tool — loom refresh-ctx (global-only) with a --skeleton flag for seed-skeleton-only. Closes the concrete CLI↔MCP parity gap that reopened this thread.

CLI `loom refresh-ctx` mirror — closes the concrete CLI↔MCP parity gap.

- `packages/cli/src/commands/refreshCtx.ts` (new) — connects the in-process MCP client and calls `loom_refresh_ctx`. `--skeleton` → `skeleton_only:true`, prints the seeded path + section list (fully standalone, no AI). Default → prints the assembled source + section template as a brief (the terminal has no sampling, same shape as `loom report`): summarise the source under the sections, write via `loom_update_doc`.
- `packages/cli/src/index.ts` — registered `loom refresh-ctx --skeleton` (import + `.command`).
- `tests/cli-mcp-parity.test.ts` — moved `loom_refresh_ctx` out of `EXCEPTIONS` and into `MAPPING` (`→ refresh-ctx`); the parity guard now asserts the twin exists rather than excusing its absence.

Design note: a pure-terminal `refresh-ctx` can't infer, so the default mode prepares + prints a brief rather than writing prose — honest about the no-CLI-sampling reality while still being fully useful; `--skeleton` is 100% standalone.

## Step 4 — Surface loom/ctx.md in the VS Code tree with a Refresh action and the 'last refreshed: {date}' recency line. First time ctx is visible in the human surface.

Extension: global-only ctx node with Refresh + `refreshed {date}` recency; reconciled the tree to global-only.

Discovered the extension already rendered a root **Context** node (`createCtxSection(globalCtxDocs)`) + a `loom.refreshCtx` command — but it still spoke weave scope and rendered per-weave/per-thread ctx sections. Changes:

- `packages/vscode/src/extension.ts` — `loom.refreshCtx` handler rewritten global-only: drops `node`/`weaveSlug`/`scope`, calls `loom_refresh_ctx` with `{}` (agent path) or `{ skeleton_only: true }` (no-AI path — seeds the pillar skeleton to fill by hand). Launch prompt now instructs: summarise under the returned template sections (preserve existing headings), architecture/API/stack only, don't restate CLAUDE.md rules.
- `packages/vscode/src/tree/treeProvider.ts` — `createCtxSection` is now global-only (no weave/thread params) and stamps each ctx doc's node with `description = "refreshed {date}"` (or "never refreshed") from `last_refreshed` — the honest recency line (no stale badge). Removed the dead per-weave ctx section (`ctxFibers`), the per-thread ctx section (`thread.allDocs ctx`), and the unused `-has-ctx` thread contextValue.
- `packages/fs/src/serializers/frontmatterLoader.ts` — coerce `last_refreshed` to canonical YYYY-MM-DD on load (same as created/updated), so the tree shows a plain date, not a gray-matter `Date`/full-ISO.

The inline Refresh button (package.json menu on `ctx-section`) and the empty-state "generate it" placeholder were already correct and stay. Full build (all packages incl. vscode) is clean; build-ctx-source, ctx-template, cli-mcp-parity tests pass.

## Step 5 — Refresh loom/ctx.md onto the pillar template: drop the 'Rules — how to act in Loom' section (duplicates CLAUDE.md) and reduce the concept/glossary restatement to a one-line pointer; keep+expand architecture, API/naming, surface-forms. Fold any newly-discovered useful section back into the template constant.

Dogfood — refactored our own `loom/ctx.md` onto the pillar template via `loom_update_doc` (id `loom-ctx`), performing the agent's summarise-under-the-template half of the refresh flow.

- **Dropped** the duplication: old section 4 "Rules — how to act in Loom" (stop rules, MCP visibility, chat-surface — all restated CLAUDE.md) and the concept (§1) / glossary (§2) restatement. Rules now point to CLAUDE.md; the H1 note states the split explicitly.
- **Rewrote** under the six default pillars: Architecture (layers + dependency rule + the two app surfaces + the MCP write gate), API & contracts (Slug/Ulid identity, casing-by-surface, form-by-consumer, tri-surface parity), Stack (TS monorepo, lockstep, commander/esbuild/MCP-SDK/gray-matter/PostHog, two delivery vehicles), Build/Test/CI, Documentation map (each ref + WHEN to load it), AI collaboration (chat surface, MCP visibility, catalog→ToolSearch, context dispatcher — pointers, not rule copies).
- Frontmatter preserved by `loom_update_doc` (still `load: always`, `requires_load: [vision, workflow]`); version bumped.

Fold-back check: the six default pillars fit the flagship doc with no gaps, so **no new section** needed to be added back to `DEFAULT_CTX_PILLARS`. `last_refreshed` will populate on the next real `loom_refresh_ctx` run (post-deploy, once the rebuilt server is live); until then the tree shows "never refreshed" — honest.

## Step 6 — Update every surface that describes ctx as global+weave to global-only, and reword the doc-graph-reports oversized-ctx suggestion away from the weave-ctx nudge.

Docs + reports sweep to global-only — and a code layer the earlier steps missed.

**Reports (the weave-ctx nudge, removed end-to-end):**
- `packages/core/src/reportSelection.ts` — deleted the `oversizedWeavesWithoutCtx` manifest field + its computation (it existed only to suggest a weave ctx).
- `packages/mcp/src/prompts/report.ts` — removed the "Secondary option … PERSISTENT weave ctx.md" suggestion block; the budget suggestion now leads with (only) the `--sort`/`--full` levers.
- `tests/report-selection.test.ts` — dropped the oversized-hint test (block 13) and reworked the prompt test (block 17) to assert **no** weave-ctx nudge.

**Context assembler (global-only, code — belonged with step 1's "every layer under it"):**
- `packages/app/src/context/assembleContext.ts` — removed the `2b. Weave ctx` auto-load branch (dead under global-only) + updated the scope comments. Only the global ctx auto-loads now.
- Tests: `context-assembler` (order no longer includes `w-ctx`, header `docs=9`), `context-scope-doc` (full scope includes global ctx, not weave ctx), `context-dispatcher` (full-bundle expectation drops `w-ctx`).

**Docs:**
- `loom/refs/architecture-reference.md` — doc-type table ctx row, the mechanisms table, the directory diagram (dropped `{weave}/ctx.md`), and the forced-filenames table → global-only wording.
- `loom/refs/workflow-reference.md` — the loop diagram ctx line + the ctx output bullet → global-only.
- `CLAUDE.md` **and** the `LOOM_CLAUDE_MD` template (`installWorkspace.ts`) — "global/weave/thread ctx" → "global ctx" in the two context-bundle descriptions (kept in sync; claude-md-sync passes).

**Verification:** full `./scripts/test-all.sh` green. Ran `loom refresh-ctx` against the repo end-to-end — it reported "Preserving existing sections" (the six pillars), stamped `last_refreshed: 2026-07-14` + a fresh `source_hash` onto `loom/ctx.md` while preserving the authored body, and printed the source brief. `loom_refresh_ctx`'s new code is live via the CLI's in-process server (the long-running session MCP is still on old code until restart).
