---
type: plan
id: refactor-imports-plan-001
title: "Update Client Imports to Use Domain Modules Directly"
status: done
created: 2026-04-16
version: 1
design_version: 1
tags: [refactor, imports, cleanup]
parent_id: body-generators-design
target_version: "0.5.0"
requires_load: []
---

# Plan — Update Client Imports to Use Domain Modules Directly

| | |
|---|---|
| **Created** | 2026-04-16 |
| **Status** | DRAFT |
| **Design** | `body-generators-design.md` (post‑domain‑restructure) |
| **Target version** | 0.5.0 |

---

# Goal

Replace all imports that currently pull domain types (`IdeaDoc`, `DesignDoc`, `PlanDoc`, `CtxDoc`, `Thread`, their statuses, events, and reducers) from the monolithic `types.ts` with direct imports from the specialized modules (`entities/`, `events/`, `reducers/`). This eliminates the `types.ts` re‑export facade and enforces explicit dependency boundaries.

---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Audit all imports of domain types | All `packages/*/src/**/*.ts` | — |
| ✅ | 2 | Update `fs` package imports | `packages/fs/src/*.ts` | Step 1 |
| ✅ | 3 | Update `cli` package imports | `packages/cli/src/**/*.ts` | Step 1 |
| ✅ | 4 | Update `core` internal imports | `packages/core/src/*.ts` (excluding entities/events/reducers) | Step 1 |
| ✅ | 5 | Remove re‑exports from `types.ts` | `packages/core/src/types.ts` | Steps 2–4 |
| ✅ | 6 | Run full test suite | `tests/*` | Step 5 |
| ✅ | 7 | Delete obsolete `types.ts` if empty | `packages/core/src/types.ts` | Step 5 |

---

## Step 1 — Audit all imports of domain types

Use `grep` or IDE search to locate every import from `types` that references:

- `IdeaDoc`, `IdeaStatus`, `IdeaEvent`
- `DesignDoc`, `DesignStatus`, `DesignEvent`
- `PlanDoc`, `PlanStatus`, `PlanStep`, `PlanEvent`
- `CtxDoc`, `CtxStatus`
- `Thread`
- `ideaReducer`, `designReducer`, `planReducer`

Document the list of files to be updated.

---

## Step 2 — Update `fs` package imports

For each file in `packages/fs/src/`, replace:

```typescript
import { PlanDoc, DesignDoc, ... } from '../../core/dist/types';
```

with direct imports:

```typescript
import { PlanDoc } from '../../core/dist/entities/plan';
import { DesignDoc } from '../../core/dist/entities/design';
```

---

## Step 3 — Update `cli` package imports

Apply the same replacement in `packages/cli/src/commands/*.ts` and any other CLI source files.

---

## Step 4 — Update `core` internal imports

Update files like `applyEvent.ts`, `derived.ts`, `linkIndex.ts` to import directly from `./entities/` and `./events/`.

---

## Step 5 — Remove re‑exports from `types.ts`

Once no other file imports the removed types from `types.ts`, delete the corresponding `import` and `export` statements. Keep only genuinely shared types (`Document`, `WorkflowEvent`, `DiagnosticEvent`, `DocumentType`, `DocumentStatus`).

---

## Step 6 — Run full test suite

```bash
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
```

All tests must pass.

---

## Step 7 — Delete obsolete `types.ts` if empty

If `types.ts` becomes empty after Step 5, delete it entirely. Otherwise, keep it for the remaining shared types.

---

# Notes

- This work is **deferred** until after the `app` layer refactor is complete.
- It is tracked here to ensure it is not forgotten.
- The refactor should be done in a single, focused PR to minimize merge conflicts.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |