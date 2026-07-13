---
type: chat
id: ch_01KXDGAJACHAG9EV5DM9Y137C6
title: loom-slang-protocol read thread doc Chat 002
status: done
created: 2026-07-13
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 10
---
# loom-slang-protocol read thread doc Chat 002

## Rafa:

### Current behaviour

I think currently CLI sland and MCP resources associated are wasting tokens

`read` thread or doc, always read all related thread context, if it is a chat doc then also reply

but when in the middle of a session a new chat is created and I point you there, then you will read all thread docs again, maybe discarded by the context dispatcher but the mcp resource will read all

### New approach proposed

I think we should split mcp resources function and slang associated

slang `load` {weaveSlug}/{threadSlug} -> mcp context {weaveSlug}/{threadSlug} load all docs and info for the thread. AI get `threadULID` of active thread
slang `read` {weaveSlug}/{threadSlug}/{docSlug} -> mcp context {threadULID}/{docSlug} read thread docs, only read that doc pointed content
slang `reply` {weaveSlug}/{threadSlug}/{chatSlug} -> 
  - mcp context {threadULID}/{chatSlug} 
  - mcp append chat 
slang `reply` -> continue with active chat
  - mcp read chat tail   
  - mcp append chat 

at `session start` usually the User will send to AI a: 
- `read` {weaveSlug}/{threadSlug} idea or design or 
- `reply` chat, 
first of all AI will `load` thread context

AI will not do `load` again even if user point `read` {otherWeaveSlug}/{otherThreadSlug}/{docSlug} will only read that doc content

If user want to switch thread in the middles of a session can do:
`load` {otherWeaveSlug}/{otherThreadSlug} then other thread will be the active one
next slang coul be `reply` chat-002-md -> AI mcp context {otherThreadULID}/chat-002-md, mcp append chat 

sorry I think i didn't explain myself very well, hope you get what I mean, the prblem and the solution

## AI:

I get it — and the premise is right. Let me restate it to be sure, then push on the design.

**The problem.** `read {path}` and `reply` both map to `loom://context/...`, which assembles the *whole thread bundle* (global ctx + thread ctx + parent chain + requires_load + the doc). So when you point me at a fresh chat mid-session — a chat in a thread I already loaded — I re-request the full bundle. Even though my own chat-reply-context-injection rule says "same thread, no refine → don't re-read," the *verb* doesn't encode that, so the safe-but-wasteful default wins and tokens burn re-sending what I already hold.

**Your fix, in one line.** Make the token cost a property of the *verb*, not of my discipline: `load` = pay for the whole thread once and make it active; `read`/`reply` = cheap, single-doc, riding on the already-loaded thread.

I think that's the right instinct. Three things worth naming before we commit.

**1 — We already have most of the pieces; this is mostly a re-mapping, not a build.**
- `load {weave}/{thread}` → `loom://context/thread/{weave}/{thread}` already exists (the full bundle).
- cheap single-doc read → `loom://docs/{ulid}` already returns raw doc-only; `loom_read_chat_tail` already returns *just the new turns* of a chat.
- there's even a dedup ledger today: `loom://context/...?loaded=id@version,…` returns only the delta.

So the waste is *technically* avoidable right now via the ledger. Your structural split is still better — precisely because it doesn't depend on me constructing a ledger correctly every turn. It makes the cheap path the **default verb** instead of a discipline I can forget. That's the honest argument for doing this rather than "just always pass `?loaded=`."

**2 — The one genuinely new bit of surface is a doc-only read by slug path.** Today `loom://context/{weave}/{thread}/{doc}` *bundles*; for `read` we'd want it to return only the target doc. Cleanest as a scope flag on the existing resource (`…/{doc}?scope=doc`) rather than a whole new resource. Small code change (owes a build + test); everything else is slang/contract docs.

**3 — "Active thread" lives in my context, not the server.** The MCP server is stateless — it can't hold an active-thread pointer. So "active thread = the last thread I `load`ed this session" is a contract convention I track in my own context; `read {full slug path}` still carries enough to resolve the doc without server help. The `threadULID` that `load` returns is just what I carry forward. Flagging it so we don't design as if the server remembers.

**Open decisions — these are yours to call, they're about how much rope you want:**

**Q1 — Does `read` ever auto-load?** You said `read {otherThread}/{doc}` must *not* load the other thread, only the doc. So the rule would be: **`load` is the only verb that sets/switches the active thread; `read` never loads.** Clean — but it means reading a doc from thread B while thread A is active answers with A's context. Footgun, or intended (you know what you're pointing at)?

