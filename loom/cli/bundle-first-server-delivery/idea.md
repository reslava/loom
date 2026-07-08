---
type: idea
id: id_01KX1CAYVHHZD2D1B916Q0WZJ5
title: Bundle-first server delivery — retire the global loom CLI as a Loom dependency
status: done
created: 2026-07-08
version: 1
tags: []
parent_id: null
requires_load: []
---
# Bundle-first server delivery — retire the global loom CLI as a Loom dependency

## Problem

Two defects reported against `loom install` (chat-001) turned out to share one root cause: **the launched agent's MCP server is delivered and versioned independently of the thing that installs it.**

1. **`loom install` never refreshes after first setup.** The extension only calls `loom_install` when a setup *gap* exists (a missing `.loom/`, `.mcp.json`, or `.loom/CLAUDE.md`). On extension upgrade it shows a "What's New" toast but never re-installs, so the Loom-owned artifacts — the `.loom/CLAUDE.md` contract and the `@reslava/loom@<version>` pin in `.mcp.json` — silently freeze at their first-install version. *(The narrower "always rewrites `.loom/CLAUDE.md`" bug is already fixed and shipped as plan-001; this idea is the larger structural fix.)*

2. **The launched agent can run a different server version than the extension.** `launchClaude` opens a `claude` terminal with no `--mcp-config`, so the agent resolves its server from the project `.mcp.json`. If that points at a globally-installed `loom` CLI (`command: "loom"`), the agent runs whatever version is on PATH — which drifts from the extension's own bundled server. A user who updates the extension but not a stale global `loom` gets **silent version skew**: extension on vX, agent tools + contract on vY.

The common cause: **a second, separately-updated server binary (the global `loom` install) exists and is reachable.** Any attempt to keep two server binaries *in sync* is a fragile heuristic (reachability, version-match, and symlink checks each have a wrong case). The durable fix is to remove the dependency, not synchronize it.

## Why this matters (vision)

Loom's premise is that the AI is "as stateful as it can be" via durable docs **and the tools it rereads at every action**. If the agent's `loom_*` tools or session contract are a stale version, that collaboration silently degrades — the agent is working from an old spec of Loom itself. And the v1.19.0 "zero-install" promise (no CLI, no setup) only ever covered the extension's *own* calls; the moment a user presses an AI button, the launched agent still depended on an external CLI. This closes that gap.

## What we want

**One server codebase, two sanctioned delivery vehicles, zero persistent global installs.**

- **VS Code users** → the **extension bundle** (`dist/loom-mcp.js`, spawned via Electron-as-Node) — for the extension's own calls *and* for the launched agent.
- **Standalone / other-agent users** (headless Claude Code, Cursor, any MCP host) → **`npx @reslava/loom@<pinned>`** — fetched fresh at the pinned version, never a stale global.
- **The globally-installed `loom` CLI (`command: "loom"`) is retired** as a Loom dependency — never written by new installs, migrated away on old ones. It may still exist on a user's machine; it is simply never on any path Loom drives.

Concretely this means:

1. **Launched agents bind the bundled server.** `launchClaude` passes `claude --strict-mcp-config --mcp-config <generated temp file>`, where the config mirrors the extension's own spawn (`process.execPath` + `ELECTRON_RUN_AS_NODE` + the bundled `loom-mcp.js` + `LOOM_ROOT`), computed fresh at launch time. Agent server version **== extension version, always** — regardless of `.mcp.json` or any global `loom`. *(Transport verified: Claude Code exposes `--mcp-config <files|strings>` and `--strict-mcp-config`.)*
2. **`loom install` is idempotent and self-refreshing.** Idempotent writes (plan-001, done) make a re-run a true no-op; the extension then runs `loom_install` silently on activation for already-initialized workspaces (keeping the consent prompt only for *uninitialized* ones), so an extension upgrade refreshes the contract and pin with no user action and without clobbering user-owned files.
3. **`.mcp.json` upkeep for standalone users** — the only remaining consumer of that file: a silent, in-shape version-pin heal (bump `@reslava/loom@old` → current), plus a **consented, one-click** migration of legacy `command: "loom"` configs to the npx pin. Because dogfooding also moves to the bundle, no `command: "loom"` config is legitimate anymore, so the migration is uniform — no dev-vs-user classifier needed.
4. **Dogfooding rides the bundle** (Extension Development Host / installed dev `.vsix`), or, for standalone-terminal meta-chats, an **explicit local-path dev config** (`command: "node", args: ["<repo>/…/loom-mcp.js"]`) — never a drifting global. Applies to the Loom repo itself and to Chord Flow.

## Success criteria

- Updating the extension refreshes `.loom/CLAUDE.md` and the `.mcp.json` version pin **with no user action** and **without overwriting** user-owned files (`ctx.md`, `settings.json`, `.claude/settings.local.json`, `CLAUDE-LOCAL.md`).
- A launched agent **never** runs a different server version than the extension, whatever `.mcp.json` says and whether or not a global `loom` exists.
- New installs **never** write `command: "loom"`; existing `command: "loom"` configs get an informed one-click migration to the npx pin.
- **No path Loom drives depends on a globally-installed `loom`.**

## Non-goals

- Auto-updating a globally-installed npm `loom` from the extension (invasive global-state write, and it re-entrenches the two-CLI coupling we are removing).
- Dropping npx / standalone / non-VS-Code agent support — the npm package remains; only the *persistent global install* is retired.
- Changing the doc workflow, plan model, or any `loom_*` write-path semantics.