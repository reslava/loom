---
type: done
id: pl_01KXC3RM75CGFBVABDH75VY2QG-done
title: Done — Reports — selectable keep-full ordering (recency vs oldest)
status: done
created: 2026-07-12
version: 4
tags: []
parent_id: pl_01KXC3RM75CGFBVABDH75VY2QG
requires_load: []
---
# Done — Reports — selectable keep-full ordering (recency vs oldest)

## Step 1 — Add a keep-full ordering knob to the budget allocation: `sort: 'recency' | 'oldest'`. recency = newest docs keep full bodies (current behavior); oldest = oldest keep full. Only the RELEVANCE order used for tier allocation changes — the OUTPUT stays chronological. Resolve from an optional `sort` param → a new per-kind `defaultSort?` on ReportKind (single-doc-type kinds ideas/designs/plans/dones + architecture default 'oldest' so foundational docs stay full; analytical decisions/drift-audit/security + roadmap kinds default 'recency') → a global default of 'recency'. Deterministic.

Added a selectable keep-full ordering knob to deterministic report selection (core only).

**`packages/core/src/reportKinds.ts`**
- New `export type ReportSort = 'recency' | 'oldest'` (recency = newest docs keep full bodies under budget; oldest = oldest/foundational keep full).
- New `defaultSort?: ReportSort` field on `ReportKind`.
- New `export const DEFAULT_REPORT_SORT: ReportSort = 'recency'` (global fallback = original behavior).
- Per-kind defaults: `architecture`, `ideas`, `designs`, `plans`, `dones` → `'oldest'` (foundational docs stay full); `decisions`, `drift-audit`, `security` → `'recency'`. Roadmap kinds (`project-overview`, `release-notes`) omit it — they bypass `selectReportDocs`, so they fall back to the global `recency` default, matching the plan's intent.

**`packages/core/src/reportSelection.ts`**
- `selectReportDocs(state, kind, filters?, maxChars?, sort?)` — new optional 5th `sort` param.
- Resolution: `effectiveSort = sort ?? kind.defaultSort ?? DEFAULT_REPORT_SORT`.
- The budget's RELEVANCE comparator now inverts by `effectiveSort`: recency = newest-first (unchanged), oldest = oldest-first; id tiebreak stays ascending in both modes for determinism. The OUTPUT order remains chronological (unchanged) — only tier allocation reorders.
- `ReportManifest` gained a required `sort: ReportSort` field (set to `effectiveSort`) for traceability/testing.

**`packages/core/src/index.ts`** — re-export `ReportSort` and `DEFAULT_REPORT_SORT`.

Pure/deterministic — no IO, no AI. `build-all` green.

## Step 2 — Add `--sort <recency|oldest>` to the CLI report command and thread it CLI flag → report prompt arg → selectReportDocs sort param (mirrors --full; the two compose — --full ignores sort since nothing degrades). Validate the value at the CLI edge. Update the command description/help.

Threaded `--sort <recency|oldest>` end-to-end: CLI flag → report prompt arg → `selectReportDocs` sort param.

**`packages/cli/src/index.ts`** — added `.option('--sort <order>', …)` to the `report` command (help notes it defaults per kind and is ignored with `--full`), and passed `sort: options.sort` through to `reportCommand`.

**`packages/cli/src/commands/report.ts`** — added `sort?: string` to the options type; **validates at the CLI edge** (throws a clear error unless `recency`/`oldest`) before any work; forwards it as the `sort` prompt arg when set.

**`packages/mcp/src/prompts/report.ts`** — added the `sort` prompt argument; reads `args['sort']`, **validates defensively** (the prompt is a public surface, not only reached via the CLI), and passes it as the new 5th arg to `selectReportDocs(state, kind, filters, maxChars, sort)`. Also surfaced `sort=${m.sort}` in the coverage manifest line so a report can note its own ordering.

**Compose semantics:** `--full` sets `maxChars=Infinity` → `budgeted=false` → the relevance sort is never used, so `--full` naturally ignores `--sort` (nothing degrades), exactly as specified. `build-all` green.

## Step 3 — Change the report prompt's oversized-weave-without-ctx suggestion to LEAD with `--sort oldest` / `--full` (the better fixes for a designs/architecture run that dropped foundational docs), and mention generating a ctx only as a SECONDARY opt-in — explicitly noting that `loom refresh ctx` creates a PERSISTENT weave ctx.md (not ephemeral), so the user chooses it deliberately. Resolves the chat-004 ctx concern.

