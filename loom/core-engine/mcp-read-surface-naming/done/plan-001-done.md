---
type: done
id: pl_01KWYYXSQJ6E3F27K54B9HZ1BC-done
title: Done — Align the MCP read surface to the Slug/Ulid contract
status: done
created: 2026-07-07
version: 2
tags: []
parent_id: pl_01KWYYXSQJ6E3F27K54B9HZ1BC
requires_load: []
---
# Done — Align the MCP read surface to the Slug/Ulid contract

## Step 1 — Rename resource URI placeholders in the registry to the contract: docs/{docUlid}, context/{docUlid}, context/thread/{weaveSlug}/{threadSlug}, plan/{planUlid}, requires-load/{docUlid}. Update the RESOURCE_TEMPLATES descriptions to match.

Renamed the RESOURCE_TEMPLATES placeholders in packages/mcp/src/server.ts to docs/{docUlid}, context/{docUlid}, plan/{planUlid}, requires-load/{docUlid}, and rewrote the context-bundle description to the two-form (ULID + slug) shape. Updated the doc-comment header in resources/context.ts. The behavioural context.ts changes were folded into step 6 (the handler rewrite).

## Step 2 — Rename prompt args to strict contract across all prompts: weaveId/threadId → weaveSlug/threadSlug; planId → planUlid (ULID only — retire the filename dual-accept per naming rule 2). Update promptDef.arguments, the arg reads, and the URIs each prompt builds.

Renamed prompt args to the contract across all 6 prompts: continue-thread/weave-idea/weave-design/weave-plan weaveId→weaveSlug, threadId→threadSlug; do-next-step planId→planUlid; refine-design designId→designUlid. Updated promptDef.arguments, arg reads, built URIs, and description strings. NB: do-next-step keeps the tolerant resolveDocIdOrThrow resolver — the arg NAME is now planUlid but hard-rejection of filename stems is deferred so `loom next <stem>` doesn't break before the CLI thread lands; flag for follow-up.

## Step 3 — Fix the in-repo prompt callers the arg rename breaks — minimal lockstep only, not the full CLI rename: loom next passes planUlid to do-next-step. Audit for any other in-repo getPrompt callers and update them too.

Lockstep fix: packages/cli/src/commands/next.ts now calls getPrompt('do-next-step', { planUlid: resolved }). resolveActivePlanId already returns the plan's ULID, so no extra resolution needed. Audited the repo — this was the only in-repo getPrompt caller passing the renamed arg (the extension invokes tools/resources, not these prompts). The broad CLI arg/flag rename stays in the sibling thread cli/cli-surface-naming.

## Step 4 — Rewrite the prompt bodies' tool-call guidance to the current tool contract: use snake_case weave_slug/thread_ulid, and make the create-plan guidance use goal + a structured steps array (never a content Steps table). Fixes the doubly-stale weave-plan/weave-design/weave-idea instructions.

Rewrote the weave-idea/design/plan prompt bodies to the current tool contract: snake_case weave_slug/thread_ulid; thread_ulid is taken from the context-bundle manifest (now stamped by step 5) or minted via loom_create_thread (weave-idea new-thread path); create_plan guidance now specifies goal + a structured steps array (objects with description/files/blockedBy-ordinal/satisfies), explicitly NOT a Markdown Steps table; removed the stale 'then loom_update_doc' instruction (content is passed on create).

## Step 5 — Manifest enhancement: stamp the resolved weave_slug and thread_ulid (and anchor doc ULIDs if cheap) into the context-bundle manifest header emitted by assembleContext — extend the existing <!-- loom:context-bundle … --> comment, leave the bundle body unchanged.

Manifest enhancement (IN4): added optional weaveSlug/threadUlid to ContextBundle (packages/core/src/entities/context.ts); populated them in assembleContext (packages/app/src/context/assembleContext.ts) from the target's home weave slug (targetEntry.weaveId) and thread.manifest.id; serializeBundle (packages/app/src/context/serializeBundle.ts) now stamps `weave_slug=… thread_ulid=…` into the bundle header when present. Touched core+app (beyond the plan's listed context.ts) — the header is emitted in the app layer, not the MCP resource. Smoke-verified: the header now reads `weave_slug=core-engine thread_ulid=th_01KWYT7251D3XJXTK68MN9QG18`.

