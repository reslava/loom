---
type: plan
id: pl_01KXBH4WGD8GBWASEFQMF96QAW
title: Doc-graph reports — token budgeting for selectReportDocs (C-2)
status: active
created: 2026-07-12
version: 1
design_version: 2
tags: []
parent_id: de_01KXAV5RB06F8E13CC9VKC22WE
requires_load: []
target_version: 0.1.0
steps:
  - id: budget-tiered-degradation-in-selectreportdocs
    order: 1
    status: pending
    description: "Add a deterministic token budget to selectReportDocs: a maxChars budget (a sensible default per kind in reportKinds.ts, overridable). When the selected slice exceeds budget, degrade in tiers by relevance (recent/primary docs first): Tier 1 full body for in-budget docs; Tier 2 a deterministic SUMMARY for the rest — prefer an existing ctx doc for that scope, else a fixed excerpt (H1 + section headings + first N lines); Tier 3 reference-only ({id,title,type,created}) for the overflow. No AI — summaries are excerpts/ctx, keeping the function pure and testable."
    files_touched: [packages/core/src/reportSelection.ts, packages/core/src/reportKinds.ts]
    blocked_by: []
    satisfies: []
  - id: record-elision-in-the-manifest-slice
    order: 2
    status: pending
    description: Extend the manifest to record each doc's tier (full / summary / reference-only) and per-tier counts, and add a budget/elision summary (e.g. 'N full, M summarized, K referenced — S of T chars, budget B'). Update the report prompt's slice rendering to mark each doc's tier and inject a coverage note so the agent can state the report's own coverage honestly.
    files_touched: [packages/core/src/reportSelection.ts, packages/mcp/src/prompts/report.ts]
    blocked_by: [budget-tiered-degradation-in-selectreportdocs]
    satisfies: []
  - id: unit-tests-for-budgeting
    order: 3
    status: pending
    description: "Extend tests/report-selection.test.ts: budget determinism (same input → identical tiers), degradation order (full → summary → reference-only as the budget shrinks), relevance ordering governs what keeps a full body, manifest elision counts, and ctx-preferred-over-excerpt for summaries. All pure, no AI."
    files_touched: [tests/report-selection.test.ts]
    blocked_by: [budget-tiered-degradation-in-selectreportdocs, record-elision-in-the-manifest-slice]
    satisfies: []
  - id: build-test-verify-and-leave-a
    order: 4
    status: pending
    description: Run ./scripts/build-all.sh + ./scripts/test-all.sh. Then generate ONE real report end-to-end via the agent — a budgeted full-project `decisions` (or `security`) report — and LEAVE IT SAVED under loom/reports so Rafa can review it. Record the slice size before vs after budgeting (chars/tokens saved). This is the single sanctioned paid generation for the plan (token-economical); the saved artifact is the reviewable deliverable.
    files_touched: [tests, loom/reports]
    blocked_by: [budget-tiered-degradation-in-selectreportdocs, record-elision-in-the-manifest-slice, unit-tests-for-budgeting]
    satisfies: []
---
# Doc-graph reports — token budgeting for selectReportDocs (C-2)

## Goal

Make doc-set reports affordable and context-safe at full-project scope. Today selectReportDocs selects ALL matching docs (a whole-project `decisions`/`security` report can be hundreds of KB → 100k+ tokens), which is expensive to run and can blow the agent's context. Add DETERMINISTIC token budgeting: a char/token budget with tiered content degradation (full body → ctx/excerpt summary → reference-only), recorded in the manifest so a report states its own coverage. No AI in the selection layer — summaries are deterministic excerpts or an existing ctx doc, never model output — so it stays pure, testable, and free, while shrinking the tokens a --run agent actually spends (directly lowering cost). Also bakes in the standing practice: every report-generating plan step leaves the report saved under loom/reports for review.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| 🔳 | 1 | Add a deterministic token budget to selectReportDocs: a maxChars budget (a sensible default per kind in reportKinds.ts, overridable). When the selected slice exceeds budget, degrade in tiers by relevance (recent/primary docs first): Tier 1 full body for in-budget docs; Tier 2 a deterministic SUMMARY for the rest — prefer an existing ctx doc for that scope, else a fixed excerpt (H1 + section headings + first N lines); Tier 3 reference-only ({id,title,type,created}) for the overflow. No AI — summaries are excerpts/ctx, keeping the function pure and testable. | packages/core/src/reportSelection.ts, packages/core/src/reportKinds.ts | — | — |
| 🔳 | 2 | Extend the manifest to record each doc's tier (full / summary / reference-only) and per-tier counts, and add a budget/elision summary (e.g. 'N full, M summarized, K referenced — S of T chars, budget B'). Update the report prompt's slice rendering to mark each doc's tier and inject a coverage note so the agent can state the report's own coverage honestly. | packages/core/src/reportSelection.ts, packages/mcp/src/prompts/report.ts | budget-tiered-degradation-in-selectreportdocs | — |
| 🔳 | 3 | Extend tests/report-selection.test.ts: budget determinism (same input → identical tiers), degradation order (full → summary → reference-only as the budget shrinks), relevance ordering governs what keeps a full body, manifest elision counts, and ctx-preferred-over-excerpt for summaries. All pure, no AI. | tests/report-selection.test.ts | budget-tiered-degradation-in-selectreportdocs, record-elision-in-the-manifest-slice | — |
| 🔳 | 4 | Run ./scripts/build-all.sh + ./scripts/test-all.sh. Then generate ONE real report end-to-end via the agent — a budgeted full-project `decisions` (or `security`) report — and LEAVE IT SAVED under loom/reports so Rafa can review it. Record the slice size before vs after budgeting (chars/tokens saved). This is the single sanctioned paid generation for the plan (token-economical); the saved artifact is the reviewable deliverable. | tests, loom/reports | budget-tiered-degradation-in-selectreportdocs, record-elision-in-the-manifest-slice, unit-tests-for-budgeting | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
