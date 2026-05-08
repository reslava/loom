---
type: design
id: de_01KQYDFDDBPFWTRWDMCAH1V45S
title: Unify ctx filenames to plain ctx.md
status: done
created: "2026-05-05T00:00:00.000Z"
updated: 2026-05-08
version: 2
tags: [ctx, naming, layout]
parent_id: id_01KQYDFDDB0AHWHNW6GTHKMR7P
requires_load: []
---

# Unify ctx filenames to plain `ctx.md` — Design

## Goal

Make `ctx.md` the single canonical filename for context-summary docs at every scope (global, weave, thread). Path = scope.

## Architecture

### Final layout

```
loom/ctx.md                              ← global ctx, id: loom-ctx
loom/{weave}/ctx.md                      ← weave ctx, id: {weave}-ctx
loom/{weave}/{thread}/ctx.md             ← thread ctx, id: {thread}-ctx
```

### Identity

- **Filename** = positional only (`ctx.md`).
- **Frontmatter `id`** = the durable semantic identifier. The link index reads `id` from frontmatter, never from the filename.
- The convention "filename matches id" applies to ideas/designs/plans/done/refs but NOT to ctx — ctx is the documented exception.

### Migration steps (covered by the plan)

1. Rename `loom/loom-ctx.md` → `loom/ctx.md`. Keep frontmatter `id: loom-ctx`.
2. Update path references in:
   - Recursive `CLAUDE.md` (session-start protocol, links).
   - `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts`.
   - `LOOM_CTX_MD` template (write target path) in `packages/app/src/installWorkspace.ts`.
   - Refs that mention the path: `architecture-reference.md`, `workspace-directory-structure-reference.md`, `CLAUDE-template-reference.md`, `CLAUDE-reference.md`.
3. Verify no code path hard-codes `loom-ctx.md` as a literal filename. The expected pattern is "compute path by scope, read id from frontmatter."
4. Confirm thread-level ctx uses single-file `ctx.md` (not `ctx/` directory). If any code expects the directory shape, change it to file.

### Code-path audit (to do as plan step 1)

Targets to grep:
- Literal `'loom-ctx.md'` or `"loom-ctx.md"` in any TS source.
- `'loom-ctx'` as an ID lookup vs as a filename.
- Any reference to a `ctx/` directory at thread level.
- The install template's write target (`loomCtxPath`).

If the audit finds hard-coded filenames, those become explicit plan steps.

### Backward compatibility

- The frontmatter `id` is unchanged (`loom-ctx` for the global). Anything that resolves docs by id continues to work.
- For any external tooling that uses the literal `loom/loom-ctx.md` path: add a short note to release notes. This is a known breaking change for path-based references (acceptable pre-1.0).

### Risk

Low. The only way this breaks is if a code path joins a hard-coded filename onto the loom root. The audit step in the plan catches that.

## Resolved design questions

- **Plain `ctx.md` vs `{id}-ctx.md`?** → Plain. Path-as-scope wins; the `id`-prefix form double-encodes information.
- **Single file vs `ctx/` directory at thread level?** → Single file. Directory form was deferred and never fully implemented.
- **Should the global ctx id change to just `ctx`?** → No. Keep `id: loom-ctx` to preserve any existing link references.

## Open design questions

- Should we add a deprecation shim that resolves `loom-ctx.md` → `ctx.md` for one release? → Probably no (pre-1.0; a clean break is fine), but call it out in the plan for explicit decision.
