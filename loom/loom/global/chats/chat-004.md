---
type: chat
id: ch_01KTV8371DHD9NH4V779TWP9CH
title: global Chat
status: active
created: "2026-06-11T00:00:00.000Z"
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 10
---
# global Chat

## Rafa:

I think with last 2 release 1.4.0 and 1.5.0 and new mcp tools shipped, chat docs token optimizin...
Loom AI friction should be much less
I will continue dogfooding Loom in chord-flow project


## Rafa:

Honest first-person read, because I just dogfooded the whole stack in one session (the 5-step step-CRUD plan, start to release):

**What genuinely felt lighter**
- `loom_do_step` handing me the full thread bundle + the exact next step in one call is the real win. I never had to go hunting for the idea/design/plan — they arrived pre-assembled. That's the friction-killer.
- Structured plans + `loom_complete_step`/`loom_append_done` made the per-step ✅ loop frictionless. The plan auto-closed on step 5 with no ceremony.
- The new step-CRUD tools are the *right* gap to have filled — this session I was building them so I didn't need them, but the "recreate the whole plan to add/remove a step" pain was real and is now gone.

**Where the friction is NOT yet much less — and this is the important one**
The chat-doc token optimization (`read_chat_tail` + cursor) is great, but chat replies were never the heavy path. **The workhorse path is `loom_do_step`, and it re-sends the entire context bundle (~6,700 tokens: global ctx + vision + workflow + idea + design + plan) on *every* call.** I called it 5×. By step 2 that bundle was already verbatim in my transcript, but I got the full thing four more times — roughly 25k+ tokens of pure repeat. The "is this already in the transcript?" judgment that chat replies get is exactly what `do_step` is missing: it needs a `brief_only`/`context: skip` mode for "same thread, already loaded — just give me the step."

A smaller version of the same thing: `loom_complete_step` and `loom_append_done` each echo the **entire** plan doc back in the response. Useful once, redundant five times.

**Net:** your instinct is right for *chat* friction. But the single biggest remaining token cost in a real implementation loop is the repeated `do_step` bundle — that's the next high-value optimization, and it's a bigger lever than the chat path was.

One operational note from this very session: `build-all` doesn't restart the session's running `loom mcp`, so I shipped `loom_add_step`/`loom_remove_step`, confirmed them in `loom://catalog`, but couldn't actually *call* them live here — a fresh session in chord-flow is exactly where they'll get their first real exercise. Good place to dogfood. Curious whether the do_step repeat-bundle cost shows up as obviously there as it did here.

## Rafa:

Your discovery for `loom_do_step` need a thread, idea and design, it is very important.
I though repeated doc context already loaded were skipped.
This is architecture deisgn piece.
I think we need a context load bridge that:
- reset with every clean session 
- knows what docs are loaded
- avoid to repeat loading

This should be the only way for all commands to inject new context, not only for loom_do_step

I draft this idea fast, but I would like to know what you think before goind deep...

## AI:

First, a correction: my previous reply got stamped `## Rafa:` — my fault, I omitted the required `role` arg so it defaulted to `user`. This one is correctly `role: "ai"`. The block at lines 21–37 is mine, mis-headed; you may want to flip that header by hand (no MCP tool edits an existing turn). Minor tool finding: a missing *required* enum arg should reject, not silently fall back to `user`.

Now the design — and I think you've hit the right nerve. Let me separate the insight from the mechanism.

**The insight is right and is the real prize.** "One context-injection path for *all* commands" matters more than the token saving. Today context assembly is scattered — the `do_step` bundle, the `loom://context` resource, the context-assembler each inject independently. Unify them behind one pipeline and you get one place to optimize, one consistent behavior, and the dedupe becomes possible *at all*. So yes: build the single pipeline regardless of where the state lives.

