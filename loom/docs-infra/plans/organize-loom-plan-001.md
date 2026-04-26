---
type: plan
id: organize-loom-plan-001
title: "Organize Loom Docs — Frontmatter Repair & Thread Assignment"
status: done
created: 2026-04-24
version: 2
tags: [migration, docs-infra, threads, frontmatter]
parent_id: null
child_ids: []
requires_load: [migration-reference]
---

# Organize Loom Docs — Frontmatter Repair & Thread Assignment

## Goal

Prepare all `weaves/` docs for the thread migration (Phase 7/8 of `weave-and-thread-plan-001`).
All decisions resolved in `migration-reference.md`. Execute in order: delete/archive → move → frontmatter fixes → parent_id chain fixes → structural changes.

## Steps

### Pass 1 — Delete & Archive

| Done | # | Step | Files touched | Notes |
|------|---|------|---------------|-------|
| ✅ | 1 | Delete exact duplicates: `core-engine/plan-refactor-design.md`, `core-engine/core-engine-run-command-design.md` | 2 files | Exact copies exist in correct locations |
| ✅ | 2 | Archive to `_archive/superseded/`: `anchor-free-threads-design.md`, `anchor-free-threads-plan-001.md`, `enforce-single-primary-design-plan-001.md` | 3 files in `core-engine/` | Superseded by thread model |
| ✅ | 3 | Archive to `_archive/superseded/` in workflow weave: `workflow-feature-model-design.md` v1 (v2 from core-engine replaces it), `multi-workspace-design.md` v1 | `workflow/workflow-feature-model-design.md`, `multi-workspace/multi-workspace-design.md` | Superseded by newer versions |
| ✅ | 4 | Rename `weaves/ai-chats/` → `weaves/chats/` | directory rename | Shorter, no redundancy |

### Pass 2 — Move Misplaced Files

| Done | # | Step | Files touched | Notes |
|------|---|------|---------------|-------|
| ✅ | 5 | Move `core-engine/core-engine-feature-model-design.md` → `workflow/workflow-feature-model-design.md` (overwrites v1 that was archived in step 3) | 1 file | v2 is the canonical version; fix `updated` field and `parent_id → workflow-design-v2` |
| ✅ | 6 | Move `core-engine/core-engine-app-version-design.md` → `workflow/workflow-app-version-design.md` | 1 file | id already correct (`workflow-app-version-design`) |
| ✅ | 7 | Move `core-engine/done/workflow-user-personalization-design.md` → `workflow/done/workflow-user-personalization-design.md` | 1 file | — |
| ✅ | 8 | Move `canonical-frontmatter-serializer/canonical-frontmatter-serializer-idea.md` → `core-engine/canonical-frontmatter-serializer/canonical-frontmatter-serializer-idea.md`; delete `canonical-frontmatter-serializer/` weave | 1 file + dir | Thread in core-engine |
| ✅ | 9 | Move `tests/references/fs-extra-esm-reference.md` → `core-engine/references/fs-extra-esm-reference.md`; delete `tests/` weave | 1 file + dir | Single-file weave absorbed into core-engine |

### Pass 3 — Frontmatter Fixes

