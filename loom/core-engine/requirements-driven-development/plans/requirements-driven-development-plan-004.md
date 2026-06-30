---
type: plan
id: pl_01KTE0YGZ53NB9YBCYMJ6MPE3Z
title: RDD Phase 2 follow-up 2 — req-node coverage badge + verify-thread rename
status: done
created: 2026-06-06
updated: 2026-06-06
version: 1
design_version: 2
req_version: 1
tags: []
parent_id: de_01KTBA3MSAGGDWC5G55A49JN4T
requires_load: []
target_version: 0.1.0
actual_release: 1.0.0
steps:
  - id: app-surface-per-thread-req-coverage
    order: 1
    status: done
    description: "app — surface per-thread req coverage in state. In `getState`'s existing coverage loop, attach a per-thread coverage result (gap count + the uncovered / excluded-violation / unknown-citation ids) to each thread that has a locked req, alongside the existing aggregate `reqCoverageGaps` sum (compute once, no double pass). Carry it on the serialized thread the `loom://state` resource already returns so the tree can read it without recomputing."
    files_touched: [packages/app/src/getState.ts, packages/core (Thread/state type for the per-thread coverage field), packages/mcp/src/resources/state.ts (if it projects thread fields), tests]
    blocked_by: []
    satisfies: [IN6, IN9]
  - id: vscode-req-node-coverage-badge-command
    order: 2
    status: done
    description: vscode — req-node coverage badge + command rename. In `treeProvider.getThreadChildren`, extend the locked-req node description from `🔒 locked` to include coverage (e.g. `🔒 locked · ⚠️ N gaps`, or `🔒 locked · ✅ covered` when clean) sourced from the step-1 per-thread field. Rename the `loom.verifyReq` command title "Verify Plan Against Requirements" → "Verify Thread Against Requirements".
    files_touched: [packages/vscode/src/tree/treeProvider.ts, packages/vscode/package.json]
    blocked_by: []
    satisfies: [IN9]
  - id: build-full-test-green-smoke
    order: 3
    status: done
    description: "build + full test green + smoke. Run build-all and test-all. Smoke: a thread with a locked req and uncovered Included ids shows `⚠️ N gaps` on its req node; a fully-cited thread shows `✅ covered`; the command palette shows \"Verify Thread Against Requirements\"."
    files_touched: []
    blocked_by: []
    satisfies: [IN6, IN9]
---
# RDD Phase 2 follow-up 2 — req-node coverage badge + verify-thread rename

## Goal

Make the deterministic coverage check visible where the user looks at the req, and fix the misleading command name. Today `checkReqCoverage` surfaces only as a global aggregate summary row ("N req coverage gaps", all threads summed) and an on-demand output-channel dump; the req tree node shows only `🔒 locked`, and the command reads "Verify **Plan** Against Requirements" though it actually verifies **all** of a thread's plans pooled. (a) Put a per-thread coverage badge on the req node; (b) rename the command to say "Thread". This is the discoverability fix for the cheapest, always-on check — it advances `IN9` (wired across the VS Code extension) by giving the `IN6` reducer's result a visible home.

**Scope correction:** (a) is not purely extension — `getState` currently keeps only an aggregate gap count, so per-thread coverage must first be surfaced in state (the tree consumes `loom://state` via MCP and must never recompute coverage itself — `getState` is MCP-internal). (b) is extension-only (a `package.json` title).

Hard boundary (`EX1`/`EX4`): this only surfaces the existing structural reducer's output — no new coverage policy, and still scope-traceability only, not code correctness.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | app — surface per-thread req coverage in state. In `getState`'s existing coverage loop, attach a per-thread coverage result (gap count + the uncovered / excluded-violation / unknown-citation ids) to each thread that has a locked req, alongside the existing aggregate `reqCoverageGaps` sum (compute once, no double pass). Carry it on the serialized thread the `loom://state` resource already returns so the tree can read it without recomputing. | packages/app/src/getState.ts, packages/core (Thread/state type for the per-thread coverage field), packages/mcp/src/resources/state.ts (if it projects thread fields), tests | — | IN6, IN9 |
| ✅ | 2 | vscode — req-node coverage badge + command rename. In `treeProvider.getThreadChildren`, extend the locked-req node description from `🔒 locked` to include coverage (e.g. `🔒 locked · ⚠️ N gaps`, or `🔒 locked · ✅ covered` when clean) sourced from the step-1 per-thread field. Rename the `loom.verifyReq` command title "Verify Plan Against Requirements" → "Verify Thread Against Requirements". | packages/vscode/src/tree/treeProvider.ts, packages/vscode/package.json | — | IN9 |
| ✅ | 3 | build + full test green + smoke. Run build-all and test-all. Smoke: a thread with a locked req and uncovered Included ids shows `⚠️ N gaps` on its req node; a fully-cited thread shows `✅ covered`; the command palette shows "Verify Thread Against Requirements". | — | — | IN6, IN9 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
