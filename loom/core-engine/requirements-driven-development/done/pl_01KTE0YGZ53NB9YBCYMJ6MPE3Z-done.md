---
type: done
id: pl_01KTE0YGZ53NB9YBCYMJ6MPE3Z-done
title: Done — RDD Phase 2 follow-up 2 — req-node coverage badge + verify-thread rename
status: done
created: "2026-06-06T00:00:00.000Z"
version: 3
tags: []
parent_id: pl_01KTE0YGZ53NB9YBCYMJ6MPE3Z
requires_load: []
---
# Done — RDD Phase 2 follow-up 2 — req-node coverage badge + verify-thread rename

## Step 1 — app — surface per-thread req coverage in state. In `getState`'s existing coverage loop, attach a per-thread coverage result (gap count + the uncovered / excluded-violation / unknown-citation ids) to each thread that has a locked req, alongside the existing aggregate `reqCoverageGaps` sum (compute once, no double pass). Carry it on the serialized thread the `loom://state` resource already returns so the tree can read it without recomputing.

`packages/core/src/entities/thread.ts`: added optional derived `reqCoverage?: ReqCoverage` to `Thread` (imported from `../reqCoverage`). `packages/app/src/getState.ts`: in the existing coverage loop, set `thread.reqCoverage = cov` (same single pass that already sums the aggregate `reqCoverageGaps`) — only for threads with a locked req + ≥1 plan. The `loom://state` resource serializes the whole thread, so no projection change was needed in `state.ts`. Integration test gained `loom://state attaches per-thread reqCoverage with IN1 uncovered` (read filtered `?weaveId=tw` to bypass the unfiltered cache).

## Step 2 — vscode — req-node coverage badge + command rename. In `treeProvider.getThreadChildren`, extend the locked-req node description from `🔒 locked` to include coverage (e.g. `🔒 locked · ⚠️ N gaps`, or `🔒 locked · ✅ covered` when clean) sourced from the step-1 per-thread field. Rename the `loom.verifyReq` command title "Verify Plan Against Requirements" → "Verify Thread Against Requirements".

`packages/vscode/src/tree/treeProvider.ts`: locked-req node description extended from `🔒 locked` to `🔒 locked · ⚠️ N gap(s)` (gaps = uncovered + excludedViolations + unknownCitations lengths from `thread.reqCoverage`) or `🔒 locked · ✅ covered` when clean. Badge appears only for locked-req threads with plans (where getState populates reqCoverage). `packages/vscode/package.json`: `loom.verifyReq` title renamed "Verify Plan Against Requirements" → "Verify Thread Against Requirements" (it pools all the thread's plans). Single occurrence; menus reference the command id, not the title.

## Step 3 — build + full test green + smoke. Run build-all and test-all. Smoke: a thread with a locked req and uncovered Included ids shows `⚠️ N gaps` on its req node; a fully-cited thread shows `✅ covered`; the command palette shows "Verify Thread Against Requirements".

`build-all` + `test-all` green; **14/14** MCP integration (incl. the new per-thread reqCoverage assertion). Badge data path proven by the integration test; the visual badge (`🔒 locked · ⚠️ 5 gaps` on the RDD thread's req node) and the renamed palette entry appear after a VS Code **Reload Window** (extension build, not just MCP reconnect). The badge logic is deterministic over the state field, so no headless UI test added.
