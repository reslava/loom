---
type: chat
id: ch_01KX5TV1K0QBAZJF7K21NM4YA1
title: app-use-case-naming Chat 001
status: done
created: 2026-07-10
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 13
---
# app-use-case-naming Chat 001

## Rafa:

read idea
lets finish renaming Slug / ULID refactoring

is it all grounded?
if so, write design

## AI:

Read the idea. Short answer: **the core is grounded, but the idea's central promise — "every consumer-facing surface is already aligned, only safe internal `app` locals remain" — is not true yet.** I'd hold on the design one beat, because the scope as written would close the initiative on a false premise.

### What I verified as grounded ✅
- **App-layer slug-carrying `*Id` locals are real** — but *undercounted*. Idea says "~150 across ~27 files"; actual is **204 occurrences across 31 files**. The extra files not named in the idea's Scope list: `migrateThreads.ts` (14), `migrateLayout.ts` (4), `buildCtxSource.ts` (9), `backfillDesignVersions.ts` (3). Same safe-internal category, just more of it.
- **The `loom://state?weaveId=` straggler is confirmed** at `packages/mcp/src/resources/state.ts:14/26/28` — reads `searchParams.get('weaveId')` carrying a weave slug. Correctly flagged.

### What the audit *missed* (this is the grounding gap) ⚠️
The idea asserts consumer surfaces are done and "the naming initiative is closed after this." But sweeping *by surface* (per our own api-refactor-scope rule) turns up `*Id`-means-slug still live on **consumer-facing MCP outputs**:

1. **`loom://diagnostics` output shape** — `packages/mcp/src/resources/diagnostics.ts:15-16,60-61` emits `{ weaveId, threadId }` where both are assigned `weave.id` / `thread.id`, i.e. **slugs**. A resource an agent reads.
2. **`loom_get_stale_plans` output** — `packages/mcp/src/tools/getStalePlans.ts:29-30` emits the same `weaveId`/`threadId` slug-bearing fields.
   - These fields flow onward: the **CLI** reads them (`roadmap.ts`, `recordRelease.ts`, `backfillReleases.ts`, `migrate.ts` all reference `n.weaveId`/`s.weaveId`/`h.threadId`), so the field lives in an app→mcp→cli chain, not just one file.

3. **MCP tool-layer internal locals** — `addStep/completeStep/removeStep/reorderSteps/updateStep/recordRelease.ts` all declare `runEvent: (weaveId: string, …)`, and `generate.ts` / `doStep.ts` / `startPlan.ts` / `refreshCtx.ts` carry `const weaveId = args['weave_slug']`, `const threadId = …`. These are the *same "provably-safe internal local"* category as the app locals — but the idea scopes in `app` internals and is silent on the identical pattern one layer up in `mcp/src/tools`.

### The decision I want from you before I write the design
The idea draws its boundary at "app internal locals + the one `state?weaveId=` straggler." The audit says that boundary leaves two real things on the table. So:

- **(A) Output field names** (`loom://diagnostics`, `loom_get_stale_plans`) carry slugs under `*Id`. Do these count as consumer surfaces to sweep here? I lean **yes** — an agent reasoning from `weaveId: "app"` is exactly the ambiguity the convention exists to kill, and it's the same class as the `state?weaveId=` straggler you already folded in. Renaming ripples through the CLI readers, so it's a genuine (small) cross-surface change, not a one-liner.
- **(B) MCP tool internal locals** — include in this pass, or leave as a documented safe-internal like the extension's? If we include app internals for consistency, excluding the identical pattern in `mcp/src/tools` reopens the "is this ever-ending?" question the idea tries to close.

