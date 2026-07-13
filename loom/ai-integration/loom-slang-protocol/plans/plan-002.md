---
type: plan
id: pl_01KXAT82AWD8CG9QQJFNWF8HNB
title: loom-slang-protocol Plan
status: done
created: 2026-07-12
updated: 2026-07-12
version: 1
design_version: 1
tags: []
parent_id: de_01KX93MWNFW1BVNFCDNM07RSA4
requires_load: []
target_version: 0.1.0
actual_release: 1.24.0
steps:
  - id: extended-the-slang-so-that-reading
    order: 1
    status: done
    description: "Extended the `read` slang so that reading a chat doc with a pending user turn implies `reply` (fuses read→reply); non-chat docs and already-answered chats stay load-only — updated the `read` row, the standalone-verbs note, and added an explicit read→reply chain in loom/refs/loom-slang-reference.md, and mirrored the rule into the `read` bullet of both CLAUDE.md and the LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts (rule:loom-slang marker preserved on both)."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# loom-slang-protocol Plan

## Goal

Extended the `read` slang so that reading a chat doc with a pending user turn implies `reply` (fuses read→reply); non-chat docs and already-answered chats stay load-only — updated the `read` row, the standalone-verbs note, and added an explicit read→reply chain in loom/refs/loom-slang-reference.md, and mirrored the rule into the `read` bullet of both CLAUDE.md and the LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts (rule:loom-slang marker preserved on both).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Extended the `read` slang so that reading a chat doc with a pending user turn implies `reply` (fuses read→reply); non-chat docs and already-answered chats stay load-only — updated the `read` row, the standalone-verbs note, and added an explicit read→reply chain in loom/refs/loom-slang-reference.md, and mirrored the rule into the `read` bullet of both CLAUDE.md and the LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts (rule:loom-slang marker preserved on both). | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
