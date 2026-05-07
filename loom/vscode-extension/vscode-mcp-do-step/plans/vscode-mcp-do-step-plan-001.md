---
type: plan
id: pl_01KQYDFDDER47Y0H7W7K4ZX80M
title: DoStep via Claude Code Terminal — Plan 001
status: done
created: "2026-04-30T00:00:00.000Z"
version: 1
design_version: 1
tags: [vscode, mcp, do-step, claude-code]
parent_id: de_01KQYDFDDE8Z0AV1R2Q8NNNKGK
requires_load: [de_01KQYDFDDE8Z0AV1R2Q8NNNKGK]
target_release: 0.5.0
actual_release: null
---

# DoStep via Claude Code Terminal — Plan 001

Implements the design in [vscode-mcp-do-step-design.md](../vscode-mcp-do-step-design.md): the DoStep button stops invoking AI in-process and instead launches Claude Code in an integrated terminal. `loom_do_step` becomes a deterministic briefing tool; a new `loom_append_done` records implementation notes; `loom_complete_step` (already exists) marks steps done.

## Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Redesign `loom_do_step` MCP tool to be a briefing tool — return JSON `{ planId, stepNumber, stepDescription, filesToTouch, threadContext, planSummary, instructions }`. Remove `requestSampling`, remove side effects (no chat doc, no `completeStep` call). | `packages/mcp/src/tools/doStep.ts`, `packages/mcp/src/server.ts` | — |
| ✅ | 3 | Rewrite extension `doStep.ts` to launch Claude Code terminal — `vscode.window.createTerminal({ cwd })`, build prompt that names `planId` and instructs Claude to call `loom_do_step → implement → loom_append_done → loom_complete_step`, send via `terminal.sendText`. | `packages/vscode/src/commands/doStep.ts`, `packages/vscode/src/extension.ts` | 1, 2 |
| ✅ | 4 | Detect `claude` binary on disk before launching — `which claude` / `where claude`. If missing, show an error notification with install pointer and skip terminal creation. | `packages/vscode/src/commands/doStep.ts` | 3 |
| ✅ | 5 | Manual test in Extension Development Host — create a small implementing plan, click DoStep, verify Claude Code terminal opens, plan executes end-to-end (file edits real, `done.md` appended, step ✅ in plan). | — | 4 |
## Definition of Done

- `loom_do_step` returns a JSON brief with no sampling and no side effects.
- `loom_append_done` creates and appends to `{plan-id}-done.md` correctly; replaces same-step sections idempotently.
- Clicking the DoStep button opens an integrated terminal that runs `claude` with a prompt naming the plan id.
- End-to-end manual test: real file edits land, `done.md` records them, plan step is marked ✅, no hallucinated changes.
- If `claude` is not on PATH, the user gets a readable error, not a silent failure or a half-opened terminal.

## Notes

- **Supersedes** `vscode-mcp-refactor-plan-002` steps 3 and 4. The previous `loom_do_step` (sampling-based executor) is replaced; the previous `doStep.ts` (calls MCP from extension) is replaced. Steps 1, 2, 5 of plan-002 remain valid and are not affected.
- The sampling handler in `mcp-client.ts` (added by plan-002 step 1) **stays**. It is still needed for `loom_generate_chat_reply` and other `loom_generate_*` tools that are genuinely text-completion features.
- The hallucination test case (asking the AI to "create test.txt" and getting a false confirmation) becomes a regression test for this design: after this plan ships, running the same scenario via the new DoStep flow must produce a real file.
- Out of scope: a `DoSteps` (multi-step) button. Once plan-001 ships, multi-step is a trivial extension of the prompt sent to Claude Code.
