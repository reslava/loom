---
type: reference
id: rf_01KXBTN81VBHKFF7JZWX58Z80Z
title: loom — Reports
status: active
created: 2026-07-12
updated: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
slug: reports
description: "How Loom reports work: kinds, parameters, showcase candidates, and usage."
---
# loom — Reports

Reports are analytical, human-readable documents synthesized by an AI agent from a **deterministic, token-budgeted slice** of the Loom doc graph (chats, ideas, designs, plans, done, roadmap), under a chosen **report kind**. They persist as standalone `report` artifacts (`rp_` ULID) under `loom/reports/` (cross-weave) or `loom/{weave}/reports/` (weave-scoped) — leaf snapshots, deliberately excluded from `LoomState`, refs, staleness, and `requires_load`.

The seam: **the server selects (deterministic, testable), the agent synthesizes (in the real loop — never sampling).** Selection lives in `selectReportDocs` (pure core); the `report` MCP prompt injects the slice; `loom_create_report` persists the result.

## Report kinds

Each kind is a registry entry (`packages/core/src/reportKinds.ts`) declaring the doc-set it reads (`docTypes`) and a synthesis lens (`promptFraming`). Adding a kind = a registry entry, never a new selection path. Empty `docTypes` = roadmap passthrough (reads `loom://roadmap`, bypasses `selectReportDocs`). Kinds marked **†** include `ctx` in their doc-set — a scope/global ctx is pulled in as an orientation input when one exists.

**Roadmap-sourced**

| Kind | Reads | Lens |
|------|-------|------|
| `project-overview` | roadmap (history + pending) | what this is, goals, direction |
| `release-notes` | roadmap (`actual_release`) | what shipped between releases |

**Analytical** (multi-type doc-set; `decisions`/`drift-audit`/`security` stay **ctx-free** — raw rationale, no summary-of-a-summary)

| Kind | Reads | Lens |
|------|-------|------|
| `architecture` **†** | designs + refs (+ ctx) | layers, components, key technical decisions |
| `decisions` | chats + designs | rationale ("why"), alternatives weighed |
| `drift-audit` | designs vs done | where implementation diverged from design |
| `security` | designs + done + refs | risky decisions, weak points, open concerns |

**Single-doc-type "complete" kinds** — whole-history reports fed by one doc type, each with a higher default **150k-char** budget (one type is a smaller slice); scope with `--weave` / `--thread`:

| Kind | Reads | Lens |
|------|-------|------|
| `ideas` **†** | ideas (+ ctx) | everything the project set out to build |
| `designs` **†** | designs (+ ctx) | the full design corpus |
| `plans` **†** | plans (+ ctx) | all planned work |
| `dones` **†** | done docs (+ ctx) | everything actually shipped |

## Parameters

`loom report <kind> [options]` assembles a **brief** (source slice + synthesis instruction) and, by default, prints it for an AI agent to synthesize and persist via `loom_create_report`.

| Option | Meaning |
|--------|---------|
| `<kind>` | required — one of the kinds above |
| `--weave <slug>` | scope to one weave (also the persist target for a weave-scoped report) |
| `--thread <slug>` | scope to one thread |
| `--since <YYYY-MM-DD>` | include only docs created on/after this date |
| `--until <YYYY-MM-DD>` | include only docs created on/before this date |
| `--full` | disable the token budget — send the FULL slice, no degradation (prints an estimated-size warning; a no-op for roadmap kinds) |
| `--sort <recency\|oldest>` | keep-full ordering when the slice is budget-degraded: `recency` = newest docs stay full; `oldest` = oldest/foundational stay full. Defaults per kind (see below). Ignored with `--full` (nothing degrades) |
| `--run` | launch a headless Claude agent to synthesize + save the report end-to-end, instead of printing the brief |

**Token budget & tiered degradation.** `selectReportDocs` bounds the slice to a per-kind char budget (default 60k; single-doc-type kinds 150k; `--full` = unlimited). When the full slice exceeds budget, docs degrade by a **selectable keep-full ordering** (`--sort`):

