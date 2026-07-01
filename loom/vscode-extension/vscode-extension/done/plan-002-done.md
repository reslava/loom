---
type: plan
id: pl_01KQYDFDDE73KDC5H72SWVB10J
title: "VS Code Extension Tests — Real Workspace at j:/temp/loom"
status: done
created: "2026-04-23T00:00:00.000Z"
version: 1
tags: [tests, vscode, extension, e2e, workspace, j-temp]
parent_id: de_01KQYDFDDEQ81VMM0SPD1P1DBM
requires_load: [de_01KQYDFDDEQ81VMM0SPD1P1DBM, weaves/core-engine/references/fs-extra-esm-reference.md]
steps:
  - id: create-tests-workspace-utils
    order: 1
    status: done
    description: "Create `tests/workspace-utils.ts` — helper that bootstraps `j:/temp/loom`: writes `.loom/workflow.yml`, creates `weaves/` directory, optionally seeds a weave with idea + design + plan at known paths"
    files_touched: ["`tests/workspace-utils.ts` (new)"]
    blocked_by: []
    satisfies: []
  - id: add-tests-workspace-workflow
    order: 2
    status: done
    description: "Add `tests/workspace-workflow.test.ts` (Phase 1) — using `j:/temp/loom` as `loomRoot`, run app use-cases directly: `loadWeave`, `completeStep`, `closePlan`, `doStep`; assert correct file layout and document contents"
    files_touched: ["`tests/workspace-workflow.test.ts` (new)"]
    blocked_by: [Step 1]
    satisfies: []
  - id: assert-folder-layout-after-done-plan
    order: 3
    status: done
    description: "Assert `done/` folder layout after `closePlan`: `done/{plan-id}.md` exists with `status: done`, `done/{plan-id}-done.md` exists with AI body, `plans/{plan-id}.md` deleted"
    files_touched: ["`tests/workspace-workflow.test.ts`"]
    blocked_by: [Steps 1–2]
    satisfies: []
  - id: assert-tree-data-layer-with-real
    order: 4
    status: done
    description: "Assert tree data layer with real workspace — instantiate `loadWeave` + `getState` with `j:/temp/loom` and verify weave, plans, dones, chats are correctly surfaced (no VS Code dependency, pure data layer)"
    files_touched: ["`tests/workspace-workflow.test.ts`"]
    blocked_by: [Steps 1–2]
    satisfies: []
  - id: add-dependency-and-directory-set-up
    order: 5
    status: done
    description: "Add `@vscode/test-electron` dependency and `tests/vscode/` directory — set up Extension Host test runner pointing at `j:/temp/loom` as workspace"
    files_touched: ["`packages/vscode/package.json`", "`tests/vscode/index.ts` (new)", "`tests/vscode/runTests.ts` (new)"]
    blocked_by: [Step 1]
    satisfies: []
  - id: extension-host-test-verify-tree-renders
    order: 6
    status: done
    description: "Extension Host test: verify tree renders weave → primary design → Plans section → plan node → done child (using `getChildren`)"
    files_touched: ["`tests/vscode/tree.test.ts` (new)"]
    blocked_by: [Step 5]
    satisfies: []
  - id: extension-host-test-loom
    order: 7
    status: done
    description: "Extension Host test: `loom.aiEnabled` context key is false when no API key, true when key present; AI menu items absent/present accordingly"
    files_touched: ["`tests/vscode/aiContext.test.ts` (new)"]
    blocked_by: [Step 5]
    satisfies: []
  - id: extension-host-test-loom-2
    order: 8
    status: done
    description: "Extension Host test: `loom.completeStep` marks step done in file, plan auto-closes when all steps complete"
    files_touched: ["`tests/vscode/commands.test.ts` (new)"]
    blocked_by: [Step 5]
    satisfies: []
  - id: add-scripts-test-vscode
    order: 9
    status: done
    description: Add `scripts/test-vscode.sh` and document how to run Extension Host tests
    files_touched: ["`scripts/test-vscode.sh` (new)"]
    blocked_by: [Steps 5–8]
    satisfies: []
---

# VS Code Extension Tests — Real Workspace at j:/temp/loom

## Goal

Validate the full VS Code extension workflow end-to-end against a real file system
workspace at `j:/temp/loom`. Phase 1 tests the app layer directly (no Extension Host,
fast, scriptable). Phase 2 adds Extension Host tests for tree view and commands.

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Create `tests/workspace-utils.ts` — helper that bootstraps `j:/temp/loom`: writes `.loom/workflow.yml`, creates `weaves/` directory, optionally seeds a weave with idea + design + plan at known paths | `tests/workspace-utils.ts` (new) | — | — |
| ✅ | 2 | Add `tests/workspace-workflow.test.ts` (Phase 1) — using `j:/temp/loom` as `loomRoot`, run app use-cases directly: `loadWeave`, `completeStep`, `closePlan`, `doStep`; assert correct file layout and document contents | `tests/workspace-workflow.test.ts` (new) | Step 1 | — |
| ✅ | 3 | Assert `done/` folder layout after `closePlan`: `done/{plan-id}.md` exists with `status: done`, `done/{plan-id}-done.md` exists with AI body, `plans/{plan-id}.md` deleted | `tests/workspace-workflow.test.ts` | Steps 1–2 | — |
| ✅ | 4 | Assert tree data layer with real workspace — instantiate `loadWeave` + `getState` with `j:/temp/loom` and verify weave, plans, dones, chats are correctly surfaced (no VS Code dependency, pure data layer) | `tests/workspace-workflow.test.ts` | Steps 1–2 | — |
| ✅ | 5 | Add `@vscode/test-electron` dependency and `tests/vscode/` directory — set up Extension Host test runner pointing at `j:/temp/loom` as workspace | `packages/vscode/package.json`, `tests/vscode/index.ts` (new), `tests/vscode/runTests.ts` (new) | Step 1 | — |
| ✅ | 6 | Extension Host test: verify tree renders weave → primary design → Plans section → plan node → done child (using `getChildren`) | `tests/vscode/tree.test.ts` (new) | Step 5 | — |
| ✅ | 7 | Extension Host test: `loom.aiEnabled` context key is false when no API key, true when key present; AI menu items absent/present accordingly | `tests/vscode/aiContext.test.ts` (new) | Step 5 | — |
| ✅ | 8 | Extension Host test: `loom.completeStep` marks step done in file, plan auto-closes when all steps complete | `tests/vscode/commands.test.ts` (new) | Step 5 | — |
| ✅ | 9 | Add `scripts/test-vscode.sh` and document how to run Extension Host tests | `scripts/test-vscode.sh` (new) | Steps 5–8 | — |
## Notes

- Phase 1 (steps 1–4): pure TypeScript, ts-node, no VS Code process needed. Fast and runnable in CI.
- Phase 2 (steps 5–9): requires VS Code installed on the machine. Slower. Worth having for tree view and command integration.
- `j:/temp/loom` is used as a stable path for manual inspection between test runs. Tests always clean and re-seed it at the start.
- AI client is mocked in all automated tests — fixed response strings only.
- Steps 5–9 are blocked by steps 1–4 being stable. Don't start the Extension Host setup until the data layer tests pass cleanly.
