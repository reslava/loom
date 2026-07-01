---
type: idea
id: id_01KSTFWA3V21V7B2BQP1WYTYZJ
title: thread/weave ctx docs not loaded by getState
status: done
created: "2026-05-29T00:00:00.000Z"
updated: 2026-05-31
version: 4
tags: []
parent_id: null
requires_load: []
---
# thread/weave ctx docs not loaded by getState

## The gap

The Unified Context Pipeline reserves auto-load slots for weave- and thread-scoped ctx. Three things are wrong today:

1. **Status** — weave/thread status is derived via `allDocs.every(done)`. A perpetual ctx doc (`status: active`) blocks `DONE` forever once one exists.
2. **Writers** — the three ctx-generation tools write to wrong/dead paths (`loom-ctx.md`, `{weave}-ctx.md`, and a `ctx/`-subdir with dated ids that the loader never reads), so a "refreshed" ctx may never actually load.
3. **Thread ctx is redundant** — the pipeline already loads a thread's idea/design/plan in full (parent chain). A thread-ctx summary duplicates that — more tokens, not fewer. Compression only earns its place at weave/global scope.

## Decision

ctx = **global + weave only**, flat `ctx.md`, stable id. Weave ctx already *loads* (weave-root glob → loose fibers); activate it by fixing status (§3) and the writers (§4). **Drop thread ctx** and the dead thread auto-load slot in the assembler.

## Why it matters

Serves the vision promise that "the AI is stateful through documents." Weave ctx is the per-weave compression that lets the AI know a weave's state without reloading every thread's idea+design+plan. Today that promise silently fails — status blocks `DONE`, and the writers write where nothing reads.

## Out of scope

- Consolidating the 3 ctx generation tools (follow-up — see design §4).
- Token budgeting (Phase 5).
- Thread-level ctx (rejected — see design §6).