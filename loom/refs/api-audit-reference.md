---
type: reference
id: rf_01KWKQH54YSWW1NJXYH38MGFSE
title: "API audit"
status: active
created: 2026-07-03
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
slug: api-audit
description: "Refactor-scoped inventory of every loom_* tool parameter + app naming smells for the api-contract-refactor thread — current→proposed rename table plus open convention questions. Archive after the refactor lands."
---
> **Refactor-scoped working doc** for the `core-engine/api-contract-refactor` thread (plan-001 step 3). Not a durable architectural fact — **archive once the refactor lands**. Lives in global `loom/refs/` only because thread-local refs hit the MCP gate with no create tool; the canonical convention is [api-naming-reference.md](api-naming-reference.md).

## Method

Inventoried every `loom_*` tool `inputSchema` (`packages/mcp/src/tools/*`) and each tool's `handle()` → app-input mapping. Classified each parameter; proposed the convention-conformant name (snake_case at the MCP boundary). Cast wide for non-ULID/Slug smells too (per the widened step-3 scope).

## MCP parameter inventory → proposed rename

**Weave references (weave is slug-identified → `weave_slug`):** every `weaveId` becomes `weave_slug`. Tools: `amend_req`, `archive`, `create_chat`, `create_design`, `create_plan`, `create_req`, `create_idea`, `finalize_req`, `generate_*`, `quick_ship`, `refresh_ctx`, `restore`, `search_docs`, `validate`, `verify_req`, `create_thread`. Variants: `create_weave.weaveId` → `weave_slug` (the new weave's slug); `rename_weave.weaveId` → `weave_slug`, `rename_weave.newWeaveId` → `new_weave_slug`; `move_thread.fromWeaveId`/`toWeaveId` → `from_weave_slug`/`to_weave_slug`; `promote.targetWeaveId` → `target_weave_slug`.

**Thread references (existing thread → `thread_ulid`):** `threadId` → `thread_ulid` in `amend_req`, `archive`, `create_chat`, `create_design`, `create_plan`, `create_req`, `create_idea`, `finalize_req`, `generate_*`, `quick_ship`, `restore`, `verify_req`, `append_done`, `move_thread`, `promote.targetThreadId` → `target_thread_ulid`. **Folder-slug (new/rename) → `*_slug`:** `create_thread.threadId` → `thread_slug` (the new folder); `rename_thread.threadId` → `thread_ulid` (identify the thread), `rename_thread.newThreadId` → `new_thread_slug` (the new folder name).

**Plan references (→ `plan_ulid`):** `planId` in `add_step`, `close_plan`, `complete_step`, `append_done`, `do_step`, `list_plan_steps`, `remove_step`, `reorder_steps`, `start_plan`, `update_step`. (Today each accepts *"ULID or filename stem"* — see Open Q2.)

**Other doc references (→ `*_ulid`):** `create_plan.parentId` → `parent_ulid`; `generate.chatId` → `chat_ulid`; `promote.sourceId` → `source_ulid`; `get/set_context_prefs.targetId` → `doc_ulid`; `rename.oldId` → needs inspection (generic doc rename — likely `doc_ulid`).

**Already conformant:** `rename_doc_file.newSlug` (→ `new_slug` in snake), `title`, `content`, `goal`, `query`, `notes`, `description`, `detail`, `priority`, `steps`, `type`. Minor: `create_thread.dependsOn` references thread ULIDs — consider `depends_on` (and document it carries `thread_ulid`s).

## Non-ULID/Slug naming smells (flagged, fixes deferred per EX5)

- **App use-case functions named with `weave` as a verb:** `weaveIdea` / `weaveDesign` / `weavePlan` read as "to weave an X" and collide with the *Weave* entity noun. The MCP tools are already `loom_create_*`; the app functions should be `createIdea` / `createDesign` / `createPlan` to match. **Follow-up** (function rename, wider than params).
- **`chatNew` (app)** — reversed verb-noun; should be `createChat` to match `loom_create_chat`. **Follow-up.**
- **The rename family is inconsistent:** `rename`, `rename_doc_file`, `rename_thread`, `rename_weave` — four tools with overlapping intent and mixed id/slug params. Worth a coherence pass. **Follow-up.**

## Convention questions — RESOLVED (step 4)

- **Q1 → carve-out adopted.** `*Id` banned only for entity ULIDs / folder slugs; structural handles (`step_id`, `IN`/`EX`/`C`) keep `id`/`*_id`.
- **Q2 → (b) strict ULID-only.** `*_ulid` accepts the ULID only; the old "ULID or filename stem" dual-accept is retired. A slug-keyed op becomes a separate method or optional param.
- **Q3 → family not unified** (four distinct ops). `loom_rename`→**`loom_retitle`** and `loom_rename_doc_file`→**`loom_rename_reference_file`** folded into step 7; broader family unification not needed.

Original write-up retained below for context.

**Q1 — structural handles that are neither a ULID nor a folder slug.** `stepId` (`remove_step`, `update_step`), `add_step.after`/`before`, and the requirement handles `IN`/`EX`/`C` are short string identifiers — *not* ULIDs (`stepId` is a kebab slug like `loom-patch-doc`) and *not* folder names. The blunt "ban `*Id`" rule doesn't fit: `step_ulid` is a lie, `step_slug` implies a folder. **Proposed carve-out:** `*Id` is banned only where the value is an *entity ULID* or a *folder slug*; a structural handle that is inherently neither may keep an `*Id`/explicit name (e.g. `step_id`). Decision needed.

**Q2 — dual-accept references (`plan_ulid` et al.).** `planId` today accepts *"ULID **or** filename stem."* Under the convention it becomes `plan_ulid` — but do we (a) keep resolving both (rename only), or (b) go ULID-only for a truly unambiguous contract? (a) is friendlier; (b) is stricter and matches "the name promises exactly one thing." Decision needed.

**Q3 — `rename.oldId` and the rename family.** Needs a closer read to classify `oldId` and decide whether the four rename tools should be unified. Can be handled in step 7, but flag now.
