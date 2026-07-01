---
type: design
id: de_01KVA7ABHNH0MC2FZSS1PPT4J7
title: Roadmap carries the release version (actual_release on plans)
status: done
created: 2026-06-17
updated: 2026-06-17
version: 2
idea_version: 2
tags: []
parent_id: id_01KV98KZVJFEMZBCHMZEEH8ZGZ
requires_load: []
---
# Roadmap carries the release version (actual_release on plans)

## Goal

Make Loom's roadmap own the fact "what version shipped what" instead of leaving it to `git log`. Record the release version on shipped work, derive the current version from that record, and surface it in the roadmap read-model — in a way that works in **any** project, not just Loom.

This design is the version-recording **spine**. The cheap "quick-ship" affordance for plan-less fast fixes is split to a sibling thread (see Non-goals).

---

## Grounded current state

What the schema actually is today (verified, not assumed):

- `target_release?: string` and `actual_release?: string | null` are **design-only** fields (`DesignDoc` in `packages/core/src/entities/design.ts`). `actual_release` is declared but never populated — always `null`.
- **Plans do not carry either field.** `PlanDoc` carries `design_version` / `target_version`, which track *design* staleness — unrelated to releases.
- `loom_update_doc` exposes a `target_release` param gated to `type:design`; the vscode tree (`treeProvider.ts`) displays it.
- `buildRoadmap` history keys shipped plans by their done-doc **date** only — no version. So "what changed since the last tag" can only be answered by `git log <tag>..HEAD`. That is the exact "state is derived, don't trust external sources" promise leaking.

So this thread both **adds** a field (`actual_release` on plans) and **removes** two (`target_release` and `actual_release` from designs).

---

## Decisions (settled in chat-001)

1. **One carrier: `actual_release` on plans only.** A design spans N plans that ship across *different* releases, so a single design-level release is lossy. The plan ships in exactly one release, so the plan is the precise, authoritative record. Roadmap history already keys on done plans — this aligns the version with the unit history already counts.

2. **Drop `target_release` entirely.** It only powers a *forward* roadmap view ("what's planned for v1.10?") that has no validated consumer; this thread and the roadmap value Rafa called useful are about *history*. It is intent, so it drifts the moment anything else ships (a perpetual refine tax), and "what's next" is already answered by priority order. Cut it rather than maintain speculative half-features. Re-add later only behind a real consumer.

3. **`current_release` is derived, never stored** = the max (semver-sorted) `actual_release` across roadmap history. Empty history → no current release (derive-only; **no** external `package.json`/git fallback — that would reintroduce the project-specific read we are eliminating). Correct-on-day-one comes from backfill, not from reading the project.

4. **Writer is a dedicated `loom_record_release(version)` tool**, called by the project's release pipeline. Loom never reads `package.json`, `Cargo.toml`, or git tags itself — the pipeline (which alone knows where "current version" lives) pushes the version *in*. For Loom that pipeline is the `do-release` skill, calling the tool after it tags. Same tool serves any other project.

5. **Backfill is in-scope and full-history.** Because `current_release = max(actual_release)`, an un-backfilled history reads as *no version* until the next release ships — backfill is what makes the derived value true on day one, not polish. Full history (the tag/date map is available anyway).

6. **One carrier means: to appear in versioned history, a thread needs a done plan.** This is not a new constraint — history is *already* keyed on done plans, so plan-less (chat-/idea-only) threads are already invisible to it. We stop pretending otherwise. We do **not** add a thread-level `actual_release` fallback (that reopens the multi-carrier chain we collapsed).

---

## Selection model — how `record_release` picks plans

There are two modes that share the same write (set `plan.actual_release`) but differ in *selection*:

- **Live release** — `loom_record_release("1.9.3")` stamps **every done plan whose `actual_release` is still `null`**. This is correct because, between two releases, only the newly-shipped plans are unstamped. This is the "auto-detect" Rafa chose: *unstamped done plan = shipped in the version being recorded now*.

- **Backfill** — the sweep-unstamped rule cannot work historically (every past plan is unstamped, so the first replayed version would swallow all of them). Backfill instead assigns each done plan **by its done-date** to the version whose `(prevTagDate, tagDate]` range covers it. This needs a `{version → tagDate}` map, which the **pipeline supplies** (it knows git) — core never shells out. Mechanically it is the same write applied per version in chronological order.

So `recordRelease` (the app use-case) takes the version plus an optional explicit selection (a date-range / plan set) so backfill can drive precise assignment; live mode defaults to sweep-unstamped.

---

## Components & layering

Following `cli/vscode/mcp → app → core + fs`:

**core**
- `PlanDoc`: add `actual_release?: string | null`.
- `DesignDoc`: remove `target_release` and `actual_release`.
- `frontmatterUtils.ts` key order: add `actual_release` under plan-specific; remove the two design-specific release keys.
- A small semver compare/max util (location TBD in plan) for deriving current_release and ordering history.
- `buildRoadmap`: history nodes gain a `release` field; expose a derived `current_release` on the roadmap model.

**app**
- New `recordRelease(input, deps)` use-case: resolve target plans (sweep-unstamped, or explicit/date-ranged for backfill), set `actual_release`, persist via `runEvent`.
- Backfill orchestration (replay recordRelease per version over the supplied map).

**mcp**
- New `loom_record_release` tool → `recordRelease`.
- `loom_update_doc`: remove the `target_release` param and its design-only guard.
- `loom://roadmap`: history nodes carry `release`; resource exposes `current_release`.

**cli**
- `loom roadmap` history labels/groups by release version.
- `loom backfill-releases` — thin wrapper that feeds the version/date map into the backfill path. (Not part of `loom migrate` — migrate is layout/schema; this is release-history data derivation.)

**vscode**
- Drop the `target_release` display in `treeProvider.ts`.

**do-release skill** (`.claude/commands/do-release.md`)
- Add a step after tagging that calls `loom_record_release(<version>)`, so Loom's record cross-checks git rather than git being the sole source.

---

## Migration / cleanup

- Old designs carrying `target_release` / `actual_release`: leave the files as-is (frozen history); the fields simply stop being read once removed from the entity + serializer. No rewrite of historical docs — they are ignored, the same way legacy `design.actual_release` was already always-null noise.
- New designs and plans are born without the dropped fields → cleaner frontmatter.

---

## Non-goals

- **Quick-ship 1-step-plan affordance** (so fast fixes land in versioned history with one action) — real, but a separate concern; **split to a sibling thread**. This thread assumes the normal plan lifecycle.
- **Forward roadmap-by-version view** — deferred with `target_release` until a consumer exists.
- Does **not** replace `git log` for changelog *prose* — commit bodies carry the "why". This makes the roadmap answer *which version shipped what* (scope + version), so `do-release` can cross-check.

---

## Success criteria

- A shipped plan records its release (`plan.actual_release` populated).
- `current_release` is derivable as `max(actual_release)` with no external read.
- `loom roadmap` History and `loom://roadmap` expose the release per shipped item, and the resource exposes `current_release`.
- "What shipped in `vX.Y.Z` / since `vX.Y.Z`?" is answerable from Loom without git.
- `target_release` and design-level `actual_release` are gone from the entities, serializer, `loom_update_doc`, and the tree.
- Full backfill maps Loom's shipped history to versions via the pipeline-supplied tag/date map.

---

## Open for the plan

- Where the semver util lives (new `packages/core` util vs. reuse an existing one).
- Exact shape of the backfill input (inline `{version: date}` map vs. read from a generated file the pipeline writes).
- Whether `recordRelease` is idempotent/re-runnable (re-stamping already-stamped plans is a no-op vs. an error).
