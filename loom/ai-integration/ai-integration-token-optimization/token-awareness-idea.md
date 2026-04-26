---
type: idea
id: token-awareness-idea
title: "Token Consumption Awareness"
status: deferred
created: 2026-04-23
version: 1
tags: [ai, tokens, observability, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Token Consumption Awareness

## Problem

Token usage in Loom AI operations is currently invisible. Users have no feedback on how much
context each operation consumes, which makes it hard to reason about costs or optimize `load_when`
and `requires_load` configurations.

## Hypothesis

Loom sessions should be cheaper than ad-hoc chat windows over time — `requires_load` creates
intentional, bounded context instead of user-pasted fragments. But this is unverifiable without
data.

## Proposed Direction

- Log token usage per AI operation (input tokens, output tokens, model) to a local log file
  (e.g., `.loom/token-log.jsonl`).
- Expose a `loom tokens` CLI command showing usage summary (total per day, per operation type,
  per weave).
- VS Code status bar shows tokens used in the current session.

## Why Deferred

Token usage is currently acceptable for the use cases implemented. This becomes important at scale
or when multiple team members share a workspace. Implement after MVP release when real usage data
is available.
