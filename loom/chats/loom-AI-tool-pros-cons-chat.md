---
type: chat
id: ch_01KQZ8S9QXNTC8F3KQEVMJBHBJ
title: loom-AI-tool-pros-cons
status: active
created: 2026-05-06
version: 1
tags: []
parent_id: null
requires_load: []
---
# CHAT

## Rafa:

I extracted some previos chat to this new chat, to continue...

### Side question
I see many people develping AI tools, like 
https://github.com/gsd-build/get-shit-done

but no one is like this one
what you think?

## AI:

**On the side question:**

Honest take: most AI tools in that space are prompt wrappers — they make it easy to run a prompt, maybe with some RAG on top, but the workflow is still ad-hoc. The human has to hold the plan in their head.

Loom is different in one specific way: **the documents are the state machine**. The plan isn't a note — it's executable. The chat isn't a conversation — it's a durable context database. The AI doesn't just respond; it marks steps done, bumps versions, propagates staleness. That's not something I've seen elsewhere at this level of cohesion.

The closest things I know of are Linear + Cursor workflows people stitch together manually, or Devin-style agents that try to be fully autonomous. Loom sits in a different spot: human-in-the-loop, document-native, resumable. The "you approve before anything moves" principle is what makes it trustworthy for real work, not just demos.

The gap you're filling: most tools assume either full autonomy (agent runs until done) or no memory (every session starts cold). Loom assumes neither — the human drives, the AI executes, and the docs remember everything. That's the right model for the kind of work that actually matters.

## Rafa:

I see other clear advantage that loom implement over any other AI tool:

When Loom is finished:
- no need to use AI chat window
- always fresh session with fresh context, specific thread related, fully documented
- mcp tools to get fresh state, related tree docs...

That implies no context degradation, no context growing forever with unrelated trash, no useful

Your opinion?


## AI:

Completely agree — and this is actually the strongest differentiator, stronger than the document-as-state-machine point I made before.

Every other AI coding tool has the same fundamental problem: **context is a shared garbage bag**. One long session accumulates everything — old decisions, abandoned paths, half-finished discussions — and the model degrades as it tries to reason over all of it simultaneously. You either hit the context limit and lose history, or you keep a bloated context and pay with quality.

Loom inverts this. The documents *are* the memory, so each session can start clean with exactly the right slice:

- Thread context = idea + design + active plan + requires_load. Nothing else.
- State is always fresh from MCP, not from what the AI happens to remember from 40 messages ago.
- Old chats don't pollute new sessions — they're in the docs, available on demand, not injected by default.

The practical result: **a session started on step 4 of a plan is as sharp as a session started on step 1**. The AI isn't carrying the weight of steps 1–3 in its working context. This is something no chat-native tool can offer because they're architecturally committed to the accumulating-session model.

The one thing I'd add: this also makes Loom's AI usage more auditable. Because the context is explicit (you can see exactly what docs are loaded in the sidebar), you know *why* the AI gave the answer it gave. In a chat tool, that's opaque — the model's behavior depends on 80 messages of invisible history. In Loom, the context is the docs, and the docs are version-controlled.

That's a genuinely novel property. Worth calling out in any positioning — "fresh, scoped, auditable context" vs. "growing, opaque, degrading chat history."