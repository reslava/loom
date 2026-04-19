---
type: plan
id: draft-threads-plan-001
title: "Implement Draft Threads (Unfinalized Ideas as Threads)"
status: deferred
created: 2026-04-19
version: 1
tags: [thread, idea, domain-model, deferred]
parent_id: draft-threads-design
target_version: "0.6.0"
requires_load: [draft-threads-design]
---

# Plan — Implement Draft Threads

| | |
|---|---|
| **Created** | 2026-04-19 |
| **Status** | DEFERRED |
| **Design** | `draft-threads-design.md` |
| **Target version** | 0.6.0 |

---

# Goal

Modify the domain model and filesystem layer to treat directories containing only an unfinalized idea as valid draft threads. This ensures ideas are immediately visible in the CLI and VS Code tree view.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Make `Thread.design` optional | `packages/core/src/entities/thread.ts` | — |
| 🔳 | 2 | Update `getThreadStatus` and `getThreadPhase` | `packages/core/src/derived.ts` | Step 1 |
| 🔳 | 3 | Modify `loadThread` to return draft threads | `packages/fs/src/repositories/threadRepository.ts` | Steps 1, 2 |
| 🔳 | 4 | Relax `validateSinglePrimaryDesign` | `packages/core/src/validation.ts` | Step 1 |
| 🔳 | 5 | Update CLI `status` to show draft indicator | `packages/cli/src/commands/status.ts` | Step 3 |
| 🔳 | 6 | Update VS Code tree provider for draft threads | `packages/vscode/src/tree/treeProvider.ts` | Step 3 |
| 🔳 | 7 | Run full test suite | All packages | All |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |