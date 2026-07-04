---
type: done
id: pl_01KWKHA82YGZ6AHAHPAR7TZ79F-done
title: Done — Unambiguous naming + canonical ULID refactor
status: done
created: 2026-07-03
version: 12
tags: []
parent_id: pl_01KWKHA82YGZ6AHAHPAR7TZ79F
requires_load: []
---
# Done — Unambiguous naming + canonical ULID refactor

## Step 1 — Write loom/refs/api-naming-reference.md: the governing 'final consumer' principle; `*Ulid` for ULID references (ban `*Id`); `*Slug` for folder names incl. weaveSlug; every entity by ULID except weave (documented exception); per-surface casing (snake_case MCP schema, camelCase app). Mark provisional-pending-audit.

Created `loom/refs/api-naming-reference.md` (slug `api-naming`, id `rf_01KWKPVD7QE39SSNBSVMAA2H1Z`) via `loom_create_reference`, so it got a real ULID + proper frontmatter and lives in the hand-maintained (gate-excluded) global refs dir alongside vision/workflow/architecture.

Content captures the settled convention:
- Governing "act as the final consumer" principle, grounded in the originating `threadId` bug.
- Rule 1: `*Ulid` for ULID references, `*Id` banned (with the `threadUlid` precedent from `setThreadPriority`/`setThreadDeps`).
- Rule 2: `*Slug` for folder names incl. `weaveSlug`.
- Rule 3: every entity by `*Ulid` except weave.
- Rule 4: verb + explicit entity for function names.
- D5 two-surface casing (snake_case MCP schema / camelCase app) with a table + the `handle(root, args)` mapping seam.
- The documented weave exception (no ULID, deliberate, out of scope).
- A quick-reference table (value → MCP name / app name / never) and a "where this lives" note (citation-loaded, never in ctx.md; CLAUDE.md short-form carries no marker/mirror).

Opened with a **provisional-pending-audit** banner (removed in step 4). Satisfies IN1, IN2, IN3, IN4, C1, C4.

## Step 2 — Add the naming hard-rule short-form to CLAUDE.md pointing to the reference — with NO `rule:` marker and NO LOOM_CLAUDE_MD template mirror (repo-specific; must not enter the CLAUDE.md⇄template sync test).

Added the **API naming rule (hard)** to `CLAUDE.md`, right after the Injection rule in the Architecture section. It states the `*Ulid`/`*Slug`/weave-exception/per-surface-casing rules in short form and links to `loom/refs/api-naming-reference.md` for the full convention. Explicitly annotated as repo-specific — **no `rule:` marker, not mirrored into the `LOOM_CLAUDE_MD` template** — so `tests/claude-md-sync.test.ts` won't flag a parity mismatch. CLAUDE.md is gate-excluded, so this was a normal `Edit`. Satisfies IN1, C2.

## Step 3 — Read-only inventory of every loom_* tool (packages/mcp/src/tools/*) and app use-case (packages/app/src/*): classify each parameter (ULID-ref / slug / title / body / other) and produce a current→proposed rename table. Cast wide — also flag ANY misleading name (ambiguous verbs, params, return shapes), not just the ULID/Slug axis. The audit catalogs every smell; fixes stay scoped (EX5) — safe ULID/Slug renames ride step 7, larger/riskier ones are flagged as follow-ups. Confirms the convention against all cases before any rename.

Wrote `loom/refs/api-audit-reference.md` (slug `api-audit`, id `rf_01KWKQH54YSWW1NJXYH38MGFSE`) — a refactor-scoped inventory (marked for archival after landing). Deviation from the plan's `Files touched`: the planned thread-local `…/api-contract-refactor/refs/` path hits the MCP gate with no create tool for thread-local refs, so it lives in global `loom/refs/` via `loom_create_reference` and is clearly flagged transient.

Inventory built from every tool `inputSchema` + `handle()` mapping. Rename table covers: all `weaveId`→`weave_slug`; `threadId`→`thread_ulid` (existing-thread refs) vs `thread_slug`/`new_thread_slug` (create/rename folder); `planId`→`plan_ulid`; and the doc-ref ids (`parentId`, `chatId`, `sourceId`, `targetId`, `oldId`)→`*_ulid`. Non-ULID/Slug smells flagged as deferred follow-ups (EX5): `weaveIdea`/`weaveDesign`/`weavePlan` (weave-as-verb) and `chatNew` should be `create*`; the four-tool rename family is incoherent.

