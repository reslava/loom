---
type: plan
id: pl_01KXHACFPTH6KCWZ6E7CF9DPHV
title: Future-report v1 — next-work kind + forward/creativity knobs
status: done
created: 2026-07-14
updated: 2026-07-15
version: 1
design_version: 1
tags: []
parent_id: de_01KXH9ZH380GNK3NV1CCQ2T32D
requires_load: []
target_version: 0.1.0
steps:
  - id: source-discriminator-on-reportkind
    order: 1
    status: done
    description: "Add an explicit `source: 'docset' | 'roadmap' | 'release-notes' | 'forward-signal'` field to the ReportKind interface and tag every existing REPORT_KINDS entry; retire the `docTypes.length === 0` inference (D1)."
    files_touched: [packages/core/src/reportKinds.ts, packages/core/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: buildforwardsignal-pure-builder
    order: 2
    status: done
    description: "Create `packages/core/src/forwardSignal.ts`: a pure `(LoomState, ReportFilters) => ForwardSignal` builder that composes existing derivations into the four Tier-1 signal groups with deterministic ranking inputs, and export it + its types from the core index."
    files_touched: [packages/core/src/forwardSignal.ts, packages/core/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: register-next-work-kind
    order: 3
    status: done
    description: "Add the `next-work` entry to REPORT_KINDS: empty `docTypes`, `source: 'forward-signal'`, cross-weave, with the forward-synthesis promptFraming (ranked next-work list; every proposal cites its signal group; empty-slice stop discipline)."
    files_touched: [packages/core/src/reportKinds.ts]
    blocked_by: [source-discriminator-on-reportkind]
    satisfies: []
  - id: report-prompt-source-branch-forward-creativity
    order: 4
    status: done
    description: In the `report` prompt, switch selection on `kind.source` (adding the `forward-signal` branch that calls `buildForwardSignal` and renders its slice), and add the `forward` (boolean) and `creativity` (`closed`|`creative`) args as prompt-framing modifiers.
    files_touched: [packages/mcp/src/prompts/report.ts]
    blocked_by: [source-discriminator-on-reportkind, buildforwardsignal-pure-builder, register-next-work-kind]
    satisfies: []
  - id: cli-forward-creativity-flags
    order: 5
    status: done
    description: Wire `--forward` and `--creativity <level>` onto the `loom report` command so the new kind and the forward experiment are runnable from the terminal (tri-surface parity), passing them through to the prompt args.
    files_touched: [packages/cli/src/commands/report.ts, packages/cli/src/index.ts]
    blocked_by: [report-prompt-source-branch-forward-creativity]
    satisfies: []
  - id: tests
    order: 6
    status: done
    description: Add `tests/forward-signal.test.ts` covering buildForwardSignal (each signal group, ranking order, filters, empty-set) against a state fixture, extend the report-prompt test for the forward-signal branch + forward/creativity framing, and register both in test-all.sh.
    files_touched: [tests/forward-signal.test.ts, tests/report-selection.test.ts, scripts/test-all.sh]
    blocked_by: [buildforwardsignal-pure-builder, report-prompt-source-branch-forward-creativity]
    satisfies: []
  - id: docs-surface-parity-sweep
    order: 7
    status: done
    description: "Document the new kind and knobs on the user- and agent-facing surfaces: the MCP/report reference, the reports how-to/docs, and the CLI README."
    files_touched: [loom/refs/mcp-reference.md, docs/WAYS-TO-USE-LOOM.md, packages/cli/README.md]
    blocked_by: [report-prompt-source-branch-forward-creativity, cli-forward-creativity-flags]
    satisfies: []
---
# Future-report v1 — next-work kind + forward/creativity knobs

## Goal

Ship v1 of the forward-looking report: a new `next-work` report kind driven by Tier-1 deterministic forward signal (parked decisions, stalled intent, blocked work, drift debt), plus a `forward` flag and a `creativity` knob on the report surface. Grounded-observation / free-solution: every proposal cites the doc-graph signal it derives from; the report invents no problems. Tier-2 semantic synthesis (convergence + design-smell) is out of scope, deferred to its own thread. The work adds a `source` discriminator to `ReportKind` (retiring the brittle `docTypes.length === 0` inference), a pure `buildForwardSignal` builder that composes existing derivations, a fourth selection branch in the `report` prompt, and CLI + test + doc parity.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add an explicit `source: 'docset' \| 'roadmap' \| 'release-notes' \| 'forward-signal'` field to the ReportKind interface and tag every existing REPORT_KINDS entry; retire the `docTypes.length === 0` inference (D1). | packages/core/src/reportKinds.ts, packages/core/src/index.ts | — | — |
| ✅ | 2 | Create `packages/core/src/forwardSignal.ts`: a pure `(LoomState, ReportFilters) => ForwardSignal` builder that composes existing derivations into the four Tier-1 signal groups with deterministic ranking inputs, and export it + its types from the core index. | packages/core/src/forwardSignal.ts, packages/core/src/index.ts | — | — |
| ✅ | 3 | Add the `next-work` entry to REPORT_KINDS: empty `docTypes`, `source: 'forward-signal'`, cross-weave, with the forward-synthesis promptFraming (ranked next-work list; every proposal cites its signal group; empty-slice stop discipline). | packages/core/src/reportKinds.ts | source-discriminator-on-reportkind | — |
| ✅ | 4 | In the `report` prompt, switch selection on `kind.source` (adding the `forward-signal` branch that calls `buildForwardSignal` and renders its slice), and add the `forward` (boolean) and `creativity` (`closed`\|`creative`) args as prompt-framing modifiers. | packages/mcp/src/prompts/report.ts | source-discriminator-on-reportkind, buildforwardsignal-pure-builder, register-next-work-kind | — |
| ✅ | 5 | Wire `--forward` and `--creativity <level>` onto the `loom report` command so the new kind and the forward experiment are runnable from the terminal (tri-surface parity), passing them through to the prompt args. | packages/cli/src/commands/report.ts, packages/cli/src/index.ts | report-prompt-source-branch-forward-creativity | — |
| ✅ | 6 | Add `tests/forward-signal.test.ts` covering buildForwardSignal (each signal group, ranking order, filters, empty-set) against a state fixture, extend the report-prompt test for the forward-signal branch + forward/creativity framing, and register both in test-all.sh. | tests/forward-signal.test.ts, tests/report-selection.test.ts, scripts/test-all.sh | buildforwardsignal-pure-builder, report-prompt-source-branch-forward-creativity | — |
| ✅ | 7 | Document the new kind and knobs on the user- and agent-facing surfaces: the MCP/report reference, the reports how-to/docs, and the CLI README. | loom/refs/mcp-reference.md, docs/WAYS-TO-USE-LOOM.md, packages/cli/README.md | report-prompt-source-branch-forward-creativity, cli-forward-creativity-flags | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:source-discriminator-on-reportkind -->
### Step 1 — source discriminator on ReportKind

Add `source` to the `ReportKind` interface. Set it on all current kinds: doc-set kinds (`architecture`,`decisions`,`drift-audit`,`security`,`ideas`,`designs`,`plans`,`dones`) = `'docset'`; `project-overview` = `'roadmap'`; `release-notes` = `'release-notes'`. This is the discriminator the prompt will switch on instead of inferring shape from `docTypes.length`.

<!-- step:buildforwardsignal-pure-builder -->
### Step 2 — buildForwardSignal pure builder

Four grounded groups, each row carrying source doc id(s) + firing detector: **parked decisions** (fixed `## Open questions` / deferred heading scan of idea/design bodies — verbatim extract, Tier-1 per D2), **stalled intent** (graph shape from the link index / state: idea→no design, design→no plan, plan active-but-never-implementing), **blocked work** (reuse blocked-steps + `buildRoadmap` `blockedOn`), **drift debt** (reuse `staleEntries`). Compute deterministic ranking inputs per item: **leverage** = fan-out (threads/plans/docs that resolving it unblocks, from link index + roadmap deps — the proxy per D4), **readiness** = unblocked vs waiting, **age** = created/updated drift. Honour ReportFilters (weave/thread/date). Pure, no IO — unit-testable with a state fixture like buildRoadmap. Emit a structured `isEmpty` when the graph has no open material.

<!-- step:register-next-work-kind -->
### Step 3 — register next-work kind

promptFraming per design §Prompt framing: produce a ranked next-work list (highest-leverage, unblocked, longest-parked first); for each proposal give what-to-do, the cited signal (doc id(s) + group), leverage, and a concrete first move; do NOT propose work no signal group supports; if the slice is empty, say so and stop (mirrors release-notes' nothing-unreleased guard). Includes the `{creativity}` clause placeholder the prompt fills.

<!-- step:report-prompt-source-branch-forward-creativity -->
### Step 4 — report prompt: source branch + forward/creativity args

Replace the `docTypes.length === 0` / `slug === 'release-notes'` inference with a `switch (kind.source)`. New `forward-signal` case: `buildForwardSignal(state, filters)` → a `renderForwardSignal()` slice (grouped, each row with id + detector + leverage/readiness/age), with an empty-set stop-signal like renderReleaseNotes. `forward=true`: wrap ANY kind's promptFraming with the forward-reframe (‘infer next work from this retrospective slice’) — selection unchanged. `creativity`: validate at the edge (closed|creative), inject the solution-latitude clause into the framing (closed = within current stack; creative = may propose new approach/stack for an observed problem; both cite grounding). Update the promptDef arguments list + description.

<!-- step:cli-forward-creativity-flags -->
### Step 5 — CLI --forward / --creativity flags

Add the option definitions in index.ts' `report` command registration and the pass-through in reportCommand (mirroring how `full`/`sort`/`titlesOnly` map to prompt args). Validate `--creativity` at the CLI edge (closed|creative) as `--sort` already is. `loom report next-work` works with no extra flags; `--forward` / `--creativity` apply across kinds.

<!-- step:tests -->
### Step 6 — tests

buildForwardSignal is pure, so test it directly with a fixture LoomState: assert each detector fires on seeded open material, that ranking orders leverage×readiness with age tiebreak, that filters scope it, and that an all-closed graph yields isEmpty. For the prompt, assert the forward-signal branch renders the grouped slice and that forward/creativity inject their clauses. Add `run_test` lines. Build (`./scripts/build-all.sh`) before running (tests import dist).

<!-- step:docs-surface-parity-sweep -->
### Step 7 — docs + surface parity sweep

Add `next-work` to any reports-kind listing, document `--forward` and `--creativity`, and describe the Tier-1 forward-signal groups + the grounded/ranked/cited contract. Keep it factual; note Tier-2 is a future thread. Verify the actual doc paths at implementation time (reports may be documented in a different ref) and adjust.
