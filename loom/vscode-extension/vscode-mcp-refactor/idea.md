---
type: idea
id: id_01KQYDFDDFT9EE8KH1TWJ7G0B2
title: Refactor VS Code Extension to Use MCP
status: done
created: "2026-04-27T00:00:00.000Z"
version: 1
tags: [vscode, mcp, architecture, refactor]
parent_id: null
requires_load: [rf_01KQYDFDDDMS4N0V9G73MNV5JR]
---

# Refactor VS Code Extension to Use MCP

## Why this matters

The VS Code extension currently calls the `app` layer directly for operations like loading state, creating docs, and managing workflows. This creates a direct dependency on the app layer's internal structure and logic.

In Stage 2 (MCP active), the extension should become a thin UI client that communicates exclusively through MCP—the same interface that Claude Code uses. This gives us:

- **Single source of truth:** Both UI and Claude Code use the same protocol
- **Decoupling:** Extension doesn't depend on app internals
- **Testability:** MCP interface is stable and documented
- **Consistency:** All surfaces (CLI, extension, Claude Code) route through one gate

## Current state

- Extension has direct imports from `packages/app/`
- Tree provider reads state via `getState()` (app function)
- Commands call app use-cases directly
- No MCP awareness in extension code

## Target state

- Extension has no imports from `packages/app/`
- All state reads go through `loom://state` resource
- All mutations go through `loom_*` tools or prompts
- Extension is a thin UI wrapper around MCP protocol

## Why now

Many extension issues (state sync, command registration, UI polish) stem from the mixed architecture. Once the refactor is done, the extension becomes much simpler and more robust. Also, this validates MCP as a viable interface for all clients.
