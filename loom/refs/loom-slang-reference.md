---
type: reference
id: rf_01KX95R2202FGMYCYN64STHSKA
title: Loom slang
status: active
created: 2026-07-11
updated: 2026-07-13
version: 3
tags: []
parent_id: null
requires_load: []
slug: loom-slang
description: "Canonical User→AI verb protocol: the small set of loom words (load, read, reply, do quick, code quick, write quick, do step/steps, do plan, docs done), each with its trigger context and exact tool/command mapping. load is heavy-once and sets the active thread; read/reply are cheap doc-only against it."
---
# Loom slang

A small, canonical set of **loom words** — short verbs the user says to the AI, each mapping **deterministically** to exactly one CLI command / MCP tool / resource, **or a fixed multi-tool sequence**. One word → one known action, so the user never memorizes tool names and the AI never guesses meaning from phrasing.

This doc is the canonical table. It is referenced by the AI session contract (`CLAUDE.md` and the installed `.loom/CLAUDE.md`), so every Loom AI treats these words as canonical.

## What slang is — and isn't

A word earns slang status **only if** it is **(a)** ambiguous English (fires only in a defined context) **or** **(b)** expands to a fixed multi-tool chain. Any capability with a clean, self-naming command gets **no slang** — the command name already tells the user what to say and the AI what to run (e.g. "set status done for {path}" → `loom set-status` / `loom_set_status`). As command names sharpen, the slang set *shrinks*, not grows. Discovery of the full surface is the job of `loom://catalog`, not slang.

## The active thread — `load` once, `read`/`reply` cheap

The pointer verbs split into a **heavy-once `load`** and **cheap doc-only `read`/`reply`**, so a thread's context is paid for **once per session**, never re-bundled every time you point at one of its docs.

- **`load {weaveSlug}/{threadSlug}`** assembles the whole thread bundle (global/weave ctx + idea + design + req + active plan + requires_load) and makes it the **active thread**. This is the only verb that sets or switches the active thread.
- **`read` / `reply`** then act **doc-only** (`?scope=doc`) against that active thread: they pull just the pointed doc, not the surrounding bundle you already hold.

**The active thread lives in the AI's context, not the server.** The MCP server is stateless and cannot hold a pointer — so "active thread" means *the last thread the AI `load`ed this session*, tracked in the AI's own context. Every `load` re-affirms it and the AI emits `🧵 Active: {weaveSlug}/{threadSlug}` so the switch is visible.

Practical rules that fall out of this:

- **Bare filenames resolve inside the active thread.** Once a thread is active, `read design`, `reply chat-005`, `read plan-002` resolve within it — the AI knows where a thread's idea / design / req / plans / dones / chats live. You only need the **full `weaveSlug/threadSlug/docSlug`** at session start or when switching threads.
- **First pointed action of a session implicitly `load`s.** A fresh session has no active thread, so the first `read {path}` / `reply {path}` **loads that path's thread first** (full bundle), then does its read/reply. This is the one friction-free auto-load.
- **`read` never auto-loads after that (never switches).** Mid-session, `read {otherWeave}/{otherThread}/{doc}` is a **pure peek** — it fetches only that doc (doc-only) and does **not** make that thread active. Reading a doc is read-only and consequence-free, so it is allowed across threads.
- **`reply` refuses to cross threads.** `reply {fullPath}` is honored **only if it names the active thread**; pointing it at a non-active thread is **refused with a prompt to `load` that thread first**. Replying writes into a thread's living record and needs that thread's context to be sound — different blast radius from a read, so a stricter rule. To reply into another thread, switch first: `load otherWeave/otherThread, reply chat-001`.

## Execution namespaces: `do {target}` and the `{act} quick` family

Two collision-safe execution families:

- **`do {target}` — plan execution.** `do step`, `do steps`, `do plan` operate on an *active plan's steps*. "do" is never an accidental bare English word, so it is a safe home for execution verbs.
- **`{act} quick` — the quick-fix lane.** `do quick`, `code quick`, `write quick`. The trailing `quick` marks the low-ceremony, **plan-less** lane — a small task driven straight from a chat, with no idea/design/plan ceremony. The **leading verb declares the act that precedes the record**: `do` (nothing — the work is already done), `write` (a docs/prose change), `code` (a source-code change). `do quick` is the pivot the two families share.

`read` and `reply` stand alone because they already live in the natural chat flow — and they **fuse**: reading a chat doc that has an unanswered user turn *implies* `reply`, so pointing the AI at a live chat both loads it and answers it in one word (see the `read` row and the chain below).

## Canonical vocabulary

| Word | Fires when… | Maps to | Kind |
|------|-------------|---------|------|
| `load {weaveSlug}/{threadSlug}` | pointing at a thread — session start, or switching the active thread mid-session | `loom://context/thread/{weaveSlug}/{threadSlug}` — the full thread bundle; sets it as the **active thread** and emits `🧵 Active: {weave}/{thread}`. CLI: `loom context thread <weave>/<thread>` | pointer (sets active thread) |
| `read {docSlug}` *(active thread)* · `read {weaveSlug}/{threadSlug}/{docSlug}` *(full path)* | a doc is pointed at | `loom://context/{weaveSlug}/{threadSlug}/{docSlug}?scope=doc` — **only** that doc, no re-bundle (add `?mode=chat` for a chat). First pointed action of a session `load`s its thread first. **If the target is a chat with a pending user turn, `read` implies `reply`.** | pointer, doc-only (→ chain for a pending chat) |
| `reply` | a chat doc is the active context | `loom_read_chat_tail` → *[compose]* → `loom_append_to_chat` | chain |
| `reply {chatSlug}` *(active thread)* · `reply {weaveSlug}/{threadSlug}/{chatSlug}` *(active thread only)* | a chat is pointed at in the **active** thread | load that chat doc-only (`?scope=doc&mode=chat`) → `loom_read_chat_tail` → *[compose]* → `loom_append_to_chat`. A **full path naming a non-active thread is refused** — prompt to `load` it first. | chain, doc-only |
| `do quick` | you just did some work to record | `loom_quick_ship(...)` — CLI: `loom quick-ship` | pointer to existing command |
| `code quick` | a **source-code** change was agreed in the active chat but not yet applied | *[implement the code change]* → build + test + verify → `loom_quick_ship(...)` | chain |
| `write quick` | a **docs/prose-only** change was agreed but not yet applied | *[implement the docs change]* → `loom_quick_ship(...)` (no build/test) | chain |
| `do step {N}` | an active (implementing) plan | resolve ordinal `N` → step id (`loom_list_plan_steps`) → `loom_do_step` → *[implement]* → `loom_append_done` → `loom_complete_step` | chain |
| `do steps {N,M}` / `do steps {N-Z}` | an active plan | the `do step` chain for each step in the set/range, in dependency order | chain (batch) |
| `do plan` | an active plan | every pending step in dependency order | chain (batch) |
| `docs done` | a thread's authored docs are finished | recipe below (set-status sweep + open-plan guard) | documented recipe |

Outside its trigger context each word is ordinary English and no action fires — that is what lets the vocabulary use real words without hijacking normal conversation.

**Chaining.** Slang words can be **comma-chained** and run in sequence, left to right — e.g. `load weaveA/threadA, reply chat-001` or `code quick, docs done, commit`. Each word still fires only in its own trigger context.

## The chains, explicit

**`load {weaveSlug}/{threadSlug}`** *(sets the active thread)*
```
loom://context/thread/{weaveSlug}/{threadSlug}   → full thread bundle into context
   → mark this thread ACTIVE (AI-held); emit  🧵 Active: {weave}/{thread}
```
Every later `read`/`reply` in this thread is doc-only from here — the bundle is already held, so it is never re-assembled. Switching threads = another `load`.

**`read {path}`** *(pointer, doc-only — but fuses into `reply` for a live chat)*
```
(if no active thread yet — first pointed action of the session)
   load {weaveSlug}/{threadSlug} first          → establish the active thread
loom://context/{weaveSlug}/{threadSlug}/{docSlug}?scope=doc   → ONLY that doc
   ↓ if the target is a CHAT doc AND it has a pending user turn
       (a ## {User}: block after the last ## AI:)
   → read implies reply: continue into the reply chain below
```
With an active thread already set, `read` is doc-only and **never** loads or switches — a `read` of another thread's doc is a pure peek that returns only that doc. Only a chat with an *unanswered* user turn triggers the implied reply; reading a chat whose last turn is already `## AI:`, or any non-chat doc, stays **load-only**.

**`reply`** *(a chat doc is active)*
```
loom_read_chat_tail(id)         → the user's new turns since my last ## AI:
   ↓ [compose the reply]
loom_append_to_chat(id, body)   → write it under ## AI: (body is the text ONLY — no role header)
```
**`reply {chatSlug}`** resolves the chat inside the **active thread**, loads it doc-only, then runs the same chain. **`reply {weaveSlug}/{threadSlug}/{chatSlug}`** is honored only when it names the active thread — a non-active thread is **refused** with a prompt to `load` it first (switch, then reply).

