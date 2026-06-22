---
type: plan
id: pl_01KVR6JYWQY1F51ZVA22D3FQCE
title: Normalize chat append seam
status: done
created: 2026-06-22
updated: 2026-06-22
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 1.10.2
steps:
  - id: centralize-and-normalize-the-chat-append
    order: 1
    status: done
    description: Add appendChatBlock seam-normalizing helper to core and route both append paths through it
    files_touched: [packages/core/src/chatUtils.ts, packages/core/src/index.ts, packages/mcp/src/tools/appendToChat.ts, packages/app/src/chatReply.ts, tests/mcp-new-tools.test.ts]
    blocked_by: []
    satisfies: []
---
# Normalize chat append seam

## Goal

Fix the widening blank-line gap before `## AI:` headers caused by repeated `loom_append_to_chat` calls. The append seam (`${existingBody}\n\n## name\n\n${body}`) was never normalized, so trailing newlines on the previous block compounded with the literal separator. Centralize block-appending into one helper so the seam is always exactly one blank line before and after the header, and so the MCP and app write paths stop diverging in format.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add appendChatBlock seam-normalizing helper to core and route both append paths through it | packages/core/src/chatUtils.ts, packages/core/src/index.ts, packages/mcp/src/tools/appendToChat.ts, packages/app/src/chatReply.ts, tests/mcp-new-tools.test.ts | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:centralize-and-normalize-the-chat-append -->
### Step 1 — Centralize and normalize the chat append seam

New `appendChatBlock(existingBody, header, body)` in core: trims trailing whitespace off the existing body, strips leading newlines (not spaces — preserves first-line code indentation) and trailing whitespace off the new body, joins with exactly one blank line before the header and one after. Both `loom_append_to_chat` (MCP) and `chatReply` (app sampling path) now call it, removing the duplicated/divergent seam logic. Seam test added asserting no run of 3+ newlines ever forms across repeated appends.
