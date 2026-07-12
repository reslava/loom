---
type: done
id: pl_01KXB3H2S2QQ8B2F9SGAC7QXRR-done
title: Done — Doc-graph reports — selection engine, kinds & filters (Group C)
status: done
created: 2026-07-12
version: 5
tags: []
parent_id: pl_01KXB3H2S2QQ8B2F9SGAC7QXRR
requires_load: []
---
# Done — Doc-graph reports — selection engine, kinds & filters (Group C)

## Step 1 — Implement `selectReportDocs(kind, filters, deps)` — the deterministic keystone. Gather docs whose type ∈ kind.docTypes within the {weaves, threads, from, to} filter and date window; order them (chronological for narrative kinds, structural for architecture); apply a token budget (prefer ctx/summaries over full bodies when over budget, recording elision in a manifest so the report can note its own coverage). Pure and unit-testable, independent of any AI call. Generalizes the context pipeline + buildRoadmap.

Implemented `selectReportDocs` as a **pure core function over LoomState** (packages/core/src/reportSelection.ts), exported from the core barrel. Architecture call (revises the plan's app/fs/core framing): the engine is core-pure — mirrors buildRoadmap, so the MCP prompt does getState → selectReportDocs, and it's unit-testable with a state fixture; no fs/app code needed. Selection: gather docs where type ∈ kind.docTypes, deduped by id across thread.allDocs + every typed array (idea/design/req/plans/dones/chats/refDocs) + weave looseFibers/chats/refDocs + global docs/chats; filter by weave/thread scope + inclusive created date window; order chronologically (created asc, id tie-break); return docs + a manifest (counts by type, totalDocs, totalChars). Scope decision: select-all-within-filters with a size-reporting manifest; the ctx/summary token-budget is a deliberate later refinement (filters are the scope control now, totalChars makes size visible). Roadmap kinds (docTypes: []) bypass this — the prompt keeps reading loom://roadmap for them.

## Step 2 — Route the `report` prompt through selectReportDocs: replace the roadmap-passthrough with kind-driven selection (roadmap-sourced kinds still read loom://roadmap), inject the selected slice + coverage manifest, and keep the loom_create_report persist instruction. project-overview behaviour is preserved.

`packages/mcp/src/prompts/report.ts`: routed the prompt through selectReportDocs. Branch on kind.docTypes — empty (roadmap kinds like project-overview) keeps the loom://roadmap passthrough (behaviour preserved); non-empty (doc-set kinds) runs getState (via the shared stateCache, same pattern as the roadmap resource) → selectReportDocs(state, kind, filters) and injects a rendered slice (a coverage-manifest line + each doc as `### [type] title · id · weave/thread · created` + body). Made the prompt filter-capable now (weaveSlug/threadSlug/from/to args → ReportFilters) so step 4 only has to wire the CLI. The persist instruction carries the date-less-title guidance (from plan-002) and sets sources to loom://roadmap for roadmap kinds or the listed doc ids for doc-set kinds.

## Step 3 — Expand packages/core/src/reportKinds.ts with the deferred kinds, each with docTypes + promptFraming: architecture (designs+refs), decisions/'why' (chats+designs), release-notes (done+roadmap/actual_release), drift-audit (designs vs done), security (designs+done+refs). Make them selectable from the CLI + prompt.

`packages/core/src/reportKinds.ts`: added the five deferred kinds, each with docTypes + promptFraming. release-notes is roadmap-sourced (docTypes: [], groups the roadmap history by release); architecture (design+reference), decisions (chat+design), drift-audit (design+done), security (design+done+reference) are doc-set kinds routed through selectReportDocs. Framings each carry a distinct lens + a "cite doc ids / don't invent" guardrail. No CLI/prompt change needed to select them — the CLI `report <kind>` positional + the prompt's getReportKind validation pick up any registered kind automatically.

## Step 4 — Add report filters: `loom report <kind> --weave <slug> --thread <slug> --since <date> --until <date>`, threading the filter args through the `report` prompt into selectReportDocs. Human-first slugs/dates resolved at the CLI edge; empty = whole graph.

Wired report filters at the CLI edge. `packages/cli/src/commands/report.ts`: reportCommand now takes { weave, thread, since, until, run } and maps them to prompt args (weaveSlug, threadSlug, from=since, to=until). `packages/cli/src/index.ts`: added `--thread <slug>`, `--since <date>`, `--until <date>` options (--weave already existed) and updated the description to list all kinds. The prompt already accepted these filters (step 2), so this only exposes them on the human surface; empty = whole graph.

## Step 5 — Run ./scripts/build-all.sh then ./scripts/test-all.sh. Add unit tests for selectReportDocs (filter scoping, ordering, token-budget determinism, manifest elision) and an integration check generating a NON-roadmap kind (e.g. architecture) under a --weave filter. Verify a filtered, non-roadmap report persists correctly under loom/reports/.

Ran ./scripts/build-all.sh (clean) + ./scripts/test-all.sh (all green). Added tests/report-selection.test.ts (registered in test-all.sh): pure unit tests over a LoomState fixture — type ∈ docTypes selection, weave + thread scoping, inclusive created date window (from/to), chronological ordering, and manifest counts; uses the real 'decisions' and 'architecture' kinds. tests/reports.test.ts still green. Live verification: `loom report architecture --weave ai-integration` routes through selectReportDocs and prints a doc-set slice — "21 doc(s) selected (types: design, reference)", counts={design:21}, totalChars=156490, filters applied — NOT the roadmap; project-overview still reads the roadmap. Notable: the 156 KB slice for a weave-scoped architecture report confirms deferred token-budgeting is a real future need — surfaced via manifest.totalChars by design (also: refs live in the separate loom/refs 'refs' weave, so --weave ai-integration correctly scoped them out). Did NOT execute a paid `--run` agent; wiring verified.
