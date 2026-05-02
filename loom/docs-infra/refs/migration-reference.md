---
type: reference
id: migration-reference
title: "Docs Migration Reference — Thread Assignment"
status: active
created: 2026-04-24
version: 2
tags: [migration, threads, docs-infra]
parent_id: null
child_ids: [organize-loom-plan-001]
requires_load: []
---

# Docs Migration Reference — Thread Assignment

## How to use

This table covers every `.md` under `weaves/`. All decisions resolved — ready for execution via `organize-loom-plan-001`.

## Legend

| Symbol | Meaning |
| :--- | :--- |
| 🗑️ | Delete — exact duplicate |
| 📦 | Archive to `_archive/superseded/` |
| ➡️ | Move to different weave |
| 🔧 | Fix frontmatter |
| ✅ | Decision resolved |

---

## weaves/core-engine

| docId | type | status | current parent_id | proposed thread | action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `core-engine-idea` | idea | draft | `workflow-idea` | `core-engine` | 🔧 parent_id → `null` (cross-weave) |
| `core-engine-design` | design | active | `core-engine-idea` | `core-engine` | — |
| `core-engine-plan-001` | plan | done | `core-engine-design` | `core-engine` | — |
| `core-engine-plan-002` | plan | done | `core-engine-design` | `core-engine` | — |
| `core-engine-plan-003` | plan | done | `core-engine-design` | `core-engine` | — |
| `move-thread-to-entities-plan-001` | plan | done | `core-engine-design` | `core-engine` | — |
| `core-tests-plan-001` | plan | done | `core-engine-design` | `core-engine` | — |
| `archived-document-link-handling-plan-001` | plan | active | `core-engine-design` | `core-engine` | — |
| `enforce-single-primary-design-plan-001` | plan | active | `core-engine-design` | 📦 `_archive/superseded` | ✅ superseded by thread model |
| `weave-and-thread-design` | design | active | `core-engine-design` | `weave-and-thread` | — |
| `weave-and-thread-plan-001` | plan | draft | `weave-and-thread-design` | `weave-and-thread` | — |
| `anchor-free-threads-design` | design | active | `core-engine-design` | 📦 `_archive/superseded` | ✅ superseded by weave-and-thread-design |
| `anchor-free-threads-plan-001` | plan | done | `anchor-free-threads-design` | 📦 `_archive/superseded` | ✅ same |
| `id-management-design` | design | active | `core-engine-design` | `id-management` | — |
| `id-management-plan-001` | plan | done | `id-management-design` | `id-management` | — |
| `body-generators-design` | design | active | `core-engine-design` | `body-generators` | — |
| `body-generators-plan-001` | plan | done | `body-generators-design` | `body-generators` | — |
| `path-utils-plan-001` | plan | done | `body-generators-design` | `body-generators` | — |
| `plan-table-utils-plan-001` | plan | done | `body-generators-design` | `body-generators` | — |
| `validation-utils-plan-001` | plan | done | `body-generators-design` | `body-generators` | — |
| `refactor-imports-plan-001` | plan | done | `body-generators-design` | `body-generators` | — |
| `base-doc-design` | design | active | `core-engine-design` | `base-doc` | — |
| `base-doc-plan-001` | plan | done | `base-doc-design` | `base-doc` | — |
| `link-index-design` | design | active | `core-engine-design` | `link-index` | — |
| `link-index-plan-001` | plan | done | `link-index-design` | `link-index` | 🔧 status `draft` → `done` |
| `app-layer-refactor-design` | design | draft | `null` | `app-layer-refactor` | — |
| `app-layer-refactor-plan` | plan | done | `null` | `app-layer-refactor` | 🔧 replace `design_id`+`target_version` → `parent_id: app-layer-refactor-design` |
| `loom-management-app-extraction-plan-001` | plan | done | `app-layer-refactor-design` | `app-layer-refactor` | — |
| `app-use-cases-completion-plan` | plan | done | `app-layer-refactor-design` | `app-layer-refactor` | — |
| `cli-delegate-directory-creation-plan-001` | plan | done | `app-layer-refactor-design` | `app-layer-refactor` | — |
| `done-doc-idea` | idea | draft | `core-engine-idea` | `done-doc` | — |
| `done-doc-design` | design | draft | `done-doc-idea` | `done-doc` | — |
| `done-doc-plan-001` | plan | done | `done-doc-design` | `done-doc` | — |
| `loom-state-entity-idea` | idea | active | `null` | `loom-state-entity` | — |
| `loom-state-entity-plan-001` | plan | done | `loom-state-entity-idea` | `loom-state-entity` | — |
| `state-filters-plan-001` | plan | done | `loom-state-entity-idea` | `loom-state-entity` | — |
| `dependency-tracking-design` | design | active | `core-engine-design` | `dependency-tracking` | — |
| `plan-steps-v2-design` | design | draft | `core-engine-design` | `plan-steps-v2` | — |
| `canonical-frontmatter-serializer-idea` | idea | broken | `null` | `canonical-frontmatter-serializer` | ✅ move from own weave into core-engine thread; 🔧 fix status → `done`, fix created date, fix title |
| `fs-extra-esm-reference` | reference | active | `null` | `—` (weave-level `references/`) | ✅ move from `weaves/tests/` into `core-engine/references/`; delete `tests/` weave |
| `app-query-use-cases-reference` | reference | active | `null` | `—` (weave-level) | — |
| **`plan-refactor-design`** | design | draft | `core-engine-design` | 🗑️ DELETE | exact duplicate of `plan-steps-v2-design.md` |
| **`core-engine-run-command-design`** | design | draft | `workflow-design-v2` | 🗑️ DELETE | exact duplicate of `weaves/workflow/workflow-run-command-design.md` |
| **`core-engine-feature-model-design`** | design | active v2 | `workflow-design` | ➡️ MOVE to `weaves/workflow/` as v2 | ✅ replaces v1 there; v1 → `_archive/superseded`; 🔧 remove `updated` field |
| **`core-engine-app-version-design`** | design | active | `workflow-design-v2` | ➡️ MOVE to `weaves/workflow/` | id is `workflow-app-version-design`; 🔧 remove stale `child_ids: [design-template.md]` |
| **`done/workflow-user-personalization-design`** | design | done | `workflow-design-v2` | ➡️ MOVE to `weaves/workflow/done/` | 🔧 remove stale `child_ids: [design-template.md, AI_INTEGRATION.md]` |
| `done-doc-chat` (chat) | — | — | — | `—` (weave-level chat) | no frontmatter — leave as loose chat |

