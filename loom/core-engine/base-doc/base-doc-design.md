---
type: design
id: base-doc-design
title: "BaseDoc — Foundational Document Interface with Generic Status"
status: active
created: 2026-04-17
version: 1
tags: [core, entities, domain-model, typescript]
parent_id: core-engine-design
child_ids: [base-doc-plan-001]
requires_load: []
---

# BaseDoc — Foundational Document Interface with Generic Status

## Goal

Define a single, canonical base interface `BaseDoc` that all Loom document types (`IdeaDoc`, `DesignDoc`, `PlanDoc`, `CtxDoc`, and future `ChatDoc`) extend. This interface uses a **generic type parameter** to lock each document’s `status` field to its specific allowed status union, providing compile‑time type safety and eliminating the risk of assigning an invalid status.

## Context

Currently, each document entity (`idea.ts`, `design.ts`, etc.) defines its own fields independently, duplicating common properties like `id`, `title`, `created`, `version`, `tags`, `parent_id`, `child_ids`, and `requires_load`. This leads to:

- **Inconsistent field definitions** across document types.
- **No compile‑time guarantee** that `status` is appropriate for the document.
- **Difficulty adding new shared fields** (e.g., `updated` timestamps) to all documents.

Extracting a shared `BaseDoc` interface solves these problems and establishes a clean, extensible foundation for the domain model.

## Design

### 1. The `BaseDoc` Interface (Generic)

```typescript
// packages/core/src/entities/base.ts

export type DocumentType = 'idea' | 'design' | 'plan' | 'ctx' | 'chat';

export interface BaseDoc<TStatus extends string = string> {
    /** Discriminator for the document type */
    type: DocumentType;

    /** Unique identifier (kebab‑case, e.g., 'payment-system-design') */
    id: string;

    /** Human‑readable title */
    title: string;

    /** Current workflow status — specific to the document type */
    status: TStatus;

    /** Creation date (YYYY‑MM‑DD) */
    created: string;

    /** Last updated date (YYYY‑MM‑DD), optional */
    updated?: string;

    /** Document version (integer) */
    version: number;

    /** Categorization tags */
    tags: string[];

    /** ID of parent document (null for root) */
    parent_id: string | null;

    /** IDs of child documents */
    child_ids: string[];

    /** Documents that must be loaded for AI context */
    requires_load: string[];

    /** Raw Markdown content (excluded from frontmatter serialization) */
    content: string;

    /** Internal: absolute filesystem path (not persisted) */
    _path?: string;
}
```

### 2. Document‑Specific Status Unions

Each document type defines its own allowed statuses:

```typescript
// packages/core/src/entities/idea.ts
export type IdeaStatus = 'draft' | 'active' | 'done' | 'cancelled';
```

```typescript
// packages/core/src/entities/design.ts
export type DesignStatus = 'draft' | 'active' | 'closed' | 'done' | 'cancelled';
```

```typescript
// packages/core/src/entities/plan.ts
export type PlanStatus = 'draft' | 'active' | 'implementing' | 'done' | 'blocked' | 'cancelled';
```

```typescript
// packages/core/src/entities/ctx.ts
export type CtxStatus = 'draft' | 'active' | 'done' | 'cancelled';
```

### 3. Concrete Document Interfaces Extending `BaseDoc`

Each document interface **locks** the `status` field to its specific union and sets the `type` discriminator to a literal string.

```typescript
// packages/core/src/entities/idea.ts
import { BaseDoc } from './base';

export interface IdeaDoc extends BaseDoc<IdeaStatus> {
    type: 'idea';
    status: IdeaStatus;
    // No additional fields
}
```

```typescript
// packages/core/src/entities/design.ts
import { BaseDoc } from './base';

export interface DesignDoc extends BaseDoc<DesignStatus> {
    type: 'design';
    status: DesignStatus;
    role?: 'primary' | 'supporting';
    target_release?: string;
    actual_release?: string | null;
    refined?: boolean;
}
```

```typescript
// packages/core/src/entities/plan.ts
import { BaseDoc } from './base';
import { PlanStep } from './planStep'; // Future

export interface PlanDoc extends BaseDoc<PlanStatus> {
    type: 'plan';
    status: PlanStatus;
    design_version: number;
    target_version: string;
    staled?: boolean;
    steps: PlanStep[];
}
```

```typescript
// packages/core/src/entities/ctx.ts
import { BaseDoc } from './base';

export interface CtxDoc extends BaseDoc<CtxStatus> {
    type: 'ctx';
    status: CtxStatus;
    source_version?: number;
}
```

### 4. Union Type for All Documents

```typescript
// packages/core/src/entities/index.ts (or types.ts)
import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';

export type Document = IdeaDoc | DesignDoc | PlanDoc | CtxDoc;
```

### 5. Type‑Safe Document Status (Derived)

For cases where the specific document type is not known at compile time, we can still obtain a union of all possible statuses:

```typescript
export type DocumentStatus = IdeaStatus | DesignStatus | PlanStatus | CtxStatus;
```

## Benefits

| Benefit | Description |
| :--- | :--- |
| **Single Source of Truth** | Common fields are defined once, reducing duplication and inconsistency. |
| **Compile‑Time Status Safety** | `BaseDoc<TStatus>` ensures a `PlanDoc` cannot accidentally receive an `IdeaStatus`. |
| **Extensibility** | Adding a new shared field requires only one change. |
| **Better IDE Support** | Autocomplete and type checking are more precise. |
| **Clear Documentation** | The base interface serves as the definitive reference for document fields. |

## Trade‑offs

| Concern | Mitigation |
| :--- | :--- |
| Generics add slight complexity | The pattern is well‑established in TypeScript; the clarity outweighs the learning curve. |
| Existing code must be updated | A small, focused refactoring plan (`base-doc-plan-001`) will handle this. |

## Relationship to Existing Types

- `BaseDoc` **replaces** the ad‑hoc duplication of common fields in current entity files.
- `Document` and `DocumentStatus` unions remain useful for functions that operate on any document type.
- The `types.ts` file can re‑export `BaseDoc` and `Document` for convenience.

## Decision

Adopt the generic `BaseDoc<TStatus>` pattern as the foundation for all Loom document entities. Implement via `base-doc-plan-001` before proceeding with Body Generators.

## Next Steps

- Create `base-doc-plan-001.md` with step‑by‑step refactoring instructions.