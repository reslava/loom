---
type: done
id: pl_01KSNAAWE8FWDV91GCBQ8E4GRF-done
title: "Done — Context Pipeline — Phase 2: load / load_when filtering"
status: done
created: "2026-05-27T00:00:00.000Z"
version: 6
tags: []
parent_id: pl_01KSNAAWE8FWDV91GCBQ8E4GRF
requires_load: []
---
# Done — Context Pipeline — Phase 2: load / load_when filtering

## Step 1 — Add a `load` field (values "always" / "by-request", default "by-request") and widen the reserved `loadWhen` to `load_when: string[]` on the ReferenceDoc entity in packages/core; absent load_when means all modes

Edited `packages/core/src/entities/reference.ts`: added `export type LoadAxis = 'always' | 'by-request'`, a `load?: LoadAxis` field on `ReferenceDoc` (absent ⇒ treated as `by-request`), and replaced the reserved `loadWhen?: string | null` with `load_when?: string[]` (absent/empty ⇒ all modes). Renamed to snake_case to match Loom's frontmatter convention (`parent_id`, `requires_load`, `target_version`) — the old `loadWhen` camelCase was the lone inconsistency and was reserved/unused (no runtime reader; grep confirmed only the entity decl + the `ORDERED_KEYS` string referenced it). Exported `LoadAxis` from `packages/core/src/index.ts` alongside `ReferenceDoc`/`ReferenceStatus`. Types only, no logic.

## Step 2 — Parse and serialize `load` + `load_when` in packages/fs frontmatter (canonical key order, array handling, back-compat defaults for docs missing the fields)

Edited `packages/core/src/frontmatterUtils.ts`: in `ORDERED_KEYS`, replaced the single `loadWhen` entry with `load` then `load_when` (kept under the "reference-doc fields" group, right after `slug`).