---

## weaves/vscode-extension

| docId | type | status | current parent_id | proposed thread | action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `vscode-extension-design` | design | active | `workflow-design-v2` | `vscode-extension` | 🔧 parent_id → `null` |
| `vscode-extension-plan-004` | plan | done | `vscode-extension-design` | `vscode-extension` | — |
| `vscode-extension-plan-005` | plan | done | `vscode-extension-design` | `vscode-extension` | — |
| `vscode-extension-plan-006` | plan | done | `vscode-extension-design` | `vscode-extension` | — |
| `vscode-extension-plan-007` | plan | done | `vscode-extension-design` | `vscode-extension` | — |
| `vscode-extension-plan-008` | plan | implementing | `vscode-extension-design` | `vscode-extension` | — |
| `linkRepository-fix-plan-001` | plan | done | `vscode-extension-design` | `vscode-extension` | — |
| `vscode-tests-plan-001` | plan | done | `vscode-extension-design` | `vscode-extension` | — |
| `vscode-extension-toolbar-design` | design | active | `vscode-extension-design` | `vscode-extension-toolbar` | — |
| `vscode-extension-visual-design` | design | active | `vscode-extension-design` | `vscode-extension-visual` | — |
| `vscode-icons-design` | design | active | `vscode-extension-design` | `vscode-icons` | — |
| `vscode-icons-plan-001` | plan | done | `vscode-icons-design` | `vscode-icons` | — |
| `vscode-extension-user-personalization-design` | design | active | `vscode-extension-design` | `vscode-user-personalization` | — |
| `thread-status-filter-idea` | idea | draft | `vscode-extension-design` | `thread-status-filter` | 🔧 parent_id → `null` |
| `vscode-extension-ctx` | ctx | active | `vscode-extension-design` | `—` (weave-level) | — |
| `vscode-icons-chat` (chat) | — | — | — | `—` (weave-level chat) | — |
| `toolbar-icons-map-reference` | reference | active | — | `—` (weave-level `references/`) | — |

---

## weaves/ai-integration

