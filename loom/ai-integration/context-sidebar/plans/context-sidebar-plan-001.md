---
type: plan
id: pl_01KSTGE28WY9C08MBYQSXGGS7R
title: context-sidebar — CONTEXT tree section + persistent overrides (P3)
status: active
created: 2026-05-29
version: 1
design_version: 1
tags: []
parent_id: de_01KSTFZXP06VXHFDYG1FGAK1KT
requires_load: []
target_version: 0.1.0
---
# context-sidebar — CONTEXT tree section + persistent overrides (P3)

## Goal

Build the sidebar CONTEXT UX that Phase 3 of the context-pipeline committed to: pre-launch visibility of what the AI will receive, interactive include/exclude toggles, persistent overrides in `.loom/context-prefs.json`. Reflects the design's leans: per-target child node (§1), the symbol set from §2, mode-agnostic per-target prefs schema (§3), MCP-tool write path (§4), surface `requires_load`-over-user-exclude as ⊘ tooltip (§5), always re-run on toggle (§6). Decisions in `context-sidebar-design.md` §1/§3/§4/§5/§6 not yet recorded in the decisions log — confirm before step 2.
---

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| 🔳 | 1 | Add `loom_set_context_prefs(targetId, { include?, exclude?, reset? })` and `loom_get_context_prefs(targetId)` MCP tools that read/write `.loom/context-prefs.json` with the mode-agnostic per-target schema (`{ [targetId]: { include: string[], exclude: string[] } }`). Unit tests cover merge semantics, `reset: true` clearing, missing-file create, malformed-JSON repair. | — | — |
| 🔳 | 2 | Wire `.loom/context-prefs.json` into the `loom://context/{docId}?mode={mode}` resource handler: read the file, look up the resolved target id's entry, pass as `overrides` to `assembleContext`. Confirm the Phase-1 hook path exists; if not, add it. MCP integration test asserts an excluded id appears in the bundle's `excluded[]` with reason `user-exclude`. | — | — |
| 🔳 | 3 | Add a `Context (N docs)` child node under valid launch targets (chats, plans, designs) in the VS Code tree. Render one row per `BundledDoc` from the bundle's `docs[]`. Use the symbol set from design §2: ✓ auto, 📌 user-include, 🚫 user-exclude, ⊘ filtered-but-required, 🔒 always-locked, ⚠ stale, ❌ missing. | — | — |
| 🔳 | 4 | Implement toggle commands on each CONTEXT row: include / exclude / reset-to-auto. Each toggle calls `loom_set_context_prefs`, then re-reads `loom://context/{targetId}?mode={mode}` and refreshes only the CONTEXT subtree. No predictive UI — re-render is always from the new bundle (design §6 lean: always re-run). | — | — |
| 🔳 | 5 | Render the badge metadata: stale (⚠) and missing (❌) from bundle fields; show a confirm dialog when the user tries to exclude a 🔒 (`load: always`) reference. Tooltip on a ⊘ row names which doc's `requires_load` is pulling it in so the user understands why their exclude is being overridden. | — | — |
| 🔳 | 6 | Smoke test in the VS Code extension: open a chat in an active thread; exclude an auto-loaded reference via the toggle; click Reply; verify the `📄` visibility line for that ref does NOT appear, the prefs file shows the exclude, and the bundle's `excluded[]` carries `reason: 'user-exclude'`. Run `./scripts/build-all.sh` and `./scripts/test-all.sh` green. | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
