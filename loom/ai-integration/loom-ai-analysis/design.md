---
type: design
id: de_01KXAV5RB06F8E13CC9VKC22WE
title: Doc-graph reports — design
status: active
created: 2026-07-12
updated: 2026-07-12
version: 2
idea_version: 1
tags: []
parent_id: id_01KXAT9JZJ8XZ14TPK8F95P4HB
requires_load: []
---
# Doc-graph reports — design

## Vision check

Serves the vision element *"the AI becomes as stateful as it can be — not via memory inside the model, but via durable docs it rereads."* Removes a manual step no other tool touches: hand-archaeology through chats/designs/dones to reconstruct *why* decisions were made, *what* shipped, and *where* implementation drifted. A report turns the doc graph into queryable decision-memory — the one thing a codebase-only AI structurally cannot produce.

## Overview

A **report** is an analytical, human-readable document synthesized by an AI agent from a *deterministic, filtered slice of the Loom doc graph* (chats, ideas, designs, plans, done, roadmap), under a chosen **report kind**. It is persisted back into the graph as a versioned, first-class **`report`** doc under a dedicated `Reports` tree node.

The feature splits cleanly along Loom's existing seam:

```
CLI `loom report <kind> [filters]`  ─┐
extension action (later)            ─┤
                                     ▼
   report MCP prompt  ──►  [server] deterministic doc-selection  ──►  filtered doc slice
                                     ▼
              [agent] synthesis in the real agent loop  ──►  report markdown
                                     ▼
              loom_create_report (new write tool)  ──►  Reports/{...}.md (versioned)
```

**One principle:** the server *selects* (deterministic, testable), the agent *reasons* (inference-heavy, in the real loop). Never captive `sampling/createMessage` — same rule that blocks sampling in Claude Code.

## Decisions locked (from chat-001)

1. **Report *kind* is the only knob.** Deep-level selection is **dropped entirely** — the kind implies its doc-set. No orthogonal matrix.
2. **New thin `report` doc type** (decision A) — not `reference`. Rationale below.
3. **Reports persist as versioned Loom docs** under a new `Reports` tree node, filename `{Title} ({date}) - {kind} report.md`.
4. **CLI-first**, filters CLI-only to start; extension action follows once the shape is proven.
5. **First slice**: one kind (`project-overview`) over `loom://roadmap`, no filters.

## Why a new `report` type, not `reference`

`reference` is defined by two things a report is not:
- It **lives in `loom/refs/` and backs the `requires_load` picker** (`loom://refs`). Reports are *outputs a human reads*, not citable fact-sources — listing them there floods the picker with dated snapshots.
- It renders under refs, contradicting the **`Reports` node** decision.

The thin `report` type avoids both: its own home, excluded from the refs picker, not auto-loadable. It is deliberately minimal (see frontmatter) — a snapshot, not a node other docs depend on.

## The `report` doc type

Minimal frontmatter, snapshot semantics:

```yaml
type: report
id: rp_<ULID>            # new rp_ prefix, consistent with the ULID+prefix convention
title: "Project Overview (2026-07-12)"
status: active           # reports are born active — no draft/finalize lifecycle
created: YYYY-MM-DD
version: 1
kind: project-overview   # the report kind (drives which doc-set fed it)
generated_at: <ISO>      # generation timestamp (distinct from created date)
scope:                   # the filter that produced it — provenance
  weaves: []             # empty = all
  threads: []
  from: null
  to: null
sources: []              # doc ids the report was synthesized from (traceability)
```

Design notes:
- **No `requires_load`, no `load`/`load_when`** — a report is never auto-included context. It is excluded from `loom://refs` and from the requires_load picker.
- **`sources` gives provenance** — the reader (and a future "refresh") can see exactly which docs fed the report.
- **Regeneration = a new report**, not a mutating refine — each run is a dated snapshot. (Whether a later "refresh in place" is worth it is deferred; snapshots are the honest default.)
- **Home**: `loom/{weave}/reports/` when scoped to one weave, or a top-level `loom/reports/` for cross-weave/roadmap reports. The tree renders these under a `Reports` node.

## Report kinds → doc-set map

The kind is a registry entry: `{ slug, title, docTypes, scopeHint, promptFraming }`. Adding a kind = adding a registry entry, never a new selection path.

| Kind | Reads | Lens |
|------|-------|------|
| `project-overview` | roadmap (history + pending) | what this is, goals, where it's going |
| `architecture` | designs + refs | layers, components, key technical decisions |
| `decisions` ("why") | chats + designs | rationale behind choices, alternatives weighed |
| `release-notes` | done + roadmap (`actual_release`) | what shipped between releases |
| `drift-audit` | designs **vs** done | where implementation diverged from design |
| `security` | designs + done + refs | weaknesses, risky decisions, exposure |

Only `project-overview` ships in slice 1.

