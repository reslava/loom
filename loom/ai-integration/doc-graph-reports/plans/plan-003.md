---
type: plan
id: pl_01KXB3H2S2QQ8B2F9SGAC7QXRR
title: Doc-graph reports — selection engine, kinds & filters (Group C)
status: done
created: 2026-07-12
updated: 2026-07-12
version: 1
design_version: 2
tags: []
parent_id: de_01KXAV5RB06F8E13CC9VKC22WE
requires_load: []
target_version: 0.1.0
steps:
  - id: selectreportdocs-selection-engine
    order: 1
    status: done
    description: Implement `selectReportDocs(kind, filters, deps)` — the deterministic keystone. Gather docs whose type ∈ kind.docTypes within the {weaves, threads, from, to} filter and date window; order them (chronological for narrative kinds, structural for architecture); apply a token budget (prefer ctx/summaries over full bodies when over budget, recording elision in a manifest so the report can note its own coverage). Pure and unit-testable, independent of any AI call. Generalizes the context pipeline + buildRoadmap.
    files_touched: [packages/app/src, packages/fs/src, packages/core/src]
    blocked_by: []
    satisfies: []
  - id: route-report-prompt-through-selection
    order: 2
    status: done
    description: "Route the `report` prompt through selectReportDocs: replace the roadmap-passthrough with kind-driven selection (roadmap-sourced kinds still read loom://roadmap), inject the selected slice + coverage manifest, and keep the loom_create_report persist instruction. project-overview behaviour is preserved."
    files_touched: [packages/mcp/src/prompts/report.ts]
    blocked_by: [selectreportdocs-selection-engine]
    satisfies: []
  - id: expand-the-kind-registry
    order: 3
    status: done
    description: "Expand packages/core/src/reportKinds.ts with the deferred kinds, each with docTypes + promptFraming: architecture (designs+refs), decisions/'why' (chats+designs), release-notes (done+roadmap/actual_release), drift-audit (designs vs done), security (designs+done+refs). Make them selectable from the CLI + prompt."
    files_touched: [packages/core/src/reportKinds.ts]
    blocked_by: [route-report-prompt-through-selection]
    satisfies: []
  - id: cli-filters
    order: 4
    status: done
    description: "Add report filters: `loom report <kind> --weave <slug> --thread <slug> --since <date> --until <date>`, threading the filter args through the `report` prompt into selectReportDocs. Human-first slugs/dates resolved at the CLI edge; empty = whole graph."
    files_touched: [packages/cli/src/commands/report.ts, packages/mcp/src/prompts/report.ts]
    blocked_by: [route-report-prompt-through-selection]
    satisfies: []
  - id: build-test-verify
    order: 5
    status: done
    description: Run ./scripts/build-all.sh then ./scripts/test-all.sh. Add unit tests for selectReportDocs (filter scoping, ordering, token-budget determinism, manifest elision) and an integration check generating a NON-roadmap kind (e.g. architecture) under a --weave filter. Verify a filtered, non-roadmap report persists correctly under loom/reports/.
    files_touched: [tests]
    blocked_by: [selectreportdocs-selection-engine, route-report-prompt-through-selection, expand-the-kind-registry, cli-filters]
    satisfies: []
---
# Doc-graph reports — selection engine, kinds & filters (Group C)

## Goal

Build the real depth of the report feature beyond the slice-1 roadmap passthrough: a deterministic, testable `selectReportDocs` doc-selection engine (the keystone), route the `report` prompt through it, expand the kind registry beyond project-overview, and add CLI filters. This is where reports become genuinely kind-driven (architecture / decisions / release-notes / drift-audit / security), reading the minimum doc-set each kind needs. Gated by the selection engine: kinds and filters both depend on it.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Implement `selectReportDocs(kind, filters, deps)` — the deterministic keystone. Gather docs whose type ∈ kind.docTypes within the {weaves, threads, from, to} filter and date window; order them (chronological for narrative kinds, structural for architecture); apply a token budget (prefer ctx/summaries over full bodies when over budget, recording elision in a manifest so the report can note its own coverage). Pure and unit-testable, independent of any AI call. Generalizes the context pipeline + buildRoadmap. | packages/app/src, packages/fs/src, packages/core/src | — | — |
| ✅ | 2 | Route the `report` prompt through selectReportDocs: replace the roadmap-passthrough with kind-driven selection (roadmap-sourced kinds still read loom://roadmap), inject the selected slice + coverage manifest, and keep the loom_create_report persist instruction. project-overview behaviour is preserved. | packages/mcp/src/prompts/report.ts | selectreportdocs-selection-engine | — |
| ✅ | 3 | Expand packages/core/src/reportKinds.ts with the deferred kinds, each with docTypes + promptFraming: architecture (designs+refs), decisions/'why' (chats+designs), release-notes (done+roadmap/actual_release), drift-audit (designs vs done), security (designs+done+refs). Make them selectable from the CLI + prompt. | packages/core/src/reportKinds.ts | route-report-prompt-through-selection | — |
| ✅ | 4 | Add report filters: `loom report <kind> --weave <slug> --thread <slug> --since <date> --until <date>`, threading the filter args through the `report` prompt into selectReportDocs. Human-first slugs/dates resolved at the CLI edge; empty = whole graph. | packages/cli/src/commands/report.ts, packages/mcp/src/prompts/report.ts | route-report-prompt-through-selection | — |
| ✅ | 5 | Run ./scripts/build-all.sh then ./scripts/test-all.sh. Add unit tests for selectReportDocs (filter scoping, ordering, token-budget determinism, manifest elision) and an integration check generating a NON-roadmap kind (e.g. architecture) under a --weave filter. Verify a filtered, non-roadmap report persists correctly under loom/reports/. | tests | selectreportdocs-selection-engine, route-report-prompt-through-selection, expand-the-kind-registry, cli-filters | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
