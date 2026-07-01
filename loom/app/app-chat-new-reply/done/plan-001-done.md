---
type: done
id: pl_01KR4TRHMZCRQVQZXJ7GFZM1T3-done
title: Done — Substitute hardcoded user name and AI model name in chat files with values from settings.json
status: done
created: "2026-05-08T00:00:00.000Z"
version: 4
tags: []
parent_id: pl_01KR4TRHMZCRQVQZXJ7GFZM1T3
requires_load: []
---
# Done — Substitute hardcoded user name and AI model name in chat files with values from settings.json

## Step 1 — Add a helper function (if not present) to read the user name and AI model name from `settings.json` — for example, `getUserName()` and `getAiName()` — in a shared utility module.

Created `packages/app/src/utils/chatNames.ts` with two exported helpers:
- `getUserName(loomRoot: string): string` — reads `user.name` from `{loomRoot}/settings.json`, fallback `'User:'`
- `getAiName(loomRoot: string): string` — reads `ai.model` from `{loomRoot}/settings.json`, fallback `'AI:'`

Settings are parsed once per `loomRoot` and cached in a module-level `Map` to avoid repeated I/O. The `settings.json` values already include the colon (e.g. `"**User:**"`), so callers use the helper result directly to replace the name+colon portion of `## Rafa:` / `## AI:` headers.

## Step 2 — In `packages/app/src/chatNew.ts` line 45, replace the hardcoded `## Rafa:` with the dynamically fetched user name using the helper.

Updated `packages/app/src/chatNew.ts`:
- Added import: `import { getUserName } from './utils/chatNames';`
- Replaced the hardcoded `'# CHAT\n\n## Rafa:\n'` (line 45) with a template literal `` `# CHAT\n\n## ${getUserName(deps.loomRoot)}\n` ``

`loomRoot` was already present in `ChatNewDeps`, so no interface changes were needed. The setting value (e.g. `"**User:**"`) already includes the colon, so the resulting header is `## **User:**`.

## Step 3 — In `packages/app/src/chatReply.ts` lines 16 and 117, replace the hardcoded `## AI:` with the dynamically fetched AI model name using the helper.

Updated `packages/app/src/chatReply.ts`:
- Added import: `import { getAiName } from './utils/chatNames';`
- Added `loomRoot: string` to `ChatReplyDeps` interface
- Replaced the module-level `SYSTEM_PROMPT` constant with `buildSystemPrompt(loomRoot: string)` — a function that reads the AI name dynamically so the prompt correctly tells the AI which header label to use
- Changed `buildMessages` signature to accept `systemPrompt: string` as a third parameter (instead of referencing the constant directly)
- Updated call site in `chatReply` function: passes `buildSystemPrompt(deps.loomRoot)` to `buildMessages`
- Replaced line 117 `\`\n\n## AI:\n${reply}\`` with `` `\n\n## ${getAiName(deps.loomRoot)}\n${reply}` ``

`chatReply` is not exported from `app/index.ts` and not imported in MCP (MCP uses sampling directly via `loom_generate_chat_reply`). The only MCP call site for `chatNew` (`packages/mcp/src/tools/createChat.ts`) already passes `loomRoot: root`.

## Step 4 — Verify that the settings.json is loaded before these strings are used (e.g., during app initialization) to avoid undefined values at runtime.

Verification — no code changes required. Analysis:

1. **Lazy load, not pre-init**: `loadSettings(loomRoot)` runs inside `getUserName`/`getAiName` on first call — at the moment the value is actually needed, before any string is built. No separate initialization step is required.

2. **No undefined possible at runtime**:
   - `??` fallbacks (`'User:'` / `'AI:'`) cover missing keys.
   - `catch` in `loadSettings` returns `{}` if `settings.json` is absent or malformed, so fallbacks always fire.
   - `settings.json` exists at the loom root for this workspace.

3. **`loomRoot` is required at the type level**: Both `ChatNewDeps.loomRoot` and `ChatReplyDeps.loomRoot` are required TypeScript fields — the compiler enforces that every caller provides them.

4. **MCP wiring confirmed**: `packages/mcp/src/tools/createChat.ts` passes `loomRoot: root` (the MCP server workspace root, always defined). `chatReply` is not currently exposed via MCP (MCP uses sampling path instead), so no additional wiring is needed there.

The design is correct: settings load lazily on first use, are cached per `loomRoot`, and have safe fallbacks throughout.
