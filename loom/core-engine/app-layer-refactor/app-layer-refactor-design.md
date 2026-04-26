---
type: design
id: app-layer-refactor-design
title: "Introduce Application Layer for Clean Architecture"
status: draft
created: 2026-04-16
version: 1.0.0
tags: [architecture, refactor]
parent_id: null
child_ids: []
requires_load: []
---

# Introduce Application Layer for Clean Architecture

## Goal

Define and introduce an explicit **Application Layer (`app/`)** to separate orchestration logic from domain logic (`core/`), infrastructure (`fs/`), and delivery (`cli/`). This refactor aims to improve maintainability, testability, and architectural clarity without changing core behavior.

## Context

The current structure:

```
packages/
  core/
  fs/
  cli/
```

implicitly follows a layered architecture but lacks explicit separation of orchestration logic. As a result:

- CLI commands contain orchestration logic
- `fs/` includes mixed responsibilities (IO + coordination)
- Domain logic is clean but not fully isolated in usage

This creates friction when evolving features and increases coupling between layers.

## Problem

There is no dedicated layer responsible for:

- Coordinating domain operations
- Managing workflows (load → transform → save)
- Defining use-cases as first-class constructs

This leads to:

- Logic duplication across CLI commands
- Harder testing (requires filesystem or CLI context)
- Reduced clarity in system flow

## Proposed Design

Introduce a new package:

```
packages/app/
```

This layer will contain **use-case functions** responsible for orchestrating domain logic and infrastructure interactions.

### Architectural Flow

```
CLI → APP → CORE
        ↓
        FS
```

### Responsibilities by Layer

#### core/
- Pure domain logic
- Stateless, deterministic functions
- No side effects, no IO
- Examples:
  - `applyEvent`
  - `planReducer`
  - `designReducer`

#### app/
- Orchestration layer (use-cases)
- Coordinates:
  - loading data
  - applying domain logic
  - persisting results
- Receives dependencies via injection
- No direct filesystem or CLI imports

#### fs/
- Infrastructure layer
- Handles:
  - file IO
  - serialization (frontmatter)
  - indexing
- No business logic
- Exposes simple repository-like APIs

#### cli/
- Delivery layer
- Parses user input
- Calls application use-cases
- Handles output (console)

## Use Case Pattern

Each use-case follows a consistent structure:

```ts
export async function useCase(input, deps) {
  const state = await deps.load()

  const updated = domainFunction(state, input)

  await deps.save(updated)

  return updated
}
```

### Example: completeStep

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

## Dependency Injection Strategy

Use-case functions receive dependencies explicitly:

```ts
{
  loadPlan: () => Promise<Plan>
  savePlan: (plan: Plan) => Promise<void>
}
```

This ensures:

- No coupling to filesystem
- Easy unit testing
- Replaceable infrastructure

## Refactoring Plan

### Step 1 — Create app package

```
packages/app/
  completeStep.ts
  startPlan.ts
  finalize.ts
  ...
```

### Step 2 — Move orchestration logic

Move logic from:
- `cli/commands/*`
- `fs/runEvent.ts`
- `fs/saveThread.ts`

Into:
- `app/*`

### Step 3 — Simplify fs layer

Refactor `fs/` into:

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

Ensure all functions are:
- focused on IO
- free of business rules

### Step 4 — Thin CLI layer

Refactor CLI commands to:

```ts
await completeStep(
  input,
  {
    loadPlan: () => planRepo.load(id),
    savePlan: (p) => planRepo.save(p)
  }
)
```

### Step 5 — Enforce core purity

Audit `core/` to ensure:
- no imports from `fs` or `cli`
- no async logic (where possible)

## Benefits

- Clear separation of concerns
- Easier testing (mock deps)
- Improved readability and reasoning
- Scalable architecture for future features
- Reduced coupling between CLI and persistence

## Tradeoffs

- Slight increase in file count
- Requires disciplined layering
- Initial refactor effort

## Future Extensions

- Introduce domain events (if needed)
- Add in-memory adapters for testing
- Enable alternative frontends (e.g., UI, API)

## Status

Proposed design — ready for implementation.
