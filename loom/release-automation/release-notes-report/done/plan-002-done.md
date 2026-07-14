---
type: done
id: pl_01KXFPW8X0XGETJF0MW0578DNQ-done
title: Done — Push the release-notes workflow into loom report release-notes (generic surface)
status: done
created: 2026-07-14
version: 6
tags: []
parent_id: pl_01KXFPW8X0XGETJF0MW0578DNQ
requires_load: []
---
# Done — Push the release-notes workflow into loom report release-notes (generic surface)

## Step 1 — In the report path (app use-case + report MCP prompt + CLI), make `loom report release-notes` select the `release: null` (Unreleased) set and include those plans' done-doc bodies in the assembled brief — enrichment ON by default, with a `--titles-only` flag for the fast/low-token path. Synthesis stays with the agent: assemble brief + framing, never call an LLM in the command. Update tests.

Enriched `loom report release-notes` to select the Unreleased set + hydrate done bodies. Found the CLI already delegates to the MCP `report` prompt (`reportCommand` → `client.getPrompt('report', args)`), so one handler change reaches both surfaces — no app-layer file needed (the plan's `packages/app/src/report.ts` hint didn't apply; logic went to pure core instead).

- **core/releaseNotes.ts (new)** — `buildReleaseNotesBrief(state, { titlesOnly })`: pure. Runs `buildRoadmap`, filters `history` to `release == null` (the Unreleased set, newest-first), and by default hydrates each plan's done-doc body (indexed by `done.parent_id`). Returns `{ unreleased[], implementingThreads[], isEmpty, enriched }`. Exported from core index.
- **core/reportKinds.ts** — rewrote the `release-notes` framing to be Unreleased-focused: Highlights lead → `### Added/Changed/Fixed` (omit-empty) → benefit-voice outcomes drawn from done-doc detail → output under `## [Unreleased]`. Still roadmap-passthrough (`docTypes: []`); test 11b still green.
- **mcp/prompts/report.ts** — added a `release-notes` branch (loads state via a shared `loadStateCached`, builds the brief, renders it), the `titlesOnly` arg + promptDef entry, and `renderReleaseNotes()` (exported for tests). The renderer also handles the empty set (that's step 2's guard, landed here since it's the same render).
- **cli** — `--titles-only` flag on `loom report`, plumbed through `reportCommand` into the prompt args.
- **test 18** — buildReleaseNotesBrief: Unreleased selection, done-body enrichment, `--titles-only` drops bodies, implementing-thread capture, empty-set. 

Verified: `build-all` green; `report-selection` test green (11b + 18).

## Step 2 — When the `release: null` set is empty, `loom report release-notes` emits a structured 'nothing unreleased' result (noting any threads still `implementing`) instead of an empty brief, so any consumer (skill or CI) can stop cleanly. This is the doc-graph half of the guard; the git-process tells (dirty tree, uncovered commits) stay release-side. Update tests.

Doc-graph empty-set guard in the command.

- **mcp/prompts/report.ts** — `renderReleaseNotes` already emitted a structured **"NOTHING UNRELEASED … stop"** signal for `brief.isEmpty` (naming any `implementing` threads as the "work not closed" tell). Made `handle()` **short-circuit** the empty case: it returns *only* the stop-signal message, with no "produce a report" framing and no `loom_create_report` persist instruction — so a consumer (do-release skill / CI) halts cleanly instead of being told to draft an empty changelog.
- The guard is the **doc-graph half** only: it knows the unreleased set is empty and which threads are still `implementing`. The git-process tells (dirty tree, uncovered commits) stay release-side (skill/CI), per the design.
- **test 19** — `renderReleaseNotes`: empty brief → stop-signal containing `NOTHING UNRELEASED` + `stop` + the implementing thread `wr/tc`; non-empty brief → enriched slice carrying the hydrated done body.

Verified: `build-all` green; `report-selection` green (11b + 18 + 19).

## Step 3 — Rewrite do-release step 2 to just run `loom report release-notes` for the enriched draft + empty-set signal; drop the inline selection/enrichment/guard prose (now in the command). Keep only the git-process add-on (git-log coverage net + dirty-tree tell) and the repo-specific changelog write / bump / tag / push / record-release. Update RELEASING.md to match.

Re-thinned this repo's `do-release` to consume the command.

`.claude/commands/do-release.md`:
- **Context #3/#4** — replaced the "hand-read the doc graph" instructions with **`loom report release-notes`** (the command owns Unreleased selection + enrichment + empty-set guard); `git log` demoted to coverage net + "work not recorded" tell.
- **Step 2** rewritten from ~30 lines of inline workflow (skeleton/framing, enrichment default, in-session synthesis, empty-set guard tree, coverage net, stale-leak) down to: run `loom report release-notes` (`--titles-only` for fast) → synthesize its brief in-session → the **empty-set guard is built into the command** (act on the "NOTHING UNRELEASED" stop-signal, cross-check git tells) → keep only the two genuinely release-side (git-aware) bits: the coverage-net appendix and the stale-leak flag. Steps 3–7 (write changelogs / STOP / bump-tag-push / monitor / recovery) unchanged.

`RELEASING.md`: first pre-tag checklist item now says `/do-release` drafts by running `loom report release-notes` (selection + done-doc enrichment + Highlights→A/C/F), git log only a coverage net.

No build needed (skill/prose only). The doc-graph logic that used to live here now lives in the command (steps 1–2); only git-process bits remain in the skill.

## Step 4 — Apply the same re-thin to Chord Flow's do-release: replace the inline workflow prose with a call to the enriched `loom report release-notes`, keep the git add-on + csproj bump / tag / push. Drops the version-caveat note (the workflow now ships in the command Chord Flow already runs once upgraded). Cross-repo edit.

Re-thinned Chord Flow's `do-release` (`J:/src/chord-flow/.claude/commands/do-release.md`) the same way, adapted to its single-artifact shape:
- **Context #3/#4** — replaced the hand-read-the-graph instructions (and the old elaborate version-caveat/fallback block) with **`loom report release-notes`**, plus a one-line note that it requires a `@reslava/loom` version carrying the enriched command. `git log` → coverage net + "work not recorded" tell.
- **Step 2** collapsed from the mirrored ~28-line inline workflow to: run `loom report release-notes` → synthesize in-session → built-in empty-set guard (act on "NOTHING UNRELEASED", cross-check git tells) → release-side coverage net + stale-leak. Step 3 (write the dated `## [X.Y.Z]` section + bottom link) and the csproj bump / dotnet build+test / record-release / tag / push tail unchanged.

Cross-repo edit; Chord Flow commits + releases separately. The version-caveat shrank to a single line (the workflow now lives in the command Chord Flow runs once upgraded), per the plan.

## Step 5 — Showcase `loom report release-notes` in the public docs as a special report any Loom project can run in its own release CI to auto-draft a changelog from the doc graph. Add a concrete CI-usage example (e.g. an agent-in-CI step running the command), and note the enrichment/titles-only + empty-set-guard behavior. Update the reports guide + WAYS-TO-USE-LOOM + the CLI README (npm listing) + the mcp-reference report surface, honoring the doc-sync contract.

Showcased `loom report release-notes` as a CI-usable special report across the public docs. Notable finding (from Rafa's mid-step check): **neither `packages/cli/README.md` nor `packages/vscode/README.md` mentioned reports at all** — a gap for a shipped v1.24.0 feature — so this also backfills reports coverage on both listings.

- **docs/WAYS-TO-USE-LOOM.md** — under recipe ④ (Automation/CI), added a "Release notes from the doc graph — the one report that belongs in your release CI" showcase + a `--run` CI example, noting the empty-set guard and that it pairs CI with an agent (graph selects/enriches, agent writes prose).
- **packages/cli/README.md** — added a whole **Reports** subsection (the `loom report` command was undocumented): the command signature + all kinds, plus a `release-notes`-in-CI callout (Unreleased selection, done-doc enrichment, `--run`/`--titles-only`, the "NOTHING UNRELEASED" guard).
- **packages/vscode/README.md** — added a *Generate Report* AI-action row and a **Reports view** subsection foregrounding release-notes + the CI command.
- **loom/refs/mcp-reference.md** — expanded the `report` prompt row: `titlesOnly` arg + the release-notes enrichment/empty-set-guard behavior.
- **README.md** (root) — added a `release-notes` line to the reports command block + a "`release-notes` runs in your release CI" paragraph.
- **loom/refs/reports-reference.md** — updated the `release-notes` kind row (roadmap→"Unreleased done plans + their done docs, CI-ready, guarded"), added the `--titles-only` parameter, and a release-notes example bullet.

Prose/docs only — no build/test (that's step 6). Honored the doc-sync contract (README + package READMEs + refs).

## Step 6 — Run ./scripts/build-all.sh then ./scripts/test-all.sh (build before test — suite imports dist). Then dry-run `loom report release-notes` against a real or simulated unreleased set: confirm it emits the enriched A/C/F + Highlights brief (with done-body content) and, on an empty set, the 'nothing unreleased' stop-signal. Report the output.

Build + test + dry-run — all green.

- **Build:** `./scripts/build-all.sh` green (all packages + CLI relink).
- **Tests:** `./scripts/test-all.sh` → **23 passed, 0 failed** (includes report-selection blocks 11b/18/19).
- **Dry-run (real, non-empty set):** ran `loom report release-notes` from the terminal. Because plan-001 is now a done plan with `actual_release` null, the Unreleased set is **non-empty** — so this exercised the enriched path end-to-end for the first time (the earlier plan-001 dry-run hit an empty set and had to be simulated). Output:
  - `Source slice — release-notes: 1 Unreleased done plan(s) … Enrichment: done-doc bodies included below.`
  - Rendered plan-001's **full done-doc body** (all 5 step notes) under its `### {title} · weave/thread · plan pl_… · date` header — the hydration works against real content.
  - The CLI framed it as a BRIEF for the agent (not a finished report); the synthesis instruction (Highlights → Added/Changed/Fixed under `## [Unreleased]`) follows the slice.
  - The CLI spawns its own server from the built dist, so no MCP-staleness caveat — the new code ran.
  - Empty-set path is covered by test 19 (renderReleaseNotes emits the "NOTHING UNRELEASED" stop-signal + names implementing threads).

The generic command now does selection + done-body enrichment + the doc-graph empty-set guard; both do-release skills and any CI consume it. Plan-002 complete.
