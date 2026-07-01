---
type: chat
id: ch_01KVR5CR14302Q4ZNF4RNKSBB7
title: chat-append-reply-fix Chat
status: done
created: 2026-06-22
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 5
---
# chat-append-reply-fix Chat

## Rafa:

This is a small, easy and fast fix I guess, but need to be fixed because is anooying.

When AI uses `loom_append_to_chat(...)` mcp tool many times the numbers of empty lines before `## AI:` header is more than 1

## AI:

Confirmed and root-caused — and it's a slightly bigger (but still small) fix than "trim one string," because there are two append paths.

**It's not the save/load round-trip.** I reproduced that in isolation and it's clean — single blank line, no growth. The bug is in the *append seam*.

`loom_append_to_chat` builds the new block as (`packages/mcp/src/tools/appendToChat.ts:37`):

```
`${existingBody}\n\n## ${displayName}\n\n${body}`
```

It adds `\n\n` unconditionally and never trims the seam, so any trailing newline already on the previous block gets *added to* it:
- your typed message ending in a blank line, or
- an AI `body` argument that ends with `\n` (most do)

→ existing trailing `\n` + literal `\n\n` = 2+ blank lines before `## AI:`, and it compounds every append. (Live example: `global-chat-006.md` has two blank lines before `## AI:`.)

**Second issue found while tracing it:** there are *two* append paths and they disagree, so patching one leaves the other wrong:
- MCP `appendToChat.ts` → `## name\n\n${body}` (blank line after header) but **no** trim of existing.
- app `chatReply.ts:122` → `## name\n${reply}` (**no** blank line after header) but **does** `trimEnd()`.

So the seam logic is duplicated *and* inconsistent in format.

**Proposed clean fix (root cause, single source of truth)** — add one helper to `packages/core/src/chatUtils.ts` that owns block-appending and normalizes the seam to exactly one blank line before the header and one after, whatever whitespace comes in:

```ts
export function appendChatBlock(existingBody: string, header: string, body: string): string {
  const base = existingBody.replace(/\s+$/, '');
  const text = body.replace(/^\n+/, '').replace(/\s+$/, '');
  const block = `## ${header}\n\n${text}`;
  return base ? `${base}\n\n${block}` : block;
}
```

Then both `appendToChat.ts` and `chatReply.ts` call it — kills the duplication and the format divergence in one move. (Leading-newline-only strip on `body` preserves first-line code indentation; trailing trim is always safe.)

Scope: `packages/**` only (built via `build-all.sh`) + a small `chatUtils` test for the seam. I'd leave already-corrupted existing chats as-is unless you want a one-off normalize pass.

Want me to do it?

## Rafa:

go ahead

note: you can see in this chat itself empty lines 20,21 before your reply

## AI:

Fixed at the root. Summary of the change:

- **`packages/core/src/chatUtils.ts`** — new `appendChatBlock(existingBody, header, body)`: strips trailing whitespace from the existing body, strips only *leading newlines* (not spaces) and trailing whitespace from the new body, then joins with exactly one blank line before the header and one after. Single source of truth for block-appending. Exported from `core/index.ts`.
- **`packages/mcp/src/tools/appendToChat.ts`** — now calls `appendChatBlock` instead of the raw `${existing}\n\n## h\n\n${body}` concat that was compounding the newlines.
- **`packages/app/src/chatReply.ts`** — also routed through `appendChatBlock`, which fixes its separate divergence (it was emitting `## h\n${reply}` with *no* blank line after the header). Both paths now produce identical, correct spacing.
- **`tests/mcp-new-tools.test.ts`** — added a seam test: repeated appends where every incoming body carries trailing newlines, asserting no run of 3+ newlines ever forms, single blank line before/after each header, first-line code indentation preserved, and empty base → bare block.

Built with `build-all.sh`; full `test-all.sh` green (17/17 integration + all unit suites).

⚠️ One caveat: the MCP server running in *this* session is the pre-build binary, so live `loom_append_to_chat` calls (including this very reply) still use the old code and will still double the blank line until you restart the session / MCP. New sessions get the fix.

Two leftovers, your call:
1. **Existing corrupted chats** — already-written docs (like the gaps above) keep their extra blank lines. Want a one-off normalize pass over `loom/**/chats/*.md`, or leave them?
2. This thread is just a chat right now — happy to promote it to an idea/plan for the record, or close it as a trivial fix.

## Rafa:

I reconnected mcp
1. leave them, no harm at all
2. yes, create a small plan, 1 step done, to be reflected in roadmap

commit

## AI:

All done.

1. Existing chats left as-is. ✅
2. Created plan **chat-append-reply-fix-plan-001** "Normalize chat append seam" — single step, marked done, plan auto-transitioned to `done`, so it'll surface in the roadmap. Done note recorded in `done/pl_01KVR6JYWQY1F51ZVA22D3FQCE-done.md`. ✅
3. Committed to `main` as `4034730` — `fix: normalize chat append seam to a single blank line` (9 files: the core helper + both wired paths + test + this thread's docs). Left the unrelated pre-existing `global-chat-006.md` change out of the commit.

Now that you've reconnected MCP, this reply itself runs on the rebuilt server — the seam above should be a single blank line.