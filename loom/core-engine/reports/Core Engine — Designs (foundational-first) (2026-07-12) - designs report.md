---
type: report
id: rp_01KXC9GHQQFNBSB6DBPJB9XEXP
title: "Core Engine — Designs (foundational-first)"
status: active
created: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
kind: designs
generated_at: "2026-07-12T23:10:02.489Z"
---
# Core Engine — Designs (foundational-first)

The design corpus of the `core-engine` weave — the domain model, layering, identity, context, and workflow decisions that everything else in Loom rests on. This run keeps the **oldest/foundational** designs at full depth and lets the most recent, incremental ones fall to reference-only, so the report reads the bedrock rather than the latest patches.

**Coverage (read honestly):** 32 designs selected, **22 read in full**, **10 read at reference-depth only** (title/date marker, body elided for budget). The 22 full docs span 2026‑04‑11 → 2026‑06‑14 (Core Engine → Derived Roadmap); the 10 reference-only docs are the newest (2026‑06‑16 → 2026‑07‑07) and are listed, not summarized, at the end. Claims below rest on the full bodies; the reference-only set is named but not characterized.

---

## 1. The founding thesis

**Core Engine Design** (`de_01KQYDFDDB802XEJM0S329T9WW`) sets the whole system's stance: **Markdown documents are the single source of truth; state is *derived*, not stored; AI acts step-by-step behind human approval; everything is Git-native.** There is deliberately *no* central state machine — thread status/phase is computed from document presence and frontmatter. Two minimal state machines (design, plan) and an event set (`CREATE_DESIGN`, `REFINE_DESIGN`, `START_PLAN`, `STEP_DONE`, …) flow through a single `applyEvent(thread, event) → newThread` pipeline, with side effects pushed to a separate effects layer. This "derive, don't store" principle is the through-line every later design either extends or defends.

Notably, this earliest doc still carries **superseded scaffolding** — `*-idea.md`/`*-design.md` filename suffixes, a `threads/` folder, a declarative `.loom/workflow.yml` custom-workflow engine, and a `-ctx.md` "auto-summarise when the design exceeds 20k chars" mechanism. Several of these were later reversed (see §7). That is expected for a Stage‑1 document and is exactly the kind of drift a foundational-first read surfaces.

---

## 2. Domain model & identity

- **BaseDoc** (`de_01KQYDFDDATTCNZQCNB0JR0Z0F`) — a single generic `BaseDoc<TStatus>` interface that every doc type extends, locking each type's `status` to its own union at compile time and defining the canonical field set (`id`, `title`, `created`, `version`, `tags`, `parent_id`, `requires_load`, `content`). One source of truth for shared fields; adding a field is one edit.
- **Doc IDs — ULID identity with slug presentation** (`de_01KQYDFDDBE8A6JD6P57DM5HV4`) — the pivotal identity refactor: durable identity moves to a prefixed **ULID** (`pl_`, `de_`, `id_`, `ch_`, `dn_`, `rf_`), `child_ids` is **removed** (computed from `parent_id` via the link index), refs are addressed by **slug**, and **ctx is the documented exception** (keeps a semantic id like `loom-ctx`/`{weave}-ctx`). This is the design that makes renames/moves safe — identity is in frontmatter, filename is mere presentation.
- **Weave and Thread — the true graph model** (`de_01KQYDFDDCMH30S303HF03ET00`) — the canonical vocabulary and structure: **Weave** = project folder, **Thread** = one‑idea→one‑design→N‑plans workstream, **Loose fiber** = unassigned weave-root doc. Locks the hard rule **"1 thread = 1 design"** (alternatives become separate threads linked to a common parent idea), declares "threads are cheap; splitting is the model," and lays out `weaves/` layout, cross-thread `parent_id` linking, and a phased migration.
- **Automatic Document ID Management** (`de_01KQYDFDDC2GWRSG7TVP5Z5MAN`) — the pre‑ULID rationale for eliminating hand-maintained ids: auto-generation on finalize plus a refactoring-style `loom rename` that rewrites all inbound references. Historically important as the *problem statement* the ULID design later solved more durably.

