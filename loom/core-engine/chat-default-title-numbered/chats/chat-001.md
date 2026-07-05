---
type: chat
id: ch_01KWRR14WXNV8W4YPKTYT2WSM2
title: chat-default-title-numbered Chat
status: done
created: 2026-07-05
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 1
---
# chat-default-title-numbered Chat

## Rafa:

Currently default title for chats are:
`{threadSlug} Chat`
this way all chats created with default name under a thread have same Title

Better we should use:
`{threadSlug} Chat {NNN}`
being `NNN` the chat filename number

Check if this is simple enough to be done via `loom_quick_ship`
If so, do it

## AI:

Yes — simple enough for `loom_quick_ship`, and it's done.

**Where the title comes from.** Default chat titles are minted in exactly one place: `packages/app/src/chatNew.ts`. The MCP `loom_create_chat` tool is a thin delegate to it, so there was only one line to change — no risk of a second code path drifting.

**The change.** The filename ordinal was already being computed (`nextOrdinal` → `chat-NNN.md`). I hoisted it into a variable and reused it for the title:

```ts
const ordinal = nextOrdinal(existingFiles, 'chat');
const chatFilename = chatFileName(ordinal);
...
const title = input.title || `${scopeId} Chat ${formatOrdinal(ordinal)}`;
```

`formatOrdinal` is the same zero-padding used for the filename, so the title's NNN is guaranteed to match the file's NNN. An explicitly-passed title still wins (unchanged).

**Verified** against the built `dist`:

| filename | default title |
|---|---|
| chat-001.md | `refs Chat 001` |
| chat-002.md | `refs Chat 002` |
| chat-003.md | `refs Chat 003` |
| chat-004.md (explicit) | `Custom` |

**Recorded** as done plan `plan-001` in this thread via quick-ship, so it lands in versioned/roadmap history with an `actual_release` slot for the next release.

One note for honesty: the live MCP server in this session was built *before* this change, so a `loom_create_chat` call *right now* would still use the old title until the session/MCP restarts — the fix is compiled into `dist` and will take effect on the next server start. New chats created from the extension after a Reload Window will show the numbered title.