---
type: done
id: pl_01KSTGDER8MA9KJF3JS4CG9BHK-done
title: Done — ctx-load — activate thread/weave ctx auto-load
status: done
created: "2026-05-31T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KSTGDER8MA9KJF3JS4CG9BHK
requires_load: []
---
# Done — ctx-load — activate thread/weave ctx auto-load

## Step 1 — Status filter — exclude `type === 'ctx'` and `type === 'reference'` from the every-done predicate in `getWeaveStatus` + `getThreadStatus` so a perpetual ctx/reference never blocks `DONE`. Update the affected core tests.

Added `isDeliverable(doc)` helper in `packages/core/src/derived.ts` (`type !== 'ctx' && type !== 'reference'`). `getWeaveStatus` and `getThreadStatus` now compute `deliverables = allDocs.filter(isDeliverable)` and run the every-done check over that, so a perpetual ctx/reference can never block `DONE`. The `deliverables.length > 0` guard prevents a ctx-only scope from falsely reporting `DONE`. Regression test `testStatusExcludesCtxAndReference` in `tests/entity.test.ts`: done plan + active ctx → DONE (thread + weave); ctx-only → ACTIVE.

## Step 2 — Assembler — remove the dead thread-ctx slot (keep global + weave), fix the ordering docstring + step-9 comment. Update `tests/context-assembler.test.ts`.

`packages/app/src/context/assembleContext.ts`: removed the thread-ctx auto-load slot (old step 2c loop over `thread.allDocs`), keeping only global (2a) + weave (2b). Replaced it with a comment documenting why (parent chain already loads the thread's idea/design/plan in full). Updated the function docstring to "global + weave ctx … thread scope has no ctx". No test change needed — `tests/context-assembler.test.ts` order assertion was unchanged because the fixture's thread held no ctx doc; weave ctx (`w-ctx`) still emits at position 1 and `classifyScope` still maps it to `weave`.

## Step 3 — Writers → canonical flat path + stable id: `generate_global_ctx` → `loom/ctx.md`; `summarise` → `loom/{weave}/ctx.md`; `refresh_ctx` → `loom/{weave}/ctx.md` (drop `threadId`, the `ctx/` subdir, the dated id). Update tool descriptions + the extension summarise message string.

Pointed all three ctx writers at the canonical flat path + stable id:
- `packages/mcp/src/tools/generateGlobalCtx.ts`: `loom/loom-ctx.md` → `loom/ctx.md` (path + description + prompt text). id stays `loom-ctx`.
- `packages/app/src/summarise.ts`: `loom/{weave}/{weave}-ctx.md` → `loom/{weave}/ctx.md`; id `{weave}-ctx` unchanged; prompt wording updated.
- `packages/mcp/src/tools/refreshCtx.ts`: rewritten weave-only — dropped `threadId`, the `ctx/` subdir, and the dated id. Writes `loom/{weave}/ctx.md`, id `{weave}-ctx`. Now sources the weave from `loom://state` (the old weave branch sent no source docs, so dropping `threadId` would have emitted empty summaries).
Callers/strings: `packages/vscode/src/extension.ts` `loom.refreshCtx` drops `threadId` and reframes to global+weave; `packages/vscode/src/commands/summarise.ts` toast → `{weave}/ctx.md`; `loom_summarise` tool description and `packages/core/src/entities/state.ts` comment aligned. `tests/summarise.test.ts` is path-agnostic (asserts via returned `ctxPath`) and stays green.

## Step 4 — Pipeline reference — replace the stale "thread/weave ctx inert / `ctx/` subdir" gap note and the thread-ctx mentions with shipped reality (weave ctx loads flat from weave root; thread scope has no ctx; status excludes ctx+reference).

`loom/refs/loom-context-pipeline-reference.md` (gate-excluded ref doc, edited directly): replaced the stale "Thread/weave ctx auto-load is wired but currently inert / `{thread}/ctx/` subdir" gap note with the shipped reality — ctx is global + weave only, flat `ctx.md`, loaded by the existing root globs, no thread ctx, status excludes ctx+reference, three writers canonical, consolidation flagged as follow-up. Also removed "thread ctx" from the step-2 auto-load candidate list and the step-9 deterministic ordering line.

## Step 5 — Build + full test green (`./scripts/build-all.sh`, `./scripts/test-all.sh`). Smoke: hand-write a `loom/{weave}/ctx.md`, assert it surfaces as weave ctx in an assembled bundle.

`./scripts/build-all.sh` green across all packages (core, fs, app, cli, vscode, mcp). `./scripts/test-all.sh` green, including the MCP integration suite (8/8). Targeted runs confirmed the new assertions executed: `tests/entity.test.ts` ctx/reference exclusion (DONE with active ctx; ACTIVE for ctx-only), `tests/context-assembler.test.ts` ordering, `tests/summarise.test.ts` ctx-file generation. End-to-end smoke (throwaway temp loom root): a hand-written `loom/{weave}/ctx.md` surfaces via `loadWeave` into `looseFibers` + `allDocs` typed `ctx` (SMOKE PASS) — proving the real disk walk feeds the assembler, which emits it at scope `weave`. Follow-up logged: consolidate the three ctx generators into one (blocked on the orthogonal AIClient-vs-MCP-sampling choice).
