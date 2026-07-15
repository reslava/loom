---
type: plan
id: pl_01KXKV3Y5Z39FXBFKKTJKF6P7A
title: Roadmap thread-click opens the latest open chat first
status: done
created: 2026-07-15
updated: 2026-07-15
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: reworked-resolvethreaddocpath-packages-vscode-src-tree
    order: 1
    status: done
    description: "Reworked resolveThreadDocPath (packages/vscode/src/tree/treeProvider.ts) so clicking a roadmap thread node prefers the latest still-open chat (status 'active', latest by created date then id) before falling back to design → idea → thread.md — so clicking a thread resumes the live conversation instead of always opening the spec. Status-gated: done/archived chats are skipped, so a wrapped-up thread degrades to the spec. Single caller (roadmap thread-click), so nothing else changes. Built, typechecked, and ran the suite (23/23) green."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Roadmap thread-click opens the latest open chat first

## Goal

Reworked resolveThreadDocPath (packages/vscode/src/tree/treeProvider.ts) so clicking a roadmap thread node prefers the latest still-open chat (status 'active', latest by created date then id) before falling back to design → idea → thread.md — so clicking a thread resumes the live conversation instead of always opening the spec. Status-gated: done/archived chats are skipped, so a wrapped-up thread degrades to the spec. Single caller (roadmap thread-click), so nothing else changes. Built, typechecked, and ran the suite (23/23) green.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Reworked resolveThreadDocPath (packages/vscode/src/tree/treeProvider.ts) so clicking a roadmap thread node prefers the latest still-open chat (status 'active', latest by created date then id) before falling back to design → idea → thread.md — so clicking a thread resumes the live conversation instead of always opening the spec. Status-gated: done/archived chats are skipped, so a wrapped-up thread degrades to the spec. Single caller (roadmap thread-click), so nothing else changes. Built, typechecked, and ran the suite (23/23) green. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
