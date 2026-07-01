---
type: design
id: de_01KQYDFDD9VDV3GBT0DBVH15RE
title: Showing Docs Loaded Visibility
status: done
created: 2026-05-04
updated: 2026-05-08
version: 3
idea_version: 3
tags: []
parent_id: id_01KQYDFDD9AE2306D37KA2WNA3
requires_load: []
---
# Showing Docs Loaded Visibility

## Goal

Define the visibility protocol so the user always sees what context the AI was given, for every AI operation.

## Architecture

### Visibility prefixes (already defined in CLAUDE.md)

| Prefix | Meaning | When |
|--------|---------|------|
| `📘` | Global ctx loaded | Session start |
| `🌟` | Vision + workflow loaded | Session start |
| `🧵` | Active threads listed | Session start |
| `📡 MCP:` | MCP resource read | Any `loom://` resource load |
| `🔧 MCP:` | MCP tool call | Before any `loom_*` tool |
| `📄` | File/doc read | Any doc loaded for context |
| `⚠️ MCP unavailable` | MCP fallback | Direct file edit fallback |

### Per-operation rules

#### Session start
```
📘 loom-ctx loaded — global context ready
🌟 vision + workflow loaded
🧵 Active: {thread list}
```

#### chat_reply (first in thread)
```
📡 MCP: loom://thread-context/{weave}/{thread}
📄 {thread}-idea.md — loaded for context
📄 {thread}-design.md — loaded for context
📄 {plan-id}.md — loaded for context (if active plan exists)
```

#### chat_reply (subsequent, no context change)
```
🔧 MCP: loom_append_to_chat(id="{chat-id}")
```
No doc-loaded lines — context already in conversation.

#### refine
```
📡 MCP: loom://thread-context/{weave}/{thread}
📄 {parent-doc}.md — loaded as current parent
📄 {doc}.md — loaded for refinement
```

#### do-step
```
📡 MCP: loom://thread-context/{weave}/{thread}
📄 {plan-id}.md — current plan, Step {N}
```

#### requires_load
```
📄 {doc-id}.md — read as required by {parent-doc}
```

### Rule placement in CLAUDE.md

These rules go under "Chat docs are the conversation surface" section, with a new subsection "Visibility protocol." The existing visibility prefixes section stays — this design extends it with operation-specific rules.

### Non-goal

This is a CLAUDE.md rules update only. No code, no MCP tool changes, no VS Code UI. The AI follows the rules; the user reads the output.