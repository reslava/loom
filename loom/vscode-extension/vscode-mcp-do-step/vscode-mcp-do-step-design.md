---
type: design
id: vscode-mcp-do-step-design
title: "DoStep via Claude Code Terminal — Design"
status: draft
created: 2026-04-30
version: 1
tags: [vscode, mcp, do-step, claude-code, sampling]
parent_id: null
child_ids: [vscode-mcp-do-step-plan-001]
requires_load: [vscode-mcp-refactor-design]
role: primary
target_release: "0.5.0"
actual_release: null
---

# DoStep via Claude Code Terminal — Design

## Problem

The first DoStep design (in `vscode-mcp-refactor-plan-002`) used MCP sampling: the extension's button called `loom_do_step` → MCP server called `server.createMessage` → routed to the extension's AI client (Anthropic SDK / DeepSeek / OpenAI) → a text response came back → tool wrote the response to a doc and marked the step done.

**This produced hallucinations.** Manual test, plan step "create `test.txt`": the AI replied "I created test.txt" but the file did not exist. The cause is structural, not a bad prompt: the MCP `sampling/createMessage` protocol is **text completion only**. The AI cannot write files, run commands, or verify results. Asked to "implement", it can only return prose. So it returns prose pretending to be implementation.

Even Claude (used as the configured AI provider during the test) hallucinated, because the sampling response shape gave it no other option.

## Solution

The DoStep button stops being an in-process AI invocation. It becomes a **launcher** for Claude Code, which is a real agent with tool use (Read, Edit, Write, Bash). The MCP server stays deterministic; inference stays in the host agent loop where tools actually exist.

## Architecture

```
User clicks DoStep button (Loom VS Code extension)
  → Extension opens integrated terminal at workspace root
      → Runs: claude "<prompt to call loom_do_step for plan X>"
          → Claude Code starts, connects to loom MCP server
            (via .claude/settings.json — already configured)
              → Claude calls loom_do_step({ planId })           ← read-only brief
              ← brief: { stepNumber, description, threadContext, instructions }
              → Claude implements step using Read/Edit/Write/Bash tools
              → Claude calls loom_append_done({ planId, stepNumber, notes })
              → Claude calls loom_complete_step({ planId, stepNumber })
              → Claude reports outcome to user (streaming, in terminal)
```

Three properties this design enforces:

1. **MCP tools are deterministic.** No sampling, no recursion, no surprises. Each tool reads or mutates state in a known way.
2. **Inference happens where tools live.** Only the host agent (Claude Code, Cursor, manual Claude session) can implement, because only they can edit files. The extension does not pretend to do AI work.
3. **One implementation path, many launchers.** The same `loom_do_step` brief works whether triggered from the VS Code button, a Claude Code session by hand, or any future MCP host. No extension-specific code path inside the MCP server.

## MCP tool changes

### `loom_do_step` (redesigned — was an executor, now a brief)

**Input:** `{ planId: string }`

**Returns:** JSON brief
```json
{
  "planId": "...",
  "stepNumber": 4,
  "stepDescription": "...",
  "filesToTouch": ["packages/vscode/src/commands/doStep.ts"],
  "threadContext": "<bundled idea + design + plan + requires_load>",
  "planSummary": "<all steps with ✅/⬜ markers>",
  "instructions": "Implement this step using your file-editing tools. After implementation, call loom_append_done with a summary, then loom_complete_step. If a decision needs human input, stop and ask."
}
```

No sampling. No state mutations. Pure read.

### `loom_append_done` (new)

**Input:** `{ planId: string, stepNumber: number, notes: string }`

**Effect:** appends a `## Step N — <description>` section to `{thread}/done/{plan-id}-done.md`. Creates the file with proper Loom frontmatter on first call. Idempotent on re-run (replaces a section for the same step number rather than duplicating it).

**Returns:** `{ filePath, created }` where `created` is `true` if the file was just created.

### `loom_complete_step` (no change)

Already exists. Marks the step done via the app reducer.

## Extension changes

`packages/vscode/src/commands/doStep.ts` becomes a thin terminal launcher:

```typescript
export async function doStepCommand(treeProvider, node) {
    // validate: workspace open, node is plan, status === 'implementing'
    const terminal = vscode.window.createTerminal({
        name: `Loom: ${plan.title}`,
        cwd: workspaceRoot,
    });
    terminal.show();
    const prompt = `Use the loom MCP server. Call loom_do_step with planId="${plan.id}" to get the brief. Implement the step using your tools. After implementation, call loom_append_done with your notes, then loom_complete_step. Show me what you did.`;
    terminal.sendText(`claude ${JSON.stringify(prompt)}`);
}
```

No MCP call from the extension. No AI client. No sampling handler dependency for this command. The sampling handler in `mcp-client.ts` stays — it is still required by `loom_generate_chat_reply` and the other `loom_generate_*` tools — but it is no longer part of the DoStep path.

## Detection and graceful failure

- **Claude Code not installed:** before showing the terminal, run `which claude` (or `where claude` on Windows). If absent, show an error notification linking to install instructions and skip terminal creation.
- **Plan not in `implementing` status:** error notification, do not open terminal.
- **`loom_do_step` returns no pending step:** Claude reports "all steps done" in the terminal; extension does not need special handling.

## Why this is right

- **No hallucination floor.** Claude has its real tools. When it says "I edited X" it actually did.
- **Streaming + interaction for free.** The terminal is the streaming surface. The user can interrupt, ask follow-ups, or correct course mid-flight.
- **Same MCP tools work from any host.** A user on Cursor or in a manual Claude Code session can run the exact same flow — no extension needed.
- **Extension stays thin.** `doStep.ts` drops to ~30 lines, no AI client, no sampling.
- **Honest separation of concerns.** MCP server = deterministic state surface. Host agent = inference + tool use. The two never blur.

## What plan-002 of `vscode-mcp-refactor` got right vs. wrong

**Right:**
- Adding `sampling/createMessage` to `mcp-client.ts` — still needed for `loom_generate_chat_reply`. Keep.
- Reverting `chatReply.ts` to use the MCP tool — chat reply genuinely is text completion, no tool use needed. Keep.
- Toolbar button + `view/item/context` entry — UI is correct, only the command body changes.

**Wrong:**
- Treating `loom_do_step` as a sampling-driven executor. The protocol shape forced hallucinations. Replaced by the briefing pattern in this design.

Plan-002's steps 1, 2, 5 stay done. Step 3 (`loom_do_step` tool) and step 4 (`doStep.ts` extension command) are superseded by the new plan in this thread.

## Open questions

- **Done.md format**: per-plan with appended sections (matches existing docs in `loom/**/done/*.md`), or per-step? Going with per-plan; cleaner and matches precedent.
- **Multiple concurrent runs**: one terminal per click. User can open many. No serialization.
- **Cross-platform terminal launch**: `vscode.window.createTerminal` is portable. The `claude` invocation needs to work in PowerShell, bash, and zsh — `JSON.stringify(prompt)` produces a quoted string that works in PowerShell and bash; verify on launch.
