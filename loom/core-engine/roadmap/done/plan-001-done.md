---
type: done
id: pl_01KV3GY83XJXDAGJ87HK64MRXS-done
title: Done — Derived Roadmap — Core Read-Model + CLI
status: done
created: "2026-06-14T00:00:00.000Z"
version: 7
tags: []
parent_id: pl_01KV3GY83XJXDAGJ87HK64MRXS
requires_load: []
---
# Done — Derived Roadmap — Core Read-Model + CLI

## Step 1 — Add the `thread` doc type: ThreadDoc entity, th_ prefix, frontmatter key order. Keep it OUT of the Document union so a manifest never counts as a deliverable.

Added the `thread` doc type (option B — mirrors `req`, in the `Document` union).
- `core/entities/base.ts`: `'thread'` added to `DocumentType`.
- `core/entities/thread.ts`: new `ThreadDoc extends BaseDoc<ThreadDocStatus>` (`priority: number`, `depends_on: string[]`, status placeholder `'active'`); `Thread` gains `manifest?: ThreadDoc`.
- `core/entities/document.ts`: `ThreadDoc` added to the `Document` union + `DocumentStatus`.
- `core/idUtils.ts`: `TYPE_PREFIX.thread = 'th_'`.
- `core/frontmatterUtils.ts`: `priority`/`depends_on` added to canonical key order (thread-manifest group).
- `core/derived.ts`: `isDeliverable` now excludes `'thread'` so a manifest never counts toward DONE rollup.
Build green.

## Step 2 — Load thread.md into Thread.manifest (flat filename, like req.md) and make the link index resolve th_ ULIDs to threads for cross-weave depends_on.

Loaded `thread.md` onto `Thread.manifest`.
- `fs/threadRepository.ts`: `loadThread` reads the flat `thread.md` (like `req.md`) into `manifest`, includes it in `allDocs`, and returns it; `docPathInThread` gained a `'thread'` case → `thread.md`. `saveThread` persists it via `allDocs`.
- Cross-weave `th_` resolution comes for free: `buildLinkIndex` already loads every `.md` (now including `thread.md`) into `index.documents`/`byId` with its `threadId`, so a `th_` ULID resolves to its thread with no link-index change needed (`extractThreadId` correctly treats `thread.md` as a thread-scoped file).
Build green.

## Step 3 — Pure buildRoadmap(state) in core/derived.ts: RoadmapNode/RoadmapView types, dependency-blocked overlay, topo+priority order, done-plan history, cycle/dangling diagnostics. Reads never mutate.

Implemented the pure `buildRoadmap(state)` read-model in `core/derived.ts` + exported from `core/index.ts`.
- Types: `RoadmapNode` (threadId/ulid/weaveId/title/status/dependsOn/blockedOn/priority/created), `ShippedPlan`, `RoadmapDiagnostic` (cycle/dangling_dep/missing_manifest), `RoadmapView` (future/present/history/diagnostics), `DEFAULT_ROADMAP_PRIORITY`.
- `baseRoadmapStatus` distinguishes `pending` (not started) from `active` (design/plan exists) — finer than `getThreadStatus`, which is left unchanged. Dependency-blocked is overlaid at roadmap level (a non-done thread with any unsatisfied dep → `blocked`, `blockedOn` names which).
- Ordering: Kahn topo sort over `depends_on`, ties broken by priority → created → threadId (deterministic). Cycles → diagnostic + appended so the rest renders.
- History: completed plans newest-first, keyed on the plan's done-doc `created` (fallback plan.updated/created), carrying weave/thread for group-by-thread.
- Archived threads count as satisfied dep targets; missing manifest → diagnostic, never a write (reads pure).
- Tests: new `tests/roadmap.test.ts` — 8 pure cases (priority order, blocked-on+topo, satisfied dep+history dating, cycle, dangling, missing manifest, history newest-first, determinism). All green.

## Step 4 — Add the loom://roadmap MCP resource (getState → buildRoadmap → JSON) and fold cycle/dangling findings into loom://diagnostics and the validate-state prompt.

Exposed the read-model and folded its diagnostics in.
- `mcp/resources/roadmap.ts`: new `loom://roadmap` handler — `getState` (reusing the unfiltered state cache) → `buildRoadmap` → `RoadmapView` JSON. Registered in `server.ts` (CONCRETE_RESOURCES + ReadResource branch).
- `mcp/resources/diagnostics.ts`: `loom://diagnostics` now includes `roadmap: buildRoadmap(state).diagnostics` (cycles, dangling deps, missing thread.md).
- `mcp/prompts/validateState.ts`: prompt text now calls out roadmap issues (cycles, dangling thread deps, missing thread.md → `loom migrate`).
Build green.

## Step 5 — Add loom_create_thread, loom_set_priority, loom_set_thread_deps — frontmatter writes on thread.md with write-time cycle/existence validation.

Validated thread write tools + auto-scaffold seam.
- `app/thread.ts`: `createThread` (fresh `th_` ULID, default priority 1000), `ensureThreadManifest` (idempotent scaffold), `setThreadPriority` (drag-reorder write), `setThreadDeps` (REFUSES cycle via white/grey/black DFS, unknown target, or self-dep — write-time validation). `scanManifests` walks live+archived `thread.md`.
- MCP tools `mcp/tools/createThread.ts` / `setPriority.ts` / `setThreadDeps.ts`, registered in `server.ts` under a new `thread` group (catalog auto-includes unknown groups).
- Auto-scaffold seam wired into the thread-establishing create use-cases: `weaveIdea` (threaded), `weaveDesign` (threaded), `weavePlan` (threaded; passes a `loomRoot` shim), `createReq`. So the first idea/design/plan/req into a new thread materialises its `thread.md`. (Chats/refs into a truly-empty new thread are covered by `loom_create_thread` + `loom migrate`.)
Build green.

## Step 6 — Add the `loom migrate` CLI command running registered migrations; first migration backfills thread.md for every thread lacking one. Idempotent, --dry-run, shipped downstream.

`loom migrate` backfill shipped.
- `app/migrateThreads.ts`: `backfillThreadManifests({dryRun})` walks every `loom/{weave}/{thread}/` (reserved subdirs filtered), creates `thread.md` (title from the thread idea, else folder slug) for any thread lacking one. Idempotent (skips present manifests) + `--dry-run` (reports, writes nothing). Returns `{created, skipped, dryRun}`.
- `cli/commands/migrate.ts` + `cli/index.ts`: `loom migrate [--dry-run]`, shipped in the bundled binary for downstream installs.
Verified live: `loom migrate --dry-run` reports 87 manifest-less threads in this repo (not written).

## Step 7 — Add the `loom roadmap` CLI: a thin ASCII renderer over loom://roadmap — future (dep+priority order, blocked-on annotated) / present / history (newest-first, --group-by-thread).

`loom roadmap` CLI shipped.
- `cli/commands/roadmap.ts` + `cli/index.ts`: `loom roadmap [--group-by-thread]` — a thin ASCII renderer over `loom://roadmap` (via the in-process MCP client). Three bands: FUTURE (pending/blocked, dependency+priority order, each blocked node annotated `⛔ blocked on → <thread>`), PRESENT (active/implementing), HISTORY (shipped plans newest-first, dates trimmed to YYYY-MM-DD, `--group-by-thread` optional), plus a roadmap-diagnostics footer.
- Verified live against this repo: future/present/history bands all populate; cross-weave shipped-history renders newest-first (the previously-missing view). Tests: full `./scripts/test-all.sh` green (roadmap.test.ts now wired into the suite); `./scripts/build-all.sh` clean across all packages.