**Three open convention questions surfaced** (Q1 structural handles like `stepId`/`IN`/`EX`/`C` that are neither ULID nor slug; Q2 dual-accept `planId` = "ULID or stem"; Q3 the rename family) — these must be decided before step 4 finalizes the convention, so stopping here. Satisfies IN5, C3.

## Step 4 — Fold any cases the audit surfaced into api-naming-reference.md and drop the provisional marker.

Finalized `api-naming-reference.md`: dropped the provisional banner; added the **Q1 carve-out** (rule 1 sub-point — structural handles like `step_id`/`IN`/`EX`/`C` keep `id`/`*_id`); added **rule 2 = strict ULID-only** (`*_ulid` accepts the ULID only; dual-accept retired; slug ops are separate methods/optional params); renumbered Slug/entity/function rules to 3/4/5; upgraded rule 5 (function names must describe the effect) with the `loom_rename`→`loom_retitle` and `loom_rename_doc_file`→`loom_rename_reference_file` renames; added a **Non-goals** section documenting that the frontmatter `id` field is deliberately *not* renamed to `ulid` (storage schema ≠ API surface); added a structural-handle row to the quick-reference table. Recorded the resolutions (Q1/Q2/Q3) in `api-audit-reference.md`. Both files are in gate-excluded `loom/refs/`, so normal edits. Satisfies IN1.

## Step 5 — Add a single shared resolveThreadFolder(weaveSlug, threadUlid, deps) in packages/app/src/utils — scans thread manifests, maps th_ ULID → folder, throws on an unresolvable ULID. The one ULID→folder chokepoint every create/promote/folder-op routes through.

Added `packages/app/src/utils/resolveThreadFolder.ts` — `resolveThreadFolder(weaveSlug, threadUlid, deps)` scans `loom/{weaveSlug}/*/thread.md`, matches the manifest whose `id === threadUlid`, returns `{ threadSlug, threadPath }`; throws (never fabricates) when the weave is missing or no thread matches, with an error that points the caller to `createThread`. Same manifest-scan shape as `scanManifests`/`setThreadPriority` in `thread.ts`, kept as a standalone util so every create/promote routes through one chokepoint. Exported from `packages/app/src/index.ts`. Compile verification lands at step 8's build-all (not built in isolation). Satisfies IN6.

## Step 6 — Remove the ensureThreadManifest auto-scaffold-into-unknown-thread seam. Thread creation becomes explicit (createThread → { threadUlid }); doc-create use-cases require an existing thread referenced by threadUlid (resolved via step 5) and never fabricate one.

Removed the `ensureThreadManifest` auto-scaffold seam and converted all 8 doc-create/promote use-cases to resolve the thread by its `th_` ULID via `resolveThreadFolder` (resolve-at-boundary; path helpers stay slug-based):
- `weaveIdea`, `weaveDesign`, `req.ts` (createReq/amendReq/finalizeReq), `weavePlan`, `chatNew`, `promoteToIdea/Design/Plan`. `chatNew` + `weaveIdea` gained `loadDoc` in deps (threaded through the MCP handlers `createIdea`, `createChat`, `generate`).
- Deleted the dead `ensureThreadManifest`. Added a **reverse guard**: `createThread` now runs `assertValidThreadId`, which rejects a `th_`-shaped slug — so explicit creation can't mint a ULID-named folder either.
- Fixed `quickShip` to thread the minted ULID (was passing the slug); its result `threadId` is now the ULID.
- Dropped the `${slug}-idea/design.md` legacy dual-read only in the files I rewrote (weaveDesign, req) — consistent with `clean-legacy-read`, which owns the rest.

**Callers migrated to build+test green:**
- CLI create commands (`weaveIdea`/`weaveDesign`/`weavePlan`) accept slug-or-ULID and explicitly `createThread` for a new slug (new `packages/cli/src/threadArg.ts` + `resolveThreadUlid` app helper).
- ~9 tests migrated to createThread-first (quick-ship, create-with-body, req-usecases, staleness-baselines, blockedby-normalization, create-plan-hardening, design-version-baseline, step-crud, mcp-new-tools). Notable: several **encoded the bug** — they passed a slug for a thread never created, passing only because the old seam fabricated it.

