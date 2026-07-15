---
type: done
id: pl_01KXKCM87H3R21GNW06BJ89GAR-done
title: Done — Visual thread-dependency wiring (extension quick-pick)
status: done
created: 2026-07-15
version: 4
tags: []
parent_id: pl_01KXKCM87H3R21GNW06BJ89GAR
requires_load: []
---
# Done — Visual thread-dependency wiring (extension quick-pick)

## Step 1 — Declare the `reslava-loom.setThreadDeps` command and its thread-node context menu + command-palette guard in package.json.

Added the command contribution + thread-node context menu in `packages/vscode/package.json`.

- **Command def** (`contributes.commands`, after `loom.closePlan`): `loom.setThreadDeps`, title "Set Dependencies…", category "Loom", icon `$(references)`.
- **Menu** (`view/item/context`, before `loom.rename`): `{ command: loom.setThreadDeps, when: "view == loom.threads && viewItem =~ /^thread/", group: edit@2 }` — shows on thread nodes in both roadmap and normal-tree mode.

Deviations from the plan's literal text, to match the existing codebase convention:
- Command id is **`loom.setThreadDeps`** (this extension uses `loom.*`, not `reslava-loom.*`).
- **No command-palette guard** added: package.json has no `commandPalette` menus section, and node-requiring commands (`startPlan`, `createIdea`) aren't guarded either. Instead the handler (step 2/3) will be node-tolerant (fall back to the tree selection, like `loom.rename`).

## Step 2 — Implement setThreadDepsCommand: resolve the target thread ULID + current deps, show a pre-checked multi-select quick-pick of candidate threads, and write the diff via loom_set_thread_deps.

Created `packages/vscode/src/commands/setThreadDeps.ts` (`setThreadDepsCommand(treeProvider, node?)`), mirroring the `startPlan.ts` command shape.

Flow:
- Resolve target thread ULID from `node.roadmap?.ulid ?? node.threadUlid`; warn + bail if absent (no thread.md manifest).
- Read `loom://roadmap` **fresh** via `getMCP(root).readResource(...)` rather than `treeProvider.getRoadmap()` — robust regardless of view mode (the cached roadmap is only populated in roadmap view) and reflects the latest edges for the pre-check.
- Find the target node in the band; warn if it isn't there (done threads aren't offered/editable here — candidate source = roadmap band, per Rafa).
- Build a `canPickMany` quick-pick of every other band thread: `label = weave/thread`, `description = title`, `picked = current.has(ulid)` so the picker shows current wiring.
- Cancel (`undefined`) → no-op. On accept, map picks → th_ ULIDs → `loom_set_thread_deps({ thread_ulid, depends_on })`; success toast (set N / cleared) + `treeProvider.refresh()`.

Error handling decision: `handleMcpError` re-throws non-timeout errors, which would surface a cycle *refusal* as an uncaught error. So I split it — timeouts go through `handleMcpError` (reconnect), but a cycle/unknown-target/self rejection is caught and shown via `showWarningMessage('Dependencies refused: …')`, mirroring the roadmap DnD refusal pattern and leaving the graph untouched. Types: `DepPickItem extends vscode.QuickPickItem` with a `ulid` field; `RoadmapNode` imported from `@reslava-loom/core/dist/derived` (as `roadmapDnd.ts` does).

## Step 3 — Wire reslava-loom.setThreadDeps into extension.ts activation so the contributed command resolves.

Wired the command into `packages/vscode/src/extension.ts`:
- Added `import { setThreadDepsCommand } from './commands/setThreadDeps';` next to the `startPlan` import.
- Registered `loom.setThreadDeps` right after `loom.startPlan`: `(node?) => setThreadDepsCommand(treeProvider, node ?? treeView.selection[0])`. The `?? treeView.selection[0]` fallback makes it node-tolerant for palette/keybinding invocation (same pattern as `loom.rename`), which is why no `commandPalette` guard was needed in package.json.

## Step 4 — Build all packages, run the suite, and manually exercise the picker end-to-end (set, pre-check, cycle refusal).

Verification:
- `./scripts/build-all.sh` — all packages built clean, incl. the vscode bundle (`extension.js`, `loom-mcp.js`).
- `npx tsc -p ./ --noEmit` in `packages/vscode` — **exit 0** (esbuild bundles without typechecking, so this is the real type gate; the new command file + `@reslava-loom/core/dist/derived` import typecheck cleanly).
- `./scripts/test-all.sh` — full suite green, incl. MCP integration **23 passed, 0 failed**. The `loom_set_thread_deps` write path (cycle/unknown/self refusal, thread.md persistence) is already covered by the existing thread/parity tests; the extension command itself has no ts-node harness, consistent with the rest of the extension package.

**Not headless-verifiable — pending Rafa in the Extension Development Host:** the live UI exercise (right-click a roadmap thread → *Set Dependencies…* → confirm the picker is pre-checked with current deps → add one → confirm it persists to thread.md and the roadmap reorders → attempt a cycle and confirm the refusal shows as a warning toast with the graph intact). VS Code's tree/quick-pick UI can't be driven from a headless agent, so this half is Rafa's to run. Reload Window (not just an MCP restart) is needed to pick up the new `extension.js`.
