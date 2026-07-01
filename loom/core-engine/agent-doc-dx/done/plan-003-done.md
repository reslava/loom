---
type: done
id: pl_01KT3KTH7F383XWGT0128QCD1G-done
title: "Done — resolution-dx-rollout: route remaining findDocumentById callers"
status: done
created: "2026-06-02T00:00:00.000Z"
version: 5
tags: []
parent_id: pl_01KT3KTH7F383XWGT0128QCD1G
requires_load: []
---
# Done — resolution-dx-rollout: route remaining findDocumentById callers

## Step 1 — Route read-resource entry points (primary id only)

Routed the primary id of the three read resources through `resolveDocIdOrThrow`:
- `loom://docs/{id}` (`resources/docs.ts`)
- `loom://plan/{id}` (`resources/plan.ts`)
- `loom://requires-load/{id}` top-level entry (`resources/requiresLoad.ts` line 43)

**Left** the internal `fetchRefs` `requires_load` graph-walk (`requiresLoad.ts` line 20) on `findDocumentById` — a miss there is a dangling reference, not a user typo, so it should be skipped, not thrown as a suggestion. Each routed handler now returns `did you mean 'pl_…'` instead of a bare "not found".

## Step 2 — Route prompt entry points

Routed both prompt entry points through `resolveDocIdOrThrow`:
- `refine-design` prompt — `designId` (`prompts/refineDesign.ts`)
- `do-next-step` prompt — `planId` (`prompts/doNextStep.ts`)

Both previously did `findDocumentById` + bare-null throw; now they surface the suggestion. Neither prompt has a secondary/internal lookup to leave behind.

## Step 3 — Route tool entry points (primary id only)

Routed the primary id of all 8 tools through `resolveDocIdOrThrow`:
- `appendDone` (planId), `archive` (id), `appendToChat` (id), `listPlanSteps` (planId), `refineIdea` (id) — sole lookup, fully switched.
- `doStep` (planId), `refineDesign` (id), `refinePlan` (id) — primary id routed; **left** their secondary `context_ids`/contextIds enrichment lookups on `findDocumentById` (best-effort context, not the agent's target id), so those files import both resolvers.

These previously returned bare "Plan/Chat/Document not found"; they now suggest the canonical id on a close miss.

## Step 4 — Assess generate.ts lookups + injected-dep case

**generate.ts:** routed the two primary ids — `loom_generate_chat_reply` (chatId, ~line 280) and `loom_generate_reference` (id, ~line 227, which on assessment IS the agent-supplied required id, not internal). **Left** `loadExtraContext`'s `context_ids` enrichment (~line 20) on `findDocumentById`.

**Injected-dep case — decision: pre-resolve at the MCP delivery boundary** (not by widening the app-layer `FinalizeDeps`/`RenameDeps` contract, and not by injecting a signature-mismatched wrapper).
- `finalizeDoc.ts`: `resolveDocIdOrThrow(root, id)` → pass the canonical id as `tempId` into `finalize`. The use-case keeps its injected `findDocumentById` for path resolution.
- `rename.ts`: `resolveDocIdOrThrow(root, oldId)` → pass the canonical id into `rename`.

**Why this is the correct path, not just the short one:**
- Gives suggest-on-miss without changing the app contract (resolution belongs at the delivery layer; the use-case stays as-is).
- **Fixes a latent `rename` bug:** `updateAllReferences` matches `parent_id`/`blockedBy` against `oldId`. If a caller passed a filename-stem instead of the canonical id, `findDocumentById` would still locate the file but reference-matching would find zero hits and silently update nothing. Pre-resolving to the canonical id makes reference updates correct.
- Cost: one extra link-index build (resolve + the use-case's own `findDocumentById`) on two infrequent ops (rename/finalize) — acceptable.

Verified by grep: every remaining `findDocumentById` call site is now an intended internal/secondary lookup (requiresLoad graph-walk, contextIds/context_ids enrichment, the two injected deps).

## Step 5 — Tests + build

Extended `tests/resolution-dx.test.ts` with a rollout section (test 6) asserting suggest-on-miss now surfaces through a routed read-resource and a routed tool that previously returned bare "not found":
- `handlePlanResource('loom://plan/demo-plan-001')` → `did you mean 'pl_…'`
- `handleDocsResource('loom://docs/demo-plan-001')` → `did you mean 'pl_…'`
- `archiveHandle({ id: 'demo-plan-001' })` → `did you mean 'pl_…'`

`build-all.sh` clean; `test-all.sh` fully green including all 9 MCP integration tests. Ran `resolution-dx.test.ts` (6/6 checks incl. the new rollout section) and `plan-table-utils.test.ts` directly — both pass.
