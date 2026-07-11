---
type: idea
id: id_01KX726T6ETMPSAK6TCZA35M06
title: CLI parity for human tree-management ops (Pure-agent completeness)
status: done
created: 2026-07-10
updated: 2026-07-11
version: 3
tags: []
parent_id: null
requires_load: []
---
# CLI parity for human tree-management ops (Pure-agent completeness)

## What we want to build

Close the remaining **CLI ⇄ MCP** coverage gap surfaced by the `cli-mcp-command-parity` final sweep: a cluster of **human doc/tree-management operations** that exist as MCP tools **and** extension tree buttons but have **no CLI twin**. Without them, the extension-free **③ Pure agent** way (a terminal-only user on any MCP host) cannot fully manage the doc graph from the terminal.

## The gap (MCP tool / extension button → missing CLI command)

| Operation | MCP tool | Extension | CLI today |
|-----------|----------|-----------|-----------|
| Archive a doc/thread/weave | `loom_archive` | ✅ menu | ❌ |
| Delete | `loom_delete` | ✅ menu | ❌ |
| Restore from archive | `loom_restore` | ✅ menu | ❌ |
| Rename a thread folder | `loom_rename_thread` | ✅ | ❌ |
| Move a thread to another weave | `loom_move_thread` | ✅ (DnD) | ❌ |
| Rename a weave | `loom_rename_weave` | ✅ | ❌ |
| Set thread priority (roadmap order) | `loom_set_priority` | ✅ (DnD) | ❌ |
| Set thread deps | `loom_set_thread_deps` | ✅ | ❌ |
| Promote (chat→idea→design→plan) | `loom_promote` | ✅ | ❌ |
| Close a plan | `loom_close_plan` | ✅ | ❌ (has start-plan, complete-step) |
| Quick-ship a done plan | `loom_quick_ship` | — | ❌ (the "do quick" terminal op) |

## Naming mismatches to clean up in the same pass

- **`rename` vs `retitle`** — CLI `loom rename <doc> <new-title>` maps to MCP `loom_retitle` (title change), while MCP *also* has `loom_rename_reference_file` (filename). The verbs don't line up across surfaces; reconcile per the tri-surface parity rule.
- **Extension doc-create buttons are mislabeled `weave`** — `loom.weaveIdea/weaveDesign/weavePlan` each call `loom_create_idea/design/plan` with **no content** (verified in the command handlers: title/goal only, no AI, no sampling). They are plain **empty-doc creates**, *not* AI `generate`. Rename them `loom.createIdea/createDesign/createPlan` to mirror the CLI `loom create <type>` namespace and the `loom_create_*` tools, and normalize `loom.weaveCreate` → `loom.createWeave` in the same pass (verb-first consistency). Pure rename — no behavior change. (`generate` stays the verb for the AI-sampling authoring path; `weave` is a noun, never a verb.)

## Why it matters

- **Way ③ (Pure agent) is a headline promise** in `docs/WAYS-TO-USE-LOOM.md` — "terminal-only, any MCP host." Today a terminal user with no extension literally cannot archive/delete/rename-thread/reorder from the CLI. The parity contract's *availability clause* is not yet satisfied for way ③.
- These are the **NO-AI tree operations** the vision explicitly lists ("new, delete, rename, drag & drop"). They belong on every human surface.

## Success criteria

- Every human tree-management op above has a slug/human-first `loom <verb>` command mirroring its MCP tool name.
- The `rename`/`retitle` (CLI retitles under a `rename` verb) and extension `weave*` → `create*` naming is reconciled per the tri-surface parity rule.
- Way ③ in `docs/WAYS-TO-USE-LOOM.md` is fully runnable from the terminal (re-audit).

## Non-goals

- Agent-only workflow tools (`loom_do_step`, `loom_read_chat_tail`, `loom_append_to_chat`, `loom_append_done`, `loom_patch_doc`, `loom_update_doc`) correctly stay single-surface — no CLI twin, per the parity rule's single-audience clause.
