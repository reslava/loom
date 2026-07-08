---
type: done
id: pl_01KX1EB9T87PRY7T5SQGJGAY23-done
title: Done — Bundle-first server delivery — implementation
status: done
created: 2026-07-08
version: 3
tags: []
parent_id: pl_01KX1EB9T87PRY7T5SQGJGAY23
requires_load: []
---
# Done — Bundle-first server delivery — implementation

## Step 1 — Verify a hand-launched claude binds the bundled server via --strict-mcp-config --mcp-config

De-risk spike for option C (extension-launched agent binds the bundled server). Two terminal tests, both green.

**Test 1 — bundled server runs standalone.** Drove an MCP `initialize` + `tools/list` handshake at `packages/vscode/dist/loom-mcp.js` via plain `node`; it returned the full `loom_*` toolset. The `.vsix`-bundled server is a valid stdio MCP server outside the extension host.

**Test 2 — `claude` binds it via the flags.** `claude --strict-mcp-config --mcp-config <file>` (config = a single `loom` stdio server) → the launched agent reported **59 tools, all prefixed `mcp__loom__`, and nothing else**. Confirms both halves: `--mcp-config` binds our server, and `--strict-mcp-config` excludes all other MCP config. (An initial "NONE" was a phrasing trap — Claude Code names MCP tools `mcp__<server>__<tool>`, so nothing literally starts with `loom_`.)

**Verified transport for the plan:** `claude --help` lists `--mcp-config <files|strings>` and `--strict-mcp-config`.

**Caveat carried into step 3:** the spike used `command: "node"` (Node present on this machine). The shipped agent config MUST use `process.execPath` + `ELECTRON_RUN_AS_NODE` (not `node`) to preserve zero-install for users without Node. That exact command is already proven in-process by `mcp-client.ts:61-66`; its final terminal confirmation is step 3's real extension launch. Proven fallback if Electron-as-Node misbehaves from a terminal-spawned `claude`: a plain `node <path>` command.

Probe config used: `E:/tmp/claude/.../scratchpad/agent-mcp-probe.json`. No product code changed in this step.

## Step 2 — Extract the server spawn descriptor into a shared bundledServerSpec(root) used by mcp-client.ts

Added `packages/vscode/src/bundledServer.ts` exporting `bundledServerSpec(workspaceRoot, serverDir=__dirname): { command, args, env }` — the single source of truth for spawning the bundled server (process.execPath + [dist/loom-mcp.js] + { ELECTRON_RUN_AS_NODE, LOOM_ROOT, ...telemetry }). `env` carries only the Loom-specific additions; callers merge over inherited env. Refactored `mcp-client.ts` createMCPClient to build its StdioClientTransport from the spec (`{ ...process.env, ...spec.env }`) — behavior-identical to the old inline block. Dropped now-unused `path` and `getTelemetryEnv` imports from mcp-client. Satisfies IN7, C6.

## Step 3 — Add pure buildAgentMcpConfig(spec) and launch claude with --strict-mcp-config --mcp-config <tmpfile>

Added pure `buildAgentMcpConfig(spec, otherServers={})` to bundledServer.ts — returns the `--mcp-config` JSON with the bundled loom server (loom always wins the `loom` key). Wired `launchClaude` (claudeTerminal.ts): writes the config to an os.tmpdir() tempfile per launch (same pattern as the prompt tmpfile) and `buildClaudeCommand` now emits `claude --strict-mcp-config --mcp-config <cfg> …` across all three shell branches (pwsh, cmd, posix) with correct per-shell path quoting. This is the loom-only slice (D1a). Satisfies IN1, C2.

## Step 4 — Extend buildAgentMcpConfig to merge the project .mcp.json's non-loom servers, loom winning collisions

D1(c): added `readProjectMcpServers(root)` to claudeTerminal.ts (reads <root>/.mcp.json, returns its mcpServers map or {} if absent/unparseable) and passed it into buildAgentMcpConfig, which merges the user's non-loom servers and drops their `loom` (bundled loom wins). So a `--strict-mcp-config` launch keeps the user's other MCP servers instead of stripping them. Satisfies IN2.