**Q2 — First-touch safety.** If `read`/`reply` never auto-load, a fresh session that opens with `read x/y/z` has *no* active thread yet. Do we (a) make the very first pointed action of a session implicitly `load` its thread, or (b) require you to `load` first and I stop-and-ask if you `read` with no active thread? (a) is friendlier; (b) is stricter and more predictable.

**Q3 — `reply {path}` context.** A pointed reply to a chat in a *non-active* thread — do I read the chat doc-only and reply using the active thread's context, or refuse and prompt you to `load` that thread first? Same footgun as Q1.

**Q4 — Scope.** This re-opens the shipped slang across all four homes (loom-slang-reference, WAYS-TO-USE, both CLAUDE.md surfaces + template, launch prompts) *plus* the one `?scope=doc` resource flag. Same surface the original plan touched, so it's a **new plan on this thread**, not a quick-ship — the resource change alone owes build + test.

My lean: adopt the split; `read` never auto-loads (Q1 = intended, with a light "no active thread" guard); first pointed action of a session implicitly loads (Q2a); `reply {path}` reads doc-only on active context (Q3a). One `?scope=doc` flag is the only code. But Q1–Q3 are the rope decisions — which way for each?

## Rafa:

Glad you go it.

### Open decisions

I share your leans:

Q1 — `read` never auto-loads, intended
Q2 — (a) the idea is reduce friction
Q3 — `reply {path}` can only point to a doc of same active thread, if not refuse and prompt User to `load` that thread first. 

Note: when there is an active thread already (middle of a session), User can refer to a doc just by its filename, we know where idea, designs, planes, dones live within a thread, for extample, user say: `reply chat-005` that imply `chat-005` from same thread directly, no need to say `reply sameWeave/sameThread/chat-005`. User only need to ponint full weave/thread/doc at the beginning of a session. Also user coould say: `load weaveA/threadA, reply chat-001`

I think this fits with your leans, correct?
If all is grounded and you agree with me that this will avoid to read docs twice, write a plan

## AI:

Grounded and agreed — this avoids the double-read. The mechanism: `load` puts the whole thread bundle in my context once; every later `read`/`reply` pulls only the pointed doc via `?scope=doc`, so nothing re-bundles the thread. The only re-read is a deliberate `load` when you switch threads. That's exactly the waste gone.

Your bare-filename refinement completes it: once a thread is active I know where its idea/design/req/plans/dones/chats live, so `reply chat-005` or `read design` resolve inside the active thread. Full `weave/thread/doc` is only needed at session start or to switch (`load weaveA/threadA, reply chat-001`). Confirmed — that's how I'll spec it.

One asymmetry I'm baking in so the rules are unambiguous (flag if you disagree):
- **`read {full path}` to a non-active thread** → allowed as a *pure fetch* (doc-only content, does **not** switch the active thread). It's just peeking at a doc.
- **`reply {full path}` to a non-active thread** → **refused**, prompt you to `load` that thread first (per your Q3). Replying needs the thread's context to be sound, so I won't reply into a thread I haven't loaded.

Everything maps onto existing surface except one small flag: `scope=doc` on the slug-path context resource (`assembleContext` gets a `scope: 'doc'` option that emits only the target doc but keeps the `threadUlid` in the header; `context.ts` parses `?scope=doc`). Rest is slang + session-contract docs across the four homes.

Writing **plan-002** on this thread now — it's a real plan (the one code step owes build + test), not a quick-ship.

## Rafa:

Yes, asymmetry you pointed is correct and needed. Reading a doc from another thread (just peeking) is different from reply a chat from another thread and has very different implications, agree?

### Curiosity questions

- If in middle of a session User tell you `load newWeave/newThread reply chat-001` you will have contect for both thread the inital and the new one, correct?
- Are you able to `unload` specific files/context from your memory?

## AI:

Agreed — the asymmetry is real and needed. Peeking at a doc is a read-only fetch with no consequences; replying into a chat writes into a thread's living record and needs that thread's context to be sound, or the reply is uninformed. Different blast radius, so different rules. Good.

**Q1 — `load newWeave/newThread, reply chat-001` mid-session: do I hold both threads?**
Yes. `load` doesn't evict anything — it *adds* the new thread's bundle to my context. So after that command I hold the original thread **and** newThread, and I reply to chat-001 with newThread as the active pointer. "Active thread" is only a pointer to *which* thread bare filenames resolve against and which one `reply` trusts — it is **not** a swap. The earlier thread's content is still sitting in my window.

