---
type: plan
id: pl_01KXFPW8X0XGETJF0MW0578DNQ
title: Push the release-notes workflow into loom report release-notes (generic surface)
status: done
created: 2026-07-14
updated: 2026-07-14
version: 1
design_version: 10
tags: []
parent_id: de_01KXFHE7S0WFCYHE0ADS6A3QDW
requires_load: []
target_version: 0.1.0
steps:
  - id: enrich-the-release-notes-report-path
    order: 1
    status: done
    description: "In the report path (app use-case + report MCP prompt + CLI), make `loom report release-notes` select the `release: null` (Unreleased) set and include those plans' done-doc bodies in the assembled brief — enrichment ON by default, with a `--titles-only` flag for the fast/low-token path. Synthesis stays with the agent: assemble brief + framing, never call an LLM in the command. Update tests."
    files_touched: [packages/app/src/report.ts, packages/mcp/src/prompts/report.ts, packages/cli/src/index.ts, packages/core/src/reportKinds.ts, tests/report-selection.test.ts]
    blocked_by: []
    satisfies: []
  - id: add-the-doc-graph-empty-set
    order: 2
    status: done
    description: "When the `release: null` set is empty, `loom report release-notes` emits a structured 'nothing unreleased' result (noting any threads still `implementing`) instead of an empty brief, so any consumer (skill or CI) can stop cleanly. This is the doc-graph half of the guard; the git-process tells (dirty tree, uncovered commits) stay release-side. Update tests."
    files_touched: [packages/app/src/report.ts, packages/mcp/src/prompts/report.ts, packages/cli/src/index.ts, tests/report-selection.test.ts]
    blocked_by: [enrich-the-release-notes-report-path]
    satisfies: []
  - id: re-thin-this-repo-s-do
    order: 3
    status: done
    description: Rewrite do-release step 2 to just run `loom report release-notes` for the enriched draft + empty-set signal; drop the inline selection/enrichment/guard prose (now in the command). Keep only the git-process add-on (git-log coverage net + dirty-tree tell) and the repo-specific changelog write / bump / tag / push / record-release. Update RELEASING.md to match.
    files_touched: [.claude/commands/do-release.md, RELEASING.md]
    blocked_by: [enrich-the-release-notes-report-path, add-the-doc-graph-empty-set]
    satisfies: []
  - id: re-thin-chord-flow-s-do
    order: 4
    status: done
    description: "Apply the same re-thin to Chord Flow's do-release: replace the inline workflow prose with a call to the enriched `loom report release-notes`, keep the git add-on + csproj bump / tag / push. Drops the version-caveat note (the workflow now ships in the command Chord Flow already runs once upgraded). Cross-repo edit."
    files_touched: ["J:/src/chord-flow/.claude/commands/do-release.md"]
    blocked_by: [re-thin-this-repo-s-do]
    satisfies: []
  - id: showcase-in-the-public-docs-as
    order: 5
    status: done
    description: Showcase `loom report release-notes` in the public docs as a special report any Loom project can run in its own release CI to auto-draft a changelog from the doc graph. Add a concrete CI-usage example (e.g. an agent-in-CI step running the command), and note the enrichment/titles-only + empty-set-guard behavior. Update the reports guide + WAYS-TO-USE-LOOM + the CLI README (npm listing) + the mcp-reference report surface, honoring the doc-sync contract.
    files_touched: [docs/WAYS-TO-USE-LOOM.md, docs/, packages/cli/README.md, README.md, loom/refs/mcp-reference.md]
    blocked_by: [enrich-the-release-notes-report-path, add-the-doc-graph-empty-set]
    satisfies: []
  - id: build-test-and-dry-run-the
    order: 6
    status: done
    description: "Run ./scripts/build-all.sh then ./scripts/test-all.sh (build before test — suite imports dist). Then dry-run `loom report release-notes` against a real or simulated unreleased set: confirm it emits the enriched A/C/F + Highlights brief (with done-body content) and, on an empty set, the 'nothing unreleased' stop-signal. Report the output."
    files_touched: [scripts/build-all.sh, scripts/test-all.sh]
    blocked_by: [enrich-the-release-notes-report-path, add-the-doc-graph-empty-set, re-thin-this-repo-s-do, re-thin-chord-flow-s-do]
    satisfies: []
