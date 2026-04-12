---
type: idea
id: workflow-new-chat-doc-type
title: "Document-Driven AI Workflow System (Refined Vision)"
status: draft
created: 2026-04-11
version: 1.0.0
tags: []
parent_id: null
child_ids: []
requires_load: []
---

### 💬 New Idea: Informal Chat Documents (`-chat.md`)

This is an interesting one. Let me give you my honest take.

**What you're proposing:**
- A new file type: `{name}-chat.md`
- Location: `.ws/chats/` (outside the workflow engine's feature directories)
- No frontmatter, no state machine, no events.
- Informal, free-form conversation log.
- Visible in the VS Code tree view as a separate node.

**Is it useful?**

| Pros | Cons |
|------|------|
| Provides a place for off-topic or exploratory chats that don't belong in a feature design. | Adds a second "kind" of chat to the system, potentially confusing users about where to put conversations. |
| Keeps `design.md` focused on feature-specific decisions. | The system is built around structured documents; introducing a schema-less file type breaks the consistency. |
| Could serve as a personal journal or scratchpad. | The VS Code extension already has a "Chat" panel (Continue, etc.). Why duplicate it in files? |

**My recommendation:** **Hold off on this for now.**

Here's why:
1. The core value of Reslava is **structured, stateful collaboration**. Adding a "no rules" document type dilutes that focus.
2. If a user wants informal chat, they already have Continue's chat panel, which persists history. Adding file-based chat creates redundancy.
3. If you *really* need a scratchpad that's version-controlled, you can already create an `idea.md` with `status: draft` and just not promote it to a design. It can live in a `_sandbox/` feature folder.

**If you still want it later:**
It's trivial to add. The extension can simply display any `.md` file in `.ws/chats/` as a "Chat" node. No engine changes required. We can revisit this post-MVP.
