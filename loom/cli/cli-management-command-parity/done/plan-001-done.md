---
type: done
id: pl_01KX858NA9H614474WYXQNAQVJ-done
title: Done — Plan A — new CLI tree-management commands
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: pl_01KX858NA9H614474WYXQNAQVJ
requires_load: []
---
# Done — Plan A — new CLI tree-management commands

## Step 1 — Add `loom archive <weave> [thread]` and `loom restore <archived-path>` wrapping loom_archive / loom_restore's app use-cases.

Added `loom archive [weave] [thread] [--doc <ulid>]` and `loom restore [weave] [thread] [--archived <rel-path>]`, thin wrappers over the app `archiveItem`/`restoreItem` use-cases (same deps the MCP tools inject). New: `packages/cli/src/commands/archive.ts`, `restore.ts`; registered in `index.ts`.

## Step 2 — Add `loom delete` (doc ULID/stem, or weave/thread folder). Prompt for confirmation when stdout is a TTY; bypass with `--yes`/`-y` so agents stay non-blocking.

Added `loom delete [weave] [thread]` with `--doc`, `--archived`, and `-y/--yes`. Guarded: a `confirm()` helper prompts via `node:readline/promises` only when both stdin/stdout are TTYs, and treats non-TTY as "no" so scripted/aborted deletes never destroy data without `--yes`. Wraps `removeItem`. New: `packages/cli/src/commands/delete.ts`. (esbuild needed the `node:` prefix on the readline subpath.)

## Step 3 — Add `loom move-thread <weave> <thread> <target-weave>` wrapping loom_move_thread's use-case (relocate a thread folder to another weave).

Added `loom move-thread <weave> <thread> <target-weave>`; resolves the thread slug → `th_` ULID at the edge via `resolveThreadUlid`, then calls the `moveThread` app use-case. New: `packages/cli/src/commands/moveThread.ts`.

## Step 4 — Add `loom set-priority <weave> <thread> <priority>` and `loom set-thread-deps <weave> <thread> <dep...>` (dep refs resolved to th_ ULIDs at the edge) wrapping the roadmap-metadata use-cases.

Added `loom set-priority <weave> <thread> <priority>` and `loom set-thread-deps <weave> <thread> [deps...]`. Both resolve the thread slug → ULID; set-thread-deps also resolves each dep (`th_` ULID, or `weave/thread` / bare-`thread` slug) to a ULID, and clears when no deps are passed. Wrap `setThreadPriority`/`setThreadDeps`. New: `setPriority.ts`, `setThreadDeps.ts`.

## Step 5 — Add `loom close-plan <plan>` wrapping loom_close_plan's FINISH_PLAN transition (finalize a plan whose steps are all done).

Added `loom close-plan <plan> [--notes <text>]`; resolves the friendly plan ref → `pl_` ULID via `resolvePlanUlid`, calls `closePlan` with a strict `loadWeave`. New: `packages/cli/src/commands/closePlan.ts`.

## Step 6 — Add `loom quick-ship <weave> <thread> --goal <g> --step "<desc>" (repeatable) [--release <v>] [--steps-file <json>]`, assembling the structured payload for loom_quick_ship's use-case (record already-done work as one DONE plan).

Added `loom quick-ship <weave> [thread]` with repeatable `--step`, `--steps-file <json>`, `--notes`, `--new-thread`/`--new-thread-title`. Reconciled the arg shape to the actual `quickShip` use-case, which has no `goal` param — the design's `--goal` was dropped; each `--step` maps to the `description` (one done step), single step passed as a string. Targets an existing thread (slug→ULID) or mints one. New: `quickShip.ts`.

## Step 7 — Add `loom promote <doc> <type> --body-file <path>` — supplies the child body so no host AI/sampling is needed; the use-case does the parent→child linkage + typed-doc creation. Error clearly if --body-file is omitted (CLI has no sampling).

Added `loom promote <doc> <type> --body-file <path>` (+ `--title/--weave/--thread`). Content-supplied per Decision 3: reads the body from file and passes it to `promoteToIdea/Design/Plan`; injects a `noSamplingClient` AIClient stub that throws if invoked, and errors early if `--body-file` is omitted — the terminal has no sampling. New: `promote.ts`.

## Step 8 — Add root-tests/ ts-node round-trip coverage for the new commands against a temp workspace (create→archive→restore, delete, move-thread, set-priority, set-thread-deps, close-plan, quick-ship, promote), and wire the file into scripts/test-all.sh.

Added `tests/cli-tree-management.test.ts` — a hermetic end-to-end round-trip through the linked `loom` binary: scaffold two weaves + threads, then set-priority, set-thread-deps, move-thread (with fs assertions on the moved folder), archive+restore, delete (guard aborts in non-TTY; `--yes` removes), promote (guard + `--body-file` creates design.md), close-plan (create→start→close), quick-ship. Wired `run_test tests/cli-tree-management.test.ts` into `scripts/test-all.sh`. All 9 assertions green; full suite passes.

## Step 9 — Re-audit way ③ in docs/WAYS-TO-USE-LOOM.md (must be fully terminal-runnable) and refresh the command list in packages/cli/README.md to include the new commands.

Docs sweep: added the availability paragraph to way ③ in `docs/WAYS-TO-USE-LOOM.md` (every NO-AI tree op now has a CLI twin) and a new "Tree management (manual CRUD)" table in `packages/cli/README.md` listing all nine commands with flags. (Extension README + rename/retitle docs are Plan B.)
