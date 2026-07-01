---
type: idea
id: id_01KWC417DGX4A215ZS521G5VKR
title: Align stale surfaces — one canonical staleness model
status: done
created: 2026-06-30
updated: 2026-06-30
version: 3
tags: []
parent_id: null
requires_load: []
---
# Align stale surfaces — one canonical staleness model

## Problem

Loom computes "stale" in at least **three** different places with three different definitions, so the VS Code extension and `loom stale` disagree — dangerously. A quiet extension badge ("3 stale", then "1 stale", then "0") hid a project-wide `create_plan` `design_version` bug that `loom stale`'s noisy "63" eventually surfaced (via Chord Flow dogfooding). Two surfaces that should agree did not.

The divergent implementations:

1. **`getState` summary** (`packages/app/src/getState.ts`) — `stalePlans` = design_version behind, **excluding** `done`/`cancelled`; `staleIdeas`/`staleDesigns` = **bidirectional** idea↔design `updated`-date comparison.
2. **Extension Stale filter** (`packages/vscode/src/tree/treeProvider.ts` `threadHasStale` + the `staleIds` set in `buildChildren`) — req-staleness via `getReqStaleDocs` **+** design_version (non-done) **+** bidirectional idea↔design date. **Recomputed locally in the extension.**
3. **`loom stale`** (`packages/app/src/getStaleDocs.ts` → `getStalePlans` in `packages/core/src/derived.ts`) — design_version with **no status filter** (counts `done` plans) **+** `parent_id`→child date drift only; **ignores** req-staleness AND the reverse-direction "idea behind its design" signal.

### Concrete divergence (the trigger)

`core-engine/event-save-scope`: idea `draft` (updated 2026-05-25), design `draft` v3 (updated 2026-05-27), plan `done` (design_version 3 = design v3 → not design_version-stale), no req.

- The **extension** flagged it: design updated after idea + idea not done → "idea is behind its design."
- **`loom stale` could not see it**: `getStaleDocs` only walks `parent_id → child` date drift, and the idea is not a child of the design (the design's `parent_id` is the idea, not the reverse). So the signal is structurally invisible.
- Conversely, `loom stale` **over-reports** by counting stale `done` plans that the extension excludes.

(Workflow footnote: marking that thread's idea+design `done` made the extension show 0 — a chunk of the "stale" noise was simply finished docs left in `draft`. Excluding `done`/`cancelled` from the *actionable* set makes that a non-issue without manual hygiene, though marking finished docs done stays good practice.)

## Goal

One **canonical staleness predicate** in `core`, consumed by every surface — they must *share the computation*, not re-derive it.

Per the layering rule (`cli / vscode → mcp → app → core`), staleness is a pure derivation over loaded state, so it lives in `core`. Each surface is a thin consumer:

- **CLI** `loom stale` → `getStaleDocs` (app) → the core predicate.
- **Extension** → reads a server-computed stale set off `loom://state` (the same core predicate, attached in `getState` the way `reqCoverage` already is) and **stops recomputing** `threadHasStale`/`staleIds` locally. The local reimplementation is itself part of the bug.

The predicate must cover each axis exactly once:
- **design_version** drift on plans
- **req_version** drift (fold in `getReqStaleDocs`)
- **idea↔design** date drift, **both directions**

…and uniformly exclude `done`/`cancelled` from the **actionable** set.

## CLI shape

`loom stale` defaults to the **actionable (filtered)** set — identical to the extension — and gains a `--all` flag to show the unfiltered set (incl. `done` docs and historical drift). The dashboard number and the CLI then agree by default.

## Success criteria

- `loom stale` (default) and the extension report the **same** stale threads/docs.
- `event-save-scope` shows in **both** or **neither** — never split across surfaces.
- A single staleness definition in `core`; no per-surface reimplementation (the extension carries no staleness logic of its own).
- A test asserts parity between the canonical predicate and each call site.

## Non-goals

- Changing *what* counts as stale conceptually (consolidation, not redefinition) — except the deliberate, agreed choice to exclude `done`/`cancelled` from the default/actionable view.
- Auto-marking a thread's docs `done` when its work ships — a separate workflow-ergonomics concern.
