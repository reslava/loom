---
type: design
id: body-generators-design
title: "Document Body Generators & Utility Extraction"
status: active
created: 2026-04-16
version: 1
tags: [refactor, architecture, utilities, templates]
parent_id: core-engine-design
child_ids: []
requires_load: [core-engine-design, id-management-design]
target_release: "0.4.0"
actual_release: null
---

# Document Body Generators & Utility Extraction

## Goal

Eliminate hardcoded document templates and duplicated logic by introducing centralized body generators and utility modules. This ensures a single source of truth for document structure, path resolution, validation, and Markdown table handling.

## Context

Currently, document bodies are constructed using hardcoded template strings scattered across CLI commands, tests, and helper functions. Path-finding logic is duplicated in `finalize.ts`, `rename.ts`, and the link index builder. Validation rules are embedded in `loadThread` and CLI commands. This creates maintenance friction and risks inconsistency.

This design defines a set of pure utility modules that will replace the scattered logic and the physical `.loom/templates/` files.

# CHAT

## Rafa:
We need body generators and utility extraction. No more hardcoded strings or duplicated path logic.

## AI:
Agreed. Let's define the modules.

### 1. Body Generators (`packages/core/src/bodyGenerators/`)

Each document type gets a dedicated generator that returns the full Markdown body (excluding frontmatter).

| Module | Exports | Behavior |
|--------|---------|----------|
| `ideaBody.ts` | `generateIdeaBody(title: string): string` | Returns the `# ${title}\n\n## Problem\n...` template. |
| `designBody.ts` | `generateDesignBody(title: string): string` | Returns `# ${title}\n\n## Goal\n...\n\n## Context\n...\n\n# CHAT\n\n## {{user.name}}:` |
| `planBody.ts` | `generatePlanBody(title: string, options?: { goal?: string }): string` | Returns the plan structure with steps table placeholder. |
| `ctxBody.ts` | `generateCtxBody(threadId: string, summaryData: CtxSummaryData): string` | Builds the context summary body from extracted data. |

**Usage:** CLI commands call these generators instead of reading template files or using hardcoded strings.

### 2. Path Utilities (`packages/fs/src/pathUtils.ts`)

Centralizes all filesystem traversal logic.

| Function | Description |
|----------|-------------|
| `findDocumentById(loomRoot: string, id: string): Promise<string \| null>` | Recursively searches for a document by its ID. |
| `findThreadPath(loomRoot: string, threadId: string): Promise<string \| null>` | Locates the thread directory. |
| `gatherAllDocumentIds(loomRoot: string): Promise<Set<string>>` | Collects all document IDs in the loom. |
| `findMarkdownFiles(dir: string): Promise<string[]>` | Recursively lists all `.md` files (excluding `_archive`). |

### 3. Validation Utilities (`packages/core/src/validation.ts`)

Pure functions for relationship validation, used by both `loom validate` and the link index.

| Function | Description |
|----------|-------------|
| `validateParentExists(doc: Document, index: LinkIndex): boolean` | Checks if `parent_id` exists in the index. |
| `validateChildIds(doc: Document, index: LinkIndex): string[]` | Returns list of dangling `child_ids`. |
| `validateStepBlockers(plan: PlanDoc, index: LinkIndex): StepBlockerValidation[]` | Evaluates each `Blocked by` entry. |

### 4. Plan Table Utilities (`packages/core/src/planTableUtils.ts`)

Isolates the Markdown table parsing and generation.

| Function | Description |
|----------|-------------|
| `parseStepsTable(content: string): PlanStep[]` | Extracts steps from the `# Steps` table. |
| `generateStepsTable(steps: PlanStep[]): string` | Builds the steps table Markdown. |

### 5. Deprecation of Physical Templates

After implementing the body generators, the `.loom/templates/` directory will be removed. The CLI will no longer copy template files; it will generate documents directly using the body generators.

## Decision

Adopt the extraction plan. Implement the modules in the following order:

1. Path Utilities
2. Body Generators
3. Validation Utilities
4. Plan Table Utilities

This order minimizes disruption and allows incremental testing.

## Next Steps

- Create `path-utils-plan-001.md`
- Create `body-generators-plan-001.md`
- Create `validation-utils-plan-001.md`
- Create `plan-table-utils-plan-001.md`