---
type: design
id: de_01KX84P2MMQTQ32M0WYWBZP9J6
title: CLI parity for human tree-management ops — design
status: done
created: 2026-07-11
updated: 2026-07-11
version: 3
idea_version: 3
tags: []
parent_id: id_01KX726T6ETMPSAK6TCZA35M06
requires_load: []
---
# CLI parity for human tree-management ops — design

## Goal

Give the extension-free **③ Pure agent** way full terminal reach over the human doc/tree-management operations that today exist only as MCP tools + extension buttons, and reconcile the verb-naming drift across CLI ⇄ MCP ⇄ extension — in one pass, per the tri-surface parity rule. When this thread is done, every NO-AI tree op the extension exposes as a tree button is runnable as a slug/human-first `loom` command, and no surface uses a verb that lies about what it does.

## Grounding (verified against source, not assumed)

- The 11 gap ops in the idea are confirmed absent from `packages/cli/src/index.ts` — the CLI today has only `rename`, `start-plan`, `complete-step`, `set-status`, `create *`, plus read/migrate/release commands.
- `loom rename <doc> <new-title>` calls the app `rename` use-case, which changes the **title** and leaves id/filename intact — it is a *retitle* wearing a `rename` name (`packages/cli/src/commands/rename.ts`).
- The extension `weaveIdea/weaveDesign/weavePlan` handlers each call `loom_create_*` with **no content** — empty-doc creates, not AI generates (`packages/vscode/src/commands/weave{Idea,Design,Plan}.ts`). Renaming them `create*` is a correctness fix, not a style choice.
- Every gap op already has an app use-case (the MCP tools call them); the CLI wires thin slug-first wrappers to the same use-cases, exactly like `rename.ts` does today.

## Approach

Two independent workstreams, shippable in either order:

**A. New CLI commands** — one thin `loom <verb>` per gap op, slug/human-first, resolving friendly refs to a ULID at the CLI edge (the established pattern in `create*` and `resolve-ulid`), delegating to the existing app use-case. No new app/core/fs logic — pure delivery-layer wiring.

**B. Naming reconciliation** — retire the misleading CLI `rename`→retitle mapping, and rename the extension `weave*` doc-create buttons to `create*`.

### A. CLI command surface (mirrors the MCP tool names)

| New CLI command | Mirrors MCP | Args (slug/human-first) | Notes |
|-----------------|-------------|--------------------------|-------|
| `loom archive <weave> [thread]` | `loom_archive` | weave, optional thread | reversible (restore exists) |
| `loom delete <doc>` / `loom delete <weave> [thread]` | `loom_delete` | doc ULID/stem, or weave/thread folder | destructive — see Decision 2 |
| `loom restore <archived-path>` | `loom_restore` | archived item path | inverse of archive |
| `loom rename thread <weave> <thread> <new-slug>` | `loom_rename_thread` | folder slug rename | see Decision 1 |
| `loom rename weave <slug> <new-slug>` | `loom_rename_weave` | folder slug rename | see Decision 1 |
| `loom rename reference <slug> <new-slug>` | `loom_rename_reference_file` | ref filename slug | see Decision 1 |
| `loom retitle <doc> <new-title>` | `loom_retitle` | title change | **replaces** today's `rename` |
| `loom move-thread <weave> <thread> <target-weave>` | `loom_move_thread` | relocate a thread | |
| `loom set-priority <weave> <thread> <priority>` | `loom_set_priority` | roadmap order | |
| `loom set-thread-deps <weave> <thread> <dep...>` | `loom_set_thread_deps` | dep refs → ULIDs at edge | |
| `loom promote <doc> <type> --body-file <path>` | `loom_promote` | chat→idea→design→plan | see Decision 3 |
| `loom close-plan <plan>` | `loom_close_plan` | finalize a done plan | |
| `loom quick-ship <weave> <thread> --goal <g> --step <s>…` | `loom_quick_ship` | one-action done plan | see Decision 4 |

The pre-ULID-friendly commands stay as they are; each new command follows the `createIdeaCommand` shape — take slugs, resolve to a ULID at the edge (`resolveThreadFolder` / `findDocumentById`), call the app use-case, print a green confirmation.

### B. Naming reconciliation

