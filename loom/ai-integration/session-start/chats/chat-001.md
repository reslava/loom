---
type: chat
id: ch_01KWD8GXTTGTMP7869G3SD4DJ6
title: session-start Chat
status: done
created: 2026-06-30
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 11
---
# session-start Chat

## Rafa:

When I run Claude CLI in the terminal and ask you for reading a loom chat doc you start the session this way:

```
I'll follow the session-start protocol first, then read the chat doc you pointed me at.

  Read 3 files

📘 loom-ctx loaded — global context ready
🌟 vision + workflow loaded

Now the catalog and active state:

📡 MCP: loom://catalog

● readMcpResource(Read resource "loom://catalog" from server "loom")
{
  "contents": [
    {
… +39 lines

● readMcpResource(Read resource "loom://state?status=active,implementing" from server "loom")
{
  "contents": [
    {
… +14832 lines

🗂️ loom-catalog loaded — tool index ready

The state output was 2.1MB. 
```

When you read the loom://state always mention the size and sometimes also mention is too big

I wonder:
- Why is so big? 
- Maybe we could do a lazy `loom://state?...` load, defering it to when it is needed
- is there a equivalent CLI command for me to check, I tried `loom status` but shows very short info
  
Suggestions?

## AI:

Good questions — I measured it instead of guessing, and the data overturned my first hypothesis (I assumed archives were the culprit; they're 2.4%). Here's the real breakdown.

### Why is it so big?

Filtered `loom://state?status=active,implementing` = **2.02 MB**. Unfiltered = 2.18 MB. So the status filter only shaves **7%** — and that's the key surprise.

Where the 2.02 MB actually goes:

| Part | Size | Share |
|------|------|-------|
| `weaves` (live doc graph) | 1.88 MB | **93%** |
| `archivedWeaves` + `archivedLooseDocs` | ~49 KB | 2.4% |
| `index` | 126 B | ~0% |
| globalDocs / globalChats | <1 KB | ~0% |

Inside `weaves`: 6 weaves but **95 threads, 84 plans, 465 steps**. Each step carries its full `title/description/files_touched/blockedBy/satisfies`. Each of the 95 threads carries `manifest, plans, dones, chats, refDocs, allDocs, stale`.

Two concrete amplifiers:
1. **Pretty-printing.** `JSON.stringify(state, replacer, 2)` — compact weaves = 1.32 MB, pretty = 1.88 MB. **~0.56 MB (28%) is pure indentation whitespace** in a resource no human reads raw.
2. **`allDocs` per thread** looks like it re-lists docs already under `plans`/`dones`/`chats` — redundant fan-out, 95× over.

**Why the filter barely helps:** the `status` filter is *weave-level*, and your active weaves (`core-engine` 42 threads, `vscode-extension` 24, `ai-integration` 24) *are* the big ones — 90 of the 95 threads. Filtering by status can't shrink a graph whose entire bulk lives in the active set. The `content` field IS already stripped (good); the weight is structural metadata, not prose.

So the honest root cause isn't archives or the index — it's an **altitude mismatch**. Session-start needs "the list of active thread IDs" (a few hundred bytes), but the resource hands back the entire derived state graph.

### Lazy load — yes, but the clean fix is shape, not deferral

"Defer until needed" is right in spirit, but at session start we *do* need *something* — just not 2 MB of it. The root-cause fix is a resource that returns the right altitude. Two routes (this is an API-shape decision, so I'll lay out the trade-off and stop rather than pick):

- **A — new lightweight summary shape.** `loom://state?shape=summary` (or a dedicated `loom://active` resource) returning only `{ summary, weaves:[{id,status,threads:[{id,title,status,activePlanId,nextStep}]}] }`. Kilobytes. Session-start switches to it; the full graph stays available for the tree and anything that genuinely needs it. Directly serves the vision's "both always know weaves/threads state" without dragging the whole graph — and it's the cheap reread the "AI as stateful" goal wants.
- **B — trim the existing payload.** Compact JSON (−28% instantly), drop the `allDocs` redundancy, omit archives when a filter is present. Easy, but it treats the symptom (bytes) not the cause (wrong altitude) — still returns all 465 steps to answer "what's active?".

I'd do **A** (optionally folding B's compact-serialization win into the full read too). A removes the reason the read is heavy; B just makes the heavy read lighter.

### CLI equivalent — yes, you have three

You hit bare `loom status` (the short summary). The richer views already exist:
- `loom status --filter status=active|implementing --verbose` (add `--json` for machine output) — the digestible active view.
- `loom resources read "loom://state?status=active,implementing"` — the *exact* raw resource bytes I read, if you want to see what I see.
- `loom roadmap` — the prioritized thread view.

On your reporting request: noted — I'll state the byte size whenever I read `loom://state`, and flag it when it's oversized (which, at ~2 MB, is essentially always until we fix the shape).

This is a design decision (resource API shape), so I'll **stop here** — pick A or B (or "A+B") and I'll write it up as an idea/design in this thread. Want me to scope it against the broader "session-start is expensive" problem, or keep it narrowly to the state-resource shape?

## Rafa:

I understand now.
This makes me going deep...
1. Extension need that state for sure.
2. But in your case, if I always point you to an active chat, or loom doc that define an active thread, you could load that thread state and load other in case needed

Session start should be:
load global context: loom/ctx.md
required reference docs: vision + workflow
loom://catalog
loom://state/{active_thread}

What do you think?

## AI:

Yes — and you've found the actual root, deeper than the byte count. The two consumers have genuinely different needs:

- **Extension/tree** → needs the *whole* graph to render every weave/thread/badge. Full `loom://state` is legitimate there.
- **AI session** → almost never needs breadth. When you point me at a chat or a doc, *that pointer already tells me which thread is active.* I don't need to scan all 6 weaves to *discover* what's active — you just told me. So step 4 of the session-start protocol (read `loom://state` to find active work) is **redundant on every pointed start**, which is most of them.

That reframes session start into **two modes**:

1. **Pointed start (the common case).** You name a chat/doc/thread. → load global ctx + vision/workflow + catalog + *that one thread's* context. **Zero full-state read.** This is exactly your list.
2. **Cold start ("what should I work on?").** No pointer. → *here* I need breadth — but a **summary**, not the 2MB graph. This is where option A (`shape=summary`) or `loom roadmap` earns its place. Breadth only when there's no pointer to scope by.

So the fix is two-pronged: kill the unconditional state read (mode 1), and have a cheap summary for the rare mode 2.

**On `loom://state/{active_thread}` specifically** — one implementation reality before you commit to that URI. We mostly already have the scoped read:

- `loom://context/thread/{weaveId}/{threadId}` already returns a thread's bundled context (idea + design + active plan + requires_load), and `do-next-step` gives the next step. That's the *content* you want for working.
- The `loom://state` resource *already parses* `?weaveId=&threadId=` — but **`threadId` is parsed, validated, then never used** (`state.ts` builds `weaveFilter` from `weaveId`+`status` only; the thread param is dead). So thread-level *state* scoping isn't actually implemented today; `loom://state/{thread}` isn't free — we'd either finish that thread filter or just lean on the existing `context/thread` resource.

So the question that decides the shape: at a pointed start, do you want me to load the thread's **content bundle** (`context/thread` — what I need to *work*) or its **structured state** (statuses, pending steps — what I need to *report* "here's where this thread stands")? For "📋 Session start → next step" I think it's mostly the former plus a tiny status header, both of which `do-next-step` + `context/thread` already cover — meaning mode 1 might need **no new resource at all**, just a protocol rewrite.

Net: I'd revise the session-start protocol to *derive the thread from your pointer and load only that*, fall back to a summary only when there's no pointer. That's the vision's "AI as stateful via cheap rereads" made real — today we pay 2MB to learn one thread ID.

Your call on scope: (a) just rewrite the session-start protocol (mode 1/mode 2, reuse existing resources — likely no code), or (b) also build the `shape=summary` resource for cold start, or (c) also finish the dead `threadId` filter on `loom://state`. I'd start with (a) — it removes the cost with zero new surface — and add (b) only if cold starts prove common. Want me to capture this as the thread's idea?

## Rafa:

I lean (a) reusing already existing `loom://context/thread/{weaveId}/{threadId}` and `do-next-step`

Questions:
- If we finish `loom://state?weaveId=&threadId=` adding threadId filter. Will be different in any way of using `loom://context/thread/{weaveId}/{threadId}`? any added value?
- I do not remember now any cold star (b) case. Usually the user (me) point you some specific task, create a... weave, thread, plan or read chat or reply. 
- But anyway I consider that a kind of `loom://state/?shape=summary` could be very useful in some cases:
  - I ask you to create a new idea, you will need at least a list of weaves/threads to know if the idea fit on any of existing threads or you need to propose the creation of a new one
  - By knowing at leats the list of weaves/threads/states you also will have a vision of the current project. Thi summary should be short and easy to load at session start.

So I think we should do (b) also.

What do you think?

## AI:

Agreed on (a), and you've talked me into (b) too — your idea-placement case is the clincher. Let me answer the two questions precisely, because they sharpen the design.

### Q1 — would finishing `loom://state?threadId=` add anything over `context/thread/...`?

They're genuinely different *kinds* of thing:

- `loom://context/thread/{weave}/{thread}` → the **content bundle**: assembled prose (ctx + idea + design + active plan + requires_load), built *to work from*. Markdown.
- `loom://state?weaveId=&threadId=` → the **structured state**: the Thread entity as JSON (statuses, plan steps, stale flags, blocked steps). Built *to reason about status*.

So for a *pointed start*, finishing the threadId filter adds **no value** — `do-next-step` already hands me the next step + status, and `context/thread` hands me the content. Nothing wants the thread's raw JSON state in isolation. So the clean move isn't to *finish* the dead `threadId` param — it's to **delete it**. It's parsed-and-validated-but-unused today; finishing it speculatively builds a feature with no caller (exactly the half-feature trash we'd want to refine away later). Drop it; if a real consumer for thread-scoped JSON state ever appears, add it then with that consumer in hand.

### Q2/Q3 — summary: yes, and it's not a "cold-start fallback," it's a first-class orientation read

Your idea-placement example reframes it. "Does this new idea fit an existing thread, or is it a new one?" is **not a rare cold start** — it's a routine operation, and it *needs breadth by nature* (you can't place something without seeing the map). Same for "give me a sense of the project." So the summary isn't the mode-2 exception I framed earlier — it's the thing that should **replace the step-4 full-state read outright**: load a few-KB skeleton *always*, get orientation + placement ability for free, and let the *pointer* scope the deep load.

That collapses my earlier two-mode split into one clean path:

```
1. global ctx (loom/ctx.md)
2. vision + workflow
3. loom://catalog
4. loom://state?shape=summary        ← always; the cheap map (replaces the 2MB read)
5. if pointed at a thread → do-next-step / context/thread   ← the deep, scoped load
```

**What goes in `shape=summary`** (the one real design decision here) — the skeleton + status, never bodies:

- top-level `summary` counts (totalWeaves, totalPlans, stalePlans, blockedSteps) — cheap, high orientation value
- per **weave**: `id`, `status`
- per **thread**: `id`, `title`, `status`, `priority`, `activePlanId`, `pendingStepCount`, `stale` (bool)

That's it — no steps, no docs, no content. Ballpark for your repo (95 threads × ~120 B) ≈ **10–15 KB** vs 2 MB. `activePlanId` + `pendingStepCount` are the high-value extras: they let me jump straight to `do-next-step` and let you eyeball "where's the work" without opening a plan.

Implementation-wise it's a **projection of the state we already compute** (the cache holds full state; summary is a cheap map-over), so it's not a second load path.

I think we're converged: **delete the dead `threadId` param, add `loom://state?shape=summary`, rewrite the session-start protocol to the 5-step path above.** Shall I capture that as this thread's idea (`loom_create_idea` in `loom/ai-integration/session-start/`)? I'd write it with those three as the success criteria.

## Rafa:

Yes, capture idea, write design if needed, write plan

## AI:

Captured the thread:

- **Idea** — `session-start-idea.md` (id `id_01KWDB80YJ`): cheap, scoped session start; the three success criteria.
- **Design** — `session-start-design.md` (id `de_01KWDB8SRZ`): the three changes (delete dead param · `shape=summary` projection + field set · protocol rewrite), with the open sub-decision flagged — projection in `state.ts` vs a testable `core/toStateSummary` helper (I lean `core`).
- **Plan** — `plans/session-start-plan-001.md` (id `pl_01KWDB9R8X`), 5 steps with dependency edges wired: 3→2, 4→3, 5→2.

1. Delete dead `threadId` param
2. Add pure `toStateSummary` helper in `core` + unit test
3. Wire `shape=summary` into `loom://state` (compact) + integration assertion
4. Rewrite session-start protocol in both CLAUDE.md surfaces
5. (optional) `loom status` renders from the same projection

All three docs are `status: draft`. Two small things for you: (a) the plan defaulted to `target_version: 0.1.0` — set the real target when you finalize; (b) finalize idea/design/plan (`loom_finalize_doc`) and `loom_start_plan` when you're ready to implement. Say `go` and I'll start at step 1.

## Rafa:

I did: docs marked done, plan started
Do whole plan

## AI:

Whole plan done — all 5 steps ✅, build clean, full suite green (18 MCP integration tests + the new `state-summary` unit test).

**The headline:** the session-start read went from **2.04 MB → 16.8 KB — 121× smaller**.

What shipped:
1. Deleted the dead `threadId` param from the state resource.
2. New pure `toStateSummary(state)` in `core` (+ unit test): weave/thread skeleton + status, `activePlanId`, `pendingStepCount`, `stale` — no step bodies, no doc content.
3. `loom://state?shape=summary` serves it (compact; still cache-backed for the unfiltered hot path) + an integration assertion that it's small and leaks no step fields.
4. Session-start protocol rewritten in **both** CLAUDE.md surfaces: step 4 is now `loom://state?shape=summary` (always — the cheap map), step 5 loads only the *pointed* thread deeply via `do-next-step`/`context/thread`. `claude-md-sync` stays green.
5. Bonus you asked for: `loom status` now renders that same map — each weave with its threads, status, `▶ N pending`, and a `stale` flag. That's the fix for your "loom status shows very short info" gripe.

Two notes:
- The working tree is dirty (8 files across `packages/core`, `packages/mcp`, `packages/cli`, `packages/app`, `CLAUDE.md`, `scripts/`, `tests/`, plus this thread's docs). I have **not** committed — say the word and I'll commit it all as one change.
- The new protocol only takes effect for *my* sessions after you reload; it's already the documented contract. This very session, ironically, still did the old 2 MB read at start — next session it won't.

Next: commit? (and if you want, I can set the plan's real `target_version` before then — it defaulted to `0.1.0`).

## Rafa:

Loom is becoming a very refined AI tool, thanks for you invaluable help!
I already setup `target_version`
commit

## AI:

Thank you — that means a lot. And this thread was a good example of why the doc-driven loop earns its keep: a throwaway "why is this 2 MB?" question became a measured root-cause, a captured idea/design/plan, and a 121× win, all traceable. Committing everything now — the code, both CLAUDE.md surfaces, the tests, and this thread's docs — as one change.