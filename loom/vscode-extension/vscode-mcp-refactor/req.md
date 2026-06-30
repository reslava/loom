---
type: req
id: rq_01KTE5GHS6J048DJMS0CZJ568C
title: Refactor VS Code Extension to Use MCP — Requirements
status: locked
created: 2026-06-06
updated: 2026-06-06
version: 4
design_version: 1
tags: []
parent_id: de_01KQYDFDDFZT3CVEBS43EJHVWT
requires_load: []
---
# Refactor VS Code Extension to Use MCP — Requirements

### ✅ Included

- `IN1` Add an `mcp-client.ts` stdio MCP client wrapper to the extension.
- `IN2` The tree view reads state via the `loom://state` resource instead of calling `getState()`.
- `IN3` Commands and mutations route through `loom_*` tools and workflow prompts instead of calling app use-cases directly.
- `IN4` All direct imports from `packages/app/` are removed from the extension.

### ❌ Excluded

- `EX1` Live VS Code Extension Host testing — deferred to a later test plan.
- `EX2` Domain logic in the extension — validation, state consistency, and reducer logic stay in app/MCP.

### ⛓ Constraints

- `C1` Dependency direction is `vscode → mcp → app → core + fs`; the extension never imports `app` directly.
- `C2` The MCP client wrapper exposes exactly: `readResource(uri)`, `callTool(name, args)`, `callPrompt(name, args)`.