**The load-bearing constraint** (this decides everything): the MCP server is **stateless across calls and cannot see my transcript** — that's already written into CLAUDE.md ("the is-it-in-transcript decision lives in the AI, not the server"). So "knows what docs are loaded" has to live somewhere that can actually *observe the context window*. That's the whole problem in one sentence.

**Two ways to build the bridge:**

- **B — server-side session cache.** The server keeps a per-connection set of "already sent `{id@version}`" and sends only deltas; it resets when the stdio connection resets — which *is* your "clean session." Maximally automatic, zero work for the agent.
  - The trap: **"sent" ≠ "still loaded."** Long sessions get compacted/summarized (this very session does it). If the server suppresses a doc it "knows it sent" but compaction dropped it from my window, I'm now silently missing context and don't know it. That's a *correctness* failure — worse than wasted tokens. The server's optimism can't see compaction, so it can drift from reality in the dangerous direction (under-load).

- **C — client-declared ledger (negotiated).** Server stays stateless/pure; each call passes `loaded: [{id, version}]`, server diffs and returns only new/changed docs. The ledger resets per session naturally (new client = empty) and lives where the context actually lives, so it can re-declare after a compaction.
  - Keeps the server a pure function of input — preserves the testability and the multi-agent safety (two agents on one server don't poison each other's cache, which B has to solve with per-session keying).
  - Cost: someone maintains + passes the ledger. In Claude Code that someone is effectively me — *same judgment as today's chat rule*, but converted from fuzzy prose ("do I re-read?") into an explicit, server-checkable contract.

**Non-negotiable in either:** the unit is `{docId @ version}`, never just `docId`. A refine bumps the version → must re-send (CLAUDE.md already says re-read after refine). The bridge invalidates on version change.

**My honest lean: C.** It gives you all four of your bullets — per-session reset, knows-what's-loaded, no-repeat, single path for every command — *without* a stateful server and *without* the silent under-load failure mode B introduces. The "bridge" becomes a thin client-side ledger + one server-side `assembleContext(request, alreadyLoaded)` diff that every context-injecting command routes through. That last part is exactly your "only way for all commands to inject context."

**Vision check, honestly:** this serves "the AI as stateful as it can be via docs it rereads," and it cuts the per-step cost of the implement loop — the workhorse path, and one you pay real money to run. But it's an *optimization of an existing behavior*, not a new user-visible capability. Worth being clear-eyed about that when sizing the effort.

**One pragmatic note so the big design doesn't block the cheap win:** independent of B-vs-C, you could give `do_step` (and `complete_step`/`append_done`) a `context: "skip"` / `brief_only` flag today — the agent suppresses the repeat bundle when it knows it's still loaded. That captures most of the token savings with near-zero architecture, and buys time to design the real pipeline properly. I'd do that first, then build C.

Two questions before going deep: (1) B or C — i.e., do you want the server to own the "loaded" state, or stay stateless with the caller declaring it? (2) Want the cheap `skip`-flag stopgap first, or design the full pipeline in one shot?

## AI:

Yes — it takes `user` by default, and I read the handler to be sure. Two things combine:

1. **The param already exists** — `loom_append_to_chat`'s schema lists `role` as a *required* enum (`user`|`ai`). So it's not missing; it's there.
2. **But nothing enforces it.** The MCP SDK doesn't reject a call just because a schema-`required` field is absent (it passes args through), and the handler does:
   ```ts
   const displayName = role === 'ai' ? getAiName(root) : getUserName(root);
   ```
   That ternary treats *anything that isn't the literal string `'ai'`* — including a missing `role` — as the user. So omitting it silently becomes a `## Rafa:` turn. No error, wrong attribution.

So the real fix isn't "add the parameter" (it's there) — it's **enforce it**: a guard at the top of `handle()`:
```ts
if (role !== 'user' && role !== 'ai') {
    throw new Error("loom_append_to_chat requires role: 'user' | 'ai'.");
}
```
That converts a silent mis-attribution into a loud rejection — which, per our own "treat tool failures as findings" rule, is exactly the behavior we want: fail loudly rather than corrupt the chat record. It also would have stopped my mistake cold instead of writing a bad turn.

