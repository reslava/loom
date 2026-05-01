---
type: chat
id: vscode-mcp-do-step-chat
title: Vscode Mcp Do Step Chat
status: active
created: 2026-04-29
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---

# CHAT

## Rafa:
do `loom/vscode-extension/vscode-mcp-do-step/plans/vscode-mcp-do-step-plan-001.md`

## AI:

**Vision-check:** step 1 serves the `{implement step(s)}` workflow phase. It removes the manual step "read the plan, find next pending step, gather thread context, build a prompt" — replaces it with one MCP call returning a deterministic brief.

**Step 1 — done.** ✅

- Rewrote [packages/mcp/src/tools/doStep.ts](../../../../packages/mcp/src/tools/doStep.ts):
  - Module-style export (`toolDef` + `handle`), no factory needed since sampling is gone.
  - Pure read: finds plan, derives `weaveId`/`threadId` from path, loads thread context, returns JSON brief `{ planId, planTitle, weaveId, threadId, stepNumber, stepDescription, filesToTouch, threadContext, planSummary, instructions }`.
  - `instructions` field tells the host agent what to do next: implement with its own tools, then call `loom_append_done` and `loom_complete_step`.
  - No `requestSampling`. No `completeStep`. No chat doc creation. No state mutations.
- Updated [packages/mcp/src/server.ts](../../../../packages/mcp/src/server.ts):
  - `import * as doStep from './tools/doStep'` (was `import { createDoStepTool }`).
  - Added `doStep` to `BASE_TOOLS`. Removed `createDoStepTool(server)` from the `TOOLS` array.
- `tsc --noEmit` passes clean.

**Next:** Step 2 — add new MCP tool `loom_append_done`. Files touched: `packages/mcp/src/tools/appendDone.ts` (new), `packages/mcp/src/server.ts` (register).

STOP — waiting for `go`.

## Rafa:

Do Steps 2-5

## AI:

Steps 2, 3, 4 done. Step 5 is manual — needs you to run it in Extension Development Host.

**Step 2 — `loom_append_done` tool ✅** ([packages/mcp/src/tools/appendDone.ts](../../../../packages/mcp/src/tools/appendDone.ts))
- Input: `{ planId, stepNumber, notes }`. Output: `{ filePath, created }`.
- Path: writes to `{thread}/done/{planId}-done.md`.
- First call: creates the file with `type: done`, `status: final`, parent_id pointing to the plan, body starts with `# Done — <plan title>`, then the step section.
- Subsequent calls: parses existing sections by `## Step N — ...` header, replaces target section if it exists, otherwise inserts in step order. Idempotent on same step number.
- Section parsing rebuilds content cleanly — no orphan blank lines or duplicate sections.
- Registered in `BASE_TOOLS` of `packages/mcp/src/server.ts`.