**`code quick`** *(a source-code change agreed in the active chat, not yet applied)*
```
[implement the source-code change we agreed]
build + test + verify           → prove it works
loom_quick_ship(…)              → record the finished change as a one-shot DONE plan
```

**`write quick`** *(a docs/prose-only change agreed in the active chat, not yet applied)*
```
[implement the docs/prose change we agreed]
loom_quick_ship(…)              → record it (no build/test — a read-through is the check)
```

**`do step {N}`** *(active plan; the strongest chain — real work in the middle)*
```
loom_list_plan_steps(plan)      → resolve the visible ordinal N to its stable step id
loom_do_step(plan, N)           → brief: step + thread context
   ↓ [implement: edits, build, test]
loom_append_done(plan, N, …)    → record what was actually done
loom_complete_step(plan, N)     → mark ✅
```
`{N}` is the **visible ordinal** in the plan's Steps table; step identity is a stable kebab-slug, so the ordinal is resolved first.

**`do steps {N,M}` / `do steps {N-Z}` / `do plan`** — the same chain per step, in dependency order.

## `code quick` vs `write quick` — which act is it?

The split is not "which folder" but **what verification the record is owed** — i.e. whether the change needs the build/test/verify cycle before `quick-ship` stamps it done:

- **`write quick`** — the change is **prose/docs only** and **nothing gates it** (project docs, reference docs, README, user guides). No build, no test — reading it is the check. Fast, and it *honestly* claims no build.
- **`code quick`** — the change touches **source code**, **or** a **contract/config file the project's tests gate** (for example an agent-contract file validated by a sync test). Runs the project's build + test + verify, then records.
- **Any source-code touch → `code quick`** — it is the superset: a change editing both code and docs is `code quick`.
- **A test-gated contract file → `code quick`** even when it is "just markdown": if a test can fail on it, the record owes a test run, and `write quick` deliberately skips tests.

The leading verb thus tells the AI whether to run the build/test/verify cycle — the one thing you never want it to guess.

## `docs done` — the recipe

`docs done` is a **documented recipe, not a command** (it is a low-frequency `set-status` chain the agent runs in the open so you can watch it):

1. **Sweep** `set-status done` on the thread's **idea, design, and chats**.
2. **Never touch plans.** Plan status is workflow-owned — a plan reaches done via `close-plan` with all steps complete (`loom_set_status` guards `plan → done`). Naming it `docs done` (not "thread done") avoids implying the whole thread — plans included — is finished.
3. **Leave `req` at `locked`.** A locked req is the thread's perpetual spec; it is excluded from the DONE derivation (same as ctx/reference).
4. **If any plan still has pending steps, stop and report it** ("plan-002 has 3 pending steps — `do plan` first"). Never imply done while work is open.

Result: the thread's *derived* status flips `DONE` only once its plans are already closed (thread DONE = idea + design + plans all done). `docs done` finishes the authored side; only the workflow finishes plans.

## Stop-rule alignment

The step-family slang is a canonical name for an authorization the session contract's stop-rules already define:

- `do step {N}` → single step, then **STOP** and wait for `go` (default stop-rule 1).
- `do steps {range}` / `do plan` → run through **without stopping between steps** (the explicit multi-step-authorization exception) — **but the error-loop and design-decision stop-rules still interrupt**. Each step is still marked ✅ with a done note as it completes.
- `code quick` / `write quick` → run through **implement → record** without stopping between (invoking the composite is the authorization) — **but the error-loop and design-decision stop-rules still interrupt** (they bite hardest on `code quick`, where a build or test can fail mid-run).

## What is NOT slang

- **No single-letter aliases** (`r`, `s`) — a private DSL nobody remembers; they collide with typos and teach a new user nothing. Whole words + the `do {target}` family are self-documenting.
- **No slang for self-naming commands** — create / refine / promote / set-status / rename / archive / roadmap / stale / search / validate all name themselves; the `loom://catalog` covers discovery.
- **No `unload` word.** The AI cannot selectively evict a doc from its context window — only a full session reset (or harness-driven compaction) reclaims it. So the only real lever is *not re-loading*, which the `load`/`read` split already provides: an `unload` verb would promise something it can't deliver. If a session's context fills from many `load`s, start a fresh session — that is the real reset.
- **`docs done` is a recipe, not a CLI command.** It is a rare, agent-mediated `set-status` chain; encoding it as a tri-surface command was weighed and rejected as over-engineering for a once-per-thread op with no extension button. Revisit if usage shows otherwise.