---
type: chat
id: ch_01KSNBXAQ0FZ0YH2PZQ02E7FSP
title: context-pipeline Chat
status: done
created: "2026-05-27T00:00:00.000Z"
updated: 2026-05-31
version: 2
tags: []
parent_id: null
requires_load: []
---
# context-pipeline Chat

## Rafa:

Implement Plan Phase 2 `loom/ai-integration/context-pipeline/plans/context-pipeline-plan-002.md`

## AI:

Loaded thread context (idea + design + plan-002). Phase 2 is fully settled by the design (§1, §2, §8, §14) and plan-002 — no open architecture/API decisions — and you authorized the whole plan, so I'll run all 5 steps without stopping between them (error-loop / design-decision rules still interrupt).

**What ships:** reference-doc context filtering inside the pure assembler — the `load: always | by-request` axis and the `load_when: [mode…]` filter, both absorbed from the now-archived `load-when` + `reference-load-context` threads (Option C). ctx-doc filtering stays out of scope (gated by the inert getState ctx-load gap); tree-view UX is Phase 3.

**Steps:**
1. `ReferenceDoc` (core): add `load?: 'always' | 'by-request'` (absent ⇒ by-request) and widen the reserved `loadWhen?: string | null` → `load_when?: string[]` (absent/empty ⇒ all modes).
2. Frontmatter canonical key order: swap `loadWhen` → `load` + `load_when` in `ORDERED_KEYS`. **Note:** the plan says "packages/fs frontmatter", but the canonical key-order + serializer live in `packages/core/frontmatterUtils.ts`; fs parse (`loadDoc` spreads raw data) and save (`saveDoc` spreads all frontmatter keys) already pass the fields through — so the only edit is in core. I'll record this in the done doc.
3. Assembler (`assembleContext` steps 2–3): auto-load only `load:always` refs in matching scope, drop the `always` refs whose `load_when` omits the effective mode (→ excluded `load_when-filter`), leave `by-request` refs out of auto-load but still reachable via `requires_load`. `refine` mode filters by the target's type (design §8). ctx stays implicitly always/all-modes.
4. Extend `tests/context-assembler.test.ts` with the load/load_when matrix (separate fixture so the Phase-1 ordering assertions stay intact).
5. Update the context-pipeline reference phasing table (P2 shipped + absorption note), then `./scripts/build-all.sh` + `./scripts/test-all.sh` green.

Starting now.

## AI:

**Phase 2 shipped — all 5 steps green.**

1. **ReferenceDoc** — added `load: 'always' | 'by-request'` (optional, absent ⇒ by-request) and renamed the reserved `loadWhen` to `load_when: string[]` (absent/empty ⇒ all modes). Exported `LoadAxis` from `packages/core`. (`packages/core/src/entities/reference.ts`, `packages/core/src/index.ts`)
2. **Canonical frontmatter** — `ORDERED_KEYS` now carries `slug`, `load`, `load_when` in the reference-doc section. The fs layer needed no edit: `loadDoc` spreads raw parsed data and `saveDoc` spreads `{...frontmatter}` into core's serializer, so the new keys pass through transparently. Also updated `scripts/migrate-to-ulid.ts` for consistency. (`packages/core/src/frontmatterUtils.ts`, `scripts/migrate-to-ulid.ts`)
3. **Assembler filter** — added `loadWhenAllows(doc, effectiveMode)` and an `addReference` closure that gates on `load === 'always'` then `load_when`. Hooked it as algorithm step 2d/3, ordered global → weave → thread, after ctx and before parent chain. `effectiveMode = mode === 'refine' ? targetEntry.doc.type : mode` per design §8. A `load_when-filter` exclusion is dropped at the end if `requires_load`/user-include pulled the same ref in (explicit wins over auto-load gate). (`packages/app/src/context/assembleContext.ts`)
4. **Tests** — new `buildLoadFixture()` (kept separate from Phase-1 fixture to preserve strict ordering assertions) plus four assertion blocks: design-mode auto-loads `always` + design-scoped + by-request via `requires_load`; implementing-mode filters out the design-scoped ref with reason `load_when-filter`; unreferenced by-request stays excluded; `refine` on a design doc resolves to mode `design` and pulls the design-scoped ref. (`tests/context-assembler.test.ts`)
5. **Reference doc + green builds** — phasing table P2 marked `✅ shipped` with the absorption note; algorithm step 3 marker promoted; Implementation-status section gained a P2-shipped line; the reference-scope-labelling gap is now explicitly labelled cosmetic (filter shipped, scope not reclassified). `./scripts/build-all.sh` + `./scripts/test-all.sh` both green end-to-end. (`loom/refs/loom-context-pipeline-reference.md`)

Plan auto-completed (status: `done`). The `load-when` and `reference-load-context` threads stay archived (Option C); ctx-doc filtering remains gated on the inert `getState` ctx-load gap; sidebar CONTEXT UX is Phase 3.

STOP — Phase 2 plan complete.

## AI:

