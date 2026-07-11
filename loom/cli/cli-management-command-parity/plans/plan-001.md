---
type: plan
id: pl_01KX858NA9H614474WYXQNAQVJ
title: Plan A — new CLI tree-management commands
status: done
created: 2026-07-11
updated: 2026-07-11
version: 1
design_version: 3
tags: []
parent_id: de_01KX84P2MMQTQ32M0WYWBZP9J6
requires_load: []
target_version: 0.1.0
actual_release: 1.23.0
steps:
  - id: archive-restore
    order: 1
    status: done
    description: Add `loom archive <weave> [thread]` and `loom restore <archived-path>` wrapping loom_archive / loom_restore's app use-cases.
    files_touched: [packages/cli/src/commands/archive.ts, packages/cli/src/commands/restore.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: delete-guarded
    order: 2
    status: done
    description: Add `loom delete` (doc ULID/stem, or weave/thread folder). Prompt for confirmation when stdout is a TTY; bypass with `--yes`/`-y` so agents stay non-blocking.
    files_touched: [packages/cli/src/commands/delete.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: move-thread
    order: 3
    status: done
    description: Add `loom move-thread <weave> <thread> <target-weave>` wrapping loom_move_thread's use-case (relocate a thread folder to another weave).
    files_touched: [packages/cli/src/commands/moveThread.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: set-priority-set-thread-deps
    order: 4
    status: done
    description: Add `loom set-priority <weave> <thread> <priority>` and `loom set-thread-deps <weave> <thread> <dep...>` (dep refs resolved to th_ ULIDs at the edge) wrapping the roadmap-metadata use-cases.
    files_touched: [packages/cli/src/commands/setPriority.ts, packages/cli/src/commands/setThreadDeps.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: close-plan
    order: 5
    status: done
    description: Add `loom close-plan <plan>` wrapping loom_close_plan's FINISH_PLAN transition (finalize a plan whose steps are all done).
    files_touched: [packages/cli/src/commands/closePlan.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: quick-ship
    order: 6
    status: done
    description: Add `loom quick-ship <weave> <thread> --goal <g> --step "<desc>" (repeatable) [--release <v>] [--steps-file <json>]`, assembling the structured payload for loom_quick_ship's use-case (record already-done work as one DONE plan).
    files_touched: [packages/cli/src/commands/quickShip.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: promote-content-supplied
    order: 7
    status: done
    description: Add `loom promote <doc> <type> --body-file <path>` — supplies the child body so no host AI/sampling is needed; the use-case does the parent→child linkage + typed-doc creation. Error clearly if --body-file is omitted (CLI has no sampling).
    files_touched: [packages/cli/src/commands/promote.ts, packages/cli/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: per-command-tests
    order: 8
    status: done
    description: Add root-tests/ ts-node round-trip coverage for the new commands against a temp workspace (create→archive→restore, delete, move-thread, set-priority, set-thread-deps, close-plan, quick-ship, promote), and wire the file into scripts/test-all.sh.
    files_touched: [tests/cli-tree-management.test.ts, scripts/test-all.sh]
    blocked_by: [archive-restore, delete-guarded, move-thread, set-priority-set-thread-deps, close-plan, quick-ship, promote-content-supplied]
    satisfies: []
  - id: docs-sweep
    order: 9
    status: done
    description: Re-audit way ③ in docs/WAYS-TO-USE-LOOM.md (must be fully terminal-runnable) and refresh the command list in packages/cli/README.md to include the new commands.
    files_touched: [docs/WAYS-TO-USE-LOOM.md, packages/cli/README.md]
    blocked_by: [archive-restore, delete-guarded, move-thread, set-priority-set-thread-deps, close-plan, quick-ship, promote-content-supplied]
    satisfies: []
---
# Plan A — new CLI tree-management commands

## Goal

Add the net-new slug/human-first CLI commands for the human tree-management gap ops (everything except the rename/retitle verb reconciliation, which is Plan B). Each command is a thin delivery-layer wrapper following the existing create*.ts / rename.ts pattern: take friendly slug refs, resolve to a ULID at the CLI edge, call the existing app use-case, print a green confirmation. No new app/core/fs behavior. When done, way ③ (Pure agent) can archive, delete, restore, move/reorder threads, set deps, close/ship plans, and promote docs entirely from the terminal.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add `loom archive <weave> [thread]` and `loom restore <archived-path>` wrapping loom_archive / loom_restore's app use-cases. | packages/cli/src/commands/archive.ts, packages/cli/src/commands/restore.ts, packages/cli/src/index.ts | — | — |
| ✅ | 2 | Add `loom delete` (doc ULID/stem, or weave/thread folder). Prompt for confirmation when stdout is a TTY; bypass with `--yes`/`-y` so agents stay non-blocking. | packages/cli/src/commands/delete.ts, packages/cli/src/index.ts | — | — |
| ✅ | 3 | Add `loom move-thread <weave> <thread> <target-weave>` wrapping loom_move_thread's use-case (relocate a thread folder to another weave). | packages/cli/src/commands/moveThread.ts, packages/cli/src/index.ts | — | — |
| ✅ | 4 | Add `loom set-priority <weave> <thread> <priority>` and `loom set-thread-deps <weave> <thread> <dep...>` (dep refs resolved to th_ ULIDs at the edge) wrapping the roadmap-metadata use-cases. | packages/cli/src/commands/setPriority.ts, packages/cli/src/commands/setThreadDeps.ts, packages/cli/src/index.ts | — | — |
| ✅ | 5 | Add `loom close-plan <plan>` wrapping loom_close_plan's FINISH_PLAN transition (finalize a plan whose steps are all done). | packages/cli/src/commands/closePlan.ts, packages/cli/src/index.ts | — | — |
| ✅ | 6 | Add `loom quick-ship <weave> <thread> --goal <g> --step "<desc>" (repeatable) [--release <v>] [--steps-file <json>]`, assembling the structured payload for loom_quick_ship's use-case (record already-done work as one DONE plan). | packages/cli/src/commands/quickShip.ts, packages/cli/src/index.ts | — | — |
| ✅ | 7 | Add `loom promote <doc> <type> --body-file <path>` — supplies the child body so no host AI/sampling is needed; the use-case does the parent→child linkage + typed-doc creation. Error clearly if --body-file is omitted (CLI has no sampling). | packages/cli/src/commands/promote.ts, packages/cli/src/index.ts | — | — |
| ✅ | 8 | Add root-tests/ ts-node round-trip coverage for the new commands against a temp workspace (create→archive→restore, delete, move-thread, set-priority, set-thread-deps, close-plan, quick-ship, promote), and wire the file into scripts/test-all.sh. | tests/cli-tree-management.test.ts, scripts/test-all.sh | archive-restore, delete-guarded, move-thread, set-priority-set-thread-deps, close-plan, quick-ship, promote-content-supplied | — |
| ✅ | 9 | Re-audit way ③ in docs/WAYS-TO-USE-LOOM.md (must be fully terminal-runnable) and refresh the command list in packages/cli/README.md to include the new commands. | docs/WAYS-TO-USE-LOOM.md, packages/cli/README.md | archive-restore, delete-guarded, move-thread, set-priority-set-thread-deps, close-plan, quick-ship, promote-content-supplied | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
