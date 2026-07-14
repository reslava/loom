---
type: design
id: de_01KXFHE7S0WFCYHE0ADS6A3QDW
title: Release-notes report — do-release drafts its changelog from the graph
status: active
created: 2026-07-14
updated: 2026-07-14
version: 10
idea_version: 1
tags: []
parent_id: id_01KXETZC3SX632SXB8E9VM7862
requires_load: []
---
# Release-notes report — do-release drafts its changelog from the graph

## Resolved stance

`do-release` drafts its changelog **from the Loom doc graph**, not from a hand-read of `git log`. Fork #1 (git-spine vs graph-sourced vs hybrid) is settled: **pure graph spine + git-log coverage net, no date math.**

- **Spine = unversioned done plans.** A done plan with `actual_release == null` *is* this release's contents — the same set `record-release` stamps at the end of the run. Selection is by the *absence* of `actual_release`, a fact that already exists at draft time. This sidesteps the chicken-and-egg entirely (we never select on the not-yet-written value).
- **git log = the coverage net, not the source.** Its only job is to catch user-facing changes that shipped with *no* done plan.
- **No date window.** `--since <last-tag>` is fragile at tag boundaries; "unversioned" is exact.

## What already exists (grounding)

The machinery is largely built — this thread is **framing + wiring**, not new selection code.

- **`release-notes` report kind** — `packages/core/src/reportKinds.ts:77`. Roadmap-passthrough (`docTypes: []`); its `promptFraming` already groups roadmap `history` by release version and puts release==null work under an **"Unreleased"** heading.
- **`buildHistory`** — `packages/core/src/derived.ts:316`. Emits every done plan as a `ShippedPlan` carrying `release: plan.actual_release ?? null`. The `release == null` subset **is** the unversioned-done spine — no new selector needed; the roadmap already computes it.
- **`record-release`** — stamps `actual_release` onto the done plans at the end of `do-release` (`packages/app/src/recordRelease.ts`). At draft time the just-shipped plans are still `null` → they fall in the "Unreleased" bucket; after `record-release` they move to a versioned section on the next run.

## Architecture

```
loom report release-notes   ← GENERIC (ships in the package; any repo / CI runs it)
  • select the release:null (Unreleased) set
  • hydrate those plans' done-doc bodies → assemble the Added/Changed/Fixed + Highlights
    brief (titles-only fallback)
  • doc-graph empty-set guard: no unreleased plans / threads still `implementing` → stop-signal
  → the invoking agent curates the brief into prose (synthesis stays with the agent, no LLM in the CLI)

do-release (per-repo skill)   ← THIN
  1. run `loom report release-notes` → draft (or the empty-set stop-signal)
  2. git-process add-on: git-log coverage net + dirty-tree tell (release-side, not doc-graph)
  3. human-review STOP  (UNCHANGED)
  4. write repo changelog file(s) → bump / tag / push   (repo-specific)
  5. record-release   (stamps actual_release onto the just-shipped plans)
```

The report **drafts**; the human still **approves**. The existing review gate and the bump/tag/push tail are untouched.

### 1. Selection — the unversioned-done spine

Reuse the `release-notes` kind's roadmap-passthrough. The draft's body comes from `buildRoadmap(state).history` filtered to `release == null` (the "Unreleased" bucket). No new report kind, no `docTypes` scan required for the baseline.

### 2. The git-log net

After the graph draft, compute the residue: `git log <lastTag>..HEAD --oneline` minus the changes already represented by unversioned done plans. Surface the residue as a **"Not covered by a done plan"** appendix in the draft so the human can fold genuine user-facing commits (raw `chore:`/`docs:`/typo-to-main) into the notes or dismiss them. `quick_ship`'s descriptive-title done docs already shrink this residue to near-zero — the net exists to prove completeness, not to carry the changelog.

### 3. Framing — Added / Changed / Fixed

The existing framing groups by *release version*. For the do-release draft we want the standard changelog shape (Added / Changed / Fixed) over the single Unreleased set — and, crucially, **curated, user-facing prose**, not raw engineering titles. This is a **two-layer pipeline**, and the layers split cleanly across the kind and the skill:

