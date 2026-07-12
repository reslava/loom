---
type: report
id: rp_01KXB088MEHJB63GKXE47WCDTQ
title: "Loom — Project Overview (2026-07-12)"
status: active
created: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
kind: project-overview
generated_at: "2026-07-12T11:08:59.407Z"
---
# Loom — Project Overview

*Synthesized from the derived roadmap (`loom://roadmap`), 2026-07-12. Current release: **v1.23.0**.*

## Summary

Loom is a **document-driven, AI-assisted software-development workflow system**, organized as **weaves** (project areas) → **threads** (workstreams) → **plans** (implementation steps), delivered across a **CLI**, an **MCP agent surface**, and a **VS Code extension**. From its first release (**v0.1.0**, 2026-04-14) it has shipped roughly **130 plans** to reach **v1.23.0** in under three months, passing a **v1.0.0** milestone on 2026-06-06. The roadmap is internally clean — **zero diagnostics** (no dependency cycles, dangling deps, or missing thread manifests). Active focus is shifting from internal engine/agent tooling toward **demo, tutorial, and validation** surfaces.

## What Loom is (inferred from the work)

The thread history describes a system whose building blocks are a **core engine** (domain reducers, state, ULID identity, frontmatter, staleness, derived roadmap, requirements), an **AI/MCP integration** (agent tools, context pipeline, prompts, tool catalog, slang), a **CLI**, a **VS Code extension**, and **release automation**. The recurring investment — context injection, a canonical doc graph, requirements-driven development, staleness propagation — points to the goal: **make markdown documents the durable, machine-readable shared memory for human + AI development.**

## Major areas of work (weaves)

- **core-engine** — the largest area: domain model & reducers, ULID identity, frontmatter serializer, date handling, the staleness model, the derived roadmap, requirements-driven development, ctx.
- **ai-integration** — the MCP agent surface: context pipeline, tool catalog, the slang protocol, the session-start contract, the quick-fix lane.
- **cli** — the `loom` command: CLI ⇄ MCP ⇄ extension parity, Slug/Ulid naming, bundle-first server delivery.
- **vscode-extension** — the human surface: MCP refactor, tree / staleness / blocked-step visualization, roadmap, demo deliverables.
- **app** — the use-case orchestration layer (naming alignment, install).
- **release-automation** — synchronized versioning, the release pipeline, publishing.
- **validation** — opt-in telemetry + in-tool user feedback (the "is anyone using this?" instruments).
- **multi-workspace / mvp** — multi-loom workspace support and the MVP / tutorial onboarding path.

## What has shipped (history)

- **v0.1.0 → v0.8.0 (Apr–early Jun):** foundations — core engine, filesystem load/save, CLI, multi-workspace, the MCP server, the context pipeline, ctx, staleness surfacing, agent doc-DX.
- **v1.0.0 (2026-06-06) — major milestone:** ULID identity migration, the `weaves/ → loom/` directory restructure, chat frontmatter, requirements-driven development, install.
- **v1.1.0 – v1.15.0:** plan-steps-in-frontmatter, the auto-generated tool catalog, CLI command tiers, canonical date handling, the core-purity guard, `actual_release` wiring, the derived roadmap, the directional staleness model, and the unambiguous-naming / canonical-ULID refactor.
- **v1.16.0 – v1.23.0 (most recent):** opt-in telemetry + in-tool feedback (validation), bundle-first server delivery, Slug/Ulid surface sweeps across app / MCP / CLI, CLI management-command parity, the **slang protocol**, decision-history positioning, and the quick-fix lane.

## In progress and planned next (priority order)

**Implementing now**
- **Loom Demo Deliverables** — `vscode-extension/vscode-demo` (highest-priority active work).

**Active**
- **Token Consumption Awareness** — `ai-integration`
- **Context Dispatcher Sidebar** (surface the loaded-context ledger) — `ai-integration`
- **Tutorial** — `mvp`

**Pending (next up, by priority)**
1. Validate cross-plan `pl_` blockedBy refs at write time — `core-engine`
2. Resolve telemetry consent from a shared source — `ai-integration`
3. Clean legacy-read — drop dual-read + rename `weave.looseFibers` — `core-engine`
4. Single table-driven layer-imports guard — `core-engine`

## Risks, gaps & observations

- **No hard dependency graph.** Every roadmap node has empty `dependsOn` / `blockedOn` — sequencing is **priority-only**, not dependency-derived. Workable for a solo maintainer, but the roadmap can't warn about ordering hazards it was never told about.
- **Clean diagnostics.** No cycles, dangling deps, or missing thread manifests — the doc graph is internally consistent.
- **Heavy self-tooling vs. thin validation.** The overwhelming majority of shipped work is internal engine / agent / CLI / extension infrastructure; the **validation** weave (telemetry + feedback) is small and recent. The active pivot toward demo + tutorial + validation is the right correction if external adoption is the goal.
- **A consolidation phase is queuing up.** Several "cleanup / hardening" threads are pending (clean-legacy-read, layer-imports-guard, cross-plan-blocker-validation), suggesting the codebase is entering a stabilization pass after rapid feature growth.

## Provenance

- **Kind:** project-overview
- **Scope:** weaves: all; threads: all; from: —; to: —
- **Sources:** loom://roadmap
- **Generated:** 2026-07-12T11:08:59.407Z