Result: `build-all` green; **entire root `tests/` suite green.** The MCP integration test (live req lifecycle) is deferred to step 7 by decision — it exercises `verify_req`/folder-ops that still key on slug, so it needs the step-7 consistency pass, not a create-path patch. Satisfies IN7, EX3.

## Step 7 — Full API-consistency pass, build-green stages (plan B). (a) Convert the REMAINING thread-referencing use-cases that step 6 didn't (verify_req, and the folder-ops rename/move/archive/delete/restore) to resolve-at-boundary by thread_ulid — so the whole live surface is uniformly ULID. (b) Cosmetic renames: MCP schemas + descriptions → snake_case (weave_slug, thread_ulid, …); app inputs/functions → camelCase; handlers map. (c) The two tool renames: loom_rename→loom_retitle, loom_rename_doc_file→loom_rename_reference_file. (d) Fix the MCP integration-test fixtures (real thread manifests + ULIDs) so test-all is fully green. Update ALL callers. Clean break — no shims.

Full API-consistency pass, done in build-green stages (plan B) — 8 build-green commits, `build-all` + `test-all` green throughout.

**(a) Folder-ops resolve-at-boundary.** `verify_req` (Stage 1) + the decision on rename/move/archive/delete/restore: `rename_thread`/`move_thread` → `thread_ulid` (resolve via `resolveThreadFolder`); `archive`/`delete`/`restore` kept honestly slug-addressed (`weave_slug`+`thread_slug`, `doc_ulid` for refs) — a folder move stores no reference, so ULID-addressing there was plumbing-cost for no gain (Rafa approved). vscode carries the ULID via a new `TreeNode.threadUlid`.

