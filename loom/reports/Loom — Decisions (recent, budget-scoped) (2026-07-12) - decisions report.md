---
type: report
id: rp_01KXBPQV3FVQDK2QEGG3TC0HC1
title: "Loom — Decisions (recent, budget-scoped)"
status: active
created: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
kind: decisions
generated_at: "2026-07-12T17:41:58.512Z"
---
# Loom — Decisions Report

*Kind: `decisions` · whole-project scope · synthesized from a **budget-degraded** slice.*

## Coverage & method — read this first

This report was written from a **deterministic, token-budgeted slice** of Loom's doc graph, **not the full history**. The `decisions` kind selects every `chat` + `design` doc; at whole-project scope that is **228 docs / 3,392,358 chars (~848k tokens)**. Under the default **60,000-char budget**, `selectReportDocs` degraded the slice by recency:

| Tier | Docs | What the agent actually saw |
|------|------|-----------------------------|
| Full body | 3 | complete text |
| Summary | 5 | deterministic excerpt (H1 + headings + first lines) or a scope ctx |
| Reference only | 220 | id / title / type / created marker — body elided |

**Emitted: 74,306 chars (~18.6k tokens) — a ~98% reduction** from the 3.39M-char full slice. Because relevance = recency, the docs read in depth are the **8 most recent** (2026-07-11 / 2026-07-12); the other 220 decision docs, spanning **2026-04 → 2026-07**, are named but not read.

> **So this report covers *recent* decisions in depth and older ones by title only.** To go deeper on the rest, raise the budget or scope a follow-up run with `--since` / `--weave`.

*(This artifact is itself the plan-004 (C-2 token-budgeting) deliverable — the before/after figures above are the point of it.)*

---

## Decisions read in depth

### 1. The doc-graph reports feature — its whole decision history

The richest cluster: the entire reports thread, read in full (3 chats + the design summary).

- **Report *kind* is the only knob; the "deep-level" matrix was rejected.** The original idea proposed an orthogonal matrix (chats / ideas / plans / done / all combinations). Decision: the **kind implies its doc-set** (decisions → chats+designs, architecture → designs+refs, release-notes → done+roadmap…), because a combinatorial "level 6 vs level 7" config is something no user will reason about — and kind-implied doc-sets *also* bound token cost structurally. The deep-level override was first demoted, then **dropped entirely**: "an override nobody reaches is just surface to maintain."
- **Server selects, agent reasons — never sampling.** Split along Loom's existing `do_step` seam: deterministic doc-selection in the server (testable), synthesis in the real agent loop. Rationale: a report is inference-heavy and must run where the tokens and tools are; captive `sampling/createMessage` is blocked in Claude Code for the same reason.
- **A thin new `report` type, not `reference`.** Reusing `reference` was rejected on two concrete grounds — it pollutes the `requires_load` picker (`loom://refs` auto-lists every reference; dated reports would flood it), and it contradicts the already-locked `Reports` tree node. "A report answering to `load: by-request` is a lie about what it is." → new `rp_` ULID type, minimal snapshot frontmatter, excluded from refs.
- **Reports are standalone artifacts, NOT loaded into `LoomState` (storage decision A).** A code-level finding forced the choice: everything in the graph hangs off a weave, and there is no loader for a top-level `loom/reports/` dir — a cross-weave report is "homeless" in state. Rather than build a first-class loader (largest blast radius, then re-exclude from refs/staleness/derived one by one), reports are written as versioned markdown **outside** state — excluded-from-everything *by construction*.
- **Minimal frontmatter + provenance in the body (fork 1a).** The canonical serializer is flat (nested objects fall through to ugly one-line JSON), so `scope`/`sources` live in a body `## Provenance` section rather than frontmatter — cleanest for a snapshot doc, zero serializer changes.
- **Brief-returning CLI (fork 2a), then `--run` for standalone.** `loom report` returns a *brief* for an agent to synthesize — consistent with `do-next-step`. This surfaced a real UX gap (a bare terminal shows "no AI inference"), fixed two ways: a reframed brief header, and `loom report --run` piping the brief to `claude -p` on **stdin** (chosen over argv to dodge the Windows ~32k command-line limit).
- **`selectReportDocs` as a pure core function, not an app/fs spread.** Implemented as a pure function over `LoomState` (like `buildRoadmap`) — cleaner and unit-testable with fixtures — rather than the app/fs orchestration the plan first sketched.
- **Token budgeting = deterministic tiered degradation, no AI (C-2, this plan).** A 156 KB single-weave slice confirmed budgeting was a real need. Decision: a char budget that degrades by relevance (full → deterministic summary → reference-only), summaries being excerpts or an existing ctx — **never a model call** — so the selection layer stays pure, testable, and free while shrinking the agent's paid input.

### 2. CLI verb collision: `rename` → `retitle` *(cli-management-command-parity — summarized)*

The CLI used `rename` for what MCP calls `retitle` (a title change), while MCP reserves `rename*` for filename/folder ops (`loom_rename_reference_file` / `_thread` / `_weave`). Decision, under **tri-surface verb parity** (verbs must *match* across surfaces): the CLI gains `retitle`, and `rename*` is reserved for filename/folder ops.

### 3. Authoring-verb sweep: `weave` → `create` / `generate` *(authoring-verb-consistency — summarized)*

Legacy `weaveIdea/Design/Plan` (which *create*, no AI) and `weave-*` MCP prompts were inconsistent. Decisions: MCP prompt verb → **(a) `generate-*`**; the extension `Weave Chat` button → `Create Chat`; **clean cutover, no aliases**.

### 4. "Auditable decisions" is a distinct claim *(decision-history-value — summarized)*

The README already says "auditable" — but meaning *auditable **context*** (why the AI gave the answer it gave). This thread's value is *auditable **decisions*** (why *we* chose what we chose over the project's life). Decision: it must **not** be folded into the existing "Auditable" bullet — it is a genuinely distinct, more team-facing claim that has to stand on its own.

### 5. `do quick` stays record-only; add `code quick` *(quick-fix-lane — summarized)*

Open fork: does `do quick` stay pure record-only (A) or sometimes implement (B)? Resolved: keep `do quick` **record-only** (A — the word never silently writes code) and add **`code quick`** = implement-then-record, as its own deterministically-named verb. Best of both — B's terseness without B's meaning-drift.

---

## Covered at reference depth only — not read

220 decision docs (chats + designs) from **2026-04 → 2026-07** were named but not read under the budget: the bulk of Loom's architectural history — core engine, id-management, the MCP tool/resource surface, staleness models, the derived roadmap, telemetry, release automation, and the VS Code extension refactor. **Their rationale is not in this report.** To surface it, raise the budget or scope a follow-up: `loom report decisions --since 2026-05-01`, or `loom report decisions --weave core-engine`.

---

## Findings — about the report itself

1. **Recency = relevance front-loads the newest thread.** At default budget a whole-project `decisions` report is ~90% about the most recent work (here, the reports feature) purely because it is newest. For a balanced decisions *showcase*, scope by weave/date — or consider a relevance heuristic that samples across the timeline — before these reports go into a README.
2. **The "budget" bounds heavy content, not the total.** Emitted (74k) exceeds the 60k budget by the 220 reference markers (~14k) — by design: every doc keeps at least a name. Honest, and visible in the manifest.

## Provenance

- **Kind:** decisions
- **Scope:** weaves: all; threads: all; from: —; to: —
- **Sources:** ch_01KXAJTVQQQ365TZBGCW9HA9VF, ch_01KXAZM8Z2NE6SW34YR6TFJC5K, ch_01KXBHD8QEHH2T88MJH8SKC9M2, de_01KXAV5RB06F8E13CC9VKC22WE, ch_01KX7RPV16X8WFEGWXCVWV2YR9, ch_01KX8A0MRF5MT14M7QWGXHXJE1, ch_01KX8ZQPCTBAXZ1X4MCWAVW19P, ch_01KX97MJR6WWKDBWW5E67GV2Y0
- **Generated:** 2026-07-12T17:41:58.512Z