## Step 6 — Expose two explicit context-addressing forms, each strict about its own input (naming rule 2): a ULID form (context/{docUlid}, plan/{planUlid}) accepting the ULID only, and a slug form for human pointing — the existing thread form context/thread/{weaveSlug}/{threadSlug} plus a path-qualified doc form (e.g. context/{weaveSlug}/{threadSlug}/{docSlug}) — resolving slug→ULID via the existing link index (resolveId over buildLinkIndex). Fully satisfies IN5's slug-addressing intent while keeping the ULID form strict; no req amend needed.

Two explicit context forms in resources/context.ts. ULID/canonical form loom://context/{docUlid} is unchanged — it addresses a doc by its own canonical id (ULID, or a ctx doc's slug-id like loom-ctx), which is NOT a folder-slug overload, so it is already rule-2-clean; deliberately did NOT add hard non-ULID rejection because that would break legitimate ctx slug-ids. Slug form: kept the existing thread form and ADDED a path-qualified doc form loom://context/{weaveSlug}/{threadSlug}/{docSlug} via new helpers resolveThreadOrThrow + resolveThreadDocBySlug (idea/design/req keywords, else match a doc's id/slug or a plan id). Renamed internal weaveId/threadId → weaveSlug/threadSlug and updated all error strings/comments. Imported LoomState/Thread/Document from core/dist. Smoke-verified: both loom://context/thread/{weaveSlug}/{threadSlug} and loom://context/{weaveSlug}/{threadSlug}/{docSlug} resolve. build-all is green across all packages.

## Step 7 — Doc sweep in one commit (doc-sync row 3): update mcp-reference.md (§1 resources + §3 prompts), CLAUDE.md, ctx.md, and the LOOM_CLAUDE_MD template so every placeholder and prompt-arg name matches the renamed code.

Doc-sync sweep to the renamed surface. mcp-reference.md §1 (resource templates → {docUlid}/{planUlid}, context described as two forms + the manifest weave_slug/thread_ulid note) and §3 (prompts table: planUlid, weaveSlug/threadSlug, designUlid — also fixed two PRE-EXISTING inaccuracies: refine-design was listed as weaveId/threadId but actually takes designUlid, and weave-idea as weaveId/title but actually takes weaveSlug/prompt). CLAUDE.md (context/{docUlid}, active planUlid, thread slug form). loom/ctx.md via loom_patch_doc. LOOM_CLAUDE_MD template in installWorkspace.ts. Left loom://state's ?weaveId=&threadId= query filter unchanged because its handler was not renamed in this thread — the doc stays truthful to code; flagged as a small follow-up (state-filter rename). claude-md-sync unaffected (no marker/invariant touched).

## Step 8 — Regression + guard coverage, then build-all and run test-all: an MCP integration test asserting loom://context/thread/{weaveSlug}/{threadSlug} returns a bundle whose manifest carries thread_ulid=th_…, and a guard test that no RESOURCE_TEMPLATES uriTemplate and no prompt arg name contains the *Id token. Add the new test to scripts/test-all.sh.

Added tests/mcp-read-surface-naming.test.ts (registered in scripts/test-all.sh after api-contract-refactor): a GUARD asserting no RESOURCE_TEMPLATES uriTemplate and no prompt-arg name carries the *Id token, plus a REGRESSION that the slug thread form resolves and the bundle manifest header carries weave_slug + thread_ulid (checked against a live thread with a manifest). Exported RESOURCE_TEMPLATES from server.ts so the guard can import it. Updated two existing header-shape assertions (tests/context-assembler.test.ts, packages/mcp/tests/integration.test.ts) to tolerate the new optional weave_slug/thread_ulid fields rather than pin the exact old prefix. build-all + test-all all green; the MCP integration test spawns a fresh loom mcp subprocess on the new dist, so the live read surface is verified. NB: the MCP server running in the current interactive session is still pre-build — a session/MCP restart is required for live loom_* calls in THIS session to exercise the new code.
