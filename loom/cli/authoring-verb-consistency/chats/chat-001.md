---
type: chat
id: ch_01KX8A0MRF5MT14M7QWGXHXJE1
title: authoring-verb-consistency Chat 001
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 6
---
# authoring-verb-consistency Chat 001

## Rafa:

read idea

on gap #2 — MCP prompt verb: go (a) `generate-*`

note: in extension we still have a button `weave chat`, rename it to `create chat`, I think this is already in the idea

if is it all grounded write design

## AI:

Read the idea. Re-verified all three gaps against the current tree before writing — they're real, not just inherited from the idea:

- **#1** — `packages/app/src/weave{Idea,Design,Plan}.ts` exist, exporting `weaveIdea`/`weaveDesign`/`weavePlan` (they *create* — no AI). Call sites import by filename path (`app/dist/weaveIdea`), so a full-repo grep gives the exact sweep: `app/index.ts`, `cli/commands/create.ts`, MCP tools (`createIdea/createDesign/createPlan/seedExample/generate`), 6 sibling app files to check, and 10 test files.
- **#2** — prompts `weave-idea/design/plan` live in `mcp/src/prompts/`, registered in `server.ts:83-85,103`. Recorded your decision: **(a) `generate-*`**.
- **#3** — `package.json` titles `New Weave`/`Weave Thread`/`New Idea/Design/Plan`/`Weave Chat` (:96/:105/:129/:138/:147/:266) + welcome/walkthrough/README. The `Weave Chat` button you flagged is at :266 — yes, it was already covered by gap #3, folded into the `→ Create *` sweep.

All grounded and the one decision resolved, so I wrote **design.md** (draft). It covers the full rename tables, the by-surface call-site sweep, clean cutover with no aliases, and a build+test+grep verification. One thing I flagged rather than touched: `package-old-loom.json` still carries legacy `New Idea` titles — it's a retired backup, so I left it out of scope for separate deletion.

Next: review the design; if it reads right, *finalize* it and I'll draft the plan.

## Rafa:

I set status idea, design done
I tried set status done of this chat and got error: `Failed to set status "done": MCP error -32603: 'done' is not a valid status for a chat (valid: active, archived).`

Check it, and include the fix in the plan
Write plan

## AI:

Checked the chat-status error — root cause is `packages/core/src/setStatus.ts:29`, `chat: ['active', 'archived']`, backed by `ChatStatus = 'active' | 'archived'` (`entities/chat.ts:3`). Chats have no `done` state, so the rejection is the model working as written — chat and reference are the only doc types without `done`. The fix is a widening: add `done` to both. It's a free label flip (not a guarded transition), `DocumentStatus` picks it up automatically, and the tree just renders the string — nothing breaks.

Wrote **plan-001.md** (5 steps):
1. **App use-cases `weave*`→`create*`** — file renames + exports + `Input`/`Deps` types, and every call site + the 10 tests swept in the same step so the build never breaks mid-cutover.
2. **MCP prompts `weave-*`→`generate-*`** (decision a) — files, `name:` fields, `server.ts`, two refs.
3. **Extension labels →`Create *`** — the six `package.json` titles + welcome/walkthrough/README.
4. **Chat `done` status fix** — the widening above + a `decideSetStatus('chat','done')` allow test.
5. **Build + full suite + grep guards** — blocked on 1–4; asserts no old names survive.

One flag: the chat-status fix (step 4) is orthogonal to the verb sweep and isn't described by the idea/design (both now `done`). I folded it in as its own step per your ask rather than reopening the finalized design — but if you'd rather keep this thread purely about verbs, say so and I'll split step 4 into its own thread/plan.

Next: review the plan; *start* it and I'll implement step 1, or tell me to split the chat-status fix out first.

## Rafa:

I started the plan
Do whole plan

note: about chat -> done, it has been a regression, I always could `mark done` chats before previous threads done, fold in or do a loom_quick_ship, you pick

## AI:

Whole plan done — all 5 steps ✅, plan auto-closed to `done`. Build clean, full suite green.

- **1 · App `weave*`→`create*`** — `git mv` the three use-case files + exports + `Input`/`Deps` types; swept every call site (app re-exports, 6 sibling app files, 5 MCP tools, the CLI, 9 tests). Helper exports `parentDesignVersion`/`parentIdeaVersion` kept their names.
- **2 · Prompts `weave-*`→`generate-*`** (decision a) — files renamed, `name:` fields, `server.ts`, the read-surface test, and both refs.
- **3 · Extension labels →`Create *`** — six `package.json` titles + welcome/walkthrough/README; command ids were already `create*`.
- **4 · Chat `done` regression** — restored `done` to `ChatStatus` + `VALID_STATUSES.chat` (free label flip); extended `set-status.test.ts`. You can `mark done` chats again.
- **5 · Verify** — `build-all` + `test-all` green; grep guards confirm zero old names in source (`dist` hits regenerate on build).

Two notes: (a) the running MCP server in *this* session still lists the old `weave-*` prompt names until a session/MCP restart — source and built dist are correct. (b) I didn't commit (you didn't ask); the tree has the full refactor staged-and-unstaged. Say the word and I'll commit it.

Next: commit, or reload the extension / restart MCP to see the renamed prompts + `Create` labels live?

## AI:

Committing to `main`: the full verb-consistency refactor (app `create*`, `generate-*` prompts, `Create` extension labels), the chat-`done` regression fix, and this thread's new docs (idea + design + plan-001 + done). Reconnected MCP now serves the renamed `generate-*` prompts.