**Tension worth noting:** the **Workflow Feature Model** (`de_01KQYDFDDFPJETSXVMRDSKD8C2`) introduced `role: primary | supporting` to allow *multiple* designs per feature — directly contradicted by the later "1 thread = 1 design" rule; Weave & Thread records `role` as **removed (Phase 5, 2026‑04‑23)**. Reading both full shows the model genuinely reversing course, not just adding.

---

## 3. Layering, purity & the write path

- **Introduce Application Layer for Clean Architecture** (`de_01KQYDFDDA1XV31SK6N64VS0ST`) — the `cli → app → core + fs` split: `core` pure/deterministic, `app` orchestration via `(input, deps) => result` use-cases with explicit dependency injection, `fs` IO-only, `cli` thin delivery. This is the dependency rule the whole repo still enforces.
- **Document Body Generators & Utility Extraction** (`de_01KQYDFDDAGJ0Q2B1E1R2ZQ67W`) — kills hardcoded template strings and duplicated path/validation/table logic by centralizing body generators + pure utility modules; retires the physical `.loom/templates/` directory.
- **Scope runEvent saves to the changed doc set** (`de_01KSNACN3T97M7HVG3K0W3WBQB`) — a sharp correctness design born from a real corruption incident: `saveWeave` re-serialized *every* doc in a weave on any single event, turning one non-idempotent save bug into six-doc corruption. Fix: `applyEvent` returns `{ weave, changed: string[] }` and `runEvent` persists **only** the changed docs. Crucially argues *against* a serialize-and-diff shortcut — a signal derived from the serializer inherits the serializer's bugs; the mutation signal must be serialization-independent. Reducers stay pure; the orchestrator owns the changed-id set.

These three together are the clearest statement of Loom's "correct path over short path" value in the design record.

---

## 4. Relationships, dependencies & staleness

- **Structured Link Index** (`de_01KQYDFDDCQ0DBXVNCSCK57P7M`) — a fast, deterministic in-memory index of `parent_id`/`children`/`parent`/`stepBlockers`, built O(N) from frontmatter + plan step tables, incrementally updated on file change. The substrate for instant validation, backlinks, and dependency resolution; explicitly *not* full-text — only explicit, intended relationships.
- **Dependency Tracking in Plans and Across Plans** (`de_01KQYDFDDBCXYVBTRHGT38887N`) — the "Blocked by" step-table column: step numbers for intra-plan deps, plan ids for cross-plan deps, distinguished from `requires_load` (AI context, informational) vs execution-order contract.
- **Staleness Management** (`de_01KQYDFDDC911HGHRQGZV1ZSCA`) — staleness propagates **child-driven, never parent-driven**: a parent change *flags* children stale (⚠ in the tree, counts in `loom://summary`, detail in `loom://diagnostics`) but never silently rewrites them; the user chooses when to refine. Chats are the thinking surface and do **not** auto-stale ideas. Implementing a stale plan **warns, doesn't block**.

---

## 5. Workflow doc-types

- **Requirements-Driven Development** (`de_01KTBA3MSAGGDWC5G55A49JN4T`) — the `req` doc type: one flat `req.md` per thread holding ID'd `✅ Included` / `❌ Excluded` / `⛓ Constraints` lists, **body-as-source-of-truth** (deliberately the opposite of the generated plan-steps table), thread-scope **always-loaded** (fills the slot ctx intentionally left empty), with an explicit `draft → locked` lifecycle. Phase 2 adds `satisfies:` citations on plan steps + a pure structural coverage reducer + an AI semantic backstop — "prevention beats detection."
- **Done Documents** (`de_01KQYDFDDBYKHS1J703PFE3P9T`) — first-class write-once `done` doc (`{plan-id}-done.md`, `status: final`) recording what was actually built; feeds the ctx summariser's "Decisions made" / "Open items."
- **Application Version Tracking** (`de_01KQYDFDDF3J8F6P5F3VJQ8BWQ`) — the naming decision for `target_release` / `actual_release` (chosen over `app-version` to avoid overloading doc `version`); the seed of release-notes/changelog generation.
- **Derived Roadmap** (`de_01KV3GPTMNXT66C4N73WAFN7ZW`) — the first **cross-weave read-model**: a pure `buildRoadmap(state) → RoadmapView` (topo sort over `depends_on` + soft `priority`, status overlay with dependency-`blocked` as the headline signal, done-plan history, cycle/dangling diagnostics). Introduces the `thread.md` manifest (`th_` ULID, authored `priority`+`depends_on`, **no status field** — storing status would recreate the hand-maintained-state anti-pattern). Follows the `req.md` doc-type precedent case-for-case.

