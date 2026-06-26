---
type: plan
id: pl_01KW2HKGCBF051SA6MDSE784WK
title: Fix loom_close_plan silent-stub done docs (B+C)
status: done
created: 2026-06-26
updated: 2026-06-26
version: 1
design_version: 1
tags: []
parent_id: ch_01KW2GNXP8MDZW467MGBDPK0KG
requires_load: []
target_version: 0.1.0
steps:
  - id: closeplan-use-case
    order: 1
    status: done
    description: "Rewrite the closePlan use-case: remove AI inference, write notes verbatim, fail loud on no content"
    files_touched: [packages/app/src/closePlan.ts]
    blocked_by: []
    satisfies: []
  - id: loom-close-plan-tool
    order: 2
    status: done
    description: "Update the loom_close_plan MCP tool wrapper: drop makeAiClient, rewrite the tool description"
    files_touched: [packages/mcp/src/tools/closePlan.ts]
    blocked_by: []
    satisfies: []
  - id: delete-deepseekclient
    order: 3
    status: done
    description: Delete the orphaned DeepSeek client and confirm no remaining references
    files_touched: [packages/mcp/src/deepseekClient.ts]
    blocked_by: []
    satisfies: []
  - id: tests
    order: 4
    status: done
    description: Rewrite close-plan tests for the new verbatim/no-AI behavior
    files_touched: [tests/close-plan.test.ts, tests/workspace-workflow.test.ts]
    blocked_by: []
    satisfies: []
  - id: build-verify
    order: 5
    status: done
    description: Build, run full tests, and live-verify no stub is ever written
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Fix loom_close_plan silent-stub done docs (B+C)

## Goal

loom_close_plan currently delegates the done-doc body to an AI inference call (makeAiClient().complete()). In any keyless/Claude-Code session that client is a stub that returns a fixed "TODO: Add implementation notes." placeholder, so the tool silently writes a stub done doc and marks the plan done regardless of the notes argument. Implement decision B+C: make loom_close_plan plan-finalization only (no inference); the done-doc body is authored by the agent via loom_append_done per step; an optional notes argument is written verbatim (not summarized); and closing a plan with neither notes nor an existing done doc fails loudly instead of producing a stub. Delete the now-orphaned DeepSeek client. This makes loom_close_plan correct on the primary path where Claude itself is the AI, and removes the silent-failure mode for good.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Rewrite the closePlan use-case: remove AI inference, write notes verbatim, fail loud on no content | packages/app/src/closePlan.ts | — | — |
| ✅ | 2 | Update the loom_close_plan MCP tool wrapper: drop makeAiClient, rewrite the tool description | packages/mcp/src/tools/closePlan.ts | — | — |
| ✅ | 3 | Delete the orphaned DeepSeek client and confirm no remaining references | packages/mcp/src/deepseekClient.ts | — | — |
| ✅ | 4 | Rewrite close-plan tests for the new verbatim/no-AI behavior | tests/close-plan.test.ts, tests/workspace-workflow.test.ts | — | — |
| ✅ | 5 | Build, run full tests, and live-verify no stub is ever written | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:closeplan-use-case -->
### Step 1 — closePlan use-case

Remove `aiClient` from `ClosePlanDeps` and delete the `AIClient`/`Message`/`SYSTEM_PROMPT`/`userMessage`/`aiClient.complete()` machinery. Keep plan finalization unchanged: FINISH_PLAN reducer when status is implementing, in-place save for a thread plan, move-to-done for a flat/loose plan. New done-doc handling using the existing doneDirPath/doneId/doneFilePath computation: (1) if `notes` is provided, write it verbatim — create the done doc with `notes` as the body if it does not exist, or append a trailing closing section (load existing, append, bump version) if it already exists; (2) if `notes` is absent but the done doc already exists (per-step records authored by loom_append_done), leave it untouched and return its path; (3) if `notes` is absent and no done doc exists, throw a clear error (e.g. "No done content for {planId}: author it with loom_append_done per step, or pass notes") — never write a stub. Return `{ donePath, planId }` unchanged so the vscode command keeps working.

<!-- step:loom-close-plan-tool -->
### Step 2 — loom_close_plan tool

Remove the `makeAiClient` import and the `aiClient: makeAiClient()` entry from the closePlan use-case deps. Rewrite `toolDef.description`: finalization-focused; the optional `notes` string is written verbatim (not summarized); per-step bodies are authored via loom_append_done; remove the "otherwise a placeholder is generated" language.

<!-- step:delete-deepseekclient -->
### Step 3 — Delete deepseekClient

After step 2, makeAiClient/DeepSeekAIClient have no importers (verified: only closePlan.ts used them). Delete packages/mcp/src/deepseekClient.ts. Grep packages/ to confirm no remaining `deepseekClient`/`makeAiClient` references.

<!-- step:tests -->
### Step 4 — Tests

Drop `mockAIClient`/`aiResponse` from `makeDeps`. Test 1: pass `notes`, assert the done doc contains the verbatim notes (not an AI body). Test 2 (auto-completed plan, no notes): seed a pre-existing done doc (or pass notes) so close succeeds; assert it is left untouched / appended. Replace test 4 ("user notes passed to AI") with "notes written verbatim to done doc". Add a new test: closing a plan with neither notes nor an existing done doc throws (C). Inspect workspace-workflow.test.ts's closePlan usage and update any assertion that relied on an AI-generated body.

<!-- step:build-verify -->
### Step 5 — Build + verify

Run ./scripts/build-all.sh then ./scripts/test-all.sh. Live-verify via MCP that loom_close_plan writes a real done doc from notes (and throws the loud error when there is no content), never a TODO stub. Note: the running session's `loom mcp` is stale after build — restart the session/MCP before live-testing or the old code answers.
