---
type: plan
id: pl_01KQYDFDDFQ9DNQR4GBWDMN7WA
title: DoStep Button via MCP Sampling — Plan 002
status: done
created: "2026-04-29T00:00:00.000Z"
updated: 2026-06-06
version: 3
design_version: 1
tags: [vscode, mcp, sampling, do-step]
parent_id: de_01KQYDFDDFZT3CVEBS43EJHVWT
requires_load: [de_01KQYDFDDFZT3CVEBS43EJHVWT, pl_01KQYDFDDF0GDECC668E23SX01]
target_release: 0.5.0
actual_release: null
---
# DoStep Button via MCP Sampling — Plan 002

Implements the AI-driven button workflow: the user clicks a button, the AI does real work (writes code, writes the `-done.md`), the plan ticks forward.

Architecture: Option A — MCP sampling. The VS Code extension's MCP thin client implements `sampling/createMessage`, routing inference requests to the extension's configured AI client. This unlocks the `loom_generate_*` MCP tools from the extension and keeps AI logic in the MCP server.

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a `sampling/createMessage` handler to `mcp-client.ts` — reads prompt + system msg from the request, calls `makeAIClient().complete(...)`, returns the result in MCP sampling format. | packages/vscode/src/mcp-client.ts | — | IN1 |
| ✅ | 2 | Revert `chatReply.ts` to use `loom_generate_chat_reply` — remove the `makeAIClient()` bypass added in plan-001 step 3. | packages/vscode/src/commands/chatReply.ts | — | IN3 |
| ✅ | 3 | Verify the `loom_do_step` tool exists on the MCP server (add if missing) — reads the next non-blocked step + thread context, builds a prompt, applies file edits, marks the step done, writes the matching `-done.md`. | packages/mcp/src/tools/doStep.ts | — | IN3 |
| ✅ | 4 | Add the `loom.doStep` extension command — receives the selected plan node, calls `mcp.callTool('loom_do_step', planId)`, refreshes the tree. | packages/vscode/src/commands/doStep.ts | — | IN3, C2 |
| ✅ | 5 | Add the toolbar button on plan nodes — `package.json` command icon + `view/item/context` entry, inline-only. | packages/vscode/package.json | — | IN3 |
| ✅ | 6 | Manual test in the Extension Development Host — build, reload, click DoStep on an active plan; verify edits applied, step marked, `-done.md` updated, tree refreshed. | — | — | — |
## Definition of Done

- `mcp-client.ts` handles `sampling/createMessage` and returns inference results to the MCP server.
- `loom.chatReply` works end-to-end via the original sampling flow (no `makeAIClient()` bypass).
- `loom.doStep` button appears on plan nodes.
- Clicking DoStep on an active plan implements the next step, marks it done, writes `-done.md`, refreshes the tree.
- Failure modes (no AI configured, sampling timeout, tool error) surface as readable notifications.

## Notes

- Depends on the `loom_do_step` MCP tool (step 3 implements it server-side if missing).
- After shipping, the same sampling handler unlocks future AI buttons.
- Out of scope: DoSteps (multi-step) and DoAllSteps — trivial loops over `loom.doStep`.
- **Req coverage:** this plan advances `IN1` (mcp-client wrapper, via the sampling handler) and `IN3` (commands/mutations route through `loom_*` tools). `IN2` (tree reads `loom://state`) and `IN4` (remove `app` imports) are out of this plan's DoStep/sampling scope — they are advanced by plan-001. Step 6 (live Extension-Host testing) corresponds to the **excluded** `EX1` and cites no requirement id; it is retained only because it was already completed.

> **Recovered 2026-06-06** from git commit `560038c` — the original 6-step table was silently wiped by an earlier doc migration (the old `| # | Step | Status | Notes |` format failed to parse, so the table was overwritten with an empty one). Restored faithfully in the current 6-column format.