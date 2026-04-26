---
type: plan
id: core-tests-plan-001
title: "Core + App Use-Case Tests"
status: done
created: 2026-04-23
version: 1
tags: [tests, core, app, fs, weaveRepository, closePlan, doStep, completeStep]
parent_id: core-engine-design
child_ids: []
requires_load: [core-engine-design]
design_version: 1
---

# Core + App Use-Case Tests

## Goal

Extend the existing ts-node test suite to cover all core entities, fs repository
behaviour, and app use-case paths introduced since the initial build. Regressions
in any of these layers should be caught before they reach VS Code.

## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 1 | Add `DoneDoc` entity tests — assert `type: 'done'`, `status: 'final'`, `parent_id` link, correct serialization via `serializeFrontmatter` | `tests/entity.test.ts` (new) | |
| ✅ | 2 | Add `weaveRepository.loadWeave` tests — load a weave with plans in `plans/`, done docs in `done/`, and a moved plan in `done/`; assert `weave.dones` populated and `weave.plans` contains the moved plan | `tests/weave-repository.test.ts` (new) | Step 1 |
| ✅ | 3 | Add `planReducer` tests — cover `FINISH_PLAN` transition, `COMPLETE_STEP` auto-done when all steps complete, invalid transition error cases | `tests/plan-reducer.test.ts` (new) | |
| ✅ | 4 | Add `completeStep` use-case tests — mark one step done, mark last step done (plan auto-done), attempt on already-done step | `tests/commands.test.ts` | Step 3 |
| ✅ | 5 | Add `closePlan` use-case tests — mock AI client returning fixed body; assert done doc written to `done/{id}-done.md`, plan moved to `done/{id}.md`, original `plans/{id}.md` deleted, plan status `done` | `tests/close-plan.test.ts` (new) | Steps 1–2 |
| ✅ | 6 | Add `doStep` use-case tests — mock AI client; assert chat doc created with correct `## Rafa:` + `## AI:` structure, `parent_id` set to plan | `tests/do-step.test.ts` (new) | |
| ✅ | 7 | Add `summarise` use-case tests — mock AI client; assert done doc "Decisions made" and "Open items" appear in the user message sent to AI | `tests/summarise.test.ts` (new) | Step 2 |
| ✅ | 8 | Run full suite, fix any failures, add to `scripts/test-all.sh` | `scripts/test-all.sh` | Steps 1–7 |

## Notes

- All tests use `os.tmpdir()` for isolation — no shared state between runs.
- AI client is always mocked in these tests (fixed string responses). Real AI calls belong in manual smoke tests only.
- `test-utils.ts` already has `runLoom` and `assert` helpers. Add a `mockAIClient(response)` factory there.
- Each new test file follows the existing pattern: single async function, `process.exit(1)` on failure, `console.log` with ✅/❌ per case.
