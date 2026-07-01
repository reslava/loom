---
type: design
id: de_01KWEGNABRHPMVY50E6DGRX4WQ
title: Loom entities CRUD
status: done
created: 2026-07-01
updated: 2026-07-01
version: 6
tags: []
parent_id: null
requires_load: []
---
# Loom entities CRUD

## Problem

Loom's entity CRUD is inconsistent and partly mis-wired. Three concrete symptoms drove this design (all verified in code):

1. The MCP-gate hook is unwired — `.claude/settings.json` is renamed to `settings.jsonDISABLED`, so direct edits to `loom/**/*.md` are not blocked.
2. `loom_rename` (`packages/app/src/rename.ts`) renames a doc's **title only** — never the filename — and there is no separate filename-rename capability.
3. The extension wires `loom.rename`/`loom.archive`/`loom.delete` for `weave`/`thread` tree nodes (`packages/vscode/package.json:766`), but those commands only understand *doc*-by-ULID operations, so renaming a weave/thread prompts "Document ID to rename" — nonsense for a folder.

Underlying cause: **weaves and threads are `fs` containers, not documents**, but the tooling treats their CRUD as if it were document CRUD. And document *filenames* are not human-facing (idea/design are thread-name-derived, plan/done/chat are opaque ULIDs), which collides with the wish to "rename a filename".

## Entity model (the invariant this design enforces)

| Entity | What it is | Identity | Display name | CRUD shape |
|--------|-----------|----------|--------------|------------|
| **Weave** | `loom/{weave}/` folder. Contains **only threads** — never loose docs. | folder name | folder name (no title) | `fs` folder ops |
| **Thread** | `loom/{weave}/{thread}/` folder + `thread.md` sidecar. | `th_` ULID in `thread.md` (stable cross-ref for `depends_on`); folder name = slug | `thread.md` `title` | `fs` folder ops + manifest |
| **Doc** | a `.md` file inside a thread (idea/design/plan/done/chat/req) | doc ULID in frontmatter | `title` | content via existing `loom_*` tools |

Enforced invariants:
- A weave folder's direct children are **thread folders only** (plus the managed `.archive/`, `refs/` at `loom/` root, which are not weaves). No weave-root docs.
- Every doc lives under a thread. `idea`/`design`/`req`/`thread.md` are per-thread **singletons**; `plan`/`done`/`chat` are many-per-thread.
- Cross-references are always by **ULID** (`parent_id`, `child_ids`, `requires_load`, `blockedBy`, `depends_on`). Folder names and filenames are presentation and may change freely without rewriting any content.

## Decisions (locked in the design chat)

1. **Weave/thread CRUD is `fs`-shaped but MCP-mediated.** The extension is layered `vscode → mcp → app → fs` and must never call `fs` directly, so folder ops get thin MCP tools that perform the `fs` move/rename server-side. These are **not** `.md` content writes, so they don't conflict with the MCP gate.
2. **`thread.md` keeps `title`** (display); folder name is the human-editable slug; the `th_` ULID is the stable cross-ref. Weaves stay title-less (folder name *is* the name).
3. **Filenames flatten/humanize.** New scheme below. ULIDs remain the identity in frontmatter; filenames become human-readable presentation.
4. **Ordinals** (`plan-NNN`, `chat-NNN`) are assigned by creation order and **never renumbered on delete** (gaps allowed, like DB migrations).
5. **Every doc lives in a thread; weaves contain only threads.** Weave-root doc creation paths are removed.
6. **Cross-thread doc move = loose fibers only.** See "Loose fibers & move rules".
7. **Delete is archive-first.** Tree destructive action archives to `loom/.archive/…`; true permanent delete is behind explicit confirmation.
8. **F2 = rename Title on any doc, rename folder on a weave/thread.** Reference docs get an *additional* "Rename file" action for their `{slug}.md`.
9. **Re-enable the MCP gate** (`settings.jsonDISABLED` → `settings.json`).

## Filename scheme

| Doc type | Current filename | New filename | Rationale |
|----------|------------------|--------------|-----------|
| idea | `{threadId}-idea.md` | `idea.md` | per-thread singleton, like `thread.md`/`req.md`; drops thread-slug coupling so thread rename touches no doc files |
| design | `{threadId}-design.md` | `design.md` | same |
| plan | `{threadId}-plan-NNN.md` | `plan-NNN.md` | drop thread-slug prefix; ordinal already carries sequence |
| done | **inconsistent** — `{planULID}-done.md` (recent) / `{threadId}-plan-NNN.md` (legacy, some with no `-done`) | `plan-NNN-done.md` | normalize; name follows its plan |
| chat | `{threadId}.md` (first) / `{threadId}-chat-NNN.md` | `chat-NNN.md` | drop thread-slug prefix; consistent ordinals |
| reference | `{slug}.md` | `{slug}.md` (unchanged) | already a human slug |
| req | `req.md` (unchanged) | `req.md` | already flat singleton |
| thread manifest | `thread.md` (unchanged) | `thread.md` | already flat singleton |

