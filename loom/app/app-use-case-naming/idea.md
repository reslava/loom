---
type: idea
id: id_01KWZAXAJSX6T1HVD4PBP6MWTE
title: Align app use-case internal naming to the Slug/Ulid convention
status: draft
created: 2026-07-07
version: 1
tags: []
parent_id: null
requires_load: []
---
# Align app use-case internal naming to the Slug/Ulid convention

## What this is (and what it is *not*)

The API-naming convention (`*Ulid` for ULID refs, `*Slug` for folder slugs — see [api-naming-reference](../../refs/api-naming-reference.md)) has been swept across every **consumer-facing** surface: MCP tool schemas (`api-contract-refactor`), MCP resources/prompts (`mcp-read-surface-naming`), and the CLI (`cli-surface-naming`). The VS Code extension's MCP **call sites already pass the correct names** (`loom_create_design({ weave_slug, thread_ulid })`).

What remains is **internal naming inside the `app` layer**: ~150 `weaveId` occurrences across ~27 use-case files where a variable, a `deps` type parameter, or an options field is named `weaveId`/`threadId` but carries a **slug**. These are not consumer-fill points — no model or user types them — so this is a **consistency/readability pass, not a correctness fix.** The ambiguity that once fabricated a duplicate thread only bites at a boundary where someone fills a value from its name alone, and every such boundary is now aligned.

**Priority is deliberately low.** This is internal hygiene on a layer that already works. It is genuinely deferrable, and on a project with no users it competes poorly with validation work — captured here so it isn't lost, not because it's urgent.

## Scope (what to rename)

- **Use-case locals**: `const weaveId = …` → `weaveSlug` in `addStep`, `removeStep`, `updateStep`, `reorderSteps`, `completeStep`, `closePlan`, `doStep`, and the `promote*` / `weave*` / `validate` / `searchDocs` / `recordRelease` / `quickShip` use-cases.
- **`deps` type signatures**: `loadWeave: (loomRoot: string, weaveId: string) => …` and `runEvent: (weaveId, event) => …` → `weaveSlug`.
- **Options / inputs**: `getState({ weaveId })` → `weaveSlug`.
- **The one genuine consumer-facing straggler found during the audit**: `loom://state?weaveId=…` (`packages/mcp/src/resources/state.ts:14` reads `searchParams.get('weaveId')`) — a query param that carries a weave slug but is named `weaveId`. Small, but it *is* a consumer surface, so fold it in here (rename to `weaveSlug`, sweep the few callers, incl. any `loom://state?weaveId=` usage in the extension/tests).

## Non-goals

- **The `WorkflowEvent.planId` field** (core event schema). Renaming a core event field is a separate, wider change with its own migration; decide it on its own, not here.
- **The extension's internal `weaveId` locals** (~179 occurrences) — its API call sites are already correct; its internal tree/state naming is a separate optional pass, not this thread.
- **The frontmatter `id` field** — storage schema, deliberately out of scope per the convention.

## Success criteria

- No `app` use-case names a slug-carrying local, deps param, or options field `*Id`; folders are `*Slug`.
- `loom://state` accepts `weaveSlug` (the last consumer-facing `*Id`-means-slug straggler is gone).
- `build-all` + `test-all` green. No behavior change — pure rename.

## Honest note on "is this ever-ending?"

No. After this thread the naming initiative is **closed**: every surface a model or user fills is aligned, and the remaining `weaveId` strings are provably-safe internal locals. This thread exists to make that end-state real and declarable, not to open a new front.