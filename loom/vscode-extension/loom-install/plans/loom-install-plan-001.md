---
type: plan
id: pl_01KQYDFDDDSVBACFH0DZYT1Q1Y
title: Loom Install — Implementation Plan 001
status: done
created: 2026-04-27
updated: 2026-06-06
version: 3
tags: []
parent_id: de_01KQYDFDDDW3C3JYPHQV085GAC
requires_load: [de_01KQYDFDDDW3C3JYPHQV085GAC]
actual_release: 1.0.0
---
# Loom Install — Implementation Plan 001

Implements `loom install` CLI command + VS Code walkthrough + partial-setup notification.
Follows design in `loom-install-design.md`.

## Steps

| # | Description | Files | Done |
|---|-------------|-------|------|
| 1 | Create `installWorkspace` app use-case: write `.loom/CLAUDE.md`, patch root `CLAUDE.md` with `@.loom/CLAUDE.md`, write `.claude/mcp.json` | `packages/app/src/installWorkspace.ts` | ✅ |
| 2 | Create `packages/cli/src/commands/install.ts` — thin CLI wrapper calling `installWorkspace` | `packages/cli/src/commands/install.ts` | ✅ |
| 3 | Register `loom install` in CLI index | `packages/cli/src/index.ts` | ✅ |
| 4 | Build `app` + `cli` packages | `scripts/build-all.sh` | ✅ |
| 5 | Add `detectLoomCli()` to extension — `execSync('loom --version')`, sets `loom.cliDetected` context key | `packages/vscode/src/extension.ts` | ✅ |
| 6 | Add `detectWorkspaceInit()` — checks `.loom/` exists, sets `loom.workspaceInitialized` | `packages/vscode/src/extension.ts` | ✅ |
| 7 | Set all 5 context keys on activation + update on file-system change (`loom.cliDetected`, `loom.workspaceInitialized`, `loom.mcpConnected`, `loom.aiConfigured`, `loom.hasWeaves`) | `packages/vscode/src/extension.ts` | ✅ |
| 8 | Add `showSetupNotification()` — checks state after activation, shows one targeted notification, guarded by `workspaceState` to avoid repeat | `packages/vscode/src/extension.ts` | ✅ |
| 9 | Wire notification buttons: Initialize → terminal `loom install`; Set up MCP → terminal `loom install`; Update rules → terminal `loom install`; No CLI → terminal `npm install -g @reslava/loom` | `packages/vscode/src/extension.ts` | ✅ |
| 10 | Add `contributes.walkthroughs` to `package.json` — 4 steps: Install CLI, Initialize workspace, Configure AI, Create first weave. Each step has `when` condition using context keys. | `packages/vscode/package.json` | ✅ |
| 11 | Build + package VSIX (`npm run package`) | `packages/vscode/` | ✅ |
| 12 | Test at `j:/temp`: install VSIX, verify walkthrough appears, verify notification fires, run `loom install`, verify tree loads | manual | 🔳 |
| 13 | Commit | git | ✅ |
