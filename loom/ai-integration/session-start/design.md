---
type: design
id: de_01KWDB8SRZS3H5VP3PBVHYQQ0H
title: Cheap, scoped session start — design
status: done
created: 2026-06-30
version: 1
idea_version: 1
tags: []
parent_id: id_01KWDB80YJ6Q9AQ7CAQED83PV2
requires_load: []
---
# Cheap, scoped session start — design

## Overview

Three changes, smallest blast radius first: delete dead code, add a summary projection to the existing state resource, rewrite the session-start protocol in both CLAUDE.md surfaces to use it.

## 1. Delete the dead `threadId` param

`packages/mcp/src/resources/state.ts` parses and validates `threadId` (lines ~14, 18–20) but `weaveFilter` is built only from `weaveId` + `status` — the thread param is never applied. It is dead. Remove the parse + the `threadId requires weaveId` validation. Rationale: no consumer wants a thread's *structured JSON state* in isolation; the pointed-thread need is already served by `do-next-step` (next step + status) and `loom://context/thread/{weave}/{thread}` (content bundle). Finishing the filter would build a feature with no caller. If such a consumer ever appears, add it then.

## 2. `loom://state?shape=summary` — the project map

A new `shape=summary` query param on the existing `loom://state` resource (not a new resource — one handler, one cache). It returns a **projection** of the same `getState` result the full read already computes/caches, so there is no second load path.

Shape (skeleton + status only — never step bodies, never doc content):

```jsonc
{
  "mode": "mono",
  "summary": { "totalWeaves", "totalPlans", "stalePlans", "blockedSteps" },
  "weaves": [
    {
      "id": "core-engine",
      "status": "IMPLEMENTING",
      "threads": [
        {
          "id": "staleness-management",
          "title": "Staleness management",
          "status": "implementing",
          "priority": 1000,
          "activePlanId": "staleness-management-plan-001",   // null if none
          "pendingStepCount": 3,
          "stale": false
        }
      ]
    }
  ]
}
```

Field rationale:
- `summary` counts → orientation at a glance.
- per-thread `activePlanId` + `pendingStepCount` → lets the AI jump straight to `do-next-step` and lets the user eyeball "where's the work" without opening a plan. The two high-value extras.
- `stale` (bool) → flags threads needing a refine without shipping the stale entries themselves.
- **Excluded:** steps, dones, chats, refDocs, allDocs, content, the link index. Those are what make the full read 2 MB.

Size: ~95 threads × ~120 B ≈ **10–15 KB** vs 2 MB.

Implementation: build the projection from the (already cached) full `LoomState` — map weaves → `{id,status,threads: map(...)}`. Serialize **compact** (no `null,2` indent) — it's machine-read, and indent was ~28% of the full payload. Decision point: the projection can live in `state.ts` (resource-local) or as a small pure helper in `core` (`toStateSummary(state)`); prefer `core` so it's unit-testable and reusable by `loom status`.

## 3. Rewrite the session-start protocol

Both surfaces (root `CLAUDE.md` and the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts` — they're sync-enforced by `tests/claude-md-sync.test.ts`, so edit both and keep the `rule:` markers aligned). New step order:

```
1. global ctx (loom/ctx.md)
2. vision + workflow
3. loom://catalog
4. loom://state?shape=summary        ← always; the cheap map (replaces the 2 MB read)
5. pointed at a thread? → do-next-step / context/thread for THAT thread only
```

Step 4 replaces today's `loom://state?status=active,implementing`. The `🧵 Active:` line is derived from the summary. The deep, scoped load (step 5) happens only when the user points at a chat/doc/thread — which is nearly always.

## CLI parity

`loom status` should be able to render from the same `toStateSummary` projection (answers Rafa's "is there a CLI equivalent" — `loom status` becomes the human view of the same map). Low priority; fold in if cheap.

## Risks / notes

- The summary must stay a *pure projection* — no new traversal — or it defeats the purpose.
- `claude-md-sync.test.ts` will fail if the protocol edit lands in only one surface; that's the guard working.
- VS Code tree path untouched (still reads full `loom://state`); verify no consumer of the resource assumed `threadId` did something (it didn't — it was dead).
