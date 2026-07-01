---
type: idea
id: id_01KQYDFDDBJSRCQTW60ANFM9YR
title: Doc IDs — ULID-based identity with slug presentation
status: done
created: "2026-05-03T00:00:00.000Z"
updated: "2026-05-03T00:00:00.000Z"
version: 2
tags: []
parent_id: null
requires_load: []
---
# Doc IDs — ULID-based identity with slug presentation

## Problem

Today, doc identity is coupled to three things at once: the **filename**, the **slug-in-frontmatter**, and every **`parent_id`** reference pointing at it. Rename one, you break the others. Move a doc between threads, and the canonical path changes. We paper over this with `loom_rename` going through MCP, but it's a workaround for a structural issue: **slugs are not identifiers**.

The cost grows the moment user-facing rename, move, and drag/drop ship in the VS Code extension. After that, identity breakage becomes a daily occurrence.

Beyond identity, two adjacent problems compound:

- **`child_ids` drifts.** It's a denormalization of `parent_id`. The link index already knows children — `child_ids` is a redundant store that desynchronizes.
- **`requires_load` is fragile.** It currently mixes refs, ideas, and anything else, with no rules about what's loadable. Authors write it by hand, but there's no convention enforcing that listed docs are stable, summarized, or AI-friendly.

## What we want

1. **Stable, durable doc identity** that survives rename, move, drag/drop, and title changes.
2. **Predictable auto-loaded context** — the right ctx docs load by level (global / weave / thread) without authors managing it.
3. **Explicit, narrow `requires_load`** — only refs, by slug, future-filtered by `loadWhen:`.
4. **A single source of truth for backlinks** — `parent_id` only, no `child_ids`.
5. **Human-writeable frontmatter** preserved where it matters (refs by slug; ctx auto-resolved).

## Approach

**ULID + type prefix for doc identity.**

Every doc gets a frontmatter `id` of the form `{type-prefix}_{ulid}`, e.g. `pl_01JT8Y3R4P7M6K2N9D5QF8A1BC`. ULIDs are sortable by creation time, shorter than UUIDs, and stable forever. The type prefix (`ch_`, `id_`, `de_`, `pl_`, `cx_`, `rf_`) makes raw markdown and logs readable.

**Weaves and threads stay folder-named.** They are not docs; their identity is the folder path. This keeps `loom://thread-context/{weaveId}/{threadId}` URIs human-typeable.

**Slug only on reference docs.** Slug is the human-friendly handle that `requires_load` points at. Other docs (idea, design, plan, chat, ctx, done) use ULID for identity and filename for presentation — no slug field needed.

**Ctx docs auto-load by level.**
- `loom-ctx.md` — global, always loaded.
- `{weave}-ctx.md` — loaded when working in that weave.
- `{weave}-{thread}-ctx.md` — loaded when working in that thread.

The loader resolves these from path; authors never list them in `requires_load`.

**Refs are global-only for now.** A flat `loom/refs/` namespace, slug-unique. `requires_load: [vision, workflow]` resolves slug → ULID → file via the link index. If a weave later grows truly local refs, a `loom/{weave}/refs/` convention can be added — but not preemptively.

**Drop `child_ids` entirely.** Backlinks are computed from `parent_id` via the existing link index.

## Why this matters

- **Decouples identity from presentation.** Filename and title can change freely; ULID and `parent_id` references stay intact.
- **Survives drag/drop and rename.** The whole point of the change.
- **Reduces fields.** Most docs lose `slug` and `child_ids`. Frontmatter shrinks.
- **Preserves human-writeable refs.** `requires_load: [vision]` still works exactly the same for authors.
- **Token-efficient context loading.** Auto-loaded ctx scopes by level instead of dumping everything.

## Scope and timing

**Post-MVP, single atomic migration.** Half-migrated state is worse than either endpoint, so this ships as one coordinated change:

- Mint ULIDs for every existing doc, prefixed by type, written to `id`.
- Rewrite every `parent_id` to point at the new ULID.
- Drop `child_ids` from every doc.
- Rename ctx docs to the level-scoped convention.
- Update repos and the link index to look up by `id`-in-frontmatter, not path.
- Regenerate test fixtures.

**Sequencing:** ship before user-facing rename / move / drag-and-drop in the VS Code extension. Those features are what makes today's scheme break daily.

## Out of scope

- `loadWhen:` filter on `requires_load` — captured as a future field but not part of this migration.
- Weave-level or thread-level refs folders — only added if a real need surfaces.
- A separate slug-rename UX for refs — covered by extending today's `loom_rename` MCP op.

## Open questions deferred to design

- Filename naming for non-ref docs (do we keep `{thread}-idea.md` etc., or move to ULID-based filenames?).
- Migration script's atomicity guarantees (one big rewrite vs. staged with rollback).
- Resolver fallback if slug uniqueness ever needs scoping (refs grow past ~50?).
