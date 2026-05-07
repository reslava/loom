---
type: design
id: de_01KQYDFDDDW3C3JYPHQV085GAC
title: Loom Install — Workspace Onboarding
status: done
created: "2026-04-27T00:00:00.000Z"
updated: "2026-05-06T00:00:00.000Z"
version: 3
tags: []
parent_id: vscode-extension
requires_load: []
role: primary
target_release: 0.5.0
actual_release: null
---

# Loom Install — Workspace Onboarding

## Problem

A new user currently needs 4 manual steps before Loom works:
1. `npm install -g @reslava/loom` (CLI)
2. `loom init` (workspace structure)
3. Manually create `.claude/mcp.json` (MCP server config)
4. Find and install the VSIX (VS Code extension)

Goal: reduce to **1 step** — install the VS Code extension from marketplace. Everything else is automated from there.

---

## Design decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Command name | `loom install` | `loom init` stays lightweight (structure only); `install` sets up the full agent surface |
| `.loom/CLAUDE.md` | **Committed** | Teammates get Loom rules automatically; rules update with CLI upgrades |
| Root `CLAUDE.md` | Patched with `@.loom/CLAUDE.md` import | User's own instructions stay in their file, no merge conflicts |
| `.claude/mcp.json` | **Committed** | No API keys in it — keys go in env, not config |
| `.loom/_status.md` | **Not created** | Stage 1 workaround only; `getState` is the sole source of truth in MCP mode |

---

## `loom install` command

### What it does

```
loom install [--api-key <key>] [--provider deepseek|openai]
```

1. **Creates `.loom/` workspace structure** (same as `loom init`)
2. **Writes `.loom/CLAUDE.md`** — full Loom session contract (session start, stop rules, MCP tools section, AI session rules). Versioned with the CLI.
3. **Patches root `CLAUDE.md`** — prepends `@.loom/CLAUDE.md` if not already present. Creates a minimal `CLAUDE.md` if none exists.
4. **Writes `.claude/mcp.json`** — loom MCP server config. If `--api-key` provided, adds it to the `env` block.

### `.loom/CLAUDE.md` contents

Identical to the current `CLAUDE.md` in the loom repo, minus dev-specific notes (contributor workflow, gitignore note). Updated on each `loom install` / `loom upgrade`.

### `.claude/mcp.json` template (committed)

```json
{
  "mcpServers": {
    "loom": {
      "command": "loom",
      "args": ["mcp"],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

API key (if provided) goes in the `env` block as `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`. Keys are never committed — `.env` or shell export.

---

## VS Code extension — onboarding surfaces

### Context keys

Set on activation and updated by file watcher. Drive both surfaces.

| Key | True when |
|-----|-----------|
| `loom.cliDetected` | `loom --version` exits 0 |
| `loom.workspaceInitialized` | `.loom/` directory exists |
| `loom.mcpConnected` | `.claude/mcp.json` has `mcpServers.loom` |
| `loom.aiConfigured` | `reslava-loom.ai.apiKey` is non-empty |
| `loom.hasWeaves` | `getState()` returns at least one weave |

### Walkthrough (first-time install)

Declared in `contributes.walkthroughs` — appears in VS Code "Get Started" tab when the extension is first installed. Auto-checks steps when context keys become true.

```
Loom — Get Started

☐ Install Loom CLI          when: loom.cliDetected
☐ Initialize workspace      when: loom.workspaceInitialized
☐ Configure AI provider     when: loom.aiConfigured
☐ Create your first weave   when: loom.hasWeaves
```

Each step has a command button:
- *Install CLI* → terminal: `npm install -g @reslava/loom`
- *Initialize workspace* → runs `loom install` via terminal
- *Configure AI* → opens Settings at `reslava-loom.ai`
- *Create weave* → executes `loom.weaveCreate` command

### Notification (partial setup, returning users)

On `onStartupFinished`, check state and show at most one notification (guarded by `workspaceState` so it's not repeated after dismiss):

| Detected state | Notification |
|---|---|
| `.loom/` missing, CLI found | *"Initialize Loom in this workspace?"* \[Initialize] |
| `.loom/` exists, `.claude/mcp.json` missing | *"Set up Loom MCP?"* \[Set up] |
| `.loom/CLAUDE.md` missing | *"Update Loom session rules?"* \[Update] |
| CLI not found | *"Loom CLI not found."* \[Open terminal] |

### `loom install` execution from extension

```typescript
const terminal = vscode.window.createTerminal('Loom Install');
terminal.show();
terminal.sendText('loom install');
```

User sees live output. File watcher picks up `.loom/` creation and auto-refreshes the tree.

### CLI detection

```typescript
function isLoomCli(): boolean {
    try { execSync('loom --version', { stdio: 'ignore' }); return true; }
    catch { return false; }
}
```

---

## Source of truth

`getState()` is the single query entry point. No file is read directly from the extension. No `_status.md`.

State derivation order:
1. `loadWeave(root, weaveId)` — reads markdown files, parses frontmatter
2. `buildLinkIndex(weave)` — builds link graph
3. `loadThread(weave, threadId, linkIndex)` — builds thread view

---

## Out of scope (future)

- `loom upgrade` — update `.loom/CLAUDE.md` to latest version
- Team onboarding: `loom install` in CI to ensure all teammates have the config
- Marketplace publish pipeline
