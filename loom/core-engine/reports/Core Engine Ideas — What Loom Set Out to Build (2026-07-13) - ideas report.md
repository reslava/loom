---
type: report
id: rp_01KXD3HQDEBY1BMC6EXTGRRQ64
title: "Core Engine Ideas — What Loom Set Out to Build"
status: active
created: 2026-07-13
version: 1
tags: []
parent_id: null
requires_load: []
kind: ideas
generated_at: "2026-07-13T06:45:04.048Z"
---
# Core Engine — Ideas Report

*Everything the `core-engine` weave set out to build, synthesized from its idea docs.*

> **Coverage: complete.** All **34** idea docs in `core-engine` were read in full — the assembled slice reported `tiers={full:34}`, `116,744 / 116,744 chars emitted`, `budgeted=false`. No summarization or budget degradation; nothing was dropped. Every claim below traces to a cited idea id.

---

## The founding thesis

**Document-Driven AI Workflow System** `id_01KQYDFDDBK79TTRP2W1QK5FFM` is the root idea the whole weave elaborates: a **document-native operating system for AI collaboration** where *the filesystem is the database and Markdown is the API*. Its four pillars recur as design pressure across almost every later idea:

- **Markdown as state machine** — state is *derived* by reading frontmatter `status`, never stored centrally.
- **Design as conversation log** — `## User:` / `## AI:` history gives the model perfect recall of *why*.
- **Reactive staleness** — changing a parent silently ages its children so dead plans can't be executed.
- **Governed agency** — nothing hits disk until a human approves; git-native, LLM-agnostic, zero lock-in.

Nearly every idea that follows is either *infrastructure this thesis needs* or *a trust bug where the "state is derived" promise leaked.*

---

## 1 · Derived state & the engine core

| Idea | id | Proposes | Why it matters |
|------|----|----------|----------------|
| **LoomState — first-class entity** | `id_01KQYDFDDCDX24651YYE1JCQRY` | A single `LoomState` entity + `getState()` use-case as the one authoritative derived-state object, cacheable to `.loom/cache/state.json`. | Kills scattered/duplicated state computation; enables alternate frontends. **Deferred post-MVP.** |
| **Scope runEvent saves to the changed doc** | `id_01KSGJSN9N8DHX4G7M2P281BMS` | A workflow event should `saveDoc` only what it changed — not re-serialize every doc in the weave. | Bounds blast radius: one truncation bug once corrupted 4 unrelated sibling plans purely because they were re-saved as collateral. |
| **Restore core-layer purity** | `id_01KV8SQ30HTWQF3EK4KT98RR73` | Move `ConfigRegistry` file IO out of the contractually-pure `core` into `fs`; add a build-time guard banning node-fs imports under `core`. | `core` purity is the keystone of the `cli/vscode/mcp → app → core+fs` layering. |
| **Table-driven layer-imports guard** | `id_01KV93ZE152CHPW6CTV8VNPBMG` | One `layer-imports.test.ts` encoding the full allowed-import matrix; subsume the two bespoke fs-purity guards. | "Discovery moves out of live recursive sessions" only holds if *every* dependency edge is checked, not two. |

---

## 2 · Document identity, format & schema

The shared intent: **decouple a doc's identity from its filename, title, and location** so rename/move/drag-drop never breaks references.

- **Canonical Frontmatter Serializer** `id_01KQYDFDDAX50NGR6FAZ4G6GSC` — a hand-rolled serializer (stable key order, inline arrays, predictable diffs) because YAML libraries optimize for *valid*, not *stable*, output. Treat YAML as a target format, not a source of truth.
- **Doc IDs — ULID identity with slug presentation** `id_01KQYDFDDBJSRCQTW60ANFM9YR` — every doc gets a `{type-prefix}_{ulid}` id; drop the drift-prone `child_ids` (backlinks computed from `parent_id`); narrow `requires_load` to refs-by-slug. The migration that makes rename/move/drag-drop safe.
- **Chat doc frontmatter schema** `id_01KQYDFDDAPGGZTSF7JATTKQ20` — give `type: chat` real frontmatter so chats stop being invisible to the link index and id-resolving tools.
- **Plan Done Documents** `id_01KQYDFDDB0WEBX52CDG69VXYP` — a `{plan-id}-done.md` retrospective closing the loop between design intent and implementation reality; the most accurate source for "key decisions made."
- **Canonical Date Handling** `id_01KV7K7BT499TMH7ZDQN9Q7ZV4` — one `core/dates.ts` owning all date production/parsing/comparison. Root cause it fixes: mixed on-disk formats compared *lexicographically* sorted same-day dates wrong, corrupting roadmap history order.

---

## 3 · The context (`ctx`) subsystem — a visible evolution

This is the clearest **idea-lineage** in the weave: five ideas converging on one answer, with an explicit supersession.

```
global-ctx ──(superseded)──▶ ctx-generate
ctx-naming ──▶ ctx-load ──▶ ctx-generate ──▶ ctx-surface-parity
   (flat name)   (global+weave,   (one tool)      (open: is weave
                  drop thread ctx)                  ctx real?)
```

- **Global Ctx** `id_01KQYDFDDC5KQMGQJKN66H5RX9` — proposed a project-level `loom/ctx.md` + a 3-layer hierarchy. **Explicitly superseded (2026-05-31)**: its 3-layer/thread-ctx model was overtaken; kept only for history.
- **Unify ctx filenames to `ctx.md`** `id_01KQYDFDDB0AHWHNW6GTHKMR7P` — one name, three locations; path = scope. Ends the awkward `loom/loom-ctx.md` doubling.
- **thread/weave ctx not loaded by getState** `id_01KSTFWA3V21V7B2BQP1WYTYZJ` — the settling decision: **ctx = global + weave only**, flat `ctx.md`, stable id. Thread ctx *rejected* (the parent chain already loads idea/design/plan in full — a thread summary just costs tokens).
- **Consolidate ctx generators** `id_01KSYE3WFEGBZ39SB9XDMX7X99` — collapse three redundant, incompatible ctx-generation tools into one `loom_refresh_ctx(scope)` that assembles rather than generates (so it works in a CLI session where sampling is dead).
- **ctx scope & surface parity** `id_01KXC5B8CFZJANSMRTSCGEFP8K` *(newest, open)* — the still-unresolved fork: **is weave ctx a supported feature (B) or is ctx global-only (A)?** The tool still offers `scope: "weave"` while practice is global-only, the extension shows *no* ctx at all, and there's no CLI mirror. Demands one answer reflected identically across MCP/CLI/extension/docs.

---

## 4 · Staleness — the feature Loom is *about*, and its trust crisis

Staleness detection is named as Loom's core feature — and these three ideas are the arc of it breaking trust and being rebuilt.

- **Staleness Management** `id_01KQYDFDDCKTVHTZZE0NTS504V` — the original intent: turn passive stale-detection into *proactive*, cascading, actionable state. Established two rules: staleness **warns, never blocks**; chats never auto-stale a parent.
- **Align stale surfaces** `id_01KWC417DGX4A215ZS521G5VKR` — the alarm: "stale" was computed **three different ways** (getState summary, the VS Code tree, `getStaleDocs`) with divergent axes and direction, so surfaces *disagreed* — hiding a project-wide `design_version` bug. Goal: one canonical predicate in `core`, every surface a thin consumer.
- **Trustworthy staleness — directional, version-based** `id_01KWCR77B6N0EKJR6S0XTMPP1S` — the redefinition, prompted by Rafa saying he *no longer trusts* staleness. One rule everywhere: **a child is stale when an upstream dependency's version moved past the child's stamped baseline** — directional (downstream only), version-based (no fragile date compares). Also fixes a structural error: `req` depends on `design`, not the reverse. **Supersedes** the (archived) `version-on-content-only` thread.

---

## 5 · Requirements survive the workflow

- **Requirements-Driven Development** `id_01KT77TXDA9H80GMW62NY0GD7B` — a dedicated, always-loaded **`req.md`** per thread holding three immutable lists (**✅ Included / ❌ Excluded / ⛓ Constraints**) with stable handles (`IN1`, `EX1`, `C1`). The trigger: a chat opener's "no interaction testing" exclusion was *dropped on promotion*, so the planner invented a smoke-test step the user had explicitly ruled out. The generator's job is redefined as **faithful translation of the user's spec, never imposition of policy** — no step-count rules, no banned-step lists. Plan steps gain a `satisfies: [IN1, …]` citation so a pure structural reducer can verify scope traceability. Explicitly *rejects* the tempting fix of hardcoding preferences into the plan-generation prompt.

---

## 6 · The derived roadmap & release history

- **Derived Roadmap** `id_01KV3GC10MFGWMKQ84JEGYQEQW` — a cross-weave read-model answering present/future, past, and (the headline) **blocked-on across weave boundaries** — the one fact a human can't compute by hand. Roadmap is *derived, never authored*; humans write only soft `priority` and hard `depends_on` edges on a required `thread.md`. Loom's first cross-weave read-model, and a real test of "state is derived" at project scope.
- **Roadmap history carries the release version** `id_01KV98KZVJFEMZBCHMZEEH8ZGZ` — wire the already-declared-but-always-null `actual_release` through so the roadmap can answer "what shipped in vX.Y.Z?" without git archaeology.
- **Quick-ship** `id_01KVACCC86E0B0EKACG6HH0DT4` — a one-action done plan (`loom_quick_ship`), so fast fixes leave a done plan and become visible to versioned history — because roadmap history and `actual_release` key on **done plans only**, and the create→start→step→close dance is friction enough that quick fixes skip it.

---

## 7 · Plan-step integrity — the `blockedBy` bug family

A tight cluster, all sharing one principle: **no dependency edge is ever lost — or silently falsified — at write time.**

| Idea | id | The silent failure it closes |
|------|----|------------------------------|
| **Harden `loom_create_plan`** | `id_01KV8SRTQJ1N3HG9VWD1N7HEC4` | A stringified `steps` payload produced `steps: []` + leaked wire markers into the body — and still **returned success**. Validate/coerce or hard-error; assert `steps.length` post-write. |
| **Normalize blockedBy ordinals to slugs** | `id_01KVA8QBDJHGNRZQFNJ87PAYZ3` | `create_plan` stored ordinal `blockedBy` (`["1","2"]`) verbatim instead of resolving to reorder-safe step-id slugs; `update_step` already resolved them — an inconsistency. |
| **`resolveBlockedByIds` drops numeric ordinals** | `id_01KWJE0CZJG37MM3V1V3CH81GK` | `blockedBy: [1]` (JSON *number*, not string) hit an empty-guard and vanished with no error. Coerce numbers before the guard, in the single resolver. |
| **Validate cross-plan `pl_` refs at write time** | `id_01KWY5G05RHV3EN90EREP46ZYW` | A `blockedBy` naming a non-existent plan is accepted verbatim and silently pins the step *permanently blocked*. Raises a genuine design fork: hard-throw vs. warn vs. status-quo, since a forward-reference to a not-yet-created plan may be legitimate. |

---

## 8 · The API-naming contract

- **Unambiguous API naming + canonical ULID everywhere** `id_01KWKDH801PGWJJCKECP3HZZ2A` — root of the naming discipline. A `create_idea(threadId="th_…")` call where `threadId` was actually a *folder slug* fabricated a duplicate thread and orphaned the idea. The fix is the **name, not missing code**: a param ending in `Id` MUST mean the stable ULID; slugs are `*Slug`. One comprehensive breaking refactor + a naming reference + a CLAUDE.md rule.
- **Align the MCP read surface** `id_01KWYT8BTZTGT9M6QDF6BDMQ0Z` — the write refactor's audit was scoped to "`loom_*` tools + app use-cases," so **resources and prompts were never reached** and still speak the old `Id` dialect. Rename URI placeholders/prompt args to `*Slug`/`*Ulid`, ensure slug-in addressing, and stamp `{weave_slug, thread_ulid}` into the context-bundle manifest so one read yields both reasoning context *and* the write address.
- **Agent doc-tooling DX** `id_01KT2M4HTWB9Q66V82A6P790E8` — two friction reducers for agent sessions: (1) expose a doc's resolved path + make lookup failures *teach* (fuzzy-suggest the right id on a wrong-but-close key); (2) collapse the `create_* → update_doc` two-step into one create-with-body call.

---

## 9 · Archive, layout migration & cleanup

- **Archive management** `id_01KQYDFDDA5F6SJJ3K7PA7HHBJ` — consolidate scattered `.archive/` folders under one `loom/.archive/` root with a reason taxonomy (`cancelled` / `deferred` / `superseded` / `chats`) and make archives *visible* in the VS Code tree (they're invisible today).
- **`loom_archive` must move atomically** `id_01KWH56AJ9M2AZEEJ72JZ8C93J` — archive was *copying* not moving (fs-extra's copy-then-unlink fallback fails on Windows when a file is open in an editor tab), leaving duplicate ULIDs. Atomic-or-fail: assert the source is gone, surface the real error, never return success with a surviving source.
- **Run migrate-layout** `id_01KWFV8SFG5EC7RYZARGHCYAQY` — a runbook to flatten every doc to canonical flat filenames (`idea.md`, `plan-NNN.md`), rename-only, collision-aware, verified by "git diff shows only renames, zero content deltas."
- **Clean legacy-read** `id_01KWFV92KHVWBRJH6S8ZBBACBH` — once migrated, *delete* the dual-read scaffolding (no back-compat needed — Loom has no external users yet) and rename the misleading `weave.looseFibers` field (a loose fiber is a graph position, not a location).
- **Remove orphaned jest tests** `id_01KWGW7S6SRKFZX34ZS0BBDJ04` — `packages/core/test/**` is jest-style but *nothing runs it* (no jest config); dead tests are a false coverage signal. Unify on the one real root `tests/` ts-node harness.

---

## Cross-cutting themes

- **"State is derived" as a recurring stress test.** Roadmap, staleness, dates, and ctx each expose a place where the derived-state promise silently leaked — and each idea is a repair to restore it. This is the weave's dominant intent.
- **Silent failure is the cardinal sin.** The whole `blockedBy` family, `create_plan` hardening, and atomic-archive share one villain: an operation that corrupts data *and returns success*. The stated principle — no edge lost or falsified silently — is the weave's most-repeated success criterion.
- **The name is the API.** Because the primary API consumer is a model reasoning from parameter names, naming ambiguity is treated as a *load-bearing data-corruption risk*, not cosmetics (`api-contract-refactor` → `mcp-read-surface-naming`).
- **Mechanical enforcement over discipline.** Layer-imports guards, purity guards, and sync tests all encode the rule "move discovery out of live recursive sessions into test-all."

## Abandoned / superseded / deferred intentions

- **Superseded:** *Global Ctx* `id_01KQYDFDDC5KQMGQJKN66H5RX9` — its 3-layer hierarchy and thread-level ctx were explicitly overtaken by the `ctx-load` → `ctx-generate` line (thread ctx *rejected*, global+weave-only settled).
- **Superseded (named):** *Trustworthy staleness* `id_01KWCR77B6N0EKJR6S0XTMPP1S` supersedes the archived `version-on-content-only` thread (folded in as its item 1).
- **Deferred:** *LoomState entity* `id_01KQYDFDDCDX24651YYE1JCQRY` — parked as post-MVP optimization, not a workflow requirement.
- **Open / undecided:** *ctx scope & surface parity* `id_01KXC5B8CFZJANSMRTSCGEFP8K` — the A-vs-B weave-ctx fork is deliberately left unresolved for its design phase.

## Provenance

- **Kind:** ideas
- **Scope:** weaves: core-engine; threads: all; from: —; to: —
- **Sources:** id_01KQYDFDDBK79TTRP2W1QK5FFM, id_01KQYDFDDAX50NGR6FAZ4G6GSC, id_01KQYDFDDCDX24651YYE1JCQRY, id_01KQYDFDDB0WEBX52CDG69VXYP, id_01KQYDFDDC5KQMGQJKN66H5RX9, id_01KQYDFDDAPGGZTSF7JATTKQ20, id_01KQYDFDDBJSRCQTW60ANFM9YR, id_01KQYDFDDCKTVHTZZE0NTS504V, id_01KQYDFDDA5F6SJJ3K7PA7HHBJ, id_01KQYDFDDB0AHWHNW6GTHKMR7P, id_01KSGJSN9N8DHX4G7M2P281BMS, id_01KSTFWA3V21V7B2BQP1WYTYZJ, id_01KSYE3WFEGBZ39SB9XDMX7X99, id_01KT2M4HTWB9Q66V82A6P790E8, id_01KT77TXDA9H80GMW62NY0GD7B, id_01KV3GC10MFGWMKQ84JEGYQEQW, id_01KV7K7BT499TMH7ZDQN9Q7ZV4, id_01KV8SQ30HTWQF3EK4KT98RR73, id_01KV8SRTQJ1N3HG9VWD1N7HEC4, id_01KV93ZE152CHPW6CTV8VNPBMG, id_01KV98KZVJFEMZBCHMZEEH8ZGZ, id_01KVA8QBDJHGNRZQFNJ87PAYZ3, id_01KVACCC86E0B0EKACG6HH0DT4, id_01KWC417DGX4A215ZS521G5VKR, id_01KWCR77B6N0EKJR6S0XTMPP1S, id_01KWFV8SFG5EC7RYZARGHCYAQY, id_01KWFV92KHVWBRJH6S8ZBBACBH, id_01KWGW7S6SRKFZX34ZS0BBDJ04, id_01KWH56AJ9M2AZEEJ72JZ8C93J, id_01KWJE0CZJG37MM3V1V3CH81GK, id_01KWKDH801PGWJJCKECP3HZZ2A, id_01KWY5G05RHV3EN90EREP46ZYW, id_01KWYT8BTZTGT9M6QDF6BDMQ0Z, id_01KXC5B8CFZJANSMRTSCGEFP8K
- **Generated:** 2026-07-13T06:45:04.048Z