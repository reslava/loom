---
type: design
id: de_01KX05QVG0ZQ343932H8E1C2S1
title: "A live loom:// catalog of the whole MCP surface (tools + resources + prompts)"
status: done
created: 2026-07-08
version: 1
idea_version: 2
tags: []
parent_id: id_01KWYVPSC8SC3VD4CW4RAN1XNH
requires_load: []
---
# A live loom:// catalog of the whole MCP surface (tools + resources + prompts)

## Vision link

Serves the vision's "the AI becomes as **stateful as it can be** — via durable docs it rereads at every action" and "structured docs as the shared context, the workflow surface." Removes the manual step: a human/agent hand-reading `mcp-reference.md` §1 (which drifts) to learn what `loom://` resources and prompts exist. One live read replaces it.

## Decision summary (settled in chat-001)

1. **One combined `loom://catalog`** covering the whole MCP surface — Tools, Resources, Prompts — not a separate `loom://resource-catalog`. Session-start keeps its single catalog read.
2. **`?kind=` filter** on the resource: `loom://catalog?kind={tools|resources|prompts}`; omit = whole surface. Filter lives on the **resource** (agents benefit), CLI passes through.
3. **Fold the `loom resources` *list* command** into `loom catalog resources`. Keep `loom resources read <uri>` (the generic arbitrary-resource reader — orthogonal to a catalog).
4. Generated from the **live registry arrays** (`TOOLS`, `CONCRETE_RESOURCES`, `RESOURCE_TEMPLATES`, `PROMPTS`) — never drifts.

## Problem (grounded, narrowed)

- `loom://catalog` is auto-generated from the tool registry (`buildToolCatalog(TOOLS)` in `packages/mcp/src/catalog.ts:45`, wired at `server.ts:147`) — drift-free for **tools only**.
- There is **no live catalog for resources or prompts**. The `loom resources` CLI command (`packages/cli/src/commands/resources.ts`) calls `listResources()`, which returns **only `CONCRETE_RESOURCES`** — so the four **templated** resources (`loom://docs/{docUlid}`, `loom://context/{docUlid}`, `loom://plan/{planUlid}`, `loom://requires-load/{docUlid}`) and **all seven prompts** are invisible to it.
- The only grouped, param-annotated map of that surface is `loom/refs/mcp-reference.md` §1 — hand-maintained, so it drifts the moment a resource/prompt is added (exactly what happened during `mcp-read-surface-naming`).

The precise gap to close: **no drift-free, grouped index of templates + prompts.** (`mcp-read-surface-naming` is already `done`, so the `*Slug`/`*Ulid` names the catalog renders are already correct — not a blocker.)

## Design

### Registry shapes we render (verified)

- **Tools** — `GroupedTool { toolDef: { name, description }, group }`. Already rendered by `buildToolCatalog`.
- **Concrete resources** — `{ uri, name, description, mimeType }` (`server.ts:106`).
- **Resource templates** — `{ uriTemplate, name, description, mimeType }` (`server.ts:118`); params are the `{placeholder}` tokens already in `uriTemplate` (post-naming: `{docUlid}`, `{planUlid}`, `{weaveSlug}/{threadSlug}`).
- **Prompts** — each module exports `promptDef { name, description, arguments: [{ name, description, required }] }` (`server.ts:102` → the `prompts/*.ts` modules).

### `catalog.ts` — generalize the builder

Rename the concern from "tool catalog" to "surface catalog". Keep `buildToolCatalog` as the Tools-section renderer (unchanged output) and add two pure section renderers:

- `buildResourceCatalog(concrete, templates)` → a **Resources** section with two subsections: **Concrete** (`uri` — description) and **Templated** (`uriTemplate` — description; the template string already shows the params inline).
- `buildPromptCatalog(prompts)` → a **Prompts** section: `` `name` `` — description, followed by an indented arg line per argument (`name` (required) — description).

A top-level `buildCatalog({ tools, concrete, templates, prompts }, kind?)` composes the requested sections. `kind` selects one section; omitted → all three under a header changed from **"Loom MCP tools"** to **"Loom MCP surface"**, with a one-line note that this is the whole live surface.

Caching: today `registerToolCatalog`/`getToolCatalogBlock` cache the single rendered block at server construction. Since `?kind=` now varies output, either (a) pre-render all four variants (all + 3 kinds) into a small map at construction, or (b) cache the parts and compose per request. **Lean: (a)** — the registry is static for the server's life, four small strings, simplest and keeps the hot path a map lookup. Store `{ all, tools, resources, prompts }`.

### `server.ts` — build inputs + parse `?kind=`

- At construction, pass `CONCRETE_RESOURCES`, `RESOURCE_TEMPLATES`, `PROMPTS` into the catalog builder alongside `TOOLS` (all already in scope at `server.ts:131–147`).
- In the `ReadResourceRequestSchema` handler, match `uri === 'loom://catalog' || uri.startsWith('loom://catalog?')`. Parse `kind` from the query the same way `state?shape=` is parsed. Valid: `tools|resources|prompts` (or absent). **Invalid `kind` → throw** with the valid set listed (consistent, unambiguous — matches Loom's fail-loud style).
- Update the `loom://catalog` entry in `CONCRETE_RESOURCES` (`server.ts:113`): name → "MCP Surface Catalog", description → covers tools + resources + prompts and documents `?kind=`.

### CLI

- `loom catalog [kind]` — optional positional `kind` (`tools|resources|prompts`). Validate at the CLI edge; read `loom://catalog` or `loom://catalog?kind=<kind>` and print (`commands/catalog.ts` — thin passthrough, unchanged mechanism).
- **Remove the `loom resources` *list* command** (superseded). **Keep `loom resources read <uri>`** as the generic resource reader (it also lets a human read the catalog itself, and any templated resource). Update `index.ts` wiring accordingly.

### Docs to update in the same change (doc-sync / MCP-surface row)

- `loom/refs/mcp-reference.md` §1 — stop duplicating the resource/prompt list; point at `loom://catalog` as the live authoritative source, keep only narrative.
- Session-start protocol wording (`CLAUDE.md` step 3 + the `LOOM_CLAUDE_MD` template + `loom/ctx.md`'s catalog mention) — "tool index" → "surface index (tools + resources + prompts)". The single catalog read is unchanged, so no rule-marker churn beyond wording.

## Success criteria

- One read of `loom://catalog` returns the full grouped surface (tools + resources + prompts), generated from the live arrays.
- `loom://catalog?kind=resources` (and `tools`/`prompts`) returns just that section; invalid `kind` errors with the valid set.
- `loom catalog resources` works from a plain terminal; `loom resources` (list) is gone, `loom resources read <uri>` remains.
- Adding a resource/template/prompt to the server makes it appear in the catalog with **no doc edit**.
- `mcp-reference.md` §1 no longer duplicates the list.

## Open question for the plan (minor)

Resource **grouping granularity**: Concrete/Templated two-subsection split (proposed) vs. one flat resource list. Two-subsection reads better and matches the tool catalog's grouped style — will go with it unless you prefer flat.
