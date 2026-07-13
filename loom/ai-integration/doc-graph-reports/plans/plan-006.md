---
type: plan
id: pl_01KXC3RM75CGFBVABDH75VY2QG
title: Reports — selectable keep-full ordering (recency vs oldest)
status: done
created: 2026-07-12
updated: 2026-07-12
version: 1
design_version: 2
tags: []
parent_id: de_01KXAV5RB06F8E13CC9VKC22WE
requires_load: []
target_version: 0.1.0
actual_release: 1.24.0
steps:
  - id: selectable-keep-full-ordering-in-selectreportdocs
    order: 1
    status: done
    description: "Add a keep-full ordering knob to the budget allocation: `sort: 'recency' | 'oldest'`. recency = newest docs keep full bodies (current behavior); oldest = oldest keep full. Only the RELEVANCE order used for tier allocation changes — the OUTPUT stays chronological. Resolve from an optional `sort` param → a new per-kind `defaultSort?` on ReportKind (single-doc-type kinds ideas/designs/plans/dones + architecture default 'oldest' so foundational docs stay full; analytical decisions/drift-audit/security + roadmap kinds default 'recency') → a global default of 'recency'. Deterministic."
    files_touched: [packages/core/src/reportSelection.ts, packages/core/src/reportKinds.ts]
    blocked_by: []
    satisfies: []
  - id: wire-sort-end-to-end
    order: 2
    status: done
    description: Add `--sort <recency|oldest>` to the CLI report command and thread it CLI flag → report prompt arg → selectReportDocs sort param (mirrors --full; the two compose — --full ignores sort since nothing degrades). Validate the value at the CLI edge. Update the command description/help.
    files_touched: [packages/cli/src/index.ts, packages/cli/src/commands/report.ts, packages/mcp/src/prompts/report.ts, packages/core/src/reportSelection.ts]
    blocked_by: [selectable-keep-full-ordering-in-selectreportdocs]
    satisfies: []
  - id: rework-the-oversized-ctx-suggestion
    order: 3
    status: done
    description: Change the report prompt's oversized-weave-without-ctx suggestion to LEAD with `--sort oldest` / `--full` (the better fixes for a designs/architecture run that dropped foundational docs), and mention generating a ctx only as a SECONDARY opt-in — explicitly noting that `loom refresh ctx` creates a PERSISTENT weave ctx.md (not ephemeral), so the user chooses it deliberately. Resolves the chat-004 ctx concern.
    files_touched: [packages/mcp/src/prompts/report.ts]
    blocked_by: [wire-sort-end-to-end]
    satisfies: []
  - id: tests-regenerate-the-core-engine-designs
    order: 4
    status: done
    description: "Extend tests/report-selection.test.ts: sort='oldest' keeps the OLDEST docs full (inverse of recency); per-kind defaultSort applied (designs→oldest, decisions→recency); explicit --sort/param override wins; reworded suggestion. Run build-all + test-all. Then regenerate `loom report designs --weave core-engine --sort oldest`, SAVE it under loom/core-engine/reports (a better showcase candidate that keeps the foundational designs full), and record before/after vs the recency run. Single sanctioned paid generation for this plan; add/replace the showcase-candidate entry in reports-reference.md."
    files_touched: [tests/report-selection.test.ts, loom/core-engine/reports, loom/refs/reports-reference.md]
    blocked_by: [selectable-keep-full-ordering-in-selectreportdocs, wire-sort-end-to-end, rework-the-oversized-ctx-suggestion]
    satisfies: []
---
# Reports — selectable keep-full ordering (recency vs oldest)

## Goal

Fix the recency-degradation finding: today budget degradation always keeps the NEWEST docs full, which drops the oldest/foundational docs — the opposite of what a designs/architecture reader wants. Add a selectable keep-full ordering (recency | oldest) to selectReportDocs, with a per-kind default so single-doc-type + architecture kinds keep foundational docs full while analytical/roadmap kinds stay recency-first, plus a --sort CLI override that composes with --full/budget. Also rework the oversized-ctx suggestion to lead with --sort oldest / --full rather than nudging toward a persistent weave ctx (resolves the chat-004 ctx concern: generating a weave ctx is not ephemeral — it becomes a standing doc — so it must not be the headline suggestion).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a keep-full ordering knob to the budget allocation: `sort: 'recency' \| 'oldest'`. recency = newest docs keep full bodies (current behavior); oldest = oldest keep full. Only the RELEVANCE order used for tier allocation changes — the OUTPUT stays chronological. Resolve from an optional `sort` param → a new per-kind `defaultSort?` on ReportKind (single-doc-type kinds ideas/designs/plans/dones + architecture default 'oldest' so foundational docs stay full; analytical decisions/drift-audit/security + roadmap kinds default 'recency') → a global default of 'recency'. Deterministic. | packages/core/src/reportSelection.ts, packages/core/src/reportKinds.ts | — | — |
| ✅ | 2 | Add `--sort <recency\|oldest>` to the CLI report command and thread it CLI flag → report prompt arg → selectReportDocs sort param (mirrors --full; the two compose — --full ignores sort since nothing degrades). Validate the value at the CLI edge. Update the command description/help. | packages/cli/src/index.ts, packages/cli/src/commands/report.ts, packages/mcp/src/prompts/report.ts, packages/core/src/reportSelection.ts | selectable-keep-full-ordering-in-selectreportdocs | — |
| ✅ | 3 | Change the report prompt's oversized-weave-without-ctx suggestion to LEAD with `--sort oldest` / `--full` (the better fixes for a designs/architecture run that dropped foundational docs), and mention generating a ctx only as a SECONDARY opt-in — explicitly noting that `loom refresh ctx` creates a PERSISTENT weave ctx.md (not ephemeral), so the user chooses it deliberately. Resolves the chat-004 ctx concern. | packages/mcp/src/prompts/report.ts | wire-sort-end-to-end | — |
| ✅ | 4 | Extend tests/report-selection.test.ts: sort='oldest' keeps the OLDEST docs full (inverse of recency); per-kind defaultSort applied (designs→oldest, decisions→recency); explicit --sort/param override wins; reworded suggestion. Run build-all + test-all. Then regenerate `loom report designs --weave core-engine --sort oldest`, SAVE it under loom/core-engine/reports (a better showcase candidate that keeps the foundational designs full), and record before/after vs the recency run. Single sanctioned paid generation for this plan; add/replace the showcase-candidate entry in reports-reference.md. | tests/report-selection.test.ts, loom/core-engine/reports, loom/refs/reports-reference.md | selectable-keep-full-ordering-in-selectreportdocs, wire-sort-end-to-end, rework-the-oversized-ctx-suggestion | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
