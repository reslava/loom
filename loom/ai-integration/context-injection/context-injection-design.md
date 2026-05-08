---
type: design
id: de_01KQYDFDD8B5XJDQBP4P429R61
title: Context Injection for Chats
status: done
created: "2026-05-04T00:00:00.000Z"
updated: 2026-05-08
version: 3
tags: []
parent_id: id_01KQYDFDD8QAB8TD0JXC8D31J4
requires_load: []
---
# Context Injection for Chats — Design

## Goal

Design the context injection rules so every AI operation receives the right docs, automatically, without the user re-explaining.

## Architecture

### Three-tier injection model

```
Global (session start)
  └─ loom-ctx.md + requires_load: [vision, workflow]
Weave (first access)
  └─ weave ctx doc (if exists)
Thread (first chat_reply, promote, refine, do-step)
  └─ idea + design + active plan + requires_load docs
```

### Per-operation rules

#### `chat_reply`

```
IF first reply in this thread this session:
  LOAD thread context (idea, design, active plan)
  LOAD requires_load docs
  EMIT visibility prefixes (see showing-docs-loaded design)
ELSE IF context changed (refine/generate happened):
  RE-LOAD full thread context
ELSE:
  SEND delta only (new ## Rafa: section)
```

#### `refine`

```
LOAD doc being refined
LOAD its current parent doc (idea for design, design for plan)
LOAD thread context for additional context
```

#### `promote`

```
LOAD source chat/doc
LOAD target thread context (so the generated doc fits the design)
```

#### `do-step`

```
LOAD full thread context (via do-next-step prompt)
LOAD requires_load docs from plan and design
```

### Where this state lives

The "is this thread's context already loaded?" question is **AI-side**, not server-side.

- The MCP `chat_reply` / `loom_append_to_chat` tool **always** returns the full thread context (idea + design + active plan + `requires_load` docs). It is stateless across calls.
- The **AI** decides whether to actually re-read those docs or just reference what it already has in its conversation transcript:
  - First reply for this thread in the current conversation → read full context, emit doc-loaded visibility lines.
  - Same thread, no `refine` / `generate` since last reply → context is already in transcript; do not re-read; emit only the tool-call visibility line.
  - Same thread, but a `refine` or `generate` happened since last reply → re-read full context, emit visibility lines again.

This is a CLAUDE.md rule, in the same family as the visibility rules. It avoids:

- Defining "session" on the server (the MCP server is a stdio process — its lifetime does not align with a Claude Code conversation).
- Tracking LLM transcript contents on the server (the server cannot see them).

### MVP scope

For MVP, the optimization above is **deferred**. The MVP rule is simply: *first* `chat_reply` in a thread loads thread context. The "skip if already in transcript" optimization can be added once token cost has been measured as a real problem.

### Token efficiency (post-MVP)

Once the optimization ships, a typical thread (idea ~500 words, design ~800 words) saves ~1300 tokens per subsequent reply where context has not been mutated.