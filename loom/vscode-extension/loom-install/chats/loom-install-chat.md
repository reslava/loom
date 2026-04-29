---
type: chat
id: loom-install-chat
title: "Loom Install Chat"
status: active
created: 2026-04-27
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
# CHAT

## Rafa:

### Loom install — design question

This is a real onboarding problem. Right now a new user has to:
1. `npm install -g loom-cli` (or `npx loom`)
2. `loom init` in their workspace
3. Manually create `.claude/mcp.json`
4. Find and install the VSIX

That's 4 manual steps before anything works. The end goal should be:
1. Install the VS Code extension from marketplace
2. Open any workspace — extension auto-detects no loom init, offers "Initialize Loom"
3. Clicking it runs `loom init` + writes `.claude/mcp.json` in one shot

This needs a `loom install` (or `loom init --full`) command plus a VS Code welcome command. It's a separate design thread — worth a dedicated thread in `loom/workflow/` or `loom/vscode-extension/`.

### Questions before design

What happen with `CLAUDE.md`? Fusion with user `CLAUDE.md`?
Whitout correct `CLAUDE.md` Loom will fail

## AI:

### CLAUDE.md strategy

Merging into user's CLAUDE.md is fragile — Loom rules would collide with user's own instructions, and any update to Loom rules would require re-merging. The clean approach is to keep them separate.

**Proposed layout after `loom init`:**

```
{workspace}/
  CLAUDE.md              ← user's own instructions (untouched or created minimal)
  .loom/
    CLAUDE.md            ← Loom session contract (owned by loom, versioned)
```

Claude Code reads CLAUDE.md files hierarchically and supports `@path` imports. `loom init` would:

1. Write `.loom/CLAUDE.md` with the full Loom session contract (the same content as the current `CLAUDE.md` in the loom repo, minus dev-specific notes)
2. If root `CLAUDE.md` exists → append `@.loom/CLAUDE.md` at the top
3. If root `CLAUDE.md` doesn't exist → create a minimal one with just `@.loom/CLAUDE.md`

This means:
- Loom rules update with `loom` CLI upgrades (rewrite `.loom/CLAUDE.md`)
- User rules live in their own `CLAUDE.md` unaffected
- No merge conflicts

**What if CLAUDE.md is missing/wrong?**
The MCP tools still enforce state — `loom_complete_step` validates the plan, `loom_create_idea` validates frontmatter. The *workflow protocol* (session start, stop rules, "read thread-context before working") is what breaks without CLAUDE.md. So the failure mode is: AI starts ignoring the workflow discipline but state is still valid.

For safety, the VS Code extension could detect whether `@.loom/CLAUDE.md` is in the root `CLAUDE.md` and show a warning badge if not.

---

### Full install flow (proposed)

**User journey (1 step):**
1. Install VSIX from marketplace
2. Open workspace → extension shows welcome notification: *"Initialize Loom workspace?"*
3. Click → runs `loom init --full`

**`loom init --full` does:**
1. Create `.loom/_status.md`
2. Write `.loom/CLAUDE.md` (Loom session contract)
3. Patch root `CLAUDE.md` with `@.loom/CLAUDE.md`
4. Write `.claude/mcp.json` (loom MCP server config)
5. Optionally prompt for DeepSeek/OpenAI API key → write to `.claude/mcp.json` env block

Everything in one shot. The VS Code command calls `loom init --full` as a child process and shows progress.

---

### Open questions

1. Should `.loom/CLAUDE.md` be gitignored (like current `CLAUDE.md`) or committed? Committing it means teammates get the Loom rules automatically. Probably commit it.
2. What's the `.claude/mcp.json` gitignore story? It contains API keys — must stay gitignored. But the template (without keys) could be committed.
3. Is `loom init --full` the right name, or `loom install`?

**My recommendation:** `loom install` as the top-level command (matches mental model of "install loom into this workspace"). `loom init` stays as the lightweight version (just `.loom/` structure, no CLAUDE.md, no MCP).

