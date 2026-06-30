---
type: plan
id: pl_01KWC5CCKKPCC2RJT7AWWNWXNB
title: Align stale surfaces — one canonical staleness predicate
status: done
created: 2026-06-30
updated: 2026-06-30
version: 1
design_version: 3
tags: []
parent_id: de_01KWC4K9YJ2R4GJJR7VS6X1ADX
requires_load: []
target_version: 0.1.0
actual_release: 1.12.0
steps:
  - id: core-canonical-predicate
    order: 1
    status: done
    description: Add StaleReasonKind, StaleEntry, and staleEntries(weave) to packages/core/src/derived.ts covering all four reasons (design_version, req_version, idea_behind_design, design_behind_idea), each entry carrying an `actionable` flag (false for done/cancelled docs). Fold the existing getStalePlans/isPlanStale and getReqStaleDocs logic in (keep them as thin views over staleEntries or inline), so there is exactly one definition per axis.
    files_touched: [packages/core/src/derived.ts]
    blocked_by: []
    satisfies: []
  - id: app-getstaledocs-wrapper-getstate-attach
    order: 2
    status: done
    description: Rewrite getStaleDocs as a thin filter over weaves.flatMap(staleEntries) with an includeDone option (default false → actionable only). In getState, attach the per-thread actionable stale set the way thread.reqCoverage is attached, and derive the summary stalePlans/staleIdeas/staleDesigns counts from the same entries instead of recomputing inline.
    files_touched: [packages/app/src/getStaleDocs.ts, packages/app/src/getState.ts]
    blocked_by: []
    satisfies: []
  - id: mcp-exposure
    order: 3
    status: done
    description: "Give loom_get_stale_docs (and reconcile loom_get_stale_plans) an `all`/includeDone arg threaded into getStaleDocs, and ensure loom://state carries the attached stale set so the extension can read it without recomputing."
    files_touched: [packages/mcp/src/tools/getStaleDocs.ts, packages/mcp/src/tools/getStalePlans.ts]
    blocked_by: []
    satisfies: []
  - id: extension-reads-the-attached-set
    order: 4
    status: done
    description: "Delete the extension's local staleness arithmetic: threadHasStale, the staleIds recompute in buildChildren, and any inline idea/design date comparison. The Stale filter, root badge, and per-doc/per-plan badges all read the server-computed stale set off loom://state. Extension ends with zero staleness logic of its own."
    files_touched: [packages/vscode/src/tree/treeProvider.ts]
    blocked_by: []
    satisfies: []
  - id: cli-all-flag
    order: 5
    status: done
    description: "Add `--all` to `loom stale` → getStaleDocs({ includeDone: opts.all }). Default (no flag) shows the actionable set identical to the extension; --all shows the unfiltered set incl. done docs / historical drift."
    files_touched: [packages/cli/src/commands/stale.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: parity-test
    order: 6
    status: done
    description: "New test: fixture weave exercising all four stale reasons plus a done doc; assert (a) staleEntries yields the expected reasons, (b) the actionable filter excludes the done doc, (c) the set the extension renders equals the set `loom stale` returns (surfaces agree), (d) a thread with all-done docs yields zero actionable stale. Wire into scripts/test-all.sh."
    files_touched: [tests/stale-parity.test.ts, scripts/test-all.sh]
    blocked_by: []
    satisfies: []
---
# Align stale surfaces — one canonical staleness predicate

## Goal

Collapse Loom's three divergent staleness implementations into one canonical predicate in `core`, consumed by every surface so the VS Code extension and `loom stale` always agree. Add `staleEntries(weave)` returning typed reasons (design_version / req_version / idea↔design both directions) with an `actionable` flag; make `getStaleDocs` a thin filter over it and have `getState` attach the actionable set (mirroring `reqCoverage`); delete the extension's local staleness logic so it reads the attached set; and give `loom stale` an `--all` flag (default = actionable, matching the extension). A parity test locks the surfaces together.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add StaleReasonKind, StaleEntry, and staleEntries(weave) to packages/core/src/derived.ts covering all four reasons (design_version, req_version, idea_behind_design, design_behind_idea), each entry carrying an `actionable` flag (false for done/cancelled docs). Fold the existing getStalePlans/isPlanStale and getReqStaleDocs logic in (keep them as thin views over staleEntries or inline), so there is exactly one definition per axis. | packages/core/src/derived.ts | — | — |
| ✅ | 2 | Rewrite getStaleDocs as a thin filter over weaves.flatMap(staleEntries) with an includeDone option (default false → actionable only). In getState, attach the per-thread actionable stale set the way thread.reqCoverage is attached, and derive the summary stalePlans/staleIdeas/staleDesigns counts from the same entries instead of recomputing inline. | packages/app/src/getStaleDocs.ts, packages/app/src/getState.ts | — | — |
| ✅ | 3 | Give loom_get_stale_docs (and reconcile loom_get_stale_plans) an `all`/includeDone arg threaded into getStaleDocs, and ensure loom://state carries the attached stale set so the extension can read it without recomputing. | packages/mcp/src/tools/getStaleDocs.ts, packages/mcp/src/tools/getStalePlans.ts | — | — |
| ✅ | 4 | Delete the extension's local staleness arithmetic: threadHasStale, the staleIds recompute in buildChildren, and any inline idea/design date comparison. The Stale filter, root badge, and per-doc/per-plan badges all read the server-computed stale set off loom://state. Extension ends with zero staleness logic of its own. | packages/vscode/src/tree/treeProvider.ts | — | — |
| ✅ | 5 | Add `--all` to `loom stale` → getStaleDocs({ includeDone: opts.all }). Default (no flag) shows the actionable set identical to the extension; --all shows the unfiltered set incl. done docs / historical drift. | packages/cli/src/commands/stale.ts, packages/cli/src/index.ts | — | — |
| ✅ | 6 | New test: fixture weave exercising all four stale reasons plus a done doc; assert (a) staleEntries yields the expected reasons, (b) the actionable filter excludes the done doc, (c) the set the extension renders equals the set `loom stale` returns (surfaces agree), (d) a thread with all-done docs yields zero actionable stale. Wire into scripts/test-all.sh. | tests/stale-parity.test.ts, scripts/test-all.sh | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
