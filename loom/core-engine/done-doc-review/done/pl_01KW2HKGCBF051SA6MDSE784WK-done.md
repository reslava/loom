---
type: done
id: pl_01KW2HKGCBF051SA6MDSE784WK-done
title: Done — Fix loom_close_plan silent-stub done docs (B+C)
status: done
created: 2026-06-26
version: 6
tags: []
parent_id: pl_01KW2HKGCBF051SA6MDSE784WK
requires_load: []
---
# Done — Fix loom_close_plan silent-stub done docs (B+C)

## Step 1 — Rewrite the closePlan use-case: remove AI inference, write notes verbatim, fail loud on no content

Rewrote `packages/app/src/closePlan.ts`. Removed `aiClient` from `ClosePlanDeps` and deleted the `AIClient`/`Message`/`SYSTEM_PROMPT`/`userMessage`/`aiClient.complete()` inference machinery. Plan finalization (FINISH_PLAN reducer when implementing, in-place save for thread plans, move-to-done for flat plans) is unchanged. New done-doc handling: if `notes` given → write verbatim (create with notes as body, or append a `## Closing notes` section + version bump if a done doc already exists); if no notes but done doc exists → leave untouched; if no notes and no done doc → throw `No done content…` (never a stub). Returns `{ donePath, planId }` unchanged so the vscode command keeps working.

## Step 2 — Update the loom_close_plan MCP tool wrapper: drop makeAiClient, rewrite the tool description

Updated `packages/mcp/src/tools/closePlan.ts`. Dropped the `makeAiClient` import and the `aiClient: makeAiClient()` entry from the use-case deps. Rewrote `toolDef.description` to be finalization-focused: states that the done body is authored per step via `loom_append_done`, that `notes` is written verbatim (not summarized), and that closing with neither notes nor an existing done doc throws rather than writing a placeholder stub. The `notes` input schema description updated to "written verbatim into the done doc".

## Step 3 — Delete the orphaned DeepSeek client and confirm no remaining references

Deleted `packages/mcp/src/deepseekClient.ts` (the `DeepSeekAIClient` class + `makeAiClient` factory — source of the silent `TODO: Add implementation notes.` stub). Confirmed via grep over `packages/` that no references to `deepseekClient` / `makeAiClient` / `DeepSeekAIClient` remain. `closePlan.ts` was its only importer; with step 2 done it is fully orphaned, so it's removed rather than left as dead code.

## Step 4 — Rewrite close-plan tests for the new verbatim/no-AI behavior

Rewrote `tests/close-plan.test.ts` and updated `tests/workspace-workflow.test.ts`.

close-plan.test.ts: dropped `mockAIClient`/`aiResponse` from `makeDeps`; added a `seedDoneDoc` helper (simulates a per-step done doc from loom_append_done). New cases: (1) notes written verbatim as body + plan finalized in-place, asserting the stub string is absent; (2) notes appended as a `## Closing notes` section to an existing done doc without clobbering per-step content + version bump; (3) no notes + existing done doc → finalize, done doc untouched (version unchanged); (4) no notes + no done doc → throws `No done content…` and writes no stub file; (5) unknown planId throws.

workspace-workflow.test.ts: removed `aiClient: mockAIClient(...)` (now an excess property) from both closePlan deps; test 3 now passes `notes` and asserts the verbatim notes appear in the done doc; the test-5 closePlan passes `notes` so a done doc is created. `mockAIClient` import retained (still used by the doStep cases).

## Step 5 — Build, run full tests, and live-verify no stub is ever written

Ran `./scripts/build-all.sh` (clean across core/fs/app/mcp/cli/vscode) and the full `./scripts/test-all.sh` — all green including MCP integration (17/17). Coverage spans both the closePlan fix and the follow-up `loom_append_done` batch mode (`tests/append-done.test.ts`, 5/5). Live-verified against a reconnected MCP server: this done doc was re-authored by a single batch `loom_append_done` call with all five step sections supplied OUT OF ORDER in one request — the tool upserted and re-ordered them 1→5 correctly and bumped the doc version, confirming the whole-done-in-one-call path works against the live tool.
