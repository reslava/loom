---
type: design
id: de_01KV3GPTMNXT66C4N73WAFN7ZW
title: Derived Roadmap
status: active
created: "2026-06-14T00:00:00.000Z"
updated: 2026-06-14
version: 4
tags: []
parent_id: id_01KV3GC10MFGWMKQ84JEGYQEQW
requires_load: []
---
# Derived Roadmap

## Vision check

Serves "both User and AI always know weaves/threads state" by computing the cross-weave project view that today is hand-maintained. Removes the manual roadmap-in-a-markdown-doc anti-pattern. The only authored input is `priority` + `depends_on` per thread; everything else is derived.

## Architecture at a glance

Pure read-model in `core`, exposed through the existing layered seams — nothing imports upward.

```
thread.md (authored: id + title + priority + depends_on)
        │
        ▼
core/derived.ts  buildRoadmap(state) → RoadmapView      ← pure, no IO, unit-tested
        │
        ├─► app/getState  (loads thread.md into Thread; runs buildRoadmap)
        │
        ├─► mcp  loom://roadmap resource  +  loom://diagnostics (cycle/dangling)
        │        write tools: loom_create_thread / loom_set_priority / loom_set_thread_deps
        │
        └─► cli  `loom roadmap`  +  `loom migrate`
                 vscode  Roadmap panel + toggle + drag-reorder   (Plan-2)
```

The whole computation is one pure function over `LoomState`. The hard logic (topo sort, status overlay, history, cycle detection) lives where it is fully testable headless; every delivery surface is a thin renderer over its output.

## 1. The `thread.md` doc type

A new flat per-thread doc, following the **`req.md` precedent exactly** (flat filename, no `${threadId}-` prefix, loaded in `loadThread`, a `BaseDoc` with no reducer):

```yaml
---
type: thread
id: th_01K…          # ULID, prefix th_ (new entry in idUtils TYPE_PREFIX)
title: "Roadmap"
priority: 100         # soft order; lower = earlier among dependency-free slack
depends_on: []        # th_ ULIDs; hard edges, cross-weave
created: 2026-06-14
version: 1
tags: []
parent_id: null
requires_load: []
---
```

- **Identity anchor.** Today `Thread.id` is the folder slug; `thread.md.id` is a stable `th_` ULID. The slug stays the human/path handle; the ULID is the **ref target** for `depends_on`, so renames/moves/cross-weave references resolve through the link index instead of breaking on a path.
- **Authored-only.** Holds `priority` + `depends_on` and nothing derived. **No `status` field** — storing it would recreate the hand-maintained-state anti-pattern this feature exists to kill.
- **No staleness.** Unlike plan/ctx it has no parent to go stale against; excluded from stale-detection.
- **Entity wiring.** `Thread` gains an optional `manifest?: ThreadDoc` (loaded like `req`); `RoadmapNode` reads `manifest?.priority` / `manifest?.depends_on`, defaulting priority to a high number and deps to `[]` when (transiently, pre-migration) absent.

### Doc-type ripple (checklist for Plan-1)
- `core/entities/base.ts` — add `'thread'` to `DocumentType`.
- `core/entities/thread.ts` — new `ThreadDoc extends BaseDoc` (`priority: number`, `depends_on: string[]`); add `manifest?` to `Thread`.
- `core/entities/document.ts` — **add `ThreadDoc` to the `Document` union, mirroring `req` exactly** (decision 2026-06-14, option B). It loads onto `Thread.manifest` **and** into `allDocs`, and is kept out of the done-rollup by adding `'thread'` to `isDeliverable`'s exclusion list in derived.ts — the same mechanism `req` uses. `thread.md` is therefore a visible, backlink-indexed doc like `req.md`, not a hidden sidecar. Exhaustive `switch (doc.type)` sites gain a `'thread'` case (or rely on their default).
- `core/idUtils.ts` — `TYPE_PREFIX.thread = 'th_'`.
- `core/frontmatterUtils.ts` — `priority` / `depends_on` in canonical key order for thread docs.
- `fs/threadRepository.ts` — load `thread.md` → `thread.manifest`; add `thread` case to `docPathInThread` (flat `thread.md`); save it.
- MCP gate (`loom-mcp-gate.ps1`) already covers `loom/**/*.md`, so writes route through tools automatically.

## 2. `buildRoadmap(state)` — the derivation

A single pure function in `core/derived.ts` returning a `RoadmapView`:

```ts
interface RoadmapNode {
  threadId: string;          // folder slug
  ulid: string;              // th_ id
  weaveId: string;
  title: string;
  status: RoadmapStatus;     // done | implementing | active | pending | blocked
  dependsOn: string[];       // resolved th_ ulids
  blockedOn: string[];       // subset of dependsOn that is not done  ← the headline
  priority: number;
}
interface RoadmapView {
  future: RoadmapNode[];     // pending/blocked, topo+priority order
  present: RoadmapNode[];    // active/implementing
  history: ShippedPlan[];    // done plans, newest first
  diagnostics: RoadmapDiagnostic[]; // cycles, dangling deps
}
```

- **Status overlay.** Start from the existing `getThreadStatus(thread)` (intra-thread: implementing / active / done / blocked-by-own-plan). Then overlay **dependency-blocked**: a non-done thread with any `depends_on` target not `done` becomes `blocked`, with `blockedOn` naming which. This overlay *must* live in `buildRoadmap`, not in `getThreadStatus` — the latter takes one `Thread` and can't see other threads' status. `getThreadStatus` stays unchanged; the cross-thread judgment is roadmap-level. **This is the headline signal** — the one fact a human can't compute by hand.
- **Order.** Topological sort (Kahn) over `depends_on`; among the ready set, sort by `priority` then a stable secondary (`created`, then slug) so the view is deterministic even when no priority is set.
- **History.** Keyed on **completed plans**, not threads. A plan reaching `status: done` is a shipping event; its date comes from the plan's done record. Newest-first, with `weaveId`/`threadId` so the renderer can group by thread.
- **Diagnostics (don't crash, report).** Cycle in `depends_on` → emit a diagnostic, drop the cyclic edges from the ordering so the rest still renders. Dangling/archived target → `blockedOn` records it as a diagnostic; archived-as-done counts as satisfied. Surfaced through the existing `loom://diagnostics` resource + `validate-state` prompt, alongside broken-parent / req-coverage issues.

**Reads never mutate.** A thread folder with no `thread.md` is not silently written — it surfaces as a `loom://diagnostics` finding ("N threads missing thread.md — run `loom migrate`") and is shown in the roadmap with a default high priority / empty deps until migrated.

## 3. MCP surface

- **`loom://roadmap` resource** — sibling of `loom://state`/`loom://diagnostics`. Calls `getState` then `buildRoadmap`, returns the `RoadmapView` JSON. Cacheable on the same unfiltered-state cache path.
- **Write tools (validated on write):**
  - `loom_create_thread(weaveId, threadId, title?)` — scaffolds `thread.md` with a fresh `th_` ULID. Enables Rafa's "spin up empty threads" case before any idea exists.
  - `loom_set_priority(threadUlid, priority)` — the drag-reorder write.
  - `loom_set_thread_deps(threadUlid, dependsOn[])` — **refuses** a write that introduces a cycle or points at a non-existent thread (validation at write time is primary; read-time diagnostics are the backstop for edges that rot later via archive/rename).
- These are frontmatter mutations on `thread.md`; they go through a reducer-less save like other metadata, but wrapped so validation runs before the write.

## 4. Migration — `loom migrate`

`thread.md` is required, so existing threads (here **and every downstream `loom install`**) need a backfill. Shipped as a first-class CLI command in `packages/cli`, not a repo `scripts/` file:

- `loom migrate` — runs registered migrations; first one, `backfill-thread-manifests`, creates `thread.md` (fresh `th_` ULID, `title` from the idea title or folder slug, `priority` default, `depends_on: []`) for every thread folder lacking one.
- **Idempotent** — skips threads that already have a manifest; safe to re-run and to ship in every release.
- **`--dry-run`** — prints what it would create, touches nothing (mirrors `scripts/migrate-to-threads.ts`).
- A thin registry lets future migrations register without growing the command — but v1 has exactly one.

## 5. CLI — `loom roadmap`

Thin renderer over `loom://roadmap`: prints an ASCII three-band view — **future** (pending/blocked, dependency-then-priority order, with `blocked on →` annotations), **present** (active/implementing), **history** (shipped plans newest-first, optionally `--group-by-thread`). This is the Plan-1 acceptance surface and is fully scriptable/testable headless.

## 6. Build phases (→ two plans)

**Plan-1 — derived read-model + CLI (cheap, fully headless-testable):**
1. `thread` doc type + the doc-type ripple checklist (§1).
2. Load `thread.md` into `Thread.manifest` (`fs`).
3. `buildRoadmap(state)` in `core` — status overlay, topo+priority order, done-plan history, cycle/dangling diagnostics. Unit tests cover each.
4. `loom://roadmap` MCP resource + diagnostics integration.
5. `loom_create_thread` / `loom_set_priority` / `loom_set_thread_deps` write tools (with write-time validation).
6. `loom migrate` (`backfill-thread-manifests`, idempotent, `--dry-run`).
7. `loom roadmap` CLI.

**Plan-2 — extension surface (rendering on a proven model):**
1. Roadmap toolbar toggle (Enabled/Disabled).
2. Roadmap panel: future (top) / present (middle) / history (bottom).
3. Filter folds to `all / history / roadmap` when enabled.
4. Drag-to-reorder → `loom_set_priority`, refusing any drag that violates a hard `depends_on` edge (client pre-check + server validation).

## Resolved decisions (Rafa, 2026-06-14 — "go with your leans")

1. **Thread-manifest creation seam — ADOPTED: auto-scaffold.** The first `loom_create_*` into a brand-new `threadId` auto-scaffolds `thread.md`, making "every thread has a manifest" an invariant nobody can forget. Explicit `loom_create_thread` (empty threads) and `loom migrate` (existing threads) remain.
2. **History "shipped" date — ADOPTED: the plan's done-doc `created`.** The done-doc is born when the plan closes, so its `created` is the shipping timestamp.
3. **BLOCKED — ADOPTED: one merged `blocked` status** in `RoadmapNode`, with `blockedOn[]` as the discriminator (own-plan vs dependency cause stays legible). `ThreadStatus` is unchanged; the merge is roadmap-level.

## Trade-offs / risks

- **New doc type cost** — touches base/document/idUtils/frontmatter/threadRepository. Mitigated: `req.md` already paved this exact path; we follow it case-for-case.
- **First cross-weave read-model** — `depends_on` resolves cross-weave by ULID via the link index; requires the index to map `th_` ids to threads (small addition to index build).
- **Soft priority is authored** — the one non-derived input. Bounded to a single integer per thread, co-located on `thread.md`; no central list. Honest about being the human bit.
