---
type: plan
id: pl_01KXBTP3XQ9APJBN255Y5JRGAC
title: Reports — coverage & kinds
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
  - id: single-doc-type-kinds
    order: 1
    status: done
    description: Add four single-doc-type kinds to reportKinds.ts — `ideas` (docTypes ['idea']), `designs` (['design']), `plans` (['plan']), `dones` (['done']) — each cross-weave, with a distinct promptFraming (per-lens 'complete' report over one doc type) and a higher per-kind default budget (maxChars ≈ 150000, since one doc type is a smaller, bounded slice). Scope narrowing is the existing --weave/--thread filter; no new selection path.
    files_touched: [packages/core/src/reportKinds.ts]
    blocked_by: []
    satisfies: []
  - id: ctx-as-a-source-for-summary
    order: 2
    status: done
    description: Register `ctx` in docTypes for the summary-friendly doc-set kinds only — architecture and the four new *overview kinds (ideas/designs/plans/dones) — so a scope/global ctx is selected as an orientation input when present. Analytical kinds (decisions, drift-audit, security) stay ctx-free (raw rationale, no summary-of-a-summary). Roadmap kinds (project-overview, release-notes) are untouched — adding ctx must NOT flip them off their roadmap passthrough.
    files_touched: [packages/core/src/reportKinds.ts]
    blocked_by: [single-doc-type-kinds]
    satisfies: []
  - id: full-unlimited-budget-override-token-warning
    order: 3
    status: done
    description: "Wire a budget override end-to-end: `loom report <kind> --full` sets an unlimited budget (nothing degrades). Thread it CLI flag → report prompt arg → report.ts handle → selectReportDocs maxChars. At the CLI edge print a clear token-cost warning before the brief (use manifest.fullChars for the ~Xk-token estimate) so an unbudgeted run is a deliberate, informed choice. --full is a no-op for roadmap kinds."
    files_touched: [packages/cli/src/commands/report.ts, packages/cli/src/index.ts, packages/mcp/src/prompts/report.ts, packages/core/src/reportSelection.ts]
    blocked_by: []
    satisfies: []
  - id: on-demand-ctx-suggestion-for-an
    order: 4
    status: done
    description: "Capability (c), not a reintroduced standing doc: when a weave's slice overflows the budget and that weave has no ctx, selectReportDocs records it in the manifest, and the report prompt's coverage note surfaces a suggestion (e.g. 'weave X overflowed and has no ctx — run `loom refresh ctx` scoped to X for a better summary next time'). No ctx is generated automatically; the report never depends on a stale summary."
    files_touched: [packages/core/src/reportSelection.ts, packages/mcp/src/prompts/report.ts]
    blocked_by: []
    satisfies: []
  - id: build-test-and-one-saved-sample
    order: 5
    status: done
    description: Extend the pure tests (new kinds present + their docTypes + higher default budgets; ctx-in-docTypes for the summary-friendly kinds and absent from analytical kinds; --full = no degradation; oversized-ctx manifest hint). Run ./scripts/build-all.sh + ./scripts/test-all.sh. Then generate ONE real sample report end-to-end and LEAVE IT SAVED under loom/reports — a weave-scoped report (per the recency finding, weave-scoped is the showcase-worthy shape), e.g. `designs --weave core-engine`. Record slice size before/after. Single sanctioned paid generation for this plan.
    files_touched: [tests/report-selection.test.ts, loom/reports]
    blocked_by: [single-doc-type-kinds, ctx-as-a-source-for-summary, full-unlimited-budget-override-token-warning, on-demand-ctx-suggestion-for-an]
    satisfies: []
  - id: complete-reports-reference-md
    order: 6
    status: done
    description: Fill the two TODO sections of loom/refs/reports-reference.md — Parameters (kind, --weave/--thread/--since/--until, --full, --run; how the budget + tiered degradation work) and Examples/how-to (worked CLI examples per kind, when to use each, the showcase workflow, the agent-brief / --run flows) — and refresh the Report-kinds table so the four new single-doc-type kinds move from 'being added' to shipped. Add any new showcase candidates generated in step 5.
    files_touched: [loom/refs/reports-reference.md]
    blocked_by: [single-doc-type-kinds, ctx-as-a-source-for-summary, full-unlimited-budget-override-token-warning, on-demand-ctx-suggestion-for-an, build-test-and-one-saved-sample]
    satisfies: []
---
# Reports — coverage & kinds

## Goal

