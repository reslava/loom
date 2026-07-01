---
type: idea
id: id_01KTVAC0FWPVY2EATC8VDM3EZP
title: Context Dispatcher — dedupe context injection across commands
status: done
created: "2026-06-11T00:00:00.000Z"
updated: 2026-06-11
version: 2
tags: []
parent_id: null
requires_load: []
---
# Context Dispatcher — dedupe context injection across commands

## What we want to build

A **single context-injection pipeline** — the *context dispatcher* — that every command routes through to load docs into the agent, and that injects **only what the agent doesn't already hold**, instead of re-sending the same bundle on every call.

Two pieces:
- **Context ledger** — the per-session record of which docs (`{id@version}`) the agent currently holds. Resets with every clean session.
- **Context dispatcher** — the one server-side path all context-injecting commands (`do_step`, `loom://context`, the context-assembler, future tools) go through. It diffs the request against the declared ledger and returns only the *delta*.

## Why it matters

Today context assembly is scattered and **re-injects redundantly**. `loom_do_step` re-sends the entire thread bundle (~6,700 tokens: global ctx + vision + workflow + idea + design + plan) on *every* call. In the step-CRUD session it was called 5×; steps 2–5 re-received a verbatim bundle already in the transcript — ~25k tokens of pure repeat. `loom_complete_step` / `loom_append_done` similarly echo the whole plan back each time.

The root cause is structural: the MCP server is **stateless across calls and cannot see the agent's transcript**, so the "is this already loaded?" decision is fuzzy AI judgment — and it's only wired into chat replies (`read_chat_tail` + cursor), not the workhorse `do_step` path. Chat replies were never the heavy path; the implement loop is.

This serves the vision directly — *"the AI as stateful as it can be via durable docs it rereads"* — but stops paying to reread what's already in context. It's an optimization of an existing behavior, not a new user capability: the win is token cost + latency in the loop you pay real money to run, plus collapsing scattered injection into one optimizable path.

## Success criteria

- Every context-injecting command routes through **one** pipeline (no per-tool reinvention of context assembly).
- A command re-invoked in the same session with **no doc changes** injects ~0 redundant context.
- Correctness is never sacrificed for the saving: a **changed doc** (version bump) or a **new session** re-injects correctly — no silent under-load. The unit is `{docId@version}`, never bare `docId`.
- (Stretch) the extension can display the current loaded-context ledger so users can *see* what the AI holds.

## Relation to prior work

Extends the chat-token-optimization shipped in 1.4.0 (`loom_read_chat_tail` + read-cursor) by generalizing "don't resend what's loaded" from the chat path to *all* context injection. Discussed in [[global-chat-004]]. Sits alongside the step tools in [[mcp-new-tools-idea]] / the step-CRUD work.
