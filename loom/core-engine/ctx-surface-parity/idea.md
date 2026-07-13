---
type: idea
id: id_01KXC5B8CFZJANSMRTSCGEFP8K
title: ctx scope & surface parity
status: draft
created: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
---
# ctx scope & surface parity

## The discrepancies

`ctx` docs are AI-optimised scope summaries, auto-loaded by scope. Three surfaces disagree about what ctx *is*:

1. **Capability vs practice.** `loom_refresh_ctx` still accepts `scope: "weave"` → writes `loom/{weave}/ctx.md` (id `{weave}-ctx`). But in practice the project runs **global-only** — only `loom/ctx.md` exists; weave ctx was deliberately stopped being maintained. The tool advertises a capability the project treats as retired.
2. **Extension shows no ctx at all.** The VS Code tree does not display even the global `loom/ctx.md`, and almost certainly wouldn't show a weave ctx either. ctx — the always-loaded context that shapes every AI action — is invisible in the human surface.
3. **No CLI mirror.** There is no `loom refresh-ctx` (or equivalent) command mirroring `loom_refresh_ctx` — a tri-surface parity gap (MCP-only by accident, not by decision).

## Why it matters

- **Trust & consistency.** A tool that offers weave ctx while docs/practice say "global only" is a latent trap — the doc-graph reports engine's oversized-ctx suggestion (doc-graph-reports plan-006) nudges toward exactly this. Surfaces must agree.
- **Parity rule.** ctx (re)generation is a capability; per tri-surface parity it should be reachable — or deliberately *not* — consistently across CLI + extension + MCP, not MCP-only by accident.
- **Visibility.** The human should be able to see and (re)generate the context that governs every AI action.

## The decision to settle (the fork)

**Is weave-level ctx a supported feature, or is ctx global-only?**

- **(A) Global-only — retire weave ctx.** Remove `scope: "weave"` from `loom_refresh_ctx`; ctx is a single `loom/ctx.md`. Simplest; matches current practice; the reports (c) suggestion drops the weave-ctx nudge entirely. Cost: no per-weave summaries for large projects.
- **(B) Fully support weave ctx.** Keep the weave capability but make every surface honour it: the extension displays global + weave ctx (view + Refresh action), a CLI `loom refresh-ctx [--weave]` mirror, docs updated. Cost: reintroduces the weave-ctx maintenance/staleness surface repeatedly pushed back on.

No pre-decision — the point of the thread is to pick A or B. Whichever wins, **all three surfaces (MCP / CLI / extension) must end consistent**, and the reports (c) capability + plan-006's reworded suggestion must align with the outcome.

## Success criteria

- One decided answer to "ctx scope = global-only vs global+weave", reflected identically in the tool, the CLI, the extension, the refs/`CLAUDE.md` docs, and the reports engine.
- The extension displays ctx (at least global) with a Refresh action.
- CLI ⇄ MCP parity for ctx (re)generation resolved — a mirror command, or a documented single-surface exception.

## Origin

`doc-graph-reports/chat-004` — surfaced while wiring the reports oversized-ctx suggestion; Rafa found `loom_refresh_ctx` still offers weave scope while the extension shows no ctx and there is no CLI mirror.