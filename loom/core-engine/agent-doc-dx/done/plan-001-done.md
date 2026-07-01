---
type: done
id: pl_01KT3FN2XQCSPJ58C1ZZ76PP12-done
title: "Done — resolution-dx: link-index path exposure + suggest-on-miss"
status: done
created: "2026-06-02T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KT3FN2XQCSPJ58C1ZZ76PP12
requires_load: []
---
# Done — resolution-dx: link-index path exposure + suggest-on-miss

## Step 1 — Fix loom://link-index serialization: in packages/mcp/src/resources/linkIndex.ts convert the LinkIndex Maps (byId, documents, bySlug, backlinks, children, parent, stepBlockers) to plain JSON-serializable objects/arrays before stringifying, so the resource emits the real id→path data instead of empty {}. Decide and document the serialized shape (id-keyed objects).

Fixed `loom://link-index` serialization.

**Root cause:** `handleLinkIndexResource` did `JSON.stringify(buildLinkIndex(...))`, but every field of `LinkIndex` is a `Map` (and `children` holds `Set`s). `JSON.stringify` of a Map yields `{}`, so the resource emitted all-empty objects and the id→path data never reached the client.

**Files:**
- `packages/mcp/src/resources/linkIndex.ts` — added `mapToObject` + exported `serializeLinkIndex(index)` that converts Maps to id-keyed plain objects and Sets to arrays. Handler now stringifies the serialized form. Chosen shape: id-keyed objects (`byId`, `documents`, `bySlug`, `backlinks`, `parent`, `stepBlockers` as objects; `children` as object-of-arrays).
- `packages/mcp/src/server.ts` — updated the `loom://link-index` resource description to reflect that it now carries id→path (byId, documents), relationships, backlinks, and slugs.

No internal consumer parses this resource shape (the tree view uses `loom://state`), so the shape change is safe.

## Step 2 — Add resolveDocIdOrThrow helper (in packages/fs near findDocumentById): on miss, fuzzy-match the key against the cached link-index byId/bySlug keys and throw 'not found: X — did you mean Y?'. Candidate set comes from the link index, not a fresh FS walk.

Added `resolveDocIdOrThrow` with suggest-on-miss.

**Placement decision (deviation from plan wording):** the plan said "near findDocumentById" (in `pathUtils.ts`), but `pathUtils` is imported *by* `linkRepository`, and the helper needs `buildLinkIndex` + `resolveId`. Putting it in pathUtils would create a circular import. Placed it in `packages/fs/src/repositories/linkRepository.ts` instead (same package, already depends on pathUtils + core) — clean, no cycle.

**Files:**
- `packages/fs/src/repositories/linkRepository.ts` — added `resolveDocIdOrThrow(loomRoot, key, index?)`, returning `{ id, filePath }`. On hit it uses `resolveId` (handles ULID and reference slug) + `byId`/`documents` path. On miss it throws `Document not found: 'X' — did you mean 'Y', 'Z'?`. Helpers: `levenshtein`, `stemOf`, `suggestIds`. Also exported `ResolvedDoc` interface.
- `packages/fs/src/index.ts` — exported `resolveDocIdOrThrow`, `ResolvedDoc`.

**Suggestion ranking (3 signals, best first):** (1) key equals a doc's filename stem — directly catches the filename-vs-ULID mis-call (`agent-doc-dx-plan-001` → `pl_…`); (2) key is substring of / contains a filename stem; (3) Levenshtein within ~30% of an id/slug length (typos). Top 3 returned.

**Candidate set** comes from the link index (single `buildLinkIndex` pass), not a second FS walk; an optional prebuilt `index` arg lets callers skip even that pass.

## Step 3 — Route the id-taking tools (loom_find_doc, loom_update_doc, loom_promote, loom_start_plan via resolveWeaveIdForPlan) through resolveDocIdOrThrow so every id-taking tool inherits suggest-on-miss; remove the bare 'not found' throws.

Routed the four named id-taking tools through `resolveDocIdOrThrow`, removing their bare "not found" throws.

**Files:**
- `packages/mcp/src/tools/findDoc.ts` — now returns `resolveDocIdOrThrow(root, id)` directly (same `{ id, filePath }` shape, now with suggest-on-miss + slug resolution).
- `packages/mcp/src/tools/updateDoc.ts` — resolves via helper; returns the canonical `resolvedId` instead of the raw input key.
- `packages/mcp/src/tools/promote.ts` — resolves `sourceId` via helper.
- `packages/mcp/src/tools/startPlan.ts` — replaced `resolveWeaveIdForPlan` with `resolveDocIdOrThrow` (resolves filename-stem/typo to the canonical plan id with suggestions) and derives `weaveId` from the resolved path. The `START_IMPLEMENTING_PLAN` event now receives the canonical ULID.

**Scope note:** kept to the four tools named in the step. Many other tools/resources still call `findDocumentById` directly (docs.ts, plan.ts, appendToChat, archive, doStep, listPlanSteps, appendDone, the refine_* tools, doNextStep/refineDesign prompts). Routing all of them through `resolveDocIdOrThrow` is the natural follow-up but is out of this step's scope. `resolveWeaveIdForPlan` remains in `pathUtils` for those other plan tools (unchanged).

## Step 4 — Resolve the plan-id canonical-form open question (semantic {thread}-plan-NNN vs ULID pl_) so suggestions point at the right id form.

Resolved the plan-id canonical-form question.

**Decision: canonical plan id is the ULID** (`pl_…`, generated by `generateDocId('plan')` and stored in frontmatter `id`). The `{thread}-plan-NNN` form is only the *filename*; reducers, `runEvent` events, and `plan.id` matching all key off the ULID. So the ULID is canonical and the filename stem is a convenience alias resolved by `resolveDocIdOrThrow` (step 2).

**Root cause of the original mis-call:** six tool/prompt descriptions advertised the *filename* form as the example id (`Plan ID (e.g. "my-weave-plan-001")`), training agents to pass the wrong thing. Fixed all six:
- `tools/startPlan.ts`, `tools/completeStep.ts`, `tools/appendDone.ts`, `tools/doStep.ts`, `tools/listPlanSteps.ts`, `prompts/doNextStep.ts`

New description: `Plan id. Canonical form is the ULID (e.g. "pl_01J…"); the filename stem (e.g. "my-weave-plan-001") is also accepted and resolved.` This corrects the guidance (canonical = ULID) while documenting that the stem still works via suggest-on-miss.

## Step 5 — Tests: link-index resource returns a populated id→path map; a wrong-but-close id returns a 'did you mean' suggestion across find_doc/update_doc/start_plan.

Added `tests/resolution-dx.test.ts` (registered in `scripts/test-all.sh`). Real-filesystem test, ts-node + custom `assert`, matching existing conventions.

Seeds a temp loom root with a plan (canonical ULID id, filename stem `demo-plan-001`) and a reference (slug). Assertions:
1. `handleLinkIndexResource` returns a populated id→path map — `byId[ULID] === planPath` and `documents[ULID].path === planPath` (was `{}` before the step-1 fix).
2. `resolveDocIdOrThrow` resolves a canonical ULID to its path.
3. `resolveDocIdOrThrow` resolves a reference slug to its id.
4. A filename stem (`demo-plan-001`, not the canonical id) misses and the error names the ULID (`did you mean 'pl_…'`).
5. The suggestion surfaces through all three routed tool handlers: `find_doc`, `update_doc`, `start_plan`.

Build clean (`build-all.sh`), test passes (all 5 checks green).
