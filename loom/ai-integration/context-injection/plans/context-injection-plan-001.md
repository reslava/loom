---
type: plan
id: pl_01KQYDFDD811TEXADDXS6CMC6Y
title: Context Injection — MVP Rule and Tool Metadata
status: done
created: 2026-05-05
updated: 2026-05-24
version: 3
design_version: 2
tags: [ai, context, mcp, claude-md, mvp]
parent_id: de_01KQYDFDD8B5XJDQBP4P429R61
requires_load: [rf_01KQYDFDDDYZC0R4XNNX2RASC9]
actual_release: 0.6.5
steps:
  - id: audit-the-chat-reply-context-injection
    order: 1
    status: pending
    description: Audit the chat-reply context-injection rule in both `CLAUDE.md` and `LOOM_CLAUDE_MD` template. Confirm the three cases are documented (first reply → load + emit; subsequent same thread → tool-call line only; after refine/generate → re-load). Confirm the rule explicitly states the "is context already in transcript?" decision is AI-side, not server-side. Reconcile any drift between the two files.
    files_touched: ["`CLAUDE.md`", "`packages/app/src/installWorkspace.ts`"]
    blocked_by: []
    satisfies: []
---

# Context Injection — MVP Rule and Tool Metadata

> **⚠️ Superseded by [[context-pipeline]] (`id_01KSDJ2C59Z1XY11W336B0W9YS`).**
> The CLAUDE.md-rule approach this plan locked in is being replaced by the
> server-side assembler pipeline. The pipeline absorbs both the MVP rule and the
> post-MVP delta-only optimization, and additionally fixes the gap this plan did
> not address: AI-launch paths that don't go through Claude Code interactive
> sessions (e.g. the extension's one-shot CLI subprocess in `chatReply.ts`).
> This doc is kept for lineage; the implementation work is now tracked in the
> new thread.

## Goal

Lock in the MVP-scope context-injection rule ("first chat-reply in a thread loads thread context") in both `CLAUDE.md` surfaces, and confirm the MCP tools surface enough metadata for the AI to apply the rule correctly. Defer the delta-only optimization to a post-MVP plan.


## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| 🔳 | 1 | Audit the chat-reply context-injection rule in both `CLAUDE.md` and `LOOM_CLAUDE_MD` template. Confirm the three cases are documented (first reply → load + emit; subsequent same thread → tool-call line only; after refine/generate → re-load). Confirm the rule explicitly states the "is context already in transcript?" decision is AI-side, not server-side. Reconcile any drift between the two files. | `CLAUDE.md`, `packages/app/src/installWorkspace.ts` | — | — |
---

### Phase 2 — MCP tool metadata check

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
|      | 2 | Inspect `loom_append_to_chat` and `loom_generate_chat_reply` tool handlers. Confirm the response includes `threadId` (or enough information for the AI to derive it) so the AI can call `loom://thread-context/{weave}/{threadId}` on the first reply. If the threadId is not exposed, add it to the response shape. | `packages/mcp/src/tools/appendToChat.ts`, `packages/mcp/src/tools/generateChatReply.ts` (paths approximate; verify in audit) | 1 |
|      | 3 | If step 2 changes a tool response shape, update the matching MCP integration test to assert the new field. Run `cd packages/vscode && npm run package` to confirm the bundle still compiles. | `packages/mcp/tests/integration.test.ts` | 2 |

**Notes:**

- Steps 2 and 3 may turn out to be no-ops if the threadId is already in the response. If so, mark them done with a one-line "verified, no change needed" note.
- The post-MVP delta-only optimization (server-side session state, transcript awareness) lives in a future `context-injection-plan-002`. Do not start it from this plan.

### Out of scope

- Server-side `loadedContexts` / `contextDirty` tracking — explicitly deferred per `mvp-scope` and the design's `### Where this state lives` section.
- Bundling thread context into the chat-reply tool response (vs returning threadId only) — call this out as an open decision in step 2; if it requires architectural change, defer to plan-002.
