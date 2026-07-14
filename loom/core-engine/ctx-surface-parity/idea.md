---
type: idea
id: id_01KXC5B8CFZJANSMRTSCGEFP8K
title: ctx scope & surface parity
status: done
created: 2026-07-12
updated: 2026-07-14
version: 2
tags: []
parent_id: null
requires_load: []
---
# ctx scope & surface parity

## Decision (settled)

**ctx is global-only.** Weave-level ctx is retired — `loom_refresh_ctx`'s `scope: "weave"` path is removed, and there is one `loom/ctx.md` per project. The original A/B fork (global-only vs full weave-ctx support) resolves as **A-plus**: global-only, but with the visibility, freshness signal, and tri-surface parity option B wanted — applied to the single global doc instead of a per-weave layer.

Why weave ctx is killed: it would be a third *summary* layer between global ctx and thread context, and the "load only the subsystem you need at scale" job it promised is already done by the parent chain (idea/design/plan, loaded on demand) plus citation-loaded refs. It adds redundancy, maintenance, and a level the user must model — with no unique job. Full reasoning: `chat-001`.

## The information model (no duplication across levels)

Each level has one distinct job; none is a redundant summary of another:

- **CLAUDE.md / CLAUDE-LOCAL.md** — rules & workflow contract (*how to behave*).
- **loom/ctx.md** — architecture / API / stack (*what the project is*); links refs and says when to load each. Always loaded.
- **loom/refs/** — deep detail, citation-loaded via `requires_load`.
- **thread context** (idea / design / plan) — the working detail, parent-chain-loaded on demand.

A consequence: our own `loom/ctx.md` currently duplicates CLAUDE.md (a "Rules" section, concept/glossary restatement). Bringing it onto the pillar template drops that duplication — architecture/API only.

## What ships

- **Pillar template** — a default, customizable section schema for ctx.md (Architecture · API & contracts · Stack · Build/Test/CI · Documentation map · AI collaboration). Generate-on-first-refresh fills it; if `ctx.md` already exists, its own sections are preserved and re-poured; a seed-skeleton-only mode drops just the headings for the user to edit before generating.
- **No automatic staleness** — a hash- or inference-based stale signal for global ctx is either untrustworthy or off-spine (auto-firing inference). Refresh is always available; the doc shows "last refreshed: {date}" as an honest recency signal. The user decides when to refresh.
- **Tri-surface parity** — the trigger for reopening this thread. ctx (re)generation reachable and consistent across MCP (`loom_refresh_ctx`, global-only), CLI (`loom refresh-ctx`, `--skeleton`), and the extension (a `loom/ctx.md` node with Refresh + last-refreshed date).
- **Docs + reports alignment** — refs / CLAUDE.md and the doc-graph-reports oversized-ctx suggestion updated to global-only.

## Explicitly parked (not in this thread)

- **Auto-fire ctx refresh inference at plan-finish** — nice-to-have, spun to its own thread `core-engine/ctx-auto-refresh-inference`. Off-spine today (AI acting unprompted, token cost).
- **AI auto-classifying threads into weaves** — invasive, off-vision.

## Success criteria

- ctx scope decided (global-only) and reflected identically in the tool, CLI, extension, refs / CLAUDE.md, and the reports engine.
- The extension displays global ctx with a Refresh action and last-refreshed date.
- CLI ⇄ MCP parity for ctx (re)generation closed by a `loom refresh-ctx` mirror.
- Our own `loom/ctx.md` refactored onto the pillar template, free of CLAUDE.md duplication.

## Origin

`doc-graph-reports/chat-004` → this thread's `chat-001`. Surfaced while wiring the reports oversized-ctx suggestion; Rafa found `loom_refresh_ctx` still offered weave scope while the extension showed no ctx and there was no CLI mirror.