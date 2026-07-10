---
type: done
id: pl_01KX5W1M0T8MDRPEMX62357RWP-done
title: Done — Slug/Ulid naming sweep — app + mcp internals + consumer output shapes
status: done
created: 2026-07-10
version: 2
tags: []
parent_id: pl_01KX5W1M0T8MDRPEMX62357RWP
requires_load: []
---
# Done — Slug/Ulid naming sweep — app + mcp internals + consumer output shapes

## Step 1 — Rename app-layer slug-carrying weaveId/threadId → weaveSlug/threadSlug: use-case locals, deps type params (loadWeave/runEvent), the getState({ weaveId }) options field, AND (decision B) the app query use-case interface field names — input filters ({ threadId }) and output shapes ({ id, threadId, title }) across the query use-cases. Rename per-occurrence, verifying each carries a slug (not a th_ ULID → that would be *Ulid).

app-layer `weaveId`/`threadId` → `weaveSlug`/`threadSlug`: use-case locals, `loadWeave`/`runEvent` deps type params, `getState` options field, and (decision B) the query use-case interface fields (`StaleDoc`, `StampedPlan`, filters, output shapes). All verified slug-carrying (from `resolveWeaveSlugForPlan`, `weave.id`/`thread.id`, path basenames, or `resolveThreadFolder(...).threadSlug` in promote*). `weaveIdea`/`WeaveIdea*` function/type names preserved (word-boundary regex). 0 residual in packages/app/src.

## Step 2 — Rename the identical safe-internal pattern in packages/mcp/src/tools/*: runEvent closures and the `const weaveId = args['weave_slug']` / `const threadId = args['thread_ulid']` locals. The schema keys (args['weave_slug']) do NOT change — only the locals read from them.

mcp/src/tools `weaveId`/`threadId` locals (runEvent closures, `const weaveId = args['weave_slug']`, `const threadId = args['thread_ulid']`) → `*Slug`. The snake_case schema keys (`args['weave_slug']`) are unchanged — only the locals read from them. 0 residual in packages/mcp/src.

## Step 3 — Tier 1c (decision B2) — rename slug-carrying weaveId/threadId → weaveSlug/threadSlug in packages/core (derived.ts stale+roadmap shapes, entities/thread.ts Thread.weaveId, linkIndex, idUtils param + comments) and packages/fs (repository slug fields), plus sweep tests/. Excludes only the documented non-goals: WorkflowEvent.planId and the frontmatter `id` field. Thread.id (entity identity slug, bare `id`) is left as-is.

Decision B2 — packages/core + packages/fs. Renamed `Thread.weaveId` (entities/thread.ts:43 — the poster-child slug-named-`weaveId`), the `derived.ts` stale + roadmap + diagnostics shapes, `linkIndex.threadId`, and the `idUtils.generateChatId(weaveId)` param + comments; plus fs repository slug fields. Left as-is: `WorkflowEvent.planId`, frontmatter `id`, and bare entity `Thread.id` (canonical identity slug, not an ambiguous `*Id`). This was the atomic root: once core changed, the compiler drove the rename through app/mcp/cli/vscode/tests.

## Step 4 — Rename the loom://state?weaveId= input query param to ?weaveSlug= and sweep its in-repo callers (mcp tests, extension). No back-compat alias — clean rename per the clean-code contract.

`loom://state?weaveId=` → `?weaveSlug=` (resources/state.ts + all in-repo callers, no back-compat alias). Verified green: the MCP integration test exercises `loom://state?weaveSlug=tw` and passes.

## Step 5 — Rename the loom://diagnostics output shape { weaveId, threadId } → { weaveSlug, threadSlug } (interface fields + the two assignment sites weaveId: weave.id / threadId: thread.id) and sweep any diagnostics-output reader.

`loom://diagnostics` output shape `{ weaveId, threadId }` → `{ weaveSlug, threadSlug }` (interface + assignment sites), plus every reader. Diagnostics req-coverage integration test passes.

## Step 6 — Rename the loom_get_stale_plans output fields weaveId/threadId → weaveSlug/threadSlug at their definition, then let the compiler surface every CLI reader (roadmap.ts, recordRelease.ts, backfillReleases.ts, migrate.ts) and rename them to the new keys.

`loom_get_stale_plans` output fields → `*Slug` at the (core `derived.ts`) definition; the compiler surfaced and drove every CLI reader (roadmap/recordRelease/backfillReleases/migrate). Done together with steps 1-5 because B2 makes the rename one atomic green build — the tier boundaries collapsed into a single type-consistent change. build-all ✅, test-all ✅ (23/23 MCP integration + full suite), closure grep = 0 residual across all src.

## Step 7 — Doc sync: update the live-API doc refs to the renamed surfaces — README.md:232 (`?weaveId=`→`?weaveSlug=`), mcp-reference.md:79 (state filter), CLAUDE-template-reference.md:52 (state filter), implementation-contract-reference.md:54 (runEvent signature, also fixes its mislabeled `threadId` first arg). Fold in the slug-placeholder fixes: loom-context-pipeline-reference.md:133,172 (`{weaveId}/{threadId}`→`{weaveSlug}/{threadSlug}`). Verify-only (no matches expected): packages/*/README.md, docs/*.md, LOOM_CLAUDE_MD template. Do NOT touch api-naming-reference.md / api-audit-reference.md (they cite the banned pattern deliberately) or any frozen loom/** history.

Doc sync (hand-maintained refs + README, not MCP-gated). Renamed the live-API references: `README.md` state param (`?weaveId=`→`?weaveSlug=`); `mcp-reference.md` state filter (→`?weaveSlug=&status=`, dropping a phantom `threadId=` filter that state.ts never had); `implementation-contract-reference.md` `runEvent(threadId,…)`→`runEvent(weaveSlug,…)` (also fixed the mislabeled arg — it's the weave, not a thread); `app-query-use-cases-reference.md` 14 `threadId`→`threadSlug` interface fields; `loom-context-pipeline-reference.md` two `{weaveId}/{threadId}`→`{weaveSlug}/{threadSlug}` placeholders; `plan-steps-table-and-blockedby-format-reference.md` create_plan example keys→correct MCP snake_case `weave_slug`/`thread_ulid`. Also corrected pre-existing deleted-resource staleness found en route: `CLAUDE-template-reference.md` (3 lines) and `loom-claude-own-vision.md` referenced the removed `loom://thread-context/{weaveId}/{threadId}` → updated to the live `loom://context/thread/{weaveSlug}/{threadSlug}`. Deliberately untouched: `api-naming-reference.md` + `api-audit-reference.md` (they cite `weaveId`/`threadId` as the banned anti-pattern on purpose).

## Step 8 — Final sweep + verification: build-all + test-all green, then the grep gate `rg 'weaveId|threadId' packages/{app,mcp,cli}/src` must return only the documented non-goals (expected: none in app/mcp/cli). This is the mechanical proof the initiative is closed.

Closure gate — the mechanical proof the initiative is closed. Grep gate: 0 `weaveId`/`threadId` across every src package (core/fs/app/mcp/cli/vscode) + packages/mcp/tests. build-all ✅, test-all ✅ (re-run after doc-sync: full suite + 23/23 MCP integration). The ONLY remaining occurrences repo-wide are: (a) the deliberate anti-pattern citations in api-naming/api-audit-reference, (b) frozen loom/** conversation history, and (c) stale compiled tests/vscode/out/*.js artifacts (not run by test-all; regenerate from their swept .ts sources). Naming initiative closed with no asterisk.
