---
type: design
id: de_01KX5VRFJEQ75RT4QNNJ2TAHSV
title: Align app use-case internal naming to the Slug/Ulid convention
status: done
created: 2026-07-10
version: 1
idea_version: 2
tags: []
parent_id: id_01KWZAXAJSX6T1HVD4PBP6MWTE
requires_load: []
---
# Align app use-case internal naming to the Slug/Ulid convention

## Goal

A **pure, behavior-preserving rename** that makes every weave/thread reference in the code read unambiguously — a slug is `*Slug`, a ULID is `*Ulid`, `*Id` never means "slug". Scope is the corrected boundary in the idea: `app` internals + `mcp/src/tools` internals + the last slug-carrying consumer output/query surfaces + their CLI readers. Nothing in `core` events, nothing in the extension internals, no frontmatter `id`.

**This is not a feature.** No control flow, no schema, no serialized output *values* change — only identifier spellings and the JSON *keys* of two already-internal-facing output shapes. The test suite is the proof: it must stay green with zero logic edits.

## Principle: rename identifiers, not data

The only thing that leaves the process and could break a consumer is a **JSON key**. There are exactly three such keys, all carrying slugs today:
- `loom://state?weaveId=` — an *input* query param (rename the reader).
- `loom://diagnostics` output `{ weaveId, threadId }`.
- `loom_get_stale_plans` output `{ weaveId, threadId }`.

Everything else (locals, param names, deps type members) is invisible outside its file/module and is a mechanical spelling change. So the design splits into **two risk tiers**, done in order, each independently `test-all`-green.

## Tier 1 — invisible internals (zero consumer risk)

Rename in place; no cross-package contract moves.

**1a. `app` layer (`packages/app/src`, 204 occ / 31 files).**
- Locals `const weaveId`/`threadId` → `weaveSlug`/`threadSlug` in the use-cases listed in the idea (incl. the four migration/ctx/backfill files the first draft missed).
- `deps` type signatures: `loadWeave: (loomRoot, weaveId)` and `runEvent: (weaveId, event)` → `weaveSlug`. These type members are consumed by `mcp/src/tools` and `cli` *positionally* (they pass a string in the first arg), so renaming the **parameter name** in the type breaks no caller — only the type's own readability changes. Verify by build.
- `getState({ weaveId })` options field → `weaveSlug`. This *is* a named field; grep every `getState({ weaveId:` / `getState({ weaveSlug:` call site across app+mcp+cli+tests and rename together.

**1b. `mcp/src/tools` layer.**
- `runEvent: (weaveId: string, …)` closures in `addStep`/`completeStep`/`removeStep`/`reorderSteps`/`updateStep`/`recordRelease` → `weaveSlug`.
- `const weaveId = args['weave_slug']`, `const threadId = args['thread_ulid']` in `generate.ts`, `doStep.ts`, `startPlan.ts`, `refreshCtx.ts` → `weaveSlug`/`threadSlug`. Note the *schema key* (`args['weave_slug']`) is already correct and does not change — only the local it's read into.

**Checkpoint:** `build-all && test-all` green before touching Tier 2.

## Tier 2 — the three slug-carrying consumer surfaces

Each is a key rename that must move atomically with its readers.

**2a. `loom://state?weaveId=` → `?weaveSlug=`** (`resources/state.ts:14,26,28`). Sweep callers: any `loom://state?weaveId=` in `mcp` tests and in the extension. *(Decision: input params are strict — no back-compat alias; this is a pure rename per the clean-code contract, and the only in-repo caller set is ours.)*

**2b. `loom://diagnostics` output** (`resources/diagnostics.ts:15-16,60-61`): interface fields + the two assignment sites `weaveId: weave.id` → `weaveSlug: weave.id`, `threadId: thread.id` → `threadSlug: thread.id`. Sweep any diagnostics-output reader (extension diagnostics view, tests).

**2c. `loom_get_stale_plans` output** (`tools/getStalePlans.ts:29-30`): same field rename. Then the **CLI readers** that consume stale/roadmap/release shapes carrying these fields — `roadmap.ts`, `recordRelease.ts`, `backfillReleases.ts`, `migrate.ts` (`n.weaveId`/`s.weaveId`/`h.threadId`/`c.weaveId`) — rename to the new keys. **Confirm the source shape:** trace whether those CLI fields originate from `getStalePlans`/roadmap/release app functions or from a separate roadmap-node type; rename at the definition and let TypeScript surface every reader (this is the safety net — a missed reader won't compile).

**Checkpoint:** `build-all && test-all` green.

## Sequencing / step shape (for the plan)

1. Tier 1a — `app` locals + deps type params + `getState` options field.
2. Tier 1b — `mcp/src/tools` internals.
3. Tier 2a — `state?weaveId=` + its callers.
4. Tier 2b — `loom://diagnostics` output shape + readers.
5. Tier 2c — `getStalePlans` output shape + the CLI readers, driven by the compiler.
6. Final sweep + `build-all` + `test-all` + a grep gate: `rg 'weaveId|threadId' packages/{app,mcp,cli}/src` returns only the documented non-goals (none expected in app/mcp/cli after this).

Each step ends `test-all`-green, so the thread can pause between steps without leaving the tree half-renamed.

## Risks & how the design neutralizes them

- **A missed reader of a renamed output key** → TypeScript compile error (interfaces are typed), *except* where a consumer reads via `any`/index access. Mitigation: the step-6 grep gate catches string-level stragglers the compiler can't.
- **Scope creep into `core`/extension** → hard non-goals; the grep gate is scoped to `packages/{app,mcp,cli}` on purpose so it doesn't drag in the deferred surfaces.
- **"Pure rename" drifting into a logic edit** → forbidden; if any rename appears to require a logic change, that's a finding to stop on, not to absorb.

## Open decisions

None blocking. One worth a nod: **2a back-compat.** I've assumed *no* alias for `?weaveId=` (clean rename, in-repo callers only). If any external/committed config or doc references `?weaveId=`, say so and I'll add a deprecation path — but per the clean-code contract the default is delete-and-migrate.