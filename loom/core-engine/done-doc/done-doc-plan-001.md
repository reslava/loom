---
type: plan
id: pl_01KQYDFDDBZ1HXV318KQW7CA5S
title: Done Documents — Implementation
status: done
created: "2026-04-23T00:00:00.000Z"
version: 1
design_version: 1
tags: [done, doc-type, close-plan, summarise]
parent_id: de_01KQYDFDDBYKHS1J703PFE3P9T
requires_load: [de_01KQYDFDDBYKHS1J703PFE3P9T]
steps:
  - id: add-entity-and-type-to-core
    order: 1
    status: done
    description: Add `DoneDoc` entity and `DoneStatus` type to core
    files_touched: ["`core/src/entities/done.ts`", "`core/src/index.ts`"]
    blocked_by: []
    satisfies: []
  - id: add-file-patterns-to-workflow
    order: 2
    status: done
    description: Add `done/` file patterns to `workflow.yml` and `weaveRepository` loader — scan `done/*-done.md` for done docs, `done/*.md` for completed plans; populate `Weave.dones[]`
    files_touched: ["`fs/src/repositories/weaveRepository.ts`", "`.loom/workflow.yml`"]
    blocked_by: [Step 1]
    satisfies: []
  - id: implement-use-case-load-plan-call
    order: 3
    status: done
    description: Implement `app/src/closePlan` use-case — load plan, call AI for implementation record, write done doc to `done/{plan-id}-done.md`, move plan file from `plans/` to `done/{plan-id}.md`, fire `FINISH_PLAN` event
    files_touched: ["`app/src/closePlan.ts`"]
    blocked_by: [Steps 1–2]
    satisfies: []
  - id: add-loom
    order: 4
    status: done
    description: Add `loom.closePlan` VS Code command — triggered from plan node, calls `closePlan`, opens done doc
    files_touched: ["`vscode/src/commands/closePlan.ts`", "`vscode/src/extension.ts`", "`vscode/package.json`"]
    blocked_by: [Step 3]
    satisfies: []
  - id: update-to-include-done-doc-decisions
    order: 5
    status: done
    description: Update `summarise` to include done doc "Decisions made" and "Open items" in the AI input
    files_touched: ["`app/src/summarise.ts`"]
    blocked_by: [Steps 1–2]
    satisfies: []
  - id: show-done-docs-in-tree-as
    order: 6
    status: done
    description: Show done docs in tree — as child of plan node or under a `Done` section in the weave
    files_touched: ["`vscode/src/tree/treeProvider.ts`"]
    blocked_by: [Steps 1–2]
    satisfies: []
---

# Done Documents — Implementation

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add `DoneDoc` entity and `DoneStatus` type to core | `core/src/entities/done.ts`, `core/src/index.ts` | — | — |
| ✅ | 2 | Add `done/` file patterns to `workflow.yml` and `weaveRepository` loader — scan `done/*-done.md` for done docs, `done/*.md` for completed plans; populate `Weave.dones[]` | `fs/src/repositories/weaveRepository.ts`, `.loom/workflow.yml` | Step 1 | — |
| ✅ | 3 | Implement `app/src/closePlan` use-case — load plan, call AI for implementation record, write done doc to `done/{plan-id}-done.md`, move plan file from `plans/` to `done/{plan-id}.md`, fire `FINISH_PLAN` event | `app/src/closePlan.ts` | Steps 1–2 | — |
| ✅ | 4 | Add `loom.closePlan` VS Code command — triggered from plan node, calls `closePlan`, opens done doc | `vscode/src/commands/closePlan.ts`, `vscode/src/extension.ts`, `vscode/package.json` | Step 3 | — |
| ✅ | 5 | Update `summarise` to include done doc "Decisions made" and "Open items" in the AI input | `app/src/summarise.ts` | Steps 1–2 | — |
| ✅ | 6 | Show done docs in tree — as child of plan node or under a `Done` section in the weave | `vscode/src/tree/treeProvider.ts` | Steps 1–2 | — |