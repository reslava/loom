---
type: done
id: pl_01KV8SQQ2KWVEKWWRS9ZJKPSZ2-done
title: Done — Move ConfigRegistry IO into fs + add a core-purity guard
status: done
created: 2026-06-16
version: 5
tags: []
parent_id: pl_01KV8SQQ2KWVEKWWRS9ZJKPSZ2
requires_load: []
---
# Done — Move ConfigRegistry IO into fs + add a core-purity guard

## Step 1 — Move ConfigRegistry's file IO into the fs layer: relocate registry.ts to packages/fs/src (e.g. repositories/registryRepository.ts), keep its `nowIso` import from core (fs→core is allowed), and export it from the fs barrel (packages/fs/src/index.ts).

Moved `ConfigRegistry` out of the pure core layer into `fs`.

- **Created** `packages/fs/src/repositories/registryRepository.ts` — wholesale move of the class (it is inherently IO: reads/writes `~/.loom/config.yaml`). Imports `nowIso` from core (`../../../core/dist`); `fs→core` is the allowed direction. The repository now owns the `LoomEntry` / `LoomRegistry` interfaces.
- **Deleted** `packages/core/src/registry.ts`.
- **Consolidated duplicate types**: `packages/fs/src/utils/workspaceUtils.ts` previously redefined its own `LoomEntry` / `LoomRegistry` (a duplicate of core's). It now imports `LoomRegistry` from `../repositories/registryRepository` — single definition in the fs layer, no duplication left behind.
- **Exported** `ConfigRegistry`, `LoomEntry`, `LoomRegistry` from the fs barrel (`packages/fs/src/index.ts`). No barrel conflict: `export * from './utils/workspaceUtils'` no longer re-exports those names (workspaceUtils only imports them now).

## Step 2 — Repoint every importer from '@reslava-loom/core/dist/registry' (and core/dist re-exports of ConfigRegistry) to '@reslava-loom/fs/dist'. Remove the ConfigRegistry export from the core barrel.

Repointed **all 28** `ConfigRegistry` importers from core to fs, and removed the `ConfigRegistry` re-export from the core barrel (`packages/core/src/index.ts`).

The grep (not the plan's indicative file lists) was the source of truth — the real set was wider:
- **app (7)**: `current`, `switch`, `list`, `installWorkspace`, `init`, `getState`, `setup` → `'../../fs/dist'`
- **cli (11)**: `switch`, `list`, `init`, `install`, `current`, `stale`, `next`, `status`, `search`, `blocked`, `setup` → `'../../../fs/dist'`
- **mcp (10)**: `searchDocs`, `summary`, `state`, `getStaleDocs`, `getBlockedSteps`, `refreshCtx` (single import → swapped); `roadmap`, `diagnostics`, `context`, `getStalePlans` (combined with core symbols → split: non-registry symbols stay on `core/dist`, `ConfigRegistry` moved to `'../../../fs/dist'`).

Followed the repo's actual relative-path convention rather than the plan's indicative `@reslava-loom/fs/dist`. Verified: zero `dist/registry` paths and zero `ConfigRegistry`-from-`core/dist` references remain across `packages/*/src`.

## Step 3 — Verify core purity: confirm packages/core/src imports zero fs/fs-extra/os-for-IO; core builds without any IO dependency. Resolve any remaining leak surfaced by the move.

Verified `packages/core/src` is IO-free after the move:
- Swept for `fs` / `fs-extra` / `os` / `node:fs` / `fs/promises` import specifiers → **zero matches**.
- Swept for any lingering `registry` references → only two prose/comment mentions (`dates.ts` doc comment, `state.ts` doc comment); no code import of the deleted module.

No remaining leak surfaced by the move; the only IO that lived in core (`ConfigRegistry`) is now entirely in fs. Build-clean confirmation deferred to step 5 (full `build-all`).

## Step 4 — Add the core-purity guard test (sibling to tests/vscode-no-fs-imports.test.ts): fail if anything under packages/core/src imports fs, fs-extra, node:fs, or fs/promises. Wire it into ./scripts/test-all.sh.

Added `tests/core-no-fs-imports.test.ts` — the core-purity guard, modeled on `tests/vscode-no-fs-imports.test.ts` (same walk + `SPEC_RE` import-specifier scan + `assert` from `./test-utils.ts`).

- Scans every `.ts` under `packages/core/src` and fails on any import of `fs` / `fs-extra` / `fs/promises` / `node:fs` / `node:fs/promises`.
- **No whitelist** — core is 100% IO-free, so unlike the vscode guard there is no justified exception (the absence is intentional and documented in the header).
- Would have gone **red** on the old `core/src/registry.ts` (`import * as fs from 'fs-extra'`); goes green now that the move is done.

Wired into `scripts/test-all.sh` immediately after the vscode guard, with a comment explaining it's the same pattern one layer down.

## Step 5 — Build (./scripts/build-all.sh) and run the full suite (./scripts/test-all.sh); fix any importer missed in step 2. Confirm the new core guard and all existing tests pass.

Built and tested the whole change.

- `./scripts/build-all.sh` → **clean** across core/fs/app/mcp/cli/vscode. The clean TypeScript compile is itself the proof that all 28 repoints resolved and that core compiles with **zero** fs dependency.
- `./scripts/test-all.sh` → **all tests passed** (entity/dates/roadmap/req/repositories/reducers/commands/context/CLAUDE-md-sync/vscode-guard/MCP integration — 17/17 MCP integration, multi-loom CLI, etc.). No importer was missed in step 2.
- New guard standalone: `tests/core-no-fs-imports.test.ts` → **44 core files scanned, no fs imports** — green.

Core-layer purity restored and mechanically locked: any future fs import under `packages/core/src` now fails CI.
