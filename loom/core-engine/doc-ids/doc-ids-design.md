---
type: design
id: de_01KQYDFDDBE8A6JD6P57DM5HV4
title: Doc IDs — ULID-based identity with slug presentation
status: done
created: "2026-05-03T00:00:00.000Z"
updated: "2026-05-05T00:00:00.000Z"
version: 3
tags: []
parent_id: id_01KQYDFDDBJSRCQTW60ANFM9YR
requires_load: []
---
# Doc IDs — ULID-based identity with slug presentation

Implementation design for ULID-based doc identity, slug-on-refs, auto-loaded ctx, `requires_load` for refs only, and `child_ids` removal. Companion to `doc-ids-idea.md`.

## 1. Frontmatter shape

### All docs (canonical key order)

```yaml
---
type: idea | design | plan | chat | ctx | done | reference
id: {prefix}_{ulid}            # e.g. pl_01JT8Y3R4P7M6K2N9D5QF8A1BC
title: "Human Readable Title"
status: draft | active | ...
created: YYYY-MM-DD
version: 1
tags: []
parent_id: {prefix}_{ulid} | null
requires_load: []              # refs only; ctx is auto-loaded by level
# reference docs only:
slug: kebab-case-slug
loadWhen: null                 # future; reserved
# design-specific (unchanged):
role: primary | supporting
---
```

**Removed fields:** `child_ids` (computed from `parent_id` via link index).

**Type prefix table:**

| Type | Prefix |
|------|--------|
| chat | `ch_` |
| idea | `id_` |
| design | `de_` |
| plan | `pl_` |
| done | `dn_` |
| ctx | `cx_` |
| reference | `rf_` |

## 2. Identity, filename, slug

| Concern | Source of truth |
|---------|----------------|
| Doc identity | `id` field in frontmatter (ULID + prefix) |
| Cross-doc references | `parent_id` and `requires_load` resolve via link index |
| Filename (refs) | `{slug}.md` (e.g. `vision.md`, `architecture-reference.md`) |
| Filename (ctx) | `loom/ctx.md` (global), `loom/{weave}/ctx.md`, `loom/{weave}/{thread}/ctx.md` — path is the scope, filename is positional |
| Filename (other docs) | Existing convention: `{thread}-idea.md`, `{thread}-design.md`, `{thread}-plan-NNN.md`, `{thread}-chat-NNN.md`, `{step}-done.md` |

**Slug is on refs only.** Other doc types do not have a `slug` field.

**Filename convention is preserved for non-ctx docs.** Filenames remain human-readable (`{thread}-idea.md` etc.) so the file tree stays scannable; ULID is durable identity, filename is presentation. Ctx is the documented exception: filename is always plain `ctx.md` because path encodes the scope.

**Slug rules:**
- Set on creation (kebab-cased from title, derived from filename when migrating existing refs).
- Stable forever — never auto-updated when title changes.
- Unique across the global refs namespace.
- Renamed only via `loom_rename(id, newSlug)`, which atomically updates every `requires_load` referencing the old slug.

## 3. Ctx auto-loading

Ctx docs are not listed in `requires_load`. The loader resolves them by path scoping when reading any doc:

1. Always load `loom/ctx.md` (global). Frontmatter `id: loom-ctx`.
2. If the doc is inside `loom/{weave}/`, load `loom/{weave}/ctx.md` if it exists. Frontmatter `id: {weave}-ctx`.
3. If the doc is inside `loom/{weave}/{thread}/`, load `loom/{weave}/{thread}/ctx.md` if it exists. Frontmatter `id: {thread}-ctx`.

**Convention:** every weave has at most one ctx doc; every thread has at most one ctx doc; the global ctx is single. Multiple ctx docs per level are not supported. Filename is always plain `ctx.md` — path encodes the scope (per `ctx-naming-design.md`).

**Ctx docs still have ULIDs** in their `id` field. Wait — they don't. Ctx is the documented exception: ctx `id` stays semantic (`loom-ctx`, `{weave}-ctx`, `{thread}-ctx`) so existing references keep resolving without rewrite. The ULID rule applies to idea / design / plan / chat / done / reference; ctx is opt-out.

## 4. `requires_load` semantics

- Accepts only **reference docs**, listed by **slug**.
- Resolves slug → ULID via the link index, then ULID → file path.
- Future: each entry may carry a `loadWhen:` filter (e.g. phase, doc type) — reserved as a frontmatter convention, not implemented in this migration.