**CLI `rename` → `retitle` + a `rename` namespace.** Today's `loom rename <doc> <new-title>` becomes `loom retitle <doc> <new-title>` (it changes the title). The `rename` verb is freed to mean *rename the name/slug* — mirroring MCP's `loom_rename_thread/weave/reference_file` — as a `loom rename <thread|weave|reference>` namespace (Decision 1). Clean cutover, no alias kept (per the clean-code/no-legacy-shim preference).

**Extension `weave*` → `create*`.** Rename the three doc-create commands and normalize the weave-create button:

| Old command id | New command id | Handler file |
|----------------|----------------|--------------|
| `loom.weaveIdea` | `loom.createIdea` | `weaveIdea.ts` → `createIdea.ts` |
| `loom.weaveDesign` | `loom.createDesign` | `weaveDesign.ts` → `createDesign.ts` |
| `loom.weavePlan` | `loom.createPlan` | `weavePlan.ts` → `createPlan.ts` |
| `loom.weaveCreate` | `loom.createWeave` | `weaveCreate.ts` → `createWeave.ts` |

Touch points: `package.json` (command declarations, menus, view welcome content, walkthrough), `extension.ts` registrations, the handler filenames + exported function names. Pure rename — behavior unchanged. `generate` stays the verb for the AI-sampling authoring path; `weave` remains a noun only.

## Decisions (confirmed — all four recommendations accepted, 2026-07-11)

**Decision 1 — rename verb shape.** Recommend a **`loom rename <thread|weave|reference>` namespace** (mirrors the established `loom create <type>` namespace; human-first) rather than flat `rename-thread`/`rename-weave`. `retitle` stays a top-level verb because a title change is conceptually distinct from renaming a folder/file. The tri-surface rule already blesses the subcommand form (`loom create idea` ⇄ `loom_create_idea`), so `loom rename thread` ⇄ `loom_rename_thread` is consistent.

**Decision 2 — destructive-op safety.** Recommend `loom delete` prompts for confirmation when stdout is a TTY, bypassed by `--yes`/`-y` (agents pass `--yes`, humans get a guard). `loom archive` is reversible → no prompt. Alternative: no prompt anywhere, rely on `restore`/git — simpler but riskier for `delete`.

**Decision 3 — `promote` without a host AI.** The CLI is not an MCP host and has no sampling; `promoteToX` needs either a supplied `body` or an `aiClient`. Recommend CLI promote **requires content**: `loom promote <doc> <type> --body-file <path>` (agent/human authors the child, promote does the linkage + typed-doc creation, no AI). This keeps way ③ terminal-complete without a second AI dependency. Alternatives: (b) fall back to the API-key `makeAIClient()` when configured; (c) drop promote from CLI scope as an authoring op. I lean strongly to the content-supplied form; (b) can be added later as a convenience.

**Decision 4 — `quick-ship` input shape.** `loom_quick_ship` takes `goal` + a `steps` array. Recommend CLI expresses this as `--goal <g>` + repeatable `--step "<desc>"` (+ optional `--release <v>`), assembled into the structured payload. A steps array is awkward in flags but a repeatable `--step` is idiomatic; a `--steps-file <json>` escape hatch covers richer cases.

## Resolved: promote is in-scope

`promote` stays in this thread (confirmed: "fold in promote"). It's an extension button + MCP tool with no CLI twin, so it belongs to the same parity gap. Its CLI form is the content-supplied `loom promote <doc> <type> --body-file <path>` from Decision 3 — no host AI required, so way ③ stays terminal-complete.

## Testing & docs sweep (part of the same change)

- **Parity test** — extend/author a CLI⇄MCP parity test asserting every non-single-audience `loom_*` tool has a CLI twin (catches the next drift automatically).
- **Per-command tests** — round-trip each new command against a temp workspace (create → archive → restore, retitle, rename thread/weave, move-thread, set-priority, set-thread-deps, close-plan, quick-ship), in the root `tests/` ts-node style.
- **Docs** — re-audit way ③ in `docs/WAYS-TO-USE-LOOM.md` (must be fully terminal-runnable), refresh `packages/cli/README.md` command list, and update the extension's Marketplace README if it names the `weave*` buttons.

## Non-goals

- Agent-only workflow tools (`loom_do_step`, `loom_read_chat_tail`, `loom_append_to_chat`, `loom_append_done`, `loom_patch_doc`, `loom_update_doc`) stay single-surface — no CLI twin, per the parity rule's single-audience clause.
- No new app/core/fs behavior — this thread is delivery-layer wiring + renames only.
- No change to the AI-authoring (`generate`/`refine`) surface beyond the already-fixed catalog label.