- **Structure (kind, generic).** The `release-notes` kind stays **roadmap-passthrough** (`docTypes: []`). Its `promptFraming` owns the *shape*: sub-structure each version group (incl. "Unreleased") as Added/Changed/Fixed, in a **user-benefit voice**, grouped by theme, with a short **Highlights** lead. This benefits the standalone `release-notes` report too, and preserves the passthrough contract + the `report-selection` test (`docTypes` empty).
- **Enrichment (skill, default).** The passthrough carries **titles only** (`buildHistory` emits no bodies) — too thin for a curated changelog, and defaulting to titles would throw away the *why* that motivated graph-sourcing in the first place. So by default the `do-release` skill **hydrates**: it already holds the Unreleased plan ids from the report, so it reads *those* done-doc bodies inline (a bounded set — one release's worth, ~3–20 docs) and feeds title + done-body per change into the in-session synthesis. This is the honest-dogfooding win and the vision hook — the AI **rereads its own implementation notes at release time** and turns them into the changelog.
- **Inference (skill, free).** do-release runs in a live Claude agent (no API key, no sampling — the primary AI path), so curation costs only tokens: reframe into user-benefit language, group related changes, lead with headline features, drop internal noise. The human-review gate does final polish.

**Settled: done-body enrichment is the default; titles-only is a cheap fallback flag** for a release that wants a fast, low-token draft. The bounded per-release cost (a handful of dones) is unlike bulk report generation, so enrichment-by-default is affordable here.

### 4. Invocation — a generic `loom report release-notes`, called by the per-repo skill  *(amended after plan-001)*

**Correction.** plan-001 put the whole workflow *inline in the `do-release` skill* — which meant it only shipped to *this* repo; every other Loom project would have to reinvent selection, enrichment, and the guards. That half-ships the feature and violates the project-agnostic goal. plan-002 pushes the generic workflow **down into `loom report release-notes`** (CLI + the `report` MCP prompt) so it ships in the package and every Loom project — and any release CI — consumes it identically.

- **The command does the generic, doc-graph work:** select the `release: null` set · hydrate those plans' done-doc bodies (enrichment default, `--titles-only` fallback) · apply the **doc-graph empty-set guard** (no unreleased plans / threads still `implementing`) · assemble the A/C/F + Highlights **brief**.
- **Synthesis stays with the agent** — consistent with Loom's existing report model (the `report` prompt returns a brief; the agent writes the prose; no LLM / API key in the CLI). A CI consumer runs an agent (e.g. `claude` in an Action) against the same command.
- **The per-repo `do-release` skill shrinks** to: run the command → review at the existing STOP → write the repo's changelog file(s) → bump/tag/push. Repo-specific only.
- **Git-process checks** (the `git log` coverage net, the dirty-tree tell) touch git, not the doc graph, so they stay a thin release-side add-on in the skill/CI — not buried workflow.

## Project-agnostic seam

The reminder cuts a clean line:

- The **`release-notes` report kind** (select unversioned dones, A/C/F framing) is **generic** — every Loom workspace has done plans and an `actual_release` field. Stays in `packages/core` reporting, zero Loom specifics.
- The **`do-release` skill** wiring is per-repo runbook and *may* be Loom-specific (lockstep versioning, package layout). It **invokes** the generic report; nothing repo-specific leaks into the kind.

**Two dogfood targets — the seam pays off immediately.** Because the kind is generic and each repo's `do-release` skill invokes it, the feature lands in **both** repos this project ships:
- **This repo** (`loom`) — `.claude/commands/do-release.md` + `RELEASING.md`.
- **Chord Flow** (`J:/src/chord-flow`) — its parallel `do-release` skill gets the same graph-draft wiring, so a real Loom-*user* repo drives the feature too. Chord Flow consumes the published `@reslava/loom`, so its skill produces the A/C/F framing only once it upgrades to a loom version carrying the hardened `release-notes` kind — the skill edit is independent, the richer framing follows the upgrade. This is the honest-dogfooding win: the same report drafts release notes for the tool *and* for a project built with the tool.

## Guardrail — stale unversioned leak

If a prior release ever failed to stamp (the tag-push gotcha), its done plans stay `null` and would leak into the *next* release's notes. The human-review gate catches it, but add a cheap sanity line: flag unversioned dones whose done-doc date predates the previous tag. Non-blocking; a warning in the draft.

## Success criteria

- `do-release` produces its Added / Changed / Fixed draft by invoking the reports engine, not by hand-reading `git log`.
- The human-review STOP is unchanged — the draft is reviewed and editable before bump/tag.
- Reuses the existing `release-notes` kind (hardened if needed) — **no new report kind**.
- The root-CHANGELOG section is still published verbatim as the GitHub release body (format compatibility preserved).

## Decisions (settled)

1. **Framing source — done-body enrichment by default.** The `release-notes` kind stays roadmap-passthrough (`docTypes: []`) and owns the *structure* (A/C/F, user-benefit voice, Highlights lead). The `do-release` skill **hydrates** the Unreleased plans' done-doc bodies inline (a bounded per-release set) and the live agent curates them into user-facing prose — enrichment is **on by default**, with a titles-only fallback flag for a fast low-token draft. Passthrough contract + `report-selection` test preserved (enrichment is skill-side, never a `docTypes` change).
2. **git-log net — inline appendix.** The coverage residue (commits with no covering done plan) is surfaced as a "Not covered by a done plan" appendix inside the draft the human reviews — not a separate pre-check to reconcile first.
3. **Kind hardening — extend `release-notes`' framing in place.** Sub-structure each version group (including "Unreleased") as Added/Changed/Fixed within the one existing kind. No new kind, no mode param; both the standalone `release-notes` report and the do-release draft get the richer shape.
4. **Generic workflow lives in `loom report release-notes`, not the skill (amended, plan-002).** Selection + done-body enrichment + the doc-graph empty-set guard ship in the package (CLI + `report` prompt) so every Loom project and its CI get them; synthesis stays with the invoking agent (no LLM in the CLI). The per-repo `do-release` skill only reviews + does the git-process net + repo-specific changelog/bump/tag/push. **Supersedes the plan-001 "inline in the skill" invocation** (§4) — that half-shipped the feature to this repo alone.
