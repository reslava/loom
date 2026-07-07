---
type: done
id: pl_01KWWRGAMRRWKBH2A03Z7Q3H0X-done
title: Done — Plan A — Dissolve the setup pipeline
status: done
created: 2026-07-06
version: 5
tags: []
parent_id: pl_01KWWRGAMRRWKBH2A03Z7Q3H0X
requires_load: []
---
# Done — Plan A — Dissolve the setup pipeline

## Step 1 — Prototype the Electron-Node spawn as a gate: spawn a bundled JS entrypoint via process.execPath + ELECTRON_RUN_AS_NODE=1, connect the MCP StdioClientTransport, and verify stderr piping, stdio framing, and a real loom_* tool round-trip.

**Gate PASSED — Electron-Node spawn of the Loom MCP server is viable; no fallback to system Node (EX4) needed.**

Spike (throwaway harness in session scratchpad, `spike-client.mjs` — not committed):

- **Level 1 (mechanism).** `Code.exe` (VS Code's Electron at `%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe`) launched with `ELECTRON_RUN_AS_NODE=1` runs as pure Node — reported `node=24.15.0`, `electron=42.2.0` — and `process.stderr.write` reached the parent (`STDERR_OK`). Confirms zero user-installed Node is required and stderr flows.
- **Level 2 (real MCP round-trip).** Drove the shipped CLI bundle (`packages/cli/dist/index.js mcp`) as the server, spawned via the same `StdioClientTransport` the extension uses (`command: Code.exe`, `args: [cli, 'mcp']`, `env: { ELECTRON_RUN_AS_NODE: 1, LOOM_ROOT }`, `stderr: 'pipe'`). Results: `connect` (initialize handshake) 467 ms; `readResource('loom://catalog')` returned 6324 B; `listTools` = 57; `loom_find_doc` tool call round-tripped valid JSON. stdio JSON-RPC framing intact end-to-end. Server emitted 0 stderr bytes on the success path (expected — it's quiet on success; piping itself proven in Level 1).

**Key implementation finding for step 4:** in the real extension the host process already *is* Electron, so `process.execPath` is the Electron binary — step 4 spawns `process.execPath` with `ELECTRON_RUN_AS_NODE=1` and `args: [<bundled dist/loom-mcp.js>]`; no need to locate `Code.exe`. The existing `mcp-client.ts` `StdioClientTransport` options (env spread, `stderr: 'pipe'`, LOOM_ROOT/telemetry env) carry over unchanged — only `command`/`args` change.

No production code changed in this step (it is a prototype/gate); `packages/vscode/src/mcp-client.ts` is edited for real in step 4.

## Step 2 — Add an esbuild bundle step producing packages/vscode/dist/loom-mcp.js bundling the mcp server + app + core + fs + telemetry; wire it into the vscode build/package scripts.

Bundled the Loom MCP server into the VSIX and verified it boots.

**Created** `packages/vscode/src/loom-mcp-entry.ts` — a standalone stdio-server entry mirroring the `loom mcp` boot in `cli/src/index.ts` minus commander: reads `LOOM_ROOT`, constructs server telemetry (no-op until a key is baked — step 3), `createLoomMcpServer(root, telemetry)`, `StdioServerTransport`, `connect`. stdout is the JSON-RPC channel; diagnostics go to stderr only.

**esbuild** (`packages/vscode/esbuild.js`) — switched from single `outfile` to two `entryPoints` (`{in:'src/extension.ts', out:'extension'}`, `{in:'src/loom-mcp-entry.ts', out:'loom-mcp'}`) + `outdir: 'dist'`. Unlike the CLI (SDK external), the server bundle **inlines** `@modelcontextprotocol/sdk` — the VSIX is packaged `--no-dependencies`, so nothing in node_modules ships. Verified the SDK inlines cleanly (the CLI's ajv-dynamic-require concern did not bite here).

**Build wiring** — `scripts/build-all.sh` vscode step now runs `npx tsc --build --force && node esbuild.js` so build-all produces the bundle too (the `build`/`vscode:prepublish`/`package` scripts already go through esbuild.js).

**Packaging fix** — `.vscodeignore` had `dist/**` + `!dist/extension.js`, which would have **excluded `dist/loom-mcp.js` from the VSIX**. Added `!dist/loom-mcp.js`. Confirmed via `vsce ls --no-dependencies` that both `dist/loom-mcp.js` and `dist/extension.js` are now in the package file list.

**Verification** — built `dist/loom-mcp.js` (2.8 MB), then spawned it on VS Code's Electron (`Code.exe` + `ELECTRON_RUN_AS_NODE=1`, `args:[loom-mcp.js]`, `LOOM_ROOT`) via `StdioClientTransport`: connect 411 ms, `listTools` = 57, `loom_find_doc` round-trip returned content. Typecheck (`tsc -p ./ --noEmit`) clean. Verify harness was throwaway scratchpad.

## Step 3 — Bake the telemetry PostHog key into the VSIX bundle via esbuild define + release.yml secret, mirroring how the CLI build bakes it today; verify off-by-default consent still gates emission.

Baked the telemetry key into the VSIX build.

- `packages/vscode/esbuild.js`: added `define: { 'process.env.LOOM_POSTHOG_KEY': JSON.stringify(process.env.LOOM_POSTHOG_KEY || '') }`, mirroring `packages/cli/esbuild.js`. Empty ⇒ structurally Noop.
- `.github/workflows/release.yml`: added `env: LOOM_POSTHOG_KEY` to the **"Package VS Code extension"** step. This is required (not just the build-all step): `vsce package` runs `vscode:prepublish` → `esbuild --production`, which re-emits `dist/loom-mcp.js` — without the key on *that* step it would overwrite the build-all-baked bundle with a key-less one.
- **Verified:** built with a sentinel key → baked into `dist/loom-mcp.js` (and only there; `extension.js` never references the symbol). Consent still gates independently — `packages/telemetry/src/consent.ts:31` returns `enabled === true && !!apiKey`, and `LOOM_TELEMETRY` unset = disabled, so a baked key never sends without opt-in (C5 preserved). Rebuilt clean afterward (sentinel gone).

## Step 4 — Replace command:'loom' in the MCP client with spawning the bundled dist/loom-mcp.js via process.execPath + ELECTRON_RUN_AS_NODE=1; keep stderr piping and LOOM_ROOT/telemetry env.

Repointed the extension's MCP client at the bundled server on Electron-Node.

- `packages/vscode/src/mcp-client.ts`: replaced `command: 'loom', args: ['mcp']` with `command: process.execPath, args: [path.join(__dirname, 'loom-mcp.js')]` and added `ELECTRON_RUN_AS_NODE: '1'` to the env; kept `stderr: 'pipe'`, `LOOM_ROOT`, and `getTelemetryEnv()`. Added `import * as path`.
- In the extension host, `process.execPath` **is** the Electron binary and `__dirname` is the extension's `dist/` (alongside `loom-mcp.js`), so no global `loom` and no user Node — the extension's own server dependency on the global CLI is gone (IN1/IN2/C4).
- **Verified:** typecheck clean; the exact spawn shape (Electron + `ELECTRON_RUN_AS_NODE=1` + `args:[loom-mcp.js]`) was already proven end-to-end in step 2 (connect, 57 tools, real tool round-trip). Could not drive the live extension host from a CLI session, but the mechanism is identical to the verified harness.

## Step 5 — Replace the terminal `loom install` (runLoomInstall) with an in-process installWorkspace() call imported from the bundled app, wrapped in withProgress with real error surfacing.

In-process workspace init via a new MCP tool (Option A — preserves the `vscode → mcp → app` boundary, C3).\n\n- **New MCP tool** `packages/mcp/src/tools/install.ts` (`loom_install`): wraps the existing `installWorkspace` app use-case, running it on the server's `LOOM_ROOT` (`{ fs, registry: new ConfigRegistry(), cwd: root }`). Registered in `server.ts` under a new `workspace` group; `catalog.ts` gained `workspace` in `GROUP_ORDER` + a `Workspace` title, so the auto-generated `loom://catalog` lists it.\n- **Extension** `extension.ts`: rewrote `runLoomInstall` as an in-process `getMCP(root).callTool('loom_install', {})` inside `withProgress`, with `handleMcpError` + `syncAndRefresh` + `syncSetupContext` on success; moved it into `activate()` scope and deleted the old `terminal.sendText('loom install')` shell-out. The extension still never imports `app` — it calls through MCP.\n- **Verified:** `build-all.sh` clean (loom-mcp.js 2.9 MB now includes the tool). Spawned the bundled server on Electron-Node with `LOOM_ROOT`=throwaway temp dir and called `loom_install` → result all-true (`loomDirCreated`, `claudeMdWritten`, `mcpJsonWritten`, `ctxWritten`, `settingsJsonWritten`, …); the temp dir got `.loom/`, `.mcp.json`, `CLAUDE.md` (+import stub), `CLAUDE-LOCAL.md`, `loom/`. `loom://catalog` contains `loom_install`. `tsc --noEmit` clean for both mcp and vscode. (Extension runtime path not driven from a CLI session, but the MCP tool it calls is fully verified.)

## Step 6 — Rewrite showSetupNotification to re-check and re-prompt per remaining setup step instead of setting setupNotificationShown once and going silent (the folded FP1 fix).

Rewrote `showSetupNotification` (extension.ts) to fix FP1. Removed the permanent `loom.setupNotificationShown` boolean that silenced all future prompts after one; dismissal is now keyed to the **current gap signature** (`loom,mcp,claude`) stored in `loom.setupDismissedGap` — the same gap won't nag, but a *changed* remaining gap re-prompts. Removed the obsolete CLI-not-found / `npm install -g` branch (the extension no longer needs a global CLI). Now a single in-process **Initialize** prompt (calls `runLoomInstall` → `loom_install` MCP). Driven by `syncSetupContext` (re-checks on every setup-state change) with an in-flight guard; deleted the fire-once `setImmediate`. Typecheck clean.

## Step 7 — Make installWorkspace write .mcp.json for the Claude Code agent with command:npx, args:[-y, @reslava/loom@<version>, mcp], the version pinned to the extension and injected at write time.

`installWorkspace.ts` now writes `.mcp.json` with `command: 'npx'`, `args: ['-y', '@reslava/loom@${LOOM_VERSION}', 'mcp']`, where `LOOM_VERSION` = `require('../package.json').version` (the app's lockstep version). Verified end-to-end: install into a temp dir produced `@reslava/loom@1.18.0` pinned (C2, IN6). Follow-up (not this step): the `LOOM_CLAUDE_MD` template's *documentation* example still shows `command: 'loom'` — minor, both paths work; deferring to the Plan B docs pass to avoid churning the claude-md-sync invariants now.

## Step 8 — On first AI action when Claude Code is absent, funnel to its install page instead of dead-ending; keep the API-key sampling fallback discoverable in settings (do not promote it).

Claude Code detection + AI funnel. Added `hasApiKey()` and `funnelAiSetup()` to claudeTerminal.ts; `funnelAiSetup` offers **Install Claude Code** (opens the docs page) or **Set API Key** (opens settings) instead of dead-ending. `launchClaude` now calls `funnelAiSetup()` on absence (was a bare 'not found' error). In extension.ts `generateDesign`/`generatePlan`, the fallback is now: Claude → launch agent; else if `hasApiKey()` → sampling; else → `funnelAiSetup()` (previously it silently attempted sampling with no key). `refreshCtx` left unchanged — its fallback prepares a ctx shell, not sampling, so it needs no AI. API-key fallback stays discoverable (EX1). Typecheck clean.

## Step 9 — Add a third status-bar item showing AI status (Claude Code ✓/✗) alongside the existing Feedback + Telemetry items; refresh it on detection changes.

Added a third status-bar item (`StatusBarAlignment.Right`, priority 87, next to Feedback 89 / Telemetry 88) showing the AI path: `$(sparkle) Claude Code` / `$(key) Loom AI: key` / `$(warning) Loom AI: setup`, with a matching tooltip; its command `loom.setupAi` → `funnelAiSetup()`. Refreshed inside `syncSetupContext`. Also corrected the `loom.aiConfigured` context key: was `= isLoomCliAvailable()` (wrong — the loom CLI is not the AI), now `= claudeOk || hasApiKey()`. Typecheck clean.
