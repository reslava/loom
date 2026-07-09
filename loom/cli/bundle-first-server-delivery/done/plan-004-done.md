---
type: done
id: pl_01KX39BXPZ6DRR2CEGX2EQZ554-done
title: Done — Portable, subdir-robust LOOM_ROOT resolution
status: done
created: 2026-07-09
version: 1
tags: []
parent_id: pl_01KX39BXPZ6DRR2CEGX2EQZ554
requires_load: []
---
# Done — Portable, subdir-robust LOOM_ROOT resolution

## Step 1 — Add resolveLoomRoot(env, cwd) to packages/fs: return env.LOOM_ROOT when it is a non-empty string that is NOT an unexpanded ${…} placeholder; else walk up from cwd to the nearest ancestor directory containing a .loom/ folder and return that; else return cwd. Export it from the fs package index.

Added `packages/fs/src/resolveLoomRoot.ts`: `resolveLoomRoot(env, cwd): { root, source }`. Precedence — explicit `LOOM_ROOT` wins unless it's an unexpanded `${…}` placeholder; else walk up from cwd to the nearest ancestor with `.loom/`; else cwd. Non-throwing. Added a home-dir guard so the global `~/.loom` **registry** (`~/.loom/config.yaml`) never masquerades as a workspace root during walk-up. Exported from `packages/fs/src/index.ts` alongside `loomRootNotice` and the `LoomRootSource`/`ResolvedLoomRoot` types.

## Step 2 — Replace the three duplicated `process.env['LOOM_ROOT'] ?? process.cwd()` sites with resolveLoomRoot(process.env, process.cwd()): packages/mcp/src/index.ts, packages/cli/src/index.ts (the `loom mcp` boot ~line 310), and packages/vscode/src/loom-mcp-entry.ts.

Replaced the three duplicated `process.env['LOOM_ROOT'] ?? process.cwd()` sites with `resolveLoomRoot(process.env, process.cwd())` in `packages/mcp/src/index.ts`, `packages/cli/src/index.ts` (the `loom mcp` boot), and `packages/vscode/src/loom-mcp-entry.ts` — all importing from `../../fs/dist` (the established relative-dist convention). The `??` guard never fired on the bad value because the var was *set* (to `${workspaceFolder}`), not unset — that's the whole bug.

## Step 3 — Subdir/no-root boot notice: resolveLoomRoot returns { root, source: 'env' | 'ancestor' | 'cwd-fallback' }; add a pure loomRootNotice(source, root, cwd) that builds a one-line stderr message (info when resolved from an ancestor / subdir launch, warning when no .loom/ found and defaulting to cwd; null for env/root). Wire each entry point to console.error the notice (stderr only — never stdout).

`resolveLoomRoot` returns `{ root, source: 'env' | 'ancestor' | 'cwd-fallback' }`; added pure `loomRootNotice(source, root, cwd): string | null` — an info line for a subdir launch (`ancestor` with cwd≠root), a warning for `cwd-fallback` (no `.loom/` found), null otherwise. Each entry point does `console.error(notice)` (stderr only — stdout is the JSON-RPC channel). Verified live: bundled server spawned from `packages/cli` with `LOOM_ROOT=${workspaceFolder}` printed `Loom: launched from a subdirectory — resolved workspace root to J:\src\loom.`

## Step 4 — Generator: stop writing LOOM_ROOT. In installWorkspace.ts step-4 remove the `env: { LOOM_ROOT: '${workspaceFolder}' }` (drop the env key entirely from the generated loom server), and remove the same default from migrateMcpCommandToNpx. Update the surrounding comment to explain the server now resolves the root by walking up to .loom/.

`installWorkspace` step-4 no longer writes any `env`/`LOOM_ROOT` into the generated `.mcp.json`; removed the `${workspaceFolder}` default from `migrateMcpCommandToNpx` too. Updated the comment to explain the server self-resolves the root. Committable + subdir-robust, and no VS-Code-only placeholder for a terminal agent to choke on.

## Step 5 — Add an in-shape, silent env-heal to the non-force install path (alongside healMcpPin): when an existing .mcp.json's loom server env.LOOM_ROOT is an unexpanded ${…} placeholder, delete that key; if env becomes empty, drop the empty env object. Never touch a concrete LOOM_ROOT value. Runs as part of every loom_install so activation refreshes already-shipped 1.21.1 files and clears the /mcp warning.

Added `healMcpLoomRootEnv(fsDep, mcpJsonPath)` and wired it into the non-force reconcile branch alongside `healMcpPin`. Strips `LOOM_ROOT` ONLY when its value is an unexpanded `${…}` placeholder (drops the `env` object if it empties); a concrete value and sibling env keys are left untouched. Silent, within-shape repair (no consent needed) — this is what self-heals already-shipped 1.21.1 `.mcp.json` files on activation and clears the `/mcp` warning.

## Step 6 — Doc-sync: remove the `LOOM_ROOT: "${workspaceFolder}"` env line from the three CLAUDE surfaces so the documented .mcp.json matches what install writes — the LOOM_CLAUDE_MD template in installWorkspace.ts, the root CLAUDE.md, and .loom/CLAUDE.md. Keep the rule:claude-code-config marker parity intact (edit both machine-synced surfaces identically).

Dropped the `LOOM_ROOT: "${workspaceFolder}"` line from the `LOOM_CLAUDE_MD` template (+ added a short note on self-resolution) and swept every user-facing surface that ships a copyable `.mcp.json`: root `CLAUDE.md`, `README.md`, `packages/cli/README.md`, `packages/vscode/README.md`, `docs/CLI_USER_GUIDE.md`, `loom/refs/mcp-reference.md` (kept the `DEEPSEEK_API_KEY` sibling), `loom/refs/architecture-reference.md`, `loom/refs/CLAUDE-template-reference.md`. `.loom/CLAUDE.md` was deleted (see below), so no edit there. Separately: deleted the redundant `.loom/CLAUDE.md` + `CLAUDE-LOCAL.md` working files in this recursive repo (both gitignored/untracked) so the root CLAUDE.md's two `@`-imports become harmless no-ops instead of loading a conflicting generic contract on top of the tailored one.

## Step 7 — Tests: in tests/install-workspace.test.ts invert the two assertions that require the ${workspaceFolder} placeholder (fresh install + migration) to assert the generated loom server has no LOOM_ROOT env; add an env-heal test (placeholder stripped on non-force install, concrete LOOM_ROOT left untouched). Add tests/resolve-loom-root.test.ts covering: env set → used; env is ${…} → walk-up; launched from a subdir → resolves to the ancestor with .loom/; nothing found → cwd. Register the new test in scripts/test-all.sh. Build with ./scripts/build-all.sh, run ./scripts/test-all.sh.

Inverted the two placeholder assertions in `tests/install-workspace.test.ts` (fresh install + migration now assert `env === undefined`) and added test 10 for the env-heal (placeholder stripped, concrete `LOOM_ROOT` + sibling key preserved). Added `tests/resolve-loom-root.test.ts` (env-wins / `${…}`-ignored / subdir walk-up + notice / cwd-fallback + warning) and registered it in `scripts/test-all.sh`. `build-all` clean; full `test-all` green; both new/changed tests pass individually.
