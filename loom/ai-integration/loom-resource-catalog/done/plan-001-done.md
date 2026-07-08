---
type: done
id: pl_01KX06HTCVST3REW77FHEDSWFB-done
title: "Done — Combined loom:// surface catalog with ?kind= filter"
status: done
created: 2026-07-08
version: 1
tags: []
parent_id: pl_01KX06HTCVST3REW77FHEDSWFB
requires_load: []
---
# Done — Combined loom:// surface catalog with ?kind= filter

## Step 1 — Generalize catalog.ts from tool-only to whole-surface: add pure buildResourceCatalog(concrete, templates) (Concrete / Templated subsections) and buildPromptCatalog(prompts) (name + description + per-arg lines) renderers; add buildCatalog({tools,concrete,templates,prompts}, kind?) composing the requested section(s) under a 'Loom MCP surface' header (omit kind = all three); change the cache from a single block to a { all, tools, resources, prompts } variant map (registerCatalog / getCatalogBlock(kind?)).

Generalized `packages/mcp/src/catalog.ts` from tool-only to whole-surface. `buildToolCatalog` kept **byte-identical** (its `## Loom MCP tools` header is asserted by existing tests) and now serves as the Tools section / `?kind=tools`. Added pure `buildResourceCatalog(concrete, templates)` (Concrete / Templated subsections, mirroring the server's two arrays) and `buildPromptCatalog(prompts)` (name + per-arg lines marked required/optional). `buildCatalog(input, kind?)` composes: a single `kind` returns one section, omitted returns all three under a new `# Loom MCP surface` header. `buildCatalogVariants` pre-renders `{ all, tools, resources, prompts }`; cache API renamed `registerToolCatalog/getToolCatalogBlock` → `registerCatalog/getCatalogBlock(kind?)`. Also added `coerceCatalogKind` (pure kind validation, extracted in step 5).

## Step 2 — Wire the registry into the builder and parse the filter in server.ts: at construction pass CONCRETE_RESOURCES, RESOURCE_TEMPLATES, PROMPTS alongside TOOLS into buildCatalog and register all four variants; in the ReadResource handler match loom://catalog and loom://catalog?kind=, parse kind like state?shape=, throw on an invalid kind listing the valid set, and return the matching variant; update the loom://catalog entry in CONCRETE_RESOURCES (name → 'MCP Surface Catalog', description → covers tools+resources+prompts and documents ?kind=).

Wired the registry into the builder in `packages/mcp/src/server.ts`: `registerCatalog(buildCatalogVariants({ tools: TOOLS, concrete: CONCRETE_RESOURCES, templates: RESOURCE_TEMPLATES, prompts: PROMPTS.map(p => p.promptDef) }))`. Resource handler now matches `loom://catalog` and `loom://catalog?...`, parses `?kind=` via a `parseCatalogKind` helper (mirrors the `state?shape=` URL-parse pattern) that delegates to `coerceCatalogKind` — invalid kind throws with the valid set. Updated the `loom://catalog` entry in `CONCRETE_RESOURCES` (name → 'MCP Surface Catalog', description covers tools+resources+prompts and documents `?kind=`).

## Step 3 — CLI: add optional positional `loom catalog [kind]` (validate kind at the CLI edge, read loom://catalog or loom://catalog?kind=<kind>); remove the `loom resources` LIST command and its wiring while keeping `loom resources read <uri>` as the generic resource reader.

CLI (`packages/cli/src/`): `catalog.ts` command now takes optional positional `[kind]`, validates it at the edge, and reads `loom://catalog` or `loom://catalog?kind=<kind>`. `index.ts`: `catalog [kind]` registered; the bare `loom resources` **list** command removed — `resources` is now just a parent namespace for `resources read <uri>`, which stays as the generic arbitrary-resource reader. Deleted the now-dead `resourcesListCommand` from `commands/resources.ts` (no legacy shim).

## Step 4 — Doc sweep for the MCP-surface change: rewrite mcp-reference.md §1 to point at loom://catalog as the live authoritative source (keep narrative, drop the duplicated resource/prompt list); update session-start wording 'tool index' → 'surface index (tools + resources + prompts)' in CLAUDE.md step 3, the LOOM_CLAUDE_MD template in installWorkspace.ts, and loom/ctx.md's catalog mention. (CLAUDE.md/refs/installWorkspace via normal Edit; ctx.md via MCP.)

Doc sweep (MCP-surface row of the doc-sync contract): `loom/refs/mcp-reference.md` §1 rewritten to say `loom://catalog` owns the live list for tools + resources + **prompts** alike (was 'resources and prompts have no catalog of their own') and documents `?kind=`; the resources table row updated. Session-start wording 'tool index' → 'surface index (tools + resources + prompts)' and the emit line 'tool index ready' → 'surface index ready' in `CLAUDE.md` step 3 and the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts` (kept in sync). `loom/ctx.md`'s catalog mention ('live tool list' → 'live surface list …') patched via `loom_patch_doc`. `claude-md-sync` test still green (no rule-marker/invariant-token change).

## Step 5 — Add tests/catalog-surface.test.ts (dist-importing, tests/ style): assert the default catalog contains Tools, Resources (Concrete + Templated), and Prompts sections and names a known template (loom://context/{docUlid}) and prompt (do-next-step); assert ?kind=resources / ?kind=prompts / ?kind=tools each return only their section; assert an invalid kind throws with the valid set. Add a run_test line to scripts/test-all.sh.

Added `tests/catalog-surface.test.ts` (dist-importing, tests/ style): asserts the combined catalog carries Tools + Resources (Concrete/Templated) + Prompts and names a known template + prompt + arg; each `?kind=` returns only its section; pre-rendered variants match on-demand renders; `coerceCatalogKind` passes valid kinds, returns undefined for absent, and throws with the valid set for an invalid one. Registered in `scripts/test-all.sh`. Updated `tests/commands.test.ts` — the old `loom resources` list assertion became `loom catalog resources`, plus new assertions that `loom catalog` lists a templated resource + a prompt. Verified: build-all clean, full `test-all` green (incl. mcp integration, cli-mcp-client, claude-md-sync), and live smoke of `loom catalog prompts` + invalid-kind error.
