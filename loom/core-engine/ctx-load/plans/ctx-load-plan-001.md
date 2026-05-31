---
type: plan
id: pl_01KSTGDER8MA9KJF3JS4CG9BHK
title: ctx-load — activate thread/weave ctx auto-load
status: done
created: "2026-05-29T00:00:00.000Z"
updated: 2026-05-31
version: 3
design_version: 1
tags: []
parent_id: de_01KSTFX5FNN132HHSFHNSK497C
requires_load: []
target_version: 0.1.0
---
# ctx-load — activate thread/weave ctx auto-load

## Goal

Make weave-scoped ctx (`loom/{weave}/ctx.md`) real in the assembled context: loaded, never blocking status, and written by the ctx tools to one canonical flat path. **Thread scope has no ctx** — the pipeline already loads a thread's idea/design/plan in full (parent chain), so a thread-ctx would duplicate, not compress. Convention: flat `ctx.md` per scope, stable id (`loom-ctx` / `{weave}-ctx`), single file. Decisions in chat-001 (2026-05-31): drop thread ctx; fix all three ctx writers to the canonical path; no tool consolidation (option B — `summarise`↔`refresh_ctx` redundancy is a flagged follow-up).
---

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Status filter — exclude `type === 'ctx'` and `type === 'reference'` from the every-done predicate in `getWeaveStatus` + `getThreadStatus` so a perpetual ctx/reference never blocks `DONE`. Update the affected core tests. | `packages/core/src/derived.ts` + core tests | — |
| ✅ | 2 | Assembler — remove the dead thread-ctx slot (keep global + weave), fix the ordering docstring + step-9 comment. Update `tests/context-assembler.test.ts`. | `packages/app/src/context/assembleContext.ts`, `tests/context-assembler.test.ts` | — |
| ✅ | 3 | Writers → canonical flat path + stable id: `generate_global_ctx` → `loom/ctx.md`; `summarise` → `loom/{weave}/ctx.md`; `refresh_ctx` → `loom/{weave}/ctx.md` (drop `threadId`, the `ctx/` subdir, the dated id). Update tool descriptions + the extension summarise message string. | `packages/mcp/src/tools/generateGlobalCtx.ts`, `packages/app/src/summarise.ts`, `packages/mcp/src/tools/refreshCtx.ts`, `packages/vscode/src/commands/summarise.ts` | — |
| ✅ | 4 | Pipeline reference — replace the stale "thread/weave ctx inert / `ctx/` subdir" gap note and the thread-ctx mentions with shipped reality (weave ctx loads flat from weave root; thread scope has no ctx; status excludes ctx+reference). | `loom/refs/loom-context-pipeline-reference.md` | — |
| ✅ | 5 | Build + full test green (`./scripts/build-all.sh`, `./scripts/test-all.sh`). Smoke: hand-write a `loom/{weave}/ctx.md`, assert it surfaces as weave ctx in an assembled bundle. | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |