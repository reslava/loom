---
type: idea
id: id_01KV3GC10MFGWMKQ84JEGYQEQW
title: Derived Roadmap
status: done
created: "2026-06-14T00:00:00.000Z"
updated: 2026-06-14
version: 3
tags: []
parent_id: null
requires_load: []
---
# Derived Roadmap

## What we're building

A **derived cross-weave roadmap** for Loom: a single read-model that, from existing document state plus a thin layer of authored thread metadata, answers three questions at a glance —

- **Present/future** — which threads are in progress, which are pending, and in what order they *can* be worked given their dependencies.
- **Blocked-on** *(the headline)* — which threads are waiting on another unfinished thread, **across weave boundaries**. This is the one fact a human cannot compute by hand today.
- **Past** — what shipped and when, as a timeline derived from completed plans' dated done-docs.

The roadmap is **derived, never authored**. The only things a human writes are a thread's soft `priority` and its hard `depends_on` edges. Everything else — status, ordering, history, diagnostics — falls out of the documents Loom already has. This is the inverse of the hand-maintained roadmap markdown that Loom explicitly tells the AI not to trust; it replaces that manual list with computed truth.

## Why it matters

Loom's core promise is that **state is derived** — both user and AI read it from the documents, never from a hand-typed pointer. Today that promise holds *within* a weave/thread but breaks at the cross-weave level: there is no view of where the whole project stands, so the gap gets filled by exactly the anti-pattern Loom exists to kill — a hand-maintained roadmap in a markdown chat doc that drifts the moment work moves.

The highest-leverage piece is **blocked-on across weaves**. A timeline of past work is pleasant but eyeball-able from done-doc dates. "Thread A in `ai-integration` is blocked on thread B in `core-engine`, which isn't done" is *not* eyeball-able — it requires holding the whole project graph in your head. Computing it is the feature.

This is also the **first cross-weave read-model** in Loom, which makes it a meaningful test of the "state is derived" claim at project scope, not just thread scope.

**Vision link:** serves "both User and AI always know weaves/threads state" and removes the manual step of hand-maintaining a roadmap/active-work list.

## Shape

**Authored (thin):** a required `thread.md` per thread —

```yaml
---
type: thread
id: th_01K…           # ULID — the stable, rename/move/cross-weave-safe ref target
title: "Roadmap"
priority: 100          # soft order, only among the slack dependencies leave free
depends_on: [th_…]     # hard edges; reference threads by ULID, cross-weave
---
```

- `thread.md` is **required for every thread** and gives a thread a first-class identity independent of whether an idea/design/plan exists yet (you can spin up empty threads, or start one from another thread's chat, and it still appears in the roadmap).
- It holds **only authored bits**. Status is *never* a field here — storing it would recreate the hand-maintained-state anti-pattern.
- `depends_on` points at thread ULIDs, not folder paths, so renames/moves/cross-weave references resolve through the id index instead of breaking.

**Derived (everything else):** `buildRoadmap(state)` —

- **Status** per thread (`done / active / implementing / pending / blocked`) computed from the thread's plans, done-docs, and dependency edges. Never stored.
- **Order** via topological sort of `depends_on`, with soft `priority` (then a stable secondary key) resolving the slack the partial order leaves free. A thread can never be ordered before something it depends on — the hard graph wins, priority only sorts ties.
- **History** keyed on **completed plans**, not "done threads" (a thread is never truly finished; a plan has a crisp terminal state). Each closed plan's dated done-doc is a shipping event; newest-first, with an option to group by thread.
- **Diagnostics** — cycles and dangling/archived dependency targets surface through `validate-state`, never crash the view.

**Reads stay pure.** The roadmap never mutates: a thread missing its `thread.md` surfaces as a `validate-state` diagnostic ("run `loom migrate`"), not a silent write.

## Migration

`thread.md` is required, so existing threads (here and in every downstream `loom install`) need a backfill. Ship it as a **CLI command, `loom migrate`** — idempotent (skips threads that already have a manifest), `--dry-run` capable, and registered for downstream releases, not just a repo-internal script. Every upgrading install hits the same backfill; the command is the honest delivery surface.

## Build phases

Two plans, sequenced cheapest-and-most-testable first:

1. **Core read-model + CLI** — `thread.md` doc type, `buildRoadmap(state)` (topo sort, status overlay, done-plan history, cycle/dangling diagnostics), `loom migrate`, and a `loom roadmap` CLI that prints the ASCII roadmap. Fully **headless-testable** — the hard logic gets unit tests with no UI. Delivers the cross-weave view immediately, in this repo.
2. **Extension surface** — a Roadmap toolbar toggle, a panel rendering past/present/future, and drag-to-reorder that writes soft `priority` (refusing any drag that violates a hard `depends_on` edge). Rendering on top of the proven read-model.

## Success criteria

- `loom roadmap` prints, from documents alone, the project's done-history, in-progress threads, and pending threads in dependency-then-priority order — with **no hand-authored roadmap list anywhere**.
- For any thread, the view shows whether it is **blocked on another unfinished thread across weaves**, and on which.
- `depends_on` cycles and dangling targets are reported as diagnostics, never crash or silently mislead.
- `loom migrate` backfills `thread.md` for all existing threads idempotently, and the same command works in a downstream `loom install`.
- Reordering independent threads sets `priority` and is honored; a reorder that violates a dependency is refused.
- No `status` is ever written to `thread.md`; re-running `buildRoadmap` on unchanged docs yields the same result (status/history fully derived).
