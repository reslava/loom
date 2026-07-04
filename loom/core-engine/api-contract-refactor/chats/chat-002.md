---
type: chat
id: ch_01KWNZG3ZF0FZPGM1HZKMJHNG3
title: weave-idea-threadid-fix HANDMADE Chat
status: done
created: 2026-07-04
updated: 2026-07-04
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 13
---
# weave-idea-threadid-fix HANDMADE Chat

## Rafa:

We just implemented this API contract refactor thread except step 10, do-release, becuase I wanted to test it. I package and installed vsix.
Well, I'm very worried, just trying to create this chat using extension the chat end living:
`loom/core-engine/chats/chat-001.md` 
instead in this thread, incredible regression
so I needed to crate this chat manually and assign it a fake ULID

I wonder how many more issues will come
What can you tell me?

## AI:

Found it. Short version: this is a real regression, but it is **one wiring omission at the extension seam — not a flaw in the contract this thread just built.** The refactor's core held: the resolver throws on an unresolvable ULID and never fabricates a thread. Nothing corrupted data this time; a chat just landed in the wrong (but valid) place.

### Root cause

The refactor made the extension address a thread by its `th_` **ULID** (`thread_ulid`). But in `treeProvider.ts`, `threadUlid` is set on **only the thread node** (`createThreadNode` → `thread.manifest?.id`). The older keys `weaveId` and `threadId` (the folder *slug*) are plumbed down to **every descendant node** — the "Chats" section, doc rows, chat rows. `threadUlid` was never threaded down with them.

So when you click **New Chat** from anywhere *inside* the thread except the thread row itself — the Chats section, a doc, an existing chat (the natural places) — the command receives `weaveId="core-engine"` but `threadUlid=undefined`.

### Why it silently lands at weave root

`chatNew.ts` passes `thread_ulid` only `if (threadUlid)`. With it undefined, `loom_create_chat` gets `weave_slug` but no thread. The app's `chatNew` reads "weaveSlug present, threadUlid absent" as a legitimate **weave-root (loose-fiber) chat** → `loom/core-engine/chats/chat-00N.md`. No error is possible there — a weave-root chat is a real thing; the app can't tell "user wanted weave root" from "the UI dropped the ULID." Your two attempts (chat-001, chat-002) both landed there — consistent, reproducible.

### How many more? — the honest answer

Not dozens of unrelated bugs. **One cause, several faces**, because everything downstream reads `node.threadUlid`:

- **Silent misplacement** — `chatNew` (worst: no error, wrong folder). *Confirmed.*
- **False error** — `req` create/verify/finalize/amend and `rename` guard on `node?.threadUlid` and, when it's missing, show *"Thread '…' has no thread.md manifest."* That message is a **lie** — the manifest exists; the node just didn't carry the ULID. Right-click Create Req / Rename on a doc row inside a thread and it will falsely refuse. *Predicted from the same cause; worth a quick test.*
- **Papered over (latent)** — idea/design/plan create route through `ensureThreadUlid`, which, when `threadUlid` is missing, falls back to calling `loom_create_thread`. That "works" only if `create_thread` is idempotent for an existing thread; if it isn't, it's a latent duplicate-manifest risk — ironically the exact bug class this thread killed.

The reassuring read: the API contract is sound and defensive. The leak is entirely at the extension's node-construction layer, which wasn't in this thread's step scope (it was app/MCP/CLI).

### The fix (root-cause, extension-only)

Plumb `threadUlid` down the node subtree exactly like `weaveId`/`threadId` already flow: pass `thread.manifest?.id` through `getThreadChildren` → `createChatsSection` / `createDocumentNode` / `createChatNode` (and ctx/refs). One change; every descendant node then carries the real ULID; `chatNew`, `req`, `rename`, and the `ensureThreadUlid` fast-path all just work — the false "no manifest" errors and the `create_thread` fallback both disappear. Secondary tidy: `chatNew` is the only create command that doesn't go through a resolve helper — worth aligning, but once the ULID is plumbed down it's belt-and-suspenders.

### Decision for you

This is a distinct post-refactor defect. Two ways to take it:
- **(a)** Fold it into this thread as one more step before step 10 (do-release) — it's the same thread's fallout.
- **(b)** Spin a small new thread (e.g. `tree-node-thread-ulid`) since the refactor thread's own scope is done and this is extension-layer.

I lean **(a)** — it's this refactor's tail, small, and belongs with it before you release. I'd also quick-verify the `create_thread` idempotency question while in there. Which do you want, and should I go ahead with the plumbing fix?

## Rafa:

note: the chats landing place are not valid. chats can only live in:
- {weave}/{thread}/chats
- refs/chats
wrongs chats even do not appear in extension

