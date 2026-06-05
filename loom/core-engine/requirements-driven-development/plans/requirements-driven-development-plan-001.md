---
type: plan
id: pl_01KTBAD2HBVYD46HNZ019G1Y89
title: RDD Phase 1 — req doc-type, lock, and always-load
status: done
created: "2026-06-05T00:00:00.000Z"
updated: 2026-06-05
version: 1
design_version: 1
tags: []
parent_id: de_01KTBA3MSAGGDWC5G55A49JN4T
requires_load: []
target_version: 0.1.0
---
# RDD Phase 1 — req doc-type, lock, and always-load

## Goal

Ship scope faithfulness by **injection**: a `req` doc-type (flat `req.md` per thread, three ID'd lists), generated-from-chat, curated, explicitly **locked**, and auto-injected into every context bundle for its thread — built against a locked spec, with **no plan-step schema change** (that is Phase 2). Layered core → fs → app → mcp → vscode per the dependency rule. Design: `requirements-driven-development-design.md` §1–§4. Calls confirmed in chat-001: body is source of truth (pure `parseReq`), status `draft | locked` with explicit finalize, `req_version` staleness deferred to Phase 2.

---

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | **core — `ReqDoc` entity + `parseReq` + wiring.** New `ReqDoc extends BaseDoc<ReqStatus>` (`type:'req'`, `ReqStatus='draft' | 'locked'`); add `req?: ReqDoc` to the `Thread` entity. Pure `parseReq(body) → { included, excluded, constraints }` (each `{ id, text }[]`, IDs from inline-code `IN/EX/C` prefixes). Add `req` to doc-type unions/exports + `serializeFrontmatter` key order; exclude `type==='req'` from the every-done predicate in `getThreadStatus`/`getWeaveStatus`. Unit tests: `parseReq` round-trip + status-exclusion. | `packages/core/src/entities/req.ts`, `packages/core/src/entities/thread.ts`, `packages/core/src/frontmatterUtils.ts`, `packages/core/src/derived.ts`, core tests |
| ✅ | 2 | **fs — load & save `req.md`.** `loadThread` reads `req.md` → `Thread.req` and pushes it into `allDocs` (so `buildCatalog` registers it at `scope:'thread'`); add `case 'req'` to `docPathInThread`; ensure the save path writes `loom/{weave}/{thread}/req.md`. Test: a hand-written `req.md` surfaces on `loadThread`. | `packages/fs/src/repositories/threadRepository.ts`, fs tests | — |
| ✅ | 3 | **app — context injection + use-cases.** `assembleContext`: inject the target thread's `req` with reason `'auto'` in the `if (thread)` block, ordered **before** idea/design/plan. Add use-cases `createReq` / `refineReq` / `finalizeReq` as `(input, deps) => result` (refine → draft + version bump; finalize → `draft`→`locked`). Tests: bundle contains `req` ordered before the idea; finalize flips status; refine bumps version. | `packages/app/src/context/assembleContext.ts`, `packages/app/src/req/*.ts` (new), `tests/context-assembler.test.ts`, app tests | — |
| ✅ | 4 | **mcp — tools + resource.** Register `loom_create_req(weaveId, threadId, content?)`, `loom_refine_req`, `loom_finalize_req`, and `loom_generate_req` (sampling; extension-only, returns `MethodNotFound` in CLI like other `generate_*`). Surface `req` in the `loom://context/...` bundle. MCP integration test covering create → finalize → context-includes-req. | `packages/mcp/src/tools/*` (new req tools), `packages/mcp/src/server.ts`, `packages/mcp/src/resources/context.ts`, `packages/mcp/tests/integration.test.ts` | — |
| ✅ | 5 | **vscode — tree node + buttons.** Add a `req` node under each thread; wire **Generate / Refine / Finalize** commands to the MCP client; render a locked-state badge. No direct `app` imports — MCP only. | `packages/vscode/src/providers/*`, `packages/vscode/src/commands/*`, `packages/vscode/package.json` | — |
| ✅ | 6 | **build + full test green + smoke.** `./scripts/build-all.sh`, `./scripts/test-all.sh`. Smoke: hand-write a `loom/{weave}/{thread}/req.md`, finalize it, assert it surfaces in an assembled bundle **before** the idea, and that a thread whose only non-done doc is a perpetual `req` still reaches `DONE`. | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |