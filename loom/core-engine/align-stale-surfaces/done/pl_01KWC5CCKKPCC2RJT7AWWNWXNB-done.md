---
type: done
id: pl_01KWC5CCKKPCC2RJT7AWWNWXNB-done
title: Done — Align stale surfaces — one canonical staleness predicate
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: pl_01KWC5CCKKPCC2RJT7AWWNWXNB
requires_load: []
---
# Done — Align stale surfaces — one canonical staleness predicate

## Step 1 — Add StaleReasonKind, StaleEntry, and staleEntries(weave) to packages/core/src/derived.ts covering all four reasons (design_version, req_version, idea_behind_design, design_behind_idea), each entry carrying an `actionable` flag (false for done/cancelled docs). Fold the existing getStalePlans/isPlanStale and getReqStaleDocs logic in (keep them as thin views over staleEntries or inline), so there is exactly one definition per axis.

Added the canonical predicate to `packages/core/src/derived.ts`: `StaleReasonKind` (design_version | req_version | idea_behind_design | design_behind_idea), `StaleEntry` ({docId,type,weaveId,threadId,reason,detail,actionable}), and `staleEntries(weave)` — one pass over every axis per doc, each hit tagged `actionable` (false for done/cancelled; design also false when closed). Reuses isPlanStale/isReqStale; idea↔design drift uses epoch-tolerant compareDates (both directions). Exported from core index (value + types).

## Step 2 — Rewrite getStaleDocs as a thin filter over weaves.flatMap(staleEntries) with an includeDone option (default false → actionable only). In getState, attach the per-thread actionable stale set the way thread.reqCoverage is attached, and derive the summary stalePlans/staleIdeas/staleDesigns counts from the same entries instead of recomputing inline.

Added `thread.stale?: StaleEntry[]` to the Thread entity (derived, not persisted — mirrors reqCoverage). Rewrote `getStaleDocs` as a thin filter over `weaves.flatMap(staleEntries)` with `includeDone` (default false → actionable); groups multi-reason docs into one entry. `getState` now computes staleEntries per weave once, attaches the actionable subset to each `thread.stale`, and derives summary stalePlans/staleIdeas/staleDesigns from the same entries (deleted the old inline loops).

## Step 3 — Give loom_get_stale_docs (and reconcile loom_get_stale_plans) an `all`/includeDone arg threaded into getStaleDocs, and ensure loom://state carries the attached stale set so the extension can read it without recomputing.

`loom_get_stale_docs` MCP tool gains an `all` boolean arg → `getStaleDocs({ includeDone })`; description updated to note actionable-by-default. `loom://state` already JSON-serializes the whole thread, so the attached `thread.stale` reaches the extension with no extra plumbing (verified state.ts passes weaves through).

## Step 4 — Delete the extension's local staleness arithmetic: threadHasStale, the staleIds recompute in buildChildren, and any inline idea/design date comparison. The Stale filter, root badge, and per-doc/per-plan badges all read the server-computed stale set off loom://state. Extension ends with zero staleness logic of its own.

`packages/vscode/src/tree/treeProvider.ts`: deleted all local staleness arithmetic — `threadHasStale` now returns `(t.stale?.length ?? 0) > 0`; the `staleIds` set in `getWeaveChildren` is built from `thread.stale` docIds; removed the now-unused `getReqStaleDocs` import. The extension carries zero staleness logic of its own; badge + filter + per-doc badges all read the server-computed set.

## Step 5 — Add `--all` to `loom stale` → getStaleDocs({ includeDone: opts.all }). Default (no flag) shows the actionable set identical to the extension; --all shows the unfiltered set incl. done docs / historical drift.

`loom stale [--all]`: `staleCommand` takes `{ all }` → `getStaleDocs({ includeDone: all })`; default prints 'N actionable stale document(s)', `--all` prints the historical set. Wired the `--option('--all')` in `packages/cli/src/index.ts`. Dogfood: `loom stale` = 1 actionable, `loom stale --all` = 7 (count dropped from the old 25 because the blunt 'any parent updated after child' check — mostly done-doc noise — is replaced by the 4 canonical axes).

## Step 6 — New test: fixture weave exercising all four stale reasons plus a done doc; assert (a) staleEntries yields the expected reasons, (b) the actionable filter excludes the done doc, (c) the set the extension renders equals the set `loom stale` returns (surfaces agree), (d) a thread with all-done docs yields zero actionable stale. Wire into scripts/test-all.sh.

New `tests/stale-parity.test.ts` (pure core, wired into test-all): a fixture weave exercising all four reasons + a done plan + an all-done thread asserts (a) each axis fires with the right reason, (b) actionable excludes done docs (4 actionable), (c) `--all` surfaces historical entries (7), (d) an all-done thread yields 0 actionable, (e) PARITY — the per-thread actionable set the extension renders == the flat set `getStaleDocs` returns. build-all + test-all green.