(a)

## AI:

Good correction — that flips part of my read. I said the weave-root landing was "a legitimate loose-fiber chat." It isn't. So there are actually **two** defects, and the second is the more important one:

**Defect 1 (extension):** `threadUlid` is only on the thread node, not plumbed to descendant nodes → New Chat from inside the thread drops the ULID.

**Defect 2 (app contract):** `chatNew` has fallback branches that *create chats at invalid locations*:
- `weaveSlug && !threadUlid` → `loom/{weave}/chats/` — invalid.
- `!weaveSlug` → `loom/chats/` — also not in your valid set.

Those branches are pure failure-modes: the only valid targets are `{weave}/{thread}/chats` and `refs/chats`. The tree has no weave-root "Chats" section anyway — those branches *only ever fire when a ULID got dropped*. So the app silently manufactured an invalid location instead of erroring. That is exactly the sin this whole thread set out to kill: **unresolvable reference → error, never fabricate.** `resolveThreadFolder` throws; `chatNew` should too.

So the clean fix is **both**, and Defect 2 is what would have made this loud instead of silent from day one:

1. **App — `chatNew`:** delete both fallback branches. A chat is either a thread chat (resolve `threadUlid` → `{weave}/{thread}/chats`, throw if unresolvable, same as `resolveThreadFolder`) or a refs chat (`refs/chats`). No weave-root, no bare `loom/chats`.
2. **Extension — `treeProvider`:** plumb `thread.manifest?.id` down the node subtree (`getThreadChildren` → `createChatsSection`/`createDocumentNode`/`createChatNode`) so every descendant carries the real ULID. This also fixes the false "no thread.md manifest" errors on `req`/`rename`, and the `ensureThreadUlid` → `create_thread` fallback.
3. **Regression test:** `create_chat(threadUlid=<existing>)` lands in the thread; `create_chat` with no resolvable thread (non-refs) **throws**.

One thing to confirm before I touch the app branch: the global AI↔Rafa meta-chats — those live in `loom/loom/global/chats/`, i.e. the `loom` weave / `global` thread, so they come through as an ordinary thread chat (`weave_slug="loom"`, `thread_ulid=<global's ULID>`). If that's right, the bare `!weaveSlug → loom/chats` branch is dead too and I delete it. Is `loom/global` the correct home for global chats, or is there a case where a chat must live at bare `loom/chats`?

Going with **(a)** — folding into this thread. Once you confirm the global-chat question, I'll add the fix step(s) to the active plan (before step 10 / do-release) and implement. Holding for that confirm + go.

## AI:

Right — and that clinches it. The tree only renders a "Chats" section at thread level and at `refs/`, never at weave root, so a chat written to `loom/{weave}/chats/` is **orphaned and invisible** — a dead file the UI can't even show you (which is why you had to hand-make one with a fake ULID). That's the strongest possible argument that these fallback branches must not exist: they can *only* produce files that are invalid *and* unrenderable. Erroring at create time (Defect 2 fix) means you'd get a clear failure instead of a silent orphan.

Nothing changes in the plan — it just confirms the fix. Still holding on the one global-chat confirm (is `loom/loom/global/chats/` the sole home for global meta-chats, so the bare `loom/chats` branch is dead too?), then I'll add the step(s) and implement.

## Rafa:

note: I used an online web to generate a valid ULID and I assigned it to this handmade chat doc: `id: ch_01KWNZG3ZF0FZPGM1HZKMJHNG3`

as I told you these are the only 2 canonical places for chats:
- {weave}/{thread}/chats
- refs/chats

this `loom/loom/global/chats/` is just a `loom` weave, `global` thread I created for that purpose with that names, but I could use any other names, that thread is like any other, not part of canonical loom system

`loom/chats` does not exists long time ago

is it all clear?

## AI:

Clear. Locking the model:

- **Exactly two canonical chat homes:** `{weave}/{thread}/chats` and `refs/chats`. Nothing else.
- `loom/loom/global/*` is **not special** — it's an ordinary `loom` weave + `global` thread you happened to name that way, so its chats are just the `{weave}/{thread}/chats` case. No global-chat branch needed.
- `loom/chats` (bare) is dead and gone — delete that branch outright.

One nuance I caught while re-reading the app code, so the fix is precise: the **refs** chat currently relies on that same generic `loom/{weave}/chats` else-branch (the tool sets `weaveSlug="refs"`, so it resolves to `loom/refs/chats`). So Defect 2 isn't "delete the else and always throw" — it's:

1. `weaveSlug && threadUlid` → `resolveThreadFolder` → `{weave}/{thread}/chats` (throw if unresolvable).
2. `weaveSlug === "refs"` (no thread) → `refs/chats`.
3. **anything else** (weave but no thread and not refs; or no weave) → **throw**. That's the branch that was silently minting orphans.

