---
type: design
id: de_01KQYDFDDAGQTWJZT0PAE09GTQ
title: Archive management — taxonomy, central root, and tree visibility
status: done
created: "2026-05-05T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: id_01KQYDFDDA5F6SJJ3K7PA7HHBJ
requires_load: []
---
# Archive management — Design

See [archive-management-idea](archive-management-idea.md) for motivation. This doc covers the design decisions for path layout, archive tool API, frontmatter shape, migration, and tree rendering.

## Decisions taken

### 1. Path layout — Option B (reason then mirrored source path)

```
loom/.archive/
  cancelled/
    {weave}/{thread}/{doc-name}.md       # mirrors original source path
    refs/{ref-id}.md
    {weave-root-doc}.md                  # for loose-fiber docs
  deferred/
    loom-install-claude-hook-idea.md     # weave-root or loose docs at top of reason folder
    {weave}/{thread}/...
  superseded/
    {weave}/{thread}/...
  chats/
    {weave}/{thread}/chats/{chat-id}.md  # always mirrors source under chats/
    chats/{chat-id}.md                   # for project-level chats
```

**Why Option B over A or C:**
- **Visual obviousness.** A user (or AI) browsing `loom/.archive/cancelled/core-engine/foo/` immediately knows "these are cancelled docs from the foo thread in core-engine." No frontmatter read required.
- **Composes with `findDoc`.** The resolver's allowlist of `loom/**` (per [mcp-doc-resolver-scope](../../ai-integration/mcp-doc-resolver-scope/mcp-doc-resolver-scope-design.md)) automatically includes archived docs without special-casing.
- **No frontmatter dependency for tree rendering.** Option C requires reading every archived doc's frontmatter to group by reason — slow at scale, fragile if frontmatter is malformed.
- **Re-categorization cost.** Moving a doc between `cancelled/` and `deferred/` is a file rename. Option C's "edit frontmatter" is also a write, but adds the risk of frontmatter rewrite drift. File moves are atomic and lossless.

The downside (mild): re-categorization changes the absolute path, so any external link to the archived file breaks. Mitigated by the rule "links to archived docs should use the doc id, not the absolute path" — the resolver finds it wherever it lives.

### 2. Archive tool API

```typescript
loom_archive({
  id: string,                          // doc to archive
  reason: 'cancelled' | 'deferred' | 'superseded' | 'chats',
  // chats reason auto-inferred from doc type when omitted
})
```

