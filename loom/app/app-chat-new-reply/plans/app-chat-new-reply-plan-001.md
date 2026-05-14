---
type: plan
id: pl_01KR4TRHMZCRQVQZXJ7GFZM1T3
title: Substitute hardcoded user name and AI model name in chat files with values from settings.json
status: done
created: "2026-05-08T00:00:00.000Z"
updated: 2026-05-08
version: 2
tags: []
parent_id: id_01KR4TED5JSRNZ17Z3YFA71YB7
requires_load: []
---
# Substitute hardcoded user name and AI model name in chat files with values from settings.json

## Goal
Replace the hardcoded string `## Rafa:` in chatNew.ts and `## AI:` in chatReply.ts with values read from settings.json, and make sure the helper to read from settings.json is already in place.

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Add a helper function (if not present) to read the user name and AI model name from `settings.json` — for example, `getUserName()` and `getAiName()` — in a shared utility module. | — | — |
| ✅ | 2 | In `packages/app/src/chatNew.ts` line 45, replace the hardcoded `## Rafa:` with the dynamically fetched user name using the helper. | — | — |
| ✅ | 3 | In `packages/app/src/chatReply.ts` lines 16 and 117, replace the hardcoded `## AI:` with the dynamically fetched AI model name using the helper. | — | — |
| ✅ | 4 | Verify that the settings.json is loaded before these strings are used (e.g., during app initialization) to avoid undefined values at runtime. | — | — |
## Notes
- The exact location and filename of `settings.json` must be confirmed; the plan assumes it is accessible via a standard path or configuration.
- The helper functions should be synchronous and cached to avoid repeated I/O.
- Check that the replacement does not break string context in chat template logic (e.g., prefix patterns used for parsing).