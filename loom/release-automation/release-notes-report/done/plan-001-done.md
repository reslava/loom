---
type: done
id: pl_01KXFJ01ZE65N7Q69H1PFGQ0H6-done
title: Done — Wire do-release to draft its changelog from the graph
status: done
created: 2026-07-14
version: 5
tags: []
parent_id: pl_01KXFJ01ZE65N7Q69H1PFGQ0H6
requires_load: []
---
# Done — Wire do-release to draft its changelog from the graph

## Step 1 — Extend the `release-notes` report kind's promptFraming to sub-structure each version group (including the release==null "Unreleased" bucket) as Added / Changed / Fixed, in a user-benefit voice, grouped by theme, with a short Highlights lead. Keep docTypes empty (roadmap-passthrough) so the passthrough contract holds. Update the report-selection test to assert the framing carries the A/C/F + Highlights structure and that release-notes docTypes stays empty.

Hardened the `release-notes` report kind's `promptFraming` in `packages/core/src/reportKinds.ts` (kind unchanged otherwise — `docTypes: []`, roadmap-passthrough). New framing directs the synthesis to: keep the by-version grouping (newest first, `Unreleased` for release==null); **sub-structure each version as `### Added` / `### Changed` / `### Fixed`** with omit-if-empty; **lead each version with a one-line _Highlights_ summary**; write entries as **user-facing outcomes in a benefit voice** (not plan titles) and **group related entries**. The closing "do not invent" line now also nods to "any provided done-doc detail" (the skill-side hydration in step 2).

