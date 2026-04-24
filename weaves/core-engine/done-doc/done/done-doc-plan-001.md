---
type: plan
id: done-doc-plan-001
title: "Done Documents — Implementation"
status: done
created: 2026-04-23
version: 1
tags: [done, doc-type, close-plan, summarise]
parent_id: done-doc-design
child_ids: []
requires_load: [done-doc-design]
design_version: 1
---

# Done Documents — Implementation

## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 1 | Add `DoneDoc` entity and `DoneStatus` type to core | `core/src/entities/done.ts`, `core/src/index.ts` | |
| ✅ | 2 | Add `done/` file patterns to `workflow.yml` and `weaveRepository` loader — scan `done/*-done.md` for done docs, `done/*.md` for completed plans; populate `Weave.dones[]` | `fs/src/repositories/weaveRepository.ts`, `.loom/workflow.yml` | Step 1 |
| ✅ | 3 | Implement `app/src/closePlan` use-case — load plan, call AI for implementation record, write done doc to `done/{plan-id}-done.md`, move plan file from `plans/` to `done/{plan-id}.md`, fire `FINISH_PLAN` event | `app/src/closePlan.ts` | Steps 1–2 |
| ✅ | 4 | Add `loom.closePlan` VS Code command — triggered from plan node, calls `closePlan`, opens done doc | `vscode/src/commands/closePlan.ts`, `vscode/src/extension.ts`, `vscode/package.json` | Step 3 |
| ✅ | 5 | Update `summarise` to include done doc "Decisions made" and "Open items" in the AI input | `app/src/summarise.ts` | Steps 1–2 |
| ✅ | 6 | Show done docs in tree — as child of plan node or under a `Done` section in the weave | `vscode/src/tree/treeProvider.ts` | Steps 1–2 |
