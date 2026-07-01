---
type: done
id: pl_01KTVANY3TXQ9GM48Z9XVE0XBJ-done
title: Done — Context Dispatcher — plan
status: done
created: "2026-06-11T00:00:00.000Z"
version: 6
tags: []
parent_id: pl_01KTVANY3TXQ9GM48Z9XVE0XBJ
requires_load: []
---
# Done — Context Dispatcher — plan

## Step 1 — Stopgap: add a `context: "skip"` / `brief_only` flag to loom_do_step so the agent suppresses the repeat thread bundle when it's already loaded, and stop loom_complete_step / loom_append_done from echoing the full plan doc back (return id + the changed step/summary instead).

**Cheap stopgap — skip flag + trim echo-backs.**

- `packages/mcp/src/tools/doStep.ts` — added a `context: "skip"` flag (enum) plus a `brief_only: true` boolean alias to `loom_do_step`. When either is set, the handler suppresses the ~6–7k-token thread bundle (skips the `handleContextResource` call) and substitutes a one-line marker noting the caller declared it already loaded. Explicit `context_ids` (additive injection) are still honoured — they are the inverse of the skip flag. Added a `contextSkipped` boolean to the returned brief so the agent/log can reconcile. Updated the tool description to tell agents to pass `skip` on every call after the first when advancing through several steps of one plan.
- `packages/mcp/src/tools/completeStep.ts` — stopped echoing the full `PlanDoc` back on every call. Now returns a trimmed shape: `{ planId, planStatus, autoCompleted, completedStep: {order, status, description}, steps: [{order, status}] }` — a reference + the changed step + a compact per-step status line, instead of the whole plan body.
- `packages/mcp/src/tools/appendDone.ts` — both response branches (created / appended) now return an explicit changed-step reference `{ planId, doneId, stepNumber, filePath, created }` instead of the bare `{ filePath, created }`.
- `packages/app/src/doStep.ts` — **intentionally unchanged.** This is the sampling-fallback use-case (calls `aiClient.complete()` and writes a chat, returning `{ chatPath, chatId }`). It emits no host-agent thread bundle and no full-plan echo-back, so the stopgap has no surface here; the `planSummary` it builds is genuine sampling input the model needs, not a redundant re-injection. Documented rather than forcing an unwarranted edit.

The coarse `skip` flag is superseded by the precise per-doc `{id@version}` ledger in steps 2–3 (it remains as the ergonomic "I hold the whole thread" shortcut).

## Step 2 — Extend the pure assembleContext to accept `alreadyLoaded: {id, version}[]` and return `{ docs: delta, manifest }` — emit a doc only when its id is absent from alreadyLoaded OR its version differs. The dedupe unit is {docId@version}; a refine (version bump) always re-emits. Pure, no IO.

**Ledger protocol in assembleContext (pure, model C core).**

`packages/core/src/entities/context.ts`:
- Added `LoadedDoc { id, version }` — one entry of the caller-declared ledger (the dedupe unit; inverse of the additive `ContextOverrides.include`).
- Added `ManifestEntry { id, version }` — a doc the dispatcher assumed already-present and suppressed from the delta.
- Added required `version: number` to `BundledDoc` (from `BaseDoc.version`; missing placeholder carries 0) so the agent can declare received docs as `{id, version}` for the next call.
- Added required `manifest: ManifestEntry[]` to `ContextBundle`, and documented that `docs` is now the delta and `totalTokens` reflects the delta (not the full resolved set).

`packages/core/src/index.ts`: exported `LoadedDoc` and `ManifestEntry`.

`packages/app/src/context/assembleContext.ts`:
- Imported `LoadedDoc`, `ManifestEntry`.
- Added optional 5th param `alreadyLoaded: LoadedDoc[] = []` (default keeps all existing 4-arg callers compiling; Step 3 threads it through the doors).
- Set `version: doc.version` in the `add()` BundledDoc builder and `version: 0` on the missing-requires_load placeholder.
- After the full bundle resolves, partition `resolved` into `docs` (delta) + `manifest` (assumed-present): a doc is suppressed only when `{id@version}` matches the ledger. Ledger ids are run through `resolveId(state.index, …)` so a slug declaration matches its canonical id. A version bump never matches → always re-emitted (no silent under-load). `totalTokens` recomputed over the delta.

