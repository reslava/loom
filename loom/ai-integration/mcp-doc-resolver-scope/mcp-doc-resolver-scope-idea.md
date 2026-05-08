---
type: idea
id: id_01KQYDFDD9W0YYAC3FPN2PAVH0
title: MCP doc resolver scope and ID disambiguation
status: done
created: "2026-05-05T00:00:00.000Z"
updated: 2026-05-08
version: 3
tags: []
parent_id: null
requires_load: []
---
# MCP doc resolver scope and ID disambiguation

## What

The MCP server's `findDoc` (or doc-by-id resolver) currently has two related defects that together make `id`-keyed MCP tools (`loom_archive`, `loom_update_doc`, `loom_rename`, `loom_complete_step`, etc.) unsafe in any workspace that has stray `.md` files outside the Loom canon:

1. **Out-of-scope indexing.** The resolver walks `.md` files outside `loom/**`. Concrete failure observed 2026-05-05: `loom_archive(id="loom")` archived `docs/internal/backup/.cursor/rules/.archive/loom.md` instead of the intended `loom/refs/loom.md`. Backup folders, IDE rules folders, vendored content, README.md files in `packages/`, etc. should never be candidates.
2. **Silent ambiguity.** When two docs in the workspace share an id (or share a filename that resolves to the same id), the resolver picks one without warning. Tools that mutate state (archive, update, rename) then mutate the wrong doc.

## Why this matters

- **Data loss risk.** A user calls `loom_archive(id="vision")` expecting `loom/refs/vision.md`. If a different `vision.md` exists somewhere (e.g. a leftover scratch file), the wrong doc gets archived. The user thinks they archived their north-star doc; they didn't.
- **Trust breakage.** This is exactly the failure class that erodes confidence in MCP. The user can no longer assume `id="X"` resolves to the obvious `X`. Every call becomes "did it touch what I meant?"
- **Compounding with other bugs.** ID-keyed tools are everywhere in the MCP surface (`loom_complete_step`, `loom_rename`, `loom_update_doc`, `loom_promote`...). Every one of them is silently wrong when this bug fires.
- **Blocks the gate's value.** Track 1 introduced a hook forcing all writes through MCP. If the MCP doc resolver is unsafe, the gate just routes every write through a leaky pipe instead of an honest one.

## Success criteria

- The resolver only considers files under the workspace's `loom/` root (the canonical Loom doc tree). Anything outside is invisible to id-based lookups.
- When two docs match an id, the tool fails loudly with an error that names both candidates. The user (or AI) decides explicitly.
- Existing tools that already worked continue to work — no behavior change for the common case.
- A regression test exists that places a stray `.md` with a colliding id outside `loom/` and confirms the resolver ignores it.

## Out of scope (for this idea)

- Path-based addressing as an alternative to id-based addressing. Tempting (`loom_archive(path="loom/refs/loom.md")`) but a separate idea — solving ambiguity at the API surface rather than inside the resolver.
- Cleaning up vendored / stray `.md` files in this specific repo. That's housekeeping; the fix is the scope rule.
- Frontmatter `id` validation across the workspace (detecting that two docs literally declare the same `id:` value). Useful but separate.

## Connection to other Loom concerns

- **`.archive/` enhancement** (per Rafa's note 2026-05-05): if `loom/.archive/` becomes a richer subtree (cancelled / chats / deferred / superseded subfolders), the resolver must continue to find archived docs by id when needed (e.g. unarchive). The fix here must not accidentally hide `.archive/` content from the resolver — only confine the search to `loom/**`.
- **`requires_load`** resolution probably uses the same resolver. Same scope rule applies — no risk of `requires_load: [vision]` resolving to a stray `vision.md` outside `loom/`.

## Open questions for design

1. Should the resolver fail loudly on ambiguity, or fall back to a precedence order (e.g. prefer `loom/{weave}/{thread}/...` over `loom/refs/...` over `loom/.archive/...`)? Failing loud is safer; precedence is friendlier.
2. Is the canonical scope `${LOOM_ROOT}/loom/**` or `${LOOM_ROOT}/**` minus blacklisted dirs (`node_modules`, `.git`, `.archive` ambiguity, etc.)? Allowlist vs denylist.
3. Should tests cover the case where `LOOM_ROOT` is itself a directory containing the substring `loom` (this repo's situation)? Yes — write the test to prove cwd-anchoring works.
