---
type: done
id: pl_01KXBTP3XQ9APJBN255Y5JRGAC-done
title: Done — Reports — coverage & kinds
status: done
created: 2026-07-12
version: 6
tags: []
parent_id: pl_01KXBTP3XQ9APJBN255Y5JRGAC
requires_load: []
---
# Done — Reports — coverage & kinds

## Step 1 — Add four single-doc-type kinds to reportKinds.ts — `ideas` (docTypes ['idea']), `designs` (['design']), `plans` (['plan']), `dones` (['done']) — each cross-weave, with a distinct promptFraming (per-lens 'complete' report over one doc type) and a higher per-kind default budget (maxChars ≈ 150000, since one doc type is a smaller, bounded slice). Scope narrowing is the existing --weave/--thread filter; no new selection path.

Added four single-doc-type "complete" kinds to `packages/core/src/reportKinds.ts`:
- `ideas` (docTypes `['idea']`), `designs` (`['design']`), `plans` (`['plan']`), `dones` (`['done']` — title "Shipped").
- Each `scopeHint: 'cross-weave'` with a distinct `promptFraming` (per-lens whole-history report: what/why per doc, themes grouped by area, cite ids, don't invent) and `maxChars: 150000` (higher default than the 60k analytical kinds, since one doc type is a smaller bounded slice).
- No new selection path — the engine already handles any `docTypes` set; `--weave`/`--thread` narrows scope. `ctx` is NOT yet in their docTypes (that's step 2).

## Step 2 — Register `ctx` in docTypes for the summary-friendly doc-set kinds only — architecture and the four new *overview kinds (ideas/designs/plans/dones) — so a scope/global ctx is selected as an orientation input when present. Analytical kinds (decisions, drift-audit, security) stay ctx-free (raw rationale, no summary-of-a-summary). Roadmap kinds (project-overview, release-notes) are untouched — adding ctx must NOT flip them off their roadmap passthrough.

Registered `ctx` in `docTypes` for the summary-friendly kinds only (`packages/core/src/reportKinds.ts`):
- `architecture` → `['design','reference','ctx']`; `ideas` → `['idea','ctx']`; `designs` → `['design','ctx']`; `plans` → `['plan','ctx']`; `dones` → `['done','ctx']`.
- Analytical kinds unchanged (`decisions` `['chat','design']`, `drift-audit` `['design','done']`, `security` `['design','done','reference']`) — they need raw rationale, not a summary-of-a-summary.
- Roadmap kinds untouched (`project-overview`, `release-notes` keep `docTypes: []`) — adding ctx there would flip them off their roadmap passthrough, which we must not do.
- Effect: when a scope/global ctx exists it's selected as an orientation input for these kinds. Only global ctx exists today, so in practice it enriches cross-weave runs; weave-scoped runs pick up a weave ctx only if one exists (none do — dormant-but-correct). Independent of the plan-004 summary-tier ctx use (that summarizes *other* overflowing docs; this selects ctx as its own source).

## Step 3 — Wire a budget override end-to-end: `loom report <kind> --full` sets an unlimited budget (nothing degrades). Thread it CLI flag → report prompt arg → report.ts handle → selectReportDocs maxChars. At the CLI edge print a clear token-cost warning before the brief (use manifest.fullChars for the ~Xk-token estimate) so an unbudgeted run is a deliberate, informed choice. --full is a no-op for roadmap kinds.

Wired the `--full` unlimited-budget override end-to-end.

- **`selectReportDocs`** — no logic change needed: passing `maxChars: Infinity` resolves to `budget = Infinity`, so `fullChars > budget` is always false → `budgeted: false`, every doc `full`. The existing 4th param carries it.
- **MCP prompt `report.ts`** — added `full` to `promptDef.arguments`; `handle` parses `args['full'] === 'true'` → `maxChars = full ? Infinity : undefined` and passes it to `selectReportDocs(state, kind, filters, maxChars)`. Roadmap kinds (empty docTypes) never call selection, so `--full` is a no-op there, as specified. `renderSelection` coverage line prints `budget=unlimited` when `!Number.isFinite(maxChars)`.
- **CLI `index.ts`** — added `--full` option (with a "can be large/costly" description); passed `full: options.full` to `reportCommand`; refreshed the command description to list all 10 kinds.
- **CLI `commands/report.ts`** — `options.full` → `args.full = 'true'` on the prompt call; prints a yellow CLI-edge warning before the brief: reads `manifest.fullChars` off the brief's coverage line (`/(\d+) of (\d+) chars emitted/`) to show `≈ N chars (~Xk input tokens)`, with a graceful fallback note for roadmap kinds (no manifest). So an unbudgeted run is a deliberate, informed choice.

## Step 4 — Capability (c), not a reintroduced standing doc: when a weave's slice overflows the budget and that weave has no ctx, selectReportDocs records it in the manifest, and the report prompt's coverage note surfaces a suggestion (e.g. 'weave X overflowed and has no ctx — run `loom refresh ctx` scoped to X for a better summary next time'). No ctx is generated automatically; the report never depends on a stale summary.

Added the on-demand-ctx suggestion (capability, not a standing doc).

- **`reportSelection.ts`** — new manifest field `oversizedWeavesWithoutCtx: string[]`. When `budgeted`, collect the set of weaves that had ≥1 doc degraded (`tier !== 'full'`), then keep only those with no ctx in `ctxByScope` (sorted, deterministic). Empty when nothing degraded. No ctx is ever generated — this is a hint only.
- **`report.ts` (prompt `renderSelection`)** — when budgeted and the list is non-empty, appends a `SUGGESTION —` line to the coverage note naming those weaves and pointing at `loom refresh ctx` scoped to the weave for better summaries next run, explicitly noting it's informational (no auto-generation). Keeps the boundary from chat-003: weave ctx stays optional/on-demand; a report never silently depends on a stale summary.

## Step 5 — Extend the pure tests (new kinds present + their docTypes + higher default budgets; ctx-in-docTypes for the summary-friendly kinds and absent from analytical kinds; --full = no degradation; oversized-ctx manifest hint). Run ./scripts/build-all.sh + ./scripts/test-all.sh. Then generate ONE real sample report end-to-end and LEAVE IT SAVED under loom/reports — a weave-scoped report (per the recency finding, weave-scoped is the showcase-worthy shape), e.g. `designs --weave core-engine`. Record slice size before/after. Single sanctioned paid generation for this plan.

Tests extended, built, suite green, and one weave-scoped sample report generated + saved.

**Tests (`tests/report-selection.test.ts`)** — 3 new blocks (13 total):
- **11** registry: `ideas`/`designs`/`plans`/`dones` read their single type + `ctx`; all carry `maxChars: 150000`; `architecture` includes `ctx`; analytical kinds (`decisions`/`drift-audit`/`security`) stay ctx-free; roadmap kinds keep empty docTypes.
- **12** `--full` (Infinity budget): the same slice that a small budget degrades stays fully un-degraded (`budgeted:false`, all `full`, `emitted==full`, `maxChars` non-finite).
- **13** `oversizedWeavesWithoutCtx`: lists only degraded weaves lacking a ctx (`wb` degraded+no-ctx listed; `wa` degraded-but-has-ctx not); empty when nothing degrades.

**Build/test:** `./scripts/build-all.sh` clean; `./scripts/test-all.sh` **23 passed, 0 failed** (report-selection all 13 blocks green).

**Sample report (single sanctioned paid gen)** — `loom report designs --weave core-engine` via the CLI (fresh server from rebuilt dist). Live results confirm the whole feature end-to-end:
- Before/after: **211,746 chars (~53k tok) → 150,463 chars (~37.6k tok)**; budget 150k; tiers **22 full · 0 summary · 10 reference** (budget filled by full bodies, so the tail degraded straight to reference).
- Step-4 suggestion fired live: `SUGGESTION — …core-engine … has no ctx …`.
- Saved (weave-scoped): `loom/core-engine/reports/Core Engine — Designs (2026-07-12) - designs report.md` (`rp_01KXC1HB5WJQKCA1SRDAARGEKF`), single date in filename.

**Finding worth surfacing:** recency=relevance degrades the *oldest/foundational* designs (link-index, clean-architecture, BaseDoc, id-management) to reference-only — the opposite of what a `designs`/architecture reader wants. For these single-doc-type kinds, `--full` or an oldest-first ordering is the better showcase shape. Recorded in the report's Findings and to be reflected in the reference doc (step 6).

## Step 6 — Fill the two TODO sections of loom/refs/reports-reference.md — Parameters (kind, --weave/--thread/--since/--until, --full, --run; how the budget + tiered degradation work) and Examples/how-to (worked CLI examples per kind, when to use each, the showcase workflow, the agent-brief / --run flows) — and refresh the Report-kinds table so the four new single-doc-type kinds move from 'being added' to shipped. Add any new showcase candidates generated in step 5.

Completed `loom/refs/reports-reference.md` (direct Edit — it's a hand-maintained ref, gate-excluded).

- **Report kinds** — restructured into Roadmap-sourced / Analytical / Single-doc-type groups; the four new kinds (`ideas`/`designs`/`plans`/`dones`) promoted from "being added" to shipped, each noted with the 150k budget; **†** marks ctx-friendly kinds (architecture + the four new); called out that `decisions`/`drift-audit`/`security` stay ctx-free.
- **Parameters** — filled: options table (`<kind>`, `--weave`, `--thread`, `--since`, `--until`, `--full`, `--run`) + a "Token budget & tiered degradation" explainer (full → summary → reference, per-kind budgets, the manifest fields + oversized-ctx suggestion) + the **recency caveat** (recency-first drops the oldest/foundational docs; scope or `--full` for completeness).
- **Showcase candidates** — added `Core Engine — Designs` (rp_01KXC1HB5W…) as a candidate; kept project-overview candidate; decisions report stays rejected.
- **Examples — how to use reports** — filled: per-kind "when to reach for each", the brief-vs-`--run` modes, and the weave-scoped showcase workflow (Loom + Chord Flow).
- Removed the `(TODO — final thread step)` note.

plan-005 complete.
