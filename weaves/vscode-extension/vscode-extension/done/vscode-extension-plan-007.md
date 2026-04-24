---
type: plan
id: vscode-extension-plan-007
title: "Step Execution UX — Do Steps, AI Chat, Complete Steps"
status: done
created: 2026-04-23
version: 1
tags: [vscode, plan-steps, ai, complete-step, do-step, ux]
parent_id: vscode-extension-design
child_ids: []
requires_load: [vscode-extension-design]
design_version: 1
---

# Step Execution UX — Do Steps, AI Chat, Complete Steps

## Goal

Give users a clear, AI-assisted workflow for executing plan steps inside VS Code: see the next step, ask AI to implement selected steps in a chat doc, then explicitly mark steps done.

## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 1 | Show next active step as subtitle on plan tree nodes | `treeProvider.ts` | |
| ✅ | 2 | Add `loom.doStep` command — Quick Pick of pending steps (checkboxes), creates an implementation chat doc, primes AI with plan + selected steps context | `extension.ts`, `commands/doStep.ts`, `app/src/doStep.ts` | |
| ✅ | 3 | AI writes implementation notes into the chat doc (appends under `## AI:`); stops and waits when a blocking decision is needed | `app/src/doStep.ts` | Step 2 |
| ✅ | 4 | Enhance `loom.completeStep` — Quick Pick of pending steps, marks selected steps done in plan frontmatter, refreshes tree | `commands/completeStep.ts`, `app/src/completeStep.ts` | |
| ✅ | 5 | Add AI enabled/disabled context key — set on activation based on `reslava-loom.ai.apiKey`; hide AI commands in menus when disabled | `extension.ts`, `package.json` | |
| ✅ | 6 | Add `loom.closePlan` command — marks plan `done`, triggers AI to generate a `-done.md` implementation record alongside the plan | `extension.ts`, `commands/closePlan.ts`, `app/src/closePlan.ts` | Step 4, `done-doc-idea` design |

## Notes

- Step 3: the AI system prompt for implementation should request full detail — what was done, why, what was skipped, what to watch for. Richness in the doc is a deliberate design goal.
- Step 6 depends on the `done-doc-idea` design being settled. Can be deferred; steps 1–5 are independent.
- `doStep` and `completeStep` are two distinct actions: AI does the work (step 2–3), human approves and marks done (step 4). AI never marks steps done autonomously.
