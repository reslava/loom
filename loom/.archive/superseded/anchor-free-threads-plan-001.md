---
type: plan
id: anchor-free-threads-plan-001
title: "Implement Anchor‑Free Threads"
status: deferred
created: 2026-04-20
version: 1
tags: [thread, domain-model, graph, zero-friction, deferred]
parent_id: anchor-free-threads-design
target_version: "0.7.0"
requires_load: [anchor-free-threads-design]
supersedes: [draft-threads-plan-001]
---

# Plan — Implement Anchor‑Free Threads

| | |
|---|---|
| **Created** | 2026-04-20 |
| **Status** | DEFERRED |
| **Design** | `anchor-free-threads-design.md` |
| **Target version** | 0.7.0 |

---

# Goal

Transform Loom's thread model from a linear, design‑centric structure to a zero‑friction, graph‑based workbench. Any directory containing at least one Loom document is a valid thread, and relationships are established freely via `parent_id` links.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Redesign `Thread` entity (remove singular `idea`/`design`, add arrays) | `packages/core/src/entities/thread.ts` | — |
| 🔳 | 2 | Update `getThreadStatus` and `getThreadPhase` | `packages/core/src/derived.ts` | Step 1 |
| 🔳 | 3 | Modify `loadThread` to accept any document mix | `packages/fs/src/repositories/threadRepository.ts` | Steps 1, 2 |
| 🔳 | 4 | Remove `validateSinglePrimaryDesign` | `packages/core/src/validation.ts` | Step 1 |
| 🔳 | 5 | Update `getState` to work with new `Thread` structure | `packages/app/src/getState.ts` | Step 3 |
| 🔳 | 6 | Update CLI `status` command | `packages/cli/src/commands/status.ts` | Step 5 |
| 🔳 | 7 | Update VS Code tree provider | `packages/vscode/src/tree/treeProvider.ts` | Step 5 |
| 🔳 | 8 | Update all `app` use‑cases that reference `thread.design` | `packages/app/src/*.ts` | Step 1 |
| 🔳 | 9 | Run full test suite | All packages | All |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