**Derivation is currently split across disagreeing sites** — a root cause this design also fixes. `docPathInThread` in `packages/fs/src/repositories/threadRepository.ts` (the `switch`, ~lines 114–126) is only a **fallback**: `saveThread` uses `doc._path ?? docPathInThread(...)`, and the per-type MCP *create* tools compute their own filenames. That's why the switch says `${doc.id}.md` for plan/done/chat while the files on disk are actually `{threadId}-plan-NNN.md`, and why done naming drifted over time (`{planULID}-done.md` vs legacy `{threadId}-plan-NNN.md`). Step 1 **unifies all derivation into one naming module** so there is a single source of truth. The tree infers doc *type* from a filename token (`idea`/`design`/`plan`/`chat`/`done`), so every new name preserves one (`plan-NNN`, `plan-NNN-done`, `chat-NNN`, `idea`, `design`) — the inference keeps working.

## Move rules — the thread is the atomic unit

> **Decision (supersedes the original loose-fiber move design):** a **thread is the minimal, indivisible unit of information** — it is a chain (`idea → design → plan → done`), not a bag of docs. Therefore **docs never move between threads.** Moving individual docs (`loom_move_doc`) was implemented and then **dropped**: it doesn't compose (assembling a chain by moving two loose fibers leaves them unlinked, or forces a move to silently rewrite `parent_id` — both wrong), it's rare (weaves contain only threads, so every doc already lives in one), and it added the most surface for the least value.

- **Move a thread between weaves** — the only cross-container move. The folder moves as a unit; the `th_` ULID travels with it, so `depends_on` edges survive and the whole chain stays intact by construction.
- **Docs are never moved across threads.** To relocate work, move the whole thread.

The **loose fiber** term is retained only as vocabulary — a doc with **no parent and no children** (a graph position, not a location) — but there is no operation that moves one between threads.

This keeps the graph honest: no dangling `parent_id`, no dangling `child_ids`, ever — because a chain only ever moves whole.

## MCP tool surface

Existing and reused: `loom_create_weave`, `loom_create_thread`, `loom_archive` (already takes `{ weaveId, threadId? }` folder targets), `loom_delete` (folder targets), `loom_rename` (title), `loom_restore`.

New tools (thin, `fs`-shaped, server-side):
- `loom_rename_weave({ weaveId, newWeaveId })` — rename the weave folder.
- `loom_rename_thread({ weaveId, threadId, newThreadId })` — rename the thread folder (slug); leaves `thread.md` ULID + docs untouched.
- `loom_move_thread({ fromWeaveId, threadId, toWeaveId })` — move a thread folder to another weave (the only cross-container move).
- `loom_rename_doc_file({ id, newSlug })` — reference-only filename slug rename (guarded to `type: reference`).

(`loom_move_doc` was built then removed — see "Move rules" above.)

`loom_rename` stays title-only (its documented contract). App use-cases mirror the tools (`renameWeave`, `renameThread`, `moveThread`, `moveDoc`) so the "all `loom/` mutation goes through app" seam holds; the tools are thin MCP wrappers.

## Extension wiring (`packages/vscode`)

- Split the mis-wired `loom.rename`: 
  - `loom.rename` (F2 on a doc) → title rename (current behaviour, correct target).
  - `loom.renameFolder` (F2 on weave/thread) → `loom_rename_weave` / `loom_rename_thread` by node kind. Fix `package.json` `when` clauses so weave/thread nodes bind to the folder command, not the doc command.
- Bind **F2** (`keybindings`) to a dispatcher that picks title-rename vs folder-rename by focused node kind.
- `loom.renameFile` context action on `reference` nodes → `loom_rename_doc_file`.
- **Drag & drop:** thread → weave = `loom_move_thread`; loose-fiber doc → thread = `loom_move_doc` (drop rejected with a message when the doc isn't a loose fiber or the slot is taken).
- Ensure destructive tree action is **Archive** (default) with a separate confirmed **Delete**.

## Migration

A single one-pass command — `loom migrate-layout` (CLI) — because the changes are **rename-only, zero content rewrites** (identity + all links are frontmatter-ULID based; `findDocumentById` resolves by scanning frontmatter, not filenames):

1. `{threadId}-idea.md` → `idea.md`, `{threadId}-design.md` → `design.md`.
2. plan `{ULID}.md` → `plan-NNN.md` (ordinal by `created`), its done → `plan-NNN-done.md`.
3. chat `{ULID}.md` → `chat-NNN.md` (ordinal by `created`).
4. `--dry-run` first (mirrors `scripts/migrate-to-threads.ts`).

No weave-root doc sweep is needed — verified there are **no live weave-root docs** (only `loom/.archive/` and `loom/refs/`). The dead weave-root creation branches (`weaveIdea`/`weaveDesign`/`weavePlan` no-threadId path, weave-root `chatNew`) are removed so the invariant is enforced going forward, and those commands require a thread.

## Gate re-enable

Rename `.claude/settings.jsonDISABLED` → `.claude/settings.json`. The hook script `loom-mcp-gate.ps1` is intact and correct. (Confirm first *why* it was disabled — if it was firing on a legitimate path, fix that path before re-enabling.)

## Out of scope / deferred

- Per-doc human slugs for plan/done/chat beyond ordinals (Path B from the chat) — rejected in favour of ordinals; revisit only if browsing-by-name proves insufficient.
- Weave-level titles — weaves stay folder-named.
- Partial-chain (idea+design together) cross-thread moves — move the thread instead.

## Resolved decisions (were open questions)

- **Migration is its own command** — `loom migrate-layout`, not folded into `scripts/migrate-to-threads.ts`.
- **`loom_move_doc` hard-refuses** a doc with a `parent_id` (or children) — a loose fiber has no parent by definition; no auto-detach.
