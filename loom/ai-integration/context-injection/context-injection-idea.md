---
type: idea
id: id_01KQYDFDD8QAB8TD0JXC8D31J4
title: Context Injection for Chats
status: done
created: "2026-05-04T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Context Injection for Chats

## Problem

When AI replies in a chat (`chat_reply`), it reads only the chat doc + the new user message. It does not automatically get the parent thread's context (idea, design, active plan). The user has to manually explain what they want the AI to know — defeating the purpose of structured docs as shared context.

## Idea

Define when and how context is injected for each AI operation so the AI always has the right docs without the user re-explaining.

**Core rule: inject once per session per thread, not on every chat_reply.**

| Operation | Context injected |
|-----------|-----------------|
| Session start | Global ctx + vision + workflow |
| `chat_reply` (first in session for this thread) | Thread: idea + design + active plan |
| `chat_reply` (subsequent, same session) | Delta only (new user message + chat doc) |
| `chat_reply` (after refine/generate in same session) | Re-inject full thread context |
| `promote` (chat → idea/design/plan) | Source chat + thread context |
| `refine` (any doc) | Doc being refined + all stale parents |
| `do-step` | Full thread context (via `do-next-step` prompt) |

**Why once per session:** context docs rarely change mid-session. Re-injecting every reply wastes tokens.

## Why now

The session start protocol already injects global context. Thread-level injection is the natural next layer. Without it, chats feel stateless.

## Open questions

- How to detect "context changed mid-session"? → Flag: if `loom_refine` or `loom_generate_*` was called since last chat_reply, re-inject.
- Should injection be visible to the user? → Yes, see `showing-docs-loaded` thread.

## Next step

design