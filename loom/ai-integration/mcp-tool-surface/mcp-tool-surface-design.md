---
type: design
id: de_01KTJ128Q435GJRJQTDR20B8WJ
title: "MCP Tool Surface — phased: catalog + global injection first, measured consolidation second"
status: draft
created: "2026-06-07T00:00:00.000Z"
updated: 2026-06-07
version: 2
tags: []
parent_id: id_01KTJ110FHDK116G0NJN77FQVS
requires_load: []
---
# MCP Tool Surface — phased: catalog + global injection first, measured consolidation second

**Vision tie:** removes the AI-internal overhead (wrong-tool picks, repeated `ToolSearch` flailing, schema-fetch round-trips) the agent pays on every Loom action — making agent actions cheaper and more accurate. Internal-surface efficiency, not a new user feature.

## Decision summary

Ship in **two phases**, low-risk first:

- **Phase A — auto-generated catalog + `loom://catalog` resource (the discovery win).** A pure producer reads the live `toolDef` registry and emits a grouped, one-line-per-tool catalog; it is exposed as a dedicated **`loom://catalog` resource** the agent is told (session-start CLAUDE.md rule) to read **before** `ToolSearch`-ing for any `loom_*` tool. Zero API change, cannot drift (registry is source of truth). Fixes *discovery*, not the per-first-use schema fetch — documented as such.
- **Phase B — measured consolidation (the fetch-count win).** Collapse the create/refine/generate **families only** into typed tools `loom_create(type,…)` / `loom_refine(type,…)` / `loom_generate(type,…)`. Reduces the number of distinct tools to discover and fetch, at the cost of fuzzier union schemas and a wide rename across launch prompts/tests/extension. Gated on Phase A landing and on Rafa's call on the central trade-off (§3).

Phase A is independently valuable and should land regardless of whether B is ever done.

---

## §1 — Catalog producer (Phase A)

**Source of truth = the `toolDef` objects already in `packages/mcp/src/server.ts`'s `TOOLS` array** (each is `{ name, description, inputSchema }`). A pure function `buildToolCatalog(tools): string` emits grouped markdown:

```
## Loom MCP tools (auto-generated — do not hand-edit)
> Name pointers. You still `ToolSearch select:<name>` once per tool to load its schema.
### Create        loom_create_idea · loom_create_design · loom_create_plan · …
### Refine        loom_refine_idea · loom_refine_design · loom_refine_plan · …
### Steps/Plan    loom_start_plan · loom_do_step · loom_complete_step · loom_close_plan
### Requirements  loom_create_req · loom_finalize_req · loom_verify_req · …
### Chat          loom_append_to_chat · loom_create_chat
### Query/State   loom_find_doc · loom_search_docs · loom_get_stale_plans · …
- loom_create_plan — Create a new plan document in a thread. (first sentence of description)
```

**Grouping metadata — DECIDED: an optional `group` field on `toolDef`** (authoritative, co-located with the tool, so adding a tool sets its group in one place and the catalog updates for free). Tools without `group` fall to an "Other" bucket (forces nothing, degrades gracefully). Rejected alternative: a producer-side name→group map (a second place that drifts from tool additions).

Each catalog line carries the **exact tool name** so the agent can go straight to `ToolSearch select:<name>` — one targeted fetch, no keyword search.

## §2 — Delivery surface (Phase A) — DECIDED: C, a dedicated `loom://catalog` resource

The catalog is generated **in-memory at server start** from the live registry — never written to disk (a stored `.md` drifts and needs re-generating). The choice was *where the agent meets it*:

| Option | Drift | How/when the agent gets it | Verdict |
|---|---|---|---|
| A. Runtime — prepend to the `loom://context/…` bundle (via `serializeBundle`, fed by mcp; `assembleContext` can't take it — it's `app`/pure and may not import mcp) | none | passively, on every context read; re-sent each time | **Deferred** — trivial later add (shares the §1 producer) |
| B. Bake into installed `.loom/CLAUDE.md` template | drifts on every tool change | session start | rejected — drift is the whole thing we avoid |
| **C. Dedicated `loom://catalog` resource + session-start CLAUDE.md rule to read it before any tool search** | none | **once, deliberately, before `ToolSearch`** | **CHOSEN** |

**Why C (settled with Rafa):** it directly realizes the "read it before searching" intent, is token-leaner (read once, not re-sent on every context pull), and gives the agent a *named thing* to consult. The session-start rule lands in **both** CLAUDE.md surfaces (sync contract): *"Before `ToolSearch`-ing for a `loom_*` tool, read `loom://catalog` and go straight to `ToolSearch select:<exact name>`."* The catalog's own header repeats the honest framing. Because C is a standalone resource, **no `assembleContext`/`serializeBundle` change is needed** — the layering wrinkle that A carried disappears.

## §3 — Measured consolidation (Phase B)

**The central trade-off — still open, settle before building B.** Collapsing `loom_create_idea/design/plan/req/reference/chat` → `loom_create(type, …)` (and likewise refine/generate) turns ~18 tools into ~3. But:

- **Cost 1 — schema precision.** Per-type tools have sharp required-field schemas (`create_plan` wants goal/steps/content; `create_req` wants content shaped as three lists). A union `loom_create(type)` must accept a superset and validate per-type at runtime — fuzzier guidance for the agent, more runtime validation.
- **Cost 2 — wide rename.** Names are referenced in every extension launch prompt (`packages/vscode/src/commands/*.ts`), the MCP integration tests, `do-next-step`/promote flows, and CLAUDE.md. A rename touches all of them.
- **Benefit.** Fewer distinct first-use fetches (3 create-fetches → 1), and a smaller name list for discovery (which Phase A already softens).

**Recommendation (for discussion, NOT yet decided):** consolidate **only the create/refine/generate families**; leave step/plan/chat/query tools as-is (not a family — they lose clarity if merged). Keep the typed tool's `inputSchema` honest with a `type` enum + per-type conditional required fields. **Alternative:** do **not** consolidate at all — Phase A may shrink the discovery pain enough that the schema-precision loss of B isn't worth it. Settle A's measured impact first, then decide B.

## §4 — Surface area

- **Phase A:** `packages/mcp` (catalog producer + `group` on `toolDef` + `loom://catalog` resource registration/dispatch), `packages/app` (CLAUDE.md template rule in `installWorkspace.ts`), repo-root `CLAUDE.md`, tests. **No `app` context-pipeline change, no extension change.**
- **Phase B (if pursued):** `packages/mcp` (typed `loom_create/refine/generate` tools; delete the per-type ones — clean migration, no shims), every `packages/vscode/src/commands/*.ts` launch prompt, MCP integration tests, the installed CLAUDE.md template's tool list, repo-root CLAUDE.md.

## Decisions log

| # | Question | Status |
|---|----------|--------|
| §0 | Phasing | **Decided:** A (catalog + `loom://catalog`) first and independently valuable; B (consolidation) gated on A + Rafa |
| §1 | Catalog source | **Decided:** generated from live `toolDef` registry — no hand-maintained list |
| §1 | Grouping metadata | **Decided:** optional `group` field on `toolDef` (Other-bucket fallback) |
| §2 | Delivery surface | **Decided: C** — dedicated `loom://catalog` resource + session-start CLAUDE.md rule; A deferred as a cheap later add |
| §3 | Consolidation scope | **Open** (Phase B) — recommend create/refine/generate families only; alternative is none-at-all |

## Open for Rafa before implementing

1. §3 (Phase B only): do consolidation at all, and if so families-only (recommended) or wider? — does not block Phase A.