---
type: req
id: rq_01KX1DGTB0FNKX6QB6Z86JZ2HQ
title: Bundle-first server delivery — retire the global loom CLI as a Loom dependency — Requirements
status: locked
created: 2026-07-08
updated: 2026-07-08
version: 1
design_version: 5
tags: []
parent_id: de_01KX1CVTAQZJMAQCRP6TJPH1Q8
requires_load: []
---
# Bundle-first server delivery — retire the global loom CLI as a Loom dependency — Requirements

### ✅ Included

- `IN1` Extension-launched agents (the AI buttons' `launchClaude`) bind the extension's **bundled** MCP server, not the project `.mcp.json`, via `claude --strict-mcp-config --mcp-config <temp file>`.
- `IN2` That temp agent config is built by **merging the project `.mcp.json`'s non-loom servers with the bundled loom server** (loom wins any key collision), so the user's other MCP servers survive the launch. Ships in this release (D1(c)); the loom-only slice (D1(a)) is only an internal first increment.
- `IN3` `loom_install` is idempotent — `writeIfChanged` skips byte-identical writes and reports truthfully (already shipped as plan-001; part of this thread's scope).
- `IN4` The extension runs `loom_install` (non-force) **silently on activation** for already-initialized workspaces, so an extension upgrade refreshes Loom-owned artifacts with no user action; the consent prompt is retained only for *uninitialized* workspaces.
- `IN5` **Silent, in-shape** npx version-pin heal in `.mcp.json`: when the file matches the canonical npx-pinned shape and the pinned `@reslava/loom@<version>` differs from the current lockstep version, bump just that arg.
- `IN6` **Consented** migration of legacy `command:"loom"` → npx pin, flag-gated by `migrateMcpCommand` on `loom_install`, surfaced via a one-time extension notification using the `setupDismissedGap` don't-nag pattern; CLI parity flag `--migrate-mcp-command`.
- `IN7` A shared `bundledServerSpec(root)` as the single source of truth for how the server is spawned, used by both `mcp-client.ts` and `launchClaude`; the pure `buildAgentMcpConfig` is unit-tested.
- `IN8` Dogfooding convention documented (bundle via Extension Development Host / dev `.vsix`, or an explicit local-path `command:"node"` config) for the Loom repo and Chord Flow.
- `IN9` Tests: installWorkspace pin-heal + migrate + idempotency; `buildAgentMcpConfig` loom-only (a) and merge (c); the terminal-binding unknown validated by a real launch.

### ❌ Excluded

- `EX1` Auto-updating a globally-installed npm `loom` from the extension (invasive global-state write; re-entrenches the coupling being removed).
- `EX2` Dropping npx / standalone / non-VS-Code-agent support, or removing the npm package — only the *persistent global install* is retired.
- `EX3` Changes to the doc workflow, plan model, or any `loom_*` write-path semantics.
- `EX4` Any dev-vs-user classifier (reachability, `unmanaged` marker, version/symlink probing) for `.mcp.json` — made unnecessary by uniform consented migration.
- `EX5` Silent rewriting of `command:"loom"` (the migration is always user-consented).
- `EX6` `--force` on the activation-time install (would clobber user-owned files).
- `EX7` Touching any `.mcp.json` shape other than the two handled cases; custom/dev/local-path configs are left untouched.

### ⛓ Constraints

- `C1` Layer rule holds: `vscode → mcp → app`. The extension writes no config directly — `.mcp.json` and doc writes go through `loom_install` (app) via MCP. *(Generating the agent's temp `--mcp-config` file is a launch artifact under `os.tmpdir()`, not a workspace/doc write — allowed, like the existing prompt tmpfile.)*
- `C2` On the extension-launched path the agent's server version **equals the extension version by construction**, not by heuristic — independent of `.mcp.json` or any global `loom`.
- `C3` Never clobber user-owned files (`ctx.md`, `.loom/settings.json`, `.claude/settings.local.json`, `CLAUDE-LOCAL.md`); only Loom-owned artifacts refresh.
- `C4` The version-pin heal touches **only** the canonical npx-pinned shape; every other shape is left untouched.
- `C5` The `command:"loom"` → npx migration is a semantic change and MUST be user-consented, never silent.
- `C6` `bundledServerSpec` is the single source of truth — the in-process client transport and the launched-agent config must not diverge in how they spawn the server.
- `C7` Build via `./scripts/build-all.sh`, test via `./scripts/test-all.sh`; new tests live in root `tests/` in the ts-node style importing `dist`.
- `C8` The npx pin heals to the shared **lockstep** `LOOM_VERSION` (never an independent per-package version).