```yaml
requires_load: [vision, workflow]
```

is shorthand for:

```yaml
requires_load:
  - slug: vision
  - slug: workflow
```

When `loadWhen:` lands, the long form will carry the filter:

```yaml
requires_load:
  - slug: migration-runbook
    loadWhen: { phase: implementing }
```

**Validation:** if a slug in `requires_load` does not resolve to a reference doc (or resolves to a non-ref), validation surfaces a diagnostic via `validate-state`.

## 5. Refs scoping — global only

**Final shape: a single `loom/refs/` folder.** All reference docs live there. Slug uniqueness scope = this single folder. No weave-local or thread-local refs.

**Current state of the repo (to migrate):** seven weave-local refs folders exist today and must consolidate back to `loom/refs/`:

```
loom/ai-integration/mcp/refs/
loom/core-engine/refs/
loom/docs-infra/refs/
loom/mvp/refs/
loom/use-cases/refs/
loom/vscode-extension/refs/
```

(Plus `loom/refs/` itself, which already follows the convention.)

**Migration handling for weave-local refs:**

1. For each ref doc in a weave-local folder, derive its target slug from the existing filename (kebab-case, drop `.md`). If the slug already exists in `loom/refs/`, fail loudly — the migration script does not silently rename or merge.
2. Move the file to `loom/refs/{slug}.md`.
3. Update the doc's `slug` frontmatter field to match (if missing, add it).
4. Re-resolve every `requires_load` entry across the repo. Slug-based references continue to resolve transparently because the slug stays the same.
5. Remove the now-empty weave-local `refs/` folder.

**Slug collision policy:** if two weave-local refs share a slug (e.g. both `core-engine/refs/architecture-reference.md` and `mvp/refs/architecture-reference.md` exist), the migration aborts with a clear error listing every collision. The author resolves manually before re-running — typically by renaming one to be more specific (e.g. `mvp-architecture-reference`).

**Why global-only:** a flat namespace is the cleanest mental model — `requires_load: [vision]` means "go look in `loom/refs/`, find `vision.md`." No resolver walking, no scope-shadowing rules, no surprises. The cost (longer slugs for related concepts) is accepted in exchange for simplicity. Per the "correct path over short path" rule, we don't keep the half-migrated weave-local state just because it exists.

**Future expansion:** if the global refs folder grows past the point where flat browsing is uncomfortable (~50+ refs), revisit. Not preemptive scope.

## 6. Link index changes

Today the link index maps slug-based IDs to file paths. After the migration:

- **Primary index:** ULID `id` → file path.
- **Slug index (refs only):** `slug` → ULID. Used to resolve `requires_load` entries.
- **Backlink index:** ULID → list of doc ULIDs that reference it via `parent_id` or `requires_load`. Replaces `child_ids` for the "what points at me" query.

The link index is rebuilt once per `getState` call (no N+1), as today.

## 7. Repo and reducer changes

- `weaveRepository`, `threadRepository`, `linkRepository`: lookup by `id`-in-frontmatter, not path. File path becomes a derived value from the index.
- `loadThread`: walks the thread folder, parses frontmatter, registers each doc by ULID.
- Reducers stay pure. Identity migration is a pre-reducer concern (loading) and a post-reducer concern (saving).
- `serializeFrontmatter`: enforces canonical key order, drops any `child_ids` field encountered, validates ULID prefix matches `type` (with ctx as the documented exception).

## 8. MCP surface adjustments

| Tool / Resource | Change |
|---|---|
| `loom_create_*` | Mint ULID + prefix on creation. Refs get a slug parameter. Ctx keeps semantic id (`{scope}-ctx`). |
| `loom_rename` | For refs: takes `(id, newSlug)`; updates `requires_load` references atomically. For other docs: still updates filename, no cross-doc effect. |
| `loom_find_doc` | Accepts ULID or, for refs, slug. |
| `loom://thread-context/{weave}/{thread}` | Unchanged — folder-based URIs. Bundled docs identified by ULID internally. |
| `loom://doc/{id}` | New shape: takes a ULID (or, for refs, accepts slug for human URIs). |
| `validate-state` | New diagnostic: `requires_load` slug doesn't resolve to a ref doc. New diagnostic: ULID prefix doesn't match `type`. |

## 9. Migration script

