---
type: plan
id: pl_01KQYDFDDFQ9DNQR4GBWDMN7WA
title: DoStep Button via MCP Sampling — Plan 002
status: done
created: "2026-04-29T00:00:00.000Z"
version: 1
design_version: 1
tags: [vscode, mcp, sampling, do-step]
parent_id: de_01KQYDFDDFZT3CVEBS43EJHVWT
requires_load: [de_01KQYDFDDFZT3CVEBS43EJHVWT, pl_01KQYDFDDF0GDECC668E23SX01]
target_release: 0.5.0
actual_release: null
---

# DoStep Button via MCP Sampling — Plan 002

Implements the **AI-driven button workflow** described in [loom/refs/loom.md](../../../refs/loom.md):
the user clicks a button, the AI does real work (writes code, writes the `-done.md`),
the plan ticks forward.

Architecture: **Option A — MCP sampling** (decided in chat). The VS Code extension's
MCP thin client implements `sampling/createMessage`, routing inference requests to the
extension's configured AI client. This unlocks every `loom_generate_*` MCP tool from
the extension and keeps AI logic in the MCP server (single source of truth, also
reachable from CLI / Claude Code).

## Steps



## Steps

