---
type: plan
id: pl_01KQYDFDDBS518N4PX97V1Q9SS
title: Unify ctx Filenames to ctx.md
status: done
created: "2026-05-05T00:00:00.000Z"
updated: 2026-05-08
version: 2
design_version: 1
tags: [ctx, naming, layout, refactor, mvp]
parent_id: de_01KQYDFDDBPFWTRWDMCAH1V45S
requires_load: [rf_01KQYDFDDDYZC0R4XNNX2RASC9]
---

# Unify ctx Filenames — Implementation Plan

## Goal

Rename `loom/loom-ctx.md` → `loom/ctx.md` and update all path references across the recursive `CLAUDE.md`, the `LOOM_CLAUDE_MD` install template, the `LOOM_CTX_MD` write target, and the refs. Verify no code hard-codes the old filename.


# Steps


## Phases

| Phase | Scope | Steps |
|-------|-------|-------|
| 1 | Code-path audit | 1 |
| 2 | Rename + update path references | 2–4 |
| 3 | Verify build + visibility rules still work | 5 |

---

## Phase 1 — Code-path audit

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
|      | 1 | Grep the entire repo for hard-coded `'loom-ctx.md'` / `"loom-ctx.md"` literals (TS, JS, MD). Report each occurrence and classify: (a) path reference in CLAUDE.md/refs/templates that should be updated, (b) code logic that joins the filename onto the loom root and needs a refactor, (c) historical mention in archive/done that can stay. Produce a list to drive steps 2–4. | grep across `packages/`, `loom/`, root files | — |

---

## Phase 2 — Rename and update path references

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
|      | 2 | Rename `loom/loom-ctx.md` → `loom/ctx.md`. Frontmatter `id` stays `loom-ctx`. | `loom/ctx.md` (renamed), `loom/loom-ctx.md` (removed) | 1 |
|      | 3 | Update path references in the recursive `CLAUDE.md` (session-start protocol section + any links) and in the `LOOM_CLAUDE_MD` template + the `LOOM_CTX_MD` write target inside `packages/app/src/installWorkspace.ts`. | `CLAUDE.md`, `packages/app/src/installWorkspace.ts` | 2 |
|      | 4 | Update path references in the refs that document the layout: `loom/refs/architecture-reference.md`, `loom/refs/workspace-directory-structure-reference.md`, `loom/refs/CLAUDE-template-reference.md`, `loom/refs/CLAUDE-reference.md`, `loom/refs/loom-reference.md`. Also confirm the diagrams (`loom/{weave}/ctx.md`, `loom/{weave}/{thread}/ctx.md`) match the unified shape — single file, not directory. | files listed under "files touched" | 2 |

---

## Phase 3 — Verify build + visibility rules

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
|      | 5 | Run `cd packages/vscode && npm run package` to confirm everything still compiles. Fix any path-string failures revealed by the audit (step 1 category b). Spot-check that the `📘 loom-ctx loaded` visibility line still fires by re-reading `CLAUDE.md` session-start protocol — the path it points to must now be `loom/ctx.md`. | (depends on audit findings) | 4 |

**Notes:**
- Frontmatter `id: loom-ctx` is preserved. All link-index lookups continue to resolve.
- If the audit finds the thread-level `ctx/` directory shape referenced anywhere in code (vs the documented `ctx.md` file), add a step 6 to fix it. Otherwise the unification is purely a path-rename + docs sweep.
- This plan does NOT touch any existing weave-level `ctx.md` files (those already follow the convention). Only the global is being renamed.

## Out of scope

- A deprecation shim that resolves `loom-ctx.md` → `ctx.md`. Pre-1.0; clean break is fine. Note in release notes.
- Generating any new ctx files. This plan only renames the existing one.
