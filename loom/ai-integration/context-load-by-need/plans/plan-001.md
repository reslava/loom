---
type: plan
id: pl_01KWYNA01G1Y58ZZK64XATYHKX
title: context-load-by-need Plan
status: done
created: 2026-07-07
updated: 2026-07-07
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: sharpen-the-chat-reply-context-injection
    order: 1
    status: done
    description: "Sharpen the chat-reply context-injection rule in both CLAUDE surfaces: state that thread context loads up front, before diagnosing, and forbid the answer-from-code-then-backfill pattern (the \"context loaded at the wrong time\" failure) — mirrored in CLAUDE.md and the LOOM_CLAUDE_MD template, claude-md-sync.test.ts green."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# context-load-by-need Plan

## Goal

Sharpen the chat-reply context-injection rule in both CLAUDE surfaces: state that thread context loads up front, before diagnosing, and forbid the answer-from-code-then-backfill pattern (the "context loaded at the wrong time" failure) — mirrored in CLAUDE.md and the LOOM_CLAUDE_MD template, claude-md-sync.test.ts green.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Sharpen the chat-reply context-injection rule in both CLAUDE surfaces: state that thread context loads up front, before diagnosing, and forbid the answer-from-code-then-backfill pattern (the "context loaded at the wrong time" failure) — mirrored in CLAUDE.md and the LOOM_CLAUDE_MD template, claude-md-sync.test.ts green. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
