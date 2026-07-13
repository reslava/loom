---
type: idea
id: id_01KXE4P6ARJ35TMWQ93EQWE7CH
title: Show the AI's active thread in the extension tree
status: draft
created: 2026-07-13
version: 1
tags: []
parent_id: null
requires_load: []
---
# Show the AI's active thread in the extension tree

## What we want to build

A visible marker in the Loom tree showing **which thread is the AI's current "active thread"** — the thread the agent most recently `load`ed this session and against which bare-filename `read`/`reply` slang resolves. A small badge / highlight / dot on that thread node, updating when the agent switches.

## Why it matters

The active-thread concept was introduced in [[loom-slang-protocol]] (the `load` / `read` / `reply` split): `load` makes a thread active and every later doc-only `read`/`reply` rides it. But that pointer lives **only in the AI's context** — the user cannot see which thread the agent is currently holding. That is a blind spot:

- The user can't confirm the agent is operating on the thread they think it is.
- A wrong or stale active thread (agent still pointed at thread-A after the user moved on) is invisible until it produces a confusing answer.
- It closes the User↔AI loop: the extension already shows thread *state*; the active thread is the one piece of live agent state it can't show.

Serves the vision element of the extension as the *visual bridge between User ↔ Loom ↔ AI* — surfacing agent state the user would otherwise have to infer.

## The core constraint (why this is non-trivial)

The MCP server is **stateless** and the extension is **blind to the agent's context window** — neither can *infer* the active thread. So the agent must **publish** it somewhere the extension can watch. The active thread is AI-held; making it visible means giving the AI a way to write it out.

## Design sketch (to settle in design — not decided here)

- **Publish channel:** on each `load`, the agent writes the active thread to a tiny workspace state file (e.g. `.loom/_active-thread.json`: `{ threadUlid, weaveSlug, threadSlug, at }`) via a small new MCP tool (e.g. `loom_set_active_thread`) + fs write. The extension watches that file and decorates the matching tree node.
- **Contract tie-in:** the `load` slang already emits `🧵 Active: {weave}/{thread}`; the tool call would be the machine-readable twin of that line, added to the `load` chain in the slang reference + CLAUDE.md.
- **Tree decoration:** a `TreeItemDecoration` / badge / description suffix on the active thread node; cleared when nothing is active or the file is stale.

## Open questions (for design)

- **Multi-session:** several agent sessions can run at once, each with its own active thread. A single global `.loom/_active-thread.json` slot can't represent that faithfully — do we key by session/PID, show the most-recent, or accept a single-slot approximation? This is the hardest question and may gate whether the feature is worth it.
- **Reliability:** the marker is only as good as the agent's discipline in calling the publish tool on every `load`. Is a contract rule enough, or does something need to enforce it?
- **Staleness:** when a session ends, the file lingers. TTL, a heartbeat, or clear-on-next-session?
- **Scope check:** is a single-slot "last active thread" marker still useful even if imperfect for multi-session? If yes, ship the simple version; if the multi-session story is essential, the cost rises.

## Success criteria

- The active thread is visibly marked in the tree and updates when the agent switches threads.
- Degrades gracefully: no marker when nothing is active; no crash on a stale/missing file.
- The publish path is one small MCP tool + one fs write + one tree decoration — if it can't stay that small, reconsider.

## Dependencies

Builds directly on [[loom-slang-protocol]]'s active-thread concept (the `load` verb). No point shipping this before that split is real (it now is — plan-003 done).