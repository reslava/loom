---
type: idea
id: thread-based-archive-filtering-idea
title: "Filtering Tooling for Thread‑Based Archive"
status: deferred
created: 2026-04-18
version: 1
tags: [cli, vscode, archive, filtering, ux, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Filtering Tooling for Thread‑Based Archive

## Problem
The thread‑based archive structure (`done/`, `deferred/`, `chats/` inside each thread) preserves context beautifully, but it makes it difficult to get a **global view** of all completed or deferred work. Without tooling, a user must manually traverse every thread directory to find, for example, all completed plans. The filesystem is organized for context, not for cross‑thread queries.

## Idea
Provide **filtering commands** in the CLI and **view filters** in the VS Code extension that aggregate documents across threads based on their archive state.

### CLI Commands

| Command | Description |
| :--- | :--- |
| `loom list --status done` | List all threads that have any document in `done/`. |
| `loom list --status deferred` | List all threads with deferred work. |
| `loom list --all` | Include archived threads from `_archive/`. |
| `loom status --include-done` | Show completed documents alongside active ones. |

### VS Code Extension

- Tree view can toggle visibility of `done/`, `deferred/`, and `chats/` sections.
- A "Show Archived" button reveals completed documents within each thread.
- QuickPick commands to jump to a specific completed document.

## Why Defer
- The core workflow and directory structure must stabilize first.
- The filtering logic depends on the thread‑based archive being fully implemented and populated.
- This is a productivity enhancement, not a blocker for the initial VS Code extension release.

## Open Questions
- Should `loom status` show a summary of archived documents by default, or only with a flag?
- How to handle performance when scanning many threads? (Link index can be extended to include archive state.)

## Next Step
Re‑evaluate after the thread‑based archive structure is implemented and the VS Code extension MVP is complete. Create `thread-based-archive-filtering-plan-001.md` when ready.

**Status: Deferred for post‑MVP consideration.**