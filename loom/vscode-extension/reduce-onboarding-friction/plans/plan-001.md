---
type: plan
id: pl_01KWWRGAMRRWKBH2A03Z7Q3H0X
title: Plan A — Dissolve the setup pipeline
status: done
created: 2026-07-06
updated: 2026-07-07
version: 1
design_version: 1
req_version: 1
tags: []
parent_id: de_01KWWPT2GMZ4YRE270SNJZ3D5T
requires_load: []
target_version: 0.1.0
steps:
  - id: spawn-prototype-gate
    order: 1
    status: done
    description: "Prototype the Electron-Node spawn as a gate: spawn a bundled JS entrypoint via process.execPath + ELECTRON_RUN_AS_NODE=1, connect the MCP StdioClientTransport, and verify stderr piping, stdio framing, and a real loom_* tool round-trip."
    files_touched: [packages/vscode/src/mcp-client.ts]
    blocked_by: []
    satisfies: [IN3, IN2]
  - id: bundle-mcp-server-into-vsix
    order: 2
    status: done
    description: Add an esbuild bundle step producing packages/vscode/dist/loom-mcp.js bundling the mcp server + app + core + fs + telemetry; wire it into the vscode build/package scripts.
    files_touched: [packages/vscode/package.json, packages/vscode/esbuild.js, scripts/build-all.sh]
    blocked_by: [spawn-prototype-gate]
    satisfies: [IN1, C3]
  - id: bake-telemetry-key-into-vsix-build
    order: 3
    status: done
    description: Bake the telemetry PostHog key into the VSIX bundle via esbuild define + release.yml secret, mirroring how the CLI build bakes it today; verify off-by-default consent still gates emission.
    files_touched: [packages/vscode/esbuild.js, .github/workflows/release.yml]
    blocked_by: [bundle-mcp-server-into-vsix]
    satisfies: [IN9, C5]
  - id: spawn-bundled-server-from-mcp-client
    order: 4
    status: done
    description: "Replace command:'loom' in the MCP client with spawning the bundled dist/loom-mcp.js via process.execPath + ELECTRON_RUN_AS_NODE=1; keep stderr piping and LOOM_ROOT/telemetry env."
    files_touched: [packages/vscode/src/mcp-client.ts]
    blocked_by: [bundle-mcp-server-into-vsix]
    satisfies: [IN1, IN2, C4]
  - id: in-process-workspace-init
    order: 5
    status: done
    description: Replace the terminal `loom install` (runLoomInstall) with an in-process installWorkspace() call imported from the bundled app, wrapped in withProgress with real error surfacing.
    files_touched: [packages/vscode/src/extension.ts]
    blocked_by: [bundle-mcp-server-into-vsix]
    satisfies: [IN4]
  - id: onboarding-re-checks-per-step
    order: 6
    status: done
    description: Rewrite showSetupNotification to re-check and re-prompt per remaining setup step instead of setting setupNotificationShown once and going silent (the folded FP1 fix).
    files_touched: [packages/vscode/src/extension.ts]
    blocked_by: [in-process-workspace-init]
    satisfies: [IN5]
  - id: pinned-npx-in-mcp-json
    order: 7
    status: done
    description: "Make installWorkspace write .mcp.json for the Claude Code agent with command:npx, args:[-y, @reslava/loom@<version>, mcp], the version pinned to the extension and injected at write time."
    files_touched: [packages/app/src/installWorkspace.ts, packages/vscode/src/extension.ts]
    blocked_by: [in-process-workspace-init]
    satisfies: [IN6, C2]
  - id: claude-code-detect-install-funnel
    order: 8
    status: done
    description: On first AI action when Claude Code is absent, funnel to its install page instead of dead-ending; keep the API-key sampling fallback discoverable in settings (do not promote it).
    files_touched: [packages/vscode/src/commands/claudeTerminal.ts, packages/vscode/src/extension.ts]
    blocked_by: []
    satisfies: [IN7, EX1]
  - id: ai-status-bar-item
    order: 9
    status: done
    description: Add a third status-bar item showing AI status (Claude Code ✓/✗) alongside the existing Feedback + Telemetry items; refresh it on detection changes.
    files_touched: [packages/vscode/src/extension.ts]
    blocked_by: [claude-code-detect-install-funnel]
    satisfies: [IN8]