## Server: deterministic doc-selection

A new selection function — a generalization of the context pipeline + `buildRoadmap` — with signature roughly:

```
selectReportDocs(kind, filters, deps) -> { docs: DocSlice[], manifest: {...} }
```

- **`filters`**: `{ weaves?, threads?, from?, to? }`. Empty = whole graph.
- **Selection** = docs whose `type ∈ kind.docTypes`, within the weave/thread filter, whose `created`/`generated_at` falls in the date window.
- **Ordering**: chronological for narrative kinds (overview, release-notes, decisions), structural for architecture.
- **Token budgeting**: the slice is bounded — if it exceeds a budget, prefer summaries/ctx over full bodies and record the elision in the manifest (so the report can note its own coverage). This is where the shared machinery with ctx matters.
- **Deterministic and unit-testable** independent of any AI call — this is the piece with real test coverage.

For slice 1, `project-overview` selection is simply "read `loom://roadmap`" — no doc-type scan yet.

## Agent: synthesis via a `report` MCP prompt

A new prompt `report`:
- **Args**: `kind` (required), `weaveSlug?`, `threadSlug?`, `from?`, `to?`.
- **Body**: calls `selectReportDocs`, injects the slice, and returns an instruction: *"Using only the documents below, produce a `{kind}` report per this framing: {kind.promptFraming}. Structure it as clean, visually-scannable markdown. Then persist it with `loom_create_report`."*
- Runs in the host agent loop (Claude Code / extension-launched agent), where the tokens and tools live. **Never sampling.**

## Write path: `loom_create_report`

A new write tool (goes through the reducer like every other doc write):
- **Args**: `weave_slug?` (omit = cross-weave/roadmap → top-level `loom/reports/`), `kind`, `title`, `content`, `scope`, `sources`.
- Mints the `rp_` ULID, writes frontmatter + body, places the file under the right `reports/` dir, updates the link index.
- Born `status: active`, `version: 1`.

## CLI surface

`loom report <kind> [--weave <slug>] [--thread <slug>] [--since <date>] [--until <date>] [--title <t>]`

- Human-first (slug filters, friendly). Resolves to the prompt + selection under the hood.
- Slice 1: `loom report project-overview` — no filters.
- Extension action mirrors this later (tri-surface parity — considered, deferred to a follow-up thread).

## Tree / presentation

- New **`Reports`** node in the VS Code tree, grouping `report` docs (cross-weave reports at root, weave-scoped under their weave).
- Filename `{Title} ({date}) - {kind} report.md`; identity is the `rp_` ULID so a rename rewrites no content.

## First slice (what actually ships first)

1. `report` doc type + `rp_` prefix + serializer support (core).
2. `loom_create_report` write tool + `reports/` placement + link-index (fs/app/mcp).
3. `report` MCP prompt, `project-overview` kind only, selection = roadmap passthrough.
4. `loom report project-overview` CLI command.
5. Exclude `report` from `loom://refs` and the requires_load picker.

**Deferred to follow-ups:** the full kind registry (architecture/decisions/release-notes/drift-audit/security), filters + `selectReportDocs` doc-type scan, the extension action, and any "refresh report in place" semantics.

## Out of scope

- Deep-level selection knob (dropped by decision).
- Sampling-based generation (wrong seam).
- Non-markdown outputs (PDF/HTML export) — a later concern.

## Resolved decisions (chat-001 follow-up)

- **`reports/` location — confirmed.** Cross-weave / roadmap reports → top-level `loom/reports/`; single-weave reports → `loom/{weave}/reports/`. The `Reports` tree node renders both.
- **Refresh vs. snapshot — confirmed snapshot-only.** Each run mints a new dated `report` doc; no in-place mutation. Revisit an explicit "refresh" only if repeated regeneration proves noisy.
- **Kind registry home — core, as a pure data registry.** This does *not* conflict with the file-save needing `fs` or the command needing `cli` — the feature is layered exactly per the dependency rule (`cli → mcp → app → core + fs`), and the registry being pure core data is *precisely why* every other layer can consume it without importing upward:

  | Concern | Layer | Why there |
  |---------|-------|-----------|
  | Kind registry (`slug, docTypes, scopeHint, promptFraming`) | **core** | pure static data, no IO — the definition of a core module |
  | `selectReportDocs` (read docs, apply filters, budget) | **app**, via **fs** repos | orchestration + IO |
  | `report` prompt (inject slice, frame synthesis) | **mcp** | agent surface |
  | `loom_create_report` (persist the file) | **app** → **fs** (reducer + repository) | the file-save lives here, not in core |
  | `loom report <kind>` command | **cli** | thin delivery |

  So: the registry is core (pure), the *saving* is app→fs, the *command* is cli. Those are separate pieces that **use** the registry; needing fs/cli doesn't pull the registry out of core — it's the normal spread of one feature across layers.
