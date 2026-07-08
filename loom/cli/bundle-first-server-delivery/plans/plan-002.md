---
type: plan
id: pl_01KX1EB9T87PRY7T5SQGJGAY23
title: Bundle-first server delivery — implementation
status: done
created: 2026-07-08
updated: 2026-07-08
version: 1
design_version: 6
req_version: 1
tags: []
parent_id: de_01KX1CVTAQZJMAQCRP6TJPH1Q8
requires_load: []
target_version: 0.1.0
steps:
  - id: prove-the-terminal-binding-de-risk
    order: 1
    status: done
    description: Verify a hand-launched claude binds the bundled server via --strict-mcp-config --mcp-config
    files_touched: []
    blocked_by: []
    satisfies: [IN1, C2]
  - id: bundledserverspec-single-source-of-truth
    order: 2
    status: done
    description: Extract the server spawn descriptor into a shared bundledServerSpec(root) used by mcp-client.ts
    files_touched: [packages/vscode/src/bundledServer.ts, packages/vscode/src/mcp-client.ts]
    blocked_by: []
    satisfies: [IN7, C6]
  - id: buildagentmcpconfig-loom-only-launchclaude-wiring-d1
    order: 3
    status: done
    description: Add pure buildAgentMcpConfig(spec) and launch claude with --strict-mcp-config --mcp-config <tmpfile>
    files_touched: [packages/vscode/src/bundledServer.ts, packages/vscode/src/commands/claudeTerminal.ts]
    blocked_by: [bundledserverspec-single-source-of-truth]
    satisfies: [IN1, C2]
  - id: merge-non-loom-servers-into-the
    order: 4
    status: done
    description: Extend buildAgentMcpConfig to merge the project .mcp.json's non-loom servers, loom winning collisions
    files_touched: [packages/vscode/src/bundledServer.ts, packages/vscode/src/commands/claudeTerminal.ts]
    blocked_by: [buildagentmcpconfig-loom-only-launchclaude-wiring-d1]
    satisfies: [IN2]
  - id: mcp-json-pin-heal-migrate-flag
    order: 5
    status: done
    description: Add healMcpPin (silent, in-shape) + migrateMcpCommand flag to installWorkspace, surface on tool + CLI
    files_touched: [packages/app/src/installWorkspace.ts, packages/mcp/src/tools/install.ts, packages/cli/src/commands/install.ts]
    blocked_by: []
    satisfies: [IN5, IN6, C4, C5]
  - id: activation-self-refresh-consented-migration-notification
    order: 6
    status: done
    description: "ensureWorkspaceCurrent() silent install on activation + one-time command:loom migration prompt"
    files_touched: [packages/vscode/src/extension.ts]
    blocked_by: [mcp-json-pin-heal-migrate-flag]
    satisfies: [IN4, IN6, C3]
  - id: tests-install-heal-migrate-agent-config
    order: 7
    status: done
    description: Extend install-workspace tests; add agent-mcp-config tests (loom-only + merge); wire into test-all
    files_touched: [tests/install-workspace.test.ts, tests/agent-mcp-config.test.ts, scripts/test-all.sh]
    blocked_by: [merge-non-loom-servers-into-the, mcp-json-pin-heal-migrate-flag]
    satisfies: [IN9]
  - id: dogfooding-convention-docs
    order: 8
    status: done
    description: Document bundle / local-path dev configs for the Loom repo and Chord Flow; no product code depends on it
    files_touched: [loom/refs/getting-started-reference.md]
    blocked_by: []
    satisfies: [IN8]
---
# Bundle-first server delivery — implementation

## Goal

Implement the locked req for bundle-first server delivery. Extension-launched agents bind the extension's bundled MCP server (never the project .mcp.json), install self-refreshes on activation so an extension upgrade updates Loom-owned artifacts, and .mcp.json is kept current for hand-launched agents via a silent in-shape npx pin-heal plus a consented command:"loom"→npx migration. The idempotent-install fix already shipped as plan-001; this plan builds the rest. Sequenced to de-risk the load-bearing unknown (terminal claude binding the Electron-as-Node server) before the dependent work, and to land D1(a) loom-only before D1(c) merge — with (c) required for release.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Verify a hand-launched claude binds the bundled server via --strict-mcp-config --mcp-config | — | — | IN1, C2 |
| ✅ | 2 | Extract the server spawn descriptor into a shared bundledServerSpec(root) used by mcp-client.ts | packages/vscode/src/bundledServer.ts, packages/vscode/src/mcp-client.ts | — | IN7, C6 |
| ✅ | 3 | Add pure buildAgentMcpConfig(spec) and launch claude with --strict-mcp-config --mcp-config <tmpfile> | packages/vscode/src/bundledServer.ts, packages/vscode/src/commands/claudeTerminal.ts | bundledserverspec-single-source-of-truth | IN1, C2 |
| ✅ | 4 | Extend buildAgentMcpConfig to merge the project .mcp.json's non-loom servers, loom winning collisions | packages/vscode/src/bundledServer.ts, packages/vscode/src/commands/claudeTerminal.ts | buildagentmcpconfig-loom-only-launchclaude-wiring-d1 | IN2 |
| ✅ | 5 | Add healMcpPin (silent, in-shape) + migrateMcpCommand flag to installWorkspace, surface on tool + CLI | packages/app/src/installWorkspace.ts, packages/mcp/src/tools/install.ts, packages/cli/src/commands/install.ts | — | IN5, IN6, C4, C5 |
| ✅ | 6 | ensureWorkspaceCurrent() silent install on activation + one-time command:loom migration prompt | packages/vscode/src/extension.ts | mcp-json-pin-heal-migrate-flag | IN4, IN6, C3 |
| ✅ | 7 | Extend install-workspace tests; add agent-mcp-config tests (loom-only + merge); wire into test-all | tests/install-workspace.test.ts, tests/agent-mcp-config.test.ts, scripts/test-all.sh | merge-non-loom-servers-into-the, mcp-json-pin-heal-migrate-flag | IN9 |
| ✅ | 8 | Document bundle / local-path dev configs for the Loom repo and Chord Flow; no product code depends on it | loom/refs/getting-started-reference.md | — | IN8 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:prove-the-terminal-binding-de-risk -->
### Step 1 — Prove the terminal binding (de-risk)

