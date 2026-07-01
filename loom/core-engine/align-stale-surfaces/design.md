---
type: design
id: de_01KWC4K9YJ2R4GJJR7VS6X1ADX
title: Align stale surfaces — one canonical staleness model
status: done
created: 2026-06-30
updated: 2026-06-30
version: 3
idea_version: 3
tags: []
parent_id: id_01KWC417DGX4A215ZS521G5VKR
requires_load: []
---
# Align stale surfaces — one canonical staleness model

## Design conversation

Driven by a concrete split: after the `design_version` backfill, the extension showed `0` stale while `loom stale` showed `25`, and `core-engine/event-save-scope` appeared stale in the extension but was invisible to `loom stale`. Root cause (see idea): three independent staleness implementations with different axes, direction, and `done`-handling. Rafa's framing — *both surfaces should call the same `app` use case so they get the same result* — is the design's load-bearing constraint.

## Principle

Staleness is a **pure derivation over loaded state** → it belongs in `core`, computed once, consumed by thin surfaces. No surface re-derives it. This obeys `cli / vscode → mcp → app → core` and kills the extension's local reimplementation.

## Architecture

### 1. Core — the single predicate (`packages/core/src/derived.ts`)

Add one function that subsumes `getStalePlans`, `getReqStaleDocs`, and the idea↔design date logic now duplicated across `getState`, `treeProvider`, and `getStaleDocs`:

```ts
type StaleReasonKind =
  | 'design_version'      // plan.design_version < design.version
  | 'req_version'         // doc.req_version < locked req.version
  | 'idea_behind_design'  // design.updated > idea.updated  (idea not done)
  | 'design_behind_idea'; // idea.updated  > design.updated (design not done/closed)

interface StaleEntry {
  docId: string; type: DocType; weaveId: string; threadId: string;
  reason: StaleReasonKind;
  actionable: boolean;    // false when the doc is done/cancelled
}

function staleEntries(weave: Weave): StaleEntry[];     // evaluates every axis per doc, once
```

`actionable` is computed per entry (a `done`/`cancelled` doc is never actionable). Callers choose the view; the predicate never silently drops.

### 2. App — thin use case (`packages/app/src/getStaleDocs.ts`)

`getStaleDocs` already loads state. It becomes a thin wrapper:

```ts
getStaleDocs({ includeDone = false }, deps) =>
  state.weaves.flatMap(staleEntries).filter(e => includeDone || e.actionable)
```

This is THE use case both the CLI and the MCP tool call. `getStalePlans`/`getReqStaleDocs` either get folded into `staleEntries` or become trivial views over it (no second definition).

### 3. MCP / state exposure

Two consumers, one computation:
- **`loom_get_stale_docs`** tool → `getStaleDocs` (carries an `all`/`includeDone` arg).
- **`getState`** attaches the computed actionable stale set per thread/doc — exactly as it already attaches `thread.reqCoverage` (`getState.ts:190`) — so `loom://state` carries it. The summary counts (`stalePlans`/`staleIdeas`/`staleDesigns`) are then *derived from the same entries*, not recomputed inline.

### 4. Extension rewiring (`packages/vscode/src/tree/treeProvider.ts`)

Delete the local staleness logic:
- `threadHasStale` (lines ~283–299) → reads the attached stale set (`thread` is stale iff it has any actionable entry).
- the `staleIds` recompute in `buildChildren` (lines ~617–630) → reads attached per-doc flags.
- per-doc/per-plan badges read the attached `reason`.

The extension ends with **zero** staleness arithmetic of its own.

### 5. CLI (`packages/cli/src/commands/stale.ts`)

`loom stale [--all]` → `getStaleDocs({ includeDone: opts.all })`. Default = actionable (matches the extension). `--all` = unfiltered (incl. done docs / historical drift).

### 6. Test (`tests/...`)

Parity test: build a fixture weave exercising all four reasons + a done doc, assert (a) `staleEntries` yields the expected reasons, (b) the actionable filter excludes the done doc, (c) the set the extension would render equals the set `loom stale` returns. A thread with all-done docs ⇒ zero actionable stale.

## Decisions (settled)

- **A. Predicate signature** — one `staleEntries(weave)` returning entries that each carry an `actionable` flag; callers filter. Rejected two separate functions (duplicated intent, wider surface).
- **B. Exposure to the extension** — attach the computed set to `getState` output, mirroring `thread.reqCoverage`. The extension already consumes `loom://state`, so no new plumbing and no second cache to invalidate. Rejected a dedicated `loom://stale` resource.
- **C. Reason coverage** — the full union: design_version + req_version + idea↔design **both** directions. The `idea_behind_design` direction (the one `loom stale` currently lacks) is included.

## Layers touched

`core` (derived.ts — new predicate) · `app` (getStaleDocs, getState attach) · `mcp` (get_stale_docs arg, state shaping) · `cli` (stale `--all`) · `vscode` (treeProvider — delete local logic). No reducer changes (pure read-model only).

## Non-goals

- Redefining what counts as stale (consolidation only) — except the agreed `done`/`cancelled` exclusion from the default view.
- Auto-marking thread docs `done` on ship (separate workflow concern).
