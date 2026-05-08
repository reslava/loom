---
type: idea
id: id_01KQYDFDDB0AHWHNW6GTHKMR7P
title: Unify ctx filenames to plain ctx.md
status: done
created: "2026-05-05T00:00:00.000Z"
updated: 2026-05-08
version: 2
tags: [ctx, naming, layout]
parent_id: null
requires_load: []
---

# Unify ctx filenames to plain `ctx.md`

## Problem

Today Loom has three different ctx-doc shapes depending on level:

- Global: `loom/loom-ctx.md` — has the awkward `loom-loom` doubling.
- Weave: `loom/{weave}/ctx.md` — already plain.
- Thread: either `{thread}/ctx/` directory or `{thread-id}-ctx.md` file — refs disagree.

The inconsistency hurts in three ways:

1. **Cognitive overhead.** "Where is the ctx for this scope?" depends on the level. Path is no longer a deterministic function of scope.
2. **Generator complexity.** Auto-ctx-generation has to compute different filenames at different levels.
3. **The `loom/loom-ctx.md` path looks like a typo.** Every new contributor asks about it.

## Idea

Unify all ctx files to plain `ctx.md`, located by scope:

```
loom/ctx.md                              ← global ctx
loom/{weave}/ctx.md                      ← weave ctx
loom/{weave}/{thread}/ctx.md             ← thread ctx
```

One name, three locations. Path = scope, no name lookup needed.

## Why now

- The MVP work on visibility and context injection touches the global ctx path in CLAUDE.md and the install template. Doing the rename in the same window avoids a second sweep later.
- Cost is bounded: ~10–15 path occurrences across CLAUDE.md, the install template, and refs. No code logic change — frontmatter `id` carries the semantic identity, not the filename.

## Resolved (see design)

- Plain `ctx.md`, not `{id}-ctx.md`. Single file per level, not a directory.
- Frontmatter `id` field carries the semantic identity (e.g., `id: loom-ctx`). Filename is purely positional.
- `loom/loom-ctx.md` → `loom/ctx.md` (the global ctx keeps its `id: loom-ctx` to preserve link references).

## Open questions

- Should the install template (`installWorkspace.ts`) write `loom/ctx.md` or wait for an explicit user command? → Write at install time, same as today's `loom-ctx.md`.
- Are there any code paths that hard-code `loom-ctx.md` as a filename rather than reading the `id` from frontmatter? → To verify in the design / first plan step.

## Next step

design
