---
type: idea
id: id_01KWYVPSC8SC3VD4CW4RAN1XNH
title: "A live loom:// resource catalog (sibling of loom://catalog)"
status: done
created: 2026-07-07
updated: 2026-07-07
version: 2
tags: []
parent_id: null
requires_load: []
---
# A live loom:// resource catalog (sibling of loom://catalog)

## Problem

A human using Claude CLI can list MCP **tools** (`/mcp` → view tools) but **not resources**. The only human-readable map of the `loom://` resource surface is `loom/refs/mcp-reference.md` §1 — hand-maintained, so it drifts the moment a resource is added or its shape changes (exactly what happened with the context resource's naming).

There is a live, auto-generated index for tools — the `loom://catalog` resource (built from the tool registry via `buildToolCatalog`, so it never drifts). There is **no equivalent for resources or prompts**.

## What we want to build

A sibling of `loom://catalog`: an auto-generated **resource catalog** that enumerates the live resource surface from the registry (`CONCRETE_RESOURCES` + `RESOURCE_TEMPLATES` in `packages/mcp/src/server.ts`, and optionally `PROMPTS`), grouped with names, URI templates, params, and one-line purposes. Because it is generated from the same arrays the server actually serves, it can never drift.

Open shape questions (decide in design):
- **One catalog or two?** Extend `loom://catalog` to cover resources + prompts too (one read = whole surface), or add a distinct `loom://resource-catalog` so the tool index stays lean. Leaning: one combined catalog with a Resources / Prompts / Tools section, since the session-start protocol already reads `loom://catalog` once. **Prompts are firmly in scope** (decided): the surface has three kinds — tools, resources, prompts — and a human/agent needs a live window into all three, so the prompts catalog is folded in here, not left to drift in `mcp-reference.md`.
- **Format:** markdown (like the tool catalog) for human+agent readability.
- **Params rendering:** show each template's params with their post-`mcp-read-surface-naming` names (`{docUlid}`, `{weaveSlug}/{threadSlug}`, `?mode=`, `?loaded=`).

## Why it matters

Removes the one place a human currently has no live window into (resources), and kills the `mcp-reference.md` drift class at the source — the reference can then point at the live catalog as the authoritative list instead of re-typing it.

## Depends on / relates to

- Should land **after or with** `core-engine/mcp-read-surface-naming` so the catalog renders the corrected `*Slug`/`*Ulid` names, not the old `Id` ones.

## Success criteria

- One resource read returns the full, grouped `loom://` resource (and prompt) surface, generated from the live registry.
- `mcp-reference.md` §1 points to it as the live source rather than duplicating the list.
- Adding a resource to the server automatically appears in the catalog with no doc edit.