Plus the stale `loom_create_chat` description still says *"requires weaveId + threadId"* — I'll correct it to the ULID/refs contract.

Final scope, folding into this thread (a), inserted **before** step 10 (do-release stays last):
- **Step A (app/mcp):** rewrite `chatNew` branching per above (refs + thread-or-throw); fix the tool description.
- **Step B (extension):** plumb `thread.manifest?.id` down the node subtree so every descendant node carries `threadUlid` — fixes chat create *and* the false `req`/`rename` "no manifest" errors *and* the `ensureThreadUlid` fallback.
- **Step C (test):** regression — `create_chat` by a real `threadUlid` lands in the thread; a non-refs chat with no resolvable thread throws.

Adding these to the plan now. I'll then start on Step A and stop for your go after it (standard per-step gate).

## Rafa:

Do 11-12
Ensure no more stale tools descriptions.

## AI:

Steps 10–12 done, build + full suite green (18/18 + the api-contract test's 6 cases).

**10 — chatNew, two homes or throw.** `refs/chats` or `{weave}/{thread}/chats` (resolve-or-throw); both orphan-producing fallback branches deleted; stale `loom_create_chat` description corrected.

**11 — the root-cause fix.** `getThreadChildren` now recursively stamps the thread's `th_` ULID onto its *entire* node subtree (nested chats/docs included), so any row you fire New Chat / Req / Rename from carries `threadUlid`. One DRY change at the single funnel rather than plumbing a param through six helpers — identity now flows down like `weaveId`/`threadId` always did. This also clears the false "no thread.md manifest" errors on Req/Rename from doc rows.

**Stale-description sweep (your ask).** Sept the whole `loom_*` surface. Two real finds fixed: `loom_generate_req` declared `required: ['weaveId','threadId']` while its properties are `weave_slug`/`thread_ulid` (it required params that don't exist — a latent breakage) → snake_case; and `loom_search_docs` prose "weave id" → "weave slug". Left `stepId`/`orderedStepIds` alone (that's a step's stable frontmatter `id`, not a ULID — and the descriptions say so) and internal locals / output keys (not descriptions).

**12 — regression test.** Extended `tests/api-contract-refactor.test.ts`: thread chat lands in the thread; refs chat in `refs/chats`; a non-refs chat with no/bogus thread throws and creates no `loom/{weave}/chats` or `loom/chats`.

⚠️ **To actually see the extension fix, repackage + reinstall the vsix and Reload Window** — the fix is in `treeProvider.ts`, and the vsix you tested earlier predates it. The MCP description/schema fixes similarly need an MCP restart. Nothing is committed yet.

Only **step 13 (do-release)** remains — that's your `/do-release` call whenever you're ready.

## Rafa:

I checked extension and various commands in other workspace: create chats, move thread, rename, archive, restore... working OK

Next steps:
1. update documentation to reflect this refactor
2. /do-release 1.15.0? in my opinion this is not breaking change because old loom projects will continue using loom without issues, just API functions / params changed
3. pending threads:
   1. core-engine/clean-legacy-read (breaking chage with migration tool, v2.0.0?)
   2. core-engine/layer-imports-guard (just force/check architectue, defer for now)
   3. new idea to make loom friendly for users to give feedback, maybe use some free telemetry option like https://posthog.com/. I saw in github > insights > traffic users are cloning repo. In ovsx, there are 4.3K downloads, but no feedback, so I don't know what is really happening. What do you think? (defer for now)

Taking into account weekly limits I need to plan next steps:
- Do the proposed order
- Do 3.1 before do-release?

What do you think?

## AI:

Great that move/rename/archive/restore all check out in a real workspace — that's the validation that matters.

**Versioning — I agree with you: 1.15.0 (minor), not major.** Your reasoning is the right test. Semver is about the *contract consumers depend on*, and Loom's are forgiving here:
- No on-disk/data migration — every existing `loom/` project keeps loading unchanged.
- The MCP tools are consumed by *agents reading the live schema each session* — they adapt to renamed params/tools, they don't compile against them. A param rename isn't a break the way a library rename is.
- The CLI changes were additive (the `resolve-*` commands, slug-or-ulid ergonomics).
- The only strictly-breaking bits are the two tool *renames* (`loom_rename`→`loom_retitle`, `loom_rename_doc_file`→`loom_rename_reference_file`) and create-into-unknown-thread now erroring — and there are no known external programmatic callers, plus the erroring is a bugfix. Minor is honest.

Reserve **2.0.0 for `clean-legacy-read`** — *that* one is a genuine data-format break with a migration tool. Clean semver story: **1.15.0 = API naming/ergonomics, 2.0.0 = data-format break + migration.**

**Don't do 3.1 before the release — ship 1.15.0 now.** Bundling `clean-legacy-read` in would make the release bigger, riskier, and force a 2.0.0 that buries the finished naming work under an unrelated migration. This refactor is done, tested, and self-contained. Two clean releases beat one muddy one. (And the regression you hit was introduced *by* this refactor — it's not in any shipped version — so there's no urgency pulling other work forward, just no reason to sit on finished work either.)

**Proposed order (matches yours):**
1. **Docs pass** — light, I already sized it: only ~4–5 living docs, most stale tokens are frozen history to leave alone. Cheap; do it now so the release ships accurate docs.
2. **Commit** 10–12 + docs.
3. **`/do-release 1.15.0`**.
4. *Fresh week/budget* → `clean-legacy-read` as its own 2.0.0 thread.

On **weekly limits**: `do-release` is much cheaper than `clean-legacy-read`. Get the finished work out this budget; spend a fresh one on the big migration thread. So: **no**, don't pull 3.1 before release.

**On 3.3 (telemetry) — I'll be straight, since you asked:** you filed it #3-defer, but for your *actual* question — "is anyone getting value?" — it's arguably the highest-leverage item on the whole list. 4.3K ovsx installs + repo clones + **zero feedback** is exactly the building-in-the-dark problem the vision cares about. A lightweight, opt-in, privacy-respecting signal (even a one-click "was this useful?" in the extension, or PostHog opt-in) would tell you more than the next refactor would. It's cheap. When you have budget, I'd rank it *above* another feature thread — not because it builds Loom, but because it tells you whether to keep building it. `layer-imports-guard` (3.2) I agree defers happily — it's internal hygiene with no user signal.

So: my rec is start the **docs pass now**, then you fire `/do-release 1.15.0`. Want me to go on docs? And should I commit 10–12 first (clean base) or fold docs into one commit with them?

## Rafa:

Next steps:
1. Docs pass
2. Commit 10–12 + docs.
3. `/do-release 1.15.0`
4. Spin up ideas:
   1. loom user feedback friendly 
   2. telemetry
5. Do 4.1, 4.2
6. `clean-legacy-read` defered
7. `layer-imports-guard` defered

Agree?
If so, go ahead 1, 2, 3

## AI:

Agreed on the whole plan — ship 1.15.0 now, then spin up the feedback/telemetry ideas (4.1/4.2), defer `clean-legacy-read` (→ 2.0.0) and `layer-imports-guard`.

**1 — Docs pass done** (recorded as plan step 13). Living canonical docs updated to the refactor's vocabulary; frozen history left untouched:
- architecture-reference: `loom_rename`/`loom_rename_doc_file` → `loom_retitle`/`loom_rename_reference_file`.
- loom-requirements-reference: `loom_create_req(weaveId, threadId)` → `(weave_slug, thread_ulid)`.
- README / CLAUDE.md / ctx.md / the `LOOM_CLAUDE_MD` template: `{weaveId}/{threadId}` → `{weaveSlug}/{threadUlid}` (CLAUDE ↔ template kept in lockstep — sync test green); README's phantom `loom://state?threadId=` → `status=`; ctx.md `runEvent(threadId)` → `runEvent(weaveSlug)` (checked against the real signature).

Steps 10–13 all ✅; only step 14 (release) left. `build-all` + `test-all` green.

**2 — Committing** steps 10–13 now as one feature commit.
**3 — Then `/do-release 1.15.0`.** I'll drive the release skill next; it handles changelog + lockstep bump + build/test + tag + push + monitor. Heads-up: after it publishes, the new extension goes to the marketplaces — so this is the real, outward step. I'll report back with the release status.

## AI:

🚀 **v1.15.0 shipped.** npm + VS Code Marketplace + Open VSX all published, GitHub release live: https://github.com/reslava/loom/releases/tag/v1.15.0 — every workflow job green (guard → build-test → publish×3 → release).

On your roadmap-stamp point: it's handled. Sequence run was bump → build/test green → **close the plan** (step 14 done, plan `done`) → `loom record-release 1.15.0` (stamped `actual_release=1.15.0` on `api-contract-refactor`, 98 others already carried a release) → commit `release: v1.15.0` → annotated tag → push. So the roadmap now owns "1.15.0 = api-contract-refactor". The plan is complete (14/14).

Next, per your plan: spin up ideas **4.1 (loom user-feedback friendly)** and **4.2 (telemetry)**, then work them — with `clean-legacy-read` (→2.0.0) and `layer-imports-guard` deferred. Say the word and I'll start the idea for 4.1.