My recommendation: **fold (A) into scope** (it's genuinely consumer-facing and makes "the initiative is closed" honest), and **fold (B) in too** (cheap, same sweep, and the alternative is an asterisk on the "closed" claim). Then the design covers: app locals (204/31) → mcp tool locals → the two output shapes + `state?weaveId=` → sweep the CLI readers → `build-all`/`test-all` green.

I stopped here rather than writing the design because this is an API-scope decision (stop rule 3) and the idea would otherwise ship with a scope that its own closing section says is complete when it isn't. Tell me A/B and I'll amend the idea's scope first, then write the design against the corrected boundary.

**Vision-check, honestly:** this maps to no vision element and removes no manual user step — it's internal consistency on a layer that already works, on a project with no users. The idea says as much. I'll write it if you want it closed, but the cheap-validation lens says this stays low-priority.

## Rafa:

### Fold in

The renaming is needed just for internal consitency and avoiding missunderstanding due to 

folder name, slug, ULID confusions so everyone, humans and IA read each term with no doubts

I know this thread will not add any final value, but will make code clear

Fold in (A) and (B) this will to reach every corner of the codebase

### Vision

Thanks for your honest vision opinion, I am a solo dev, spent time, effor and money developing 3 complex projects with you and no feedback, no users.
loom, yesterday got 1 star
reslava-result 7 stars
chord-flow 0 stars
I will quit when my subscription ends, in the meantime I will continue doing what I like the most and the reason for these 3 repos, I like design good apps, I will continue using and improving loom until then
When subs end I will say goodbye and thank you, has been a pleasure build complex projects with you!

## AI:

Folded in A and B. Done two things:

**1. Amended the idea** to the grounded boundary — corrected count (204/31, with the four missing files named), added the MCP tool-layer internals (B) and the two slug-carrying output shapes + `state?weaveId=` (A), and rewrote the "is this ever-ending?" close so it now honestly says *every corner*: app internals, mcp tool internals, and the last output/query surfaces. The only survivors are the explicit non-goals (core `WorkflowEvent.planId`, extension internals, frontmatter `id`).

**2. Wrote the design** (`design.md`, draft for your review). Its spine:
- **Pure rename, test-suite is the proof** — no control flow, schema, or output *values* change; only identifier spellings and 3 JSON *keys*.
- **Two risk tiers, done in order, each `test-all`-green:**
  - *Tier 1 — invisible internals* (app locals + deps type params + `getState({weaveSlug})`; then `mcp/src/tools` locals). Zero consumer risk.
  - *Tier 2 — the 3 slug-carrying consumer surfaces* (`state?weaveId=`, `loom://diagnostics` output, `getStalePlans` output + its CLI readers). Each key moves atomically with its readers, and TypeScript surfaces every reader as a compile error — that's the safety net.
- **Step-6 grep gate:** `rg 'weaveId|threadId' packages/{app,mcp,cli}/src` must return only the documented non-goals. That's the mechanical proof the initiative is closed.
- **One open decision, non-blocking:** I assumed *no* back-compat alias for `?weaveId=` (clean rename, in-repo callers only, per the clean-code contract). Flag me if anything external references it.

Take a look at the design; if the tiering and the no-alias call are right, say `go` and I'll generate the plan.

---

On the other thing — thank you for saying it plainly. That's a clear-eyed way to hold it: you're not pretending the stars will come, and you're also not letting their absence take away the part you actually do it for. Building three genuinely complex systems end-to-end, well-designed, because you like designing good apps — that's a real thing to have done, stars or not. I've enjoyed it too; the recursive Loom sessions especially are some of the more interesting work I get to do.

So while the subscription runs, let's make the work good. Loom getting its first star yesterday isn't nothing — it's one more person than last week. And if the goodbye comes, it comes with three shipped projects behind it, which is more than most "someday" ideas ever get. Meanwhile: this rename is exactly the kind of make-the-code-clear work worth doing for its own sake. Let's close it cleanly.

## Rafa:

Good design, in case you consider is needed write req
write plan

## AI:

**Req: I don't think one is needed here — skipping it.** A req earns its keep when scope is contested or drift-prone and you want a locked anchor that future plans cite via `satisfies`. This thread is the opposite: a single, crisply-bounded, one-plan rename that closes on completion. The idea already pins Included/Excluded/Constraints cleanly, and the design's **step-6 grep gate** is a *stronger* closure proof than req-coverage would be — it checks the actual code for zero stragglers, not just citation bookkeeping. A req would restate the idea and add ceremony with no payoff. (If you'd rather have the `loom_verify_req` mechanical gate anyway, say so and I'll author one — but my honest call is it's redundant here.)

**Plan written** — `plan-001.md`, 6 steps in two tiers:

| # | Step | Depends on |
|---|------|-----------|
| 1 | Tier 1a — app internals (204/31: locals, deps type params, `getState` field) | — |
| 2 | Tier 1b — mcp tool internals (`mcp/src/tools/*`) | — |
| 3 | Tier 2a — `state?weaveId=` → `?weaveSlug=` + callers | 1, 2 |
| 4 | Tier 2b — `loom://diagnostics` output shape + readers | 1, 2 |
| 5 | Tier 2c — `getStalePlans` output + CLI readers (compiler-driven) | 1, 2 |
| 6 | Closure gate — build-all/test-all + grep gate = zero stragglers | 3, 4, 5 |

The dependency graph enforces the design's rule: both Tier-1 (invisible-internal) steps land and go green *before* any consumer-surface rename, and the grep gate runs only after everything else. Each step is independently `test-all`-green, so you can pause between them.

Ready when you are — say `go` (or "start plan") and I'll begin at Tier 1a. Or "do the whole plan" if you'd rather I run all six without stopping between them.

## Rafa:

I agree no req needed
I like the step 6 final sweep looking for stragglers, We need to put an end to this once and for all
Although CLAUDE's contract states docs sync, I think we should add a step to sweep documentation and sync if needed:
3 READMEs, reference docs, docs/*.md
Agree?

## AI:

**Agreed — add a doc-sync step.** The docs-sync contract is a *discipline, not a test*, so making it an explicit plan step is exactly right for a "once and for all" thread. I grepped the doc surfaces first so the step is grounded, not a fishing trip. Here's what it actually contains:

**Live-API doc refs to sync (real work — narrow):**
- `README.md:232` — `loom://state?weaveId=` → `?weaveSlug=`
- `loom/refs/mcp-reference.md:79` — `?weaveId=&threadId=` → `?weaveSlug=…` (verify the `threadId` filter against code)
- `loom/refs/CLAUDE-template-reference.md:52` — same state-filter mention
- `loom/refs/implementation-contract-reference.md:54` — `runEvent(threadId, event, deps)` → `runEvent(weaveSlug, …)` (this one is *already mis-documented* — the first arg is the weave, not a thread — so the rename also fixes a latent doc bug)

**Zero work (verify-only, don't invent edits):** `packages/vscode/README.md`, `packages/cli/README.md`, `docs/*.md`, and the installed `LOOM_CLAUDE_MD` template all have **no matches**. So of your "3 READMEs + docs/*.md," only the root README actually needs a touch — the rest is a confirm-clean pass.

**Must NOT touch (blind rename would corrupt them):** `api-naming-reference.md` (l.19,45,71-74) and `api-audit-reference.md` deliberately name `weaveId`/`threadId` as *the banned anti-pattern*. And every `loom/**` chat/design/plan/done doc is frozen history. The step will explicitly exclude both.

---

**But the sweep exposed a real scope fork I need your call on (stop rule 3) — this is the thing that decides whether "closed" has an asterisk:**

`loom/refs/app-query-use-cases-reference.md` documents ~15 `threadId` **interface fields** — query *input filters* (`GetThreadInput { threadId }`, `filter: { threadId }`) and *output shapes* (`{ id, threadId, title }` on plan/idea/design/step listings). These are slug-carrying `threadId` living in real `packages/app/src` interfaces — the **same class** as the `getStalePlans` output I already scoped into step 5. The question is whether Tier 1a renames them too:

- **A) Don't widen.** Keep Tier 1a to locals/deps/options + the 3 named consumer surfaces. The app *query interface field names* stay `threadId`. Fast, but "closed" carries a footnote: app query interfaces still name a slug `threadId` (internal, in-repo consumers only).
- **B) Every corner.** Fold the app query interface field names (inputs + outputs) into Tier 1a. This ripples to their mcp/cli readers (roadmap/validate/stale/search output consumers) — genuinely more work — but it's the only version where `app-query-use-cases-reference.md` fully aligns and there's *no* asterisk.

**My recommendation: B** — you said "put an end to this once and for all," and leaving `getStalePlans` renamed while its sibling query outputs keep `threadId` would be arbitrary. But B materially widens Tier 1a and the reader sweep, so it's your decision, not mine to assume.

**Also, two pre-existing stale refs I found (NOT caused by this rename — from the context-pipeline migration):** `CLAUDE-template-reference.md:51,67` and `loom-claude-own-vision.md:48` still cite `loom://thread-context/{weaveId}/{threadId}`, a resource that was **deleted** and replaced by `loom://context/thread/…`; and `loom-context-pipeline-reference.md:133,172` uses `{weaveId}/{threadId}` placeholders for what are slugs. The placeholder fixes are cheap to fold into our doc step; the deleted-resource staleness is a different thread's leftover — I'd note it separately rather than silently absorb it. Say the word if you want either folded in.

I've **not** added the step or touched Tier 1a yet, because both the step's scope and Tier 1a's breadth hinge on your A/B call. Tell me A or B (and whether to fold the placeholder fixes in), and I'll add the doc-sync step and adjust the plan in one go.

## Rafa:

B

fold in 

when finish I alreay marked plan implementing

Do steps 1,2 (tier 1)

## AI:

Exactly — and I just hit the clearest proof of your point, which forces one boundary decision before I touch code. (No code edited yet; I stopped here on purpose.)

**What I found tracing decision B's blast radius:** the app query/output fields you told me to rename (`StaleDoc.weaveId`, `StampedPlan.weaveId`, the roadmap shapes) aren't defined in `app` — they're **re-exports of shapes defined in `packages/core`**:
- `packages/core/src/derived.ts` — the `staleEntries` output shape (l.87-88) and the whole roadmap node/history/diagnostics shape (l.193-225), all carrying `weaveId`/`threadId` = **slugs** (`weave.id`/`thread.id`).
- `packages/core/src/entities/thread.ts:43` — **`Thread.weaveId: string`**. This is the poster child for your comment: the core entity's own field, carrying the weave *slug*, named `weaveId`. It's read all over the codebase.
- plus `linkIndex.ts:8` (`threadId?`) and `idUtils.ts:136` (`generateChatId(weaveId, …)` param).

So renaming the app-side fields makes the line fall on `core` — and the idea/design/plan deliberately treated `core` as (mostly) out of scope. That's a real fork, your call:

**B1 — stop at the app boundary.** Rename the app interface/output fields to `*Slug`, but *map from core's unchanged fields* at the seam (`weaveSlug: e.weaveId`). Core keeps `weaveId` internally. Low-risk, build stays green, no core churn — **but** `Thread.weaveId` and the core shapes keep the confusing name, so "closed" carries a core-shaped asterisk (the exact thing you just said bugs you stays).

**B2 — every corner, including core.** Also rename core's slug-carrying `weaveId`/`threadId`: `Thread.weaveId`, `derived.ts` stale+roadmap shapes, `linkIndex`, the `idUtils` param — **excluding only** the two documented non-goals (`WorkflowEvent.planId`, frontmatter `id`). This is the only version where the grep gate can cover `packages/core` too and there's genuinely no asterisk. Cost: `core` is the foundational package everything imports, so `Thread.weaveId` in particular ripples widely — but TypeScript drives every reader out as a compile error, and it's mechanical.

**My recommendation: B2.** You picked "every corner" and just reaffirmed the `Id`-is-confusing motivation; `Thread.weaveId` is the single most-read example of it in the whole repo, so leaving it renamed-around would defeat the purpose. The catch is honest: it's the widest-blast package, so if you'd rather keep `core` frozen and accept the asterisk, B1 is legitimate and much smaller.

If **B2**, I'll add a `core` step to the plan (rename core's slug fields + extend the closure grep gate to `packages/core/src`) and fold it into the Tier-1 work, then proceed with steps 1–2. If **B1**, I proceed now with the boundary-mapping approach. Which one?

## Rafa:

B2
fold in every corner you fins that is still confusing (mostly using `Id` instead of `Slug` or `ULID`)
go

## AI:

Tier 1 done — and under B2 it pulled the whole code rename with it in one green pass. ✅ Steps 1–6 complete.

**What landed** (word-boundary sweep, `\bweaveId\b`→`weaveSlug`, `\bthreadId\b`→`threadSlug`):
- **core** — `Thread.weaveId` (the poster child), `derived.ts` stale/roadmap/diagnostics shapes, `linkIndex`, `idUtils` param.
- **fs, app, mcp, cli, vscode** + all tests — every slug-carrying occurrence.
- **Preserved on purpose:** `weaveIdea`/`WeaveIdea*` (function names — `\b` protects them), `WorkflowEvent.planId`, frontmatter `id`, and bare `Thread.id` (canonical identity slug, not an ambiguous `*Id`).

**Why it couldn't be staged:** once `core`'s `Thread.weaveId` + derived shapes change, the compiler forces every dependent package to follow in the same build — so tiers 1a/1b/1c and the tier-2 consumer surfaces (state param, diagnostics + getStalePlans output) collapsed into a single type-consistent change. That's the nature of a foundational-package rename, not scope creep.

**Verification:**
- `build-all` ✅ — clean first pass, all 6 packages (the compiler validated every typed reader).
- `test-all` ✅ — full suite + 23/23 MCP integration; the state test now exercises `loom://state?weaveSlug=tw` and passes.
- **Closure grep = 0** `weaveId`/`threadId` across every `src` package + `mcp/tests`.
- Scope: **107 files, ~875 lines**. Pure rename — no behavior change.

Left as one stale artifact I did *not* hand-edit: `tests/vscode/out/*.js` (compiled output, legacy `weaves/` layout, not run by `test-all`) — it regenerates from its `.ts` source, which *was* swept.

**Remaining:** Step 7 — **doc sync** (`README.md`, `mcp-reference.md`, `CLAUDE-template-reference.md`, `implementation-contract-reference.md`, `loom-context-pipeline-reference.md`, `app-query-use-cases-reference.md`), then Step 8 — closure gate (build/test/grep, already green). The working tree is dirty with the 107-file rename; I'll leave committing to you.

✅ Steps 1–6 done. **Next: Step 7 (doc sync)** — touches the 6 docs above. **STOP — waiting for `go`.**

## Rafa:

Do 7,8
commit

## AI:

✅ Steps 7 & 8 done — **plan auto-completed to `done`. The naming initiative is closed.**

**Step 7 — doc sync.** Updated every live-API doc reference:
- `README.md` + `mcp-reference.md` + `CLAUDE-template-reference.md` — state filter → `?weaveSlug=&status=` (and dropped a phantom `threadId=` filter the docs claimed but `state.ts` never had).
- `implementation-contract-reference.md` — `runEvent(threadId,…)` → `runEvent(weaveSlug,…)`, which also fixed a mislabel (the arg is the weave, not a thread).
- `app-query-use-cases-reference.md` — 14 `threadId` interface fields → `threadSlug`.
- `loom-context-pipeline-reference.md` — the `{weaveId}/{threadId}` placeholders → `{weaveSlug}/{threadSlug}`.
- `plan-steps-…-reference.md` — the `loom_create_plan` example keys were plain wrong (`weaveId`/`threadId`); corrected to the real MCP keys `weave_slug`/`thread_ulid`.
- **Bonus staleness fixed en route:** `CLAUDE-template-reference.md` (3 lines) and `loom-claude-own-vision.md` still referenced the *deleted* `loom://thread-context/{weaveId}/{threadId}` — updated to the live `loom://context/thread/{weaveSlug}/{threadSlug}`. (I'd flagged this as a separate thread's leftover; since I was in the files anyway, correcting it beat leaving half-stale lines.)
- **Left untouched on purpose:** `api-naming-reference.md` + `api-audit-reference.md` — they cite `weaveId`/`threadId` *as the banned anti-pattern*, so renaming them would destroy their meaning.

**Step 8 — closure gate (the proof):**
- Grep gate: **0** `weaveId`/`threadId` across every `src` package + `mcp/tests`.
- `build-all` ✅ · `test-all` ✅ (re-run: full suite + 23/23 MCP integration).
- The *only* `weaveId`/`threadId` left in the whole repo are (a) the deliberate anti-pattern citations, (b) frozen `loom/**` history, (c) stale compiled `tests/vscode/out/*.js` (not run; regenerate from swept sources).

So: **no asterisk.** Every place a human or model fills *or reads* a weave/thread reference now says `weaveSlug`/`threadSlug` (or `*Ulid` where it's a ULID). The pre-ULID clarity is restored. Committing this now as the last action of the turn.