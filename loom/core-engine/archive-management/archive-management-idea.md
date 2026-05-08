---
type: idea
id: id_01KQYDFDDA5F6SJJ3K7PA7HHBJ
title: Archive management — taxonomy, central root, and tree visibility
status: done
created: "2026-05-05T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Archive management — taxonomy, central root, and tree visibility

## What

Today archived Loom docs live in scattered `.archive/` folders next to the source: `loom/refs/.archive/loom.md`, `loom/{weave}/{thread}/.archive/foo-idea.md`, etc. The `.archive/` folders are invisible in the VS Code extension tree, hard to browse, and have no shared taxonomy for *why* a doc was archived.

This idea proposes a structured archive subsystem:

1. **Single archive root.** All archives consolidate under `loom/.archive/` (Rafa: "`loom/.archive` should archive all loom kind of docs").
2. **Reason-based taxonomy.** Subfolders by archive reason: `cancelled/`, `deferred/`, `superseded/`, plus a special `chats/` for archived chat docs (content-type-keyed because chats accumulate too fast to mix with other reasons).
3. **VS Code tree visibility.** The extension renders the archive root and its subfolders in the tree, with codicon-based icons distinguishing reason types. Archive nodes are visually quieter (dimmed, separate group) so they don't clutter the active workspace view.

## Why

