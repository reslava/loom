---
type: done
id: pl_01KXBH4WGD8GBWASEFQMF96QAW-done
title: Done — Doc-graph reports — token budgeting for selectReportDocs (C-2)
status: done
created: 2026-07-12
version: 4
tags: []
parent_id: pl_01KXBH4WGD8GBWASEFQMF96QAW
requires_load: []
---
# Done — Doc-graph reports — token budgeting for selectReportDocs (C-2)

## Step 1 — Add a deterministic token budget to selectReportDocs: a maxChars budget (a sensible default per kind in reportKinds.ts, overridable). When the selected slice exceeds budget, degrade in tiers by relevance (recent/primary docs first): Tier 1 full body for in-budget docs; Tier 2 a deterministic SUMMARY for the rest — prefer an existing ctx doc for that scope, else a fixed excerpt (H1 + section headings + first N lines); Tier 3 reference-only ({id,title,type,created}) for the overflow. No AI — summaries are excerpts/ctx, keeping the function pure and testable.

Added a deterministic, AI-free token budget to `selectReportDocs`.

**`packages/core/src/reportKinds.ts`**
- Added optional `maxChars?: number` to `ReportKind` (per-kind override).
- Added exported `DEFAULT_REPORT_MAX_CHARS = 60000` (~15k tokens at ~4 chars/token). The "sensible default per kind" is this shared default; a kind may override via `maxChars`, and a caller may override per-run. Roadmap-sourced kinds (empty `docTypes`) bypass selection so the budget never applies to them.

**`packages/core/src/reportSelection.ts`**
- New `ReportTier = 'full' | 'summary' | 'reference'`; each `ReportDocSlice` now carries `tier` and its `body` is the tier-appropriate emitted content.
- Reshaped `ReportManifest`: replaced `totalChars` with `fullChars` (pre-budget total of all full bodies — the "size before" metric) + `emittedChars` (post-budget emitted) + `maxChars` (budget in effect) + `budgeted` (degradation occurred). Kept `counts`/`totalDocs`.
- New signature `selectReportDocs(state, kind, filters?, maxChars?)` — `maxChars` kept as a dedicated 4th arg (a budget knob, not a scope filter) resolving `maxChars ?? kind.maxChars ?? DEFAULT_REPORT_MAX_CHARS`.
- Budget logic: if the full slice fits the budget, every doc is `full` (no degradation). Otherwise, **greedy packing in relevance order** (most recent first, tie-broken by id — recent docs keep full bodies): each doc tries full → summary → reference, tracking chars used against the single budget.
- `deterministicExcerpt(body, maxLines=12)` (exported): H1 + `##/###` section headings + first N content (non-heading) lines. Pure string work.
- Tier-2 summary prefers an **existing ctx doc for the doc's scope** (weave ctx keyed by `weaveSlug`, or global ctx for scope-less docs) via `collectCtxByScope`, else falls back to the excerpt. No weave ctx exists today, so this is dormant-but-implemented (and exercised by step 3's ctx-preferred test).
- Tier-3 `referenceMarker` emits a short `{type, created}` note; the prompt header already carries id/title.
- Output stays **chronological** (narrative order); the relevance order is used only for budget allocation, so the two orderings are decoupled.

**Decisions made (within the approved plan design):** greedy single-budget packing (simple + deterministic; non-equal doc sizes pack greedily); relevance = recency; global ctx used as a per-doc summary only for scope-less docs (never repeated across weave docs, per the chat-003 (b) boundary). No AI anywhere in the selection layer.

**`packages/core/src/index.ts`**: exported `DEFAULT_REPORT_MAX_CHARS`, `deterministicExcerpt`, `ReportTier`.

Consumers to update downstream in this plan: the `report` prompt renderer (step 2, uses the reshaped manifest) and the test (step 3). Not yet built — build/test runs at step 4.

## Step 2 — Extend the manifest to record each doc's tier (full / summary / reference-only) and per-tier counts, and add a budget/elision summary (e.g. 'N full, M summarized, K referenced — S of T chars, budget B'). Update the report prompt's slice rendering to mark each doc's tier and inject a coverage note so the agent can state the report's own coverage honestly.

Recorded per-doc tiers in the manifest and taught the prompt to render them honestly.

**`packages/core/src/reportSelection.ts`**
- Extended `ReportManifest` with `tiers: { full, summary, reference }` (per-tier doc counts) and `elision: string` (human coverage summary).
- Manifest builder now tallies `tiers[d.tier]` alongside `counts`/`emittedChars` and composes `elision`: budgeted → `"N full, M summarized, K referenced — E of F chars emitted (budget B)."`; not budgeted → `"N full — F chars, within budget B (no degradation)."`.

