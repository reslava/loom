---
type: chat
id: ch_01KY1JWWBGJKX25VNAGPQTFEHS
title: chats-add-references Chat 001
status: active
created: 2026-07-21
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 1
---
# chats-add-references Chat 001

## Rafa:

Currently in Extension, all docs ideas, designs, plans show `Add references...` right menu option `Add references...` except chats

wire `Add references...` to chats docs
If grounded and easy
code quick
of not tell me

## AI:

Done — grounded and easy, so I shipped it (`code quick`).

**What was missing:** the `Add References…` right-click item is contributed by the `loom.addRequiresLoad` command, gated in `package.json` by `when: viewItem =~ /^(idea|design|plan)/`. Chats were simply not in that regex — nothing deeper.

**Why it's safe:** the command handler (`addRequiresLoad.ts`) is fully doc-type-agnostic — it reads `node.doc.id` / `requires_load` and calls `loom_update_doc({ requires_load })`. Chats carry `requires_load` like every doc (it's on `BaseDoc`), and the context pipeline honours it: `assembleContext` seeds `resolveRequiresLoad` from the target doc, so a chat's own `requires_load` refs get injected on a full-scope `load`. So this isn't cosmetic — refs added to a chat actually load.

**The change (two lines):**
- `package.json`: `/^(idea|design|plan)/` → `/^(idea|design|plan|chat)/` on the `addRequiresLoad` menu entry. Bare `chat` prefix, matching how the existing `setStatusDone` / `rename` / `delete` entries already treat chat nodes (a normal chat node's `contextValue` is exactly `chat`).
- `addRequiresLoad.ts`: the "select a doc first" error message now says "idea, design, plan, or chat".

Build + full test suite green (23 passed). You'll need a **Reload Window** in the Extension Development Host to pick up the new `package.json` menu contribution.

One note for you to veto if you disagree: the `chat` prefix also matches `chat-refs` (a loose chat under the `refs` weave), so those get the item too. It's harmless — they're real chat docs with `requires_load` — and it keeps the regex consistent with the other menu entries rather than special-casing. Say the word if you'd rather restrict it to thread/weave chats only.