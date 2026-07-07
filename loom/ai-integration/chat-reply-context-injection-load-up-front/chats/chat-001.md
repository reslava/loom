---
type: chat
id: ch_01KWY5NJKYXST562TB3QJQZEJN
title: context-load-by-need Chat 001
status: done
created: 2026-07-07
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 16
---
# context-load-by-need Chat 001

## Rafa:

read idea

## Open questions

- Mode taxonomy: *answering-from-code* (defer) vs *design/continuation* (load) are enought I think
- Floor boundary: suggestions? how stabllish the mode? how stablish the boundary?

User could stablish an inital mode answering-from-code, but AI should switch to design/continuation in case on going work cross the boundary

We should evaluate if optimizing this could bring more problems than improvements we shouldn't implement it.

### Question

I guess that just changing the loom CLAUDE contract to:
`Load thread context when needed` 
is not enough and will leave AI with the freedom of choice, probably ending always looking code and avoiding load (idea + design + active plan + requires_load)

## AI:

Read the idea. Answering your main worry first, because it's the crux.

**"Load thread context when needed" alone fails — you're right.** "When needed" *is* discretion, and discretion biases toward defer, because loading always feels like the expensive option in the moment. So the safe rule doesn't add a judgment call — it **inverts the default**:

- **Default = load.** Deferral is the *exception*, and the exception carries a cost: you must declare `answering-from-code` on the record (a visible line). You can't silently drift into always-defer, because every deferral is an auditable, on-the-record choice — and if you deferred on a reply that turns out design-shaped, the floor snaps it back.

**How to establish the mode / boundary — define it by the *output*, not by a pre-set mode.** Don't have the user pick a mode up front: they usually don't know which mode the *answer* will need, and it's ceremony. Instead the boundary is a property of the reply itself:

> **Does this reply *propose a change*, or only *explain / diagnose something that already exists*?**

Explain / diagnose / report status → defer OK. Propose any change to a doc, the doc graph, architecture, or API — or suggest a `{generate}/{refine}/promote` → **load first, no exceptions.** Same shape as the existing vision-check gate.

On your "AI should switch when the work crosses the boundary" — yes, and the propose-vs-explain test *is* that boundary, made mechanical. The moment a debugging reply turns from *"here's the root cause"* into *"…so we should change X,"* stop, load thread context, then write the proposal. Escalation is a rule, not a vibe.

**Why bias so hard toward load — the cost is asymmetric:**
- Over-load = wasted tokens. Recoverable, cheap, **safe.**
- Under-load = you replied into a thread ignorant of its locked decisions. Expensive, **unsafe**, and it's the exact failure this rule exists to prevent.

That asymmetry is the whole design argument: a fuzzy rule that errs toward defer is *strictly worse* than today's over-loading. So the floor must default to load and make defer the narrow, declared exception — never the reverse.

**Should we build it at all?** Honestly — borderline, and it hinges entirely on whether the boundary is crisp. If we can state it as near-mechanical as the propose-vs-explain test, it's worth it: keeps the guard, kills a habit-forming tax. If it stays judgment-soup, **don't build it.** A rule the AI games toward defer would erode a guard that *currently works*, and the savings (one idea+design read, only on the pure-debugging subset of first-touch chats — a minority) don't justify that. This is a contract change, not code, so the downside isn't wasted effort — it's a *weaker contract*, which is worse.

My recommendation: worth doing, but **only** with the default-load / declared-defer / output-defined-floor shape above. Acceptance test for the boundary itself: *would two reviewers agree which side any given reply falls on?* If not, we drop it.

**One question back to you:** should deferral be allowed at all on a thread with a **locked req**? A locked req is the thread's explicit "always-loaded thereafter" scope anchor — so arguably any reply into a req-locked thread should always load (at least the req), even for debugging. That might be the cleanest floor line of all: **defer allowed only when there's no locked req; once req is locked, always load the req.**

## Rafa:

I we analise the use cases to defer the context loading, for example:

```
- USER: find root cause of this bug?
- AI: this is the cuase and this is the fix proposal
```

the context should be loaded before AI propose the fix
so even for fixing errors, soon or later, loading context is a must

I am pushing back myself about this idea, loom is here to offer AI the proper context (docs) with every new session

