---
type: chat
id: ch_01KWYT8CP40R463728KHPZ2HMG
title: mcp-read-surface-naming Chat 001
status: done
created: 2026-07-07
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 13
---
# mcp-read-surface-naming Chat 001

## Rafa:

## AI:

Thread **(a)** is live: `core-engine/mcp-read-surface-naming/` with an idea (`Align the MCP read surface to the Slug/Ulid API contract`) that captures all of it — naming parity, slug-in, and ULID-out. It's in `draft` for you to review/finalize. Answering your questions here.

### Do the CLAUDE.md / ctx.md / template thread-resource form need updating again?
**Not the thread form — it's already correct.** `loom://context/thread/{weaveSlug}/{threadSlug}` is both-slugs, which is right, so it won't change again. What *will* update in those docs when (a) renames the code:
- `loom://context/{docId}` → `{docUlid}` (a doc's canonical handle is its ULID)
- prompt args `weaveId` / `threadId` / `planId` → `weaveSlug` / `threadSlug` / `planUlid`
- `mcp-reference.md` §1 accordingly (now covered by doc-sync contract row 3 — done this turn).

### What is the "manifest enhancement"?
Every context bundle opens with a metadata header — the **manifest** — an HTML comment:
```
<!-- loom:context-bundle target=id_01KWW4S1… mode=chat docs=5 tokens~=5109 -->
```
Today it names only the **target doc's id**. The enhancement: also stamp the resolved **`{weave_slug, thread_ulid}`** (and the anchor doc ULIDs) into that header. Then, after one context read, you already hold the thread's write-address — so a following thread-scoped **write** (`quick_ship`, `set_priority`, `do_step`) needs **no second lookup**. That's exactly the extra call I had to make before `quick_ship` earlier. Small change in `assembleContext`; mirrors how the extension already spreads `threadULID` across its tree nodes.

### Listing / checking MCP resources (your visibility gap)
Honest state: Claude CLI `/mcp` surfaces **tools** but not **resources** well — so today your only human-readable map is `mcp-reference.md` §1. The real source of truth is `packages/mcp/src/server.ts` (its `RESOURCES` + `RESOURCE_TEMPLATES` arrays); `mcp-reference.md` mirrors it by hand (which is why I added it to the doc-sync contract, so it can't drift again).

The durable fix: there's a live `loom://catalog` for **tools** but **no equivalent for resources**. We should add a sibling — an auto-generated `loom://` resource catalog — so both you and the agent get a never-drifting list. I flagged that as the open question in the (a) idea; fold it in or spin it out during design.

### Table — MCP resources for reading context
The ones you actually use to load context (from `server.ts`; names shown as they'll read *after* (a)):

| Resource | Params | Returns / use |
|---|---|---|
| `loom://catalog` | — | Grouped index of all `loom_*` **tools**. Read before searching for a tool. |
| `loom://state?shape=summary` | `?shape=summary` | Cheap weave/thread skeleton + status. Session-start orientation (not the full 2 MB graph). |
| `loom://context/{docUlid}` | `?mode=`, `?loaded=id@version,…` | **Primary.** Full bundle for a doc: global/weave ctx + parent chain + requires_load + the doc. |
| `loom://context/thread/{weaveSlug}/{threadSlug}` | `?mode=` | Same bundle, anchored on a thread by **slug** — the human-pointable entry (`loom/{weave}/{thread}/…`). |
| `loom://requires-load/{docUlid}` | — | Just a doc's recursive `requires_load` set, deduped. |
| `loom://docs/{docUlid}` | — | Raw markdown of one doc. |
| `loom://plan/{planUlid}` | — | A plan with steps parsed as JSON. |

`?mode` ∈ `chat｜idea｜design｜plan｜implementing｜refine｜promote｜ctx`. `?loaded=` is the Context-Dispatcher ledger (declare what you already hold; only the delta re-injects).

### Recap of open items (you asked me to flag anything missing)
- **Thread (a)** — idea drafted; next is finalize → design → plan → implement. Scope = naming parity **+** slug-in **+** ULID-out manifest. Your two "pending stuff" bullets are both inside it.
- **Companion (open):** live `loom://` resource catalog for human/agent visibility — decide fold-in vs separate during (a)'s design.
- **`context-load-by-need` thread (old ch-001):** effectively done — its idea was rejected on purpose, and the injection-timing sharpening shipped + committed. It's still `active`; you wanted to decide **archive vs leave as a done record**. That's the one loose end from the old thread.
- Nothing else outstanding that I can see.

Next: want me to move (a) forward — finalize the idea and draft the design — or pause here so you can review the idea first?

## Rafa:

I like and agree all:
- manifest enhancement, this will solve many extra threadULID look ups
- new `loom://` resource catalog
- I renamed `context-load-by-need` thread an plan to `chat-reply-context-injection-load-up-front` and marked all done so now appears in roadmap

### TODO

I marked idea done
1. spin up a thread, idea for `loom://` resource catalog
2. write design + req

## AI:

Both TODOs done — as drafts for your review.

**1. Resource-catalog thread spun up:** `ai-integration/loom-resource-catalog/` with an idea (`A live loom:// resource catalog`). Scope: an auto-generated sibling of `loom://catalog` covering resources (+ prompts), so humans get a live window and `mcp-reference.md` stops drifting. It notes it should land *after/with* this thread so it renders the corrected names. Left in draft.

**2. This thread (a) now has a design + req** — both draft, both grounded in a live audit of `packages/mcp/src`, not guesses. The audit turned up more than expected, so two things need your call before I implement:

**⚠️ Decision 1 — scope widens beyond renaming (recommend: yes).** The prompt *bodies* don't just use `weaveId`/`threadId` as arg names — they emit **stale tool-call instructions**. `weave-plan` literally tells the agent to *"call `loom_create_plan` with `weaveId=` `threadId=` and a `content` body whose Steps table…"* — both the params **and** the create-plan contract are dead (it's `weave_slug` + `thread_ulid` + a structured `steps` array now, no content table). So the read-surface fix must also rewrite those bodies (captured as `IN3`), or the prompts keep actively misleading the agent. This is wider than "naming," hence flagging it.

**⚠️ Decision 2 — it's a breaking change to the prompt interface (`C2`).** Renaming prompt args (`weaveId`→`weaveSlug`, etc.) breaks any caller that invokes a prompt by arg name. I need to audit whether the VS Code extension invokes these prompts before we commit — want me to run that audit as part of this thread's first step?

Everything else is mechanical and in the req: rename resource placeholders (`{docUlid}`, `{weaveSlug}/{threadSlug}`, `{planUlid}`) `IN1`, prompt args `IN2`, the manifest `weave_slug`+`thread_ulid` enhancement `IN4`, slug-in `IN5`, the doc-sync sweep `IN6`, and regression coverage `IN7`. Excluded: weave-ULID, the write surface, the catalog itself, and any shims.

Nothing is finalized or locked — design is `draft`, req is `draft` (not yet `loom_finalize_req`). **Stopping for your review.**

Next: review the design + req; tell me (a) whether `IN3` prompt-body rewrite stays in scope, (b) whether to audit the extension's prompt callers now. Once you finalize the req and say go, I'll draft the plan.

## AI:

You're right, and it's worth naming *why* the gap happened — because the reason is the useful part.

**It wasn't sloppy execution — the audit's scope statement had the blind spot.** `api-contract-refactor` defined its own audit, verbatim, as *"walk every `loom_*` tool and every app use-case."* Resources and prompts are **neither**, so they were never in the frame. The refactor did exactly what it scoped; the scope itself was drawn around the *write* path. The lesson for next time: audit an API **by surface** — write-tools, read-resources, prompts, prompt-bodies, CLI flags, error text — not by "tools + use-cases," which silently omits everything that isn't a tool.

**But let's right-size it so it doesn't feel worse than it is:**
- The gap is entirely on the **read** surface — naming consistency + stale guidance. The *dangerous* class the refactor existed to kill (fabrication / data corruption on writes) **was** fixed and is not part of this gap.
- Within the gap, only one piece is actually harmful: the **prompt bodies misdirecting the agent** (dead params + obsolete `create_plan` contract). The placeholder/arg renames are real but cosmetic-correctness, not risk.

So: a genuine **consistency** gap, one **behavioral** wart, zero **data-integrity** gap. Not a crisis — a finish-the-job.

**And it's no longer "left behind":** the whole read-surface gap is now captured in one thread (idea + design + req). It's tracked, not lurking.

**One more surface to check before we call the accounting complete** — the **CLI** (`packages/cli`). It's a delivery layer that parses flags and calls `app`; if any flag is `--thread-id` meaning a slug, that's the *same* class of drift, and it's outside this MCP thread. I'd rather know now than discover a third gap later. Want me to run a quick audit of the CLI flag names (and a sweep for any surviving `*Id` in tool *descriptions*) so we have the full surface map, then decide whether it's part of this thread or its own?

Next: your call on (a) `IN3` prompt-body scope, (b) auditing the extension's prompt callers, and (c) whether I should also audit the CLI for the same drift.

## Rafa:

Decision 1 — scope widens beyond renaming: yes. (another gap we left behind)
Decision 2 — want me to run that audit as part of this thread's first step? yes
CLI surface - yes, include it, loom behaviour should match all surfaces

### CLAUDE contract

add a hard rule: any API refactor should spread across all surfaces that imply: mcp tools, resources, prompts, cli, etc

### Catalogs

I think we need another one for prompts, correct? if so, fold in with resources catalog

## AI:

All four done. Where things stand:

**✅ CLAUDE hard rule added.** New **API-refactor scope rule** sits beside the API-naming rule: *any* API/naming refactor must sweep every surface in the same change — MCP tools · resources · prompts (arg names **and** body guidance) · CLI · extension call sites — plus reference docs, and must **audit by surface, never by "tools + use-cases"** (the exact framing that caused this whole gap). Repo-specific, no marker.

**✅ Audits done (Decision 2):**
- **Extension** — mostly safe. Its `weaveId`/`threadId` are internal tree-node fields (holding slugs) already mapped to `weave_slug`/`thread_slug` at the tool boundary; it doesn't invoke the `weave-*` prompts by arg name. The prompt-arg rename won't break it.
- **CLI** — the real second gap, captured as its own thread **`cli/cli-surface-naming`** + idea. It has user-facing `[weave-id]` / `<plan-id>` / `<docId>` / `--thread` / `--weave`, internal slug-through-`weaveId` call sites, and `next` calls `do-next-step` with `planId` (breaks when we rename the prompt arg).

**Why CLI is a *sibling* thread, not folded into this one:** the MCP placeholder names have **no external consumers** (clean break is free). The **CLI is a public interface with real users** — renaming `--thread`/`[weave-id]` breaks their scripts. Different consumer, different migration profile (likely deprecated **aliases** for a release, not a hard break). Keeping it separate keeps each thread coherent and shippable. If you'd rather fold it in, say so.

**✅ Prompts catalog** — firmed into the `loom-resource-catalog` idea: prompts are now firmly in scope (tools + resources + prompts = one live catalog), not optional.

**⚠️ New decision the naming reference forced.** Reading `api-naming-reference.md` rule 2: *"a `*Ulid` param accepts the ULID **only** — the old 'ULID or filename stem' dual-accept is retired."* But today `do-next-step`/`loom next` accept a filename stem for convenience, and my (a) design said "keep filename resolution" — that **contradicts the convention**. So a real fork, affecting both (a) and the CLI:
- **(A) Strict per the convention** — `planUlid` accepts ULID only; slug/filename addressing becomes a separate explicit path. Clean, but `loom next my-weave-plan-001` stops working.
- **(B) Keep dual-accept** as a documented, deliberate exception for human ergonomics on the CLI.

I lean **(A)** for the MCP surface (agents have the ULID) and possibly **(B)** as an explicit CLI-only convenience — but it's your call. I've **not** patched the (a) design yet; I'll correct it whichever way you pick.

**The map now:** three tracked threads under one umbrella —
- `core-engine/mcp-read-surface-naming` (this one: resources + prompts + manifest) — design+req drafted
- `cli/cli-surface-naming` — idea drafted
- `ai-integration/loom-resource-catalog` — idea drafted (now incl. prompts)
— plus the CLAUDE rule so this can't recur.

Nothing committed. **Stopping.** Your calls: (1) CLI sibling vs fold, (2) strict-`*Ulid` (A) vs dual-accept (B), (3) finalize this thread's req and move to its plan, or hold. Anything I've missed?

## Rafa:

(1) CLI sibling
(2) strict-`*Ulid` in CLI if command with param-Slug and other command version with param-ULID if needed
(3) I marked design done, locked req

note: i assigned roadmap priorities, commited ir and old thread rename, pushed

write plan

## AI:

Plan written — `plan-001`, 8 steps, dependency-ordered:

1. Resource URI placeholders → `*Ulid`/`*Slug` `IN1`
2. Prompt args → strict `*Ulid`/`*Slug` (`planUlid` ULID-only) `IN2`
3. Lockstep-fix the callers the rename breaks — `loom next` → `planUlid` (⟵2) `C2`
4. Rewrite prompt-body tool-call guidance (⟵2) `IN3`
5. Manifest carries `weave_slug`+`thread_ulid` `IN4`
6. ULID-strict doc/plan forms; slug-in via thread form (⟵1) `IN5`
7. Doc-sync sweep: mcp-reference §1/§3, CLAUDE.md, ctx.md, template (⟵1,2) `IN6`
8. Regression + no-`*Id` guard, build-all, test-all (⟵1,2,5) `IN7`

**Coverage verified:** `loom_verify_req` structural pass is clean — every locked Included item is cited, no Excluded violations, no dangling citations. (The AI semantic pass is unavailable in a CLI session; I've eyeballed it — the citations line up.)

**Two things to note before implementing:**
- **`IN5` wording vs your strict decision.** The plan honors `IN5`'s intent (slug-in) through the **thread form**, and makes the doc/plan forms ULID-strict per decision (2). But the locked req's `IN5` still has a parenthetical saying "verify doc form resolves slugs" — which now contradicts strict. Recommend a one-line `loom_amend_req` to reword `IN5` so the locked scope and the plan don't disagree. Want me to make that amend?
- **Step 3 touches the CLI** (`next.ts`) even though the full CLI rename is the sibling thread — this is the *minimal* lockstep fix so `loom next` doesn't break the instant the prompt arg is renamed. The broad CLI work stays in `cli/cli-surface-naming`.

Plan is `draft` (not started). Nothing committed this turn.

Next: your call — (a) amend `IN5` wording? (b) `loom_start_plan` and begin implementing step 1, or do you want to review the plan first? Note step 8 needs an MCP/session restart after build to verify live.

## Rafa:

### IN5

Context resources can have two versions:
1. ULID for AI internal use
2. Slug for user human point AI to a threadSlug, docSlug. Internally transform Slug -> ULID

I think we already have Slug <-> ULID look ups somewhere

Correct? Agree? tell me

## AI:

Correct on both counts, and I agree — this is the cleaner framing.

**Agree — and it's exactly what naming rule 2 prescribes.** Rule 2: *"if a slug-keyed operation is wanted, it's a separate method/param, never an overloaded second meaning on the same `*_ulid` field."* Your "two versions" = two **explicit forms**, each strict about its own input:
- **ULID form** — `loom://context/{docUlid}` — canonical, AI-internal, ULID only.
- **Slug form** — human-pointable (`{weaveSlug}`, `{threadSlug}`, doc slug) — resolves slug→ULID internally.

That's better than what my plan step 6 encoded (make the doc form strict, route *all* slug-in through the thread form). Two parallel forms is more honest and covers doc-pointing too.

**Yes — the slug↔ULID lookup already exists, we're wiring it, not building it.** `resolveId(state.index, …)` is already called in `context.ts` (`const canonicalId = resolveId(state.index, targetId)`), backed by `buildLinkIndex`'s `slugs` map, and the same graph is exposed as the `loom://link-index` resource. So "slug in → ULID out" is existing machinery.

**This actually dissolves the `IN5` tension — no amend needed.** `IN5` says *"context resources accept slug addressing."* With two forms, the **slug form** provides exactly that, while the **ULID form** stays strict — no contradiction. So the `loom_amend_req` I flagged is unnecessary; only the parenthetical wording was loose, and the substance is now fully met. Good — one fewer edit.

**One shape detail to settle (the only open bit):** the thread slug form exists (`context/thread/{weaveSlug}/{threadSlug}`). A **doc**-slug form needs a defined shape, because a bare doc slug (`idea`, `design`) repeats in every thread — it isn't globally unique. So doc-by-slug likely needs to be path-qualified, e.g. `loom://context/{weaveSlug}/{threadSlug}/{docSlug}`, rather than a bare `{docSlug}`. We can confirm the link index's slug uniqueness during implementation and pick the exact form then.

**Proposed plan refinement:** rewrite step 6 from *"make doc form strict; slug only via thread form"* → *"expose two explicit forms — ULID-strict + a slug form resolved via the existing link index"*, and correspondingly tweak the design's Slug-in section. Drop the `IN5` amend.

Want me to apply that refinement to step 6 + the design? Then we're clean to `start_plan`.

## Rafa:

Yes, do the refinement to step 6 + the design
start plan
do steps 1-6

## AI:

Steps 1–6 done, `build-all` green, and smoke-verified against real data. The bundle header now reads:
`<!-- loom:context-bundle target=de_… weave_slug=core-engine thread_ulid=th_01KWYT7251D3XJXTK68MN9QG18 mode=chat … -->`
and both slug forms resolve (`context/thread/{weaveSlug}/{threadSlug}` and the new `context/{weaveSlug}/{threadSlug}/{docSlug}`).

**What landed:**
- **1** — resource placeholders → `{docUlid}`/`{weaveSlug}`/`{threadSlug}`/`{planUlid}` in `server.ts`.
- **2** — prompt args renamed across all 6 prompts (`weaveSlug`/`threadSlug`, `planUlid`, `designUlid`).
- **3** — CLI `next.ts` passes `{ planUlid }`; audited — it was the only in-repo caller of the renamed prompt arg (the extension uses tools/resources, not these prompts).
- **4** — `weave-idea/design/plan` bodies rewritten to the real contract: snake_case params, `thread_ulid` from the manifest, and `create_plan` = `goal` + structured `steps` array (no Markdown table).
- **5** — `ContextBundle` gained `weaveSlug`/`threadUlid`; `assembleContext` + `serializeBundle` stamp them (touched core + app, since the header is emitted in the app layer, not the resource).
- **6** — two explicit forms: canonical `{docUlid}` + the slug forms, with new `resolveThreadDocBySlug` for doc-by-slug.

**Three judgment calls I made (flagging, not burying):**
1. **`do-next-step` kept its tolerant resolver.** The arg is now `planUlid`, but I did *not* hard-reject filename stems — that would break `loom next <stem>` before the CLI thread lands. Mild rule-2 imperfection; the CLI thread should finish it. 
2. **Canonical form is not hard-strict-ULID.** `loom://context/{docUlid}` still accepts a doc's *own* id — and ctx docs legitimately have slug ids (`loom-ctx`). That's not the slug-vs-ULID overload rule 2 bans (it's a single canonical id), so it stays; the human slug path is the new `{weaveSlug}/{threadSlug}/{docSlug}` form.
3. **Step 5 reached into core + app** (beyond the plan's listed `context.ts`) because the manifest header is emitted there — expected, noted in the done doc.

**Important:** the MCP server running in *this* session is still the pre-build code — my resource/prompt changes are compiled to `dist` but a live `loom_*`/`loom://` call here won't reflect them until an **MCP/session restart** (that's part of step 8).

**Remaining (steps 7–8, outside the authorized 1–6):**
- **7** — doc-sync sweep: `mcp-reference.md`, `CLAUDE.md`, `ctx.md`, template.
- **8** — regression test + no-`*Id` guard, `test-all`, and the MCP restart to verify live.

Nothing committed. Next: want me to continue with 7–8 (and then commit), or review 1–6 first?

## AI:

Steps 7–8 done — **plan complete, all 8 steps ✅**, `build-all` + `test-all` fully green.

**Step 7 (doc sweep):** `mcp-reference.md` §1 (templates → `{docUlid}`/`{planUlid}`, context as two forms + the manifest note) and §3 (prompts table → `planUlid`/`weaveSlug`/`threadSlug`/`designUlid`) — and I fixed two *pre-existing* inaccuracies there: `refine-design` was documented as `weaveId/threadId` but actually takes `designUlid`, and `weave-idea` as `weaveId/title` but takes `weaveSlug/prompt`. Also swept `CLAUDE.md`, `ctx.md`, and the template. Left `loom://state`'s `?weaveId=&threadId=` filter alone — its handler wasn't renamed in this thread, so the doc stays truthful to code (flagged as a small follow-up).

**Step 8 (regression + guard):** new `tests/mcp-read-surface-naming.test.ts` — a guard that no resource-template placeholder or prompt-arg name carries the `*Id` token, plus a regression that the slug thread form resolves and the manifest carries `weave_slug` + `thread_ulid`. Exported `RESOURCE_TEMPLATES` for the guard; updated two existing header assertions to tolerate the new optional fields. The MCP integration test spawns a fresh `loom mcp` on the new dist, so the live surface is verified there.

**One caveat:** the MCP server running in *this* session is still pre-build — new `loom_*`/`loom://` behavior is live for fresh subprocesses (and the next session) but not for my own tool calls here until a restart.

Committing everything now (this thread's docs + the code + the CLAUDE hard rule + the two sibling-thread ideas).

**Umbrella status after this commit:**
- ✅ `core-engine/mcp-read-surface-naming` — done.
- ⏳ `cli/cli-surface-naming` — idea drafted (the bigger, public-facing surface; needs the alias decision).
- ⏳ `ai-integration/loom-resource-catalog` — idea drafted (tools+resources+prompts catalog).
- Small follow-ups noted: `do-next-step` strict-ULID enforcement, and the `loom://state` filter rename.