| Done | # | Step | Files touched | Notes |
|------|---|------|---------------|-------|
| ✅ | 10 | Fix `canonical-frontmatter-serializer-idea.md`: status → `done`, created → `2026-04-15`, remove trailing `}` from title | `core-engine/canonical-frontmatter-serializer/canonical-frontmatter-serializer-idea.md` | Unfilled template |
| ✅ | 11 | Fix `link-index-plan-001.md`: status `draft` → `done`; remove non-canonical `design_version`, `target_version`; add `child_ids: []` | `core-engine/done/link-index-plan-001.md` | In `done/` but wrong status |
| ✅ | 12 | Fix `workflow-idea.md`: parent_id self-reference → `null` | `workflow/workflow-idea.md` | — |
| ✅ | 13 | Fix `workflow-design-v2.md`: status `draft` → `active`; remove non-canonical `updated` field | `workflow/workflow-design-v2.md` | — |
| ✅ | 14 | Fix `app-layer-refactor-plan-001.md`: replace `design_id` + `target_version` → `parent_id: app-layer-refactor-design`; add canonical `child_ids: []` | `core-engine/done/app-layer-refactor-plan-001.md` | Old pre-canonical format |
| ✅ | 15 | Remove stale `child_ids` pointing to non-existent template files: `workflow-app-version-design` → `[]`, `workflow-user-personalization-design` → `[]` | 2 files in `workflow/` | `design-template.md`, `AI_INTEGRATION.md` don't exist |
| ✅ | 16 | Remove `updated` non-canonical field from `workflow-feature-model-design.md` (v2, now moved to workflow/) — done in Pass 2 step 5 | `workflow/workflow-feature-model-design.md` | Not in canonical schema |

### Pass 4 — parent_id / child_ids Chain Fixes

| Done | # | Step | Files touched | Notes |
|------|---|------|---------------|-------|
| ✅ | 17 | Fix cross-weave parent_ids → `null` (cross-weave links belong in `requires_load` only): `core-engine-idea`, `vscode-extension-design`, `ai-integration-design`, `reference-load-context-design`, `ai-command-palette-design`, `docs-infra-directories-design` | ~6 files | parent_id is intra-thread only |
| ✅ | 18 | Fix `thread-status-filter-idea.md` parent_id: `vscode-extension-design` → `null` | `vscode-extension/thread-status-filter-idea.md` | Idea is thread root |
| ✅ | 19 | Fix token-optimization thread chain: `token-awareness-idea` parent_id → `null`; `ai-integration-token-optimization-design` parent_id → `token-awareness-idea` | `ai-integration/token-awareness-idea.md`, `ai-integration/ai-integration-token-optimization-design.md` | Idea is now thread root |
| ✅ | 20 | Fix `load-when-design` parent_id: `reference-load-context-design` → `null` (now own thread) | `ai-integration/load-when-design.md` | — |
| ✅ | 21 | Fix `multi-workspace-mvp-design` parent_id: `multi-workspace-design` → `null` (v1 archived) | `multi-workspace/multi-workspace-mvp-design.md` | — |
| ✅ | 22 | Fix `workflow-feature-model-design` parent_id: `workflow-design` → `workflow-design-v2` (correct id) — done in Pass 2 step 5 | `workflow/workflow-feature-model-design.md` | Broken ref fixed |
| ✅ | 23 | Update child_ids in designs where plans were added or threads changed (audit: core-engine-design, vscode-extension-design, ai-integration-design) | ~3 files | Ensure child_ids lists are consistent with actual plan files |

### Pass 5 — Verify

| Done | # | Step | Files touched | Notes |
|------|---|------|---------------|-------|
| ✅ | 24 | Run `loom status` (or `loadWeave`) against each weave; all must load without errors | all weaves | All 6 weaves ACTIVE; chat files skipped as expected |
| ✅ | 25 | Confirm `weaves/` has no stale references in `requires_load` pointing to moved files | all weaves | Fixed 3 stale refs: weave-and-thread-design (anchor-free), vscode-tests-plan-001 (tests/ path), multi-workspace-mvp-design (archived v1) |

## Outcome

After this plan:
- No duplicate files; no misplaced docs
- All frontmatter canonical (no `role`, `design_id`, `target_version`, `updated` fields)
- `parent_id` always intra-thread; cross-weave refs in `requires_load` only
- Superseded docs in `_archive/superseded/`, not cluttering active weaves
- `weaves/chats/` replaces `weaves/ai-chats/`; one-file weaves (`tests/`, `canonical-frontmatter-serializer/`) absorbed
- Phase 7 migration script can run on clean inputs