| docId | type | status | current parent_id | proposed thread | action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ai-integration-design` | design | active | `core-engine-design` | `ai-integration` | 🔧 parent_id → `null` |
| `ai-chat-plan-001` | plan | done | `ai-integration-design` | `ai-integration` | — |
| `ai-promote-plan-001` | plan | done | `ai-integration-design` | `ai-integration` | — |
| `token-awareness-idea` | idea | deferred | `ai-integration-design` | `token-optimization` | ✅ idea is thread root; 🔧 parent_id → `null` |
| `ai-integration-token-optimization-design` | design | active | `ai-integration-design` | `token-optimization` | ✅ 🔧 parent_id → `token-awareness-idea` |
| `ai-integration-chat-titles-design` | design | active | `ai-integration-design` | `chat-titles` | — |
| `ai-command-palette-design` | design | draft | `core-engine-design` | `ai-command-palette` | 🔧 parent_id → `null` |
| `ai-command-palette-plan-001` | plan | done | `ai-command-palette-design` | `ai-command-palette` | — |
| `reference-load-context-design` | design | active | `core-engine-design` | `reference-load-context` | 🔧 parent_id → `null` |
| `load-when-design` | design | active | `reference-load-context-design` | `load-when` | ✅ own thread; 🔧 parent_id → `null` (was cross-thread) |
| `ai-transport-idea` | idea | deferred | `ai-integration-design` | `ai-transport` | — |

---

## weaves/multi-workspace

| docId | type | status | current parent_id | proposed thread | action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `multi-workspace-design` | design | done | `workflow-design-v2` | 📦 `_archive/superseded` | ✅ v1 superseded by mvp-design; 🔧 parent_id → `null` before archiving |
| `multi-workspace-mvp-design` | design | done | `multi-workspace-design` | `multi-workspace` | 🔧 parent_id → `null` (superseded design archived) |
| `multi-workspace-plan-001` | plan | done | `multi-workspace-mvp-design` | `multi-workspace` | — |

---

## weaves/workflow

| docId | type | status | current parent_id | proposed thread | action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `workflow-idea` | idea | draft | `workflow-idea` | `workflow` | 🔧 parent_id → `null` (self-reference) |
| `workflow-design-v2` | design | draft | `workflow-idea` | `workflow` | ✅ 🔧 status → `active` |
| `workflow-feature-model-design` (v1) | design | draft | `workflow-vscode-extension` | 📦 `_archive/superseded` | ✅ v2 from core-engine replaces it; 🔧 parent_id broken anyway |
| `workflow-feature-model-design` (v2, MOVE from core-engine) | design | active | `workflow-design` | `workflow-feature-model` | 🔧 parent_id → `workflow-design-v2`; remove `updated` field |
| `workflow-run-command-design` | design | draft | `workflow-design-v2` | `workflow-run-command` | — |
| `workflow-app-version-design` (MOVE from core-engine) | design | active | `workflow-design-v2` | `workflow-app-version` | 🔧 remove `child_ids: [design-template.md]` |
| `workflow-user-personalization-design` (MOVE from core-engine/done/) | design | done | `workflow-design-v2` | `workflow-user-personalization` | 🔧 remove stale child_ids |

---

## weaves/docs-infra

| docId | type | status | current parent_id | proposed thread | action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `docs-infra-directories-design` | design | active | `core-engine-design` | `docs-infra-directories` | 🔧 parent_id → `null` |
| `tutorial-plan-001` | plan | draft | `null` | `tutorial` | ✅ fast-track thread (plan as root, no design needed) |

---

## weaves/chats (rename from weaves/ai-chats/)

All files have no frontmatter. Keep as weave-level loose chats.

| file | action |
| :--- | :--- |
| `loom-setup-chat.md` | keep |
| `happy-path-chat.md` | keep |
| `next-chat.md` | keep |
| `next2-chat.md` | keep |
| `loom-contrains-chat.md` | keep |
| `next3-chat.md` | keep |
| `next4-chat.md` | keep |
| `roadmap.md` | ✅ deleted |

✅ Weave renamed `ai-chats/` → `chats/` (shorter, no redundancy — all session chats by definition)

---

## Resolved decisions

| # | Decision |
| :--- | :--- |
| 1 | `enforce-single-primary-design-plan-001` → `_archive/superseded` |
| 2 | `anchor-free-threads-design` + plan → `_archive/superseded` |
| 3 | `workflow-feature-model-design` v1 → `_archive/superseded`; v2 from core-engine becomes canonical |
| 4 | `multi-workspace-design` v1 → `_archive/superseded`; mvp-design is the thread design |
| 5 | `load-when-design` → own thread `load-when` in ai-integration |
| 6 | `canonical-frontmatter-serializer-idea` → thread `canonical-frontmatter-serializer` in core-engine; delete old weave |
| 7 | `fs-extra-esm-reference` → move to `core-engine/references/`; delete `tests/` weave |
| 8 | `weaves/ai-chats/` → rename to `weaves/chats/` |
| 9 | `tutorial-plan-001` → fast-track thread `tutorial` in docs-infra (plan as root) |
| 10 | `workflow-design-v2` → `status: active` |
| 11 | `token-awareness-idea` → root of `token-optimization` thread; `token-optimization-design` parent_id → `token-awareness-idea` |