**Finding (plan wording vs. reality):** the step names "packages/fs frontmatter", but the canonical key order **and** the serializer (`serializeFrontmatter` / `serializeValue`) live in **packages/core/frontmatterUtils.ts**, not fs. The fs layer needs no change:
- Parse — `packages/fs/src/serializers/frontmatterLoader.ts::loadDoc` does `{...parsed.data, content, _path}`, so gray-matter already passes `load` (string) and `load_when` (YAML array) straight onto the doc.
- Serialize — `packages/fs/src/serializers/frontmatterSaver.ts::saveDoc` does `{content, _path, steps, ...frontmatter}` and hands the whole `frontmatter` to the core serializer, so both keys round-trip in canonical order.
- Array handling — `serializeValue` already renders arrays inline (`load_when: [design, plan]`); `load: by-request` serializes unquoted (no `:#\n`), valid YAML.
- Back-compat — docs missing the fields stay `undefined`, are not emitted by the serializer, and are read as defaults (by-request / all-modes) by the assembler (Step 3). No field materialization on parse (that would pollute every ref's frontmatter on next save).

## Step 3 — Implement the assembler filter (assembleContext step 2-3): auto-load only always refs, exclude by-request refs from auto-load (still includable via requires_load), and drop always refs whose `load_when` omits the current mode — excluded refs get reason `load_when-filter`; ctx docs stay implicitly always/all-modes; `refine` mode filters by the target's type per design §8

Implemented the reference auto-load filter in `packages/app/src/context/assembleContext.ts`:
- Imported `ReferenceDoc`; added module-level `loadWhenAllows(doc, effectiveMode)` (absent/empty `load_when` ⇒ all modes, else membership test).
- `effectiveMode`: `mode === 'refine' ? targetEntry.doc.type : mode` — compound `refine` filters by the *target's* type per design §8; every other mode filters against itself.
- New `addReference(doc, scope)` closure: skips non-refs, the target, and already-emitted; auto-loads only `load === 'always'` (so `by-request`/unset refs are NOT auto-loaded but remain reachable via requires_load); an always-ref whose `load_when` omits `effectiveMode` is pushed to `excluded` with reason `load_when-filter` rather than added.
- New collection step 2d (after thread ctx, before the parent chain — matches the deterministic ordering rule "…→ thread ctx → references → parent chain…"): runs `addReference` over `state.globalDocs`, then weave `looseFibers`+`refDocs`, then `thread.allDocs`, in global→weave→thread order.
- Final-excluded cleanup: explicit `requires_load`/user-include win over the auto-load gate, so any `load_when-filter` entry whose id ended up emitted is dropped before returning (no contradictory "excluded yet present"). `missing` placeholders are untouched.
- ctx docs are unchanged — still implicitly always/all-modes (no `load_when` gate applied to ctx).

Phase-1 invariants preserved: fixture refs have no `load` field ⇒ `addReference` early-returns ⇒ no auto-loaded refs ⇒ the existing ordering assertion is unaffected.

Out-of-strict-scope consistency fix: `scripts/migrate-to-ulid.ts` carried a local mirror of `ORDERED_KEYS` still listing the renamed-away `loadWhen`; updated it to `load`, `load_when` so the (historical, already-run) migration tool stays consistent — no functional effect, just no stale field name. Grep confirms no remaining `loadWhen` references except the new `loadWhenAllows` helper.

## Step 4 — Extend tests/context-assembler.test.ts with the load/load_when matrix: by-request excluded from auto-load yet present via requires_load; always+load_when:[design] in design mode included but excluded (load_when-filter) in implementing; always with no load_when present in every mode

Extended `tests/context-assembler.test.ts` with a dedicated `buildLoadFixture()` (kept separate from the Phase-1 fixture so the existing ordering assertions stay byte-for-byte intact). Fixture: weave `w1` with three refs in `refDocs` — `r-always` (load:always, no load_when), `r-design` (load:always, load_when:['design']), `r-byreq` (load:by-request) — plus a thread `t1` whose design is `d-T` and whose chat `c-T` has `requires_load: ['r-byreq']`.

Four assertion blocks added:
1. **design mode** (target c-T): `r-always` + `r-design` auto-load (reason `auto`); `r-byreq` present via `requires_load` (reason `requires_load`, not auto); `r-design` not in excluded.
2. **implementing mode** (target c-T): `r-always` still auto-loads (no load_when ⇒ all modes); `r-design` filtered out and present in `excluded` with reason `load_when-filter`; `r-byreq` still via requires_load.
3. **by-request unreferenced** (target d-T, no requires_load reaching r-byreq): always refs auto-load; `r-byreq` absent (proves by-request is excluded from auto-load).
4. **refine mode** (target d-T): effective mode resolves to the target's type `design`, so `r-design` (load_when:[design]) loads — verifies design §8.

Verification: `./scripts/build-all.sh` green; `npx ts-node --project tests/tsconfig.json tests/context-assembler.test.ts` green — all 11 Phase-1 assertions plus the 4 new Phase-2 blocks pass. Full `test-all.sh` run is part of Step 5.

## Step 5 — Update loom/refs/loom-context-pipeline-reference.md phasing table to mark P2 shipped + note the absorption, then run ./scripts/build-all.sh and ./scripts/test-all.sh green

Updated `loom/refs/loom-context-pipeline-reference.md`:
- Phasing table P2 row marked **✅ shipped** with the full absorption description (load/load_when added to ReferenceDoc + canonical frontmatter; load:always refs auto-load in matching scope filtered by load_when vs effective mode; refine → target's type; by-request reachable only via requires_load; load-when + reference-load-context threads absorbed Option C).
- Algorithm step 3 marker updated `(Phase 2.)` → `(Phase 2 ✅.)`.

Verification:
- `./scripts/build-all.sh` — green (already verified in step 3).
- `./scripts/test-all.sh` — green end-to-end: all unit suites + 8/8 MCP integration tests. `tests/context-assembler.test.ts` includes the 4 new Phase-2 assertion blocks (design auto-load, implementing-mode filter, by-request-not-auto-loaded, refine→target-type) plus all 11 Phase-1 assertions still passing.

Phase 2 complete. Remaining gaps (not in scope here): thread/weave ctx-load is still inert in getState (ctx-doc filtering deferred); sidebar UX is Phase 3.
