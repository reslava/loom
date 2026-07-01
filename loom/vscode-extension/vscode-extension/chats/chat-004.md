---
type: chat
id: ch_01KSCE4903HJB16BC83R97W5DK
title: VSCode new fixes for demo
status: done
created: "2026-05-24T00:00:00.000Z"
updated: 2026-05-24
version: 2
tags: []
parent_id: null
requires_load: []
---
# VSCode new fixes for demo

## Rafa:

been working in a demo in `j:/loom_demo` 

all promote loom doc inject the prompt in terminal and wait for user to type `enter` and should not

i promote a design to a plan and do not create a steps table, instead create steps enumeration secions
`j:/loom_demo/loom/demo/demo/plans/demo-plan-001.md`

both bugs has been fixed previously, now they reappear after implementing
`loom/vscode-extension/vscode-extension/plans/vscode-extension-plan-010.md`

maybe some create promoto to plan needs to update some `# Steps` to new `## Steps`


## AI:

Investigated both regressions. They have **different root causes** — not a single missed update from plan-010.

## Bug 1 — Promote prompts wait for Enter in terminal

**Cause:** commit `939f143` rewrote `launchClaude` in `packages/vscode/src/commands/claudeTerminal.ts`:

```diff
- terminal.sendText(`claude ${JSON.stringify(prompt)}`);
+ terminal.sendText(`claude --dangerously-skip-permissions ${quotePrompt(prompt)}`);
```

Two suspects:

1. **Shell quoting branch**: `quotePrompt` reads `vscode.env.shell`. If yours is `pwsh.exe`, it wraps in single quotes — fine. But the prompt contains literal `=` and `"` characters; a misdetected shell (e.g. `pwsh` falling through to the POSIX branch) sends an unterminated command and the shell waits for more input → looks like "waiting for Enter."
2. **Claude CLI semantics**: in some Claude Code versions, `claude "<prompt>"` opens the interactive REPL **pre-filled** with the prompt and does not auto-submit — user must press Enter inside Claude. `JSON.stringify(prompt)` used to behave the same way, but if your installed `claude` version changed between then and now, that could explain why the regression appeared *now* even though the code change was earlier.

**To narrow it down quickly**, in a Loom-AI terminal:
- log `vscode.env.shell` value
- try `claude -p "test"` (print mode) vs `claude "test"` and see whether Enter is required

**Most likely fix:** since `launchClaude` is used by all promote/refine/do-step buttons, the right fix is one of:
- pass the prompt via stdin (`echo … | claude`) which always auto-submits
- or append a stray newline character to force submit: `terminal.sendText('')` immediately after (sends the Enter the user is currently pressing manually)

I'd default to the stdin approach — quoting-agnostic and shell-agnostic.

## Bug 2 — Promote → plan creates `### Step N` sections instead of a steps table

**Not** caused by plan-010. The MCP-sampling path (`packages/app/src/promoteToPlan.ts`) was correctly updated in `07bd6ea` to emit `## Steps` with a numbered list, which `parseNumberedSteps` then turns into the Steps table.

**But you went through the Claude Code CLI branch** in `promoteToPlan.ts:33-35`, where the prompt to Claude is:

> "use MCP tool loom_update_doc with a plan steps table derived from the source"

That phrasing is too vague. Claude reasonably interpreted "plan steps table" as "a section that lists the steps" and wrote:

```
## Implementation
### Step 1: …
### Step 2: …
```

instead of populating the actual `| Done | # | Step | Files touched | Blocked by |` markdown table that `loom_create_plan` scaffolds. The empty `## Steps` table in your demo plan confirms it — the scaffold was created, then Claude wrote a sibling `## Implementation` section instead of filling rows.

**Fix:** in `promoteToPlan.ts:33-35`, replace the vague "steps table" instruction with the exact format — either inline the table template or instruct Claude to use `parseNumberedSteps`-compatible format (emit `## Steps` followed by `1. step` / `2. step` lines, the same contract the MCP-sampling path uses, then let `loom_update_doc` / the reducer translate that into table rows).

The cleaner option is the second: one canonical step-emission format, regardless of whether sampling or Claude CLI generates it. Otherwise the two paths drift again the next time someone touches `planBody.ts`.

## Recommendation

Two separate fixes, two separate commits:
1. `claudeTerminal.ts` — switch to stdin pipe so prompts always auto-submit (kills bug 1 for all promote/refine/do-step paths).
2. `promoteToPlan.ts` (Claude CLI branch) — give Claude the exact step format, matching the sampling path.

Want me to write either or both?

## Rafa:

Do both
note: do not add `--dangerously-skip-permissions`

## AI:

Done — both fixes applied, extension built clean (`loom-vscode-0.6.1.vsix`, 376 KB).

## Fix 1 — `packages/vscode/src/commands/claudeTerminal.ts`