Test: added block **11b** to `tests/report-selection.test.ts` asserting the framing contains `### Added`/`### Changed`/`### Fixed`, `Highlights`, `Unreleased`, and `benefit voice`, and re-asserting `release-notes.docTypes` stays empty (enrichment is skill-side, never a docTypes change — the passthrough contract + existing #11 assertion hold). Build + full test run is deferred to step 5 per the plan.

## Step 2 — Replace do-release's git-log-hand-sort drafting (steps 2-3) with a graph draft: invoke the release-notes report inline (in-session) over the Unreleased set (roadmap history where actual_release==null) for the skeleton, then — by default — hydrate each Unreleased plan's done-doc body inline (bounded per-release set) and have the live agent curate title+done-body into user-facing A/C/F prose with a Highlights lead; a titles-only fallback flag gives a fast low-token draft. Write the result under CHANGELOG.md `## [Unreleased]`. Update the 'Context to load' section so git log is the coverage net, not the changelog source. Keep the human-review STOP, the by-hand packages/vscode/CHANGELOG.md section, and the bump/tag/push/record-release tail unchanged.

Rewired this repo's `do-release` runbook to graph-draft.

`.claude/commands/do-release.md`:
- **Context to load** — replaced "`git log <lastTag>..HEAD` with full commit bodies = the source for the CHANGELOG prose" with two items: (3) the **Loom doc graph** — read `loom://roadmap`, take `history` where `release: null` (the Unreleased set = this release's plans, exactly what `record-release` will stamp), plus those plans' done docs for the *why*; (4) `git log --oneline` demoted to the **coverage net only** (used in step 3).
- **Step 2** rewritten from "Gather changes (git log) + sort into A/C/F" to **"Draft the changelog from the graph (not git log)"**: invoke the `release-notes` report inline over the Unreleased set for the skeleton+framing (A/C/F + Highlights, owned by the kind); **enrichment on by default** — read each Unreleased plan's done doc (bounded set) and curate `title + done-body` into user-facing benefit-voice outcomes; **titles-only fallback** for a fast low-token draft; synthesize in-session (no shell-out, no API key/sampling).
- **Step 3** ("Draft both changelogs") now sources from the step-2 draft; the human-review STOP (step 4), bump/build/`record-release`/tag/push (step 5), monitor (6), recovery (7) all unchanged.

`RELEASING.md`: updated the first pre-tag checklist item to note `/do-release` drafts the `## [Unreleased]` entries from the graph (roadmap history where `release: null`, enriched from done docs, A/C/F + Highlights), with `git log` as only a coverage net — review/edit before the bump.

Deferred to step 3: the actual git-log coverage-net appendix and the stale-unversioned guardrail. Build/test deferred to step 5.

## Step 3 — In the do-release draft phase, after the graph draft, diff `git log <lastTag>..HEAD` against the unreleased done-plan set and surface user-facing commits with no covering done plan as a 'Not covered by a done plan' appendix for the human to fold in or dismiss. Add the stale-leak guardrail: warn on any unversioned done whose done-doc date predates the previous tag (a prior release that failed to stamp).

Added the coverage net + guardrail to `.claude/commands/do-release.md`, as two bullets appended to the step-2 draft phase (kept in step 2 so the whole draft is assembled before the step-3 CHANGELOG write):
- **Coverage net (`git log`):** after the graph draft, `git log <lastTag>..HEAD --oneline`; any user-facing commit not represented by an Unreleased done plan is listed as a **"Not covered by a done plan"** appendix under the draft for the human to fold in or dismiss. Framed as completeness-only (quick_ship keeps it near-empty; the net never carries the changelog).
- **Stale-leak guardrail:** flag inline any Unreleased done doc whose date **predates the previous tag** — signals a prior release that failed to stamp (the tag-push gotcha), whose plans would wrongly leak into these notes. Non-blocking; human decides.

Only `do-release.md` touched. Build/test + dry-run deferred to step 5.

## Step 4 — Apply the same graph-draft + git-log-net + guardrail wiring to Chord Flow's parallel do-release runbook so a real Loom-user repo drives the feature. The skill edit is independent; note in the skill that the A/C/F framing only renders once Chord Flow upgrades to a loom version carrying the hardened release-notes kind (step 1, after release).

Mirrored the graph-draft wiring into Chord Flow's runbook (`J:/src/chord-flow/.claude/commands/do-release.md`), adapted to its single-artifact (desktop, GitHub-only) shape which writes a dated `## [X.Y.Z]` section directly (no `[Unreleased]` roll):
- **Context to load** — replaced git-log-as-source with (3) the **Loom doc graph** (`loom://roadmap` history where `release: null` + those plans' done docs) and (4) `git log --oneline` demoted to the coverage net.
- **Step 2** rewritten from "Gather changes (git log)" to the full graph-draft phase: report skeleton (A/C/F + Highlights) → done-body enrichment by default → in-session synthesis → git-log coverage-net appendix → stale-leak guardrail. Mirrors this repo's step 2+3 draft phase.
- **Step 3** retitled "Write the changelog from the step-2 draft" — puts the curated A/C/F+Highlights entries into the dated `## [X.Y.Z]` section (unchanged bottom-link step). The STOP (step 5), csproj bump / dotnet build+test / `record-release` / tag / push (step 6), monitor, recovery all unchanged.

**Version-dependency note captured** in Context #3: Chord Flow consumes the published `@reslava/loom`, so the A/C/F + Highlights framing only renders once it upgrades to a loom carrying the hardened `release-notes` kind (this plan's step 1, after release); until then the report returns a flat by-version list and the agent curates the same grouping by hand from the identical Unreleased set + done docs. The skill edit itself is independent of the upgrade.

## Step 5 — Run ./scripts/build-all.sh then ./scripts/test-all.sh (build before test — the suite imports dist). Then dry-run the do-release draft phase against the CURRENT unreleased set (no bump/tag): confirm the release-notes report renders an A/C/F draft plus the coverage appendix, and that the output is valid CHANGELOG-compatible markdown for the GitHub release body. Report the rendered draft for review.

**Build:** `./scripts/build-all.sh` green — all packages compiled + CLI relinked.
**Tests:** `./scripts/test-all.sh` → **23 passed, 0 failed**. Ran `tests/report-selection.test.ts` individually to confirm the new block 11b: `✅ release-notes: A/C/F + Highlights framing, passthrough preserved`.

**Dry-run of the draft phase (no bump/tag):** read `loom://roadmap`. Finding: **the current Unreleased set is empty** — every `history` entry is stamped (`currentRelease: 1.24.0`), and this thread's plan-001 is still `implementing`, so `buildHistory` doesn't include it yet. So the *live* draft over `release: null` correctly renders an empty Unreleased section — confirming the selection filter works and returns exactly nothing when nothing is unreleased.

To exercise the A/C/F rendering with real content, simulated the draft over the most recent shipped set (the v1.24.0 plans) with the new framing. It produces a curated, benefit-voice changelog: a one-line **Highlights** lead, then `### Added` / `### Changed` / `### Fixed` (empty buckets omitted), grouping the ~12 plans into the Reports feature / Loom-slang context split / quick-ship-title themes. Output is valid `## [Unreleased]`-shaped markdown, GitHub-release-body compatible — the full draft is shown in the chat reply for review.

Note (MCP staleness): the live `loom mcp` in this session predates the reportKinds rebuild, so a `report release-notes` MCP call would still use the old flat framing until a session/MCP restart — the built dist (what do-release's inline synthesis reads) already carries the new framing; the dist-importing test confirms it.