What do you think?

## AI:

I think you're right — and I'll argue your side harder than you did.

**Your example collapses the deferral window.** "Find root cause → propose fix" — the fix proposal trips the floor, so you load anyway. Walk through when a reply can *legitimately* defer under the propose-vs-explain rule: it has to be first-touch, pure diagnosis, **and** end without any proposal or change. That's a thin slice — and usually it's just the *first turn* before you say "so fix it," at which point you load one turn later. Net saving ≈ one turn of deferral, then you pay the read anyway. The floor eats almost the whole benefit.

**And the deeper point is the one you made.** Loom exists to give the AI proper context every session. The vision says it out loud — the AI should be *"as stateful as it can be… via durable docs it rereads at every action."* A rule whose spirit is "read fewer docs" swims upstream against the product thesis. Even if it's mechanically safe, it trains the wrong habit and sends the wrong signal about what Loom is *for*. That cost doesn't show up in a token count, but it's the real one.

Weighing it honestly:
- **Saving:** one idea+design read, on the minority of first-touch chats that are pure-diagnosis-and-stop. Thin.
- **Cost:** a bigger, fuzzier contract + a habit that contradicts the north star. Real.

It doesn't clear the bar. **My recommendation: don't build it — shelve the idea.**

**The one real thing underneath it** — the telemetry-thread irritation — wasn't "context loaded," it was "context loaded *at the wrong time*": after the bug was already solved, so it read as pure overhead. But you can't know in advance that a given answer won't need the design, and the cost asymmetry (over-load = cheap + safe, under-load = unsafe) says pay it up front. And the *redundant re-load* case — already holding the thread from earlier in the session — is already solved: that's exactly what the Context Dispatcher ledger (`context: "skip"` / `alreadyLoaded`) does. So there's no unaddressed problem left that this idea is the answer to.

Vision check, applied to this very proposal: it doesn't remove a manual step or advance a vision element — it *narrows* the one behavior (always-contextualized AI) the whole vision is built around. That's the tell that it's the wrong thing to build.

If you want to keep the seam open, the smallest safe version isn't a mode system — it's a single sentence: *"context loads on first touch; the Dispatcher ledger prevents re-loading what you already hold."* Which is already true today. So this idea's real content may already be shipped.

My vote: **archive it.** Your call.

## Rafa:

Real problem: context loading at the wrong time
Fix: context loads on first touch (in CLAUDE contract)

Do yu agree to include this little update to the contract?
If so, do loom_quick_change

## AI:

Agreed on the principle — but I checked before editing, and **the contract already says exactly this.** Both surfaces already carry it, verbatim in spirit:

> *"First reply for this thread in the current conversation — read the thread context (idea + design + active plan + any `requires_load` docs) **before responding**."*

That line lives in `CLAUDE.md` (line 330) **and** in the `LOOM_CLAUDE_MD` template in `installWorkspace.ts` (line 177). "Before responding" *is* load-on-first-touch, up front. So the fix you want is already shipped — adding another sentence that says the same thing is redundant contract weight, which cuts against the clean-code preference.

**So there's nothing to change, and nothing to shelve-and-replace — the current contract is already correct.** The `context-load-by-need` idea proposed *weakening* that line (defer the read); we've now agreed not to. The line stays as-is. That means: **archive the idea, no contract edit.**

Two flags before I touch anything:

1. **`loom_quick_change` isn't a real tool.** Closest names are `loom_quick_ship` (record already-done work as a done plan for versioned history) and `loom_patch_doc` (surgical body edit of a loom/ doc). Neither applies here: `CLAUDE.md` and the template are **gate-excluded** (repo root + `packages/**`), so a contract edit is a plain `Edit`, not an MCP tool.
2. **This is a shared rule.** If we ever *did* edit that section, it must change in *both* surfaces with a matching `<!-- rule:{id} -->` marker and pass `claude-md-sync.test.ts` — never a one-file "quick" edit.