## Step 5 — Add healMcpPin (silent, in-shape) + migrateMcpCommand flag to installWorkspace, surface on tool + CLI

installWorkspace.ts: added `healMcpPin` (silent, in-shape npx version bump — only when the loom server is command:'npx' with an @reslava/loom@<semver> arg and the version differs; every other shape untouched) and `migrateMcpCommandToNpx` (rewrites a legacy command:'loom' loom server to the npx pin, preserving env + other servers). The .mcp.json step now, when the file exists and not --force: optionally migrates (gated by new `migrateMcpCommand` input), then heals the pin — never clobbering the file. Surfaced `migrate_mcp_command` on the loom_install MCP tool (tools/install.ts) and `--migrate-mcp-command` on the CLI (index.ts + commands/install.ts). Verified against the built dist: stale pin healed (extra servers preserved), current pin no-op, command:'loom' untouched without the flag and migrated (env preserved) with it, and a command:'node' dev config left untouched even with the flag. Build-all green. Satisfies IN5, IN6, C4, C5.

## Step 6 — ensureWorkspaceCurrent() silent install on activation + one-time command:loom migration prompt

extension.ts: added `ensureWorkspaceCurrent()` — once per session (guarded by `workspaceRefreshedThisSession`, fired via setImmediate at activation), for an already-initialized workspace it silently calls `getMCP(root).callTool('loom_install', {})` then syncAndRefresh + syncSetupContext; errors are swallowed (background refresh, never nags). Uninitialized workspaces still go through the existing consent notification (we never silently create files). Added `maybeOfferMcpCommandMigration(root)`: when `.mcp.json`'s loom server is `command:"loom"`, shows a one-time notification ('…points at a separate loom CLI that can drift…' → Update / Keep as-is); Update calls `loom_install({ migrate_mcp_command: true })`, Keep-as-is persists a workspaceState dismiss so it never nags again. Satisfies IN4, IN6, C3. NOTE: the runtime behavior (activation-time install, the notification) can only be fully confirmed in a real Extension Development Host — verified here that it type-checks and build-all bundles cleanly; the underlying loom_install path is covered by the install-workspace tests.

## Step 7 — Extend install-workspace tests; add agent-mcp-config tests (loom-only + merge); wire into test-all

Split the pure `buildAgentMcpConfig` into a new vscode-free module `packages/vscode/src/agentMcpConfig.ts` (bundledServer.ts now re-exports it + the BundledServerSpec type), so a plain Node test can import it. Added `tests/agent-mcp-config.test.ts`: case (a) loom-only config carries exactly the bundled loom server from the spec; case (c) merging other servers preserves them and the bundled loom overrides a stale user `loom` entry. Extended `tests/install-workspace.test.ts` with test 8 (in-shape npx pin healed to canonical version, unrelated server preserved, reports written) and test 9 (command:"loom" untouched without the flag, migrated with env preserved when `migrateMcpCommand` is passed). Wired `run_test tests/agent-mcp-config.test.ts` into scripts/test-all.sh. build-all + test-all green; both files pass standalone. Satisfies IN9.

## Step 8 — Document bundle / local-path dev configs for the Loom repo and Chord Flow; no product code depends on it

Documented the dogfooding server convention. DEVIATION from the plan's named file: put it in the repo dev contract (root `CLAUDE.md`, under Build and test → 'Dogfooding server config — never a global loom') instead of `loom/refs/getting-started-reference.md` — getting-started is a public end-user onboarding doc, whereas dogfooding-against-a-local-build is a contributor concern, so CLAUDE.md is the correct home (repo-specific, gate-excluded, no rule marker → not mirrored to the LOOM_CLAUDE_MD template). Documents the two dev paths: (1) through the extension (bundle = latest build, agent bound via --mcp-config), (2) standalone terminal with an explicit local-path `command:"node"` .mcp.json, and states `command:"loom"` is retired. Satisfies IN8.
