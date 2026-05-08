---
type: plan
id: pl_01KQYDFDDER47Y0H7W7K4ZX80M
title: DoStep via Claude Code Terminal — Plan 001
status: done
created: "2026-04-30T00:00:00.000Z"
version: 1
design_version: 1
tags: [vscode, mcp, do-step, claude-code]
parent_id: de_01KQYDFDDE8Z0AV1R2Q8NNNKGK
requires_load: [de_01KQYDFDDE8Z0AV1R2Q8NNNKGK]
target_release: 0.5.0
actual_release: null
---

# DoStep via Claude Code Terminal — Plan 001

Implements the design in [vscode-mcp-do-step-design.md](../vscode-mcp-do-step-design.md): the DoStep button stops invoking AI in-process and instead launches Claude Code in an integrated terminal. `loom_do_step` becomes a deterministic briefing tool; a new `loom_append_done` records implementation notes; `loom_complete_step` (already exists) marks steps done.

## Steps