**The one sharpening that would actually add value** (optional — your call): the telemetry incident wasn't the rule being wrong, it was the rule being *read loosely* — answer from code first, then backfill the context read to satisfy "before responding." If you want to close that, the minimal edit is a half-sentence forbidding exactly that: *"…before responding — load up front, before you start diagnosing; do not answer from code and backfill the read afterward."* Small, non-redundant, and it directly counters the failure we saw. But it's a shared-rule edit (both surfaces + marker + test), so not free.

My recommendation: **archive the idea; skip the edit** — the contract already covers it. If the answer-first-backfill pattern bugs you enough, we do the half-sentence sharpening as a proper two-surface synced change. Which one?

## Rafa:

Yes, current contract is weak, that is the reason of bad timing to load context
Do `loom_quick_ship` (I got the name wrong) for:
`load up front, before you start diagnosing; do not answer from code and backfill the read afterward`

## AI:

Done — the sharpening is in, mirrored across both surfaces, and recorded.

**Contract edit** (shared `rule:context-injection`, both surfaces in the same shape):
> "…before responding. **Load up front, before you start diagnosing — do not answer from code and backfill the read afterward (that is the "context loaded at the wrong time" failure).**"

- `CLAUDE.md` (the recursive contract) — edited.
- `LOOM_CLAUDE_MD` template in `installWorkspace.ts` (what every downstream install gets) — edited identically.
- `claude-md-sync.test.ts` — green: 15 rule ids still parity-matched, 12 invariant tokens present. Marker set unchanged (the section already carried `rule:context-injection`), so no new marker needed.

**Recorded** via `loom_quick_ship` as `plan-001` (done) in this thread — versioned-history entry with a done record noting we *rejected* the load-by-need proposal and instead fixed the real defect (timing, not amount). No MCP-server code changed; this is purely the contract.