Do you want to open a design thread for this in `loom/vscode-extension/loom-install/`?

## Rafa:

1. commited
2. you can delete `CLAUDE.md` and `.claude` from `.gitignore`. No API keys and now they have sense to be included in git
3. `loom install`

NOTES: you forgot
`.loom/_status.md` was temporary workaround before mcp, no need for working final Loom. `getState` is the only source of truth. 

### TODO
Crate a design `loom/vscode-extension/loom-install-design.md`

## AI:

Decisions recorded. Summary:

| | |
|---|---|
| CLAUDE.md | committed — `.loom/CLAUDE.md` (owned by loom, patched into root via `@` import) |
| .claude/mcp.json | committed — no keys in it |
| .loom/_status.md | dropped — `getState` is the only source of truth |
| Command | `loom install` |

Design doc created at `loom/vscode-extension/loom-install/loom-install-design.md`.
`.gitignore` updated — removed `CLAUDE.md` and `.claude/` entries.

Next: implement `loom install` CLI command, or design the VS Code welcome notification first?

## Rafa:

Tell me about VS Code welcome notification, what is your idea?

## AI:

VS Code has a native onboarding system called **Walkthroughs** (`contributes.walkthroughs` in `package.json`). It's the "Get Started" tab you see when you open a new extension — checklist with steps, each with a title, description, and a `when` condition that auto-checks when done. This is the right surface for Loom, not a plain toast notification.

### Two surfaces

**1. Walkthrough — first-time setup (global)**

Appears in the "Get Started" tab when the extension is first installed. Steps:

```
Loom — Get Started

☐ Install Loom CLI                  when: loom.cliDetected
☐ Initialize this workspace         when: loom.workspaceInitialized
☐ Configure an AI provider          when: loom.aiConfigured
☐ Create your first weave           when: loom.hasWeaves
```

Each step has a button: *"Install CLI"* → opens terminal with `npm install -g @reslava/loom`. *"Initialize workspace"* → runs `loom install` inline. *"Configure AI"* → opens VS Code settings at `reslava-loom.ai`.

**2. Notification — returning users, partial setup**

When the extension activates (`onStartupFinished`) and the workspace is partially set up, show a targeted notification rather than the full walkthrough:

| Detected state | Notification |
|---|---|
| `.loom/` missing, CLI found | *"Initialize Loom in this workspace?"* \[Initialize] |
| `.loom/` exists, `.claude/mcp.json` missing | *"Set up MCP for Loom?"* \[Set up] |
| `.loom/CLAUDE.md` missing | *"Update Loom session rules?"* \[Update] |
| CLI not found | *"Loom CLI not found. Install it?"* \[Open terminal] |

The notification is shown at most once per workspace session (stored in `workspaceState`). Never shown again if dismissed.

---

### The `loom install` execution

When triggered from either surface:

```typescript
const terminal = vscode.window.createTerminal('Loom Install');
terminal.show();
terminal.sendText('loom install');
```

Simple — user sees live output in the terminal. No need to parse stdout or handle errors in extension code. On completion, the file watcher picks up the new `.loom/` files and refreshes the tree automatically.

Alternative: spawn as child process, stream to output channel, show progress notification. More polish but more code. Terminal approach is simpler and shows the user what's happening.

---

### CLI detection

Before showing any notification, check if `loom` is in PATH:

```typescript
import { execSync } from 'child_process';
function isLoomCli(): boolean {
    try { execSync('loom --version', { stdio: 'ignore' }); return true; }
    catch { return false; }
}
```

If CLI not found → point user to `npm install -g @reslava/loom` (or show the walkthrough step for it).

---

### Context keys set by the extension

```
loom.cliDetected             → loom --version succeeded
loom.workspaceInitialized    → .loom/ directory exists
loom.mcpConnected            → .claude/mcp.json has loom server
loom.aiConfigured            → reslava-loom.ai.apiKey is non-empty
loom.hasWeaves               → getState() returns weaves.length > 0
```

