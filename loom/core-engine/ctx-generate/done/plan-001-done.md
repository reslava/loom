---
type: done
id: pl_01KSYES8RRR8N3JPQ0PC1QJN4J-done
title: Done — Consolidate ctx generators into one (global + weave)
status: done
created: "2026-05-31T00:00:00.000Z"
version: 7
tags: []
parent_id: pl_01KSYES8RRR8N3JPQ0PC1QJN4J
requires_load: []
---
# Done — Consolidate ctx generators into one (global + weave)

## Step 1 — app: add pure buildCtxSource(scope, ids, state) in packages/app/src/buildCtxSource.ts — weave rolls up the weave's threads (primary design body, ideas, plans with step progress, done decisions + open items, lifted from summarise.ts); global lists active/implementing weaves + threads with one-line status. Export from app/index.ts. Add tests/build-ctx-source.test.ts (fixture-driven, pure).

Added pure `packages/app/src/buildCtxSource.ts` → `buildCtxSource(scope, weaveId, state)`: weave rolls up the weave's threads (primary design body + idea lines + plans with N/total step progress + done decisions/open items — logic lifted from the deleted `summarise.ts`); global lists ACTIVE/IMPLEMENTING weaves + their threads one line each. Exported from `app/index.ts`. Test `tests/build-ctx-source.test.ts` (fixture-driven, pure) asserts the weave roll-up + global listing.

## Step 2 — app: add ctx target + idempotency helpers co-located with buildCtxSource — ctxTarget(scope, ids, state) returning ctxId/relPath/title, computeSourceHash(source) via node crypto sha1, and a canonical ctx frontmatter builder (id loom-ctx or {weave}-ctx, parent_id null, version increments, tags [ctx, summary], source_hash). Pure.

Same module: `ctxTarget(scope, weaveId)` → canonical `{ ctxId, relPath, title }` (`loom-ctx`/`loom/ctx.md`; `{weave}-ctx`/`loom/{weave}/ctx.md`); `computeSourceHash(source)` = sha1 (node crypto); `buildCtxFrontmatter` (id, parent_id null, version, tags [ctx,summary], `source_hash`) + `buildCtxShell`. Added `source_hash` to core `ORDERED_KEYS` (`frontmatterUtils.ts`) for deterministic placement. Test asserts target paths + stable hash + shell frontmatter.

## Step 3 — mcp: rewrite loom_refresh_ctx to assemble-not-generate — inputs scope (global|weave) + optional weaveId; no sampling. getState, buildCtxSource, computeSourceHash, compare to existing ctx source_hash for stale, ensure the ctx shell exists at the canonical path (write frontmatter if missing), return JSON with ctxId, targetPath, scope, stale, source.

Rewrote `packages/mcp/src/tools/refreshCtx.ts` → `createRefreshCtxTool()` (no `server`; `{toolDef, handle}` shape). Inputs `scope: global|weave` + optional `weaveId`, no sampling. Flow: `getState` → `buildCtxSource` → `computeSourceHash` → read existing ctx's `source_hash` (stale = changed/missing) → ensure shell at canonical path when missing or stale (writes frontmatter with the new `source_hash`; preserves existing body for the agent to overwrite — needed because `loom_update_doc` preserves frontmatter). Returns `{ ctxId, scope, targetPath, stale, source }`. The agent then writes the body via `loom_update_doc`.

## Step 4 — Remove the two redundant generators — delete packages/mcp/src/tools/summarise.ts and generateGlobalCtx.ts and unregister both in server.ts; delete packages/app/src/summarise.ts and its app/index.ts export; delete tests/summarise.test.ts (superseded by build-ctx-source.test.ts).

Deleted `packages/mcp/src/tools/summarise.ts`, `packages/mcp/src/tools/generateGlobalCtx.ts`, `packages/app/src/summarise.ts`, `tests/summarise.test.ts`. Unregistered `createSummariseTool` + `createGenerateGlobalCtxTool` in `server.ts` (imports + TOOLS array) and switched `createRefreshCtxTool(server)` → `createRefreshCtxTool()`. Removed the `summarise` export from `app/index.ts`. `samplingAiClient` stays (still used by refine/promote).

## Step 5 — CLI: remove the summarise-context command (packages/cli/src/index.ts) and packages/cli/src/commands/summarise.ts — it depended on the deleted app inference path; ctx generation is now an agent/MCP flow. Remove the summarise-context block from tests/commands.test.ts.

Removed the CLI `summarise-context` command + its import from `packages/cli/src/index.ts`; deleted `packages/cli/src/commands/summarise.ts`. Removed the `summarise-context` block from `tests/commands.test.ts`. Consequence (by design, D1=b): there is no standalone pure-CLI ctx generation anymore — ctx generation is an agent/MCP flow (`loom_refresh_ctx` + the agent's `loom_update_doc`).

## Step 6 — Extension: collapse to one ctx flow — rewrite loom.refreshCtx to call loom_refresh_ctx(scope, weaveId?), then launch the agent with the returned source and an instruction to write the summary via loom_update_doc on ctxId. Remove the redundant loom.summarise and loom.generateGlobalCtx commands (their command files, registrations in extension.ts, and package.json contributions).

Extension collapsed to one ctx flow. `loom.refreshCtx` (extension.ts): derives `scope` from the node (`weaveId` present → weave, else global) and launches the agent with an instruction to call `loom_refresh_ctx` then `loom_update_doc` on the returned `ctxId`; non-Claude fallback calls `loom_refresh_ctx` to ensure the shell + opens it. Removed `loom.summarise` + `loom.generateGlobalCtx` (registrations + the `generateGlobalCtx` block + the `summariseCommand` import), deleted `packages/vscode/src/commands/summarise.ts`, and removed their two command defs + the `loom.summarise` menu item from `package.json` (validated JSON). Global ctx stays reachable via `loom.refreshCtx` on the global ctx-section node + the command palette.

## Step 7 — Subsume global-ctx + verify — note core-engine/global-ctx as subsumed (global generation now lives in the unified tool). Run ./scripts/build-all.sh and ./scripts/test-all.sh green; smoke: exercise loom_refresh_ctx for global and weave (shell created at canonical path, source assembled, stale flag).

Added a "superseded by ctx-generate" banner to `core-engine/global-ctx/global-ctx-idea.md` (it shipped `loom/ctx.md`; its 3-layer hierarchy with `{thread}/ctx/` is obsolete per ctx-load). Fixed `scripts/test-all.sh` to run `build-ctx-source.test.ts` instead of the deleted `summarise.test.ts`. `build-all.sh` green (all 6 packages). `test-all.sh` green incl. MCP integration 8/8. End-to-end smoke against a throwaway `.loom` workspace: weave + global both create the shell at the canonical flat path with `source_hash`, assemble the correct source (design body + ideas + threads), and report `stale=false` on an unchanged re-run.