---
# Push the release-notes workflow into loom report release-notes (generic surface)

## Goal

Push the generic release-notes workflow OUT of the per-repo do-release skill and INTO `loom report release-notes` (CLI + the report MCP prompt), so every Loom project and its release CI get selection + done-body enrichment + the doc-graph empty-set guard for free — not just this repo. Synthesis stays with the invoking agent (no LLM in the CLI), consistent with Loom's existing report model. Then re-thin both this repo's and Chord Flow's do-release skills to consume the enriched command, keeping only the git-process net + repo-specific bump/tag/push. Corrects plan-001, which left the generic workflow as per-repo prose and so half-shipped the feature.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | In the report path (app use-case + report MCP prompt + CLI), make `loom report release-notes` select the `release: null` (Unreleased) set and include those plans' done-doc bodies in the assembled brief — enrichment ON by default, with a `--titles-only` flag for the fast/low-token path. Synthesis stays with the agent: assemble brief + framing, never call an LLM in the command. Update tests. | packages/app/src/report.ts, packages/mcp/src/prompts/report.ts, packages/cli/src/index.ts, packages/core/src/reportKinds.ts, tests/report-selection.test.ts | — | — |
| ✅ | 2 | When the `release: null` set is empty, `loom report release-notes` emits a structured 'nothing unreleased' result (noting any threads still `implementing`) instead of an empty brief, so any consumer (skill or CI) can stop cleanly. This is the doc-graph half of the guard; the git-process tells (dirty tree, uncovered commits) stay release-side. Update tests. | packages/app/src/report.ts, packages/mcp/src/prompts/report.ts, packages/cli/src/index.ts, tests/report-selection.test.ts | enrich-the-release-notes-report-path | — |
| ✅ | 3 | Rewrite do-release step 2 to just run `loom report release-notes` for the enriched draft + empty-set signal; drop the inline selection/enrichment/guard prose (now in the command). Keep only the git-process add-on (git-log coverage net + dirty-tree tell) and the repo-specific changelog write / bump / tag / push / record-release. Update RELEASING.md to match. | .claude/commands/do-release.md, RELEASING.md | enrich-the-release-notes-report-path, add-the-doc-graph-empty-set | — |
| ✅ | 4 | Apply the same re-thin to Chord Flow's do-release: replace the inline workflow prose with a call to the enriched `loom report release-notes`, keep the git add-on + csproj bump / tag / push. Drops the version-caveat note (the workflow now ships in the command Chord Flow already runs once upgraded). Cross-repo edit. | J:/src/chord-flow/.claude/commands/do-release.md | re-thin-this-repo-s-do | — |
| ✅ | 5 | Showcase `loom report release-notes` in the public docs as a special report any Loom project can run in its own release CI to auto-draft a changelog from the doc graph. Add a concrete CI-usage example (e.g. an agent-in-CI step running the command), and note the enrichment/titles-only + empty-set-guard behavior. Update the reports guide + WAYS-TO-USE-LOOM + the CLI README (npm listing) + the mcp-reference report surface, honoring the doc-sync contract. | docs/WAYS-TO-USE-LOOM.md, docs/, packages/cli/README.md, README.md, loom/refs/mcp-reference.md | enrich-the-release-notes-report-path, add-the-doc-graph-empty-set | — |
| ✅ | 6 | Run ./scripts/build-all.sh then ./scripts/test-all.sh (build before test — suite imports dist). Then dry-run `loom report release-notes` against a real or simulated unreleased set: confirm it emits the enriched A/C/F + Highlights brief (with done-body content) and, on an empty set, the 'nothing unreleased' stop-signal. Report the output. | scripts/build-all.sh, scripts/test-all.sh | enrich-the-release-notes-report-path, add-the-doc-graph-empty-set, re-thin-this-repo-s-do, re-thin-chord-flow-s-do | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
