---
type: design
id: de_01KTJ128Q435GJRJQTDR20B8WJ
title: "MCP Tool Surface — phased: catalog + global injection first, measured consolidation second"
status: done
created: "2026-06-07T00:00:00.000Z"
updated: 2026-06-07
version: 4
tags: []
parent_id: id_01KTJ110FHDK116G0NJN77FQVS
requires_load: []
---
# MCP Tool Surface — phased: catalog + global injection first, measured consolidation second

**Vision tie:** removes the AI-internal overhead (wrong-tool picks, repeated `ToolSearch` flailing, schema-fetch round-trips) the agent pays on every Loom action — making agent actions cheaper and more accurate. Internal-surface efficiency, not a new user feature.

## Decision summary

Ship in **two phases**, low-risk first:

- **Phase A — auto-generated catalog + `loom://catalog` resource (the discovery win). ✅ SHIPPED in v1.1.0.** A pure producer reads the live `toolDef` registry and emits a grouped, one-line-per-tool catalog; it is exposed as a dedicated **`loom://catalog` resource** the agent is told (session-start CLAUDE.md rule) to read **before** `ToolSearch`-ing for any `loom_*` tool. Zero API change, cannot drift (registry is source of truth). Fixes *discovery*, not the per-first-use schema fetch — documented as such.
- **Phase B — measured consolidation (the fetch-count win). ⏸ DEFERRED (see §3).** Would collapse the create/refine/generate families into typed tools, but trades schema precision for fewer tools and is a wide refactor. Phase A is expected to relieve the discovery pain enough that B isn't warranted; revisit only if evidence says otherwise.

Phase A is independently valuable and landed standalone.

---

## §1 — Catalog producer (Phase A)

**Source of truth = the `toolDef` objects already in `packages/mcp/src/server.ts`'s `TOOLS` array** (each is `{ name, description, inputSchema }`). A pure function `buildToolCatalog(tools): string` emits grouped markdown:

```
## Loom MCP tools (auto-generated from the live registry — do not hand-edit)
> Name pointers. You still `ToolSearch select:<name>` once per tool to load its schema.
### Create        loom_create_idea · loom_create_design · loom_create_plan · …
### Refine        loom_refine_idea · loom_refine_design · loom_refine_plan · …
### Plan / steps  loom_start_plan · loom_do_step · loom_complete_step · loom_close_plan
### Requirements  loom_finalize_req · loom_verify_req · …
### Query / state loom_find_doc · loom_search_docs · loom_get_stale_plans · …
- loom_create_plan — Create a new plan document in a thread. (first sentence of description)
```

**Grouping metadata — DECIDED, with an implementation refinement.** The design called for an optional `group` field on `toolDef`; in implementation the group is assigned **at the registry** (`server.ts`, where each tool is already listed) rather than scattered across ~34 tool files. Same authoritative "one place, can't drift" property, far less churn, and `group` stays a **sibling of `toolDef`** so it is never sent over the wire in `ListTools`. Tools without a group fall to an "Other" bucket (degrades gracefully).

Each catalog line carries the **exact tool name** so the agent can go straight to `ToolSearch select:<name>` — one targeted fetch, no keyword search.

## §2 — Delivery surface (Phase A) — DECIDED: C, a dedicated `loom://catalog` resource

The catalog is generated **in-memory at server start** from the live registry — never written to disk (a stored `.md` drifts and needs re-generating). The choice was *where the agent meets it*:

| Option | Drift | How/when the agent gets it | Verdict |
|---|---|---|---|
| A. Runtime — prepend to the `loom://context/…` bundle (via `serializeBundle`, fed by mcp; `assembleContext` can't take it — it's `app`/pure and may not import mcp) | none | passively, on every context read; re-sent each time | **Deferred** — trivial later add (shares the §1 producer) |
| B. Bake into installed `.loom/CLAUDE.md` template | drifts on every tool change | session start | rejected — drift is the whole thing we avoid |
| **C. Dedicated `loom://catalog` resource + session-start CLAUDE.md rule to read it before any tool search** | none | **once, deliberately, before `ToolSearch`** | **CHOSEN** |

**Why C (settled with Rafa):** it directly realizes the "read it before searching" intent, is token-leaner (read once, not re-sent on every context pull), and gives the agent a *named thing* to consult. The session-start rule lands in **both** CLAUDE.md surfaces (sync contract): *"Before `ToolSearch`-ing for a `loom_*` tool, read `loom://catalog` and go straight to `ToolSearch select:<exact name>`."* The catalog's own header repeats the honest framing. Because C is a standalone resource, **no `assembleContext`/`serializeBundle` change is needed** — the layering wrinkle that A carried disappears.

## §3 — Measured consolidation (Phase B) — ⏸ DEFERRED

**Decision (settled with Rafa): do not build Phase B now.** Phase A attacks *discovery*, the frequent pain; Phase B would only reduce the *number of distinct schema fetches*, and pays for it with fuzzier union schemas and a wide rename. Building it speculatively is the "build in the dark" trap. **Revisit only if, after living with `loom://catalog`, the per-tool schema fetch is still a measured cost.**

For the record, the trade-off if it is ever revisited — collapsing `loom_create_idea/design/plan/req/reference/chat` → `loom_create(type, …)` (and likewise refine/generate) turns ~18 tools into ~3, but:
- **Cost 1 — schema precision.** Per-type tools have sharp required-field schemas; a union `loom_create(type)` must accept a superset and validate per-type at runtime — fuzzier guidance, more validation.
- **Cost 2 — wide rename.** Names are referenced in every extension launch prompt, the MCP integration tests, `do-next-step`/promote flows, and CLAUDE.md.
- **Benefit.** Fewer distinct first-use fetches (3 create-fetches → 1), and a smaller name list (which Phase A already softens).
- **Scope if revived:** families only (create/refine/generate); leave step/plan/chat/query tools as-is.

## §4 — Surface area

- **Phase A (shipped):** `packages/mcp` (catalog producer + registry grouping + `loom://catalog` resource), `packages/app` (CLAUDE.md template rule in `installWorkspace.ts`), repo-root `CLAUDE.md`, tests. **No `app` context-pipeline change, no extension change.**
- **Phase B (deferred):** would touch `packages/mcp` (typed tools; delete per-type ones), every `packages/vscode/src/commands/*.ts` launch prompt, MCP integration tests, both CLAUDE.md surfaces.

## Decisions log

| # | Question | Status |
|---|----------|--------|
| §0 | Phasing | **Decided:** A shipped (v1.1.0); B deferred |
| §1 | Catalog source | **Decided:** generated from live `toolDef` registry — no hand-maintained list |
| §1 | Grouping metadata | **Decided:** assigned at the registry (sibling of `toolDef`, Other-bucket fallback) |
| §2 | Delivery surface | **Decided: C** — dedicated `loom://catalog` resource + session-start CLAUDE.md rule; A deferred as a cheap later add |
| §3 | Consolidation (Phase B) | **Deferred** — not needed unless Phase A proves insufficient |

## Status

**Phase A done and shipped in v1.1.0.** Phase B deferred. Nothing open — thread complete unless a future need reopens §3.