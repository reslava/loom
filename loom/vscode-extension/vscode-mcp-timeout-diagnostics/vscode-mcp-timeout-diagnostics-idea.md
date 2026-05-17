---
type: idea
id: id_01KRT2KXX9D5QW6GDCRBFSA6HS
title: Diagnose MCP timeout root cause via instrumentation
status: draft
created: "2026-05-17T00:00:00.000Z"
updated: "2026-05-17T00:00:00.000Z"
version: 2
tags: []
parent_id: null
requires_load: []
---
# Diagnose MCP timeout root cause via instrumentation

## Problem

Three "fixes" have shipped against the `MCP timed out` symptom — state cache, connect-failure propagation, refresh-tree retry (`vscode-mcp-timeout` thread, done in 0.x). The timeout still occurs. That means our model of the cause is wrong, and we are blind to which:

- Which URI/tool times out (state? thread-context? a tool call?)
- Whether the server received the request at all
- Whether the server was rebuilding state, idle, or stuck
- How many `fs.watch` events a single DoStep actually fires
- Whether the cache is hit, missed, or repeatedly invalidated mid-rebuild
- How long `getState()` takes on the current `loom/` (which has grown since the cache design was written)

Every fix so far has been a theory tested against a symptom we cannot measure. That is why they keep missing.

## Idea

**Do not propose another fix. Observe first.** Add bi-directional instrumentation — client logs every `readResource` / `callTool` with timing and in-flight count; server logs every cache event and state read to stderr; the client pipes child stderr into a "Loom MCP" output channel so both streams are time-ordered in one place. Reproduce the freeze once with instrumentation live, then diagnose from the captured log.

Three hypotheses worth pre-registering so we do not rationalize the evidence afterward:

1. **Cache thrashing (most likely):** `fs.watch` event storm during a DoStep invalidates the cache faster than it can rebuild, so `readResource` waits on a perpetually-rebuilding state.
2. **Transport stall / lost message:** server is idle, but a client request never reaches it or its response is never delivered.
3. **Child process died silently:** stderr shows a crash or exit, then nothing. Today this looks identical to a hang because we do not watch the child's exit.

The log picks one. Then the *real* fix lives in a separate thread.

## Why now

Three patches deep without a measurement is the signal. The cost of one diagnostic plan is small; the cost of a fourth blind patch is masking the real bug a fourth time and making it harder to find next round.

## Vision check

Serves "AI works in a terminal window showing process (streaming) and letting user view and interact" — a frozen tree breaks the *interact* part. The manual step removed: "developer restarts VS Code to recover." Not a new feature; making an existing one actually work.

## Next step

design
