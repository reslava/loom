---
type: plan
id: pl_01KX39BXPZ6DRR2CEGX2EQZ554
title: Portable, subdir-robust LOOM_ROOT resolution
status: done
created: 2026-07-09
updated: 2026-07-09
version: 1
design_version: 6
req_version: 1
tags: []
parent_id: de_01KX1CVTAQZJMAQCRP6TJPH1Q8
requires_load: []
target_version: 0.1.0
actual_release: 1.21.2
steps:
  - id: shared-resolveloomroot-in-fs
    order: 1
    status: done
    description: "Add resolveLoomRoot(env, cwd) to packages/fs: return env.LOOM_ROOT when it is a non-empty string that is NOT an unexpanded ${…} placeholder; else walk up from cwd to the nearest ancestor directory containing a .loom/ folder and return that; else return cwd. Export it from the fs package index."
    files_touched: [packages/fs/src/resolveLoomRoot.ts, packages/fs/src/index.ts]
    blocked_by: []
    satisfies: [IN10, C9]
  - id: wire-resolver-into-the-3-entry
    order: 2
    status: done
    description: "Replace the three duplicated `process.env['LOOM_ROOT'] ?? process.cwd()` sites with resolveLoomRoot(process.env, process.cwd()): packages/mcp/src/index.ts, packages/cli/src/index.ts (the `loom mcp` boot ~line 310), and packages/vscode/src/loom-mcp-entry.ts."
    files_touched: [packages/mcp/src/index.ts, packages/cli/src/index.ts, packages/vscode/src/loom-mcp-entry.ts]
    blocked_by: []
    satisfies: [IN10, C9]
  - id: subdir-no-root-stderr-notice
    order: 3
    status: done
    description: "Subdir/no-root boot notice: resolveLoomRoot returns { root, source: 'env' | 'ancestor' | 'cwd-fallback' }; add a pure loomRootNotice(source, root, cwd) that builds a one-line stderr message (info when resolved from an ancestor / subdir launch, warning when no .loom/ found and defaulting to cwd; null for env/root). Wire each entry point to console.error the notice (stderr only — never stdout)."
    files_touched: [packages/fs/src/resolveLoomRoot.ts, packages/fs/src/index.ts, packages/mcp/src/index.ts, packages/cli/src/index.ts, packages/vscode/src/loom-mcp-entry.ts]
    blocked_by: []
    satisfies: [IN10]
  - id: drop-loom-root-from-the-generator
    order: 4
    status: done
    description: "Generator: stop writing LOOM_ROOT. In installWorkspace.ts step-4 remove the `env: { LOOM_ROOT: '${workspaceFolder}' }` (drop the env key entirely from the generated loom server), and remove the same default from migrateMcpCommandToNpx. Update the surrounding comment to explain the server now resolves the root by walking up to .loom/."
    files_touched: [packages/app/src/installWorkspace.ts]
    blocked_by: []
    satisfies: [IN10]
  - id: in-shape-env-heal-for-stale
    order: 5
    status: done
    description: "Add an in-shape, silent env-heal to the non-force install path (alongside healMcpPin): when an existing .mcp.json's loom server env.LOOM_ROOT is an unexpanded ${…} placeholder, delete that key; if env becomes empty, drop the empty env object. Never touch a concrete LOOM_ROOT value. Runs as part of every loom_install so activation refreshes already-shipped 1.21.1 files and clears the /mcp warning."
    files_touched: [packages/app/src/installWorkspace.ts]
    blocked_by: []
    satisfies: [IN11]
  - id: doc-sync-the-3-claude-surfaces
    order: 6
    status: done
    description: "Doc-sync: remove the `LOOM_ROOT: \"${workspaceFolder}\"` env line from the three CLAUDE surfaces so the documented .mcp.json matches what install writes — the LOOM_CLAUDE_MD template in installWorkspace.ts, the root CLAUDE.md, and .loom/CLAUDE.md. Keep the rule:claude-code-config marker parity intact (edit both machine-synced surfaces identically)."
    files_touched: [packages/app/src/installWorkspace.ts, CLAUDE.md, .loom/CLAUDE.md]
    blocked_by: []
    satisfies: [IN10]
  - id: tests-invert-placeholder-asserts-resolver-unit
    order: 7
    status: done
    description: "Tests: in tests/install-workspace.test.ts invert the two assertions that require the ${workspaceFolder} placeholder (fresh install + migration) to assert the generated loom server has no LOOM_ROOT env; add an env-heal test (placeholder stripped on non-force install, concrete LOOM_ROOT left untouched). Add tests/resolve-loom-root.test.ts covering: env set → used; env is ${…} → walk-up; launched from a subdir → resolves to the ancestor with .loom/; nothing found → cwd. Register the new test in scripts/test-all.sh. Build with ./scripts/build-all.sh, run ./scripts/test-all.sh."
    files_touched: [tests/install-workspace.test.ts, tests/resolve-loom-root.test.ts, scripts/test-all.sh]
    blocked_by: []
    satisfies: [IN9, IN10, IN11]
---
# Portable, subdir-robust LOOM_ROOT resolution

## Goal

Fix the v1.21.1 regression (commit 3244bbf) where `loom install` writes `LOOM_ROOT: "${workspaceFolder}"` into `.mcp.json`. That token is a VS Code editor variable; `.mcp.json`'s only real reader is a standalone terminal `claude`, which cannot expand it — it warns `Missing environment variables: workspaceFolder` and passes the literal string through, so every `loom_*` tool fails to resolve paths from a plain CLI session. The server's `process.env['LOOM_ROOT'] ?? process.cwd()` guard does not save it because the var is set (to a bad value), not unset. Deliver Option A: stop writing `LOOM_ROOT` (portable/committable) and make the server resolve the root robustly by walking up from cwd to the nearest `.loom/` — which also closes the subdirectory-launch gap (a `claude` started in `tests/` resolves to the project root, not `tests/`) and self-heals already-shipped 1.21.1 files whose unexpanded `${…}` value now falls through to the walk-up. Keep the layer rule intact (`cli/vscode/mcp → app → core+fs`); the resolver is IO, so it lives in `fs`.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add resolveLoomRoot(env, cwd) to packages/fs: return env.LOOM_ROOT when it is a non-empty string that is NOT an unexpanded ${…} placeholder; else walk up from cwd to the nearest ancestor directory containing a .loom/ folder and return that; else return cwd. Export it from the fs package index. | packages/fs/src/resolveLoomRoot.ts, packages/fs/src/index.ts | — | IN10, C9 |
| ✅ | 2 | Replace the three duplicated `process.env['LOOM_ROOT'] ?? process.cwd()` sites with resolveLoomRoot(process.env, process.cwd()): packages/mcp/src/index.ts, packages/cli/src/index.ts (the `loom mcp` boot ~line 310), and packages/vscode/src/loom-mcp-entry.ts. | packages/mcp/src/index.ts, packages/cli/src/index.ts, packages/vscode/src/loom-mcp-entry.ts | — | IN10, C9 |
| ✅ | 3 | Subdir/no-root boot notice: resolveLoomRoot returns { root, source: 'env' \| 'ancestor' \| 'cwd-fallback' }; add a pure loomRootNotice(source, root, cwd) that builds a one-line stderr message (info when resolved from an ancestor / subdir launch, warning when no .loom/ found and defaulting to cwd; null for env/root). Wire each entry point to console.error the notice (stderr only — never stdout). | packages/fs/src/resolveLoomRoot.ts, packages/fs/src/index.ts, packages/mcp/src/index.ts, packages/cli/src/index.ts, packages/vscode/src/loom-mcp-entry.ts | — | IN10 |
| ✅ | 4 | Generator: stop writing LOOM_ROOT. In installWorkspace.ts step-4 remove the `env: { LOOM_ROOT: '${workspaceFolder}' }` (drop the env key entirely from the generated loom server), and remove the same default from migrateMcpCommandToNpx. Update the surrounding comment to explain the server now resolves the root by walking up to .loom/. | packages/app/src/installWorkspace.ts | — | IN10 |
| ✅ | 5 | Add an in-shape, silent env-heal to the non-force install path (alongside healMcpPin): when an existing .mcp.json's loom server env.LOOM_ROOT is an unexpanded ${…} placeholder, delete that key; if env becomes empty, drop the empty env object. Never touch a concrete LOOM_ROOT value. Runs as part of every loom_install so activation refreshes already-shipped 1.21.1 files and clears the /mcp warning. | packages/app/src/installWorkspace.ts | — | IN11 |
| ✅ | 6 | Doc-sync: remove the `LOOM_ROOT: "${workspaceFolder}"` env line from the three CLAUDE surfaces so the documented .mcp.json matches what install writes — the LOOM_CLAUDE_MD template in installWorkspace.ts, the root CLAUDE.md, and .loom/CLAUDE.md. Keep the rule:claude-code-config marker parity intact (edit both machine-synced surfaces identically). | packages/app/src/installWorkspace.ts, CLAUDE.md, .loom/CLAUDE.md | — | IN10 |
| ✅ | 7 | Tests: in tests/install-workspace.test.ts invert the two assertions that require the ${workspaceFolder} placeholder (fresh install + migration) to assert the generated loom server has no LOOM_ROOT env; add an env-heal test (placeholder stripped on non-force install, concrete LOOM_ROOT left untouched). Add tests/resolve-loom-root.test.ts covering: env set → used; env is ${…} → walk-up; launched from a subdir → resolves to the ancestor with .loom/; nothing found → cwd. Register the new test in scripts/test-all.sh. Build with ./scripts/build-all.sh, run ./scripts/test-all.sh. | tests/install-workspace.test.ts, tests/resolve-loom-root.test.ts, scripts/test-all.sh | — | IN9, IN10, IN11 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:shared-resolveloomroot-in-fs -->
### Step 1 — Shared resolveLoomRoot in fs

Placeholder detection: value matches /\$\{.*\}/ → treat as unset. Walk-up: from path.resolve(cwd), check existsSync(join(dir,'.loom')); step to path.dirname until root; if none found, fall back to cwd. Pure except for fs.existsSync — inject or use the fs module directly consistent with the package's style.