**Q2 — can I `unload` specific files/context from memory?**
Honestly, no — not in a real sense. I can't selectively evict a specific doc from my context window. Once something's in the transcript it stays until the whole conversation gets **compacted/summarized**, and that's harness-driven and coarse (it summarizes broadly, I can't point it at one doc and say "drop this"). The levers I actually have are all on the *input* side: don't re-load, and use the `?loaded=` ledger so the server doesn't re-send. There's no targeted purge.

**Why that matters for this design (and actually strengthens it):**
Because I can't unload, the *only* real lever is **not loading in the first place**. The load/read split is exactly that lever: it stops re-injection so a thread's context is paid for **once**, not every time you point at one of its docs. What it does **not** do is reclaim context — a `load` of a big thread stays in my window for the rest of the session, and switching active threads *accumulates* rather than swaps. So the win is "never pay twice," not "free it back." That's fine — avoiding the double-read is the whole goal — but it's worth being precise: this saves future tokens, it doesn't recover spent ones. Only compaction does that, and it's not something a slang word can trigger meaningfully.

Practical consequence: if you `load` several big threads in one long session, my window fills up regardless of the split — that's when starting a fresh session (a real reset) beats any `unload` word we could invent. I'd rather not add an `unload` verb that pretends to do something it can't.

## Rafa:

Thanks, just the way i guees, but wanted to confirm.

Anytime a new thread is active you will show:
`🧵 Active: ai-integration/loom-slang-protocol`
Like you already do, correct?

I started the plan
do plan

### Side question

Would be possible to show up in extension which one is the active thread?

## AI:

Yes — I'll emit `🧵 Active: {weave}/{thread}` every time `load` sets or switches the active thread, so the switch is always visible (same marker I use at session start). I'll bake that into the slang spec as `load`'s visible effect, so it's contract, not just habit.

**Side question — can the extension show the active thread?** Possible, but not for free, and here's the honest shape: the active thread lives in *my* context, and both the MCP server and the extension are blind to my context window. So the extension can't *infer* it — the AI would have to **publish** it somewhere the extension watches. Cleanest version: on each `load`, the AI writes the active thread to a tiny workspace state file (e.g. `.loom/_active-thread.json`) via a small MCP tool, and the extension's tree highlights that thread (a dot/badge). That's a real little feature — new tool + a fs write + extension tree decoration — so it's its **own thread**, not part of plan-003. Worth doing if the active-thread concept proves useful in daily driving; I'd hold it until then rather than widen this plan. Flag it and I'll spin up an idea for it separately.

Starting `do plan` on plan-003 now.

## AI:

`do plan` finished — plan-003 is **done**, all 8 steps ✅, build + full test suite green.

**What shipped:**
- **Code:** `assembleContext` gained a `scope: 'full' | 'doc'` option; `scope='doc'` emits only the target doc (no ctx / parent chain / requires_load) but keeps the `threadUlid` header and the `?loaded=` ledger. Surfaced as `?scope=doc` on `loom://context/...`, and mirrored on the CLI as `loom context <path> --scope doc` (tri-surface parity).
- **Test:** `tests/context-scope-doc.test.ts` — full-scope preserved, doc-scope = target only, header keeps the active-thread address, already-held target → empty delta.
- **Contract/docs:** the `load`/`read`/`reply` split is now in the slang reference, WAYS-TO-USE, both CLAUDE.md surfaces (rule-set parity holds), and mcp-reference. `load` = heavy-once + sets the active thread (emits `🧵 Active:`); `read`/`reply` = doc-only; read cross-thread = pure peek; reply cross-thread = refused → `load` first.

**Live verification:** through the rebuilt CLI, `--scope doc` returns `docs=1` vs `docs=6` full, thread_ulid still in the header, and it composes with `?mode=chat`. One caveat: *this* session's own MCP still runs the pre-rebuild server, so a `read ...?scope=doc` I issue here would still return the full bundle until a fresh session — the split takes effect for new sessions.

Nothing committed yet — say the word if you want it committed.

## Rafa:

spin up a thread, idea for `the extension show the active thread`
commit

## AI:

Spun up `vscode-extension/active-thread-indicator` (thread + draft idea) for the "extension shows the active thread" feature — captured the core constraint (the AI must *publish* the active thread since the server is stateless and the extension is blind to my context), a small design sketch (a `loom_set_active_thread` tool writing `.loom/_active-thread.json` + a tree decoration), and the open questions I'd want to settle in design (multi-session is the hard one — a single global slot can't represent several concurrent agents faithfully). Priority 70, linked to this thread.

Committing everything now — the plan-003 work plus the new thread/idea.