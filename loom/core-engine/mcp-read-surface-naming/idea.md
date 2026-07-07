---
type: idea
id: id_01KWYT8BTZTGT9M6QDF6BDMQ0Z
title: Align the MCP read surface to the Slug/Ulid API contract
status: done
created: 2026-07-07
version: 1
tags: []
parent_id: null
requires_load: []
---
# Align the MCP read surface to the Slug/Ulid API contract

## Problem

`core-engine/api-contract-refactor` fixed the **write** surface: it renamed every `loom_*` tool param and app use-case input to `*Ulid` (ULID references) / `*Slug` (folder names), banned `*Id` as a reference suffix, and killed the `threadId`-means-slug data-corruption bug. But its audit was scoped, verbatim, to *"every `loom_*` tool and every app use-case."*

**Resources and prompts are neither a `loom_*` tool nor an app use-case**, so the audit never reached them. The MCP **read** surface still speaks the old `Id` dialect:

- Resource URI placeholders: `loom://context/{docId}`, `loom://context/thread/{weaveId}/{threadId}`, `loom://docs/{id}`, `loom://plan/{id}`.
- Prompt args: `weaveId`, `threadId`, `planId` (`do-next-step`, `continue-thread`, `refine-design`, `weave-*`).

This is **naming debt, not a data bug** — those path segments resolve against folder **slugs** and work correctly. But the whole rest of the API moved to `*Slug`/`*Ulid`, so the read surface is now the one place that contradicts the contract, which makes `mcp-reference.md` look stale and forces every reader (agent and human) to hold two dialects at once. It also caused a real doc bug: hand-written docs guessed `{threadUlid}` for the thread form (fixed 2026-07-07), which actually throws.

## Two ergonomic gaps on the same surface

1. **Slug-in.** A human points by path (`loom/{weave}/{thread}/…`), so context resources must accept **slug** addressing. The thread form already does (`loom://context/thread/{weaveSlug}/{threadSlug}`); confirm the doc form and prompts resolve slugs too.
2. **ULID-out (manifest enhancement).** The context bundle's manifest header currently carries only the anchor doc id (`<!-- loom:context-bundle target=id_… -->`). Thread-scoped **write** tools (`loom_quick_ship`, `loom_set_priority`, `loom_do_step`, …) need the thread `th_` ULID — which the bundle does not surface — so the agent must do a **second lookup** after loading context (observed live: had to read `thread.md` before `quick_ship`). Stamp the resolved `{weave_slug, thread_ulid}` (and anchor doc ULIDs) into the manifest so one read yields both the reasoning context and the write address. Mirrors how the VS Code extension already spreads `threadULID` across tree nodes — same idea, the CLI/MCP surface.

## What we want to build

One comprehensive breaking change (no back-compat shims — consistent with the original refactor; there are no external consumers of these placeholder names):

1. **Naming parity.** Rename resource URI placeholders and prompt args to `*Slug` / `*Ulid` per `loom/refs/api-naming-reference.md` — in **code** (`packages/mcp/src/server.ts` templates, prompt registrations, `resources/context.ts` and callers) **and docs** (`mcp-reference.md`, `CLAUDE.md`, `ctx.md`, the `LOOM_CLAUDE_MD` template). Weave stays `weaveSlug` (the documented no-ULID exception); a plan/doc/thread reference becomes `*Ulid`; a folder segment becomes `*Slug`.
2. **Slug-in.** Ensure every context resource accepts slug addressing for human-pointable loads.
3. **ULID-out.** Add `{weave_slug, thread_ulid}` (+ anchor doc ULIDs) to the context-bundle manifest header.

## Success criteria

- No MCP resource URI placeholder or prompt arg is named `*Id`; slugs are `*Slug`, ULID references are `*Ulid` — matching the write surface.
- `mcp-reference.md`, `CLAUDE.md`, `ctx.md`, and the template all agree with the code (doc-sync contract row 3 now lists `mcp-reference.md`).
- A human path pointer (`loom/{weave}/{thread}/…`) loads context in **one** call, and a following thread-scoped write needs **no extra lookup** (the manifest carries the thread ULID).
- The already-correct `loom://context/thread/{weaveSlug}/{threadSlug}` form is unchanged; `{docId}` → `{docUlid}` and prompt args update.

## Not this (scope guard)

- **Not** re-touching the write surface — it is already correct.
- **Not** giving weave a ULID — weave stays slug-only (the one deliberate exception, per the api-contract-refactor decision log D3).

## Open question — human visibility of resources

A human can list MCP **tools** in Claude CLI (`/mcp` → view tools) but **not resources**; the only map is `mcp-reference.md` (hand-maintained). Worth a companion: a live, auto-generated `loom://` resource catalog (a sibling of `loom://catalog`, which covers tools) so the resource list never drifts. Fold in here or spin a separate thread — decide during design.