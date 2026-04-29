---
type: chat
id: directory-structure-chat
title: "Directory Structure Chat"
status: active
created: 2026-04-26
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
# CHAT

## Rafa:

### Problem
Before going on, we need to settle down definitely the directory structure.

### Main directories
I am thinking about grouping all Loom files in:
`.loom`: project config
`loom`: project docs 

### Migration
- rename `weaves` to `loom`
- move `references/` to `loom/references/`    ← static architectural facts (architecture.md, etc.)
- move `_archive/` to `loom/_archive/`        ← archived docs: cancelled, chats, deferred, superseded

### 3 levels
1. loom: project
2. loom/{weave}: weave 
3. loom/{weave}/{thread}: thread

These docs, directories could be created and located in all 3 levels:

- `ctx.md`                 
- `reference/`
- `chats/`              


### Goal
Much more clear, clean, compact, less disperse and easy to localize loom documents. 

### TODO
First I would like to know what you think? Agree?

## AI:

Agree — and the timing is right. Doing this **before** the MCP server is implemented means the migration cost is minimal: the MCP design docs reference `weaves/` paths, but those are still just markdown. Once `packages/mcp/` is built against `weaves/`, the path refactor becomes a code migration too. Now is the moment.

### What the structure gains

| Before | After | Why better |
|--------|-------|-----------|
| `weaves/` at project root | `loom/` at project root | Immediately signals "Loom is installed here" — no metaphor to learn |
| `references/` alongside `weaves/` | `loom/references/` inside `loom/` | All Loom docs in one place; one boundary to know |
| `_archive/` alongside `weaves/` | `loom/_archive/` | Consistent location |
| `chats/` only at some levels | `chats/` at all 3 levels | Uniform — any scope can have AI conversations |
| `references/` only at root | `references/` at all 3 levels | Weave-scoped or thread-scoped architectural notes are natural |

The 3-level symmetry (`ctx.md`, `references/`, `chats/` available at project / weave / thread) is the cleanest part of this. It removes the "where do I put this?" question.

### One question: the Loom repo's own paths

In the Loom project itself, the architecture reference is currently `references/loom/architecture.md`. After migration it becomes `loom/references/loom/architecture.md` — slightly redundant (`loom/references/loom/`). Two options:

**A.** Accept it — the inner `loom/` subdirectory is the scope label, which is valid.  
**B.** Flatten — the Loom project's own references don't need the `loom/` scope subfolder since they're already inside `loom/references/`. So `loom/references/architecture.md` directly.

I'd go with **B** for the Loom project itself. Simpler path, no redundant nesting.

### `.loom/` stays separate — agreed

`.loom/` = config and tool state (hidden, managed by Loom).  
`loom/` = docs (visible, owned by user + AI together).  
Clean separation. `.loom/` may contain only a `config.json` or similar in Stage 2 once `_status.md` is dropped.

### Migration scope

| What changes | Impact |
|-------------|--------|
| Rename `weaves/` → `loom/` | File rename, all path references in docs update |
| Move `references/` → `loom/references/` | File move |
| Update `CLAUDE.md` + `CLAUDE-reference.md` | Path references |
| Update all design docs / plans (mcp-plan-001, etc.) | Inline path references |
| Update `pathUtils.ts` / `weaveRepository.ts` in `packages/fs/` | Code: root path constant |
| Update MCP design doc URIs (they reference `weaves/ctx.md`, etc.) | Docs only |
| Update `references/loom/architecture.md` directory structure section | One table |

Code impact is probably 1–3 files in `packages/fs/` (wherever the `weaves` root path is defined). The rest is doc updates.

Want me to proceed with the migration?

## Rafa:

For your question
### One question: the Loom repo's own paths
**B.** Flatten

### Other names or abbreviations
I observed you were thinking in `refs` for `reference`
We need to settle down also this kind of names.
Let me know if you have better semantical correct, less verbose approaches for:
- cts
- reference
- _archive
- chat
Or other suggestion you have...

## AI:

Good — **B (flatten)** confirmed for the Loom repo's own references.

### Naming evaluation

| Name | Keep? | Recommendation | Reasoning |
|------|-------|---------------|-----------|
| `ctx` | ✅ | Keep as-is | Already the right length. Semantic: "AI-generated context summary." Nothing shorter adds clarity. |
| `references/` | → | **`refs/`** | Saves chars, widely understood (git uses `refs/`). Still semantic: "things to look up." |
| `_archive/` | ~ | **Keep, but read note** | Semantically correct. Convention caveat below. |
| `chats/` | ✅ | Keep as-is | Clear, natural plural. `chat/` singular would be inconsistent with `plans/`, `done/`. |

