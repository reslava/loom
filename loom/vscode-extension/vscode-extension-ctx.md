---
type: ctx
id: vscode-extension-ctx
title: Context Summary — Loom Install — Workspace Onboarding
status: active
created: 2026-05-02
version: 1
tags: [ctx, summary]
parent_id: loom-install
requires_load: []
source_version: 2
---
# Context Summary — Loom Install — Workspace Onboarding

## Problem Statement

Reduce a new user's onboarding from 4 manual steps (CLI install, workspace init, MCP config, VSIX install) to a single step — installing the VS Code extension from the marketplace.

## Context

- The extension is the primary entry point for new users
- `.loom/CLAUDE.md` must be committed so teammates automatically get Loom session rules
- Root `CLAUDE.md` is patched with an import directive rather than overwritten
- `.claude/mcp.json` contains no secrets — API keys go in environment variables
- `getState()` is the single source of truth; no `_status.md` is created
- Walkthroughs and notifications drive onboarding based on context keys

## Key Decisions Made

- Dedicated `loom install` command (separate from `loom init`) sets up the full agent surface
- VS Code walkthrough auto-checks steps via context keys when relevant files/configs are detected
- Partial setup users get a single notification (guarded by `workspaceState` storage)
- CLI detection uses `execSync('loom --version')` rather than path checks
- Terminal output is shown to users during `loom install` execution from the extension

## Open Questions

- Whether `loom install` should also handle API key configuration via UI or only via `--api-key` flag
- How to handle upgrades (`loom upgrade`) when `.loom/CLAUDE.md` needs version updates
- Whether the marketplace publish pipeline needs block on this design being completed

## Active Plans

- **loom-install-plan-001** — active, 0/0 steps (no steps defined yet)
- **vscode-extension-plan-008** — implementing, 18/18 steps (onboarding walkthrough and notifications)
- **vscode-mcp-do-step-plan-001** — done, 4/4 steps
- **vscode-mcp-do-step-plan-002** — done, 6/6 steps
- **vscode-mcp-refactor-plan-001** — done, 0/0 steps
- **vscode-mcp-refactor-plan-002** — done, 6/6 steps

---
*Generated: 2026-05-02T07:17:11.099Z*