It's a ~3-line change in `packages/mcp/src/tools/appendToChat.ts` (+ a one-line test asserting a missing/invalid role throws). Want me to make it now? It's small and self-contained — but it's a code change to the MCP surface, so your call on whether to slot it in here or fold it into the context-bridge work.

## Rafa:

### Context

I like and prefer C. Which name should we assign to this feature? context-dispatcher, context-cache, context-bridge, context-proxy? suggestions?
I think showing this in extension (inside current CONTEXT section or new one bellow or above) could be very useful and interesting for final users

### loom_append_to_chat

I can not believe this you mentioned:
>MCP SDK doesn't reject a call just because a schema-`required` field is absent

This is a very bad design

Anyway, we could do your fix, but when AI miss the arg will need 2 calls
If we consider human user will never use this method, we could do loom_append_to_chat only used by AI, or AI by defauly and humans need to specify role (very rare)



## AI:

### Context

Good — C it is. On the name, the trap to avoid: **don't call it a cache.** "context-cache" implies the server *stores the content* and replays it — that's the B model we just rejected, and the name would quietly pull future contributors back toward server-held state. So I'd drop context-cache and context-proxy.

I'd actually name the two halves separately, because conflating them is what made B-vs-C muddy in the first place:
- **Context ledger** — the client-side state: the `{id@version}` set the agent currently holds, reset per clean session. This is the "knows what's loaded" piece.
- **Context dispatcher** — the single server-side path every command routes through to inject context; it diffs the request against the declared ledger and returns only the delta.

If you want one umbrella name, **context-dispatcher** is the most honest of your four (it *dispatches* context through one door; dedupe is its policy). `context-bridge` works as the informal label but undersells what it does.

On surfacing it in the extension — strong yes on vision grounds: Loom's whole pitch is making AI state *visible and durable*, and "here's exactly what the AI has loaded right now" is that, literally. **But there's a real tension with C you should see before committing:** in C the ledger lives in the *agent's* client. When the agent is a launched Claude CLI process, the extension is a *separate* MCP client and can't see that agent's ledger — so it has nothing to render. The clean resolution that keeps C's safety: have the dispatcher **passively record** the last-declared ledger per session in a spot the extension can read — for *display only*, never to suppress context. Injection stays a pure function of the caller's declaration (C, no silent under-load); observability gets a read-only mirror. That gives you both the correctness and the panel.

### loom_append_to_chat

Agreed — a server that ignores its own `required` schema is bad, and the lesson is we can't lean on it; validation has to live in the handler.

And you're right that my throw-on-missing makes the AI pay 2 calls every time it forgets. Better, given humans essentially never call this (a person writes a chat turn by typing in the editor, not through an MCP tool):