**Phase 2 shipped — all 5 steps complete. Plan auto-finalized to `done`.**

What landed:

- **Step 1** — `ReferenceDoc` gained `load?: 'always' | 'by-request'` and `load_when?: string[]`; `LoadAxis` exported from `packages/core`.
- **Step 2** — Canonical frontmatter key order in `packages/core/frontmatterUtils.ts` updated (`slug`, `load`, `load_when`). `packages/fs` needed no edit — `loadDoc` spreads raw parsed data and `saveDoc` spreads `{...frontmatter}` into core's serializer, so the new keys pass through transparently.
- **Step 3** — `assembleContext` now runs the auto-load gate per design §8: only `load: 'always'` refs are auto-loaded; an `always` ref whose `load_when` omits the effective mode is excluded with reason `load_when-filter`; `by-request` (and unset) refs stay reachable only via `requires_load`. `refine` mode filters by the *target's* type, not the literal `'refine'` string. Refs are added after thread ctx and before the parent chain, preserving the deterministic `global → weave → thread → references → parent chain → target → requires_load` order. Final-cleanup step removes `load_when-filter` exclusions when `requires_load`/`user-include` later pulled the doc in (explicit wins over the auto-gate).
- **Step 4** — `tests/context-assembler.test.ts` now has a separate `buildLoadFixture()` covering the four matrix points: design auto-loads always + design-scoped refs; implementing mode drops design-scoped (with `load_when-filter` reason); by-request never auto-loads but resolves via `requires_load`; `refine` on a design target → effective mode `design` → design-scoped ref loads. All 11 Phase-1 assertions still pass (separate fixture preserved strict ordering).
- **Step 5** — Reference doc updated (P2 row marked ✅ shipped with the absorption note; algorithm step 3 marker → `Phase 2 ✅`). Full suite green: every unit test + 8/8 MCP integration tests.

Out of scope (known gaps, not regressions): thread/weave ctx-load is still inert in `getState`, so ctx-doc filtering can't engage yet — only the global `loom/ctx.md` flows through today. Sidebar UX is Phase 3.

STOP — Phase 2 closed.

## Rafa:

create plan for: thread/weave ctx-load is still inert in getState (ctx-doc filtering deferred)

create plan for: sidebar UX, Phase 3

## AI:

Before I create either plan, two structural questions — both affect where the work lives and whether we go straight to plan or pass through idea/design first.

