---
type: done
id: pl_01KWBZFDXRVCEWPMR3C6RKJM3X-done
title: Done — Fix design_version baseline (create / promote / refine) + backfill
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: pl_01KWBZFDXRVCEWPMR3C6RKJM3X
requires_load: []
---
# Done — Fix design_version baseline (create / promote / refine) + backfill

## Step 1 — Add a parentDesignVersion(threadPath, deps) app helper mirroring lockedReqVersion: load the thread's {threadId}-design.md and return its version (undefined when no design exists). Single source of truth reused by create/promote/refine/backfill.

Added `parentDesignVersion(threadPath, threadId, deps)` to `packages/app/src/weavePlan.ts` (exported). Loads `{threadId}-design.md` and returns `{ version, id }`, or `undefined` when no design exists. Mirrors `lockedReqVersion`: read the live parent version at write time. Single source of truth — reused by create, promote, refine, and backfill.

## Step 2 — In weavePlan replace the hardcoded design_version: 1 on both the thread path and the weave-root path with the helper result. Refactor the thread path so the design is read unconditionally (today it loads only when parentId is absent) and reuse it for both parent linkage and the version. Keep a sensible fallback for weave-root plans that have no thread design.

`weavePlan` thread path now reads the design once via the helper and stamps `design_version: design?.version ?? 1` (was the constant `1`); the same read also resolves `parentId` when not supplied (removed the duplicate design load). Weave-root path keeps `1` with a comment — loose plans have no thread design and are never evaluated by `getStalePlans`. File: `packages/app/src/weavePlan.ts`.

## Step 3 — In promoteToPlan stamp design_version from the parent design's live version (via the helper) when promoting into a thread, instead of omitting the field. This closes the inverse bug where promoted plans were never flagged stale.

`promoteToPlan` now stamps `design_version` from the parent design's live version (via the helper) when promoting into a thread, plus `target_version: '0.1.0'`. Previously it omitted `design_version` entirely, so `undefined < version` was always false and promoted plans were never flagged stale (inverse bug). File: `packages/app/src/promoteToPlan.ts`.

## Step 4 — In refinePlan, derive the thread path from the plan filePath, load the parent design, and re-stamp design_version = current design version on the refined doc so refine actually clears staleness. Today refine spreads ...doc and bumps version but leaves the stale baseline untouched.

`refinePlan` re-baselines `design_version` to the current design version on refine (derives threadDir from the plan filePath → helper). Added `fs` to `RefinePlanDeps`; updated the lone app caller `packages/mcp/src/tools/refinePlan.ts` to pass `fs`. Without this, refine bumped the plan version but left the stale baseline, so the plan stayed 'stale' forever. Files: `packages/app/src/refinePlan.ts`, `packages/mcp/src/tools/refinePlan.ts`.

## Step 5 — New backfillDesignVersions app use-case + a `loom backfill-design-versions` CLI command (with --dry-run) that walks every plan, resolves its parent thread design's current version, and re-stamps design_version. Mirrors the backfill-releases / migrate-to-* pattern. One-time data repair, runnable per project (this repo + Chord Flow).

New `backfillDesignVersions` app use-case (`packages/app/src/backfillDesignVersions.ts`, exported from the barrel) — walks every `plans/*.md`, re-stamps `design_version` to the parent thread design's current version, `--dry-run` capable, idempotent; mirrors the `normalizeDates` migration. Wired `loom backfill-design-versions` CLI command (`packages/cli/src/commands/backfillDesignVersions.ts` + registration in `packages/cli/src/index.ts`). Dry-run on this repo: would re-baseline 58 plans (incl. several `— → N` cases = the promote bug).

## Step 6 — Tests: (a) create a plan under a design at vN asserts design_version === N; (b) bump design to v(N+1) flags the plan stale; (c) refine the plan re-baselines design_version to N+1 and clears staleness; (d) promote into a thread carries the live design version; (e) backfill re-stamps a plan stuck at 1 under a vN design to N, and --dry-run writes nothing.

New `tests/design-version-baseline.test.ts` (added to `scripts/test-all.sh`): create stamps live vN; design bump flags stale; refine re-baselines + clears stale; promote stamps live vN; backfill dry-run writes nothing, real run repairs 1→N, idempotent on re-run. Also fixed `tests/refine-plan.test.ts` to pass the new `fs` dep. Full suite green (build-all + test-all).