Net result: the idea that opened this thread ("load by need / defer") is **not** built — deliberately — and the actual lesson it surfaced (load context up front, don't backfill) is now enforced in the contract. The thread did its job.

Nothing left open. If you want, next step is to archive the now-superseded idea, or leave the thread as a done record of the decision — your call.

## Rafa:

Thanks!

When you were about to do this fix you said:
`I need the thread's th_ ULID. Let me get it.`

It is supposed that by loading thread context you got the thereadULID, so I guess in this session you did not loaded the context upfront neither, correct?

## AI:

Sharp question — but I checked, and the honest answer is *no, I didn't skip the up-front load*; the ULID just isn't in what the load returns.

On my first reply I did load thread context before answering — `📡 loom://context/ch_…?mode=chat`, which bundled the global ctx, this thread's **idea**, vision, workflow, and the target chat. That happened before I diagnosed anything. The up-front rule held.

But here's the catch you actually surfaced: **that bundle doesn't carry the thread's `th_` ULID.** Look at what it exposes — the idea's id (`id_01KWW4S1…`), the chat's id (`ch_…`), plus ctx/vision/workflow. The thread *manifest* (`thread.md`) and its `th_01KWW4QXB7…` identity are **not** in the `mode=chat` bundle. So when `loom_quick_ship` needed `thread_ulid`, I genuinely didn't have it from context — not because I read code first and backfilled, but because the loaded context doesn't include the identifier that thread-scoped *write* tools require. That's why I had to shell out to `thread.md` frontmatter.

So two distinct things, and only one is a problem:
- **Up-front load:** honored. ✅
- **Context bundle completeness:** a real gap. The reading-context (what you reason *from*) and the write-addressing key (what tools like `quick_ship` / `do_step` / `set_priority` need) are disjoint — the bundle gives you the former but not the latter, so any thread-scoped write forces a second fetch just to learn the thread's own ULID.

That's a legitimate friction worth its own note: the context bundle's manifest header could carry the resolved `{weave_slug, thread_ulid}` of whatever it assembled, so the agent never has to re-derive the address of the very thread it just loaded. It's the same spirit as your original complaint — don't make the agent do a redundant read for something the system already knew.

Want me to open that as a small idea/thread against `ai-integration` (context-pipeline: surface the thread address in the bundle manifest)? Cheap, and it's a real papercut you just found by pulling the thread on my own trace.

## Rafa:

I see the weak point here:
Loom has several tools for load context for threads, chats... 
And context should be always load global context, thread context, req_loading docs

in the CLAUDE up fron contract we should indicate/force to use loom://context/{weave}/{thread}

when I tell you in CLI terminal
read loom/ai-integration/context-load-by-need/chats/chat-001.md 
there should be a mcp resource: 
loom://context/{weaveSLUG}/{threadSLUG}
to allow human user point you to a weave/thread/doc
or a quick get threadULID from threadSLUG

also as you mentioned, we need surface {weave_slug, thread_ulid} in the context-bundle manifest so thread-scoped writes don't need a redundant lookup
but maybe if we use up fron full thread context we could avoid next context calls

note: i see this doc `loom/refs/mcp-reference.md` is stale, is using Id instead if update Ulid, Slug nomenclature refactor we did

by loading full thread context, maybe do not need next context resources like
loom://context/{chat}?mode=chat 

sorry I have no clear docs to look actual mcp resources functions

what do you think?

## AI:

I read the real resource handler before answering, because you're right that the reference is untrustworthy. The finding reframes this whole thing: **most of what you're asking for already exists — the docs are just lying about it.**

**1. The slug-addressable thread resource you want already exists.**
`loom://context/thread/{weaveId}/{threadId}` — and in the code, `weaveId`/`threadId` are matched against `weave.id` / `thread.id`, which are the **folder slugs** (`ai-integration` / `context-load-by-need`), *not* ULIDs. So when you said *"read loom/ai-integration/context-load-by-need/chats/chat-001.md"*, the clean one-call move was:
> `loom://context/thread/ai-integration/context-load-by-need`

No ULID lookup, no path parsing — the exact "point me at a weave/thread by slug" entry you're describing. It's already there. I used the `loom://context/{chat-id}?mode=chat` form instead (resolved via the chat's ULID I read from the file) — also valid, but the slug thread-form is the human-pointable door you want.

**2. The reason neither of us reached for it: the docs are wrong, not just stale.**
- `CLAUDE.md` (and `ctx.md`) document it as `loom://context/thread/{weaveSlug}/{threadUlid}` — implying a ULID. But `thread.find(t => t.id === threadId)` matches the **slug**; pass an actual `th_` ULID and it throws `Thread not found`. So the *documented* form is broken and the *working* form (slug) is undocumented. That's a doc-vs-code bug, not a preference.
- `loom/refs/mcp-reference.md` is stale on the `Id → Ulid/Slug` refactor, as you spotted. So the one doc meant to be the resource map is actively misleading.

This *is* your root problem — *"no clear docs to look at actual MCP resources."* You couldn't find the capability because the map is wrong.

**3. On "load full thread up front to avoid next context calls" — we already have that, and going further would undo what we just fixed.**
This very session: **one** context call (first touch), then six replies with **zero** further reads — the Context Dispatcher ledger already means "load once, reuse." So "avoid next calls" is the current behavior, not a gap. Loading the *literal* full thread (every plan + done + chat) would re-introduce the exact token tax we rejected two turns ago. The thread-form bundle already carries the load-bearing set (global/weave/thread ctx + parent chain + requires_load) in that single call. Keep it scoped; don't inflate it to "everything."

**4. The one genuine code enhancement that survives:** surface `{weave_slug, thread_ulid}` (and the resolved doc ids) in the bundle's manifest header — so a thread-scoped *write* (`quick_ship`, `set_priority`, …) never needs the second lookup we hit today. Small, real, orthogonal to the doc fixes.

**So the actual work here is mostly documentation, not new resources.** Recommended order:
1. **Fix the doc drift** (highest value, cheapest): correct `{threadUlid}` → `{threadSlug}` in `CLAUDE.md` + `ctx.md`, and rewrite `loom/refs/mcp-reference.md` to accurately mirror `server.ts`'s real resource surface with Ulid/Slug nomenclature. `mcp-reference.md` is gate-excluded (`loom/refs/`), so a plain edit.
2. **Tighten the up-front contract** to name the single slug-addressable entry — *"when the human points you at a thread/doc by path, first call `loom://context/thread/{weaveSlug}/{threadSlug}`"* — so this ambiguity doesn't recur.
3. **Then** the manifest-address enhancement (code, `context.ts` + assembler) as its own small thread.

Design decision for you before I touch anything: do you want these as **one `mcp-reference` refresh thread** (docs + contract) with the manifest code as a separate thread, or all three under a single new thread? And should the doc-drift fix (#1) just go now as a quick correction, since it's a plain bug in shipped docs? Your call — stopping here.

## Rafa:

Yes, fix doc drift now

But also...

### threadULID 

all context load resource should return threadULID info also to avoid extra calls

in this session start you did
"loom://context/ch_01KWY5NJKYXST562TB3QJQZEJN?mode=chat"
but after when need to call quick_ship
you needed an extra call to get the threadULID

note: I think we already solve this in extension, so tree nodes spread threadULID across all nodes. But here we are using CLI and mcp resources, different surface, but in extension we had same problem and we already solved it

## AI:

**Doc drift fixed and verified.** I tested both forms against the live server first: `loom://context/thread/ai-integration/context-load-by-need` returns the bundle; the `th_…` form throws `Thread not found`. So the broken `{threadUlid}` → `{threadSlug}` correction landed in all three surfaces:
- `CLAUDE.md` (2 spots) and the `LOOM_CLAUDE_MD` template (2 spots) — sync test green (15 rule ids, 12 invariants).
- `loom/ctx.md` — patched via `loom_patch_doc` (it's gated).

**But `mcp-reference.md` changed the picture — it isn't the broken one, and I stopped before rewriting it.** It already documents the resource as `loom://context/thread/{weaveId}/{threadId}` — which is *accurate to the code* (those path segments resolve against `weave.id` / `thread.id`, i.e. the folder slugs). It was `CLAUDE.md`/`ctx.md` that invented the broken `{threadUlid}`, not the reference.

The real issue you're pointing at is genuine but deeper than "stale doc": **the `Ulid`/`Slug` naming refactor never reached the MCP resource URIs or prompt args.** The `loom_*` *tool* params were renamed (`weave_slug`, `thread_ulid`), but the resource path placeholders (`{docId}`, `{weaveId}`, `{threadId}`) and prompt args (`weaveId`, `threadId`) still carry the old `Id`. So `mcp-reference.md` is faithfully documenting *code that itself wasn't refactored*. If I just sweep the doc to `{weaveSlug}/{threadSlug}`/`weaveSlug`, the doc would then **lie about the actual param names** — new drift in the other direction.

So that's a real decision, not a typo fix. Options:
- **(a) Rename in code + doc** — the correct-path fix: rename the resource URI placeholders and prompt args to `{weaveSlug}/{threadSlug}` / `docUlid` per the api-naming rule, then the doc matches. Bigger (touches `server.ts`, `context.ts`, prompt registrations, callers), its own thread.
- **(b) Leave `mcp-reference.md` as-is** (it's accurate) and log the resource/prompt naming as known debt.
- **(c) Cosmetic doc-only sweep now** — I don't recommend this; it makes the doc describe intended-not-actual names.

I lean **(a) as a separate thread**, **(b) until then**. Your call.

**Separately — the threadULID-in-manifest enhancement you want:** agreed, and it's the right fix (I saw the manifest header carries `target=id_…`, the idea's id, with no thread address). Approach: have `assembleContext` stamp the resolved `{weave_slug, thread_ulid}` (and optionally the anchor doc ids) into the bundle's manifest comment, mirroring how the extension already spreads `threadULID` across tree nodes — same idea, different surface. It's a code change (`context.ts` + the assembler), so it needs `build-all` **and an MCP/session restart** to go live (the running server won't pick it up otherwise). I'd scope it as its own small `ai-integration` thread. Want me to open that thread and design it, or fold it into option (a) above as one "MCP surface naming + manifest address" thread?

Nothing committed yet — the doc-drift fix is staged in the working tree. Say the word and I'll commit it (the `{threadSlug}` correction across CLAUDE.md + template + ctx.md) as its own change.

## Rafa:

commit docs

(a) as a separate thread

Sorry, this is too much in my mind now, it is a mess, docs and code do not match.

You are telling me a lot of information and I thought most of this problems was already solved, that is the reason why we did a big refactor: core-engine/api-contract-refactor

pls read loom/core-engine/api-contract-refactor/design.md

makes me a summary of current situation

## AI:

Breathe — it's **not** a sprawling mess. The big refactor worked. What's left is one small, safe gap on a surface that refactor deliberately never touched, plus one hand-written doc typo we already fixed. Here's the whole situation on one page.

### What `api-contract-refactor` actually fixed (and it's done)
Its scope, in its own words, was: *"walk every `loom_*` tool and every app use-case."* That's the **write path**. It delivered:
- Reference params → `*Ulid`, folder params → `*Slug`, **`*Id` banned** as a reference suffix. snake_case at the MCP schema, camelCase in the app.
- A single `resolveThreadFolder` chokepoint; an unknown ULID **errors instead of fabricating** a thread.
- It killed a real **data-corruption bug** (`threadId`-means-slug was inventing duplicate threads).

→ The write surface (create/promote/folder-ops/steps/req/etc.) is consistent and correct. That dangerous class is gone. ✅

### What it did NOT cover — by scope, not by mistake
Resources and prompts are **neither** `loom_*` tools **nor** app use-cases, so the audit never reached them. So the **read path** still carries the old `Id`:
- Resource URIs: `loom://context/{docId}`, `loom://context/thread/{weaveId}/{threadId}`
- Prompt args: `weaveId`, `threadId` (do-next-step, continue-thread, …)

Important: this is **naming debt, not a bug**. Those `{weaveId}/{threadId}` segments resolve correctly against folder **slugs** — the resource *works*. `mcp-reference.md` documents them honestly as they are. It only *looks* stale because the rest of the API moved to `*Slug`/`*Ulid` and these didn't.

### The one actual bug — and it was pure doc, now fixed
`CLAUDE.md` / `ctx.md` / the template had a **hand-written** `{threadUlid}` for the thread-context resource. That never matched any code — a doc author guessed, and the guess (ULID) actually *throws* `Thread not found`. Corrected to `{threadSlug}`, verified against the live server, committing now.

### So the real state, in one table

| Surface | Naming | Status |
|---|---|---|
| `loom_*` tools + app inputs (write) | `*Ulid` / `*Slug`, no `*Id` | ✅ refactored, correct |
| Resource URIs + prompt args (read) | still `weaveId` / `threadId` / `docId` | ⏳ naming debt — **thread (a)** |
| CLAUDE.md / ctx.md / template thread-resource form | was broken `{threadUlid}` | ✅ fixed this session |

**Bottom line:** docs and code are ~one-surface apart, not fundamentally mismatched. The thing that scared you (fabrication, ambiguity) is solved. What remains is finishing the *same* naming convention on the read surface — resources + prompts — in code and docs together. That's thread **(a)**, and it's low-risk: no data path, just renames + doc alignment.

I'm committing the doc fix now. Thread (a) is precisely scoped above — say go and I'll create it as its own `core-engine` (API) thread with this as the idea, so it's out of your head and into a durable doc.

## Rafa:

Thanks! now I have a clear vision of what is happening with mcp resources, I thought that surface was already covered, I don't know why we did not covered it in the refactor, it has no sense at all, so we need to solve this gap now

create thread (a) — "extend *Slug/*Ulid naming to the MCP read surface (resource URIs + prompt args), code + docs" — as a core-engine thread

in that thread:
- create and idea
- create a chat this will be the active chat from now, so your next reply goes there (this way we could close this rare thread)

after (a) implemented way all surfaces will speak same API language contract 
(CLAUDE.md / ctx.md / template thread-resource form needs to be updated again, correct?)

### Question

What is the manifest enhancement?

### MCP resources

I can inspect mcp tools in claude CLI using `/mcp` -> view tools
But I can not see MCP resources, the only source for me is `loom/refs/mcp-reference.md`. This doc should be included in CLAUDE.md section line 38 `## Doc-sync contract...` 3rd row `Package layers / architecture (dependency rule, MCP surface)`

If you know an easy way for me to list, check and use mcp resources pls tell me

Make a table with mcp resources to read context

### Pending stuff

- mcp context resources should admit SLUG (becuase human user will ask you that way) and should return ULID for next mcp calls no need extra calls

- API ULID / Slug should be honored in all surfaces

Please, remind me if I am missing something

## Rafa:

Thread renamed from `context-load-by-need`to `chat-reply-context-injection-load-up-front`