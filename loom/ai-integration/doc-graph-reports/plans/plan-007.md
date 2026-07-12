---
type: plan
id: pl_01KXC3SBTYSNVKK0J326V1GM7J
title: Reports in the extension (Group D) — Reports tree node + generate action
status: active
created: 2026-07-12
version: 1
design_version: 2
tags: []
parent_id: de_01KXAV5RB06F8E13CC9VKC22WE
requires_load: []
target_version: 0.1.0
steps:
  - id: cross-weave-reports-node-kill-the
    order: 1
    status: pending
    description: "Render top-level loom/reports/ under a dedicated **Reports** node (sibling to the Refs node), mirroring the refs pseudo-weave special-casing in treeProvider.ts:163-235 (find the 'reports' weave, render its report docs under a 'Reports' TreeItem with an icon like 'graph'/'output', read-only, click-to-open) instead of falling through as a normal weave whose docs show as Loose Fibers. Confirm how loom/reports/ currently reaches the tree (it should be excluded from LoomState per decision A, yet appears — resolve that inconsistency: either it is loaded as a 'reports' pseudo-weave like 'refs', or scanned separately)."
    files_touched: [packages/vscode/src/tree/treeProvider.ts]
    blocked_by: []
    satisfies: []
  - id: weave-scoped-reports-under-their-weave
    order: 2
    status: pending
    description: Render loom/{weave}/reports/ report docs under their weave as a **Reports** subsection (mirror createRefsSection). Because reports are excluded from LoomState, source them by scanning the weave's reports/ dir directly (via a small MCP resource/read or an fs scan surfaced to the extension) rather than expecting them in weave state. Read-only, click-to-open.
    files_touched: [packages/vscode/src/tree/treeProvider.ts]
    blocked_by: [cross-weave-reports-node-kill-the]
    satisfies: []
  - id: generate-report-action
    order: 3
    status: pending
    description: Add a Generate-report command (command palette + a menu/button on the Reports node) that prompts for kind (and optional weave/thread/filters) and launches a Claude agent to synthesize + save the report end-to-end — reuse the --run / launchClaude agent-launch pattern (packages/vscode/src/commands/*), pre-allowing loom_create_report. Refresh the tree on completion so the new report appears.
    files_touched: [packages/vscode/src/commands, packages/vscode/package.json, packages/vscode/src/tree/treeProvider.ts]
    blocked_by: [cross-weave-reports-node-kill-the]
    satisfies: []
  - id: build-test-verify-in-the-extension
    order: 4
    status: pending
    description: "Run build-all + test-all. Then manually verify in the Extension Development Host: cross-weave reports appear under the Reports node (no phantom 'reports' weave), weave-scoped reports appear under their weave, click opens the file read-only, and the Generate-report action produces a saved report that shows up after refresh."
    files_touched: [packages/vscode, scripts]
    blocked_by: [cross-weave-reports-node-kill-the, weave-scoped-reports-under-their-weave, generate-report-action]
    satisfies: []
---
# Reports in the extension (Group D) — Reports tree node + generate action

## Goal

Surface reports in the VS Code extension tree and let the user generate one from there. Two live bugs to fix: (1) the top-level loom/reports/ dir renders as a phantom 'reports' weave with its report docs shown as Loose Fibers, because the tree only special-cases the 'refs' pseudo-weave (treeProvider.ts:163-235) and has no handling for reports; (2) weave-scoped reports under loom/{weave}/reports/ don't appear at all (reports are excluded from LoomState by storage decision A, so the tree never sees them). Add a dedicated Reports node mirroring the Refs pattern for cross-weave reports, render weave-scoped reports under their weave, and add a Generate-report action that launches the --run/launchClaude agent to synthesize + save. Read-only display, click-to-open like other docs. Kept in the doc-graph-reports thread for feature cohesion; could be its own vscode-extension thread.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| 🔳 | 1 | Render top-level loom/reports/ under a dedicated **Reports** node (sibling to the Refs node), mirroring the refs pseudo-weave special-casing in treeProvider.ts:163-235 (find the 'reports' weave, render its report docs under a 'Reports' TreeItem with an icon like 'graph'/'output', read-only, click-to-open) instead of falling through as a normal weave whose docs show as Loose Fibers. Confirm how loom/reports/ currently reaches the tree (it should be excluded from LoomState per decision A, yet appears — resolve that inconsistency: either it is loaded as a 'reports' pseudo-weave like 'refs', or scanned separately). | packages/vscode/src/tree/treeProvider.ts | — | — |
| 🔳 | 2 | Render loom/{weave}/reports/ report docs under their weave as a **Reports** subsection (mirror createRefsSection). Because reports are excluded from LoomState, source them by scanning the weave's reports/ dir directly (via a small MCP resource/read or an fs scan surfaced to the extension) rather than expecting them in weave state. Read-only, click-to-open. | packages/vscode/src/tree/treeProvider.ts | cross-weave-reports-node-kill-the | — |
| 🔳 | 3 | Add a Generate-report command (command palette + a menu/button on the Reports node) that prompts for kind (and optional weave/thread/filters) and launches a Claude agent to synthesize + save the report end-to-end — reuse the --run / launchClaude agent-launch pattern (packages/vscode/src/commands/*), pre-allowing loom_create_report. Refresh the tree on completion so the new report appears. | packages/vscode/src/commands, packages/vscode/package.json, packages/vscode/src/tree/treeProvider.ts | cross-weave-reports-node-kill-the | — |
| 🔳 | 4 | Run build-all + test-all. Then manually verify in the Extension Development Host: cross-weave reports appear under the Reports node (no phantom 'reports' weave), weave-scoped reports appear under their weave, click opens the file read-only, and the Generate-report action produces a saved report that shows up after refresh. | packages/vscode, scripts | cross-weave-reports-node-kill-the, weave-scoped-reports-under-their-weave, generate-report-action | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
