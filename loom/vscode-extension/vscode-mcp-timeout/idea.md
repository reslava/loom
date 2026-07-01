---
type: idea
id: id_01KR1QRCXTATTTXKHRQSRG4CC2
title: Unify MCP timeout handling across all command paths
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-07T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Unify MCP timeout handling across all command paths

## Problem

The tree provider catches MCP timeout errors (`32001` / `'timed out'` in error message) and shows a "MCP timed out — click to reconnect" node with a reconnect command. But this detection only covers the `getRootChildren` path. When a tool call times out mid-operation (doStep, refine, chatReply, generate), each command has its own `catch` block that shows a plain error message — none offer the reconnect affordance. Timeout handling is inconsistent across the extension.

## Idea

Extract a shared `handleMcpError(e, treeProvider)` helper that checks for the timeout signature and, if matched, calls `disposeMCP()` + `treeProvider.refresh()` (which then shows the reconnect node) before throwing or showing the error message. Wire it into every command's catch block.

## Why now

Small, contained refactor. Improves UX for a known pain point (timeouts currently leave the user with a raw error and no recovery path from within the failing command).

## Next step

plan
