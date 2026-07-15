---
type: done
id: pl_01KXJQMTHRF6P553GWKS7B1RNR-done
title: Done — Warn-and-store cross-plan blockers via injected planExists
status: done
created: 2026-07-15
version: 5
tags: []
parent_id: pl_01KXJQMTHRF6P553GWKS7B1RNR
requires_load: []
---
# Done — Warn-and-store cross-plan blockers via injected planExists

## Step 1 — Add optional planExists predicate to resolveBlockedByIds; return { ids, warnings } and implement the classification table (known step slug → resolve+store; unknown step slug → throw, unchanged; cross-plan ref resolves → store; cross-plan ref unresolved with predicate → store + BlockedByWarning; cross-plan ref with no predicate → store best-effort). Keep core pure — predicate is injected, no IO. Normalize legacy {slug}-plan-NNN before the existence check.

**Core normalizer — `resolveBlockedByIds` now warn-and-store aware.**

- `packages/core/src/planUtils.ts`: added exported `BlockedByWarning` (`{ kind: 'dangling_plan_ref'; ref; stepId? }`) and `ResolveBlockedByResult` (`{ ids; warnings }`). `resolveBlockedByIds` gains an optional 4th arg `planExists?: (ref: string) => boolean` and now returns `ResolveBlockedByResult` instead of `string[]`. Cross-plan branch: the ref is always stored (verbatim), and when a predicate is supplied and the ref doesn't resolve, a `dangling_plan_ref` warning is pushed (deduped per unique edge). Unknown *step* slug still throws (unchanged); ordinal/self-block/malformed guards unchanged.
- **Legacy `{slug}-plan-NNN` normalization is delegated to the predicate, not done in core.** Pure `core` holds no link index, so it can't map the legacy form → ULID. The injected `planExists` (built in the app layer over the index) is the existence *and* legacy-form-resolution oracle. Documented in the function's doc comment. This keeps `core` pure and is the honest factoring under Option B.
- `packages/core/src/reducers/planReducer.ts`: both call sites (UPDATE_STEP line ~109, ADD_STEP line ~168) now take `.ids`. The reducer stays pure and predicate-free — cross-plan edges store verbatim; a comment records that dangling-plan warnings are the app layer's job and the standing diagnostic is the guarantee (Option B).
- `packages/core/src/index.ts`: export the two new types.

`createPlan.ts` still consumes the old `string[]` shape — that's the one app-layer call site, fixed in step 2. Core compiles; full build runs at step 5.

## Step 2 — Option B (reducer stays pure). Leave the planReducer resolveBlockedByIds calls (ADD_STEP/UPDATE_STEP) predicate-free — they take .ids and store cross-plan edges verbatim, unchanged. Inject planExists (a closure over the already-loaded link index, no extra pass) only where the index lives: createPlan's direct resolver call, plus a small app-layer existence check in addStep/updateStep. Surface the resulting dangling-plan warnings as a non-blocking advisory in each tool result. The standing diagnostic (step 3) — not this advisory — is the guarantee.

**Decision (Rafa): drop the write-time advisory entirely — all cross-plan existence-checking lives in the standing diagnostic (step 3).**

