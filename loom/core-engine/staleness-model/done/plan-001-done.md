---
type: done
id: pl_01KWCR98RNKR9ACQ5GNJYAE152-done
title: Done — Implement the directional, version-based staleness model
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: pl_01KWCR98RNKR9ACQ5GNJYAE152
requires_load: []
---
# Done — Implement the directional, version-based staleness model

## Step 1 — In updateDoc.ts increment version + set updated only when `content` is provided and differs from the current body; status-only / requires_load-only updates preserve both. Audit finalize.ts (draft->active must not bump) and closePlan.ts (a pure status close shouldn't move the plan's own version). Prerequisite that makes version baselines meaningful.

`updateDoc.ts`: bump version + updated ONLY when `content` is supplied (status-only / requires_load-only updates touch neither). Couldn't reliably diff against the stored body (titled docs get an injected `# H1` on save), so 'content provided' is the signal. `finalize.ts`: dropped the `updated: today()` (pure status transition); removed now-unused `today` import. closePlan only bumps the done doc (no children) — left as-is.

## Step 2 — Add idea_version?: number to DesignDoc. Add a parentIdeaVersion(threadPath) helper (mirror parentDesignVersion) and stamp the live idea version in weaveDesign; re-stamp in refineDesign. This replaces the date-based design_behind_idea signal.

DesignDoc gains `idea_version?` (dropped the old `req_version`). Added `parentIdeaVersion()` helper (sibling of parentDesignVersion). weaveDesign stamps idea_version from the live idea (reusing the already-loaded idea); removed req_version stamping + the lockedReqVersion import. refineDesign re-stamps idea_version (added `fs` dep; MCP caller updated). Added `idea_version` to the frontmatter key order.

## Step 3 — createReq parents the req to the thread design when present (fallback idea, then null). Add design_version?: number to ReqDoc; createReq/amendReq stamp the design's live version. Remove req_version stamping from weaveDesign (design no longer depends on req). Narrow req-staleness to plans (remove idea/design candidates; retire or narrow getReqStaleDocs).

ReqDoc gains `design_version?`. createReq now parents to the DESIGN when present (fallback idea, then null) and stamps design_version from the live design. amendReq re-stamps design_version (clears the req's own design-staleness). weaveDesign no longer stamps req_version on the design. IdeaDoc dropped its vestigial `req_version` (idea is root, never stale).

## Step 4 — Replace staleEntries' reasons with design_stale (design.idea_version < idea.version), req_stale (req.design_version < design.version), plan_design_stale, plan_req_stale. Delete idea_behind_design, design_behind_idea, and the multi-candidate req block. Update StaleReasonKind, getStaleDocs reason strings, and the getState summary count mapping (and the extension badge formula if it keys on reason names). The extension already reads thread.stale, so the filter needs no change.

Rewrote staleEntries to four directional version reasons (design_stale / req_stale / plan_design_stale / plan_req_stale); deleted idea_behind_design, design_behind_idea, the multi-candidate req block, and getReqStaleDocs (+ its index export). getState summary maps plan_* → stalePlans (distinct), design_stale → staleDesigns, staleIdeas = 0. Extension badge now sums thread.stale (axis-agnostic, includes reqs). assembleContext's staleReason rewritten to the directional rules.

## Step 5 — A migration (mirror backfillDesignVersions: --dry-run, idempotent) that stamps idea_version on every design (= its idea's current version), design_version on every req (= its design's current version), and repoints each req.parent_id from idea to design. Wire a CLI command; runnable here and downstream (Chord Flow).

New `backfillStalenessBaselines` app use-case + `loom backfill-staleness-baselines [--dry-run]` CLI command: stamps idea_version on designs, design_version on reqs, and repoints req.parent_id idea→design. Idempotent. Dry-run on this repo: 44 baseline fields would update (designs' idea_version, reqs' design_version + parent repoint).

## Step 6 — Rewrite tests/stale-parity.test.ts for the directional model; add assertions that no upstream doc is ever flagged (an idea is never stale) and a full chain-reconciliation test (edit idea -> design/req/plans go stale in turn; each refine clears its own baseline). Add a version-on-content test (status-only update leaves version/updated unchanged). Keep staleness-reference.md in sync. Wire new tests into scripts/test-all.sh.

Rewrote tests/stale-parity.test.ts for the directional model (four reasons; asserts an idea is NEVER stale; actionable/--all; extension==CLI parity). Added tests/version-on-content.test.ts (status-only + requires_load-only don't bump; content does) and tests/staleness-baselines.test.ts (real-fs: design stamps idea_version, req parents to design + stamps design_version). Updated req.test.ts (plan_req_stale, plan-only) and context-assembler.test.ts (design stale vs idea). Wired all into test-all. build-all + test-all green.