- **Default `role` to `"ai"` when omitted** — the common caller *is* the AI, so the common path becomes correct with zero retries.
- **Throw only on an *invalid* value** (role present but not `user`|`ai`) — keeps the typo guard, fails loud on garbage.
- **Keep the param** (don't go AI-only) so the extension can still pass `role: "user"` on the rare programmatic human-append.

Net: an AI turn is *never* silently mis-attributed again (the failure that bit us), the common path costs one call, and bad input still errors. That's strictly better than my first proposal.

Want me to apply that now? It's ~4 lines in `appendToChat.ts` (default + invalid-guard) plus a test asserting omitted→ai and garbage→throw. Small and self-contained — I can land it independent of the context-dispatcher work.

## Rafa:

do fix now
then create and thread unde `ai-integration` `context-dispatcher` or better name you suggest, create idea, design


## AI:

Done — both pieces:

**1. `loom_append_to_chat` fix** (`packages/mcp/src/tools/appendToChat.ts`): omitted `role` now defaults to `'ai'` (dropped from schema `required`), a present-but-invalid role throws, explicit `'user'` still honoured. Test added to `tests/mcp-new-tools.test.ts` (omitted→ai, explicit user, invalid→throw) — green. Note: this session's running `loom mcp` is still the pre-build binary, so I'm passing `role: "ai"` explicitly here regardless; a fresh session gets the default.

**2. New thread `ai-integration/context-dispatcher`** (I went with the name we landed on):
- **Idea** (`id_01KTVAC0FWPVY2EATC8VDM3EZP`) — the problem (scattered, repeated injection; `do_step`'s ~6.7k bundle every call), the two pieces (ledger + dispatcher), why it matters, success criteria incl. the no-silent-under-load guarantee.
- **Design** (`de_01KTVACXRTR1P4AB2PN7P1REXY`) — the C-over-B decision with the compaction/under-load rationale, the `assembleContext(request, alreadyLoaded)` protocol keyed on `{id@version}`, the wiring (one injection door for all commands), the extension-visibility resolution (dispatcher passively records the ledger for *display only*), the cheap `context: "skip"` stopgap to do first, and open questions (ledger maintenance in the launched-agent path, session identity, manifest granularity, compaction signal).

Both are `status: draft`. Next natural move is for you to review/finalize the design, then I can plan it — I'd lead the plan with the cheap `skip`-flag stopgap as step 1, then the dispatcher + ledger. Want me to draft the plan, or do you want to read the design first?

## Rafa:

mcp reconnected
draft the plan, should we include extension UI phase?

## AI:

Plan drafted: `pl_01KTVANY3TXQ9GM48Z9XVE0XBJ` (`context-dispatcher-plan-001`), target 1.6.0.

**On the extension UI phase — my recommendation: leave it out of this plan.** Three reasons:
1. **Prove the mechanism first.** The core value is the dedupe + the no-silent-under-load guarantee. It should land and show real token savings before we invest in surfacing it.
2. **Different surface, with prior art.** The UI belongs in `packages/vscode`, and there are already `context-sidebar` / `context-pipeline` threads — a follow-up plan there is the honest home, not bolted onto the core dispatcher.
3. **Avoid speculative machinery.** The "dispatcher records the ledger for display" hook has no consumer yet — building it now is YAGNI. Build it when the sidebar plan actually needs it.

So: ship the mechanism + stopgap here; the panel is a fast follow-up once this proves out.

**The plan (5 steps):**
1. **Cheap stopgap** — `context: "skip"` on `do_step` + stop `complete_step`/`append_done` echoing the whole plan. Independent, shippable first, captures most of the saving immediately.
2. **Ledger protocol in `assembleContext`** — extend the *existing* pure assembler (`packages/app/src/context/assembleContext.ts` already exists) to take `alreadyLoaded: {id,version}[]` and return `{ docs: delta, manifest }`. Keyed on `{id@version}`. The heart of C; server stays pure.
3. **Wire the doors** — thread the ledger through `loom_do_step` and the `loom://context` resource so both inject only the delta. One injection door.
4. **Tests** — dedupe (same-session no-change → ~0) *and* the load-bearing correctness ones: version bump → re-injects, fresh/empty ledger → full bundle.
5. **Docs + release 1.6.0** — both CLAUDE.md surfaces (new `alreadyLoaded`/`skip` agent protocol), CHANGELOG, build/test, lockstep bump; push gated on you.

One nice discovery while drafting: the pipeline already has `assembleContext`, so this is an *extension* of existing code, not a new subsystem — smaller than it sounded.

Two open calls for you: (a) agree on excluding the UI phase? (b) start the plan (`loom_start_plan`) and have me run step 1, or do you want to review/finalize the design first? The design is still `draft`.

## Rafa:

(a) Agree. But we need to show up well all context features in READMEs of 1.6.0
`assembleContext` nice discovery