1. **full** — full body;
2. **summary** — a deterministic excerpt (H1 + section headings + first lines) or an existing scope **ctx** — never a model call;
3. **reference** — an id/title/type/created marker only.

Only the *relevance* order used for tier allocation flips with `--sort`; the **output stays chronological** either way. The coverage manifest records `fullChars` vs `emittedChars`, per-tier counts, the effective `sort`, and — when a degraded weave has no ctx — a suggestion (led by `--sort`/`--full`, ctx as a secondary opt-in). The prompt tells the report its own coverage so it states it honestly.

**Per-kind `defaultSort`.** Single-doc-type kinds (`ideas`/`designs`/`plans`/`dones`) and `architecture` default to **`oldest`** — foundational docs stay full, the right shape for a design/architecture read. Analytical kinds (`decisions`/`drift-audit`/`security`) and roadmap kinds default to **`recency`** — recent rationale/activity is most relevant. Override per run with `--sort`.

> **Ordering note.** `recency` keeps the *newest* docs full (good for "what changed lately"); `oldest` keeps the *foundational* docs full (good for a `designs`/`architecture` showcase). For a whole-project/whole-weave run pick the ordering that matches the lens, scope with `--weave`/`--since`, or use `--full` for the complete set.

## Showcase candidates

Curated list of generated reports good enough to feature in READMEs / docs — Loom's own history **and** Chord Flow's. Regenerate **weave-scoped** for the showcase, and for `designs`/`architecture` use the default (or explicit) `--sort oldest` so the foundational docs stay full.

| Status | Report | Id | Note |
|--------|--------|----|------|
| ✅ candidate | Core Engine — Designs (foundational-first) (2026-07-12) | `rp_01KXC9GHQQ…` | weave-scoped `designs --sort oldest`; keeps the 22 foundational designs full (10 newest → reference) — the better showcase shape. Supersedes the recency run below |
| ↩ superseded | Core Engine — Designs (2026-07-12) | `rp_01KXC1HB5W…` | earlier recency run; foundational designs dropped to reference — kept for the before/after contrast |
| ✅ candidate | Loom — Project Overview (2026-07-12) | `rp_01KXB088…` | roadmap-based; "useful payoff" |
| ❌ rejected | Loom — Decisions (recent, budget-scoped) | `rp_01KXBPQV3F…` | recency-front-loaded whole-project run; regenerate weave-scoped |

## Examples — how to use reports, and for what

**By kind — when to reach for each:**

- `loom report project-overview` — orient a newcomer: what Loom is, its areas, shipped history, what's next. Roadmap-based, cheap.
- `loom report decisions --weave <w>` — the "why" behind a weave's choices (rationale that isn't in code). Scope to a weave — a whole-project run skews to the newest thread.
- `loom report designs --weave <w>` / `loom report architecture --weave <w>` — the design corpus / architecture of an area. Add `--full` for a complete pass.
- `loom report dones --since <date>` — what actually shipped in a window (release-notes-adjacent).
- `loom report drift-audit --weave <w>` — where implementation diverged from design (design vs done).

**The two run modes:**

- **Brief (default):** `loom report <kind> …` prints a brief; hand it to an agent (or paste it into a Claude session) — it reads the slice, writes the report, and calls `loom_create_report`.
- **`--run`:** launches a headless Claude agent to do that end-to-end (`claude -p`, brief piped on stdin, `loom_create_report` pre-allowed).

**Showcase workflow (Loom + Chord Flow):** during a thread, generate candidate reports **weave-scoped**, leave them saved under `loom/reports` (cross-weave) or `loom/{weave}/reports/`; curate the best in the *Showcase candidates* table above; feature the winners in READMEs / docs so users see the doc-graph payoff in one screenshot. Regenerate the chosen ones at showcase quality (`--full`, or a tight `--weave` / `--since`) at the end of the thread.
