---
type: design
id: de_01KX1CVTAQZJMAQCRP6TJPH1Q8
title: Bundle-first server delivery — retire the global loom CLI as a Loom dependency
status: done
created: 2026-07-08
updated: 2026-07-08
version: 6
idea_version: 1
tags: []
parent_id: id_01KX1CAYVHHZD2D1B916Q0WZJ5
requires_load: []
---
# Bundle-first server delivery — retire the global loom CLI as a Loom dependency

## Overview

Deliver the idea's policy — *one server codebase, two delivery vehicles (extension bundle · npx-pinned package), zero persistent global installs* — through four changes across `app` and `vscode`, plus the already-shipped idempotent-install fix (plan-001). The design keeps the layer rule intact: `vscode → mcp → app`; the extension writes no config directly, it calls `loom_install` through MCP.

The through-line: **the extension bundle is the single source of truth for the server.** The launched agent binds it directly (so it can never be a different version), and `.mcp.json` upkeep becomes a best-effort convenience for the one remaining external consumer — a standalone terminal with no extension.

## Component 1 — Launched agent binds the bundled server (option C)

**Today:** `launchClaude` (`packages/vscode/src/commands/claudeTerminal.ts`) runs `claude "$(cat prompt)"` with no MCP flags, so the agent resolves its server from the project `.mcp.json` — the skew vector.

**Change:** at launch, write a temp MCP-config file and invoke:

```
claude --strict-mcp-config --mcp-config <tmp-config.json> "$(cat <prompt>)"
```

The config mirrors the extension's own spawn (`mcp-client.ts:61-66`) exactly:

```json
{ "mcpServers": { "loom": {
  "type": "stdio",
  "command": "<process.execPath>",
  "args": ["<extension dist>/loom-mcp.js"],
  "env": { "ELECTRON_RUN_AS_NODE": "1", "LOOM_ROOT": "<root>" }
} } }
```

**Single source of truth.** Extract the server descriptor into one function shared by `createMCPClient` and `launchClaude` — `bundledServerSpec(root): { command, args, env }` — so the client transport and the agent config can never drift in how they spawn the server. `mcp-client.ts` builds its `StdioClientTransport` from it; `launchClaude` serialises it into the temp config.

**Why a temp *file*, not an inline string.** The flag accepts both, but inline JSON on a shell command line reintroduces the quoting hell `launchClaude` already avoids for the prompt. Reuse the existing tmpfile pattern (write to `os.tmpdir()`), one config file per launch.

**Why `--strict-mcp-config`.** Without it, Claude merges our config with the project `.mcp.json`; a collision on the `loom` key is undefined and could still bind the stale server. Strict guarantees the agent uses only our file — and we preserve the user's *other* MCP servers by merging them into that file, rather than relying on Claude to merge (D1, resolved: build the temp config from the project `.mcp.json`'s non-loom servers + our bundled loom, loom winning any key collision).

**Verified transport:** `claude --help` confirms `--mcp-config <files|strings>` and `--strict-mcp-config`. The remaining unknown — that a *terminal* `claude` binds `process.execPath` (Electron-as-Node) as its server, not just the in-process extension client — is proven with a real launch in step 1, before the rest is built.

**Testability:** factor the pure part into `buildAgentMcpConfig(spec): string` (returns the JSON) so it is unit-testable without the VS Code API; the terminal wiring stays a thin shell.

## Component 2 — Idempotent + self-refreshing install on activation

**Today:** `showSetupNotification` calls `loom_install` only when a setup *gap* exists; an upgrade never re-installs.

**Change:** add `ensureWorkspaceCurrent()` in `extension.ts`, fired once per session via `setImmediate` at activation:

- No workspace / no `.loom/` → do nothing here (the existing consent notification still handles *uninitialized* workspaces — we never silently create files in a repo the user hasn't opted into).
- `.loom/` exists → call `getMCP(root).callTool('loom_install', {})` (non-force) silently, then `syncAndRefresh()` + `syncSetupContext()`. Guard with a session flag so watcher-driven `syncSetupContext` calls don't re-trigger it.

Because installWorkspace is now idempotent (plan-001 + Component 3's pin heal), this is a true no-op when nothing changed — no watcher churn, no dirty tree. Errors are swallowed (background refresh, no nag). This *is* approach **(i)** from the chat: no stored version stamp, the files themselves are the source of truth.

## Component 3 — `.mcp.json` upkeep for the standalone consumer

`.mcp.json`'s only remaining reader is **any `claude` the extension didn't launch** — a terminal `claude` run by hand, *whether or not the extension is installed* (the common "UI in VS Code, agent launched myself in a terminal" combo included). Option C's `--mcp-config` only reaches extension-*button*-launched agents; a hand-launched `claude` still reads `.mcp.json`, so this upkeep is its version-sync mechanism. Two behaviors, both in `installWorkspace`, distinguished by intent:

**3a — Silent version-pin heal (in-shape only).** When `.mcp.json` exists, is *not* force, and matches the exact shape install writes (`loom` server, `command: "npx"`, an arg matching `@reslava/loom@<semver>`), and the pinned version ≠ current `LOOM_VERSION` → rewrite just that arg via `writeIfChanged`. Any other shape is left untouched. This is the `healMcpPin` helper (drafted, then held back from plan-001); it runs as part of every `loom_install`, so Component 2 heals the pin automatically on upgrade. Silent because it is a within-shape version bump — no semantic change.

**3b — Consented command migration (`command: "loom"` → npx).** Rewriting a `command: "loom"` config to the npx form changes *which binary runs* — a semantic change, so it is **never silent**. Gate it behind a new `installWorkspace` input flag `migrateMcpCommand?: boolean` (surfaced on the `loom_install` MCP tool). The extension calls it only after explicit user consent:

- On activation, if `.mcp.json`'s `loom` server is `command: "loom"`, show a one-time notification: *"Loom's MCP config points at a separate `loom` CLI. Update it to the bundled version?"* Consent → `loom_install({ migrateMcpCommand: true })`. Dismiss → record the gap signature (mirror the existing `loom.setupDismissedGap` pattern) so it doesn't nag.
- Because dogfooding now rides the bundle (Component 4), no `command: "loom"` config is a legitimate desired state, so the migration is **uniform** — no reachability/marker/dev-vs-user classifier. Every such config is legacy.

Keeping both behaviors in one `installWorkspace` code path (flag-gated) means one place owns `.mcp.json` reconciliation.

## Component 4 — Dogfooding without a global CLI

Not code — a setup convention, applied to the Loom repo and Chord Flow:

- **Preferred:** dogfood *through the extension* (Extension Development Host or an installed dev `.vsix`) → the bundle is the latest build, agent included via Component 1.
- **Standalone terminals** (meta-chats like this one): an explicit **local-path dev config** — `.mcp.json` with `command: "node", args: ["<repo>/packages/vscode/dist/loom-mcp.js"]` (or the mcp package's dist entry). Local, explicit, rebuilt by `build-all.sh`, cannot drift. Never `command: "loom"`.

Document this in the getting-started / dogfooding notes; no product code depends on it.

## Layering & surface changes

- **app** (`installWorkspace.ts`): `bundledServerSpec` has no place here (VS-Code-specific) — it lives in `vscode`. Here: keep `writeIfChanged` (done), add `healMcpPin` (3a) and the `migrateMcpCommand` branch (3b) to the `.mcp.json` step.
- **mcp** (`tools/install.ts`): add `migrate_mcp_command` (boolean) to the `loom_install` input schema; map to `migrateMcpCommand` in `handle()`.
- **vscode**: `bundledServerSpec` (shared by `mcp-client.ts` + `claudeTerminal.ts`), `buildAgentMcpConfig` (pure, tested), `launchClaude` wiring, `ensureWorkspaceCurrent` + the migration notification in `extension.ts`.
- **cli** (`commands/install.ts`): a `--migrate-mcp-command` flag for parity, so a terminal user can run the migration too.

## Testing

- `tests/install-workspace.test.ts`: extend — 3a heals an in-shape stale pin and leaves the version-current / `command:"loom"` / unparseable shapes untouched; 3b (`migrateMcpCommand`) rewrites `command:"loom"` → npx while preserving `env`/extra servers, and is a no-op without the flag. (No-op idempotency already covered by test 7.)
- New `tests/agent-mcp-config.test.ts`: `buildAgentMcpConfig` emits the expected `command/args/env` from a `bundledServerSpec` (case a); and, given a project `.mcp.json` carrying extra servers, the merged config contains those servers *plus* our bundled loom, loom winning any key collision (case c).
- The terminal-launch binding (Component 1's unknown) is validated manually via `/verify`-style real launch in step 1, not a unit test.

## Resolved decisions

- **D1 — `--strict-mcp-config` scope → both (a) and (c), sequenced; (c) ships in this release.** Launch strict against a temp config, and **build that config by merging the project `.mcp.json`'s non-loom servers with our bundled-loom server**, so the agent keeps the user's other MCP servers *and* is guaranteed our loom (loom wins any key collision). Implemented in two increments — **(a)** loom-only strict first (smallest testable slice, de-risks the terminal binding), then **(c)** the merge — but **(a) is never released alone**: the release contains **(c)**. `--strict-mcp-config` stays; it is what guarantees no stale-server collision, and it is safe precisely because we put the user's servers *into* our file rather than relying on Claude to merge configs.
- **D2 — migration mechanism → `migrateMcpCommand` flag on `loom_install`.** One owner of `.mcp.json`; no second writer.
- **D3 — consent UX → reuse the `setupDismissedGap` signature pattern.** A dismissed migration does not nag but re-surfaces if the config's shape changes. Wording — notification: *"Loom's MCP config points at a separate `loom` CLI that can drift from the extension. Update it to the bundled version?"*; actions: **"Update"** / **"Keep as-is"**.

## Rollout / plan shape (preview)

1. Prove Component 1's terminal binding with a real launch (de-risk first).
2a. `bundledServerSpec` + `buildAgentMcpConfig` (loom-only) + `launchClaude` wiring — smallest slice, proves the binding.
2b. Extend `buildAgentMcpConfig` to merge the project `.mcp.json`'s non-loom servers (D1(c)) — required for the release, not optional.
3. `healMcpPin` (3a) + `migrateMcpCommand` (3b) in `installWorkspace` + `loom_install` schema + CLI flag.
4. `ensureWorkspaceCurrent` activation refresh + migration notification (Components 2 & 3b UX).
5. Dogfooding config convention + docs (Component 4).
6. Tests across the above.