---

## 6. The context (ctx) subsystem — a three-design arc

Three designs converge on one model and are best read together:

1. **Unify ctx filenames to plain `ctx.md`** (`de_01KQYDFDDBPFWTRWDMCAH1V45S`) — filename is positional (`loom/ctx.md`, `loom/{weave}/ctx.md`), identity is frontmatter `id`; ctx is the documented exception to "filename matches id."
2. **thread/weave ctx docs not loaded by getState** (`de_01KSTFX5FNN132HHSFHNSK497C`) — the decisive scoping call: **ctx exists at global + weave only; thread scope has no ctx**, because the parent chain already loads a thread's idea/design/plan in full — a thread ctx would duplicate, not compress. Compression only pays where full docs aren't loaded (across threads, across weaves).
3. **Consolidate ctx generators into one** (`de_01KSYEC48HS5VPGRDK5FFDPDFH`) — one `loom_refresh_ctx(scope)` that **assembles, does not infer** (same shape as do-step): it ensures the ctx shell + returns the source; the agent writes the summary via `loom_update_doc`. A scope-agnostic `source_hash` replaces the old design-version staleness check. No sampling / AIClient dependency anywhere.

This arc is the cleanest example in the corpus of a decision *narrowing* over time (ctx started global+weave+thread, ended global+weave) with each design citing the previous.

---

## 7. Lifecycle & agent-DX housekeeping

- **Archive management** (`de_01KQYDFDDAGQTWJZT0PAE09GTQ`) — a central `loom/.archive/{reason}/{mirrored-source-path}` layout (`cancelled`/`deferred`/`superseded`/`chats`), chosen (Option B) for visual obviousness and zero frontmatter dependency for tree rendering; archived docs stay in the link index flagged `archived`.
- **Agent doc-tooling DX** (`de_01KT3FG3M865N54WBT3Z95T20Y`) — two agent-friction fixes: a broken `loom://link-index` serialization (Maps → `{}` on the wire) and a centralized `resolveDocIdOrThrow` suggest-on-miss; plus optional `body`/`content` on `create_*` (doc born at v1 with real content, not v1-stub→v2) and a sampling-free `loom_promote` body path (unblocking promote in Claude Code).
- **Workspace Directory Structure** (`de_01KQYDFDDCB06E6V25HT94VAP3`) — the early thread-based (vs type-based) layout decision. Historically important but partly superseded: it still shows `threads/`, `_archive/`, and suffix filename conventions the later Weave/Thread and ULID designs replaced with `loom/{weave}/{thread}/` + flat canonical filenames.

---

## 8. Cross-cutting patterns

Reading the foundations together, a few conventions recur across otherwise unrelated designs:

- **Derive, don't store** — status/phase/roadmap/backlinks are all computed; the one place authored state is tolerated (`thread.md` priority) is called out as "the honest human bit."
- **Pure core, effects at the edge** — reducers are `(doc, event) => doc`; every design that touches persistence (runEvent-scope, ctx-generate, roadmap) keeps the hard logic pure and unit-testable and pushes IO to `fs`.
- **Assemble, don't infer** — ctx generation and (by reference) do-step both hand the agent assembled source and let it act; server→client sampling is deliberately avoided.
- **New doc-types follow one template** — `req.md` paved the flat-per-thread, `BaseDoc`, no-reducer, always-loaded pattern that `thread.md` then reused case-for-case.
- **Fix the cause, not the symptom** — runEvent-scope rejects the diff shortcut; ID-management/ULID fixes identity at the root; archive/ctx refactors take the clean break over a shim.

---

## 9. Reference-only (newest designs, not read in this run)

These 10 recent designs were degraded to reference-depth by the budget (foundational-first ordering keeps the oldest full). They are listed for completeness; their content was **not** read here — regenerate with `--sort recency` or `--full` to cover them at depth:

- Canonical Date Handling — `de_01KV7K8QRWASFRVD0RECSB96D2` (2026‑06‑16)
- Roadmap carries the release version (`actual_release` on plans) — `de_01KVA7ABHNH0MC2FZSS1PPT4J7` (2026‑06‑17)
- Align stale surfaces — one canonical staleness model — `de_01KWC4K9YJ2R4GJJR7VS6X1ADX` (2026‑06‑30)
- Trustworthy staleness — directional, version-based model — `de_01KWCR8E1NC37G0GW05A14X9C9` (2026‑06‑30)
- Loom entities CRUD — `de_01KWEGNABRHPMVY50E6DGRX4WQ` (2026‑07‑01)
- `loom_create_plan` blockedBy ordinal→slug normalization — `de_01KWGTDV2BKCYGE8THQYVBPXT3` (2026‑07‑02)
- `loom_archive` atomic-move — `de_01KWH5FR1BGXFH3GBKECKHG9DF` (2026‑07‑02)
- Quick-ship — one-call done-plan recorder — `de_01KWJD3J9MB1XC6XE32QXWDWGA` (2026‑07‑02)
- API contract — unambiguous naming + canonical ULID — `de_01KWKFHSXS96W36BE28VYFG64P` (2026‑07‑03)
- Align the MCP read surface to the Slug/Ulid contract — `de_01KWYVRS94S3K18HDRSVPHNE4K` (2026‑07‑07)

The cluster is telling on its own: the most recent design activity is **consolidation and hardening** (staleness unification, naming/contract alignment, atomic operations, one-call recorders) rather than new subsystems — the engine's foundations are settled and the recent work refines their surfaces.

## Provenance

- **Kind:** designs
- **Scope:** weaves: core-engine; threads: all; from: —; to: —
- **Sources:** de_01KQYDFDDB802XEJM0S329T9WW, de_01KQYDFDDFPJETSXVMRDSKD8C2, de_01KQYDFDDCB06E6V25HT94VAP3, de_01KQYDFDDF3J8F6P5F3VJQ8BWQ, de_01KQYDFDDBCXYVBTRHGT38887N, de_01KQYDFDDCQ0DBXVNCSCK57P7M, de_01KQYDFDDC2GWRSG7TVP5Z5MAN, de_01KQYDFDDA1XV31SK6N64VS0ST, de_01KQYDFDDAGJ0Q2B1E1R2ZQ67W, de_01KQYDFDDATTCNZQCNB0JR0Z0F, de_01KQYDFDDCMH30S303HF03ET00, de_01KQYDFDDBYKHS1J703PFE3P9T, de_01KQYDFDDBE8A6JD6P57DM5HV4, de_01KQYDFDDC911HGHRQGZV1ZSCA, de_01KQYDFDDAGQTWJZT0PAE09GTQ, de_01KQYDFDDBPFWTRWDMCAH1V45S, de_01KSNACN3T97M7HVG3K0W3WBQB, de_01KSTFX5FNN132HHSFHNSK497C, de_01KSYEC48HS5VPGRDK5FFDPDFH, de_01KT3FG3M865N54WBT3Z95T20Y, de_01KTBA3MSAGGDWC5G55A49JN4T, de_01KV3GPTMNXT66C4N73WAFN7ZW, de_01KV7K8QRWASFRVD0RECSB96D2, de_01KVA7ABHNH0MC2FZSS1PPT4J7, de_01KWC4K9YJ2R4GJJR7VS6X1ADX, de_01KWCR8E1NC37G0GW05A14X9C9, de_01KWEGNABRHPMVY50E6DGRX4WQ, de_01KWGTDV2BKCYGE8THQYVBPXT3, de_01KWH5FR1BGXFH3GBKECKHG9DF, de_01KWJD3J9MB1XC6XE32QXWDWGA, de_01KWKFHSXS96W36BE28VYFG64P, de_01KWYVRS94S3K18HDRSVPHNE4K
- **Generated:** 2026-07-12T23:10:02.489Z
