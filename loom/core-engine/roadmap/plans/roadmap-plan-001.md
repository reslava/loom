---
type: plan
id: pl_01KV3GY83XJXDAGJ87HK64MRXS
title: Derived Roadmap — Core Read-Model + CLI
status: done
created: "2026-06-14T00:00:00.000Z"
updated: 2026-06-14
version: 2
design_version: 1
tags: []
parent_id: de_01KV3GPTMNXT66C4N73WAFN7ZW
requires_load: []
target_version: 0.1.0
steps:
  - id: thread-doc-type-ripple
    order: 1
    status: done
    description: "Add the `thread` doc type: ThreadDoc entity, th_ prefix, frontmatter key order. Keep it OUT of the Document union so a manifest never counts as a deliverable."
    files_touched: [packages/core/src/entities/base.ts, packages/core/src/entities/thread.ts, packages/core/src/idUtils.ts, packages/core/src/frontmatterUtils.ts]
    blocked_by: []
    satisfies: [IN1, C4]
  - id: load-thread-md-index-th-ids
    order: 2
    status: done
    description: Load thread.md into Thread.manifest (flat filename, like req.md) and make the link index resolve th_ ULIDs to threads for cross-weave depends_on.
    files_touched: [packages/fs/src/repositories/threadRepository.ts, packages/core/src/linkIndex.ts]
    blocked_by: [step-1]
    satisfies: [IN2, C2]
  - id: buildroadmap-state-unit-tests
    order: 3
    status: done
    description: "Pure buildRoadmap(state) in core/derived.ts: RoadmapNode/RoadmapView types, dependency-blocked overlay, topo+priority order, done-plan history, cycle/dangling diagnostics. Reads never mutate."
    files_touched: [packages/core/src/derived.ts, packages/core/src/index.ts, tests/roadmap.test.ts]
    blocked_by: [step-2]
    satisfies: [IN3, C1, C3, C5]
  - id: loom-roadmap-resource-diagnostics
    order: 4
    status: done
    description: "Add the loom://roadmap MCP resource (getState → buildRoadmap → JSON) and fold cycle/dangling findings into loom://diagnostics and the validate-state prompt."
    files_touched: [packages/mcp/src/resources/roadmap.ts, packages/mcp/src/server.ts, packages/mcp/src/resources/diagnostics.ts, packages/mcp/src/prompts/validateState.ts]
    blocked_by: [step-3]
    satisfies: [IN4]
  - id: thread-write-tools-validated
    order: 5
    status: done
    description: Add loom_create_thread, loom_set_priority, loom_set_thread_deps — frontmatter writes on thread.md with write-time cycle/existence validation.
    files_touched: [packages/mcp/src/tools/createThread.ts, packages/mcp/src/tools/setPriority.ts, packages/mcp/src/tools/setThreadDeps.ts, packages/mcp/src/server.ts, packages/mcp/src/catalog.ts]
    blocked_by: [step-2]
    satisfies: [IN5]
  - id: loom-migrate-backfill
    order: 6
    status: done
    description: Add the `loom migrate` CLI command running registered migrations; first migration backfills thread.md for every thread lacking one. Idempotent, --dry-run, shipped downstream.
    files_touched: [packages/cli/src/commands/migrate.ts, packages/cli/src/index.ts]
    blocked_by: [step-1]
    satisfies: [IN6, C1]
  - id: loom-roadmap-cli
    order: 7
    status: done
    description: "Add the `loom roadmap` CLI: a thin ASCII renderer over loom://roadmap — future (dep+priority order, blocked-on annotated) / present / history (newest-first, --group-by-thread)."
    files_touched: [packages/cli/src/commands/roadmap.ts, packages/cli/src/index.ts]
    blocked_by: [step-4]
    satisfies: [IN7]
---
# Derived Roadmap — Core Read-Model + CLI

## Goal

Build the derived roadmap read-model and its headless surfaces. Introduce the `thread.md` doc type (authored: `th_` ULID + title + soft `priority` + `depends_on`) following the `req.md` precedent, load it onto `Thread.manifest`, then compute everything else — status overlay, dependency-blocked signal, topological+priority ordering, done-plan history, and cycle/dangling diagnostics — in one pure `buildRoadmap(state)` function in core. Expose it via a `loom://roadmap` MCP resource, validated write tools, a `loom migrate` backfill command (idempotent, `--dry-run`, shipped downstream), and a `loom roadmap` CLI. Reads never mutate; missing manifests surface as diagnostics. This phase is fully headless-testable and delivers the cross-weave view (headline: blocked-on across weaves) in this repo before any UI exists.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add the `thread` doc type: ThreadDoc entity, th_ prefix, frontmatter key order. Keep it OUT of the Document union so a manifest never counts as a deliverable. | packages/core/src/entities/base.ts, packages/core/src/entities/thread.ts, packages/core/src/idUtils.ts, packages/core/src/frontmatterUtils.ts | — | IN1, C4 |
| ✅ | 2 | Load thread.md into Thread.manifest (flat filename, like req.md) and make the link index resolve th_ ULIDs to threads for cross-weave depends_on. | packages/fs/src/repositories/threadRepository.ts, packages/core/src/linkIndex.ts | step-1 | IN2, C2 |
| ✅ | 3 | Pure buildRoadmap(state) in core/derived.ts: RoadmapNode/RoadmapView types, dependency-blocked overlay, topo+priority order, done-plan history, cycle/dangling diagnostics. Reads never mutate. | packages/core/src/derived.ts, packages/core/src/index.ts, tests/roadmap.test.ts | step-2 | IN3, C1, C3, C5 |
| ✅ | 4 | Add the loom://roadmap MCP resource (getState → buildRoadmap → JSON) and fold cycle/dangling findings into loom://diagnostics and the validate-state prompt. | packages/mcp/src/resources/roadmap.ts, packages/mcp/src/server.ts, packages/mcp/src/resources/diagnostics.ts, packages/mcp/src/prompts/validateState.ts | step-3 | IN4 |
| ✅ | 5 | Add loom_create_thread, loom_set_priority, loom_set_thread_deps — frontmatter writes on thread.md with write-time cycle/existence validation. | packages/mcp/src/tools/createThread.ts, packages/mcp/src/tools/setPriority.ts, packages/mcp/src/tools/setThreadDeps.ts, packages/mcp/src/server.ts, packages/mcp/src/catalog.ts | step-2 | IN5 |
| ✅ | 6 | Add the `loom migrate` CLI command running registered migrations; first migration backfills thread.md for every thread lacking one. Idempotent, --dry-run, shipped downstream. | packages/cli/src/commands/migrate.ts, packages/cli/src/index.ts | step-1 | IN6, C1 |
| ✅ | 7 | Add the `loom roadmap` CLI: a thin ASCII renderer over loom://roadmap — future (dep+priority order, blocked-on annotated) / present / history (newest-first, --group-by-thread). | packages/cli/src/commands/roadmap.ts, packages/cli/src/index.ts | step-4 | IN7 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:thread-doc-type-ripple -->
### Step 1 — thread doc type + ripple

Add `'thread'` to `DocumentType` in base.ts. Define `ThreadDoc extends BaseDoc` with `priority: number` and `depends_on: string[]`, and add `manifest?: ThreadDoc` to the `Thread` interface. Add `TYPE_PREFIX.thread = 'th_'` in idUtils. Add `priority`/`depends_on` to the canonical key order in frontmatterUtils. Add ThreadDoc to the `Document` union in document.ts, mirroring `req` (option B, 2026-06-14): it loads onto `Thread.manifest` AND into `allDocs`, kept out of the done-rollup by adding `'thread'` to `isDeliverable`'s exclusion list in derived.ts. `thread.md` is a visible, backlink-indexed doc like `req.md`.

<!-- step:load-thread-md-index-th-ids -->
### Step 2 — load thread.md + index th_ ids

In loadThread, load `thread.md` (flat, no `${threadId}-` prefix) into the returned thread's `manifest` field, mirroring the existing req.md block. Add a `thread` case to `docPathInThread` returning `path.join(threadPath, 'thread.md')`, and include the manifest in saveThread. Extend the link index to map `th_` ULIDs → {weaveId, threadId} so `depends_on` targets resolve cross-weave.

<!-- step:buildroadmap-state-unit-tests -->
### Step 3 — buildRoadmap(state) + unit tests

Add RoadmapNode (threadId/ulid/weaveId/title/status/dependsOn/blockedOn/priority) and RoadmapView (future/present/history/diagnostics). Start status from the existing getThreadStatus(thread), then overlay dependency-blocked: a non-done thread whose any depends_on target is not done becomes `blocked`, blockedOn naming which (merged status, blockedOn as discriminator — getThreadStatus unchanged). Order via Kahn topo sort over depends_on; ties broken by priority then created then slug (deterministic). History = completed plans newest-first keyed on the plan's done-doc `created`, carrying weaveId/threadId for group-by-thread. Detect cycles → diagnostic + drop cyclic edges so the rest renders; dangling/archived target → diagnostic (archived-as-done satisfies). Export from index.ts. Unit-test each branch headless.

<!-- step:loom-roadmap-resource-diagnostics -->
### Step 4 — loom://roadmap resource + diagnostics

New resource handler mirroring resources/state.ts: getState then buildRoadmap, return RoadmapView JSON; register in server.ts and reuse the unfiltered-state cache path. Add the roadmap diagnostics (cycles, dangling deps, threads missing thread.md → 'run loom migrate') into handleDiagnosticsResource and surface them in the validate-state prompt alongside broken-parent/req-coverage issues.

<!-- step:thread-write-tools-validated -->
### Step 5 — thread write tools (validated)

loom_create_thread(weaveId, threadId, title?) scaffolds thread.md with a fresh th_ ULID (enables empty threads). loom_set_priority(threadUlid, priority) is the drag-reorder write. loom_set_thread_deps(threadUlid, dependsOn[]) REFUSES a write that creates a cycle or targets a non-existent thread (write-time validation primary; read-time diagnostics backstop rotted edges). Register all three in server.ts and add them to the catalog. Also wire the auto-scaffold seam: the first loom_create_* into a brand-new threadId creates thread.md if absent.

<!-- step:loom-migrate-backfill -->
### Step 6 — loom migrate (backfill)

Register a `migrate` command in cli/index.ts. A thin migration registry runs registered migrations; v1 registers `backfill-thread-manifests`, which creates thread.md (fresh th_ ULID, title from idea title or folder slug, default priority, depends_on: []) for every thread folder missing one. Idempotent (skip threads that already have a manifest) and `--dry-run` (print, touch nothing) — mirrors scripts/migrate-to-threads.ts but ships in the loom binary for downstream installs.

<!-- step:loom-roadmap-cli -->
### Step 7 — loom roadmap CLI

Register a `roadmap` command that reads loom://roadmap and prints the three-band ASCII view: future (pending/blocked in dependency-then-priority order, each blocked node annotated `blocked on → <thread>`), present (active/implementing), history (shipped plans newest-first, `--group-by-thread` optional). This is the Plan-1 acceptance surface — scriptable and headless.
