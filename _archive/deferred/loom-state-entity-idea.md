---
type: idea
id: loom-state-entity-idea
title: "LoomState — First‑Class State Entity"
status: deferred
created: 2026-04-18
version: 1
tags: [state, architecture, caching, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# LoomState — First‑Class State Entity

## Problem
State information (thread statuses, phases, next actions, statistics) is currently scattered across `derived.ts`, `status.ts`, and the CLI/VSCode presentation layers. There is no single, authoritative representation of the active loom's state. This leads to:
- Duplicated computation across commands.
- Inconsistent caching strategies.
- Difficulty exposing state to alternative interfaces (e.g., a web dashboard).

## Idea
Introduce a `LoomState` entity in `core/entities/state.ts`. A single `app` use‑case (`getState`) would orchestrate loading all threads, building the link index, and assembling the complete state. Both CLI and VSCode would consume this unified state object.

**Benefits:**
- Single source of truth for all derived state.
- Enables efficient caching (serialize to `.loom/cache/state.json`).
- Simplifies testing and alternative frontends.
- Explicitly captures `mode` (mono/multi) and `loomName`.

---

## State as a First‑Class Entity

| Aspect | Current (Scattered) | Proposed (Centralized) |
| :--- | :--- | :--- |
| **Definition** | Spread across `derived.ts`, `status.ts`, `Thread` | A dedicated `entities/state.ts` entity. |
| **Generation** | Recalculated per command | A single `app` use‑case: `getState()`. |
| **Consumption** | CLI and VSCode call different functions | Both consume the same `State` object. |
| **Caching** | None; rebuilt each time | The `State` object can be cached and invalidated. |
| **Mode Awareness** | Implicit in `getActiveLoomRoot()` | Explicit `mode: 'mono' | 'multi'` in `State`. |

---

## Proposed Entity: `packages/core/src/entities/state.ts`

```typescript
import { Thread } from './thread';

export type LoomMode = 'mono' | 'multi';

export interface LoomState {
    /** The absolute path to the active loom root. */
    loomRoot: string;
    
    /** The operational mode: mono‑loom (local) or multi‑loom (global registry). */
    mode: LoomMode;
    
    /** The name of the active loom (for multi‑loom) or '(local)' for mono‑loom. */
    loomName: string;
    
    /** All threads in the active loom. */
    threads: Thread[];
    
    /** Timestamp when this state was generated. */
    generatedAt: string;
    
    /** Summary statistics (optional but useful). */
    summary: {
        totalThreads: number;
        activeThreads: number;
        implementingThreads: number;
        doneThreads: number;
        totalPlans: number;
        stalePlans: number;
        blockedSteps: number;
    };
}
```

---

## How It Would Be Used

1. **`app/src/getState.ts`** — A single use‑case that orchestrates loading all threads, building the link index, and assembling the `LoomState` object.
2. **CLI `loom status`** — Calls `getState()` and displays a human‑readable subset.
3. **VSCode Tree View** — Calls `getState()` and renders the tree from `state.threads`.
4. **Caching** — The `LoomState` can be serialized to `.loom/cache/state.json` and invalidated when any document changes.

---

## Why Defer
- Current architecture is functional and stable.
- This is an optimization and structural improvement, not a core workflow requirement.
- Should be implemented after the VS Code extension MVP to validate the state consumption patterns.

## Next Step
Re‑evaluate after VS Code extension MVP. Create `loom-state-entity-plan-001.md` when ready.

**Status: Deferred for post‑MVP consideration.**
