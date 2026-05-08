---
type: plan
id: pl_01KQYDFDDCS6PZ80MQE2H0C3RK
title: Weave & Thread — Phase 4 Implementation
status: done
created: "2026-04-23T00:00:00.000Z"
version: 1
design_version: 3
tags: [refactor, core, threads, weaves, migration, phase-4]
parent_id: de_01KQYDFDDCMH30S303HF03ET00
requires_load: [de_01KQYDFDDCMH30S303HF03ET00, de_01KQYDFDDB802XEJM0S329T9WW, de_01KQYDFDDEQ81VMM0SPD1P1DBM]
---

# Weave & Thread — Phase 4 Implementation

## Goal

Migrate Loom from the flat-per-weave layout to the true Weave/Thread graph model:

```
Before (current flat):               After (Phase 4):
weaves/core-engine/                  weaves/core-engine/
  core-engine-design.md                state-management/            ← Thread
  plan-refactor-design.md                state-management-idea.md
  plans/                                 state-management-design.md
    ...                                  plans/state-management-plan-001.md
  done/                                  done/state-management-plan-001-done.md
    ...                                  ai-chats/
                                       plan-refactor/               ← another Thread
                                         plan-refactor-design.md
                                         plans/...
                                       loose-idea.md                ← Loose fiber
                                       ai-chats/                    ← weave-level
                                       references/
```

Every layer is affected: core entities, fs loaders, app use-cases, CLI, VS Code tree, tests, and the repo's own `weaves/` docs.

## Strategy

**Feature branch.** All work happens on `feat/weave-threads`. `main` stays on the flat layout until Phase 8 lands. This keeps `main` releasable at all times.

**Test against `j:/temp/loom` throughout.** New seed helpers build the new layout; we validate end-to-end before touching Loom's own docs.

**Migration script runs last.** Loom's own `weaves/` stays flat until Phase 8. That way we can develop and test the new code without constantly rewriting our own design docs mid-flight.

**One commit per step.** Each step is atomic and testable. If a step breaks something, we revert that one commit.

## Phases Overview

| Phase | Scope | Steps |
| :--- | :--- | :--- |
| 1 | Entity model | 1–3 |
| 2 | fs layer (load/save/index) | 4–9 |
| 3 | app layer (getState + use-cases) | 10–14 |
| 4 | CLI updates | 15–17 |
| 5 | VS Code tree & commands | 18–22 |
| 6 | Integration test rewrite | 23–25 |
| 7 | Migration script | 26–28 |
| 8 | Migrate Loom's own weaves/ | 29–31 |
| 9 | Cleanup & docs | 32–34 |

## Steps


### Phase 5 — VS Code Tree & Commands

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 18 | Add Thread tree node with contextValue `thread`. Weave children = thread nodes + loose fibers section + weave-level chats. | `packages/vscode/src/tree/treeProvider.ts` | Step 10 |
| ✅ | 19 | Thread node children = idea + design + Plans section + Chats section (thread-level). Remove "primary design" logic (each thread has exactly one design). | `packages/vscode/src/tree/treeProvider.ts` | Step 18 |
| ✅ | 20 | Update inline button `when` clauses in `package.json`: thread-level commands on `viewItem == thread`, weave-level on `viewItem == weave`, loose-fiber specific entries. | `packages/vscode/package.json` | Step 19 |
| ✅ | 21 | Update commands to pass thread context: `weaveIdea`, `weaveDesign`, `weavePlan`. Commands read threadId from node or auto-derive from title. | `packages/vscode/src/commands/*.ts` | Step 19 |
| ✅ | 22 | Extension Host test rewrite: new `seedWeave` builds thread-based layout; tree tests verify Weave → Thread → Docs rendering; commands tests verify thread context. | `tests/vscode/helpers.ts`, `tests/vscode/tree.test.ts`, `tests/vscode/commands.test.ts` | Steps 18–21 |

### Phase 6 — Integration Tests

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 23 | Rewrite `tests/workspace-utils.ts` with thread-aware seeders: `seedWeave`, `seedThread`, `seedLooseFiber`, `seedDoneInThread`. | `tests/workspace-utils.ts` | Step 14 |
| ✅ | 24 | Full workspace-workflow integration test: multi-thread scenario (2 threads in one weave, loose fiber at root), all use-cases exercised. | `tests/workspace-workflow.test.ts` | Step 23 |
| ✅ | 25 | Run the full suite (`scripts/test-all.sh` + `scripts/test-vscode.sh`). All green before Phase 7. | entire tests dir | Steps 17, 22, 24 |

