---
type: plan
id: pl_01KX06HTCVST3REW77FHEDSWFB
title: "Combined loom:// surface catalog with ?kind= filter"
status: done
created: 2026-07-08
updated: 2026-07-08
version: 1
design_version: 1
tags: []
parent_id: de_01KX05QVG0ZQ343932H8E1C2S1
requires_load: []
target_version: 0.1.0
steps:
  - id: whole-surface-catalog-builder
    order: 1
    status: done
    description: "Generalize catalog.ts from tool-only to whole-surface: add pure buildResourceCatalog(concrete, templates) (Concrete / Templated subsections) and buildPromptCatalog(prompts) (name + description + per-arg lines) renderers; add buildCatalog({tools,concrete,templates,prompts}, kind?) composing the requested section(s) under a 'Loom MCP surface' header (omit kind = all three); change the cache from a single block to a { all, tools, resources, prompts } variant map (registerCatalog / getCatalogBlock(kind?))."
    files_touched: [packages/mcp/src/catalog.ts]
    blocked_by: []
    satisfies: []
  - id: server-wiring-kind-parsing
    order: 2
    status: done
    description: "Wire the registry into the builder and parse the filter in server.ts: at construction pass CONCRETE_RESOURCES, RESOURCE_TEMPLATES, PROMPTS alongside TOOLS into buildCatalog and register all four variants; in the ReadResource handler match loom://catalog and loom://catalog?kind=, parse kind like state?shape=, throw on an invalid kind listing the valid set, and return the matching variant; update the loom://catalog entry in CONCRETE_RESOURCES (name → 'MCP Surface Catalog', description → covers tools+resources+prompts and documents ?kind=)."
    files_touched: [packages/mcp/src/server.ts]
    blocked_by: [whole-surface-catalog-builder]
    satisfies: []
  - id: loom-catalog-kind-drop-resources-list
    order: 3
    status: done
    description: "CLI: add optional positional `loom catalog [kind]` (validate kind at the CLI edge, read loom://catalog or loom://catalog?kind=<kind>); remove the `loom resources` LIST command and its wiring while keeping `loom resources read <uri>` as the generic resource reader."
    files_touched: [packages/cli/src/commands/catalog.ts, packages/cli/src/commands/resources.ts, packages/cli/src/index.ts]
    blocked_by: [server-wiring-kind-parsing]
    satisfies: []
  - id: doc-sweep-mcp-reference-session-start
    order: 4
    status: done
    description: "Doc sweep for the MCP-surface change: rewrite mcp-reference.md §1 to point at loom://catalog as the live authoritative source (keep narrative, drop the duplicated resource/prompt list); update session-start wording 'tool index' → 'surface index (tools + resources + prompts)' in CLAUDE.md step 3, the LOOM_CLAUDE_MD template in installWorkspace.ts, and loom/ctx.md's catalog mention. (CLAUDE.md/refs/installWorkspace via normal Edit; ctx.md via MCP.)"
    files_touched: [loom/refs/mcp-reference.md, CLAUDE.md, packages/app/src/installWorkspace.ts, loom/ctx.md]
    blocked_by: [server-wiring-kind-parsing]
    satisfies: []
  - id: surface-catalog-test
    order: 5
    status: done
    description: "Add tests/catalog-surface.test.ts (dist-importing, tests/ style): assert the default catalog contains Tools, Resources (Concrete + Templated), and Prompts sections and names a known template (loom://context/{docUlid}) and prompt (do-next-step); assert ?kind=resources / ?kind=prompts / ?kind=tools each return only their section; assert an invalid kind throws with the valid set. Add a run_test line to scripts/test-all.sh."
    files_touched: [tests/catalog-surface.test.ts, scripts/test-all.sh]
    blocked_by: [server-wiring-kind-parsing]
    satisfies: []
---
# Combined loom:// surface catalog with ?kind= filter

## Goal

Turn loom://catalog from a tools-only index into a live, drift-free catalog of the whole MCP surface — tools, resources, and prompts — generated from the server's own registry arrays, with a ?kind={tools|resources|prompts} filter on the resource and a CLI passthrough. Fold the superseded `loom resources` list command into `loom catalog resources`, and point mcp-reference.md §1 at the live catalog instead of a hand-maintained duplicate. Resources render in two subsections (Concrete / Templated) mirroring the server's CONCRETE_RESOURCES vs RESOURCE_TEMPLATES split.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Generalize catalog.ts from tool-only to whole-surface: add pure buildResourceCatalog(concrete, templates) (Concrete / Templated subsections) and buildPromptCatalog(prompts) (name + description + per-arg lines) renderers; add buildCatalog({tools,concrete,templates,prompts}, kind?) composing the requested section(s) under a 'Loom MCP surface' header (omit kind = all three); change the cache from a single block to a { all, tools, resources, prompts } variant map (registerCatalog / getCatalogBlock(kind?)). | packages/mcp/src/catalog.ts | — | — |
| ✅ | 2 | Wire the registry into the builder and parse the filter in server.ts: at construction pass CONCRETE_RESOURCES, RESOURCE_TEMPLATES, PROMPTS alongside TOOLS into buildCatalog and register all four variants; in the ReadResource handler match loom://catalog and loom://catalog?kind=, parse kind like state?shape=, throw on an invalid kind listing the valid set, and return the matching variant; update the loom://catalog entry in CONCRETE_RESOURCES (name → 'MCP Surface Catalog', description → covers tools+resources+prompts and documents ?kind=). | packages/mcp/src/server.ts | whole-surface-catalog-builder | — |
| ✅ | 3 | CLI: add optional positional `loom catalog [kind]` (validate kind at the CLI edge, read loom://catalog or loom://catalog?kind=<kind>); remove the `loom resources` LIST command and its wiring while keeping `loom resources read <uri>` as the generic resource reader. | packages/cli/src/commands/catalog.ts, packages/cli/src/commands/resources.ts, packages/cli/src/index.ts | server-wiring-kind-parsing | — |
| ✅ | 4 | Doc sweep for the MCP-surface change: rewrite mcp-reference.md §1 to point at loom://catalog as the live authoritative source (keep narrative, drop the duplicated resource/prompt list); update session-start wording 'tool index' → 'surface index (tools + resources + prompts)' in CLAUDE.md step 3, the LOOM_CLAUDE_MD template in installWorkspace.ts, and loom/ctx.md's catalog mention. (CLAUDE.md/refs/installWorkspace via normal Edit; ctx.md via MCP.) | loom/refs/mcp-reference.md, CLAUDE.md, packages/app/src/installWorkspace.ts, loom/ctx.md | server-wiring-kind-parsing | — |
| ✅ | 5 | Add tests/catalog-surface.test.ts (dist-importing, tests/ style): assert the default catalog contains Tools, Resources (Concrete + Templated), and Prompts sections and names a known template (loom://context/{docUlid}) and prompt (do-next-step); assert ?kind=resources / ?kind=prompts / ?kind=tools each return only their section; assert an invalid kind throws with the valid set. Add a run_test line to scripts/test-all.sh. | tests/catalog-surface.test.ts, scripts/test-all.sh | server-wiring-kind-parsing | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
