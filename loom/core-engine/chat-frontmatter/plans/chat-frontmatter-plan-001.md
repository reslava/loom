---
type: plan
id: chat-frontmatter-plan-001
title: "Chat doc frontmatter schema"
status: done
created: 2026-04-29
version: 1
tags: []
parent_id: chat-frontmatter
child_ids: []
requires_load: []
target_release: "0.5.0"
actual_release: null
---

# Chat doc frontmatter schema

## Context

The `ChatDoc` type, `DocumentType: 'chat'`, `createBaseFrontmatter`, and `saveDoc` are already fully implemented. `loom_create_chat` writes correct frontmatter for new chat docs. The only gap is **existing chat files** that pre-date this infrastructure — they have no frontmatter, so `loadDoc` throws on them and `buildLinkIndex` silently skips them.

One scoping note: `findDocumentById` in `packages/fs` already resolves by filename (`{id}.md`), so `loom_generate_chat_reply` works correctly once the file has the right name — no changes needed there.

## Steps

| # | Step | Status | Files |
|---|------|--------|-------|
| 1 | Audit all existing `-chat.md` files to identify which lack frontmatter | ✅ | `loom/**/*-chat.md` |
| 2 | Write migration script that prepends canonical `type: chat` frontmatter to every chat file missing it (idempotent — skip files that already have valid frontmatter) | ✅ | `scripts/migrate-chat-frontmatter.ts` |
| 3 | Run the migration script against the repo and verify no `[buildLinkIndex] Skipping` warnings remain for chat files | ✅ | all `loom/**/*-chat.md` |
| 4 | Add `chat-frontmatter-chat.md` (this thread's own chat file) as the first migrated file — use it to validate the round-trip through `loadDoc` → `buildLinkIndex` | ✅ | `loom/core-engine/chat-frontmatter/chats/chat-frontmatter-chat.md` |
