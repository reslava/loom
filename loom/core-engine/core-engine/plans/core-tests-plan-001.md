---
type: plan
id: pl_01KQYDFDDB86JZKCBP1NN75RR4
title: Core + App Use-Case Tests
status: done
created: "2026-04-23T00:00:00.000Z"
version: 1
design_version: 1
tags: [tests, core, app, fs, weaveRepository, closePlan, doStep, completeStep]
parent_id: de_01KQYDFDDB802XEJM0S329T9WW
requires_load: [de_01KQYDFDDB802XEJM0S329T9WW]
steps:
  - id: add-entity-tests-assert-paren
    order: 1
    status: done
    description: "Add `DoneDoc` entity tests — assert `type: 'done'`, `status: 'final'`, `parent_id` link, correct serialization via `serializeFrontmatter`"
    files_touched: ["`tests/entity.test.ts` (new)"]
    blocked_by: []
    satisfies: []
  - id: add-weaverepository
    order: 2
    status: done
    description: Add `weaveRepository.loadWeave` tests — load a weave with plans in `plans/`, done docs in `done/`, and a moved plan in `done/`; assert `weave.dones` populated and `weave.plans` contains the moved plan
    files_touched: ["`tests/weave-repository.test.ts` (new)"]
    blocked_by: [Step 1]
    satisfies: []
  - id: add-tests-cover-transition-aut
    order: 3
    status: done
    description: Add `planReducer` tests — cover `FINISH_PLAN` transition, `COMPLETE_STEP` auto-done when all steps complete, invalid transition error cases
    files_touched: ["`tests/plan-reducer.test.ts` (new)"]
    blocked_by: []
    satisfies: []
  - id: add-use-case-tests-mark-one
    order: 4
    status: done
    description: Add `completeStep` use-case tests — mark one step done, mark last step done (plan auto-done), attempt on already-done step
    files_touched: ["`tests/commands.test.ts`"]
    blocked_by: [Step 3]
    satisfies: []
  - id: add-use-case-tests-mock-ai
    order: 5
    status: done
    description: Add `closePlan` use-case tests — mock AI client returning fixed body; assert done doc written to `done/{id}-done.md`, plan moved to `done/{id}.md`, original `plans/{id}.md` deleted, plan status `done`
    files_touched: ["`tests/close-plan.test.ts` (new)"]
    blocked_by: [Steps 1–2]
    satisfies: []
  - id: add-use-case-tests-mock-ai-2
    order: 6
    status: done
    description: "Add `doStep` use-case tests — mock AI client; assert chat doc created with correct `## Rafa:` + `## AI:` structure, `parent_id` set to plan"
    files_touched: ["`tests/do-step.test.ts` (new)"]
    blocked_by: []
    satisfies: []
  - id: add-use-case-tests-mock-ai-3
    order: 7
    status: done
    description: Add `summarise` use-case tests — mock AI client; assert done doc "Decisions made" and "Open items" appear in the user message sent to AI
    files_touched: ["`tests/summarise.test.ts` (new)"]
    blocked_by: [Step 2]
    satisfies: []
  - id: run-full-suite-fix-any-failures
    order: 8
    status: done
    description: Run full suite, fix any failures, add to `scripts/test-all.sh`
    files_touched: ["`scripts/test-all.sh`"]
    blocked_by: [Steps 1–7]
    satisfies: []
---

# Core + App Use-Case Tests

## Goal

Extend the existing ts-node test suite to cover all core entities, fs repository
behaviour, and app use-case paths introduced since the initial build. Regressions
in any of these layers should be caught before they reach VS Code.

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add `DoneDoc` entity tests — assert `type: 'done'`, `status: 'final'`, `parent_id` link, correct serialization via `serializeFrontmatter` | `tests/entity.test.ts` (new) | — | — |
| ✅ | 2 | Add `weaveRepository.loadWeave` tests — load a weave with plans in `plans/`, done docs in `done/`, and a moved plan in `done/`; assert `weave.dones` populated and `weave.plans` contains the moved plan | `tests/weave-repository.test.ts` (new) | Step 1 | — |
| ✅ | 3 | Add `planReducer` tests — cover `FINISH_PLAN` transition, `COMPLETE_STEP` auto-done when all steps complete, invalid transition error cases | `tests/plan-reducer.test.ts` (new) | — | — |
| ✅ | 4 | Add `completeStep` use-case tests — mark one step done, mark last step done (plan auto-done), attempt on already-done step | `tests/commands.test.ts` | Step 3 | — |
| ✅ | 5 | Add `closePlan` use-case tests — mock AI client returning fixed body; assert done doc written to `done/{id}-done.md`, plan moved to `done/{id}.md`, original `plans/{id}.md` deleted, plan status `done` | `tests/close-plan.test.ts` (new) | Steps 1–2 | — |
| ✅ | 6 | Add `doStep` use-case tests — mock AI client; assert chat doc created with correct `## Rafa:` + `## AI:` structure, `parent_id` set to plan | `tests/do-step.test.ts` (new) | — | — |
| ✅ | 7 | Add `summarise` use-case tests — mock AI client; assert done doc "Decisions made" and "Open items" appear in the user message sent to AI | `tests/summarise.test.ts` (new) | Step 2 | — |
| ✅ | 8 | Run full suite, fix any failures, add to `scripts/test-all.sh` | `scripts/test-all.sh` | Steps 1–7 | — |
### Notes

- All tests use `os.tmpdir()` for isolation — no shared state between runs.
- AI client is always mocked in these tests (fixed string responses). Real AI calls belong in manual smoke tests only.
- `test-utils.ts` already has `runLoom` and `assert` helpers. Add a `mockAIClient(response)` factory there.
- Each new test file follows the existing pattern: single async function, `process.exit(1)` on failure, `console.log` with ✅/❌ per case.