Broaden reports to cover whole-project history and more doc-set lenses. Add single-doc-type "complete" kinds (ideas / designs / plans / dones) with a higher default budget so a per-lens whole-history report stays affordable; register `ctx` as a source doc type for the summary-friendly kinds (b) while keeping analytical kinds (decisions / drift-audit / security) ctx-free to preserve raw rationale; add a `--full` unlimited-budget override with a token-cost warning at the CLI edge (#5) so a user can deliberately generate an unbudgeted report; and surface an on-demand-ctx suggestion when a weave slice overflows the budget and has no ctx (c — a capability, not a reintroduced standing weave-ctx doc). Finish by completing loom/refs/reports-reference.md (Parameters + Examples/how-to; refresh the kinds table). Boundary held from chat-003: ctx scope is not changed; weave ctx stays optional/on-demand, never a mandatory maintained doc.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add four single-doc-type kinds to reportKinds.ts — `ideas` (docTypes ['idea']), `designs` (['design']), `plans` (['plan']), `dones` (['done']) — each cross-weave, with a distinct promptFraming (per-lens 'complete' report over one doc type) and a higher per-kind default budget (maxChars ≈ 150000, since one doc type is a smaller, bounded slice). Scope narrowing is the existing --weave/--thread filter; no new selection path. | packages/core/src/reportKinds.ts | — | — |
| ✅ | 2 | Register `ctx` in docTypes for the summary-friendly doc-set kinds only — architecture and the four new *overview kinds (ideas/designs/plans/dones) — so a scope/global ctx is selected as an orientation input when present. Analytical kinds (decisions, drift-audit, security) stay ctx-free (raw rationale, no summary-of-a-summary). Roadmap kinds (project-overview, release-notes) are untouched — adding ctx must NOT flip them off their roadmap passthrough. | packages/core/src/reportKinds.ts | single-doc-type-kinds | — |
| ✅ | 3 | Wire a budget override end-to-end: `loom report <kind> --full` sets an unlimited budget (nothing degrades). Thread it CLI flag → report prompt arg → report.ts handle → selectReportDocs maxChars. At the CLI edge print a clear token-cost warning before the brief (use manifest.fullChars for the ~Xk-token estimate) so an unbudgeted run is a deliberate, informed choice. --full is a no-op for roadmap kinds. | packages/cli/src/commands/report.ts, packages/cli/src/index.ts, packages/mcp/src/prompts/report.ts, packages/core/src/reportSelection.ts | — | — |
| ✅ | 4 | Capability (c), not a reintroduced standing doc: when a weave's slice overflows the budget and that weave has no ctx, selectReportDocs records it in the manifest, and the report prompt's coverage note surfaces a suggestion (e.g. 'weave X overflowed and has no ctx — run `loom refresh ctx` scoped to X for a better summary next time'). No ctx is generated automatically; the report never depends on a stale summary. | packages/core/src/reportSelection.ts, packages/mcp/src/prompts/report.ts | — | — |
| ✅ | 5 | Extend the pure tests (new kinds present + their docTypes + higher default budgets; ctx-in-docTypes for the summary-friendly kinds and absent from analytical kinds; --full = no degradation; oversized-ctx manifest hint). Run ./scripts/build-all.sh + ./scripts/test-all.sh. Then generate ONE real sample report end-to-end and LEAVE IT SAVED under loom/reports — a weave-scoped report (per the recency finding, weave-scoped is the showcase-worthy shape), e.g. `designs --weave core-engine`. Record slice size before/after. Single sanctioned paid generation for this plan. | tests/report-selection.test.ts, loom/reports | single-doc-type-kinds, ctx-as-a-source-for-summary, full-unlimited-budget-override-token-warning, on-demand-ctx-suggestion-for-an | — |
| ✅ | 6 | Fill the two TODO sections of loom/refs/reports-reference.md — Parameters (kind, --weave/--thread/--since/--until, --full, --run; how the budget + tiered degradation work) and Examples/how-to (worked CLI examples per kind, when to use each, the showcase workflow, the agent-brief / --run flows) — and refresh the Report-kinds table so the four new single-doc-type kinds move from 'being added' to shipped. Add any new showcase candidates generated in step 5. | loom/refs/reports-reference.md | single-doc-type-kinds, ctx-as-a-source-for-summary, full-unlimited-budget-override-token-warning, on-demand-ctx-suggestion-for-an, build-test-and-one-saved-sample | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
