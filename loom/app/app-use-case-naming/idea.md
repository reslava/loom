---
type: idea
id: id_01KWZAXAJSX6T1HVD4PBP6MWTE
title: Align app use-case internal naming to the Slug/Ulid convention
status: done
created: 2026-07-07
updated: 2026-07-10
version: 2
tags: []
parent_id: null
requires_load: []
---
# Align app use-case internal naming to the Slug/Ulid convention

## What this is (and what it is *not*)

The API-naming convention (`*Ulid` for ULID refs, `*Slug` for folder slugs — see [api-naming-reference](../../refs/api-naming-reference.md)) has been swept across the **consumer-facing parameter surfaces**: MCP tool schemas (`api-contract-refactor`), MCP resources/prompts (`mcp-read-surface-naming`), and the CLI (`cli-surface-naming`). The VS Code extension's MCP **call sites already pass the correct names** (`loom_create_design({ weave_slug, thread_ulid })`).

What remains is the naming *inside* the code — variables, `deps` type params, options fields, and a small set of output-shape field names — where an identifier is called `weaveId`/`threadId` but carries a **slug**. Most of these are not consumer-fill points, so the bulk of this is a **consistency/readability pass, not a correctness fix.** The ambiguity that once fabricated a duplicate thread only bites where someone fills a value from its name alone, and every *parameter* boundary is already aligned. The purpose is that every term — folder name, slug, ULID — reads unambiguously to both humans and AI, in every corner of the codebase.

**Priority is deliberately low.** This is internal hygiene on layers that already work. It is genuinely deferrable; captured here so it isn't lost, not because it's urgent. Decision (chat-001): sweep **every corner** — app internals, MCP tool internals, and the slug-carrying output field names — so the initiative can be declared truly closed.

## Scope (what to rename)

Grounded against the tree on 2026-07-10 (`weaveId`/`threadId` = **204 occurrences across 31 files** in `packages/app/src` alone).

**1. `app` use-case internals (the bulk):**
- **Use-case locals**: `const weaveId = …` → `weaveSlug` in `addStep`, `removeStep`, `updateStep`, `reorderSteps`, `completeStep`, `closePlan`, `doStep`, and the `promote*` / `weave*` / `validate` / `searchDocs` / `recordRelease` / `quickShip` use-cases — plus `migrateThreads`, `migrateLayout`, `buildCtxSource`, and `backfillDesignVersions` (found in the count but missing from the first draft's list).
- **`deps` type signatures**: `loadWeave: (loomRoot: string, weaveId: string) => …` and `runEvent: (weaveId, event) => …` → `weaveSlug`.
- **Options / inputs**: `getState({ weaveId })` → `weaveSlug`.

**2. MCP tool-layer internals (folded in — decision B):** the identical safe-internal pattern one layer up in `packages/mcp/src/tools/*`: `runEvent: (weaveId: string, …)` in `addStep`/`completeStep`/`removeStep`/`reorderSteps`/`updateStep`/`recordRelease`, and `const weaveId = args['weave_slug']` / `const threadId = args['thread_ulid']` locals in `generate.ts`, `doStep.ts`, `startPlan.ts`, `refreshCtx.ts`. Same class as the app locals; swept for the same reason (so "closed" carries no asterisk).

**3. Consumer-facing surfaces still on `*Id`-means-slug (folded in — decision A):**
- `loom://state?weaveId=…` (`packages/mcp/src/resources/state.ts:14,26,28`) — a query param carrying a weave slug → `weaveSlug`.
- **Output shapes** `loom://diagnostics` (`packages/mcp/src/resources/diagnostics.ts:15-16,60-61`) and `loom_get_stale_plans` (`packages/mcp/src/tools/getStalePlans.ts:29-30`) emit `{ weaveId, threadId }` assigned `weave.id`/`thread.id` (slugs) → `weaveSlug`/`threadSlug`. An agent reading `weaveId: "app"` is exactly the ambiguity the convention exists to kill.
- These output fields flow into the **CLI readers** — `roadmap.ts`, `recordRelease.ts`, `backfillReleases.ts`, `migrate.ts` reference `n.weaveId`/`s.weaveId`/`h.threadId` — so the rename ripples app→mcp→cli and those readers are swept in the same change.

## Non-goals

- **The `WorkflowEvent.planId` field** (core event schema). Renaming a core event field is a separate, wider change with its own migration; decide it on its own, not here.
- **The extension's internal `weaveId` locals** (~179 occurrences) — its API call sites are already correct; its internal tree/state naming is a separate optional pass, not this thread.
- **The frontmatter `id` field** — storage schema, deliberately out of scope per the convention.

## Success criteria

- No `app` or `mcp/tools` code names a slug-carrying local, deps param, options field, or output field `*Id`; folders/slugs are `*Slug`.
- `loom://state` accepts `weaveSlug`; `loom://diagnostics` and `loom_get_stale_plans` emit `weaveSlug`/`threadSlug`; the CLI readers consume the renamed fields.
- `build-all` + `test-all` green. No behavior change — pure rename.

## Honest note on "is this ever-ending?"

No. This thread deliberately widened its boundary (chat-001) to cover **every corner** — app internals, MCP tool internals, and the last slug-carrying output/query surfaces — precisely so the answer stays no. After it, the naming initiative is **closed**: every place a model or user fills *or reads* a weave/thread reference names it unambiguously, and the only remaining `weaveId` strings are the explicitly-deferred non-goals (core event field, extension internals). This thread exists to make that end-state real and declarable.