---
# Plan A — Dissolve the setup pipeline

## Goal

Make the extension deliver a working tree + initialized workspace with zero global install, by bundling the MCP server into the VSIX and running it on Electron's own Node, initializing workspaces in-process, and wiring the Claude Code agent via a pinned npx command with an install funnel. The whole plan is gated on step 1 (the spawn prototype): if Electron Node + the MCP stdio transport doesn't work, the approach — and downstream positioning — changes, so nothing past the prototype is committed until it's proven.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Prototype the Electron-Node spawn as a gate: spawn a bundled JS entrypoint via process.execPath + ELECTRON_RUN_AS_NODE=1, connect the MCP StdioClientTransport, and verify stderr piping, stdio framing, and a real loom_* tool round-trip. | packages/vscode/src/mcp-client.ts | — | IN3, IN2 |
| ✅ | 2 | Add an esbuild bundle step producing packages/vscode/dist/loom-mcp.js bundling the mcp server + app + core + fs + telemetry; wire it into the vscode build/package scripts. | packages/vscode/package.json, packages/vscode/esbuild.js, scripts/build-all.sh | spawn-prototype-gate | IN1, C3 |
| ✅ | 3 | Bake the telemetry PostHog key into the VSIX bundle via esbuild define + release.yml secret, mirroring how the CLI build bakes it today; verify off-by-default consent still gates emission. | packages/vscode/esbuild.js, .github/workflows/release.yml | bundle-mcp-server-into-vsix | IN9, C5 |
| ✅ | 4 | Replace command:'loom' in the MCP client with spawning the bundled dist/loom-mcp.js via process.execPath + ELECTRON_RUN_AS_NODE=1; keep stderr piping and LOOM_ROOT/telemetry env. | packages/vscode/src/mcp-client.ts | bundle-mcp-server-into-vsix | IN1, IN2, C4 |
| ✅ | 5 | Replace the terminal `loom install` (runLoomInstall) with an in-process installWorkspace() call imported from the bundled app, wrapped in withProgress with real error surfacing. | packages/vscode/src/extension.ts | bundle-mcp-server-into-vsix | IN4 |
| ✅ | 6 | Rewrite showSetupNotification to re-check and re-prompt per remaining setup step instead of setting setupNotificationShown once and going silent (the folded FP1 fix). | packages/vscode/src/extension.ts | in-process-workspace-init | IN5 |
| ✅ | 7 | Make installWorkspace write .mcp.json for the Claude Code agent with command:npx, args:[-y, @reslava/loom@<version>, mcp], the version pinned to the extension and injected at write time. | packages/app/src/installWorkspace.ts, packages/vscode/src/extension.ts | in-process-workspace-init | IN6, C2 |
| ✅ | 8 | On first AI action when Claude Code is absent, funnel to its install page instead of dead-ending; keep the API-key sampling fallback discoverable in settings (do not promote it). | packages/vscode/src/commands/claudeTerminal.ts, packages/vscode/src/extension.ts | — | IN7, EX1 |
| ✅ | 9 | Add a third status-bar item showing AI status (Claude Code ✓/✗) alongside the existing Feedback + Telemetry items; refresh it on detection changes. | packages/vscode/src/extension.ts | claude-code-detect-install-funnel | IN8 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:spawn-prototype-gate -->
### Step 1 — Spawn prototype (gate)

Load-bearing spike. If this fails, fall back to system node (EX4) and revisit C1/IN12 positioning. Do not start steps 2+ until this proves stderr piping + a tool call work under ELECTRON_RUN_AS_NODE.
