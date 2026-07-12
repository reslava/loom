---
type: done
id: pl_01KXAVTCWEYBE6ZEZENRQSHRTJ-done
title: Done — Doc-graph reports — first slice (project-overview)
status: done
created: 2026-07-12
version: 1
tags: []
parent_id: pl_01KXAVTCWEYBE6ZEZENRQSHRTJ
requires_load: []
---
# Done — Doc-graph reports — first slice (project-overview)

## Step 1 — Add the thin `report` doc type: rp_ ULID prefix, snapshot frontmatter (kind, generated_at, scope, sources), born status active with no draft/finalize lifecycle. Extend the doc-type union, the canonical frontmatter serializer key order, and the ULID-prefix map. Pure core — no IO.

Registered the `report` doc type in core: added `report` to the `DocumentType` union (`packages/core/src/entities/base.ts`), `report: 'rp_'` to `TYPE_PREFIX` (`packages/core/src/idUtils.ts`), and `kind`/`generated_at` to `ORDERED_KEYS` (`packages/core/src/frontmatterUtils.ts`). Minimal, pure — no IO. Only `TYPE_PREFIX` is an exhaustive `Record<DocumentType>`; no `assertNever` switches, so no downstream breakage.

## Step 2 — Add the report write path end-to-end: a create-report event + pure reducer (core), fs repository placement writing cross-weave/roadmap reports to top-level loom/reports/ and single-weave reports to loom/{weave}/reports/ with link-index update (fs/app), and the loom_create_report MCP tool (mcp) taking weave_slug?, kind, title, content, scope, sources. Born active, version 1.

Report write path per storage decision A (standalone artifact, NOT a core event/reducer): new `createReport` app use-case (`packages/app/src/createReport.ts`) hand-writes minimal frontmatter (kind + generated_at) + a body `## Provenance` section (scope + sources), placing cross-weave reports at `loom/reports/` and weave-scoped at `loom/{weave}/reports/` with filename `{Title} ({date}) - {kind} report.md`. New `loom_create_report` MCP tool (`packages/mcp/src/tools/createReport.ts`), registered in the `create` group in `server.ts`. Critically, three exclusions keep reports invisible to state (decision A): `getState` skips a top-level `reports/` (no phantom weave), `RESERVED_SUBDIR_NAMES` includes `reports` (no phantom thread), and `findMarkdownFiles` skips `reports/` (out of the link index/diagnostics).

## Step 3 — Add the pure kind registry in core ({ slug, docTypes, scopeHint, promptFraming }) seeded with the project-overview kind, and the `report` MCP prompt: for project-overview the selection is a loom://roadmap passthrough (no doc-type scan yet); the prompt injects the slice and instructs the agent to synthesize a project-overview report as scannable markdown, then persist via loom_create_report. Runs in the host agent loop — never sampling.

Pure kind registry in core (`packages/core/src/reportKinds.ts`: `{ slug, title, docTypes, scopeHint, promptFraming }` + `getReportKind`/`reportKindSlugs`), seeded with `project-overview`, exported from the core barrel. New `report` MCP prompt (`packages/mcp/src/prompts/report.ts`), registered in `PROMPTS`: validates the kind, injects the `loom://roadmap` slice (passthrough for slice 1), and returns the synthesis instruction + a pre-filled `loom_create_report` persist call. Runs in the host agent loop — never sampling.

## Step 4 — Add the human-first `loom report <kind>` CLI command (slice 1: `loom report project-overview`, no filters). Thin delivery — resolves to the report prompt + roadmap selection, hands the agent the synthesis instruction. Register it in the CLI command surface.

Human-first `loom report <kind> [--weave <slug>]` CLI command (`packages/cli/src/commands/report.ts`), registered in `packages/cli/src/index.ts`. Brief-returning (mirrors `loom next`): connects to the local MCP, calls the `report` prompt, prints the assembled brief. The running agent synthesizes + persists. Verified end-to-end: `loom report project-overview` prints the real roadmap slice + framing + persist call.

## Step 5 — Exclude the report type from loom://refs and the requires_load picker so generated reports never appear as loadable context sources. A report is an output, not a citable fact-source; verify it also does not surface in any requires_load auto-load path.

Satisfied by construction under decision A — no code needed. `loom://refs` (`handleRefsResource`) reads only `loom/refs/`, and reports live in `loom/reports/` / `loom/{weave}/reports/`; reports are also excluded from `buildLinkIndex` and never enter `LoomState`, so they cannot surface in the requires_load picker or any auto-load path. Confirmed by reading `refs.ts` and asserted in the test (report id absent from the link index).

## Step 6 — Run ./scripts/build-all.sh then ./scripts/test-all.sh (add a test asserting a report doc round-trips through the serializer and is absent from loom://refs). Verify by running `loom report project-overview` and confirming a report doc lands under loom/reports/ with the rp_ id and is not listed by loom://refs.

Ran ./scripts/build-all.sh (clean compile across all packages) + ./scripts/test-all.sh (all 23 suites pass). Added `tests/reports.test.ts` (registered in test-all.sh): asserts createReport writes an rp_-id artifact under loom/reports/ (and weave-scoped under loom/{weave}/reports/) with minimal frontmatter + Provenance body, that no phantom `reports` weave/thread appears in LoomState, and that report ids are absent from the link index. Added a `loom_create_report` EXCEPTIONS entry to cli-mcp-parity.test.ts (agent-only persist; humans use `loom report`). Verified live: `loom report project-overview` returns the roadmap-slice brief end-to-end.
