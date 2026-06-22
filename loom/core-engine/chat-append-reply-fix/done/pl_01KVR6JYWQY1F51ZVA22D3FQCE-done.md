---
type: done
id: pl_01KVR6JYWQY1F51ZVA22D3FQCE-done
title: Done — Normalize chat append seam
status: done
created: 2026-06-22
version: 1
tags: []
parent_id: pl_01KVR6JYWQY1F51ZVA22D3FQCE
requires_load: []
---
# Done — Normalize chat append seam

## Step 1 — Add appendChatBlock seam-normalizing helper to core and route both append paths through it

Added `appendChatBlock(existingBody, header, body)` to `packages/core/src/chatUtils.ts` (exported via `core/index.ts`): strips trailing whitespace from the existing body, strips only leading newlines (preserving first-line code indentation) plus trailing whitespace from the new body, then joins with exactly one blank line before the header and one after.

Routed both append paths through it:
- `packages/mcp/src/tools/appendToChat.ts` — replaced the raw `${existing}\n\n## name\n\n${body}` concat (root cause of the compounding blank lines).
- `packages/app/src/chatReply.ts` — replaced `doc.content.trimEnd() + '\n\n## name\n' + reply`, which also fixes its separate divergence (it omitted the blank line after the header).

Added a seam test to `tests/mcp-new-tools.test.ts`: repeated appends with trailing-newline-laden bodies, asserting no run of 3+ newlines forms, single blank line before/after each header, code indentation preserved, and empty-base → bare block.

Built with `build-all.sh`; full `test-all.sh` green (17/17 integration + all unit suites).
