---
type: plan
id: pl_01KTJ1EFY7SJAQ1XK4A956R5GS
title: "Phase A — auto-generated tool catalog + loom://catalog resource"
status: done
created: "2026-06-07T00:00:00.000Z"
updated: 2026-06-07
version: 2
design_version: 1
tags: []
parent_id: de_01KTJ128Q435GJRJQTDR20B8WJ
requires_load: []
target_version: 0.1.0
---
# Phase A — auto-generated tool catalog + loom://catalog resource

## Goal

Ship the **discovery** win from the design via **surface C** (settled with Rafa): a grouped, one-line-per-tool catalog generated from the live `toolDef` registry (so it cannot drift), exposed as a dedicated **`loom://catalog` resource** the agent is told — by a session-start CLAUDE.md rule — to read **before** `ToolSearch`-ing for any `loom_*` tool. The agent consults a *named thing*, sees the exact name, and goes straight to `ToolSearch select:<name>` instead of fuzzy keyword flailing. **Zero API change** to existing tools; the per-first-use schema fetch is unchanged and the catalog's header says so ("name targeting, not round-trip elimination").

**Decisions locked (design §1/§2):**
- Grouping metadata = an optional `group` field on each `toolDef` (authoritative, co-located).
- Delivery surface = **C — a dedicated `loom://catalog` resource + a CLAUDE.md "read it first" rule** (read once, token-leaner, gives an explicit consult-before-search guarantee). The shared `buildToolCatalog` producer keeps surface A — auto-injecting into the context bundle — a trivial later add if ever wanted; not in this plan.

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | mcp — add optional `group?: string` to the tool-def shape and tag every tool's `toolDef` with a group (create / refine / generate / plan-steps / req / chat / query / doc-edit). Update the `makeTool` helper in generate.ts to carry `group`. Metadata only — no behavior change. | packages/mcp/src/tools/*.ts, packages/mcp/src/tools/generate.ts | — | — |
| ✅ | 2 | mcp — new pure `buildToolCatalog(defs): string` in packages/mcp/src/catalog.ts. Groups defs by `group` (unset → "Other" bucket, degrades gracefully); emits a grouped markdown block, one line per tool: `loom_x — <first sentence of description>`, exact names so the agent can `ToolSearch select:`. Leads with an honest header: "name pointers — you still `ToolSearch select:<name>` once per tool to load its schema." Plus a `registerToolCatalog`/`getToolCatalogBlock` module cache (built once per server). | packages/mcp/src/catalog.ts | 1 | — |
| ✅ | 3 | mcp — expose `loom://catalog` as a concrete resource. Add it to `CONCRETE_RESOURCES`; in `createLoomMcpServer`, after building `TOOLS`, `registerToolCatalog(buildToolCatalog(TOOLS.map(t => t.toolDef)))`; dispatch `loom://catalog` in the `ReadResourceRequest` handler to return `getToolCatalogBlock()` (text/markdown). | packages/mcp/src/server.ts | 2 | — |
| ✅ | 4 | docs — add the session-start "read the catalog first" rule to BOTH CLAUDE.md surfaces (sync contract): the installed `.loom/CLAUDE.md` template (`LOOM_CLAUDE_MD` in installWorkspace.ts) and repo-root `CLAUDE.md`. Rule: "Before `ToolSearch`-ing for a `loom_*` tool, read `loom://catalog` and go straight to `ToolSearch select:<exact name>`." Also list `loom://catalog` in the template's resource/entry-points table. | packages/app/src/installWorkspace.ts, CLAUDE.md | 3 | — |
| ✅ | 5 | tests + build + smoke. Unit: `buildToolCatalog` groups by `group`, unset→Other, one line/tool, honest header present, exact tool names. Integration: reading `loom://catalog` returns the grouped block; `loom://catalog` appears in the resources list. Run build-all + test-all green. Smoke: read `loom://catalog`, confirm grouped tool names + honest header render once. | packages/mcp/tests/integration.test.ts | 4 | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

### Notes

- **No req in this thread** → every `Satisfies` cell is `—` (the structural coverage check is a no-op here; expected, not a gap).
- **Surface C chosen over A** (riding the context bundle): read once instead of re-sent on every context read, and it gives the agent an explicit *consult-before-search* instruction rather than a passive in-context block. `buildToolCatalog` is surface-agnostic, so A remains a cheap future add.
- **Token cost:** one compact grouped block (~45 short lines), fetched only when the agent reads `loom://catalog`.
- **Out of scope (Phase B):** consolidating the create/refine/generate families into typed `loom_create(type)` etc. — gated on this landing and Rafa's call on the schema-precision trade-off.