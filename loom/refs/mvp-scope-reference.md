---
type: reference
id: rf_01KQYDFDDDYZC0R4XNNX2RASC9
title: mcp — Scope and Boundaries
status: active
created: "2026-05-05T00:00:00.000Z"
version: 1
tags: [mvp, scope, reference]
parent_id: null
requires_load: []
slug: mvp-scope-reference
---

# mcp — Scope and Boundaries

This is the canonical "what's in MVP, what isn't" reference. Plans that ship before MVP cite this via `requires_load: [mvp-scope]`. Archives with the MVP weave once Loom 1.0 ships.

## In MVP (must ship before publish)

These are the changes that make Loom *trustworthy* for a first user. Cheap to do, high impact on confidence.

| Area | What ships | Why now |
|------|-----------|---------|
| **Visibility** | All AI operations emit doc-loaded prefixes (`📡`, `📄`, `📘`, `🔧`, `⚠️`) — a CLAUDE.md rule, no code. | The user must always see what context the AI was given. Without this, Loom feels like a black box. |
| **Chat-reply context injection** | First reply in a thread loads idea + design + active plan automatically. CLAUDE.md rule. | Chats are the User↔AI surface. If the AI ignores the surrounding thread, chats stop being load-bearing. |
| **Stale-doc surfacing** | `staleDocs` count in `loom://summary`; stale entries in `loom://diagnostics`; `⚠` icon in tree view. | Existing `loom_get_stale_*` infra is invisible. Surfacing it turns passive detection into actionable signal. |
| **Two-CLAUDE.md sync** | Recursive `CLAUDE.md` and the `LOOM_CLAUDE_MD` install template carry the same rule set. Sync rule documented. | Drift between the two surfaces means inconsistent behavior between Loom-builds-Loom sessions and downstream user projects. |
| **Ctx filename unification** *(if scoped in)* | `loom/ctx.md`, `loom/{weave}/ctx.md`, `loom/{weave}/{thread}/ctx.md`. | Removes the `loom-loom-ctx` doubling and aligns global with weave/thread conventions. |

## Post-MVP (deliberately deferred)

Important polish, but not blocking publish. The MVP is functional without these.

| Area | What's deferred | Why deferred |
|------|----------------|--------------|
| **Staleness cascade automation** | Auto-bumping child stale flags on parent update; refine-propagation suggestions in UI. | The infrastructure (versions, `loom_get_stale_*`) is sufficient. Cascade UI is convenience over correctness. |
| **Block-on-stale** | Refusing to implement a plan when its design is stale. | Decided: warn, never block. Re-open if MVP feedback shows users miss the warning. |
| **Delta-only context injection** | "Skip re-reading thread context if already in transcript" optimization. | Premature optimization. Ship correctness first; layer the optimization once token cost is measured. |
| **Server-side session state** | Tracking `loadedContexts` / `contextDirty` in MCP. | Conflates AI and server responsibilities. The MCP server is stateless across calls and cannot see the LLM transcript. The decision lives in the AI as a CLAUDE.md rule. |
| **Rich `requires_load` UI** | IDE hints showing which docs `requires_load` will pull, fold-out reading. | Markdown-link form (`[doc-id](file://path)`) in visibility lines is also post-MVP. |

## Decision principles

When deciding "in or out for MVP":
1. **Trust beats polish.** A user who can't see what the AI loaded loses trust in everything else. Ship visibility before optimization.
2. **CLAUDE.md edits are nearly free.** Code changes have review surface; rule changes don't. Bias rule-only changes into MVP.
3. **Don't optimize unmeasured costs.** Token-saving features wait until token cost is a measured problem, not a theoretical one.
4. **Don't bypass MCP.** Any new state-mutating behavior goes through an MCP tool — even if it adds a step. Direct file edits in agent code are a smell.

## Out of scope (not "deferred", actually out)

- Multi-user collaboration features. Loom is single-user for the foreseeable future.
- A web UI. CLI + VS Code extension is the surface for 1.0.
- Non-markdown document storage. Markdown-as-database is the design, not a phase.
