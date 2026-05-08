---
type: plan
id: pl_01KQYDFDD8K96BA5Y7T3KMTV15
title: AI Command Palette — Implementation
status: done
created: "2026-04-22T00:00:00.000Z"
version: 1
design_version: 1
tags: [ai, commands, promote, refine, summarize, vscode]
parent_id: de_01KQYDFDD7Z9B0CK146K75XTRZ
requires_load: [de_01KQYDFDD7Z9B0CK146K75XTRZ, de_01KQYDFDD88BTYTQ61S0Q9W02V]
target_version: 0.3.0
steps: []
---

# AI Command Palette — Implementation

## Goal

Implement the full AI command palette defined in `ai-command-palette-design`:
rename `promoteIdea` → `promoteToIdea`, add `promoteToDesign`, `promoteToPlan`,
`refineIdea`, `refinePlan`, and wire `summarize` to the AI client.

## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 1 | Rename `promoteIdea` → `promoteToIdea` — file, export, command ID, package.json | `app/src/promoteIdea.ts`, `vscode/src/commands/promoteIdea.ts`, `vscode/src/extension.ts`, `vscode/package.json` | — |
| ✅ | 2 | `app/promoteToDesign` use-case — AI drafts design doc from chat or idea | `app/src/promoteToDesign.ts` | 1 |
| ✅ | 3 | `loom.promoteToDesign` command + menu entry | `vscode/src/commands/promoteToDesign.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 2 |
| ✅ | 4 | `app/promoteToPlan` use-case — AI drafts plan steps from chat, idea, or design | `app/src/promoteToPlan.ts` | — |
| ✅ | 5 | `loom.promoteToPlan` command + menu entry | `vscode/src/commands/promoteToPlan.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 4 |
| ✅ | 6 | `refineIdea` reducer + use-case — AI rewrites idea body, version++ | `core/src/reducers/ideaReducer.ts`, `app/src/refineIdea.ts` | — |
| ✅ | 7 | `loom.refineIdea` command + menu entry | `vscode/src/commands/refineIdea.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 6 |
| ✅ | 8 | `refinePlan` use-case — AI updates plan steps, version++ | `app/src/refinePlan.ts` | — |
| ✅ | 9 | `loom.refinePlan` command + menu entry | `vscode/src/commands/refinePlan.ts`, `vscode/src/extension.ts`, `vscode/package.json` | 8 |
| ✅ | 10 | Wire `summarise` to `aiClient` — replace template stub with AI-generated ctx | `app/src/summarise.ts`, `vscode/src/commands/summarise.ts` | — |
| ✅ | 11 | Build + smoke test full command palette | `scripts/build-all.sh` | 1–10 |

## Notes

- Step 1: rename is purely mechanical — no logic changes, just identifiers and filenames.
- Steps 2–5: same pattern as `promoteToIdea`. System prompt differs: ask for design sections (Goal / Context / Decisions) or plan steps table.
- Step 6: `ideaReducer` is new — ideas currently have no reducer. Only needs `REFINE_IDEA` event that bumps `version` and sets `updated`. No child staleness side-effect needed.
- Step 8: `refinePlan` does not fire a workflow event — it rewrites the steps table directly and bumps version. Plans have no downstream dependents to stale.
- Step 10: `summarise` already scaffolded; replace the body with an `aiClient.complete()` call using a summarization system prompt.
