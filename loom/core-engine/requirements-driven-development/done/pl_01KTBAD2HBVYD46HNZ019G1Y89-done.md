---
type: done
id: pl_01KTBAD2HBVYD46HNZ019G1Y89-done
title: Done — RDD Phase 1 — req doc-type, lock, and always-load
status: done
created: "2026-06-05T00:00:00.000Z"
version: 6
tags: []
parent_id: pl_01KTBAD2HBVYD46HNZ019G1Y89
requires_load: []
---
# Done — RDD Phase 1 — req doc-type, lock, and always-load

## Step 1 — **core — `ReqDoc` entity + `parseReq` + wiring.** New `ReqDoc extends BaseDoc<ReqStatus>` (`type:'req'`, `ReqStatus='draft'

**core — `ReqDoc` entity + `parseReq` + wiring.**

- New `packages/core/src/entities/req.ts`: `ReqDoc extends BaseDoc<ReqStatus>` (`type:'req'`, `ReqStatus='draft'|'locked'`), `ReqItem`/`ParsedReq` types, and pure `parseReq(body)`. Parser buckets bullets by **inline-code ID prefix** (`IN`/`EX`/`C`), so it is heading-/emoji-independent and ignores prose + non-handle code tokens.
- `Thread` entity (`entities/thread.ts`): added `req?: ReqDoc`.
- `DocumentType` (`entities/base.ts`) + `Document`/`DocumentStatus` union (`entities/document.ts`): added `req` / `ReqDoc`.
- `idUtils.ts` `TYPE_PREFIX`: registered `req: 'rq_'` (so the serializer's ULID prefix↔type check passes for req ids).
- `derived.ts` `isDeliverable`: excluded `type==='req'` from the every-done predicate (a locked req is a perpetual spec, like ctx/reference) — updated docstring.
- `index.ts`: exported `ReqDoc, ReqStatus, ReqItem, ParsedReq, parseReq`.

**Tests:** `tests/req.test.ts` (added to `test-all.sh`) — parseReq prefix-bucketing + heading-independence + locked-req-doesn't-block-DONE. Full build-all clean (no exhaustive-switch breakage from widening `DocumentType`); req test green.

## Step 2 — **fs — load & save `req.md`.** `loadThread` reads `req.md` → `Thread.req` and pushes it into `allDocs` (so `buildCatalog` registers it at `scope:'thread'`); add `case 'req'` to `docPathInThread`; ensure the save path writes `loom/{weave}/{thread}/req.md`. Test: a hand-written `req.md` surfaces on `loadThread`.

**fs — load & save `req.md`.**

- `packages/fs/src/repositories/threadRepository.ts`: `loadThread` now reads `loom/{weave}/{thread}/req.md` → `Thread.req` (flat filename, no `{threadId}-` prefix, like `ctx.md`), includes it in `allDocs` (so `buildCatalog` registers it at `scope:'thread'`), and returns it on the `Thread`. Added `import { ReqDoc }`.
- `docPathInThread`: added `case 'req': return path.join(threadPath, 'req.md')` so the existing `saveDoc` path resolution writes req to the canonical flat path (no separate save code needed — saver is generic).

**Tests:** added test 3 to `tests/thread-repository.test.ts` (a hand-written locked `req.md` surfaces as `thread.req` with `type:'req'`, `status:'locked'`, and appears in `allDocs`); registered `thread-repository.test.ts` in `test-all.sh` (it was previously not in the suite). Build clean; loadThread + saveThread round-trip green.

## Step 3 — **app — context injection + use-cases.** `assembleContext`: inject the target thread's `req` with reason `'auto'` in the `if (thread)` block, ordered **before** idea/design/plan. Add use-cases `createReq` / `refineReq` / `finalizeReq` as `(input, deps) => result` (refine → draft + version bump; finalize → `draft`→`locked`). Tests: bundle contains `req` ordered before the idea; finalize flips status; refine bumps version.

**app — context injection + use-cases.**

- `packages/app/src/context/assembleContext.ts`: in the `if (thread)` block, inject `thread.req` with `reason:'auto'` **before** idea/design/plan — the spec frames the chain. Guarded by `id !== canonicalTargetId` so the req isn't double-added when it is itself the context target. This is the thread-scope always-load slot (ctx remains global+weave only).
- `packages/app/src/req.ts` (new): `createReq` / `refineReq` / `finalizeReq`, each `(input, deps) => result`, keyed on weaveId+threadId (deterministic flat `req.md` path). create → draft v1, parented to the thread idea if present; refine → update body, re-open to `draft`, `version+1` (downstream-stale hook for Ph2); finalize → `draft`→`locked` (no version bump; idempotent if already locked). Exported from `app/index.ts`.

**Tests:**
- `tests/context-assembler.test.ts`: new case — req injected before idea (scope `thread`, reason `auto`); not double-added when it is the target. (Kept a separate fixture so the strict scope-ordering assertion in test 1 is undisturbed.)
- `tests/req-usecases.test.ts` (new, in suite): full create → duplicate-rejected → finalize(lock, no bump) → refine(reopen, v2) → finalize(v2, idempotent) lifecycle on real fs with an injected loom root.

Build clean; both green.

## Step 4 — **mcp — tools + resource.** Register `loom_create_req(weaveId, threadId, content?)`, `loom_refine_req`, `loom_finalize_req`, and `loom_generate_req` (sampling; extension-only, returns `MethodNotFound` in CLI like other `generate_*`). Surface `req` in the `loom://context/...` bundle. MCP integration test covering create → finalize → context-includes-req.

**mcp — tools + resource.**

- Three CRUD tool modules (toolDef + handle, modeled on `createDesign`): `packages/mcp/src/tools/createReq.ts`, `refineReq.ts`, `finalizeReq.ts` → delegate to the app use-cases. Registered in `server.ts` `BASE_TOOLS`.
- `loom_generate_req` added to the sampling tools in `tools/generate.ts` (it already has the `server` handle): reads thread context, samples a faithful Included/Excluded/Constraints extraction (with `IN`/`EX`/`C` ID prefixes, explicit-only, no invented scope), then calls `createReq` with the body. Naturally returns `MethodNotFound` in a Claude Code CLI session (sampling blocked) — CLI path is `loom_create_req` with `content`, exactly as specified.
- **Context resource:** no code change needed — `loom://context/...` runs `assembleContext` → `serializeBundle`, both type-generic, so `req` surfaces automatically (header renders `[thread req]`).

**Tests:** `packages/mcp/tests/integration.test.ts` — added the 4 req tools to the list-tools smoke check and a new lifecycle test: `loom_create_req` → `loom_finalize_req` (returns `status: locked`) → `req` appears in the `tw-plan-001` context bundle **before** the idea. Built (relinks global `loom`), spawned a fresh `loom mcp` subprocess: **10/10 pass**.

## Step 5 — **vscode — tree node + buttons.** Add a `req` node under each thread; wire **Generate / Refine / Finalize** commands to the MCP client; render a locked-state badge. No direct `app` imports — MCP only.

**vscode — tree node + buttons (MCP-only, no `app` imports).**

- `tree/treeProvider.ts`: render `thread.req` as the **first** child of a thread (chain position) via `createDocumentNode(..., 'req', ...)`; locked req shows a `🔒 locked` badge. Thread `contextValue` gains `-has-req`. `groupByType` includes a `req` bucket (and `t.req` in its doc collection) so type-grouping shows req docs.
- `icons.ts`: `getDocumentIcon` → `req` uses the `law` codicon.
- `commands/req.ts` (new): `generateReqCommand` (dual path — Claude CLI launch that extracts from chat → `loom_create_req` with content, else MCP sampling `loom_generate_req`), `finalizeReqCommand` (`loom_finalize_req`), `refineReqCommand` (Claude re-extract → `loom_refine_req`, else reopen + open file). All go through `getMCP(root).callTool(...)` — **no `app`/`fs`/`core` imports**, MCP is the only gate.
- `extension.ts`: registered `loom.generateReq` / `loom.finalizeReq` / `loom.refineReq`.
- `package.json`: three commands + menu wiring — Generate on a thread without a req (`!has-req`), Finalize on a draft req (`viewItem == req-temp`), Refine on a locked req (`viewItem == req`), in both inline and context-menu groups.

**Validation:** full `build-all` clean (vscode `tsc` typechecks). The `tests/vscode/*` suites require the VS Code extension host (`vscode` module) and cannot run headless via ts-node — pre-existing, so they are not in `test-all.sh`; this layer's type-safety is covered by the compile. Functional parity is by mirroring the working `generateDesign`/`finalize` commands.

## Step 6 — **build + full test green + smoke.** `./scripts/build-all.sh`, `./scripts/test-all.sh`. Smoke: hand-write a `loom/{weave}/{thread}/req.md`, finalize it, assert it surfaces in an assembled bundle **before** the idea, and that a thread whose only non-done doc is a perpetual `req` still reaches `DONE`.

**build + full test green + smoke.**

- `./scripts/build-all.sh` clean across core → fs → app → mcp → cli → vscode (global `loom` relinked).
- `./scripts/test-all.sh` — **entire suite green**, including the new/updated tests: `tests/req.test.ts`, `tests/thread-repository.test.ts`, `tests/req-usecases.test.ts`, `tests/context-assembler.test.ts`, and `packages/mcp/tests/integration.test.ts` (**10/10**, fresh `loom mcp` subprocess).

**Smoke (covered by the suite):**
- *req surfaces before the idea* — asserted in `context-assembler.test.ts` (pure assembler) and in the live `integration.test.ts` (`loom_create_req` → `loom_finalize_req` → `loom://context/tw-plan-001` shows the req id + body, positioned before `t1-idea`).
- *perpetual req doesn't block DONE* — `req.test.ts` (a locked req excluded from the every-done predicate; thread still reaches DONE).

Phase 1 complete: a `req` doc-type that is generated-from-chat, curated, explicitly locked, and auto-injected (first) into every context bundle for its thread — faithfulness by injection, no plan-step schema change (that is Phase 2).
