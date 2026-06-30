---
type: plan
id: pl_01KWCR98RNKR9ACQ5GNJYAE152
title: Implement the directional, version-based staleness model
status: done
created: 2026-06-30
updated: 2026-06-30
version: 1
design_version: 1
tags: []
parent_id: de_01KWCR8E1NC37G0GW05A14X9C9
requires_load: []
target_version: 0.1.0
actual_release: 1.12.0
steps:
  - id: version-updated-bump-only-on-content
    order: 1
    status: done
    description: In updateDoc.ts increment version + set updated only when `content` is provided and differs from the current body; status-only / requires_load-only updates preserve both. Audit finalize.ts (draft->active must not bump) and closePlan.ts (a pure status close shouldn't move the plan's own version). Prerequisite that makes version baselines meaningful.
    files_touched: [packages/mcp/src/tools/updateDoc.ts, packages/app/src/finalize.ts, packages/app/src/closePlan.ts]
    blocked_by: []
    satisfies: []
  - id: add-idea-version-baseline-to-design
    order: 2
    status: done
    description: "Add idea_version?: number to DesignDoc. Add a parentIdeaVersion(threadPath) helper (mirror parentDesignVersion) and stamp the live idea version in weaveDesign; re-stamp in refineDesign. This replaces the date-based design_behind_idea signal."
    files_touched: [packages/core/src/entities/design.ts, packages/app/src/weaveDesign.ts, packages/app/src/refineDesign.ts]
    blocked_by: []
    satisfies: []
  - id: reverse-design-req-req-depends-on
    order: 3
    status: done
    description: "createReq parents the req to the thread design when present (fallback idea, then null). Add design_version?: number to ReqDoc; createReq/amendReq stamp the design's live version. Remove req_version stamping from weaveDesign (design no longer depends on req). Narrow req-staleness to plans (remove idea/design candidates; retire or narrow getReqStaleDocs)."
    files_touched: [packages/app/src/req.ts, packages/core/src/entities/req.ts, packages/app/src/weaveDesign.ts, packages/core/src/derived.ts]
    blocked_by: []
    satisfies: []
  - id: rewrite-staleentries-to-four-directional-reasons
    order: 4
    status: done
    description: Replace staleEntries' reasons with design_stale (design.idea_version < idea.version), req_stale (req.design_version < design.version), plan_design_stale, plan_req_stale. Delete idea_behind_design, design_behind_idea, and the multi-candidate req block. Update StaleReasonKind, getStaleDocs reason strings, and the getState summary count mapping (and the extension badge formula if it keys on reason names). The extension already reads thread.stale, so the filter needs no change.
    files_touched: [packages/core/src/derived.ts, packages/app/src/getStaleDocs.ts, packages/app/src/getState.ts]
    blocked_by: []
    satisfies: []
  - id: backfill-migrate-existing-docs
    order: 5
    status: done
    description: "A migration (mirror backfillDesignVersions: --dry-run, idempotent) that stamps idea_version on every design (= its idea's current version), design_version on every req (= its design's current version), and repoints each req.parent_id from idea to design. Wire a CLI command; runnable here and downstream (Chord Flow)."
    files_touched: [packages/app/src/backfillStalenessBaselines.ts, packages/cli/src/commands/backfillStalenessBaselines.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: tests-reference-alignment
    order: 6
    status: done
    description: Rewrite tests/stale-parity.test.ts for the directional model; add assertions that no upstream doc is ever flagged (an idea is never stale) and a full chain-reconciliation test (edit idea -> design/req/plans go stale in turn; each refine clears its own baseline). Add a version-on-content test (status-only update leaves version/updated unchanged). Keep staleness-reference.md in sync. Wire new tests into scripts/test-all.sh.
    files_touched: [tests/stale-parity.test.ts, tests/version-on-content.test.ts, scripts/test-all.sh, loom/refs/staleness-reference.md]
    blocked_by: []
    satisfies: []
---
# Implement the directional, version-based staleness model

## Goal

Make Loom's staleness detection trustworthy by implementing the canonical model (loom/refs/staleness-reference.md): one directional, version-based rule — child.&lt;parent&gt;_version &lt; parent.version — along idea → design → req → plan, with req depending on design. Stop status-only updates from bumping version/updated, add idea_version (design) and design_version (req) baselines, reverse the design↔req dependency, rewrite staleEntries to four directional reasons (deleting upstream/date-based flags), and migrate existing docs.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | In updateDoc.ts increment version + set updated only when `content` is provided and differs from the current body; status-only / requires_load-only updates preserve both. Audit finalize.ts (draft->active must not bump) and closePlan.ts (a pure status close shouldn't move the plan's own version). Prerequisite that makes version baselines meaningful. | packages/mcp/src/tools/updateDoc.ts, packages/app/src/finalize.ts, packages/app/src/closePlan.ts | — | — |
| ✅ | 2 | Add idea_version?: number to DesignDoc. Add a parentIdeaVersion(threadPath) helper (mirror parentDesignVersion) and stamp the live idea version in weaveDesign; re-stamp in refineDesign. This replaces the date-based design_behind_idea signal. | packages/core/src/entities/design.ts, packages/app/src/weaveDesign.ts, packages/app/src/refineDesign.ts | — | — |
| ✅ | 3 | createReq parents the req to the thread design when present (fallback idea, then null). Add design_version?: number to ReqDoc; createReq/amendReq stamp the design's live version. Remove req_version stamping from weaveDesign (design no longer depends on req). Narrow req-staleness to plans (remove idea/design candidates; retire or narrow getReqStaleDocs). | packages/app/src/req.ts, packages/core/src/entities/req.ts, packages/app/src/weaveDesign.ts, packages/core/src/derived.ts | — | — |
| ✅ | 4 | Replace staleEntries' reasons with design_stale (design.idea_version < idea.version), req_stale (req.design_version < design.version), plan_design_stale, plan_req_stale. Delete idea_behind_design, design_behind_idea, and the multi-candidate req block. Update StaleReasonKind, getStaleDocs reason strings, and the getState summary count mapping (and the extension badge formula if it keys on reason names). The extension already reads thread.stale, so the filter needs no change. | packages/core/src/derived.ts, packages/app/src/getStaleDocs.ts, packages/app/src/getState.ts | — | — |
| ✅ | 5 | A migration (mirror backfillDesignVersions: --dry-run, idempotent) that stamps idea_version on every design (= its idea's current version), design_version on every req (= its design's current version), and repoints each req.parent_id from idea to design. Wire a CLI command; runnable here and downstream (Chord Flow). | packages/app/src/backfillStalenessBaselines.ts, packages/cli/src/commands/backfillStalenessBaselines.ts, packages/cli/src/index.ts | — | — |
| ✅ | 6 | Rewrite tests/stale-parity.test.ts for the directional model; add assertions that no upstream doc is ever flagged (an idea is never stale) and a full chain-reconciliation test (edit idea -> design/req/plans go stale in turn; each refine clears its own baseline). Add a version-on-content test (status-only update leaves version/updated unchanged). Keep staleness-reference.md in sync. Wire new tests into scripts/test-all.sh. | tests/stale-parity.test.ts, tests/version-on-content.test.ts, scripts/test-all.sh, loom/refs/staleness-reference.md | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
