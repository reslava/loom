---
type: idea
id: id_01KSYE3WFEGBZ39SB9XDMX7X99
title: Consolidate ctx generators into one (global + weave)
status: draft
created: "2026-05-31T00:00:00.000Z"
updated: 2026-05-31
version: 2
tags: []
parent_id: null
requires_load: []
---
# Consolidate ctx generators into one (global + weave)

## The problem

There are **three** ctx-generation tools, redundant and inconsistent — a follow-up surfaced by the `ctx-load` thread (see `core-engine/ctx-load`, chat-001):

| Tool | Scope | Inference path | Notes |
|---|---|---|---|
| `loom_generate_global_ctx` | global | MCP sampling | sources `loom://state`; writes `loom/ctx.md` |
| `loom_summarise` | weave | app `AIClient.complete` | sources design+ideas+plans+dones; `source_version` idempotency; writes `loom/{weave}/ctx.md` |
| `loom_refresh_ctx` | weave | MCP sampling | sources `loom://state`; writes `loom/{weave}/ctx.md` |

Two tools generate weave ctx via different inference paths with **incompatible frontmatter** (parent_id, versioning, source_version). None work in a Claude Code CLI session: sampling returns `MethodNotFound`, and `AIClient` needs a key the CLI doesn't use.

## Goal

**One** ctx (re)generation entry point covering global + weave (thread scope has no ctx — see [ctx-load]), with one sourcing model, one frontmatter template, and a story that works in *both* the VS Code extension and a Claude Code CLI session. Remove the other two tools (clean break, no aliases).

## Open decisions (to land in design)

- **D1 — Inference path (crux).** (a) server-side inside the tool (sampling/AIClient — forks on host, dead in CLI); (b) **no server-side inference — the tool assembles the scope's source + ensures the ctx shell at the canonical path; the agent writes the body via `loom_update_doc`** (uniform, agent-agnostic, removes the fork — *lean*); (c) hybrid (two paths).
- **D2 — Tool surface.** `loom_refresh_ctx(scope: 'global' | 'weave', weaveId?)`; remove `loom_summarise` + `loom_generate_global_ctx`.
- **D3 — Source per scope.** Global → workspace state; weave → design+ideas+plans+dones. Reuse the context pipeline (`assembleContext`) or a dedicated summariser input?
- **D4 — Idempotency.** Keep "skip unless source changed or `force=true`". Weave source-version = primary design version. Open: the *global* source signal (state hash / newest doc timestamp).
- **D5 — Frontmatter template.** Resolve today's parent_id + version (increment vs reset) + source_version inconsistencies into one template. id stays `loom-ctx` / `{weave}-ctx`.
- **D6 — Layering.** Single use-case in `packages/app` (`(scope, ids, deps) → result`); MCP tool a thin wrapper; inference injected via `deps`. Matches `mcp → app → core+fs`.
- **D7 — CLI create gap.** No `loom_create_ctx` exists. If D1=(b), decide how the ctx shell is created so the agent can `loom_update_doc` it (new `loom_create_ctx`, or `refresh_ctx` ensures the shell).

## Vision link

Serves the `{generate} ctx` loop element — one coherent way to (re)generate context summaries. Removes the current broken state where three divergent buttons write ctx differently (two to locations nothing loads) and the manual "which tool, will it land where the loader reads?" guesswork.

## Coordination

- **`core-engine/ctx-load`** — shipped the global+weave-only, flat `ctx.md` loading + status + writer-path fixes; this thread is its named follow-up.
- **`core-engine/global-ctx`** — likely **subsumed** (global ctx generation rolls into the unified tool); confirm in design.
- **`core-engine/ctx-naming`** — the flat `ctx.md` / stable-id convention this conforms to (done).

## Out of scope

- ctx *loading* / status / assembler (done in ctx-load).
- Token budgeting (Phase 5).
- Thread ctx (rejected — ctx-load design §6).