---
type: done
id: pl_01KWKHA82YGZ6AHAHPAR7TZ79F-done
title: Done — Unambiguous naming + canonical ULID refactor
status: done
created: 2026-07-03
version: 6
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