Walkthroughs `when` conditions use these keys. The extension sets them on activation and updates on file-system changes.

---

### Recommendation

Implement in this order:
1. **Context keys** — detection logic (CLI, workspace init, MCP, AI). Cheap, needed by everything else.
2. **Notification** — partial-setup nudge. One `vscode.window.showInformationMessage` call, guarded by `workspaceState`.
3. **Walkthrough** — first-time experience. Declared in `package.json`, no runtime code needed for the structure.
4. **`loom install`** CLI command — the actual work. The walkthrough/notification just trigger it.

Want me to update the design doc with this, then start with context keys in `extension.ts`?

## Rafa:

Update the design
Create `loom/vscode-extension/loom-install/plans/loom-install-plan-001.md'

## AI:

Done.

- `loom-install-design.md` — updated to v2 (active): added context keys table, walkthrough spec, notification table, CLI detection snippet, `loom install` terminal execution pattern
- `plans/loom-install-plan-001.md` — 13 steps across 4 phases:
  1. CLI (`installWorkspace` use-case → `install.ts` command → register → build)
  2. VS Code context keys (CLI detection, workspace init, MCP, AI, hasWeaves)
  3. VS Code notification (partial-setup nudge, `workspaceState` guard, button wiring)
  4. VS Code walkthrough (`contributes.walkthroughs` in package.json)
  + Build, test, commit

Ready to start — step 1 is `packages/app/src/installWorkspace.ts`.

## Rafa:

Do 1-4

## AI:

Steps 1-4 ✅ — build clean.

- `packages/app/src/installWorkspace.ts` — use-case: creates `.loom/` (via `initLocal`), writes `.loom/CLAUDE.md` (full user-facing session contract), patches root `CLAUDE.md` with `@.loom/CLAUDE.md` import (creates minimal one if absent), writes `.claude/mcp.json` template. All idempotent — `--force` to overwrite.
- `packages/cli/src/commands/install.ts` — thin wrapper, prints colored summary of what was created vs skipped.
- `packages/cli/src/index.ts` — `loom install [--force]` registered as first command.
- Build: all packages pass.

Test it now:
```bash
cd j:/temp && loom install
```

Next: step 5 — context keys in `extension.ts`. Go?

## Rafa:

Do 5-9

## AI:

Steps 5-9 ✅ — VSIX packaged clean (230 KB).

`syncSetupContext()` sets all 5 keys on activation:
- `loom.cliDetected` — `execSync('loom --version')` exits 0
- `loom.workspaceInitialized` — `.loom/` exists
- `loom.mcpConnected` — `.claude/mcp.json` has `mcpServers.loom`
- `loom.aiConfigured` — `reslava-loom.ai.apiKey` non-empty
- `loom.hasWeaves` — `loom/` directory has subdirectories

Re-syncs on: config change (API key), `.loom/**` file changes (after `loom install`).

`showSetupNotification()` fires once per workspace session (guarded by `workspaceState`), shows the most relevant notification, wires buttons to `runLoomInstall()` or the npm install terminal.

Next: step 10 — walkthrough in `package.json`. Go?

## Rafa:

Do 10-13

## AI:

Steps 10, 11, 13 ✅ — step 12 (test at `j:/temp`) is yours.

**Walkthrough** added to `package.json` (`contributes.walkthroughs`) — 4 steps with `completionEvents` wired to the 5 context keys. Three walkthrough commands registered: `loom.install.openCliTerminal`, `loom.install.runInstall`, `loom.install.openAiSettings`.

**Committed** `7a73e5d` — 19 files, 1718 insertions.

**To test (step 12):**
```bash
code --install-extension j:/src/loom/packages/vscode/loom-vscode-0.1.0.vsix --force
```
Fully restart VS Code, open `j:/temp`. Expected:
- Notification: *"Initialize Loom in this workspace?"* (since `.loom/` was deleted)
- Walkthrough visible in "Get Started" tab (Help → Get Started → filter "Loom")
- Click Initialize or run `loom install` in terminal → tree populates
