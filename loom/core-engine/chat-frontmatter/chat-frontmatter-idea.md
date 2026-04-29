---
type: idea
id: chat-frontmatter
title: "Chat doc frontmatter schema"
status: done
created: 2026-04-28
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---

# Chat doc frontmatter schema

## Problem

Chat docs (`-chat.md`) currently have no frontmatter. This makes them invisible to the link index and to MCP tools that need to resolve a chat doc by ID (e.g. `loom_generate_chat_reply`).

The `buildLinkIndex` function already logs warnings for every chat file it encounters:
> `Skipping ...-chat.md: Invalid frontmatter: Missing required field: type`

## Proposed solution

Add a `chat` doc type to the schema with minimal frontmatter:

```yaml
---
type: chat
id: {thread-id}-chat
title: "Human Readable Title"
status: active
created: YYYY-MM-DD
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
```

`parent_id` is `null` by default — no typed thread reference required. The link index simply recognises `type: chat` as a valid doc and includes it in the graph.

## Scope

- Add `chat` to the `DocType` union in `packages/core/`
- Update `buildLinkIndex` to accept `type: chat` without warnings
- Update `loom_generate_chat_reply` to resolve chat doc by `id` field
- Update `loom_create_doc` to support `type: chat`
- Migrate existing `-chat.md` files to add frontmatter (or provide a migration script)