**`_archive/` note — the underscore sorts to the top, not the bottom.**  
In VS Code Explorer, `_archive` sorts before `a`-named dirs because `_` (ASCII 95) < `a` (ASCII 97). If the goal is "out of the way", it ends up at the top instead. Two alternatives if this bothers you:
- `z_archive/` — sorts to the bottom reliably
- `.archive/` — hidden (dotfile convention), invisible by default in most explorers

Personally I'd go with `.archive/` — it's invisible by default (like `.git/`), which is exactly right for "you rarely need to look here." But it's a stronger change. If you want it visible but clearly de-emphasized, `z_archive/` is cleaner than `_archive/`.

---

### Proposed final names

```
loom/                       ← project docs root
  ctx.md                    ← global context summary
  refs/                     ← static architectural facts  (was references/)
  chats/                    ← AI conversation logs
  .archive/ (or z_archive/) ← archived docs             (was _archive/)
  {weave}/
    ctx.md
    refs/
    chats/
    .archive/
    {thread}/
      {thread}-idea.md
      {thread}-design.md
      ctx/
      refs/
      chats/
      plans/
      done/
      .archive/
.loom/                      ← project config (hidden, tool-managed)
```

Compact, consistent, no surprises. All four names (`ctx`, `refs`, `chats`, `.archive`) are short and unambiguous.

What's your call on archive? Keep `_archive`, go `.archive`, or `z_archive`?

## Rafa:

I like all your suggestion and pick `.archive`
I like this structure much more

### TODO
1. Update `references/workspace-directory-structure-reference.md`
2. Create a plan `weaves/core-engine/directory-structure/plans/directory-structure-plan-001.md` for migration

## AI:

Done. `.archive/` confirmed — good call.

**1. `references/workspace-directory-structure-reference.md`** — rewritten (v1→v2). Now reflects the target structure: `loom/` root, `refs/` at all 3 levels, `chats/` at all 3 levels, `.archive/` at all 3 levels, `ctx.md`/`ctx/` distinction. Includes the 3-level scope table, updated frontmatter reference with `design_version`/`load_when`, ctx hierarchy, and stale detection rules. Note at top points to the migration plan.

**2. `weaves/core-engine/directory-structure/plans/directory-structure-plan-001.md`** — 30-step migration plan across 6 phases:
- Phase 1 (steps 1–3): Audit — grep `packages/` for hardcoded `weaves/`/`references/` strings before touching anything
- Phase 2 (steps 4–9): Code first — update `pathUtils.ts`, `weaveRepository.ts`, `threadRepository.ts`, build + test
- Phase 3 (steps 10–14): File moves — rename `weaves/` → `loom/`, move `references/` → `loom/refs/` (flattened), rename all `_archive/` → `.archive/`, test + VS Code check
- Phase 4 (steps 15–23): Loom's own design docs — CLAUDE.md, CLAUDE-reference.md, mcp-design.md, mcp-plan-001.md, architecture.md, README.md, idea docs
- Phase 5 (steps 24–26): Reference files
- Phase 6 (steps 27–30): Final audit grep + full test + commit

Key ordering decision: code changes go before file moves so the test suite catches path regressions immediately after the rename.

## Rafa:

Do `weaves/core-engine/directory-structure/plans/directory-structure-plan-001.md`
Phase 1, 2, 3, commit

## Rafa: 

as we already agreed `.archive` is the final name and exists in 3 levels 
1. project (loom)
2. workstream (weave)
3. thread
now they are correct

continue with commit

reply inside this doc

## AI:

Phase 1, 2, 3 committed — `cddce8f`.

180 files: `weaves/` → `loom/`, `references/` → `loom/refs/`, `_archive/` → `loom/.archive/` (all 3 levels).

Next: Phase 4 (docs) or waiting for direction.

## Rafa:

Do Phases 4, 5, 6
Commit

## AI:

Phases 4, 5, 6 committed — `cf54d80`.

11 docs updated: `CLAUDE.md`, `CLAUDE-reference.md`, `CLAUDE-template-reference.md`, `architecture-reference.md`, `README.md`, `CONTRIBUTING.md`, `docs/CONFIGURATION.md`, `mcp-plan-001.md`, `global-ctx-idea.md`, `claude-md-idea.md`, `workspace-directory-structure-reference.md`.

Remaining `weaves/` hits are all historical chat logs (preserved as written). Tests clean (1 pre-existing failure unrelated to migration).

Migration complete.