**(b) Param renames — all 7 families** to snake_case at the MCP schema, camelCase in the app, handlers mapping:
- req (create/amend/finalize/verify), create (idea/design/plan/chat/thread + quick_ship; `create_idea` now requires `thread_ulid`; `create_thread` → `thread_slug`+`depends_on`; `create_plan` → `parent_ulid`), plan-step (10 tools → `plan_ulid` with a shared `requirePlanUlid()` **strict** guard — Q2b, dual-accept retired), promote (`source_ulid`/`target_weave_slug`/`target_thread_ulid`), generate (`weave_slug`/`thread_ulid`/`chat_ulid`), misc (search/validate/refresh_ctx → `weave_slug`; context_prefs `doc_ulid`; create_weave/rename_weave; set_priority/set_thread_deps MCP casing → `thread_ulid`/`depends_on`).
- Added a vscode `ensureThreadUlid` helper (mirror of the CLI's) so create/promote buttons mint the thread manifest first when new. Updated every launch-prompt (they out-rank CLAUDE.md).

**(c) Tool renames.** `loom_rename → loom_retitle`, `loom_rename_doc_file → loom_rename_reference_file`; `loom_rename` reference refreshed in CLAUDE.md + the LOOM_CLAUDE_MD template.

**(d) Test fixtures.** Migrated create-first + ULID seeds across the suite; `createPlanDoc` gained an optional `id` so fixtures carry real `pl_` ULIDs with humanised filenames; `resolution-dx` flipped (start_plan rejects a stem strictly). MCP integration fixture reseeded.

Latent bugs fixed in passing: `weaveDesign` untitled-title was using a ULID (now the slug); the Generate-Plan and Promote-to-Plan launch prompts instructed a `content` Steps table to the structured-only `create_plan` (now goal + structured steps).

Flagged follow-ups: the app `doStep` use-case (separate AI path) keeps `planId`; the generate tools' internal `context/thread` URI passes a ULID where a slug is expected (step-6 residue) — both belong with the `clean-legacy-read` thread.

## Step 8 — CLI slug/ULID ergonomics: create commands accept a thread SLUG (resolved to ULID for humans) or a ULID directly; add `loom resolve-ulid <weave> <slug>` (slug → th_ ULID) and `loom resolve-path <weave> <ulid>` (ULID → folder path), backed by a new `resolveThreadUlid` app helper (inverse of resolveThreadFolder).

CLI slug/ULID ergonomics.

- Added `loom resolve-ulid <weave> <slug>` (folder slug → stable `th_` ULID) and `loom resolve-path <weave> <ulid>` (ULID → `weave/slug` + absolute path) in `packages/cli/src/commands/resolve.ts`, registered in `index.ts`. Backed by the existing `resolveThreadUlid` / `resolveThreadFolder` app helpers (no new engine).
- The "create commands accept a slug OR a ULID" half was already satisfied by `ensureThreadUlid` (threadArg.ts): a `th_` value passes through, a slug resolves-or-mints.
- Live-verified against this repo: `resolve-ulid core-engine api-contract-refactor` → `th_01KWKA1E779SGAMFKYMRGXTC6M`; `resolve-path` round-trips to the folder; an unknown slug errors with exit 1.

## Step 9 — Add tests/api-contract-refactor.test.ts (wired into scripts/test-all.sh): create-by-existing-threadUlid lands in that thread; create-by-unknown-threadUlid throws; no path fabricates a thread folder. Then build-all + test-all green.

Regression test `tests/api-contract-refactor.test.ts` (wired into `scripts/test-all.sh`):
- create by an existing `thread_ulid` lands the doc in that exact thread (`loom/wv/my-thread/idea.md`);
- create by an unknown `thread_ulid` throws (`No thread with ulid`) and fabricates nothing — asserts the weave still holds only the real thread AND that no folder literally named by the ULID exists (the originating bug);
- `resolveThreadUlid` ⇄ `resolveThreadFolder` round-trip, and an unknown slug throws.

Full `test-all` green.

## Step 10 — Fix chatNew to two canonical chat homes only. A chat resolves to exactly: (1) {weave}/{thread}/chats when weaveSlug+threadUlid (via resolveThreadFolder, throw if unresolvable), or (2) refs/chats when weaveSlug='refs'. Delete the weave-root ({weave}/chats) and bare loom/chats fallback branches — a non-refs chat with no resolvable thread now THROWS instead of silently orphaning an invalid, tree-invisible file (same 'unresolvable → error, never fabricate' invariant this thread enforces elsewhere). Correct the stale loom_create_chat tool description ('requires weaveId + threadId' → the weave_slug/thread_ulid + refs contract).

Rewrote `packages/app/src/chatNew.ts` branching to the two canonical chat homes only:
- `weaveSlug === 'refs'` → `loom/refs/chats` (refs chat).
- `weaveSlug && threadUlid` → `resolveThreadFolder(...)` → `{weave}/{thread}/chats` (throws on an unresolvable ULID, unchanged).
- **else → throws** with a clear message. This deletes the two orphan-producing fallback branches: the old `!weaveSlug → loom/chats` (dead — `loom/chats` gone long ago) and `weaveSlug && !threadUlid → loom/{weave}/chats` (invalid weave-root, tree-invisible). Same "unresolvable reference → error, never fabricate" invariant the rest of this thread enforces.

Corrected the stale `loom_create_chat` description in `packages/mcp/src/tools/createChat.ts` ("requires weaveId + threadId" → the weave_slug/thread_ulid + refs="refs/chats" contract).

`./scripts/build-all.sh` green; `./scripts/test-all.sh` 18/18 pass — no existing test relied on the removed branches. Note: the running `loom mcp` in this session still serves the pre-build tool code (build-all doesn't restart it), so the corrected description/behavior lands live only after an MCP/session restart; dist-importing tests already exercise the new code.

## Step 11 — Plumb the thread's th_ ULID down the VS Code tree node subtree. Pass thread.manifest?.id through getThreadChildren → createChatsSection / createDocumentNode / createChatNode (and ctx/refs children) so every descendant node carries threadUlid, exactly as weaveId/threadId (the slug) already flow. Root cause of the regression: threadUlid was set on ONLY the thread node, so New Chat / req / rename invoked from a descendant row saw threadUlid=undefined. This one change fixes New Chat from inside a thread, the false 'no thread.md manifest' errors on req/rename from doc rows, and the ensureThreadUlid create_thread fallback.

Root-cause fix in `packages/vscode/src/tree/treeProvider.ts`: `getThreadChildren` now captures `const threadUlid = thread.manifest?.id` and, before returning, recursively stamps it onto the entire subtree (`stampThreadUlid`) — nested nodes included (chats, docs inside the Chats/Context/References sections), preserving any node that already set its own. Previously only the thread node itself carried `threadUlid`, so New Chat / req / rename / promote fired from a descendant row saw `threadUlid=undefined`. Chose the single recursive stamp at the one funnel over threading a param through six node-builder helpers — DRY, and thread identity now flows to every descendant exactly like `weaveId`/`threadId`. No change needed to the chatNew command: it already reads `node.threadUlid`, which is now populated; refs New Chat still works via `weaveId='refs'`.

Additionally (Rafa's ask — no more stale tool descriptions): swept every `loom_*` tool. Fixed two real stale items — `packages/mcp/src/tools/generate.ts` `loom_generate_req` had `required: ['weaveId','threadId']` while its properties are `weave_slug`/`thread_ulid` (named nonexistent params) → corrected to `['weave_slug','thread_ulid']`; and `searchDocs` description prose 'weave id' → 'weave slug'. Left `stepId`/`orderedStepIds` (a step's stable frontmatter `id`, not a ULID — descriptions say so) and internal local variables / output-payload keys (not descriptions; step-7-scoped cosmetic set).

## Step 12 — Regression test for the chat-location contract (extend tests/api-contract-refactor.test.ts, already wired into scripts/test-all.sh): (1) create_chat with a real existing threadUlid lands in {weave}/{thread}/chats; (2) create_chat for refs lands in refs/chats; (3) a non-refs chat with no resolvable thread THROWS and creates no file at loom/{weave}/chats or loom/chats. Then build-all + test-all green.

Extended `tests/api-contract-refactor.test.ts` (already wired into `scripts/test-all.sh`) with the chat-location contract: (1) chat by existing `thread_ulid` lands in `loom/wv/my-thread/chats/chat-001.md`; (2) refs chat (`weaveSlug='refs'`) lands in `loom/refs/chats/chat-001.md`; (3) a non-refs chat with no `thread_ulid` throws (`/a chat lives only in a thread/`) and a bogus `thread_ulid` throws (`/No thread with ulid/`), with assertions that neither `loom/wv/chats` nor `loom/chats` is created. `build-all` + `test-all` fully green; the api-contract-refactor test alone shows all 6 cases (3 prior + 3 new) passing.

## Step 13 — Documentation pass — reflect the refactor's naming/tool renames in the living canonical docs (frozen history left as-is). Fix: architecture-reference (loom_rename→loom_retitle, loom_rename_doc_file→loom_rename_reference_file); loom-requirements-reference (loom_create_req(weaveId,threadId)→(weave_slug,thread_ulid)); README + CLAUDE.md + ctx.md + the LOOM_CLAUDE_MD template ({weaveId}/{threadId} context-URI placeholders → {weaveSlug}/{threadUlid}); ctx.md runEvent(threadId)→runEvent(weaveSlug); README loom://state phantom threadId= → status=. CLAUDE.md⇄template parity preserved (claude-md-sync green).

Documentation pass over the living canonical docs (frozen history — old chats/plans/done/superseded designs — deliberately left unchanged; they accurately record the API as it was). Edits:\n- `loom/refs/architecture-reference.md`: `loom_rename`→`loom_retitle`, `loom_rename_doc_file`→`loom_rename_reference_file`.\n- `loom/refs/loom-requirements-reference.md`: `loom_create_req(weaveId, threadId, content?)`→`(weave_slug, thread_ulid, content?)`.\n- `README.md`: context-URI placeholder `{weaveId}/{threadId}`→`{weaveSlug}/{threadUlid}`; `loom://state?weaveId=&threadId=`→`?weaveId=&status=` (the `threadId` filter never existed).\n- `CLAUDE.md` + `loom/ctx.md` + the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts`: same `{weaveId}/{threadId}`→`{weaveSlug}/{threadUlid}` placeholder fix (CLAUDE.md and template edited in lockstep — `claude-md-sync` test green).\n- `loom/ctx.md`: `runEvent(threadId, event, deps)`→`runEvent(weaveSlug, event, deps)` (verified against `packages/app/src/runEvent.ts` — the first arg is the weave).\n\nStale-token scan also confirmed `mcp-reference.md`, `implementation-contract-reference.md`, `getting-started`, `workspace-directory-structure`, and `workflow-reference` are already clean. `build-all` + `test-all` green after the template change.

## Closing notes

Plan complete — shipped in v1.15.0. The api-contract-refactor: unambiguous canonical-ULID naming across the whole loom_* surface, explicit thread creation (no fabricate), the chat-location contract + the VS Code tree threadUlid-plumbing regression fix, a stale tool-description sweep, and the living-docs pass. build-all + test-all green at the release bump.
