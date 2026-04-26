---
type: plan
id: directory-structure-plan-001
title: "Directory Structure Migration — weaves/ → loom/"
status: draft
created: 2026-04-26
version: 1
tags: [migration, structure, filesystem, core-engine]
parent_id: null
child_ids: []
requires_load: [workspace-directory-structure-reference, loom-architecture]
design_version: 1
---

# Directory Structure Migration — weaves/ → loom/

## Goal

Migrate the Loom repository from the old directory layout to the new canonical structure:

| Before | After |
|--------|-------|
| `weaves/` (docs root) | `loom/` |
| `references/` (at project root) | `loom/refs/` (flattened — no inner `loom/` subdir) |
| `_archive/` | `.archive/` |
| No `refs/` at weave/thread level | `refs/` available at all 3 levels |

Target structure: `loom/ctx.md` · `loom/refs/` · `loom/chats/` · `loom/.archive/` · `loom/{weave}/{thread}/`

---

## Steps

| # | Step | Files touched | Status |
|---|------|--------------|--------|
| **Phase 1 — Audit** | | | |
| 1 | Grep codebase for hardcoded `weaves/` path strings in `packages/` | `packages/fs/src/`, `packages/app/src/`, `packages/cli/src/`, `packages/vscode/src/` | ⬜ |
| 2 | Grep codebase for hardcoded `references/` path strings in `packages/` | Same as above | ⬜ |
| 3 | List all `_archive/` directories that need renaming to `.archive/` | All `weaves/**/_archive/` paths | ⬜ |
| **Phase 2 — Code: fs layer** | | | |
| 4 | Update `packages/fs/src/pathUtils.ts` — change weaves root constant from `weaves` to `loom` | `pathUtils.ts` | ⬜ |
| 5 | Update `packages/fs/src/pathUtils.ts` — change refs root constant from `references` to `loom/refs` if present | `pathUtils.ts` | ⬜ |
| 6 | Update `packages/fs/src/repositories/weaveRepository.ts` — any hardcoded `weaves` or `references` strings | `weaveRepository.ts` | ⬜ |
| 7 | Update `packages/fs/src/repositories/threadRepository.ts` — any hardcoded path strings | `threadRepository.ts` | ⬜ |
| 8 | Build all packages and fix any remaining compile errors | `./scripts/build-all.sh` | ⬜ |
| 9 | Run full test suite — confirm all tests pass before moving files | `./scripts/test-all.sh` | ⬜ |
| **Phase 3 — File system: main move** | | | |
| 10 | Rename `weaves/` → `loom/` | git mv | ⬜ |
| 11 | Move `references/` → `loom/refs/` (flatten: remove inner `loom/` subdirectory, merge contents up) | git mv | ⬜ |
| 12 | Rename all `_archive/` directories to `.archive/` inside `loom/` | find + git mv | ⬜ |
| 13 | Run full test suite again — confirm tests still pass against new paths | `./scripts/test-all.sh` | ⬜ |
| 14 | Manual VS Code extension check — tree view should show new `loom/` structure correctly | VS Code Extension Host | ⬜ |
| **Phase 4 — Docs: Loom's own design docs** | | | |
| 15 | Update `CLAUDE.md` — all `weaves/` and `references/` path references | `CLAUDE.md` | ⬜ |
| 16 | Update `references/CLAUDE-reference.md` → `loom/refs/CLAUDE-reference.md` path + content | `CLAUDE-reference.md` | ⬜ |
| 17 | Update `references/CLAUDE-template-reference.md` → `loom/refs/` path + content | `CLAUDE-template-reference.md` | ⬜ |
| 18 | Update `loom/refs/architecture.md` — directory structure section, all path examples | `architecture.md` | ⬜ |
| 19 | Update `loom/ai-integration/mcp/mcp-design.md` — all `weaves/` path references in resource/tool descriptions | `mcp-design.md` | ⬜ |
| 20 | Update `loom/ai-integration/mcp/plans/mcp-plan-001.md` — all `weaves/` path references in step descriptions | `mcp-plan-001.md` | ⬜ |
| 21 | Update `loom/core-engine/global-ctx/global-ctx-idea.md` — path references | `global-ctx-idea.md` | ⬜ |
| 22 | Update `loom/ai-integration/claude/claude-md/claude-md-idea.md` — path references | `claude-md-idea.md` | ⬜ |
| 23 | Update `README.md` — directory structure example + all `weaves/` refs | `README.md` | ⬜ |
| **Phase 5 — Docs: reference files** | | | |
| 24 | Verify `loom/refs/workspace-directory-structure-reference.md` is already up to date (written in this session) | `workspace-directory-structure-reference.md` | ⬜ |
| 25 | Update `loom/refs/cli-commands-reference.md` if it references path conventions | `cli-commands-reference.md` | ⬜ |
| 26 | Update `loom/refs/vscode-commands-reference.md` if it references path conventions | `vscode-commands-reference.md` | ⬜ |
| **Phase 6 — Final audit** | | | |
| 27 | Grep entire repo for remaining `weaves/` strings (excluding git history) — fix any stragglers | `rg "weaves/"` | ⬜ |
| 28 | Grep entire repo for remaining `references/` strings outside `loom/refs/` context | `rg "references/"` | ⬜ |
| 29 | Run full test suite one final time | `./scripts/test-all.sh` | ⬜ |
| 30 | Commit: "feat(structure): migrate weaves/ + references/ → loom/ + loom/refs/" | git | ⬜ |

---

## Notes

- **Steps 4–9 (code) before steps 10–14 (file moves):** fix code first, then move files. This way the test suite catches path regressions immediately after the move.
- **Step 11 (flatten references/):** `references/loom/architecture.md` → `loom/refs/architecture.md`. The inner `loom/` subdirectory is dropped since we're already inside `loom/refs/`. Other scoped subdirs (e.g. `references/superseeded/`) move as `loom/refs/superseeded/`.
- **Step 12 (`.archive/` rename):** hidden dotdirs are not shown in VS Code Explorer by default. Verify that `files.exclude` settings don't hide them accidentally. The Loom tree view should still show archive contents when navigating.
- **Step 14 (VS Code check):** the extension reads via `getState()` which calls `weaveRepository`. If step 6 was done correctly, the tree view will show `loom/` weaves. If the tree is empty, `pathUtils` wasn't updated.
