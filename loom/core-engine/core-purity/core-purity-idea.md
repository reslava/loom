---
type: idea
id: id_01KV8SQ30HTWQF3EK4KT98RR73
title: "Restore core-layer purity: move ConfigRegistry IO into fs"
status: draft
created: 2026-06-16
version: 1
tags: []
parent_id: null
requires_load: []
---
# Restore core-layer purity: move ConfigRegistry IO into fs

## Problem

`packages/core` is contractually **pure** — "Pure domain logic. No IO. No side effects." But `core/src/registry.ts` (`ConfigRegistry`) imports `fs-extra`/`os`/`yaml` and **reads/writes `~/.loom/config.yaml` in its constructor**. IO inside `core` violates the `cli/vscode/mcp → app → core + fs` layering contract, and the impurity has already spread to every importer — cli `list`/`switch`/`current`/`init`/`setup`/`install`/`status`, app use-cases, and `getActiveLoomRoot`'s registry fallback.

## Why it matters

`core` being pure is what lets it be unit-tested without a filesystem and reused anywhere; it's the keystone of the layered design. A single IO leak erodes that guarantee and invites more. This was found during the `vscode → mcp` refactor audit (`vscode-mcp-refactor`) — the same drift class as the extension reaching around MCP, just one layer down. This is internal architecture hygiene (not a user-visible feature): it protects the contract that keeps the engine buildable and testable.

## Desired outcome

- `ConfigRegistry`'s file load/save lives in the **`fs`** layer (the IO layer); `packages/core/src` imports **zero** `fs`/`fs-extra`/`node:fs`.
- A build-time **guard** (sibling to `tests/vscode-no-fs-imports.test.ts`) fails on any node-fs import under `packages/core/src`, so the layer can't silently drift again — the mechanical-enforcement pattern, pointed at `core`.

## Success criteria

- `ConfigRegistry` (or a pure model + an fs-side `registryRepository`) no longer does IO from `core`; all callers updated.
- `./scripts/build-all.sh` + `./scripts/test-all.sh` green.
- New `tests/core-no-fs-imports.test.ts` passes — and would have gone red on `registry.ts` before the move.
