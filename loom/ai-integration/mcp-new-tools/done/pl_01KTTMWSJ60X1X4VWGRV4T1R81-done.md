---
type: done
id: pl_01KTTMWSJ60X1X4VWGRV4T1R81-done
title: Done — MCP friction-reduction tools
status: done
created: "2026-06-11T00:00:00.000Z"
version: 6
tags: []
parent_id: pl_01KTTMWSJ60X1X4VWGRV4T1R81
requires_load: []
---
# Done — MCP friction-reduction tools

## Step 1 — Implement loom_patch_doc — body-prose string-match edit (old_string→new_string, unique-match-or-error, optional replace_all).

Implemented `loom_patch_doc` + added `target_release` param to `loom_update_doc`.

- `packages/mcp/src/tools/patchDoc.ts` (new) — body-prose string-match edit (`old_string`→`new_string`, `replace_all?`). Operates on `doc.content` only (frontmatter is parsed away by `loadDoc`, so it can never be matched). Unique-match-or-error unless `replace_all`. For `type:plan`, refuses any match overlapping the generated `## Steps` block (regex mirrors `parseStepsTable`'s boundary); the rest of a plan body (Goal, `### Step N` detail) stays patchable. Saves via `saveDoc` (re-index + version bump).
- `packages/mcp/src/tools/updateDoc.ts` — new `target_release` arg; rejected on non-design docs; stamped into frontmatter.
- `packages/mcp/src/server.ts` — registered `patchDoc` in the `doc` group.

Compiles via build-all. Live MCP requires session/restart to expose the new tool + param (deferred to step 6). target_release stamping of this thread's design (1.4.0) waits on that restart.

## Step 2 — Implement loom_update_step — amend fields of a pending/active plan step in frontmatter, regenerate the body Steps table; reject done steps.

Implemented `loom_update_step` (event-sourced, pure reducer).

- `packages/core/src/events/planEvents.ts` — new `UPDATE_STEP` event + `StepPatch` type. Patch fields are the **frontmatter-owned** step fields only (`description`, `files_touched`, `blockedBy`, `satisfies`). `title`/`detail` are deliberately excluded — they are body prose (per `frontmatterUtils`), edited via `loom_patch_doc`. This refines the design's patch list (which listed title/detail) for correctness — flagged to Rafa.
- `packages/core/src/reducers/planReducer.ts` — `UPDATE_STEP` case: allowed on draft/active/implementing/blocked; finds step by id; **rejects done/cancelled steps** (event-sourcing immutability) with a forward-correction message; applies provided fields.
- `packages/core/src/applyEvent.ts` — added `UPDATE_STEP` to the plan event dispatch list.
- `packages/app/src/updateStep.ts` (new) — use-case; maps boundary `files`→`files_touched`; rejects empty patch; runs event via injected `runEvent`.
- `packages/mcp/src/tools/updateStep.ts` (new) + `server.ts` registration (`plan` group).

Body table regenerates from frontmatter steps on save (existing `updateStepsTableInContent`). Compiles via build-all. Live exposure deferred to step 6 restart.

## Step 3 — Implement loom_reorder_steps — reorder the frontmatter steps array (permutation only) with done steps pinned as a leading block.

Implemented `loom_reorder_steps` (event-sourced, pure reducer).

- `packages/core/src/events/planEvents.ts` — new `REORDER_STEPS` event (`orderedStepIds`).
- `packages/core/src/reducers/planReducer.ts` — `REORDER_STEPS` case: validates `orderedStepIds` is a permutation of the plan's step ids (no adds/drops/dupes); enforces **done/cancelled steps stay the contiguous leading block in original relative order** (rejects otherwise); reassigns `order = index+1`. `blockedBy` references are ids so they survive reordering.
- `packages/core/src/applyEvent.ts` — `REORDER_STEPS` added to the plan dispatch list.
- `packages/app/src/reorderSteps.ts` (new) — use-case.
- `packages/mcp/src/tools/reorderSteps.ts` (new) + `server.ts` registration (`plan` group).

Compiles via build-all. Shares the step-frontmatter foundation from step 2. Live exposure deferred to step 6 restart.

## Step 4 — Add a last-AI-block read-cursor to chat frontmatter and make loom_append_to_chat auto-advance it; key block detection on configured ai.model/user.name.

Implemented the chat read-cursor + append auto-advance.

- `packages/core/src/chatUtils.ts` (new) — `parseChatBlocks`, `lastAiBlockIndex(body, aiHeader)`, `tailAfterBlock(body, idx)`. Block model parses `## {header}` sections; header label is passed in (the configured value), never hardcoded. Exported from `core/index.ts`.
- `packages/core/src/entities/chat.ts` — `ChatDoc.last_ai_block?: number` (0-based index of the last AI block; absent on legacy chats).
- `packages/core/src/frontmatterUtils.ts` — `last_ai_block` added to canonical key order (chat-specific).
- `packages/mcp/src/tools/appendToChat.ts` — rewrote from raw string-append to a `loadDoc` → mutate → `saveDoc` round-trip (it was the one chat write bypassing the serializer). On an `ai` append it sets `last_ai_block = lastAiBlockIndex(newBody, getAiName(root))`; a `user` append leaves the cursor. **Preserves existing semantics**: no version bump, no `updated` change — only the cursor is added. Header detection keys on `getAiName` (`.loom/settings.json`).

Note: implemented in core/entities/mcp rather than the plan's guessed `packages/fs/src/settings.ts` (settings access already lives in `app/utils/chatNames`). Compiles via build-all.

## Step 5 — Implement loom_read_chat_tail — return only the content after the last AI block (new human turns), using the cursor.

Implemented `loom_read_chat_tail`.

- `packages/app/src/readChatTail.ts` (new) — use-case (deps-injected per the injection rule: `resolveDocId`, `loadDoc`, `aiName`, `loomRoot`). Loads the chat, rejects non-chat docs, picks the cursor (stored `last_ai_block` if present, else `lastAiBlockIndex(body, aiHeader)` computed on the fly for legacy chats), returns `tailAfterBlock(...)` — the human turns since the last AI reply.
- `packages/mcp/src/tools/readChatTail.ts` (new) — wraps the use-case with fs `resolveDocIdOrThrow`/`loadDoc` and `getAiName`; returns the tail markdown directly (or "(no new turns since the last AI reply)").
- `packages/mcp/src/server.ts` — registered `readChatTail` in the `chat` group.

Compiles via build-all. Fallback-to-on-the-fly means existing chats (no cursor field yet) work immediately. Live exposure deferred to step 6 restart.

## Step 6 — Add MCP integration tests for all new tools, run build-all + test-all, sync both CLAUDE.md surfaces and verify loom://catalog lists the new tools, bump lockstep version to 1.4.0.

Closed out the release.

- **Integration tests** — `tests/mcp-new-tools.test.ts` covers all four tools' guards: UPDATE_STEP (amend pending / reject done+unknown), REORDER_STEPS (permutation + done-leading-block), chatUtils (custom header), patch_doc (prose edit, uniqueness, Steps-table refusal, plan Goal patchable), read_chat_tail (tail-after-last-AI with a configured `ai.model`). Plus the earlier `tests/claude-md-sync.test.ts`.
- **build-all + test-all** — both green; full suite incl. the 16 MCP integration tests passes.
- **CLAUDE.md sync (both surfaces)** — added `loom_patch_doc` + `loom_update_step`/`loom_reorder_steps` to the writes-breakdown and a `loom_read_chat_tail` note to the context-injection rule, in BOTH the root contract and the `LOOM_CLAUDE_MD` template. The new drift test confirms parity (13 rule ids, 12 invariants).
- **Catalog verified** — the four new tool names are in `packages/mcp/dist/tools/*` and registered in the server's grouped registry (loom://catalog reads clean in the integration test).
- **CHANGELOG** — wrote the 1.4.0 notes (root) + a lockstep note (vscode); `bump-version.sh` rolled `[Unreleased]` → `[1.4.0] - 2026-06-11`.
- **Version** — all 7 package.json bumped to 1.4.0; committed + tagged `v1.4.0` locally.
- **Push gated** — not pushed; awaiting Rafa's go (lightweight tag → must push the tag explicitly).
- Note: `bump-version.sh` reminds to review the 3 READMEs for hardcoded version strings — flagged, not done.
