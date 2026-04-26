---
type: plan
id: app-layer-refactor-plan
title: "Refactor Architecture to Introduce Application Layer"
status: done
created: 2026-04-16
version: 1
tags: [architecture, refactor]
parent_id: app-layer-refactor-design
child_ids: []
requires_load: [app-layer-refactor-design]
---

# Feature — Refactor Architecture to Introduce Application Layer

| | |
|---|---|
| **Created** | 2026-04-16 |
| **Status** | DRAFT |
| **Design** | `app-layer-refactor-design.md` |
| **Target version** | 0.2.0 |

---

# Goal

Introduce an explicit Application Layer (`app/`) to centralize orchestration logic, enforce clean separation of concerns, and improve maintainability without altering existing behavior.

---

# Steps

| # | Done | Step | Files touched |
|---|---|---|---|
| 1 | ✅ | Create app package structure | `packages/app/*` |
| 2 | ✅ | Extract first use-case (completeStep) | `cli/commands/completeStep.ts`, `app/completeStep.ts` |
| 3 | ✅ | Refactor fs orchestration leakage | `packages/fs/runEvent.ts`, `packages/fs/saveThread.ts` |
| 4 | ✅ | Migrate remaining CLI commands to app layer | `packages/cli/commands/*` |
| 5 | ✅ | Normalize fs into repositories/adapters | `packages/fs/*` |
| 6 | ✅ | Enforce core purity constraints | `packages/core/*` |
| 7 | ✅ | Add dependency injection patterns | `packages/app/*`, `packages/cli/*` |
| 8 | ✅ | Validate behavior parity and regressions | all |

---

## Step 1 — Create app package structure

Create a new package:

```
packages/app/
```

Initialize with:
- empty index
- placeholder use-case files

No logic is moved at this stage.

---

## Step 2 — Extract first use-case (completeStep)

Select `completeStep` as the pilot use-case.

### Actions:
- Create `app/completeStep.ts`
- Move orchestration logic from CLI into this file

### Target structure:

```ts
export async function completeStep(input, deps) {
  const plan = await deps.loadPlan(input.planId)

  const updated = applyEvent(plan, {
    type: 'STEP_COMPLETED',
    stepId: input.stepId
  })

  await deps.savePlan(updated)

  return updated
}
```

### CLI adjustment:
- Replace inline logic with call to use-case
- Inject dependencies from `fs`

---

## Step 3 — Refactor fs orchestration leakage

Audit:
- `runEvent.ts`
- `saveThread.ts`

### Actions:
- Identify orchestration logic (multi-step flows)
- Move orchestration into `app/`
- Keep `fs/` limited to:
  - load/save
  - serialization
  - indexing

### Outcome:
`fs/` becomes a pure infrastructure adapter layer.

---

## Step 4 — Migrate remaining CLI commands to app layer

For each command:

- `startPlan`
- `finalize`
- `refine`
- `rename`
- `switch`
- `status`
- `summarise`
- etc.

### Actions:
- Create corresponding use-case in `app/`
- Move orchestration logic
- Replace CLI logic with delegation

### Rule:
CLI must not:
- call `applyEvent` directly
- coordinate multiple steps

---

## Step 5 — Normalize fs into repositories/adapters

Refactor `fs/` structure:

```
fs/
  repositories/
    planRepo.ts
    designRepo.ts
  serializers/
    frontmatter.ts
  loaders/
    loadThread.ts
```

### Actions:
- Consolidate load/save into repository-like modules
- Isolate frontmatter logic
- Remove cross-module coupling

---

## Step 6 — Enforce core purity constraints

Audit all files in `core/`.

### Ensure:
- no imports from `fs` or `cli`
- no side effects
- no hidden state
- deterministic outputs

### Optional:
- remove async where unnecessary

---

## Step 7 — Add dependency injection patterns

Standardize use-case signatures:

```ts
(input, deps)
```

### Actions:
- Define consistent dependency shapes
- Avoid direct imports of infrastructure
- Enable mocking for tests

---

## Step 8 — Validate behavior parity and regressions

### Actions:
- Run CLI commands before/after refactor
- Compare outputs (files, logs)
- Validate no regression in:
  - plan state
  - design state
  - frontmatter integrity

### Optional:
- Add snapshot tests for key flows

---

# Notes

- Refactor should be incremental; avoid large-bang rewrite
- Each step must leave the system in a runnable state
- Prioritize high-value commands first (frequently used)

---

# Status

Ready for implementation.
