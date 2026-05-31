---
type: design
id: de_01KSTFX5FNN132HHSFHNSK497C
title: thread/weave ctx docs not loaded by getState
status: draft
created: "2026-05-29T00:00:00.000Z"
updated: 2026-05-31
version: 4
tags: []
parent_id: id_01KSTFWA3V21V7B2BQP1WYTYZJ
requires_load: []
---
# thread/weave ctx docs not loaded by getState

## Decision summary (2026-05-31, chat-001)

ctx exists at **global + weave only**. Flat `ctx.md` per scope, stable id (`loom-ctx` / `{weave}-ctx`), single file (regenerate overwrites). **Thread scope has no ctx** — the pipeline already loads a thread's idea/design/plan in full as the parent chain, so a thread-ctx would duplicate context, not compress it. Compression only pays off where the full docs are *not* loaded: weave (across threads) and global (across weaves).

---

## §1 — On-disk layout

Flat: `loom/ctx.md` (global), `loom/{weave}/ctx.md` (weave). No `ctx/` subdir. Filename is positional; identity is frontmatter `id`. No thread ctx file.

## §2 — Loading (the real gap)

- **Global** `loom/ctx.md` → `getState` root `.md` glob → `globalDocs`. Works.
- **Weave** `loom/{weave}/ctx.md` → `loadWeave` weave-root `.md` glob → `looseFibers`; `assembleContext` emits loose fibers of `type: ctx` as weave ctx. **Already works** — the earlier "inert" framing was wrong for weave.
- **Thread** `loadThread` reads only `{thread}-idea.md` / `{thread}-design.md` + reserved subdirs; never scans the root. We are **not** adding a thread ctx load — thread ctx is dropped by design.
- Real remaining gaps: (a) status derivation counts ctx/reference (§3); (b) the ctx writers write to wrong/dead paths (§4).

## §3 — Status derivation

`getWeaveStatus` / `getThreadStatus` (in `packages/core/src/derived.ts`) use `allDocs.every(d => d.status === 'done')`. A perpetual ctx (or reference) blocks `DONE` forever. Fix: exclude `type === 'ctx'` and `type === 'reference'` from the predicate.

## §4 — Writers → canonical path (option B)

Three ctx writers exist; all wrote to wrong/dead locations. Fix paths, keep all three tools (no consolidation — flagged follow-up):

- `generate_global_ctx`: `loom/loom-ctx.md` → `loom/ctx.md`.
- `summarise`: `loom/{weave}/{weave}-ctx.md` → `loom/{weave}/ctx.md`.
- `refresh_ctx`: `loom/{weave}/[{thread}/]ctx/{id}-DATE.md` → `loom/{weave}/ctx.md`, id `{weave}-ctx`; drop `threadId`, the `ctx/` subdir, the dated id.

## §5 — Global back-compat

`loom/ctx.md` (id `loom-ctx`) load path unchanged. Global generation now writes the same canonical file instead of `loom-ctx.md`.

## §6 — Symmetry → revised

Earlier recorded "weave ⇄ thread symmetric." **Revised:** ctx is global + weave; thread is the leaf and has no ctx. Global and weave stay symmetric (flat `ctx.md`, same status filter, same canonical write path); thread is intentionally excluded.

## §7 — Assembler

Remove the thread-ctx auto-load slot (dead under this decision); keep global + weave. Update the ordering docstring.

---

## Decisions log

| # | Question | Decision | Date |
|---|---|---|---|
| Scope | Which scopes get ctx? | **Global + weave only**; thread dropped (parent chain already loads the real docs) | 2026-05-31 |
| §1 | Layout | **Flat `ctx.md`**, stable id, single file | 2026-05-31 |
| §3 | Status | Exclude **ctx + reference** from every-done | 2026-05-31 |
| §4 | Writers | Fix all 3 to canonical path; **no consolidation** (option B) | 2026-05-31 |
| §6 | Symmetry | global+weave symmetric; **thread none** | 2026-05-31 |

## Follow-ups (out of scope)

- Consolidate the 3 generation tools into one — blocked on the orthogonal AIClient-vs-MCP-sampling canonical-path choice; belongs to a generation thread.
- Thread-level token pressure → Phase 5 budgeting, not a thread ctx.