**1. ctx-load gap (getState doesn't load thread/weave ctx docs)**

The context-pipeline reference doc currently says this work "belongs with the `ctx-naming` / `global-ctx` threads" — i.e. *not* in `context-pipeline/`. That was the read when we shipped P1: the assembler is forward-compatible, the gap is in `getState` and the status-derivation/save-path machinery, which is more naturally a ctx-doc-infrastructure concern than a pipeline concern.

So the choice is:

- **(a) Put it in `loom/ai-integration/context-pipeline/`** as plan-003. Pro: keeps "everything the AI sees" under one thread; the gap is described in the pipeline reference. Con: stretches the thread's scope into ctx-doc storage/lifecycle (getState, allDocs.every(done), save path), which isn't what context-pipeline is about.
- **(b) Put it in `loom/docs-infra/ctx-naming/`** (or wherever the ctx-naming thread lives) as a new plan. Pro: matches the original read; touches the right code. Con: I'd need to check that thread's current state first.
- **(c) New thread `loom/docs-infra/ctx-load/`**. Pro: cleanest if no existing thread fits. Con: another thread to maintain.

Also: do we have an **idea/design** for this gap anywhere? If not, the right next step is probably not "plan" but "idea" — the scope is concrete (extend getState's loose-fiber walk to pick up `ctx/` subdirs, decide whether ctx files count in `allDocs.every(done)` for status, decide save path), but each of those is a small design decision worth a brief design doc before a plan locks them in.

**2. Sidebar UX (Phase 3)**

The phasing table says P3 ships "Sidebar CONTEXT UX — interactive include/exclude toggles persisted in `.loom/context-prefs.json`." The `ContextBundle` and overrides plumbing already exist; what doesn't exist is:

- Where the CONTEXT section renders in the tree (under each chat? a dedicated sibling? a webview?).
- How toggle state shows visually (✓ / ✗ / ⊘ for `auto` / `user-exclude` / `user-include-over-auto-exclude`).
- The shape of `.loom/context-prefs.json` (per-target? per-mode? a global "always exclude X" rule?).
- Persistence write path — does this go through MCP or stay extension-local?
- Reconciliation: when the user toggles a doc that's already in `requires_load`, does the override win?

Those are design decisions, not implementation steps. I'd argue Phase 3 wants an **idea + design** pass first (the existing context-pipeline-design.md only sketches "Phase 3" as a heading), then a plan. Otherwise plan-003 ends up making architectural calls inside step descriptions, which we've burned on before.

Same home question as #1: does Phase 3 live in `loom/ai-integration/context-pipeline/` (it's part of the pipeline's UX surface) or in `loom/vscode-extension/` (it's a sidebar/tree-view feature)? My lean is **context-pipeline** because the design contract — what `overrides` mean, what `auto`/`user-include`/`user-exclude` reasons promise — is pipeline-level; the tree view is just one consumer. But the *implementation* will touch `packages/vscode/` heavily, so the alternative is defensible.

**Concrete question for you:** for each item, do you want me to (i) draft a fresh idea doc and stop for you to react, (ii) draft idea + design and stop, or (iii) trust the existing design.md sketches and jump straight to plan? And for the ctx-load gap, which home — (a), (b), or (c)?

STOP — waiting for direction.

## Rafa:

Create thread idea and design for both

## Rafa:

MCP reconnected
threads confirmed


## AI:

One snag on Thread 1's home before I create.

I proposed `loom/docs-infra/ctx-load/`, but `loom/docs-infra/` doesn't actually exist on disk — CLAUDE.md lists it aspirationally, but the real weaves today are `ai-integration`, `app`, `core-engine`, `multi-workspace`, `mvp`, `test`, `vscode-extension` (+ `refs`).

The `ctx-naming` thread — the closest existing sibling, since it's about ctx-doc lifecycle — lives at `loom/core-engine/ctx-naming/`. And `getState` itself is engine-layer (`packages/fs`/`packages/core`-adjacent).

Two paths:

- **(A) Put `ctx-load/` in `core-engine/`** (next to `ctx-naming/`). Lower friction; matches where the code lives; matches the existing pattern. My lean.
- **(B) Create the `docs-infra/` weave** as CLAUDE.md hints, and put `ctx-load/` there. More canonical long-term but expands scope (new weave, no other inhabitants yet).

Thread 2 (sidebar) is unchanged: `loom/ai-integration/context-sidebar/`, already-existing weave.

Which one — (A) or (B)?

## Rafa:

A

## AI:

Both threads created with idea + design.

**Thread 1 — `loom/core-engine/ctx-load/`**
- `ctx-load-idea.md` (`id_01KSTFWA3V21V7B2BQP1WYTYZJ`) — the gap (getState doesn't load thread/weave ctx → pipeline auto-load slots inert), why it hurts, what the fix touches (walk / status-derivation / save-path), coordination with `ctx-naming/`.
- `ctx-load-design.md` (`de_01KSTFX5FNN132HHSFHNSK497C`) — 7 sections with decisions to land: flat-vs-`ctx/`-subdir, walk-change-needed, status-derivation filter, refreshCtx signature, global-ctx back-compat, weave/thread symmetry, plan-001 sketch. Decisions log at the bottom is empty — fill in as we discuss.

**Thread 2 — `loom/ai-integration/context-sidebar/`**
- `context-sidebar-idea.md` (`id_01KSTFYVRPJF86BEYYNTT81C4N`) — the gap (pipeline runs silent, no pre-launch visibility, no toggle path), what ships (CONTEXT tree section + per-target overrides), what doesn't (token budget, ctx-load, multi-target prefs).
- `context-sidebar-design.md` (`de_01KSTFZXP06VXHFDYG1FGAK1KT`) — 9 sections: tree placement, toggle visuals, prefs schema, write path (MCP vs. extension-local), reconciliation rules (esp. `requires_load` overriding user-exclude), re-render strategy, pre-launch update triggers, plan-001 sketch. Decisions log at the bottom is empty.

Both designs have a **My lean:** line on each decision so you can scan-and-accept or push back. Nothing else changed. Status on all four docs: `draft`. Status, role, and target_release fields all null — set them once you've taken a pass.

STOP — ready for design review or whatever order you want to tackle them.

## Rafa:

Create corresponding plans

## AI:

Both plan-001s created:

- **`loom/core-engine/ctx-load/plans/ctx-load-plan-001.md`** (`pl_01KSTGDER8MA9KJF3JS4CG9BHK`) — 6 steps: verify-walk, status-derivation filter, `refreshCtx(scope)` extension, MCP tool surface, reference-doc gap-note removal, real-workspace smoke + green tests.
- **`loom/ai-integration/context-sidebar/plans/context-sidebar-plan-001.md`** (`pl_01KSTGE28WY9C08MBYQSXGGS7R`) — 6 steps: prefs MCP tools, resource-handler wiring, CONTEXT tree node + symbols, toggle commands, badges + 🔒 confirm, real-extension smoke + green tests.

Both plan goals carry a **"decisions not yet recorded — confirm before step 2"** note. Step 1 in each is a verify/scaffold step that's safe to run before the design decisions are formally logged; step 2 is the first one that locks a lean into code (the every-done filter for ctx-load, the resource-handler wiring for context-sidebar) and would need re-planning if a lean changes.

Status on both plans: `draft`. Not started. Ready for design-decision review → `loom_start_plan` when you want to begin.

STOP — waiting for direction. Likely next moves: (a) review/confirm design decisions in either thread, (b) start one of the plans, (c) refine a plan if you want different step granularity.