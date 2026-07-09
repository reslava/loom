---
type: done
id: pl_01KX2V5GRXVC6ZBXTNATAYYA0X-done
title: Done — bundle-first-server-delivery Plan
status: done
created: 2026-07-09
version: 1
tags: []
parent_id: pl_01KX2V5GRXVC6ZBXTNATAYYA0X
requires_load: []
---
# Done — bundle-first-server-delivery Plan

Fast-follow to the bundle-first release (v1.21.0): `loom install` was generating `.mcp.json` with an absolute `LOOM_ROOT` (`root.replace(/\\/g,'/')`), so a committed `.mcp.json` hard-coded one contributor's machine path. Before changing it, verified empirically (nested `claude -p` reading `loom://state`) that Claude Code expands `${workspaceFolder}` to the project root — robustly, even when the agent is launched from a subdirectory — matching the form the install template's doc example already advertised. Switched the generator (and the migration default) to `${workspaceFolder}`; the absolute-path write was the outlier. Only affects newly-generated/migrated configs; existing users pick it up on `loom install --force` or a migration. Ships in the next release.
