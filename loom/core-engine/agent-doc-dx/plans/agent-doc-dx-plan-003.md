---
type: plan
id: pl_01KT3KTH7F383XWGT0128QCD1G
title: "resolution-dx-rollout: route remaining findDocumentById callers"
status: done
created: "2026-06-02T00:00:00.000Z"
updated: 2026-06-02
version: 1
design_version: 1
tags: []
parent_id: de_01KT3FG3M865N54WBT3Z95T20Y
requires_load: []
target_version: 0.1.0
---
# resolution-dx-rollout: route remaining findDocumentById callers

## Goal

Extend suggest-on-miss coverage from the four tools done in `resolution-dx` to the
remaining agent-facing `findDocumentById` call sites, so every entry point where the
agent supplies a doc id returns a `did you mean 'pl_…'` suggestion on a miss instead of
a bare "not found".

## Scope — primary vs internal lookups

Route only the **agent-supplied (primary) id** at each entry point through
`resolveDocIdOrThrow`. **Leave internal graph-traversal lookups** (resolving `child_ids`
or `requires_load` targets while walking the doc graph) on `findDocumentById`: a miss
there is a *dangling link*, not a user typo, and should be reported or skipped — not
thrown as a "did you mean" suggestion. This boundary is the core design decision of the
rollout and each step calls out which lookups are primary vs internal.

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Route read-resource entry points (primary id only) | packages/mcp/src/resources/docs.ts, packages/mcp/src/resources/plan.ts, packages/mcp/src/resources/requiresLoad.ts | — |
| ✅ | 2 | Route prompt entry points | packages/mcp/src/prompts/refineDesign.ts, packages/mcp/src/prompts/doNextStep.ts | — |
| ✅ | 3 | Route tool entry points (primary id only) | packages/mcp/src/tools/appendDone.ts, packages/mcp/src/tools/archive.ts, packages/mcp/src/tools/appendToChat.ts, packages/mcp/src/tools/doStep.ts, packages/mcp/src/tools/listPlanSteps.ts, packages/mcp/src/tools/refineDesign.ts, packages/mcp/src/tools/refineIdea.ts, packages/mcp/src/tools/refinePlan.ts | — |
| ✅ | 4 | Assess generate.ts lookups + injected-dep case | packages/mcp/src/tools/generate.ts, packages/mcp/src/tools/finalizeDoc.ts, packages/mcp/src/tools/rename.ts | — |
| ✅ | 5 | Tests + build | tests/resolution-dx.test.ts, scripts/test-all.sh | — |
## Per-step detail

### Step 1 — read resources
Route the primary id of `loom://docs/{id}` (docs.ts), `loom://plan/{id}` (plan.ts), and
`loom://requires-load/{id}` top-level entry (requiresLoad.ts ~line 43) through
`resolveDocIdOrThrow`. **Leave** the internal `requires_load` child-resolution lookup
(requiresLoad.ts ~line 20) on `findDocumentById` — that walks the graph and a miss is a
dangling reference.

### Step 2 — prompts
Route `refine-design` (prompts/refineDesign.ts `designId`) and `do-next-step`
(prompts/doNextStep.ts `planId`).

### Step 3 — tools
Route the primary id arg of: `appendDone` (planId), `archive` (id), `appendToChat` (id),
`doStep` (planId, ~line 32), `listPlanSteps` (planId), and `refineDesign` /
`refineIdea` / `refinePlan` (id). **Leave** the secondary child/requires_load lookups
(`doStep` ~line 74, `refineDesign` ~line 34, `refinePlan` ~line 34) on `findDocumentById`.

### Step 4 — generate.ts and injected-dep case
Route the primary source/chat id in generate.ts (the chatId at ~line 280); assess lines
20/227 (likely internal — leave if so). Then the injected-dep case: `finalizeDoc` and
`rename` pass `findDocumentById` *into* the `finalize` / `rename` app use-cases rather
than calling it for resolution. Decide cleanly — either inject a resolver-backed variant
so a bad `oldId`/`tempId` suggests, or document why they stay as-is (`finalize` takes a
`new-` draft tempId; `rename` an `oldId`) — and apply that decision.

### Step 5 — tests + build
Extend a test to assert suggest-on-miss surfaces through a representative routed resource
(docs or plan) and a routed tool (archive or appendToChat). Run `build-all.sh` and
`test-all.sh` — must stay green.

## Notes
- `resolveDocIdOrThrow` already exists (from `resolution-dx`, in
  `packages/fs/src/repositories/linkRepository.ts`) and resolves ULID **and** reference
  slug, with filename-stem / Levenshtein suggestions. This rollout only changes call
  sites; no resolver changes expected.
- Watch for double FS walks: each routed call builds the link index. Where a handler
  already has an index in hand, pass it via the optional `index` arg to
  `resolveDocIdOrThrow`.