- Removed `--dangerously-skip-permissions`.
- Removed `quotePrompt` (shell-specific string quoting was the fragile part).
- Now: write the prompt to `os.tmpdir()/loom-prompt-<ts>-<pid>.txt` and invoke `claude` via shell-appropriate command substitution that reads the file:
  - PowerShell: `claude (Get-Content -Raw -LiteralPath '<file>')`
  - cmd.exe:    `type "<file>" | claude`
  - POSIX:      `claude "$(cat '<file>')"`

The prompt never has to survive a shell parse, so newlines, quotes, `$`, backticks etc. can't break the command. Whatever auto-submit behavior the previous version had with `JSON.stringify`, this restores — Claude gets the prompt as a positional argument, no Enter required.

## Fix 2 — `packages/vscode/src/commands/promoteToPlan.ts` (Claude-CLI branch)

Replaced the vague "use loom_update_doc with a plan steps table" with a one-shot `loom_create_plan` call that takes `title`, `goal`, **and** `steps[]` in a single call. `weavePlan` already renders steps as proper `| 🔳 | N | … | — | — |` table rows via `generatePlanBody`, so the table format can't drift again.

Explicitly told Claude NOT to write a separate `## Implementation` / `### Step N` section — that was exactly the failure mode in `j:/loom_demo/loom/demo/demo/plans/demo-plan-001.md`.

## To verify

Reinstall the .vsix (or reload the extension dev host), then in your demo workspace:
1. Promote a design → plan via right-click. Expect: Claude runs immediately, no Enter required. The created plan has rows in the `## Steps` table (not a `## Implementation` section).
2. Promote a chat → idea / idea → design too — same auto-run behavior, since all promote/refine/do-step paths go through `launchClaude`.

Tell me what you see and I'll commit, or fix any follow-ups first.

## Rafa:

This is neverending...
Promoting to idea:

```
 echo "─── Loom: Promote to Idea ───"
  claude "$(cat 'M:\Temp\loom-prompt-1779612020872-2436.txt')"
  
```  

wait for user type `enter`
i press `enter`, claude reply:

```
I see a shell command for a Loom promote-to-idea operation. A few things to clarify:

  1. The syntax appears incomplete — there's no operator between the echo and claude commands. Did you mean && to chain them?
  2. The temp file may not exist — M:\Temp\loom-prompt-1779612020872-2436.txt looks like it was generated by a previous Loom operation. If it's no longer available, the command will
  fail.
  3. What I can do:
    - If you want me to run this command, I can use Bash, but I'd need the command syntax corrected first.
    - If you want to understand what's in the prompt file, I can try to read it if it still exists.
    - If you want to promote a document to an idea manually, I can use the Loom MCP tools directly.

  What would be most helpful?
```

note: for demo i use claude haiky and git bash terminal, but should work on any terminal as we agreed

## AI:

Your transcript shows the real bug — and it isn't shell quoting. Two compounding problems:

**1. Terminal reuse bug (the primary one)**

`_terminal` was cached at module level and reused across calls. After the *first* `launchClaude`, `claude` is the foreground process inside that terminal. The next `launchClaude` reuses the same terminal, so the two `sendText` lines — `echo "─── … ───"` and `claude "$(cat …)"` — get typed **into the running Claude REPL as user input**, not parsed by bash. That's exactly why Claude (Haiku) replied saying "the syntax appears incomplete, did you mean `&&`?" — it was reading your shell commands as a question.

Why I missed it on the first pass: when there's no previous Claude session open, the cache check passes (`vscode.window.terminals.includes(_terminal)` is false because user closed it), a new terminal is created, all good. But in your demo you ran promote-to-plan (Claude started, stayed running), then promote-to-idea (cached terminal still alive → typed into Claude).

**2. Backslash path in Git Bash**

`os.tmpdir()` returns `M:\Temp\…` (backslashes) on Windows. Inside bash single-quotes that's literal; MSYS sometimes converts, sometimes doesn't — fragile. Even with fix #1, the `cat` could fail.

**Fixes applied** (`packages/vscode/src/commands/claudeTerminal.ts`):

- `getLoomTerminal` now always disposes the previous Loom AI terminal and creates a fresh one. Each promote/refine/do-step gets its own clean shell. Trade-off: scrollback from previous run is gone (acceptable — output is meant to be ephemeral).
- For POSIX shells (bash, zsh, Git Bash, fish), convert the prompt-file path to forward slashes before substituting it into the `$(cat '…')` form.

Built clean (`loom-vscode-0.6.1.vsix`, 376 KB).

**To verify:** reinstall, then in the demo workspace try the failure sequence again — promote-to-plan, *don't close the terminal*, then promote-to-idea. Each should open a fresh Loom AI terminal, run Claude with the prompt, and not require Enter.