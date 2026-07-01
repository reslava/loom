---
type: plan
id: pl_01KV8SQQ2KWVEKWWRS9ZJKPSZ2
title: Move ConfigRegistry IO into fs + add a core-purity guard
status: done
created: 2026-06-16
updated: 2026-06-16
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
actual_release: 1.9.2
steps:
  - id: relocate-registry-io-to-fs
    order: 1
    status: done
    description: "Move ConfigRegistry's file IO into the fs layer: relocate registry.ts to packages/fs/src (e.g. repositories/registryRepository.ts), keep its `nowIso` import from core (fs→core is allowed), and export it from the fs barrel (packages/fs/src/index.ts)."
    files_touched: [packages/fs/src/repositories/registryRepository.ts, packages/core/src/registry.ts, packages/fs/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: repoint-importers
    order: 2
    status: done
    description: Repoint every importer from '@reslava-loom/core/dist/registry' (and core/dist re-exports of ConfigRegistry) to '@reslava-loom/fs/dist'. Remove the ConfigRegistry export from the core barrel.
    files_touched: [packages/cli/src/commands/list.ts, packages/cli/src/commands/switch.ts, packages/cli/src/commands/current.ts, packages/cli/src/commands/init.ts, packages/cli/src/commands/setup.ts, packages/cli/src/commands/install.ts, packages/cli/src/commands/status.ts, packages/core/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: verify-core-is-pure
    order: 3
    status: done
    description: "Verify core purity: confirm packages/core/src imports zero fs/fs-extra/os-for-IO; core builds without any IO dependency. Resolve any remaining leak surfaced by the move."
    files_touched: [packages/core/src]
    blocked_by: []
    satisfies: []
  - id: guard-ban-fs-imports-in-core
    order: 4
    status: done
    description: "Add the core-purity guard test (sibling to tests/vscode-no-fs-imports.test.ts): fail if anything under packages/core/src imports fs, fs-extra, node:fs, or fs/promises. Wire it into ./scripts/test-all.sh."
    files_touched: [tests/core-no-fs-imports.test.ts, scripts/test-all.sh]
    blocked_by: []
    satisfies: []
  - id: build-test
    order: 5
    status: done
    description: Build (./scripts/build-all.sh) and run the full suite (./scripts/test-all.sh); fix any importer missed in step 2. Confirm the new core guard and all existing tests pass.
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Move ConfigRegistry IO into fs + add a core-purity guard

## Goal

Restore the "core has zero IO" contract. ConfigRegistry currently lives in packages/core/src/registry.ts but reads/writes ~/.loom/config.yaml via fs-extra — IO inside the pure core layer. Move its file load/save into the fs layer (where IO belongs), repoint every importer, and add a build-time guard that fails on any node-fs import under packages/core/src so the layer can't drift again. Found during the vscode-mcp-refactor audit; same drift class, one layer down.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Move ConfigRegistry's file IO into the fs layer: relocate registry.ts to packages/fs/src (e.g. repositories/registryRepository.ts), keep its `nowIso` import from core (fs→core is allowed), and export it from the fs barrel (packages/fs/src/index.ts). | packages/fs/src/repositories/registryRepository.ts, packages/core/src/registry.ts, packages/fs/src/index.ts | — | — |
| ✅ | 2 | Repoint every importer from '@reslava-loom/core/dist/registry' (and core/dist re-exports of ConfigRegistry) to '@reslava-loom/fs/dist'. Remove the ConfigRegistry export from the core barrel. | packages/cli/src/commands/list.ts, packages/cli/src/commands/switch.ts, packages/cli/src/commands/current.ts, packages/cli/src/commands/init.ts, packages/cli/src/commands/setup.ts, packages/cli/src/commands/install.ts, packages/cli/src/commands/status.ts, packages/core/src/index.ts | — | — |
| ✅ | 3 | Verify core purity: confirm packages/core/src imports zero fs/fs-extra/os-for-IO; core builds without any IO dependency. Resolve any remaining leak surfaced by the move. | packages/core/src | — | — |
| ✅ | 4 | Add the core-purity guard test (sibling to tests/vscode-no-fs-imports.test.ts): fail if anything under packages/core/src imports fs, fs-extra, node:fs, or fs/promises. Wire it into ./scripts/test-all.sh. | tests/core-no-fs-imports.test.ts, scripts/test-all.sh | — | — |
| ✅ | 5 | Build (./scripts/build-all.sh) and run the full suite (./scripts/test-all.sh); fix any importer missed in step 2. Confirm the new core guard and all existing tests pass. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:relocate-registry-io-to-fs -->
### Step 1 — Relocate registry IO to fs

Decide split vs wholesale move: simplest is to move ConfigRegistry wholesale to fs (it is inherently an IO class). If any pure registry *model* (LoomRegistry/LoomEntry interfaces) is used by core code, leave those type-only definitions in core and move only the IO. Note: getActiveLoomRoot in fs/workspaceUtils already reads config.yaml inline — consider having it reuse the moved repository, but that is optional cleanup.

<!-- step:repoint-importers -->
### Step 2 — Repoint importers

Grep for ConfigRegistry across all packages first — app use-cases (getState deps), mcp resources/tools (diagnostics passes `registry`), and cli all import it. Update each to the fs path. The files list is indicative, not exhaustive — the grep is the source of truth.

<!-- step:verify-core-is-pure -->
### Step 3 — Verify core is pure

After the move, registry.ts should be gone from core. Sweep packages/core/src for any other fs/fs-extra/node:fs import (the upcoming guard will assert this, but verify manually so the guard goes green on first run).

<!-- step:guard-ban-fs-imports-in-core -->
### Step 4 — Guard: ban fs imports in core

Reuse the walk + import-specifier scan from vscode-no-fs-imports.test.ts. No whitelist expected (core should be 100% IO-free). Land after steps 1-3 so it goes green immediately.

<!-- step:build-test -->
### Step 5 — Build + test

Watch for cli/app/mcp call sites that constructed ConfigRegistry — TypeScript will flag the moved import paths at build time.
