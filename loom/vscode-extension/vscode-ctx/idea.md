---
type: idea
id: id_01KQZ2H5AHBR0C9AB1V54HSE17
title: Context Sidebar — Visible, Controllable MCP Context
status: done
created: "2026-05-06T00:00:00.000Z"
updated: "2026-05-06T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Context Sidebar — Visible, Controllable MCP Context

## Problem
Context injection into MCP tool calls is currently a black box. The user has no visibility into which docs the AI will receive, no way to add or remove docs from the context, and no sense of the token budget being consumed. This makes context management a manual, error-prone process.

## Idea
A sidebar panel below the main Loom tree that shows exactly which docs will be injected into the next MCP tool call. The panel has two sections: **Pinned** (auto-included: global ctx, active weave ctx, thread idea + design) and **Opt-in** (chats, reference docs — togglable). Each item shows a type badge and a token estimate. When the user triggers any MCP-backed command (DoStep, GeneratePlan, etc.), the extension reads the sidebar selection and passes `context_ids: string[]` to the tool call. The sidebar auto-refreshes when the tree selection changes.

## Why now
The vscode-mcp-refactor thread established the extension as a thin MCP client. The next UX layer is giving the user control over what the AI sees — this closes the loop between "AI has all context" and "user knows and controls what that context is."

## Open questions
None — decisions locked in vscode-ctx-chat-001:
- Token count: local estimator (chars/4), cached per doc, invalidated on file save.
- Pinned + opt-in layer.
- Injection: option (b) — `context_ids: string[]` param on MCP tools; server loads docs server-side.
- ULID fix: chat creation must go through `loom_create_chat` MCP tool.

## Next step
design