**Step 3 — extension `doStep.ts` rewritten as terminal launcher ✅** ([packages/vscode/src/commands/doStep.ts](../../../../packages/vscode/src/commands/doStep.ts))
- Drops `app/doStep`, `loadWeave`, `saveDoc`, `makeAIClient`, MCP client. ~30 lines now.
- Validates: workspace open, node is plan, status is `implementing`.
- Opens integrated terminal at workspace root with name `Loom: <plan title>`.
- Sends `claude <JSON.stringify(prompt)>` — prompt names `planId` and instructs Claude to call `loom_do_step → implement → loom_append_done → loom_complete_step`.
- `extension.ts` registration updated: `doStepCommand(node)` (was `doStepCommand(treeProvider, node)` — treeProvider no longer needed; tree refresh happens via VS Code's file watcher when Claude edits files).

**Step 4 — `claude` detection ✅** (in the same `doStep.ts`)
- Uses `child_process.exec('where claude' / 'which claude')` based on platform.
- If missing: shows a VS Code error notification with an `Open Install Page` button linking to the Claude Code docs. Does not open a terminal.
- If present: proceeds.

Both `packages/mcp` and `packages/vscode` build clean (`tsc` + esbuild bundle 1.5 MB).

---

**Step 5 — manual test checklist (you):**

1. Press F5 in this workspace to launch the Extension Development Host.
2. Open a Loom workspace with a plan in `status: implementing` (e.g. this very plan, `vscode-mcp-do-step-plan-001`, after we mark it `implementing`).
3. In the Loom tree, expand the plan. The `Do Step(s)` button should be visible inline (`$(sparkle)` icon).
4. Click it. Expect:
   - Notification "Claude Code CLI not found..." with install button — IF claude isn't on PATH. Verify the link works.
   - OTHERWISE: a new terminal `Loom: <plan title>` opens at workspace root, runs `claude "<prompt>"`, Claude Code starts up and begins working.
5. Watch Claude Code in the terminal:
   - Should call `loom_do_step` first → see the brief.
   - Should make real file edits using its native tools.
   - Should call `loom_append_done` → check `loom/.../done/<planId>-done.md` exists with notes.
   - Should call `loom_complete_step` → check the plan file shows the step ✅.
6. Verify the file the plan asked to create actually exists on disk this time (the original hallucination test case).

Once you confirm, I'll mark step 5 ✅. If anything fails, paste the error here and I'll diagnose.

STOP — waiting for test results or `go` if you want me to address something else first.

## Rafa:

I am testing in `j:/temploon/`

MCP config file is there: `j:/temploon/.claude/settings.json` is created and setup

But Claude Code terminal do not find MCP server 
```
● ⚠️  MCP unavailable — the loom MCP server isn't connected in this session. The available tools list doesn't include any loom_* tools (only the standard
  deferred tools: TaskCreate, WebFetch, CronCreate, etc.), so I can't call loom_do_step, loom_append_done, or loom_complete_step.

  Per the Loom session contract, I should not edit weave markdown files directly to change state — all mutations must go through MCP tools.

  Options:
  1. Restart the session with the loom MCP server configured (per .loom/CLAUDE.md, it needs loom mcp registered as an MCP server with
  LOOM_ROOT=${workspaceFolder}).
  2. Verify the server is running — loom CLI must be on PATH and the MCP host must have it registered.
```

## AI:

The config file is in the wrong location, and **this is a propagating bug in our own `loom install` and CLAUDE.md** — both have been telling users to put MCP config in `.claude/settings.json`, which is wrong. Verified against the Claude Code docs.

**The truth (per https://code.claude.com/docs/en/mcp.md):**

| File | What it's for |
|---|---|
| `.claude/settings.json` | Project-scoped Claude Code settings: permissions, hooks, env vars. **NOT for MCP servers.** |
| `.mcp.json` (project root) | Project-scoped MCP servers, team-shared, commits to git. |
| `~/.claude.json` | User-scoped global config; also where local-scoped MCP servers are stored per project path. |

So Claude Code reads `.claude/settings.json` for *settings*, sees no `mcpServers` schema there, and ignores it for MCP. That's why `loom_*` tools never appear.

---

### Fix for your `j:/temploon/` test (do this now)

1. **Delete** `j:/temploon/.claude/settings.json` if it only contains the loom mcpServers block (it was redirected from the wrong file).
2. **Create** `j:/temploon/.mcp.json`:

```json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "loom",
      "args": ["mcp"],
      "env": {
        "LOOM_ROOT": "j:/temploon"
      }
    }
  }
}
```

Note: `"type": "stdio"` is required. `${workspaceFolder}` doesn't expand outside VS Code — for a project-scoped file, hard-code the path or use `LOOM_ROOT=` and let the loom CLI default to cwd.

3. **Approve the server** — project-scoped MCP servers need one-time approval per project, otherwise Claude Code silently disables them:
   - Run `claude` interactively in `j:/temploon/`. A prompt asks to approve `loom`. Approve.
   - Or run `claude /mcp` inside any session to manage.
4. **Verify**: `claude mcp list` should show `loom` connected. `claude /mcp` shows status. `claude --debug mcp` shows the loom server's stderr if it crashes.
5. Click DoStep again. Claude Code should now see `loom_do_step`, `loom_append_done`, `loom_complete_step`.

---

### The propagating bug to fix in this repo

I checked our source — two places point users at the wrong file:

1. **`packages/app/src/installWorkspace.ts:238`** — writes the MCP config to `.claude/settings.json`. Should write to `.mcp.json` at project root.
2. **`CLAUDE.md:179`** (this repo) — says "Add this to `{workspace}/.claude/mcp.json` (project-scoped)". Should say `.mcp.json` at project root.
3. **`installWorkspace.ts:56-69`** (the LOOM_CLAUDE_MD template that `loom install` copies into target projects) — has the JSON example but no path; whatever path our top-level docs say is what users will follow. Should be explicit: "Create this as `.mcp.json` in project root."
4. The schema generated by `installWorkspace.ts` (lines 217-227) is missing `"type": "stdio"`. Older clients tolerated the omission; newer ones may not.

If you `go`, I'll fix all four — single atomic edit, doesn't conflict with plan-001. Then your next `loom install` produces a working MCP setup out of the box.

STOP — waiting for confirmation that the manual `.mcp.json` fix unblocks you, and `go` on the propagating-bug fix.

## Rafa:

- go, do fix 1-4
- I already did fix for j:/temploom and Step 5 — manual test checklist worked

## AI:

All four propagating-bug fixes done. Step 5 ✅ noted (manual test passed in `j:/temploom`).

**Fix 1 — `installWorkspace.ts` writes to `.mcp.json` at project root** ([packages/app/src/installWorkspace.ts](../../../../packages/app/src/installWorkspace.ts))
- Removed `claudeDir` and the `.claude/settings.json` path entirely.
- `mcpJsonPath = path.join(root, '.mcp.json')`.
- Dropped the `ensureDirSync(claudeDir)` call (no longer needed — `.mcp.json` lives at project root, which always exists).

**Fix 2 — root `CLAUDE.md` updated** ([CLAUDE.md](../../../../CLAUDE.md))
- Replaced the misleading `{workspace}/.claude/mcp.json` line with explicit guidance: create `.mcp.json` in **project root**, with a callout that `.claude/settings.json` is for permissions/hooks/env and does NOT honour `mcpServers`.
- Added the one-time approval flow (`claude /mcp`, `claude mcp list`).

**Fix 3 — `LOOM_CLAUDE_MD` template inside `installWorkspace.ts`**
- Same correction propagated into the template that `loom install` copies into `.loom/CLAUDE.md` of every target project. New users now see the correct `.mcp.json` path and approval flow out of the box.

**Fix 4 — `"type": "stdio"` added to generated MCP config**
- `MCP_JSON` constant now includes `"type": "stdio"`. Both the generated `.mcp.json` and the JSON example in CLAUDE.md/template carry it.

**Bonus — `packages/cli/src/commands/install.ts`** updated the post-install console output to print `.mcp.json` instead of `.claude/settings.json` (otherwise users would still be misled by the success message).

`./scripts/build-all.sh` clean — core, fs, app, cli, vscode, mcp all built. No tests referenced the old path.

**Plan status:** Steps 1-5 all ✅. The plan-001 implementation is complete and the propagating bug that surfaced during Step 5 testing is fixed at the source.

Next: mark plan-001 as `done` and append a `-done.md`, or pick the next thread. Files that would be touched: `loom/vscode-extension/vscode-mcp-do-step/plans/vscode-mcp-do-step-plan-001.md` (status flip) and `loom/vscode-extension/vscode-mcp-do-step/done/vscode-mcp-do-step-plan-001-done.md` (new).

STOP — waiting for `go`.

## Rafa:

- We have 
  