One-shot, idempotent, runs from `scripts/migrate-to-ulid.ts`. Ordered passes:

1. **Inventory.** Walk `loom/`, parse every doc's frontmatter, build a map: old-slug-id → file path, type, content. Detect every weave-local `refs/` folder.
2. **Mint ULIDs.** For each non-ctx doc, generate a ULID with the type prefix. Build a mapping: old-slug-id → new ULID. Ctx docs keep their semantic id (`loom-ctx`, `{weave}-ctx`, `{thread}-ctx`).
3. **Rewrite frontmatter.** For each doc:
   - Replace `id` (new ULID for non-ctx; semantic id for ctx).
   - Replace `parent_id` (lookup via the mapping; fail loudly on missing).
   - Drop `child_ids`.
   - For refs: ensure `slug` field is set, derived from filename (kebab-cased, drop `.md`). If absent and not derivable, fail.
   - For non-refs: drop `slug` field if present.
   - Reorder keys via `serializeFrontmatter`.
4. **Rewrite `requires_load`.** Resolve each entry against the slug index. If an entry points at a non-ref (e.g. an idea), surface as a migration error — the author must reclassify or remove it before re-running.
5. **Rename ctx files.** Move every ctx doc to plain `ctx.md` at its scope:
   - `loom/loom-ctx.md` → `loom/ctx.md`
   - `loom/{weave}/{weave}-ctx.md` → `loom/{weave}/ctx.md` (where the file already isn't plain)
   - `loom/{weave}/{thread}/{thread}-ctx.md` → `loom/{weave}/{thread}/ctx.md` (where the file already isn't plain)
6. **Consolidate weave-local refs to `loom/refs/`.** For each weave-local ref doc: derive slug from filename, move to `loom/refs/{slug}.md`, update `slug` frontmatter, fail loudly on collision (list every conflict). Remove emptied folders.
7. **Regenerate link index.** Build fresh from disk; verify every `parent_id` and `requires_load` entry resolves.
8. **Verify.** Run full test suite. Any failure means abort and restore from the pre-migration commit.

**Atomicity:** the script writes to a scratch directory first, runs verification, then swaps it into place via a single rename pass. If verification fails, the original tree is untouched.

**Test fixtures** are regenerated by re-running the same script on the fixture trees.

## 10. Sequencing

1. Land this design as `doc-ids-design.md` (this doc).
2. Plan `doc-ids-plan-001.md` — steps covering: ULID minter, frontmatter migrator, link index rewrite, repo lookups, MCP surface updates, ctx renames, weave-local refs consolidation, migration script + fixtures, validation diagnostics.
3. Ship before any user-facing rename / move / drag-and-drop work in the VS Code extension. Those features depend on this being in place.

## 11. Risks

- **Migration miscount.** A `parent_id` pointing at a missing doc, or a `requires_load` slug that doesn't resolve, must fail the migration loudly rather than silently dropping.
- **Slug collisions.** Weave-local refs may have name clashes once flattened to `loom/refs/`. The migration script must check exhaustively and fail with a clear error listing every collision.
- **External tooling.** Anything outside this repo that hardcoded slug-based IDs or the `loom/loom-ctx.md` path (rare; mostly `.mcp.json` env or scripts) needs auditing.
- **Self-modifying migration.** The script edits the same docs that describe Loom's shape. The MCP gate hook must be off during execution; MCP tools that depend on the link index cannot be used until the migration completes and the index is rebuilt.

## 12. Out of scope

- Implementing `loadWhen:` (reserved field only).
- Weave-level or thread-level refs folders (deferred indefinitely; revisit only if the global namespace grows uncomfortable).
- Reverse migration (ULID → slug). One-way.
- Visual UI in VS Code for editing slug fields — handled by future ref-management UX.
- A deprecation shim resolving `loom-ctx.md` → `ctx.md` (pre-1.0; clean break, per `ctx-naming-design.md`).

## Acceptance

- Every doc in `loom/` has a ULID `id` with correct type prefix (ctx excepted: keeps semantic id).
- No doc has `child_ids`.
- Only refs have `slug`.
- Every `parent_id` and `requires_load` entry resolves via the link index.
- `getState` builds successfully and tests pass.
- Ctx docs live at plain `ctx.md` paths and are auto-loaded by the resolver.
- All ref docs live in `loom/refs/`; no weave-local `refs/` folders remain.
