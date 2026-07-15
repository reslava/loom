---
type: plan
id: pl_01KXKCM87H3R21GNW06BJ89GAR
title: Visual thread-dependency wiring (extension quick-pick)
status: done
created: 2026-07-15
updated: 2026-07-15
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: command-menu-contribution
    order: 1
    status: done
    description: Declare the `reslava-loom.setThreadDeps` command and its thread-node context menu + command-palette guard in package.json.
    files_touched: [packages/vscode/package.json]
    blocked_by: []
    satisfies: []
  - id: quick-pick-command-handler
    order: 2
    status: done
    description: "Implement setThreadDepsCommand: resolve the target thread ULID + current deps, show a pre-checked multi-select quick-pick of candidate threads, and write the diff via loom_set_thread_deps."
    files_touched: [packages/vscode/src/commands/setThreadDeps.ts]
    blocked_by: []
    satisfies: []
  - id: register-the-command
    order: 3
    status: done
    description: Wire reslava-loom.setThreadDeps into extension.ts activation so the contributed command resolves.
    files_touched: [packages/vscode/src/extension.ts]
    blocked_by: [quick-pick-command-handler]
    satisfies: []
  - id: build-test-and-verify-in-the
    order: 4
    status: done
    description: Build all packages, run the suite, and manually exercise the picker end-to-end (set, pre-check, cycle refusal).
    files_touched: [packages/vscode/package.json]
    blocked_by: [command-menu-contribution, quick-pick-command-handler, register-the-command]
    satisfies: []
---
# Visual thread-dependency wiring (extension quick-pick)

## Goal

Complete tri-surface parity for thread dependencies: the capability exists on the CLI (`set-thread-deps`) and MCP (`loom_set_thread_deps`) but has no visual surface. Add a NO-AI extension command — right-click a thread in the roadmap (or main tree) → *Set Dependencies…* → a multi-select quick-pick of the other threads, pre-checked with the thread's current `depends_on`. Confirming writes the new edge set via `loom_set_thread_deps`; the pre-checked picker doubles as the "see current wiring" surface, so no webview or drag gesture is needed (the roadmap already renders dependency order). Cycle/unknown-target rejections from the write path surface as an error toast, leaving the picker's prior state intact.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Declare the `reslava-loom.setThreadDeps` command and its thread-node context menu + command-palette guard in package.json. | packages/vscode/package.json | — | — |
| ✅ | 2 | Implement setThreadDepsCommand: resolve the target thread ULID + current deps, show a pre-checked multi-select quick-pick of candidate threads, and write the diff via loom_set_thread_deps. | packages/vscode/src/commands/setThreadDeps.ts | — | — |
| ✅ | 3 | Wire reslava-loom.setThreadDeps into extension.ts activation so the contributed command resolves. | packages/vscode/src/extension.ts | quick-pick-command-handler | — |
| ✅ | 4 | Build all packages, run the suite, and manually exercise the picker end-to-end (set, pre-check, cycle refusal). | packages/vscode/package.json | command-menu-contribution, quick-pick-command-handler, register-the-command | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:command-menu-contribution -->
### Step 1 — Command + menu contribution

Add to `contributes.commands` a `{ command: "reslava-loom.setThreadDeps", title: "Set Dependencies…", category: "Loom" }` entry. Add a `view/item/context` menu entry gated `when: view == loom.threads && viewItem =~ /^thread/` so it appears on thread nodes in both roadmap and normal-tree mode. Add a `commandPalette` entry gated `when: view == loom.threads` (mirroring the existing thread commands) — or hide it from the palette if it needs a node arg. Place it near the other thread-level menu items (rename/move/status).

<!-- step:quick-pick-command-handler -->
### Step 2 — Quick-pick command handler

New file mirroring the startPlan.ts shape. Resolve the target thread ULID from the node (`node.roadmap?.ulid ?? node.threadUlid`); bail with a warning if the thread has no th_ ULID (no thread.md manifest — deps need one). Source the candidate list + current deps from the roadmap the tree already holds (`treeProvider.getRoadmap()`, RoadmapNode carries `ulid`, `weaveSlug`, `threadSlug`, `dependsOn`): candidates = every roadmap node except the target; build `vscode.window.showQuickPick(items, { canPickMany: true, title: 'Dependencies for {weave}/{thread}' })` with `label = {weaveSlug}/{threadSlug}`, `description = title`, and `picked: true` for ULIDs already in the target's `dependsOn`. On accept, map picks → th_ ULIDs and call `getMCP(root).callTool('loom_set_thread_deps', { thread_ulid, depends_on })`; on cancel (undefined) do nothing. Success → info toast + `treeProvider.refresh()`; on a thrown cycle/unknown-target rejection → `handleMcpError(e, treeProvider)` (error toast, picker state untouched).

<!-- step:register-the-command -->
### Step 3 — Register the command

Add `context.subscriptions.push(vscode.commands.registerCommand('reslava-loom.setThreadDeps', (node) => setThreadDepsCommand(treeProvider, node)))` alongside the other thread commands, plus the import.

<!-- step:build-test-and-verify-in-the -->
### Step 4 — Build, test, and verify in the Extension Dev Host

`./scripts/build-all.sh` + `./scripts/test-all.sh` (the existing thread/parity tests already cover loom_set_thread_deps; the extension command itself has no ts-node harness, consistent with the rest of the extension). Then in the Extension Development Host: right-click a roadmap thread → Set Dependencies → confirm the picker is pre-checked with current deps → add one → confirm it persists to thread.md and the roadmap order updates; then attempt a cycle and confirm the rejection surfaces as an error toast with the picker's prior state intact.
