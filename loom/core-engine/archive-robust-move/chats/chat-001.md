---
type: chat
id: ch_01KWH67GHRC400TFA4G9Q1XPC9
title: archive-robust-move Chat
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 1
---
# archive-robust-move Chat

## Rafa:

This is active chat

I started the plan
Do whole plan

## AI:

Whole plan done — all 3 steps ✅, plan auto-completed.

- **`moveTreeOrThrow`** (`packages/fs/src/utils/moveTree.ts`, exported from the fs index): move → if the source survives (whether `fs.move` threw or resolved) it rolls back the copy **it** made (never a pre-existing dest) and throws "a file is likely open or locked … No changes were kept." Either fully moved, or nothing changed.
- **All four folder-move sites routed through it:** `archive`, `restore`, and `thread.ts`'s `renameThread` + `moveThread`. (Left the internal legacy-singleton *file* flatten alone — not a user folder move.)
- **Test** `tests/archive-robust-move.test.ts` — injected fake `fs` across 4 cases (happy, copy-leaves-source-resolves, move-throws-after-copy, pre-existing-dest-preserved); asserts throw + rollback + no duplicate. Wired into `test-all.sh`.

`build-all` green; full `test-all` green including the 18 MCP integration tests — no regressions. The `plan-steps-v2`-style silent duplicate can't happen through these paths anymore: a locked file now fails loudly and leaves the tree untouched instead of copying.

Committing now.

Next: `archive-robust-move` is done. If you want, re-run the archive that misbehaved (with a doc tab open) to see the new fail-loud message — otherwise this thread's closed.