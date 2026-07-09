---
type: plan
id: pl_01KX2V5GRXVC6ZBXTNATAYYA0X
title: bundle-first-server-delivery Plan
status: done
created: 2026-07-09
updated: 2026-07-09
version: 1
design_version: 6
req_version: 1
tags: []
parent_id: de_01KX1CVTAQZJMAQCRP6TJPH1Q8
requires_load: []
target_version: 0.1.0
steps:
  - id: verified-claude-code-s-variable-cwd
    order: 1
    status: done
    description: "Verified Claude Code's variable/cwd behavior with nested `claude -p` spikes: reading loom://state?shape=summary across three .mcp.json forms (absolute LOOM_ROOT, ${workspaceFolder}, and no env) from both the repo root and a subdirectory — ${workspaceFolder} expands to the project root even from a subdir, and Claude also spawns the server with cwd=project root"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: changed-the-generated-mcp-json-packages
    order: 2
    status: done
    description: "Changed the generated .mcp.json (packages/app/src/installWorkspace.ts) to write LOOM_ROOT: \"${workspaceFolder}\" instead of a resolved absolute machine path — portable, committable, machine-agnostic — at both the main install write and the command:\"loom\"→npx migration default; dropped the now-unused root param from migrateMcpCommandToNpx"
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: added-regression-tests-in-tests-install
    order: 3
    status: done
    description: "Added regression tests in tests/install-workspace.test.ts: a fresh install asserts LOOM_ROOT === \"${workspaceFolder}\", and a legacy command:\"loom\" migration without prior env sets the same portable default; build-all + test-all green (23 files)"
    files_touched: []
    blocked_by: []
    satisfies: []
---
# bundle-first-server-delivery Plan

## Goal

Quick-ship record of 3 completed changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Verified Claude Code's variable/cwd behavior with nested `claude -p` spikes: reading loom://state?shape=summary across three .mcp.json forms (absolute LOOM_ROOT, ${workspaceFolder}, and no env) from both the repo root and a subdirectory — ${workspaceFolder} expands to the project root even from a subdir, and Claude also spawns the server with cwd=project root | — | — | — |
| ✅ | 2 | Changed the generated .mcp.json (packages/app/src/installWorkspace.ts) to write LOOM_ROOT: "${workspaceFolder}" instead of a resolved absolute machine path — portable, committable, machine-agnostic — at both the main install write and the command:"loom"→npx migration default; dropped the now-unused root param from migrateMcpCommandToNpx | — | — | — |
| ✅ | 3 | Added regression tests in tests/install-workspace.test.ts: a fresh install asserts LOOM_ROOT === "${workspaceFolder}", and a legacy command:"loom" migration without prior env sets the same portable default; build-all + test-all green (23 files) | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