**Today's pain:**
- **Archives are invisible.** The VS Code tree doesn't show `.archive/` at all. Users (including Rafa, this session) don't see archived docs unless they go to the filesystem manually. The `loom-install-claude-hook-idea.md` filed today lives in `loom/.archive/deferred/` and Rafa noted: ".archive is not showed in vscode extension tree."
- **No shared "why."** Was a doc archived because it was cancelled? Replaced? Just paused? The current flat `.archive/` folder loses this. Reason often matters when revisiting later (deferred = pick up later; superseded = look at the replacement; cancelled = abandoned, don't resurrect).
- **Chats get lost.** Chat docs accumulate quickly and most become low-value once the conversation has been formalized. Without a separate archival path, they either clog active folders or land in a generic `.archive/` next to design docs, mixing concerns.
- **Per-thread `.archive/` fragmentation.** Each thread has its own archive. To find "all deferred ideas across the project," you have to walk every thread. A central root makes cross-cutting views trivial.

**Reason taxonomy semantics:**

| Reason | When to use | Resurrection expectation |
|--------|-------------|---------------------------|
| `cancelled/` | Decided not to pursue, no plan to revisit. | Low — usually permanent. |
| `deferred/` | Paused for later; valid idea, wrong time. | High — explicit pickup checklist preserved. |
| `superseded/` | Replaced by a newer doc that subsumes this one. | Low — point to the replacement instead. |
| `chats/` | Archived chat (any reason). | Reference-only — chats don't get resurrected, they get cited. |

## Path layout — three options for the design to decide

The central question for the design: *how do we preserve thread/source context inside the central archive?*

**Option A — Flat by reason.**
```
loom/.archive/
  cancelled/{id}.md
  deferred/{id}.md
  superseded/{id}.md
  chats/{id}.md
```
Simple. Loses original thread location entirely. Need frontmatter `archived_from:` to recover it.

**Option B — Reason then mirrored path.**
```
loom/.archive/
  cancelled/refs/loom.md
  deferred/loom-install-claude-hook-idea.md
  superseded/core-engine/foo/foo-design.md
  chats/core-engine/foo/chats/foo-chat.md
```
Preserves source location as a sub-path. Easy to visually navigate. Slightly deeper trees.

**Option C — Reason as frontmatter, source path preserved.**
```
loom/.archive/
  refs/loom.md                     # reason in frontmatter
  loom-install-claude-hook-idea.md # reason in frontmatter
  core-engine/foo/foo-design.md    # reason in frontmatter
```
Path = source mirror. Reason lives in `archive_reason: deferred` frontmatter field. VS Code tree groups by reason via frontmatter read, not path. More flexible (re-categorize without moving file) but tree rendering needs frontmatter awareness.

Recommendation will be in the design. Initial lean: **Option B** — best balance of obvious-from-path and shared-reason-grouping.

## Tree visibility — what the extension renders

Under the existing weave/thread tree, add a new top-level node "📦 Archive" (or equivalent codicon: `archive`, `inbox`, `trash`). Expanding shows subfolders by reason, each with its own codicon:
- `cancelled/` — `circle-slash` or `error`
- `deferred/` — `clock` or `bookmark`
- `superseded/` — `replace` or `references`
- `chats/` — `comment-discussion`

Each archived doc renders dimmer than active docs (italic, muted color) so it's visually clear they're not part of active work.

Behaviors:
- Click → open the file (read-only? or just lower-affordance?).
- Right-click → "Restore to active" (move out of archive, prompt for destination if not obvious from `archived_from`).
- Right-click → "Re-categorize" (move between reason subfolders).

## Connection to other Loom concerns

- **`findDoc` scope bug** ([mcp-doc-resolver-scope](../../ai-integration/mcp-doc-resolver-scope/mcp-doc-resolver-scope-idea.md)): the resolver fix scopes lookups to `loom/**`, which already includes `loom/.archive/`. Archived docs remain resolvable by id. Both fixes compose cleanly.
- **`loom_archive` tool**: currently puts docs in same-level `.archive/`. Needs a new signature that accepts a reason argument (`reason: cancelled | deferred | superseded | chats`), and writes to the central root. Backwards compatibility for existing scattered `.archive/` folders: a one-time migration script.
- **`loom-install-claude-hook` deferred idea**: already lives at `loom/.archive/deferred/loom-install-claude-hook-idea.md`. Once this idea ships, that path becomes canonical. The hook gate must continue to exempt `loom/.archive/**` (already done in this session).
- **Chat doc accumulation**: this project alone has 8+ chat docs in various states. `chats/` archive bucket is the cleanup mechanism — once a chat's content has been promoted to idea/design/plan, the chat itself can move to `archive/chats/`.

## Out of scope (for this idea)

- Auto-archiving heuristics ("chats older than 30 days with no recent activity → suggest archive"). Future enhancement.
- Archive search / filter UX (full-text search across archived docs). Probably belongs to a search idea.
- Cross-workspace archive sharing. Not now.
- Encrypted/sensitive archive areas. Not for this stage.

## Success criteria

- One central archive at `loom/.archive/` with the four reason subfolders.
- `loom_archive(id, reason)` MCP tool that writes to the right subfolder, records `archived_from:` and `archive_reason:` in frontmatter.
- One-time migration: existing scattered `.archive/` content moves into the central root with a default reason (probably `superseded` or a new `legacy` bucket).
- VS Code extension tree renders the archive node with subfolder grouping and codicon icons.
- Archived docs remain discoverable by `findDoc` (and therefore by every id-keyed MCP tool).
- A test suite covering: archive a doc with each reason, verify path + frontmatter; restore an archived doc; re-categorize an archived doc.

## Open questions for the design

1. **Path layout** (A / B / C above).
2. **Should archive be `loom/.archive/` or `.loom-archive/`** (sibling of `loom/`)? Keeping it inside `loom/` keeps everything Loom-related in one root; making it a sibling separates active vs frozen at the workspace level. Probably inside `loom/`.
3. **What happens to per-thread `.archive/` folders during migration?** Auto-move on first run? Leave alone and let the user opt in? Some users may have manual archives we shouldn't touch.
4. **Should `chats/` taxonomy nest by source thread?** A flat archive of all chats project-wide gets noisy fast. Mirrored path (`chats/core-engine/foo/foo-chat.md`) is cleaner.
5. **Restore semantics.** When the user "restores" an archived doc, where does it go? Recovered from `archived_from`? What if that location no longer exists (thread renamed/moved)?
6. **Are deferred ideas "archived" in the same sense as cancelled/superseded?** They feel different — deferred is "actively parked," cancelled is "rejected," superseded is "replaced." Maybe `deferred/` deserves richer status tracking (next-revisit-date, blockers).