Purity preserved — still a pure function of (targetId, mode, overrides, state, alreadyLoaded); no IO.

**Decisions / impact checked:** `manifest` semantics = the suppressed/assumed-present set (empty when ledger is empty → full bundle). The only constructors of `BundledDoc`/`ContextBundle` are inside `assembleContext`; the vscode contextSidebarProvider uses a *local structural mirror* interface for `JSON.parse` (unaffected by added fields), and `serializeBundle.ts` / `mcp/resources/context.ts` only consume. Existing `tests/context-assembler.test.ts` does field-by-field assertions (no whole-bundle deepEqual), so the added `manifest` field does not break them. Not yet built — build + test-all run in Step 5 (and the round-trip test lands in Step 4).

## Step 3 — Route the injection doors through the extended assembler: thread an `alreadyLoaded` (ledger) param through loom_do_step and the loom://context resource so both inject only the delta. assembleContext becomes the single injection door — no command assembles context on its own.

**Wire the dispatcher into the injection doors.**

`packages/mcp/src/resources/context.ts` (the single injection door):
- Imported `LoadedDoc` from core.
- Added `parseLoadedLedger(param)` — parses the `?loaded=` query string (comma-separated `id@version` tokens) into `LoadedDoc[]`. Uses `lastIndexOf('@')` (id-safe) and drops malformed tokens, so a bad ledger entry can never suppress a doc (fails toward re-injection, never silent under-load). Ids are canonicalised inside `assembleContext`, so a slug in the ledger still matches.
- Parsed `?loaded=` and passed it as the new 5th arg to `assembleContext(targetId, mode, overrides, state, alreadyLoaded)`. Absent param ⇒ empty ledger ⇒ full bundle. The existing `format=json` path now returns the delta + `manifest` for structured consumers (sidebar, do_step).

`packages/mcp/src/tools/doStep.ts`:
- Imported `ContextBundle` (core) and `serializeBundle` (app).
- Added an `alreadyLoaded: [{id, version}]` input param (validated/filtered in the handler) alongside the coarse `context:"skip"`/`brief_only` from Step 1.
- The context fetch now requests the resource's `format=json` form with the ledger encoded as `&loaded=id@version,…`, parses the `ContextBundle`, sets `threadContext = serializeBundle(bundle)` (identical markdown to the old text path for the no-ledger case → no regression), and captures `bundle.manifest`.
- Added `contextManifest` to the returned brief so the agent can reconcile assumed-present docs. `skip` still short-circuits the resource call entirely.

`packages/app/src/doStep.ts` — **intentionally unchanged** (same as Step 1). It is the sampling-fallback use-case: it builds a prompt (`planSummary` + step lines) for `aiClient.complete()` and writes a chat; it does not assemble *document context* via the dispatcher, so it is not one of the injection doors "assembling context on its own." Threading `alreadyLoaded` there would be meaningless (no doc bundle to dedupe). Adding thread-context to the sampling path is a separate concern, out of scope for this dedupe plan.

**Net:** `assembleContext` is now the one door; both `loom_do_step` and `loom://context` inject only the delta when a ledger is declared. `context:"skip"` remains the ergonomic "I hold the whole thread" shortcut (≡ declaring the full ledger). **Not yet built** — verification (build-all) + the round-trip test run after Rafa reconnects MCP.

## Step 4 — Tests: the dedupe + correctness invariants. Same-session, no doc change → ~0 delta; a doc whose version bumped → re-injected; empty/new-session ledger → full bundle; manifest lists assumed-present docs. Pure assembleContext unit tests + a loom_do_step round-trip.

**Tests — dedupe + no-silent-under-load.** ✅ Verified green after build-all (8/8 checks pass against the freshly-built `dist`).

New file `tests/context-dispatcher.test.ts`, two layers:

1. **Pure `assembleContext` unit tests** (hand-built `LoomState`, no IO):
   - empty/omitted ledger → full bundle + empty manifest; every bundled doc carries a `version`; missing placeholder version is 0.
   - full ledger (no change) → 0 delta, `totalTokens === 0`, manifest covers exactly the resolved set.
   - **version bump** (`d1@1` declared, current `d1@2`) → only `d1` re-injected at the CURRENT version, absent from manifest; unchanged docs stay assumed-present.
   - **slug in ledger** (`vision@1`) resolves to canonical `rf-vis` → suppressed + in manifest; nothing else suppressed.

2. **Round-trip over a hermetic on-disk workspace** driving the real MCP handlers (`doStep.handle` + `handleContextResource`): first `do_step` → full bundle/empty manifest; re-call with `alreadyLoaded` → manifest covers all + `docs=0` header + shorter context; `context:"skip"` → `contextSkipped` + suppression marker; `loom://context?...&loaded=` with one bogus version → only that doc re-injects, rest in manifest.

Registered in the suite: `run_test tests/context-dispatcher.test.ts` added to `scripts/test-all.sh` (explicit list — no auto-discovery). Full `test-all` runs in Step 5.

## Step 5 — Docs + release: document the new agent protocol (the `alreadyLoaded`/`skip` params and the rule that the agent declares its loaded {id@version} set) in BOTH CLAUDE.md surfaces (drift test enforces parity), CHANGELOG 1.6.0 (root) + vscode lockstep note, build-all + test-all, lockstep bump to 1.6.0.

**Docs sync, build, release 1.6.0.** ✅ Full `test-all` green (exit 0).

**Both CLAUDE.md surfaces (parity-enforced):** added a new shared `<!-- rule:context-ledger -->` rule to the MCP Rules list in root `CLAUDE.md` (recursive voice) and the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts` (project-agnostic voice). `claude-md-sync` now passes with **14** matching rule ids (was 13). The rule tells agents to declare the `{id@version}` set they hold (`context: "skip"` / `alreadyLoaded`) so `loom_do_step` injects only the delta.

**CHANGELOG:** wrote the 1.6.0 entry under `[Unreleased]`; `bump-version.sh 1.6.0` rolled it to `## [1.6.0] - 2026-06-11` and bumped all 7 package.json to 1.6.0 (lockstep). Added the vscode `packages/vscode/CHANGELOG.md` 1.6.0 lockstep note by hand (the script doesn't touch it).

**Reference docs (Rafa's request; gate-excluded `loom/refs/*`):**
- `loom/refs/loom-context-pipeline-reference.md` — updated the assembler signature (`alreadyLoaded?`), the `ContextBundle` shape (`manifest`, delta `docs`, `version` on `BundledDoc`), added pipeline step 9 (dedupe), a design invariant (dedupe never costs correctness), and a 1.6.0 status line.
- `loom/refs/architecture-reference.md` — added a "Context Dispatcher (1.6.0)" note in the AI Agent Integration section tying it to "Making AI Stateful" (§5).

**Global ctx (`loom/ctx.md`, via `loom_patch_doc`):** added one lean bullet under Primary entry points pointing at the `context-ledger` rule — the ctx is the only doc auto-loaded every session, which is where the per-session ledger behavior needs to be visible.

**READMEs:** added a 6th "Context dispatcher" row to the root README's context-mechanisms table (it maps to the README's "re-explaining context is expensive" pain point). CLI/vscode READMEs unchanged — the dispatcher adds no user command or UI (ledger display is a deliberate follow-up).

**Build/test:** `build-all` green; rebuilt after the version bump so the linked CLI/bundles embed 1.6.0; `test-all` green. One real fallout fixed: `packages/mcp/tests/integration.test.ts` asserted the old `loom_complete_step` shape (`result.plan.id`) — updated to the new compact contract (`planId` / `completedStep` / `steps`, and asserts the full `plan` body is NOT echoed). Integration 16/16.

**Push gated on Rafa** (per the release ritual + the lightweight-tag gotcha): `git commit -am "release: v1.6.0" && git tag v1.6.0 && git push --follow-tags` — and push the tag explicitly since `--follow-tags` won't carry a lightweight tag.
