---
type: plan
id: pl_01KSTGE28WY9C08MBYQSXGGS7R
title: context-sidebar — CONTEXT tree section + persistent overrides (P3)
status: done
created: "2026-05-29T00:00:00.000Z"
updated: "2026-05-31T00:00:00.000Z"
version: 2
design_version: 1
tags: []
parent_id: de_01KSTFZXP06VXHFDYG1FGAK1KT
requires_load: []
target_version: 0.1.0
steps:
  - id: add-and-l
    order: 1
    status: done
    description: "Add `loom_set_context_prefs(targetId, { include?, exclude?, reset? })` and `loom_get_context_prefs(targetId)` MCP tools that read/write `.loom/context-prefs.json` with the §3 mode-agnostic per-target schema (`{ [targetId]: { include: string[], exclude: string[] } }`). Unit tests cover merge semantics, `reset: true` clearing, missing-file create, malformed-JSON repair."
    files_touched: ["`packages/mcp`", "`packages/app`", "`packages/fs`"]
    blocked_by: []
    satisfies: []
  - id: wire
    order: 2
    status: done
    description: "Wire `.loom/context-prefs.json` into the context read path as `overrides`: the `loom://context/{docId}?mode={mode}` resource handler AND the `loom_do_step` / refine brief assembly (§10) both read the resolved target's entry and pass it to `assembleContext`. Confirm the Phase-1 hook; add it if absent. MCP integration test asserts an excluded id appears in the bundle's `excluded[]` with reason `user-exclude`."
    files_touched: ["`packages/mcp`", "`packages/app`"]
    blocked_by: [1]
    satisfies: []
  - id: rebase-onto-the-bundle
    order: 3
    status: done
    description: "**Rebase `ContextSidebarProvider` onto the bundle.** Replace its local pinned/opt-in derivation (`onSelectionChanged` walking `thread.idea/design/plans/chats/refDocs`) with a read of `loom://context/{target}?mode=` for the focused node; render one row per `BundledDoc` from `docs[]` + `excluded[]`, using the §2 symbol set (✓ auto, 📌 user-include, 🚫 user-exclude, ⊘ filtered-but-required, 🔒 always-locked, ⚠ stale, ❌ missing). Keep the existing token-count rendering."
    files_touched: ["`packages/vscode/src/providers/contextSidebarProvider.ts`"]
    blocked_by: [2]
    satisfies: []
  - id: make-toggles-persist
    order: 4
    status: done
    description: "Make toggles persist. Replace the in-memory `toggle()` (`loaded` flag) with include / exclude / reset-to-auto commands that call `loom_set_context_prefs`, then re-read `loom://context/{target}?mode=` and refresh the view (§6 always re-run — no predictive UI). Remove the ephemeral launch channel (§10): delete `getSelectedIds()` and the `buildPrompt(..., contextIds)` / `context_ids` arg in `doStep`/`refine`/`refinePlan` — launches now get overrides from prefs via step 2."
    files_touched: ["`packages/vscode/src/providers/contextSidebarProvider.ts`", "`packages/vscode/src/commands/{doStep", refine, "refinePlan}.ts`", "`packages/vscode/src/extension.ts`"]
    blocked_by: [3]
    satisfies: []
  - id: render-the-remaining-ux-from-bundle
    order: 5
    status: done
    description: "Render the remaining UX from bundle metadata: ⚠ stale and ❌ missing badges; a confirm dialog when excluding a 🔒 (`load: always`) ref (§5 warn-on-confirm), surfaced afterward as 🚫 with an \"overrides always\" badge; a tooltip on a ⊘ row naming which doc's `requires_load` pulls it in."
    files_touched: ["`packages/vscode/src/providers/contextSidebarProvider.ts`"]
    blocked_by: [4]
    satisfies: []
  - id: smoke-test-in-the-vs-code
    order: 6
    status: done
    description: "Smoke test in the VS Code extension: open a chat in an active thread; exclude an auto-loaded reference via the toggle; click Reply; verify the `📄` visibility line for that ref does NOT appear, the prefs file shows the exclude, and the bundle's `excluded[]` carries `reason: 'user-exclude'`. Run `./scripts/build-all.sh` and `./scripts/test-all.sh` green."
    files_touched: []
    blocked_by: [5]
    satisfies: []
---
# context-sidebar — CONTEXT tree section + persistent overrides (P3)

## Goal

Build the sidebar CONTEXT UX Phase 3 committed to: pre-launch visibility of what the AI will receive, interactive include/exclude toggles, persistent overrides in `.loom/context-prefs.json`. All design decisions recorded 2026-05-31 (`context-sidebar-design.md` decisions log): §1 **B** (the panel already exists — rebase it onto the pipeline, do **not** build a new child node), §2 the 7-symbol set, §3 **A** mode-agnostic per-target schema, §4 **B** MCP-tool write path, §5 warn-on-confirm for `load: always`, §6 **A** always re-run, §10 collapse the launch path onto persisted prefs (remove the ephemeral `context_ids` prompt-arg channel).

The core of this plan is a **rebase, not a greenfield build**: `packages/vscode/src/providers/contextSidebarProvider.ts` already renders a top-level, focus-following Pinned/Opt-in view with token counts and ✓/○ toggles, but it re-derives context locally and its toggles are ephemeral. We replace the local derivation with the pipeline `ContextBundle` and make toggles persist.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add `loom_set_context_prefs(targetId, { include?, exclude?, reset? })` and `loom_get_context_prefs(targetId)` MCP tools that read/write `.loom/context-prefs.json` with the §3 mode-agnostic per-target schema (`{ [targetId]: { include: string[], exclude: string[] } }`). Unit tests cover merge semantics, `reset: true` clearing, missing-file create, malformed-JSON repair. | `packages/mcp`, `packages/app`, `packages/fs` | — | — |
| ✅ | 2 | Wire `.loom/context-prefs.json` into the context read path as `overrides`: the `loom://context/{docId}?mode={mode}` resource handler AND the `loom_do_step` / refine brief assembly (§10) both read the resolved target's entry and pass it to `assembleContext`. Confirm the Phase-1 hook; add it if absent. MCP integration test asserts an excluded id appears in the bundle's `excluded[]` with reason `user-exclude`. | `packages/mcp`, `packages/app` | 1 | — |
| ✅ | 3 | **Rebase `ContextSidebarProvider` onto the bundle.** Replace its local pinned/opt-in derivation (`onSelectionChanged` walking `thread.idea/design/plans/chats/refDocs`) with a read of `loom://context/{target}?mode=` for the focused node; render one row per `BundledDoc` from `docs[]` + `excluded[]`, using the §2 symbol set (✓ auto, 📌 user-include, 🚫 user-exclude, ⊘ filtered-but-required, 🔒 always-locked, ⚠ stale, ❌ missing). Keep the existing token-count rendering. | `packages/vscode/src/providers/contextSidebarProvider.ts` | 2 | — |
| ✅ | 4 | Make toggles persist. Replace the in-memory `toggle()` (`loaded` flag) with include / exclude / reset-to-auto commands that call `loom_set_context_prefs`, then re-read `loom://context/{target}?mode=` and refresh the view (§6 always re-run — no predictive UI). Remove the ephemeral launch channel (§10): delete `getSelectedIds()` and the `buildPrompt(..., contextIds)` / `context_ids` arg in `doStep`/`refine`/`refinePlan` — launches now get overrides from prefs via step 2. | `packages/vscode/src/providers/contextSidebarProvider.ts`, `packages/vscode/src/commands/{doStep, refine, refinePlan}.ts`, `packages/vscode/src/extension.ts` | 3 | — |
| ✅ | 5 | Render the remaining UX from bundle metadata: ⚠ stale and ❌ missing badges; a confirm dialog when excluding a 🔒 (`load: always`) ref (§5 warn-on-confirm), surfaced afterward as 🚫 with an "overrides always" badge; a tooltip on a ⊘ row naming which doc's `requires_load` pulls it in. | `packages/vscode/src/providers/contextSidebarProvider.ts` | 4 | — |
| ✅ | 6 | Smoke test in the VS Code extension: open a chat in an active thread; exclude an auto-loaded reference via the toggle; click Reply; verify the `📄` visibility line for that ref does NOT appear, the prefs file shows the exclude, and the bundle's `excluded[]` carries `reason: 'user-exclude'`. Run `./scripts/build-all.sh` and `./scripts/test-all.sh` green. | — | 5 | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
