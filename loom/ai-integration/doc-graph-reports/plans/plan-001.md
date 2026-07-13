---
type: plan
id: pl_01KXAVTCWEYBE6ZEZENRQSHRTJ
title: Doc-graph reports — first slice (project-overview)
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
  - id: report-doc-type-in-core
    order: 1
    status: done
    description: "Add the thin `report` doc type: rp_ ULID prefix, snapshot frontmatter (kind, generated_at, scope, sources), born status active with no draft/finalize lifecycle. Extend the doc-type union, the canonical frontmatter serializer key order, and the ULID-prefix map. Pure core — no IO."
    files_touched: [packages/core/src]
    blocked_by: []
    satisfies: []
  - id: loom-create-report-write-path
    order: 2
    status: done
    description: "Add the report write path end-to-end: a create-report event + pure reducer (core), fs repository placement writing cross-weave/roadmap reports to top-level loom/reports/ and single-weave reports to loom/{weave}/reports/ with link-index update (fs/app), and the loom_create_report MCP tool (mcp) taking weave_slug?, kind, title, content, scope, sources. Born active, version 1."
    files_touched: [packages/core/src, packages/fs/src, packages/app/src, packages/mcp/src]
    blocked_by: [report-doc-type-in-core]
    satisfies: []
  - id: kind-registry-report-prompt
    order: 3
    status: done
    description: "Add the pure kind registry in core ({ slug, docTypes, scopeHint, promptFraming }) seeded with the project-overview kind, and the `report` MCP prompt: for project-overview the selection is a loom://roadmap passthrough (no doc-type scan yet); the prompt injects the slice and instructs the agent to synthesize a project-overview report as scannable markdown, then persist via loom_create_report. Runs in the host agent loop — never sampling."
    files_touched: [packages/core/src, packages/mcp/src]
    blocked_by: [loom-create-report-write-path]
    satisfies: []
  - id: loom-report-cli-command
    order: 4
    status: done
    description: "Add the human-first `loom report <kind>` CLI command (slice 1: `loom report project-overview`, no filters). Thin delivery — resolves to the report prompt + roadmap selection, hands the agent the synthesis instruction. Register it in the CLI command surface."
    files_touched: [packages/cli/src]
    blocked_by: [kind-registry-report-prompt]
    satisfies: []
  - id: exclude-report-from-refs-picker
    order: 5
    status: done
    description: "Exclude the report type from loom://refs and the requires_load picker so generated reports never appear as loadable context sources. A report is an output, not a citable fact-source; verify it also does not surface in any requires_load auto-load path."
    files_touched: [packages/mcp/src, packages/app/src]
    blocked_by: [report-doc-type-in-core]
    satisfies: []
  - id: build-test-verify-end-to-end
    order: 6
    status: done
    description: "Run ./scripts/build-all.sh then ./scripts/test-all.sh (add a test asserting a report doc round-trips through the serializer and is absent from loom://refs). Verify by running `loom report project-overview` and confirming a report doc lands under loom/reports/ with the rp_ id and is not listed by loom://refs."
    files_touched: [tests]
    blocked_by: [loom-create-report-write-path, kind-registry-report-prompt, loom-report-cli-command, exclude-report-from-refs-picker]
    satisfies: []
---
# Doc-graph reports — first slice (project-overview)

## Goal

Implement the first, deliberately-minimal slice of the doc-graph report feature: a thin `report` doc type (rp_ ULID, snapshot frontmatter) persisted under a Reports area, a single `project-overview` report synthesized by the agent over the existing `loom://roadmap`, reachable via `loom report project-overview`, with reports excluded from the requires_load / refs picker. Architecture follows the locked seam — server selects (deterministic), agent synthesizes (real loop, never sampling), a write tool persists. Filters, the full kind registry (architecture/decisions/release-notes/drift-audit/security), the extension action, and refresh-in-place are all deferred to follow-up plans.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add the thin `report` doc type: rp_ ULID prefix, snapshot frontmatter (kind, generated_at, scope, sources), born status active with no draft/finalize lifecycle. Extend the doc-type union, the canonical frontmatter serializer key order, and the ULID-prefix map. Pure core — no IO. | packages/core/src | — | — |
| ✅ | 2 | Add the report write path end-to-end: a create-report event + pure reducer (core), fs repository placement writing cross-weave/roadmap reports to top-level loom/reports/ and single-weave reports to loom/{weave}/reports/ with link-index update (fs/app), and the loom_create_report MCP tool (mcp) taking weave_slug?, kind, title, content, scope, sources. Born active, version 1. | packages/core/src, packages/fs/src, packages/app/src, packages/mcp/src | report-doc-type-in-core | — |
| ✅ | 3 | Add the pure kind registry in core ({ slug, docTypes, scopeHint, promptFraming }) seeded with the project-overview kind, and the `report` MCP prompt: for project-overview the selection is a loom://roadmap passthrough (no doc-type scan yet); the prompt injects the slice and instructs the agent to synthesize a project-overview report as scannable markdown, then persist via loom_create_report. Runs in the host agent loop — never sampling. | packages/core/src, packages/mcp/src | loom-create-report-write-path | — |
| ✅ | 4 | Add the human-first `loom report <kind>` CLI command (slice 1: `loom report project-overview`, no filters). Thin delivery — resolves to the report prompt + roadmap selection, hands the agent the synthesis instruction. Register it in the CLI command surface. | packages/cli/src | kind-registry-report-prompt | — |
| ✅ | 5 | Exclude the report type from loom://refs and the requires_load picker so generated reports never appear as loadable context sources. A report is an output, not a citable fact-source; verify it also does not surface in any requires_load auto-load path. | packages/mcp/src, packages/app/src | report-doc-type-in-core | — |
| ✅ | 6 | Run ./scripts/build-all.sh then ./scripts/test-all.sh (add a test asserting a report doc round-trips through the serializer and is absent from loom://refs). Verify by running `loom report project-overview` and confirming a report doc lands under loom/reports/ with the rp_ id and is not listed by loom://refs. | tests | loom-create-report-write-path, kind-registry-report-prompt, loom-report-cli-command, exclude-report-from-refs-picker | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
