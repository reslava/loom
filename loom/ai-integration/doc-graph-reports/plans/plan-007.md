---
type: plan
id: pl_01KXC3SBTYSNVKK0J326V1GM7J
title: Reports in the extension (Group D) — Reports tree node + generate action
status: done
created: 2026-07-12
updated: 2026-07-13
version: 2
design_version: 2
tags: []
parent_id: de_01KXAV5RB06F8E13CC9VKC22WE
requires_load: []
target_version: 0.1.0
actual_release: 1.24.0
steps:
  - id: loom-reports-mcp-resource
    order: 1
    status: done
    description: "Add a `loom://reports` MCP resource that lists report artifacts WITHOUT adding them to LoomState (storage decision A stays intact — reports remain out of the graph/link-index/diagnostics). app/fs: a small scanner over top-level `loom/reports/` (cross-weave) and each `loom/{weave}/reports/` (weave-scoped), returning per report `{ id (rp_ ULID), title, kind, weaveSlug|null, generated_at, filePath }`. mcp: register the resource returning that list as JSON. This is the SINGLE read the extension tree consumes — the extension never fs-scans loom docs directly (all state via MCP resources). Add a tests/ test exercising the scanner against the existing reports on disk."
    files_touched: [packages/fs/src, packages/app/src, packages/mcp/src, tests]
    blocked_by: []
    satisfies: []
  - id: cross-weave-reports-node-kill-the
    order: 2
    status: done
    description: "Render cross-weave reports (top-level `loom/reports/`) under a dedicated **Reports** node, sibling to the Refs node, mirroring the refs section in treeProvider.ts:216-235. Source the docs from the new `loom://reports` resource — NOT from LoomState. (Note: there is no phantom 'reports' weave to fix — getState.ts:63-67 already excludes `loom/reports/` from state so it is never misread as a weave; the real gap is simply that reports are invisible in the tree.) Render each report as a read-only, click-to-open TreeItem with a 'graph'/'output' icon."
    files_touched: [packages/vscode/src/tree/treeProvider.ts]
    blocked_by: [loom-reports-mcp-resource]
    satisfies: []
  - id: weave-scoped-reports-under-their-weave
    order: 3
    status: done
    description: "Render weave-scoped reports (`loom/{weave}/reports/`) under their weave as a **Reports** subsection (mirror createRefsSection). Source them from the `loom://reports` resource filtered by weaveSlug — never a direct fs scan in the extension (that violates the extension→MCP-only layering; all state through MCP resources). Read-only, click-to-open."
    files_touched: [packages/vscode/src/tree/treeProvider.ts]
    blocked_by: [loom-reports-mcp-resource, cross-weave-reports-node-kill-the]
    satisfies: []
  - id: generate-report-action
    order: 4
    status: done
    description: Add a Generate-report command (command palette + a menu/button on the Reports node) that prompts for kind (and optional weave/thread/filters) and launches a Claude agent to synthesize + save the report end-to-end — reuse the --run / launchClaude agent-launch pattern (packages/vscode/src/commands/*), pre-allowing loom_create_report. Refresh the tree on completion so the new report appears.
    files_touched: [packages/vscode/src/commands, packages/vscode/package.json, packages/vscode/src/tree/treeProvider.ts]
    blocked_by: [loom-reports-mcp-resource, cross-weave-reports-node-kill-the]
    satisfies: []
  - id: build-test-verify-in-the-extension
    order: 5
    status: done
    description: "Run build-all + test-all. Then manually verify in the Extension Development Host: cross-weave reports appear under the Reports node (no phantom 'reports' weave), weave-scoped reports appear under their weave, click opens the file read-only, and the Generate-report action produces a saved report that shows up after refresh."
    files_touched: [packages/vscode, scripts]
    blocked_by: [cross-weave-reports-node-kill-the, weave-scoped-reports-under-their-weave, generate-report-action]
    satisfies: []
---
# Reports in the extension (Group D) — Reports tree node + generate action

## Goal

Surface reports in the VS Code extension tree and let the user generate one from there. The gap is pure absence, not misrender: reports are deliberately kept out of LoomState (storage decision A) and the tree only special-cases the 'refs' pseudo-weave (treeProvider.ts:163-235) with no handling for reports — so both (1) cross-weave reports in top-level loom/reports/ and (2) weave-scoped reports in loom/{weave}/reports/ are invisible in the tree. (getState.ts:63-67 already excludes loom/reports/ from state, so there is NO phantom 'reports' weave to fix.) Because reports are intentionally out of state, the extension needs a new read path — a `loom://reports` MCP resource (decision A stays intact; the extension never fs-scans loom docs directly). On top of that resource: add a dedicated Reports node mirroring the Refs pattern for cross-weave reports, render weave-scoped reports under their weave, and add a Generate-report action that launches the --run/launchClaude agent to synthesize + save. Read-only display, click-to-open like other docs. Kept in the doc-graph-reports thread for feature cohesion; could be its own vscode-extension thread.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a `loom://reports` MCP resource that lists report artifacts WITHOUT adding them to LoomState (storage decision A stays intact — reports remain out of the graph/link-index/diagnostics). app/fs: a small scanner over top-level `loom/reports/` (cross-weave) and each `loom/{weave}/reports/` (weave-scoped), returning per report `{ id (rp_ ULID), title, kind, weaveSlug\|null, generated_at, filePath }`. mcp: register the resource returning that list as JSON. This is the SINGLE read the extension tree consumes — the extension never fs-scans loom docs directly (all state via MCP resources). Add a tests/ test exercising the scanner against the existing reports on disk. | packages/fs/src, packages/app/src, packages/mcp/src, tests | — | — |
| ✅ | 2 | Render cross-weave reports (top-level `loom/reports/`) under a dedicated **Reports** node, sibling to the Refs node, mirroring the refs section in treeProvider.ts:216-235. Source the docs from the new `loom://reports` resource — NOT from LoomState. (Note: there is no phantom 'reports' weave to fix — getState.ts:63-67 already excludes `loom/reports/` from state so it is never misread as a weave; the real gap is simply that reports are invisible in the tree.) Render each report as a read-only, click-to-open TreeItem with a 'graph'/'output' icon. | packages/vscode/src/tree/treeProvider.ts | loom-reports-mcp-resource | — |
| ✅ | 3 | Render weave-scoped reports (`loom/{weave}/reports/`) under their weave as a **Reports** subsection (mirror createRefsSection). Source them from the `loom://reports` resource filtered by weaveSlug — never a direct fs scan in the extension (that violates the extension→MCP-only layering; all state through MCP resources). Read-only, click-to-open. | packages/vscode/src/tree/treeProvider.ts | loom-reports-mcp-resource, cross-weave-reports-node-kill-the | — |
| ✅ | 4 | Add a Generate-report command (command palette + a menu/button on the Reports node) that prompts for kind (and optional weave/thread/filters) and launches a Claude agent to synthesize + save the report end-to-end — reuse the --run / launchClaude agent-launch pattern (packages/vscode/src/commands/*), pre-allowing loom_create_report. Refresh the tree on completion so the new report appears. | packages/vscode/src/commands, packages/vscode/package.json, packages/vscode/src/tree/treeProvider.ts | loom-reports-mcp-resource, cross-weave-reports-node-kill-the | — |
| ✅ | 5 | Run build-all + test-all. Then manually verify in the Extension Development Host: cross-weave reports appear under the Reports node (no phantom 'reports' weave), weave-scoped reports appear under their weave, click opens the file read-only, and the Generate-report action produces a saved report that shows up after refresh. | packages/vscode, scripts | cross-weave-reports-node-kill-the, weave-scoped-reports-under-their-weave, generate-report-action | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
