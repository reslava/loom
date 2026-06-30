---
type: design
id: de_01KSYEC48HS5VPGRDK5FFDPDFH
title: Consolidate ctx generators into one (global + weave)
status: done
created: 2026-05-31
updated: 2026-05-31
version: 3
idea_version: 3
tags: []
parent_id: id_01KSYE3WFEGBZ39SB9XDMX7X99
requires_load: []
---
# Consolidate ctx generators into one (global + weave)

Parent idea: `ctx-generate-idea`. Decision **D1 = (b)** drives the whole design.

## Core decision — assemble, don't generate (D1 = b)

The unified ctx tool performs **no LLM inference**. It:
1. **assembles** the scope's source context,
2. **ensures** the ctx doc shell exists at the canonical path with correct frontmatter,
3. hands `{ source, ctxId }` to the agent, which **writes the summary body via `loom_update_doc`**.

Same shape as do-step (`loom_do_step` briefs → agent acts → `loom_complete_step`). Agent-agnostic: identical in the VS Code extension and a Claude Code CLI session — no MCP sampling, no app `AIClient`, no host-capability fork. This is the context-pipeline philosophy (assemble context, let the agent act) applied to ctx generation.

## D2 / D7 — Tool surface + the create gap

**One tool:** `loom_refresh_ctx(scope: 'global' | 'weave', weaveId?)`:
- **Ensures** the ctx doc exists at the canonical path — creates the shell with the frontmatter template (D5) if missing. This resolves **D7**: no new `loom_create_ctx` needed; `refresh_ctx` owns shell creation.
- **Returns** `{ ctxId, targetPath, scope, stale, source }` where `source` is the assembled markdown to summarise.
- The agent reads `source`, writes the summary, calls `loom_update_doc(ctxId, body)`.

**Remove** `loom_summarise` and `loom_generate_global_ctx` — clean break, no aliases (update extension callers + tests).

*(Optional, deferred: a `refresh-ctx` prompt mirroring `do-next-step` that wraps the tool's source + an instruction for one-shot agent launch. Ship the tool first.)*

## D3 — Source assembly

A **pure** `buildCtxSource(scope, ids, state) → string` in `packages/app`:
- **weave** → roll up the weave's threads: each thread's idea (title/status), the primary design body (+ other designs' titles), plans (id/status/step progress), done docs (decisions + open items). This is exactly what `summarise.ts` assembles today — **lift that logic into `buildCtxSource`**.
- **global** → the active/implementing weaves + their threads, one-line status each (what `generateGlobalCtx` fed from `loom://state`).

Pure (reads `LoomState`), unit-testable from a fixture. **Not** reusing `assembleContext` — that is parent-chain-centric for a single target; a ctx source is a cross-thread/weave roll-up, a different shape.

## D4 — Idempotency (resolves the open global-signal question)

Scope-agnostic **`source_hash`**: hash the `buildCtxSource` output, store it in the ctx frontmatter. On refresh, compare the new hash to the stored one → report `stale: false` when unchanged; the agent/UX skips unless `force`. The hash works for **both** scopes, so there's no need for a special "global source-version" signal. Replaces `summarise`'s `source_version` (design-version) check with one uniform mechanism. Hash = `sha1` of the source string (node `crypto`, no new dep).

## D5 — One frontmatter template

```yaml
type: ctx
id: loom-ctx | {weave}-ctx        # stable, positional (ctx-naming)
title: "Loom — Global Context" | "Context Summary — {weave title}"
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
version: N                         # increments on each regen
tags: [ctx, summary]
parent_id: null                    # ctx is positional, not a child of one doc
requires_load: []
source_hash: <hash of buildCtxSource output>
```

Resolves today's disagreements: **parent_id always null** (a weave ctx summarises all threads, not one design — coupling it to a single design id was wrong); **version increments** (not reset to 1); **source_hash** replaces source_version.

## D6 — Layering

- `buildCtxSource(scope, ids, state)` — **pure**, `packages/app`.
- `ensureCtxShell(scope, ids, deps)` — impure (fs), ensures the doc + frontmatter at the canonical path.
- MCP `loom_refresh_ctx` — **thin**: `getState` → `buildCtxSource` → `ensureCtxShell` → return `{ ctxId, source, stale }`.

No `AIClient`/sampling dependency anywhere. `mcp → app → core + fs` preserved.

## Extension UX consequence

Today the extension forks: `launchClaude` (CLI) vs `callTool` sampling (host). Under D1=(b) both **collapse** to one flow: the *Refresh Ctx* button calls `loom_refresh_ctx` (ensure shell + get source), then launches the agent with `source` + "write the summary, then `loom_update_doc` on `{ctxId}`." Same model as the do-step button. The sampling-host branch is deleted.

## Removal / migration plan (for plan-001)

1. `buildCtxSource` in app (lift weave logic from `summarise.ts`; add global from state).
2. `ensureCtxShell` + frontmatter template + `source_hash`.
3. Rewrite `loom_refresh_ctx` to the assemble-not-generate model (scope global|weave; no inference).
4. Delete `loom_summarise` + `summarise.ts` inference path + `loom_generate_global_ctx`.
5. Update extension (`loom.refreshCtx`, `summariseCommand`) to the unified launch flow; drop the sampling branch.
6. Update/registration in `server.ts`; tests (app `buildCtxSource`, MCP tool, extension).
7. Subsume `core-engine/global-ctx` (confirm/close it).

## Open questions

- **Prompt vs tool-only** surface — ship tool; add the `refresh-ctx` prompt later if the extension wants a single launch.
- **`buildCtxSource` weave depth** — match `summarise`'s current depth (full primary design body + plan/done summaries) vs lighter. Lean: match it.

## Coordination

- **Subsumes** `core-engine/global-ctx` (global generation rolls into the unified tool).
- Conforms to `ctx-naming` (flat `ctx.md`, stable id) + `ctx-load` (global + weave only; no thread ctx).