The one unverified assumption behind option C: that `claude --strict-mcp-config --mcp-config <file>` — where the config's `command` is `process.execPath` with `ELECTRON_RUN_AS_NODE=1` and `args:[<dist>/loom-mcp.js]` — actually spawns and binds the loom server from a *terminal* session (not just the in-process extension client). Run a real launch, confirm the agent sees loom_* tools. If Electron-as-Node fails from a terminal-spawned claude, record the fallback (a plain `node`/npx command in the config) before building on it.

<!-- step:bundledserverspec-single-source-of-truth -->
### Step 2 — bundledServerSpec — single source of truth

Factor the command/args/env (process.execPath + [dist/loom-mcp.js] + { ELECTRON_RUN_AS_NODE, LOOM_ROOT, ...telemetry }) currently inline in createMCPClient (mcp-client.ts:61-66) into one exported bundledServerSpec(root). Refactor createMCPClient to build its StdioClientTransport from it — no behavior change — so the in-process transport and the launched-agent config can never diverge (C6).

<!-- step:buildagentmcpconfig-loom-only-launchclaude-wiring-d1 -->
### Step 3 — buildAgentMcpConfig (loom-only) + launchClaude wiring — D1(a)

Pure buildAgentMcpConfig(spec) returns the mcpServers JSON with only the loom server (from bundledServerSpec). In launchClaude, write it to an os.tmpdir() temp file (mirroring the existing prompt tmpfile) and extend buildClaudeCommand across all shells (pwsh, cmd, posix) to invoke `claude --strict-mcp-config --mcp-config <tmpfile> "$(cat <prompt>)"`. This is the loom-only slice (D1a) — the merge follows in step 4.

<!-- step:merge-non-loom-servers-into-the -->
### Step 4 — Merge non-loom servers into the agent config — D1(c)

Read the project .mcp.json if present, merge its mcpServers entries (except loom) into the generated config, with our bundled loom overriding any `loom` key. Still launched with --strict-mcp-config against the merged temp file, so the user's other MCP servers survive the launch AND our loom is guaranteed. Required for release (never ship the loom-only slice alone).

<!-- step:mcp-json-pin-heal-migrate-flag -->
### Step 5 — .mcp.json pin-heal + migrate flag (app + mcp + cli)

In installWorkspace's .mcp.json step: (3a) healMcpPin — when the file matches the canonical npx-pinned shape and the pinned @reslava/loom@<ver> differs from LOOM_VERSION, rewrite just that arg via writeIfChanged; every other shape untouched (C4). (3b) a new migrateMcpCommand?: boolean input — when true and the loom server is command:"loom", rewrite that server block to the npx-pinned form, preserving env and any other servers (C5, semantic → flag-gated). Surface migrate_mcp_command on the loom_install MCP tool schema and --migrate-mcp-command on the CLI (D2: one owner of .mcp.json).

<!-- step:activation-self-refresh-consented-migration-notification -->
### Step 6 — Activation self-refresh + consented migration notification

Add ensureWorkspaceCurrent(): once per session (setImmediate at activation), if .loom/ exists call getMCP(root).callTool('loom_install', {}) non-force silently, then syncAndRefresh + syncSetupContext; guard with a session flag so watcher-driven syncSetupContext doesn't re-fire it; swallow errors (background refresh). Keep the consent notification only for uninitialized workspaces (never --force, C3). Add a one-time notification when .mcp.json's loom server is command:"loom": wording 'Loom's MCP config points at a separate loom CLI that can drift from the extension. Update it to the bundled version?' with Update / Keep as-is; on Update call loom_install({ migrateMcpCommand: true }); reuse the setupDismissedGap signature so a dismissal doesn't nag but re-surfaces if the shape changes (D3).

<!-- step:tests-install-heal-migrate-agent-config -->
### Step 7 — Tests — install heal/migrate + agent config

install-workspace.test.ts: healMcpPin bumps an in-shape stale pin and leaves version-current / command:"loom" / unparseable shapes untouched; migrateMcpCommand rewrites command:"loom"→npx preserving env and other servers, and is a no-op without the flag. New agent-mcp-config.test.ts: buildAgentMcpConfig emits the expected command/args/env for the loom-only case (a), and for a project .mcp.json with extra servers produces a merged config containing those servers plus bundled loom, loom winning collisions (c). Add run_test lines to scripts/test-all.sh; build-all then test-all green.

<!-- step:dogfooding-convention-docs -->
### Step 8 — Dogfooding convention + docs

Document the two dogfooding paths — (1) through the extension (Extension Development Host / dev .vsix) so the bundle is the latest build, or (2) an explicit standalone local-path config (command:"node", args:[<repo>/packages/vscode/dist/loom-mcp.js]) — and state that command:"loom" is retired. Apply the convention to the Loom repo and Chord Flow .mcp.json.
