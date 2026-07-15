---
type: idea
id: id_01KXFHF3C99QV8XJDJ8K4CZ1DX
title: Future-focused report — mine the graph's open material to propose next work
status: done
created: 2026-07-14
version: 1
tags: []
parent_id: null
requires_load: []
---
# Future-focused report — mine the graph's open material to propose next work

## What we want to build

A new **forward-looking report kind** in the doc-graph reports engine. Where today's report kinds are **retrospective** — they say *what happened* (`dones`/shipped, `decisions`, `drift-audit`, `release-notes`) — this kind is **prospective**: it mines the graph's *open* material and proposes **what to do next** — future ideas, improvements, and unfinished threads worth picking up.

Origin: `release-automation/release-notes-report/chat-001.md` — Rafa: *"I am thinking about a new kind of reports based on the doc graph history past but focusing in future, proposing future ideas, improvements."* Parked there as its own thread rather than folded into the release-notes work.

## Why it matters

- **Reports today only look backward.** The retrospective kinds turn history into narrative. But the graph also carries a rich, mostly-unread seam of *forward* signal — deferred questions, blocked work, stale docs, unpursued idea branches — that no one re-reads. A report that surfaces it turns the doc graph into a **backlog-proposer**, not just an archive.
- **Vision fit.** Serves *"the AI becomes as stateful as it can be — via durable docs it rereads"*: the graph already records every open thread of thought; this makes the AI actually *act* on that memory by proposing next moves. Removes the manual step of a human re-reading every idea's "Open questions" section to decide what to build next.
- **Project-agnostic.** Every Loom workspace accumulates the same open material — this is a generic reports-engine capability, not a Loom-repo feature.

## The forward seam (candidate inputs)

The graph fact-sources a prospective report could read, all already present:

- **Deferred "Open questions" sections** in idea/design docs (explicitly parked decisions).
- **Blocked steps** across implementing plans (`loom_get_blocked_steps`) and dependency-blocked threads (roadmap `blockedOn`).
- **Stale docs** (`staleEntries`) — specs that drifted and were never reconciled.
- **Pending / not-started threads** in roadmap `future` order (dependency + priority).
- **Unpursued idea branches** — ideas with no design, designs with no plan (intent that never advanced).

## Design stance (to settle in design — not decided here)

1. **New kind vs analytical mode.** Add a `next-work` / `foresight` kind to `REPORT_KINDS`, or a forward *mode* on an existing kind? Lean: a distinct kind — its selection (open material) is unlike any retrospective kind's `docTypes` scan.
2. **Selection: doc-type scan vs derived-signal passthrough.** The forward inputs are mostly **derived** (blocked steps, stale entries, roadmap future) rather than a flat doc-type set — closer to `project-overview`'s roadmap-passthrough than to `dones`' doc scan. Likely a new derived slice feeding `promptFraming`, not a `docTypes` list.
3. **Proposal vs invention guardrail.** The report must *propose from recorded open material*, never invent goals the docs don't support — the same "do not invent" discipline every kind carries, but sharper here because the output is generative (suggesting work).
4. **Actionability.** Does it just narrate the open material, or rank/cluster it into a proposed next-work list (e.g. "highest-leverage unblocked work")? The latter is the more useful — and the more opinionated — output.

## Success criteria

- A single report surfaces the project's open material (deferred questions, blocked/stale/unpursued work) and proposes concrete next moves, grounded in doc ids.
- Reuses the existing reports-engine plumbing (registry entry + `report` prompt + persisted `report` artifact) — no bespoke pipeline.
- Stays project-agnostic — runs on any Loom workspace.
- Every proposal cites the open material it derives from; invents nothing.

## Open questions (deferred, not blocking the idea)

- New kind vs mode (§1) and the exact selection slice (§2) — the core design calls.
- Whether the forward slice needs a new derived function (like `buildRoadmap`) or composes existing ones (`staleEntries` + `buildRoadmap.roadmap` + blocked-steps).
- Ranking model for "next work" (§4) — priority/dependency-driven, or leverage-scored.
