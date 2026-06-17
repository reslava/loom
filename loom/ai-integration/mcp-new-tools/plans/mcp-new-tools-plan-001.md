---
type: plan
id: pl_01KTTMWSJ60X1X4VWGRV4T1R81
title: MCP friction-reduction tools
status: done
created: 2026-06-11
updated: 2026-06-11
version: 1
design_version: 1
tags: []
parent_id: de_01KTTM79FTN3R728DZGTXZCSJE
requires_load: []
target_version: 0.1.0
actual_release: 1.4.0
steps:
  - id: loom-patch-doc
    order: 1
    status: done
    description: Implement loom_patch_doc — body-prose string-match edit (old_string→new_string, unique-match-or-error, optional replace_all).
    files_touched: [packages/app/src/patchDoc.ts, packages/mcp/src/tools/patchDoc.ts, packages/mcp/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: loom-update-step
    order: 2
    status: done
    description: Implement loom_update_step — amend fields of a pending/active plan step in frontmatter, regenerate the body Steps table; reject done steps.
    files_touched: [packages/core/src/reducers/updateStep.ts, packages/app/src/updateStep.ts, packages/mcp/src/tools/updateStep.ts, packages/mcp/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: loom-reorder-steps
    order: 3
    status: done
    description: Implement loom_reorder_steps — reorder the frontmatter steps array (permutation only) with done steps pinned as a leading block.
    files_touched: [packages/core/src/reducers/reorderSteps.ts, packages/app/src/reorderSteps.ts, packages/mcp/src/tools/reorderSteps.ts, packages/mcp/src/index.ts]
    blocked_by: [loom_update_step]
    satisfies: []
  - id: chat-read-cursor-append-auto-advance
    order: 4
    status: done
    description: Add a last-AI-block read-cursor to chat frontmatter and make loom_append_to_chat auto-advance it; key block detection on configured ai.model/user.name.
    files_touched: [packages/core/src/frontmatterUtils.ts, packages/app/src/appendToChat.ts, packages/fs/src/settings.ts]
    blocked_by: []
    satisfies: []
  - id: loom-read-chat-tail
    order: 5
    status: done
    description: Implement loom_read_chat_tail — return only the content after the last AI block (new human turns), using the cursor.
    files_touched: [packages/app/src/readChatTail.ts, packages/mcp/src/tools/readChatTail.ts, packages/mcp/src/index.ts]
    blocked_by: [Chat read-cursor + append auto-advance]
    satisfies: []
  - id: tests-build-docs-sync-version-bump
    order: 6
    status: done
    description: "Add MCP integration tests for all new tools, run build-all + test-all, sync both CLAUDE.md surfaces and verify loom://catalog lists the new tools, bump lockstep version to 1.4.0."
    files_touched: [packages/mcp/tests/integration.test.ts, CLAUDE.md, packages/app/src/installWorkspace.ts, scripts/bump-version.sh]
    blocked_by: [loom_patch_doc, loom_update_step, loom_reorder_steps, Chat read-cursor + append auto-advance, loom_read_chat_tail]
    satisfies: []
---
# MCP friction-reduction tools

## Goal

Implement the three friction-reduction deliverables for release 1.4.0 (lockstep): (1) loom_patch_doc for body-prose string-match edits, (2) loom_update_step + loom_reorder_steps for pending-only plan-step editing with done steps immutable, and (3) chat token optimization via a last-AI-block read-cursor and loom_read_chat_tail. All tools follow cli/mcp → app → core + fs, write through the existing runEvent/repository path so the link index and frontmatter validation run identically, and keep reducers pure. No hooks (explicitly rejected in the design). Ordered by leverage/cost: patch_doc first, then step tools, then chat optimization, finishing with tests, build, docs sync, and the version bump.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Implement loom_patch_doc — body-prose string-match edit (old_string→new_string, unique-match-or-error, optional replace_all). | packages/app/src/patchDoc.ts, packages/mcp/src/tools/patchDoc.ts, packages/mcp/src/index.ts | — | — |
| ✅ | 2 | Implement loom_update_step — amend fields of a pending/active plan step in frontmatter, regenerate the body Steps table; reject done steps. | packages/core/src/reducers/updateStep.ts, packages/app/src/updateStep.ts, packages/mcp/src/tools/updateStep.ts, packages/mcp/src/index.ts | — | — |
| ✅ | 3 | Implement loom_reorder_steps — reorder the frontmatter steps array (permutation only) with done steps pinned as a leading block. | packages/core/src/reducers/reorderSteps.ts, packages/app/src/reorderSteps.ts, packages/mcp/src/tools/reorderSteps.ts, packages/mcp/src/index.ts | loom_update_step | — |
| ✅ | 4 | Add a last-AI-block read-cursor to chat frontmatter and make loom_append_to_chat auto-advance it; key block detection on configured ai.model/user.name. | packages/core/src/frontmatterUtils.ts, packages/app/src/appendToChat.ts, packages/fs/src/settings.ts | — | — |
| ✅ | 5 | Implement loom_read_chat_tail — return only the content after the last AI block (new human turns), using the cursor. | packages/app/src/readChatTail.ts, packages/mcp/src/tools/readChatTail.ts, packages/mcp/src/index.ts | Chat read-cursor + append auto-advance | — |
| ✅ | 6 | Add MCP integration tests for all new tools, run build-all + test-all, sync both CLAUDE.md surfaces and verify loom://catalog lists the new tools, bump lockstep version to 1.4.0. | packages/mcp/tests/integration.test.ts, CLAUDE.md, packages/app/src/installWorkspace.ts, scripts/bump-version.sh | loom_patch_doc, loom_update_step, loom_reorder_steps, Chat read-cursor + append auto-advance, loom_read_chat_tail | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:loom-patch-doc -->
### Step 1 — loom_patch_doc

App use-case loads the doc, splits frontmatter from body (reuse the fs frontmatter parser), applies the string match to the BODY ONLY, and writes through the same path loom_update_doc uses (re-parse, re-index, body-edit version semantics). Guards: frontmatter is never in the match scope; for type:plan docs reject if the match range intersects the generated ## Steps block (detect by heading + table fence); no status/parent mutation. Register the MCP tool with a description scoping it to prose edits.

<!-- step:loom-update-step -->
### Step 2 — loom_update_step

Pure reducer finds the step by id in the frontmatter steps array, applies patch {description?, title?, files?, satisfies?, detail?, blockedBy?}, and returns new state; rejects if the target step is done/✅ (event-sourcing immutability). App use-case runs the reducer then regenerates the body table via the existing table generator. Surgical primitive only — not for substantive redesign (refine/regenerate path). MCP tool description states this.

<!-- step:loom-reorder-steps -->
### Step 3 — loom_reorder_steps

Reducer validates orderedStepIds is a permutation of existing ids (no adds/drops), and rejects any order that does not preserve done steps as a contiguous leading block in their original relative order. blockedBy references are ids so they survive reordering. App use-case regenerates the body table. Shares the step-frontmatter mutation + table-regen foundation from loom_update_step.

<!-- step:chat-read-cursor-append-auto-advance -->
### Step 4 — Chat read-cursor + append auto-advance

Add an optional chat frontmatter field holding the index of the last AI block (robust to reflow; not a byte/line offset). Block detection reads the configured ai.model / user.name header strings from .loom/settings.json — never hardcode '## AI:'. After appending an AI reply, loom_append_to_chat updates the cursor to the new last-AI-block index. Reuse the header strings the append path already knows.

<!-- step:loom-read-chat-tail -->
### Step 5 — loom_read_chat_tail

App use-case returns the chat content following the last AI block (configured header), to be used on first touch of a chat instead of a full re-read. MCP tool wraps it. Cuts the token cost that makes the durable reply path expensive.

<!-- step:tests-build-docs-sync-version-bump -->
### Step 6 — Tests, build, docs sync, version bump to 1.4.0

Integration tests covering patch_doc guards (frontmatter/Steps-block refusal), update_step/reorder_steps done-immutability + leading-block rule, and read_chat_tail with a customized ai.model header. Run ./scripts/build-all.sh (relinks global CLI; live MCP stale until restart) and ./scripts/test-all.sh. Sync the two CLAUDE.md surfaces (root recursive + LOOM_CLAUDE_MD template in installWorkspace.ts) for the new tools and rules; verify loom://catalog surfaces them. Bump the lockstep version to 1.4.0 (remember the lightweight-tag push gotcha).