Reworked the report prompt's budget-degradation guidance (`packages/mcp/src/prompts/report.ts`, `renderSelection`).

**Before:** the only suggestion was ctx-focused — "these weaves have no ctx … generating a ctx would give better summaries."

**After (when `m.budgeted`):**
- **Primary — leads with the ordering / full-slice levers.** A new `TO KEEP MORE DOCS FULL` line states which docs this run kept full (derived from `m.sort`), then recommends the *flip* (`--sort oldest` when the run was recency, `--sort recency` when oldest) or `--full` to keep the entire slice — explicitly named as the direct fixes when a designs/architecture report dropped foundational docs.
- **Secondary — ctx demoted, with the persistence caveat.** The ctx suggestion now fires only after the sort/full advice and explicitly notes that `loom refresh ctx` writes a **PERSISTENT** `loom/{weave}/ctx.md` (a standing doc loaded thereafter, NOT an ephemeral one-run summary), so the user opts in deliberately.

Resolves the chat-004 ctx concern: the brief no longer headlines a nudge toward a standing weave ctx; the cheaper, non-persistent fixes (`--sort`/`--full`) lead. `build-all` green.

## Step 4 — Extend tests/report-selection.test.ts: sort='oldest' keeps the OLDEST docs full (inverse of recency); per-kind defaultSort applied (designs→oldest, decisions→recency); explicit --sort/param override wins; reworded suggestion. Run build-all + test-all. Then regenerate `loom report designs --weave core-engine --sort oldest`, SAVE it under loom/core-engine/reports (a better showcase candidate that keeps the foundational designs full), and record before/after vs the recency run. Single sanctioned paid generation for this plan; add/replace the showcase-candidate entry in reports-reference.md.

Tests, full suite, sanctioned generation, and reference doc.

**Tests (`tests/report-selection.test.ts`)** — 4 new blocks (14–17) on top of the existing 13:
- 14: `sort='oldest'` is the inverse of recency (oldest doc full, newest → reference; middle → summary); output stays chronological; `manifest.sort` recorded.
- 15: per-kind `defaultSort` applied with no explicit sort — `designs`→oldest (oldest full), `decisions`→recency (newest full).
- 16: explicit `sort` param overrides the kind default in both directions.
- 17: reworded MCP-prompt suggestion (imports the newly-exported `renderSelection`) — leads with `--sort`/`--full`, ctx demoted to a `Secondary option` flagging the **PERSISTENT** weave ctx.md, `--sort` line precedes the ctx line, coverage manifest surfaces `sort=`.

**Suite:** `build-all` + `test-all` green — report-selection 17/17, MCP integration 23/23, whole suite "All tests passed".

**Sanctioned paid generation (the one for this plan):** ran `loom report designs --weave core-engine --sort oldest`, synthesized the report from the full slice, and saved it:
- `rp_01KXC9GHQQFNBSB6DBPJB9XEXP` → `loom/core-engine/reports/Core Engine — Designs (foundational-first) (2026-07-12) - designs report.md`.

**Before/after (deterministic, both 32 designs, 22 full / 10 reference):**
- `--sort recency`: newest 22 kept full; the 10 **oldest/foundational** designs (Core Engine, Link Index, BaseDoc, Clean-Architecture layering, ID Management, …) dropped to reference — the chat-004 finding.
- `--sort oldest`: the 22 foundational designs (2026-04-11 → 2026-06-14) kept full; the 10 **newest** (date-normalization → mcp-read-surface-naming, 2026-06-16 → 2026-07-07) dropped to reference. `emittedChars` 149,822 vs 150,463 (both under the 150k budget) — same tier counts, inverted membership. The oldest run is the better designs showcase.

**`loom/refs/reports-reference.md`** (hand-maintained, gate-excluded — edited directly): added the `--sort` row to the parameters table; rewrote the budget/degradation prose from "recency-first" to selectable ordering + per-kind `defaultSort`; replaced the recency caveat with an ordering note; updated the showcase table — the foundational-first report is now the ✅ candidate, the earlier recency run marked ↩ superseded (kept for the before/after contrast).