### Phase 7 — Migration Script

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 26 | `scripts/migrate-to-threads.ts`: for each weave, groups flat docs by `parent_id` chains — each chain (idea → design → plans → dones) becomes a thread named after the design id (minus `-design`). Docs not part of a chain become loose fibers. Supports `--dry-run`. | `scripts/migrate-to-threads.ts` (new) | Step 9 |
| ✅ | 27 | Dry-run report: prints proposed moves without touching the filesystem. Human-reviewable output. | `scripts/migrate-to-threads.ts` | Step 26 |
| ✅ | 28 | Test migration on a copy of `weaves/`: `cp -r weaves/ /tmp/loom-migrate-test/ && migrate /tmp/loom-migrate-test/`. Verify result loads cleanly via new `loadWeave`. | ad-hoc | Steps 26–27 |

### Phase 8 — Migrate Loom's Own weaves/

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 29 | Backup: tag `v0.3.0-pre-weave-threads-migration`. Commit current flat state. | git | Step 28 |
| ✅ | 30 | Run migration on `weaves/`. Review diff. Fix any `requires_load` paths that reference moved files. | `weaves/**/*.md` | Step 29 |
| ✅ | 31 | Verify: run full test suite, run Loom CLI against `weaves/`, open VS Code and inspect tree view. | — | Step 30 |

### Phase 9 — Cleanup & Docs

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ✅ | 32 | Remove any flat-layout compatibility shims (should be none by design, but audit). Delete obsolete helpers like `weave.designs[0]` primary-design pattern. | codebase-wide | Step 31 |
| ✅ | 33 | Update `CLAUDE.md`: Thread is now first-class, update terminology table, architecture diagram, `Key terminology` section. | `CLAUDE.md` | Step 31 |
| ✅ | 34 | Merge `feat/weave-threads` → `main`. Tag `v0.3.0`. Close this plan. | git | Steps 32–33 |

## Settled Decisions

1. ✅ **Branch strategy:** `feat/weave-threads` off `v0.3.0-pre-weave-threads`. Don't merge until Phase 8 passes.
2. ✅ **Default thread-from-name:** `loom weave idea "Foo Bar"` → thread `foo-bar`. `--loose` opts out.
3. ✅ **Reserved subdir names** inside a weave: `plans`, `done`, `ai-chats`, `ctx`, `references`, `_archive`. Any other subdir is a Thread.
4. ✅ **Thread auto-naming on promotion:** `promoteToDesign` on a loose idea → option (b): wraps both into a new thread folder named after the idea's slug.
5. ✅ **Old CLI scripts (`test-all.sh`):** continue running flat-layout tests until Phase 6 Step 25 switches to new-layout tests.
6. ✅ **Chat files during migration:** existing `ai-chats/` stay at weave level. Per-thread chats deferred — they appear only for chats created after Phase 4.

## Done Document Placement

Done docs live **inside their thread**, not at weave level:

```
weaves/vscode-extension/
  tree-view/                              ← Thread
    tree-view-design.md
    plans/tree-view-plan-001.md
    done/tree-view-plan-001-done.md       ← inside thread
```

A completed thread (all plans closed) **stays in place** — its folder does not move. Only `loom archive` pushes it to `_archive/`. Thread status "DONE" is derived; no file movement required on completion.

**Migration implication (Step 26):** the migration script must trace each flat `weaves/{weave}/done/{id}-done.md` back to its plan via `parent_id`, then move it into `{thread}/done/` alongside that plan.

## Rollback Plan

If migration reveals a design flaw:
- `main` is untouched; checkout `main` and the Loom repo is back to flat layout.
- `v0.3.0-pre-weave-threads` tag is the restore point.
- The feature branch can be abandoned or iterated further.

## Notes

- **Do not skip Phase 7 dry-run.** Verifying the migration script before running it on real docs is non-negotiable.
- **Each phase ends with all tests green.** If Phase 3 leaves tests broken, don't start Phase 4 — fix first.
- The design doc (v3) is the source of truth for naming, structure, and metaphor. If a step contradicts the design, the design wins — come back and amend the plan.