Behavior:
1. Resolve `id` to a path via the (fixed) doc resolver.
2. Compute target path: `loom/.archive/{reason}/{source-path-relative-to-loom-root}`.
3. Move the file. Create destination directories as needed.
4. Stamp frontmatter with `archived_from`, `archive_reason`, `archived_at`.
5. Update the link index: rebuild parent_id/child_ids edges so archived docs no longer count as active children. (Active workflow shouldn't propose stale plans for an archived idea.)
6. Return `{ id, archivedPath, reason }`.

**Auto-inference for chats:** if `id` resolves to a `type: chat` doc and `reason` is omitted, default to `'chats'`. If `reason` is explicitly something else (e.g. user wants to file a chat as `cancelled`), honour the explicit value but warn that chat archives normally land in `chats/`.

**Idempotency:** if the doc is already archived (path under `loom/.archive/`), return success with the current location. Don't re-move.

**Conflict handling:** if a doc with the same target path already exists in the archive (rare — would mean two docs with the same id and source path), append `-{ISO-timestamp}` to the filename. Log the conflict in the return payload so the caller knows.

### 3. Frontmatter additions

Three fields added to all archived docs (only when archived; not present in active docs):

```yaml
archived_from: loom/core-engine/foo/plans/foo-plan-001.md
archive_reason: superseded
archived_at: 2026-05-05T14:32:00Z
```

Optional (`superseded` only):
```yaml
superseded_by: foo-plan-002      # doc id of the replacement
```

Optional (`deferred` only):
```yaml
deferred_pickup:
  earliest: 2026-Q3              # vague is fine
  blockers: [some-other-thread]  # what needs to land first
```

These fields go at the bottom of the frontmatter block, after `requires_load`. The canonical key order in `serializeFrontmatter` extends to handle them.

### 4. Tree rendering (VS Code extension)

The tree provider gains an "Archive" node, sibling to the existing Weaves group:

```
LOOM
├── ⚙ Active
│   ├── 🧶 core-engine
│   │   ├── 🧵 archive-management
│   │   ├── 🧵 staleness-management
│   │   └── ...
│   └── 🧶 ai-integration
│       └── ...
└── 📦 Archive                          ← new
    ├── ⊘ cancelled (3)
    │   └── core-engine/foo/foo-idea.md
    ├── 🕒 deferred (1)
    │   └── loom-install-claude-hook-idea.md
    ├── ↻ superseded (5)
    │   └── ...
    └── 💬 chats (12)
        └── ...
```

**Codicon mapping** (subject to icon-pack availability):
- Archive root: `archive`
- `cancelled`: `circle-slash`
- `deferred`: `clock` or `bookmark`
- `superseded`: `references` or `git-merge`
- `chats`: `comment-discussion`

**Visual treatment:**
- Archive nodes use a muted color (theme-aware: dimmed foreground).
- Archived docs render in italic.
- Counts shown next to each reason node: `cancelled (3)`.
- The Archive group is collapsed by default — out of the way unless the user expands it.

**Interactions:**
- Click → open file (no special read-only mode; just open).
- Context menu: *Restore* (move back to `archived_from` location, or prompt if that path no longer exists), *Re-categorize* (move to a different reason folder), *Delete permanently* (with confirmation).
- Drag-drop from active tree → archive node: prompts for reason, then archives.

### 5. Migration from existing scattered `.archive/`

Two scattered archive locations exist today:
- `loom/refs/.archive/` — currently has `loom.md` (just archived this session).
- `loom/{weave}/{thread}/.archive/` — per-thread archives, none populated yet in this repo, but the pattern exists in `loom_archive` tool output.

**Migration plan:**
1. Add a `loom migrate-archives` CLI command (or a one-shot script). On run:
   - Scan `loom/**` for any `.archive/` folder that's NOT `loom/.archive/`.
   - For each archived doc found, read its frontmatter to guess a reason. Defaults: `superseded` if a sibling doc with the same id-prefix exists; `cancelled` otherwise.
   - Move the doc to `loom/.archive/{reason}/{original-relative-path}`.
   - Stamp the frontmatter with `archived_from`, `archive_reason: <guessed>`, `archived_at: <file-mtime>`.
   - Print a summary of moves and ask the user to confirm before committing.
2. After the migration, the legacy `.archive/` subfolders should be empty. Remove them.
3. The `loom_archive` tool only ever writes to `loom/.archive/` from this point.

**Backwards compatibility:** the doc resolver continues to handle the old `.archive/` paths during a transition window, so id-based lookups don't break mid-migration.

### 6. Link index awareness

When a doc is archived:
- It stays in the link index (still resolvable by id) but is flagged `archived: true`.
- Its `parent_id`/`child_ids` references are preserved but rendered as broken/stale by `loom://diagnostics`.
- Active docs that point to archived docs surface a "this references an archived doc" warning. Encouragement to either restore the target or remove the reference.

## Migration risk and rollback

- **Risk:** the migration moves files and edits frontmatter. A bug there can lose data.
- **Mitigations:**
  - Dry-run mode prints the plan without writing.
  - Real run is idempotent (can be re-run safely).
  - Git is the rollback path. Run migration on a clean working tree; review diff; revert if anything looks wrong.
  - One-time tool, lives in `packages/cli/src/commands/migrateArchives.ts`. No long-term maintenance burden.

## Implementation split

This is the design's recommended plan structure (the actual plan doc will be separate):

**Plan 001 — Archive subsystem core (no UI yet)**
- Update `loom_archive` MCP tool signature with `reason` param.
- Implement central-root path computation in `app` layer.
- Frontmatter stamping (`archived_from`, `archive_reason`, `archived_at`).
- Idempotency + conflict handling.
- Unit tests for each reason, restore, re-categorize.
- Update doc resolver to be aware of the central archive (already in scope from `mcp-doc-resolver-scope-design`, just verify).

**Plan 002 — Migration**
- `loom migrate-archives` CLI command (dry-run + run).
- Frontmatter back-stamp on legacy archived docs.
- Empty-folder cleanup.
- Run the migration on this repo, commit the result.

**Plan 003 — VS Code tree rendering**
- New "Archive" group in the tree provider.
- Reason subfolder rendering with codicons.
- Restore / re-categorize / delete context menu actions.
- Drag-drop archive interaction.
- Visual treatment (muted, italic, counts).

Plans 001 and 002 must land before Plan 003 (UI needs the data model). Plans 001 and 002 can land in either order, but 001 first is cleaner.

## Open questions still on the table

1. **Should `cancelled/` archives ever be deleted permanently?** A "trash" workflow distinct from "archive" — true delete after some retention period. Out of scope for this design but worth a future idea.
2. **Project-level vs weave-level archives.** This design centralizes everything at `loom/.archive/`. An alternative is per-weave archives (`loom/{weave}/.archive/{reason}/...`) for cleaner isolation. Decision to centralize was Rafa's call ("`loom/.archive` should archive all loom kind of docs"). Worth revisiting if cross-weave archive volume gets noisy.
3. **Restore semantics when `archived_from` no longer exists.** The thread may have been renamed or the weave dissolved. The restore UX should: (a) try the original path, (b) on failure prompt the user for a destination, (c) optionally suggest "closest match" thread paths. Detail for the plan.
4. **Should the Archive tree node be a top-level item or nested under each weave?** This design picks top-level for cross-cutting visibility. Per-weave might be more contextual. Probably top-level + per-weave filter when expanded.
5. **`deferred_pickup` structured fields** — useful or over-engineered? Could just be free-text `notes`. Leaning structured because deferred ideas are often blocked by something; making blockers machine-readable enables a future "what's unblocked?" query.

## Decision log (this design conversation)

- 2026-05-05 — Centralize archive at `loom/.archive/` (Rafa's call).
- 2026-05-05 — Reason taxonomy: `cancelled` / `deferred` / `superseded` / `chats` (Rafa's list).
- 2026-05-05 — Path layout Option B: reason root with mirrored source path. Rationale: visual obviousness, no frontmatter dependency for tree rendering.
- 2026-05-05 — Archive tool gains `reason` param; chat-type docs auto-default to `chats/`.
- 2026-05-05 — Three new frontmatter fields (`archived_from`, `archive_reason`, `archived_at`) plus optional reason-specific fields.
- 2026-05-05 — Three-plan implementation split: core, migration, UI. UI strictly after data model.
