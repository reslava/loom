---
type: idea
id: id_01KTJ110FHDK116G0NJN77FQVS
title: MCP Tool Surface — Consolidation, Auto-Generated Catalog, Global Injection
status: done
created: "2026-06-07T00:00:00.000Z"
updated: 2026-06-07
version: 2
tags: []
parent_id: null
requires_load: []
---
# MCP Tool Surface — Consolidation, Auto-Generated Catalog, Global Injection

**Vision tie (honest):** This serves Loom's promise of a *reliable, low-friction AI collaboration surface*. It does not add a user-visible feature — it removes the **AI-internal overhead** the agent pays on every session: discovering which `loom_*` tool fits and fetching its deferred schema before first use. That overhead is wrong-tool picks, repeated `ToolSearch` keyword flailing, and a round-trip per first-use — all of which cost Rafa real money and latency on every Loom action. Cheaper, more accurate agent actions is the win.

## Problem

Claude Code (and other MCP hosts) **defer tool schemas** when a server exposes many tools. The agent sees only tool *names* in a system-reminder and must call `ToolSearch` to load a tool's parameter schema before it can invoke it. With **~45 `loom_*` tools** today, this imposes two distinct costs:

1. **Discovery** — *which* tool is right? With 45 names and overlapping families (`loom_create_idea` / `_design` / `_plan` / `_req` / `_reference` / `_chat`; the parallel `_refine_*` and `_generate_*` families), the agent guesses, sometimes wrong, and burns keyword searches narrowing it down.
2. **Schema fetch** — even knowing the exact name, the agent must `ToolSearch select:loom_x` once to load the schema before the first call. This round-trip is **structural** to the host's deferral; nothing on the server side removes it.

This surfaced from dogfooding (`requirements-driven-development-chat-003`, item 6): "each new `loom_*` tool costs a `ToolSearch` round-trip before first use."

## Goal — three parts (as scoped by Rafa)

1. **Consolidate** the tool surface — collapse the per-type tool families into typed tools (`loom_create(type, …)`, `loom_refine(type, …)`, `loom_generate(type, …)`) so there are *fewer distinct tools to discover and fetch*.
2. **Generate the catalog from the tool registry** — a build-time (or runtime) producer that reads the live `toolDef` objects (`{ name, description, inputSchema }` in `packages/mcp/src/server.ts`'s `TOOLS`) and emits a grouped, one-line-per-tool catalog. The registry is the single source of truth, so the catalog **cannot drift**.
3. **Inject the catalog to the AI globally** — make the generated catalog part of the always-loaded global context every Loom agent receives, so the agent is pointed straight at the right group/name without a discovery search.

## Honest worth-it assessment (the caveat to keep in the design)

- **Parts 2 + 3 (catalog + global injection): clear, low-risk win — but only on *discovery*.** Pointing the agent at the exact name turns a fuzzy multi-try keyword search into one targeted `ToolSearch select:`. It does **not** remove the per-first-use schema fetch. Frame it as "name targeting, not round-trip elimination" or it over-promises.
- **Part 1 (consolidation): the only lever that reduces the *number* of distinct fetches** — but it trades **schema precision for fewer tools** (a union `loom_create(type)` schema is fuzzier than six sharp per-type schemas, and the agent must pass `type`), and it is a **wide refactor**: tool names are referenced across launch prompts (`packages/vscode/src/commands/*.ts`), tests, and the extension. Net-positive only if done *measuredly* (collapse the obvious families, leave the rest).

The two levers are the same underlying idea attacked from two sides: **part 1 shrinks the API; parts 2–3 document it.** Doing 2–3 first de-risks and ships value immediately; 1 is the heavier, gated phase.

## Open questions (for the design)

- **How aggressive is consolidation?** Only the create/refine/generate families, or also state-query tools? Does the schema-precision loss outweigh the fetch-count win?
- **Where does grouping metadata live?** Add an optional `group` field to each `toolDef` (co-located, authoritative), or infer groups from name prefixes (no schema change, but heuristic)?
- **Where exactly does global injection happen?** Runtime injection into `assembleContext`'s global section (never drifts, MCP-host only), the installed `.loom/CLAUDE.md` template (drifts), or a new always-loaded `loom://catalog` resource? 
- **Catalog timing** — generated at build into a committed artifact, or assembled at runtime from the live registry on each context read?

## Status

Un-started. Opened from `requirements-driven-development-chat-003` (item 6) at Rafa's direction. Idea scoped to the three parts above; design to resolve the open questions before any implementation.