**`packages/mcp/src/prompts/report.ts`** (`renderSelection`)
- Coverage line now reports `tiers`, `emittedChars of fullChars`, `budget`, and `budgeted` (replacing the removed `totalChars`).
- Each doc header is tagged with its tier: `### [type] [full|summary|reference] title · id …`.
- When `budgeted` is true, injects a **NOTE ON COVERAGE** instructing the agent to state the report's coverage honestly — not to present summarized/referenced docs as fully read, and to flag areas covered only at summary/reference depth. Not injected when the whole slice fit the budget (no noise on small reports).

## Step 3 — Extend tests/report-selection.test.ts: budget determinism (same input → identical tiers), degradation order (full → summary → reference-only as the budget shrinks), relevance ordering governs what keeps a full body, manifest elision counts, and ctx-preferred-over-excerpt for summaries. All pure, no AI.

Extended `tests/report-selection.test.ts` with pure, AI-free budgeting coverage (5 new blocks; import now pulls `deterministicExcerpt` to compute exact budgets).

- Fixed block 1 for the reshaped manifest: `totalChars` → `fullChars`, plus asserts a small slice is `!budgeted` and every doc is `tier==='full'`.
- Added helper `linesBody(title, nLines)` (H1 + one section heading + N equal content lines) so a doc's full size scales with N while its excerpt stays bounded to the first 12 lines — the key to clean, monotonic degradation — and `docB(...)` for custom bodies.
- **Block 6** — within budget → all full, `!budgeted`, full body emitted verbatim, `fullChars === emittedChars`.
- **Block 7** — degradation order: at `bodyLen + excerptLen + 10` the newest doc stays `full`, the next `summary`, the oldest `reference`; asserts one-per-tier, `fullChars` = sum of all full bodies (pre-budget), `emittedChars <= maxChars`, tier counts sum to `totalDocs`, elision names all three tiers, and **output order stays chronological** despite relevance-ordered allocation.
- **Block 8** — determinism: identical inputs → byte-identical `docs` and `manifest` (proves no AI / pure).
- **Block 9** — monotonic downgrade as budget shrinks (3 full → 1 full → 1 full + rest degraded).
- **Block 10** — summary tier prefers an existing scope **ctx** (weave `wa` has a ctx in `looseFibers`; its design's summary is the ctx body) over the excerpt (weave `wb`, no ctx, gets the deterministic excerpt); also asserts the ctx doc is a summary *source*, never itself selected into the slice.

No `run_test` line change needed — `tests/report-selection.test.ts` is already registered in `scripts/test-all.sh`. Build + run happen in step 4.

## Step 4 — Run ./scripts/build-all.sh + ./scripts/test-all.sh. Then generate ONE real report end-to-end via the agent — a budgeted full-project `decisions` (or `security`) report — and LEAVE IT SAVED under loom/reports so Rafa can review it. Record the slice size before vs after budgeting (chars/tokens saved). This is the single sanctioned paid generation for the plan (token-economical); the saved artifact is the reviewable deliverable.

Built, ran the full suite, and generated one real budgeted report end-to-end.

**Build + test**
- `./scripts/build-all.sh` — clean (all packages, incl. mcp, compile with the reshaped manifest + tiered prompt renderer).
- `./scripts/test-all.sh` — **23 passed, 0 failed**; `report-selection.test.ts` all 10 blocks green.
- One iteration: block 7's `emittedChars <= maxChars` assertion failed → surfaced the correct semantics (reference markers are a free metadata floor, not budgeted content). Fixed in code (reference branch no longer consumes budget) and test (assert `emittedChars < fullChars` + full/summary content ≤ budget). Re-ran green.

**Real report — budgeted `decisions`, whole project**
Generated via `loom report decisions` (CLI spawns a fresh MCP server from the rebuilt dist, so it ran the new budgeting code — the in-session server was reconnected afterward for `loom_create_report`). Before/after from the live manifest:

| Metric | Value |
|--------|-------|
| Slice (before budget) | **3,392,358 chars (~848k tokens)** — 228 docs (81 designs + 147 chats) |
| Emitted (after budget) | **74,306 chars (~18.6k tokens)** |
| Saved | **~3.32M chars (~830k tokens) — ~98% reduction** |
| Tiers | 3 full · 5 summary · 220 reference |

Note: emitted (74k) exceeds the 60k budget by the 220 reference markers (~14k) — the intended floor; heavy (full+summary) content stays within budget.

**Saved artifact (the reviewable deliverable):** `loom/reports/Loom — Decisions (recent, budget-scoped) (2026-07-12) - decisions report.md` · `rp_01KXBPQV3FVQDK2QEGG3TC0HC1`. Synthesized honestly from the 8 in-depth docs, with an explicit coverage section and the 220 reference-depth docs flagged as not-read.

**Two findings recorded in the report itself:** (1) recency=relevance front-loads a whole-project decisions report onto the newest thread — for a *showcase*, scope by weave/date or reconsider the relevance heuristic; (2) the budget bounds heavy content, not total, by design.
