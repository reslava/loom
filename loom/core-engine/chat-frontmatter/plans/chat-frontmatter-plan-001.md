---
type: plan
id: pl_01KQYDFDDBT6CPRA4A4SAA74XR
title: Chat doc frontmatter schema
status: done
created: "2026-04-29T00:00:00.000Z"
version: 1
tags: []
parent_id: id_01KQYDFDDAPGGZTSF7JATTKQ20
requires_load: []
target_release: 0.5.0
actual_release: null
---

# Chat doc frontmatter schema

## Context

The `ChatDoc` type, `DocumentType: 'chat'`, `createBaseFrontmatter`, and `saveDoc` are already fully implemented. `loom_create_chat` writes correct frontmatter for new chat docs. The only gap is **existing chat files** that pre-date this infrastructure — they have no frontmatter, so `loadDoc` throws on them and `buildLinkIndex` silently skips them.

One scoping note: `findDocumentById` in `packages/fs` already resolves by filename (`{id}.md`), so `loom_generate_chat_reply` works correctly once the file has the right name — no changes needed there.

## Steps