Rationale: no write path holds a global link index. `createPlan` holds none; `addStep`/`updateStep` hold only same-weave plans via `loadWeave`, but a `pl_…` blocker is a global ULID. A correct write-time advisory would force a fresh global index build per write (the cheapness guard's stop condition), and the cheap partial version (same-weave only) gives inconsistent coverage — worse than none. The standing diagnostic runs over `getState`, where the global index already exists.

Result — step 2 collapses to the decision-independent adaptation only:
- `packages/app/src/createPlan.ts`: `buildStructuredSteps` now consumes `resolveBlockedByIds(...).ids` (the new return shape). No predicate passed → verbatim store, unchanged behavior.
- `packages/app/src/addStep.ts` / `updateStep.ts`: **unchanged** — they pass `blockedBy` through to the pure reducer, which already stores verbatim and takes `.ids` (step 1). No advisory wiring added.
- The `planExists` predicate param stays on `resolveBlockedByIds` for step 3's diagnostic to reuse.

No write-time behavior change for authors: a dangling `pl_…` is still accepted and stored (warn-and-store's *store* half); the *warn* half is delivered by the standing diagnostic, uniformly for same-weave and cross-weave refs.

## Step 3 — Recompute from persisted state: walk every plan step's blockedBy, flag any cross-plan pl_… (or normalized legacy form) that does not resolve to an existing plan as a step-level dangling_dep diagnostic { weaveSlug, threadSlug, planId, stepId, ref }. Surface through loom_validate / loom://diagnostics, reusing the same resolution logic as step 1. This is the durable guarantee and the migration net for edges already on disk.

**Standing step-level dangling-plan detection — the warn-and-store guarantee.**

Found the real gap: `validateStepBlockers` (core) only recognized the **legacy `-plan-`** cross-plan form. A modern `pl_…` ULID blocker fell through to the "unknown blocker format" branch — so a *missing* `pl_…` was never flagged as dangling, and a *valid* `pl_…` was spuriously warned as "unknown format". Both fixed.

- `packages/core/src/planUtils.ts`: exported `isPlanIdRef` (was private) + added `planRefId(entry)` (strips a legacy trailing ordinal; a `pl_…` is its own id). One source of truth for "is this a plan ref / what plan does it name," reused by both validation surfaces.
- `packages/core/src/index.ts`: export `isPlanIdRef`, `planRefId`.
- `packages/core/src/validation.ts`: replaced the `-plan-`-only branch with `isPlanIdRef(blocker)` → `planRefId` → `index.documents.get(...).exists` check. Now: valid plan ref → no issue; missing/nonexistent plan ref (pl_ or legacy) → `warning: "Step N: blocked by missing plan …"`. Flows automatically to `loom_validate` (app `validate.ts` already calls `validateStepBlockers` — no app change needed).
- `packages/mcp/src/resources/diagnostics.ts`: `loom://diagnostics` previously carried no step-blocker info at all. Added a structured `blockedByDangling: { weaveSlug, threadSlug, planId, stepId, ref }[]` group, computed from the same `getState` index it already builds, reusing `isPlanIdRef`/`planRefId`. This is the design's structured `dangling_dep` twin, and the migration net for edges already on disk.

Both surfaces (`loom_validate` string issues + `loom://diagnostics` structured entries) now report every dangling cross-plan blocker, same-weave or cross-weave. Scope note: touched `diagnostics.ts` (mcp) + `index.ts` (core export) beyond the two files the plan listed; app `validate.ts` needed no change (already routes through the core helper).

## Step 4 — Change isStepBlocked's 'missing plan ⇒ blocked' from primary contract to a documented back-compat fallback (comment referencing the standing diagnostic as the primary surface), matching how the ordinal fallback was handled. No behavioral change to a resolvable blocker.

**Demoted `isStepBlocked`'s "missing plan ⇒ blocked" to a documented back-compat fallback + unified the plan-ref forms.**

- `packages/core/src/planUtils.ts` (`isStepBlocked`): the cross-plan branch now reads `if (isPlanIdRef(blocker))` (was `blocker.includes('-plan-')`), resolving via `planRefId` + `index.documents.get(...).exists`. The comment reframes "missing ⇒ blocked" as a retained back-compat fallback (not the primary contract), pointing at the standing `blockedByDangling` diagnostic as the authoritative surface — parallel to how the ordinal fallback just above is kept-but-not-load-bearing.

**Behavior note (intentional, flagged):** *resolvable* blockers are unchanged. For an *unresolvable* blocker there is a deliberate unification: previously only the legacy `-plan-` form was checked here, so a **modern `pl_…` blocker naming a missing plan was silently ignored (never blocking)**; now both forms behave the same — a missing target ⇒ the step is withheld as not-doable. This matches the idea's stated intent ("missing plan ⇒ blocked"), is consistent with the legacy form, and the standing diagnostic reports *why*. This is the "reconcile isStepBlocked" the step called for.

## Step 5 — Add resolver classification unit test (one assertion per table row incl. the still-throws unknown-step guard), an app write-path test (unresolved pl_ returns a warning AND the edge is stored), and a diagnostics test (a dangling pl_ surfaces as step-level dangling_dep). Wire each into scripts/test-all.sh. Update loom/refs/mcp-reference.md with the new diagnostic kind. Run build-all then test-all.

**Tests + reference-doc sweep — build-all + test-all green.**

- `tests/resolve-blockedby-ids.test.ts`: adapted to the new `{ ids, warnings }` return via an `rIds` helper (the existing normalization assertions now read `.ids`). Necessary ripple of the step-1 signature change; only direct caller in the test suite.
- `tests/cross-plan-blocker-validation.test.ts` (new): covers all three moving parts — (1) resolver warn-and-store: unresolved `pl_` WITH predicate → stored + one `dangling_plan_ref` warning (carries selfId, dedupes); resolved → no warning; no predicate → silent best-effort; unknown *step* slug still throws even with a predicate. (2) `validateStepBlockers`: missing `pl_`/legacy → warning, existing `pl_` clean (regression guard for the old "unknown format" mis-flag), severity is `warning`. (3) `isStepBlocked`: missing plan (both `pl_` and legacy) ⇒ blocked back-compat, existing ⇒ not blocked.
- `scripts/test-all.sh`: wired the new test after `blockedby-normalization`.
- `loom/refs/mcp-reference.md`: documented the `blockedByDangling[]` group in the `loom://diagnostics` row + a warn-and-store paragraph (stored-not-rejected; the standing net is the guarantee; step-level twin of the roadmap `dangling_dep`).

Verification: `./scripts/build-all.sh` — all packages compiled clean (core/fs/app/mcp/cli/vscode, no type errors from the signature change). `./scripts/test-all.sh` — full suite passed, including the 23-case MCP integration run. The two changed/new blocker tests pass individually.
