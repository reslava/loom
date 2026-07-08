---
type: chat
id: ch_01KWZ5RCPX3RJQGYAQH2B1WXMV
title: cli-surface-naming Chat 001
status: done
created: 2026-07-07
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 17
---
# cli-surface-naming Chat 001

## Rafa:

this is active thread, chat now
read idea
in previous thread chat `loom/core-engine/mcp-read-surface-naming/chats/chat-001.md` line 239
you said:
>1. **`do-next-step` kept its tolerant resolver.** The arg is now `planUlid`, but I did *not* hard-reject filename stems — that would break `loom next <stem>` before the CLI thread lands. Mild rule-2 imperfection; the CLI thread should finish it. 

so this should be done when this thread finalize, correct?

## AI:

Yes — this thread is the right home for it, and the previous thread said as much ("the CLI thread should finish it"). But "done" here is a two-part move, not just "flip the resolver to strict." Let me be precise about the current state so we scope it correctly.

**Where things actually stand today:**

- Every *write-path* tool (`loom_do_step`, `loom_complete_step`, `loom_start_plan`, `loom_add_step`, …) already goes through `requirePlanUlid` (`packages/mcp/src/tools/planUlid.ts`) — strict, `pl_`-only, a stem/title is rejected with a clear message. That side of the contract is clean.
- The **`do-next-step` prompt is the lone exception**. It declares `planUlid` (`doNextStep.ts:8`) but still resolves it with the *tolerant* `resolveDocIdOrThrow` (`doNextStep.ts:17`), which accepts a filename stem and suggest-on-miss. This is exactly the "mild rule-2 imperfection" I left behind.
- `next.ts` already renamed its call arg to `planUlid` (`next.ts:39`), so the wire name is correct. But it forwards whatever the user typed as `loom next [plan-id]`, which can be a stem — so if I tighten the prompt today, `loom next my-plan-stem` breaks.

**Why it's not a one-liner — the design decision this thread must record:**

The prompt is *both* agent-facing and the CLI's backend. For agents, strict ULID is the right contract (uniform with every tool). For the CLI, forcing users to type a 26-char `pl_` ULID is hostile UX — the idea itself flags the CLI as a public surface with real users. The clean end state satisfies both:

1. **Resolve at the CLI edge.** `next.ts` resolves the user's friendly identifier (stem/slug/ULID) → a `pl_` ULID *before* calling the prompt. The CLI already holds `getState`, so it can do this locally; the friendly-input convenience lives at the delivery boundary, where it belongs.
2. **Then tighten `do-next-step` to ULID-only** — swap `resolveDocIdOrThrow` for the same strict `requirePlanUlid` guard the tools use. The tolerant resolver retires from the prompt entirely.

That ordering matters: tighten the prompt *first* and the CLI breaks; add edge-resolution *first* and the tighten is a safe no-op for users. So it's a plan with a hard dependency (edge-resolution blocks the tighten), and it should land inside this thread's design + plan rather than as a loose follow-up.

**One connected question to settle in the same design:** if the CLI accepts a friendly identifier (stem *or* ULID), what do we call the positional arg? `loom next [plan-ulid]` would be a lie (it's not strictly a ULID at that boundary); `[plan-id]` violates the naming rule. Probably `[plan]` (unqualified friendly identifier, resolved at the edge). Worth deciding alongside the `--thread`/`--weave`/`[weave-id]` alias-vs-hard-break question the idea already raises — same class of "user-facing name" call.

So: correct that it's this thread's job; the finalize is *edge-resolve in the CLI → then strict prompt*, captured as a dependency in the design/plan. Want me to draft the design for this thread, or keep chatting the arg-naming/migration decisions first?

## Rafa:

Sorry, but we agree on this:

CLI will have 2 commands versions: 1 with ULID (for AI) and 1 with Slug (for humans) when needed, correct?
This solve the problem?

## AI:

Yes — and I actually like this better than my "resolve-at-the-edge with a fuzzy arg name" idea, because it solves the naming problem *honestly*: a ULID command's arg is truthfully `plan-ulid`; a slug command's arg is truthfully `*-slug`. No lying arg names, no "accepts either" ambiguity. So it does solve the core problem.

Two sharpenings so we don't over-build it:

**1. It's not "2 versions for every command" — most commands need only one.** Look at the idea's command list: `status [weave]`, `validate [weave]`, `design <weave>`, `plan <weave>`, `refine-design <weave>` are all **weave-scoped**, and weave is *canonically a slug* — there is no weave ULID. So those are slug-only already; no ULID twin exists to build. The dual-form question only bites for the entities that have *both* a slug and a ULID: **plan-, thread-, and doc-addressed commands** (`next`, `start-plan`, `complete-step`, `context`, `--thread`). That's a much smaller surface than "double everything."

**2. The one question that decides how many dual-forms we actually build: does an AI ever drive the CLI, or only MCP?** Per the vision, agents talk to Loom through **MCP** (the `do-next-step` prompt, the `loom_*` tools) — they already hold the ULID and use the strict tools. The CLI is the *human/terminal* surface. If that holds, then:

- The CLI can be **human/slug-first** across the board.
- A ULID variant is added **only "when needed"** — exactly your phrasing — i.e. only where a real AI/script caller genuinely shells out to `loom` instead of calling MCP. Today I don't see one: `next.ts` is the only prompt caller and it's a human convenience command.

So the crisp version of your model: **CLI = slug/human-facing by default; MCP = ULID/AI-facing (already strict).** The dual ULID+slug command only materializes on the specific plan/thread/doc commands where an AI actually needs a terminal entry point — and we should name that concrete caller before building the twin, rather than pre-emptively doubling the surface.

That still lets `do-next-step` go strict ULID (its consumers are MCP agents + the CLI, and the CLI would resolve slug→ULID or expose a `-ulid` twin only where warranted).

If you're good with that framing — **"CLI slug-first for humans, ULID twin only where a real AI caller needs it, MCP stays the strict ULID surface"** — that's the design decision, and it's clean enough to write the design doc against. Want me to draft it?

## Rafa:

All of this has been already designed and agreed, I see you lose context with this new session.

### CLI

- CLI slug-first for humans
- ULID twin only where a real AI caller needs it  

### MCP

- MCP stays the strict ULID surface 
- and Slug for MCP resource context, tools, prompts that can be pointed for humans, example, when I tell you at the beginning of a session (like this one):
`read loom/cli/cli-surface-naming/chats/chat-001.md`
you load context from mcp resource `loom://context/cli/cli-surface-naming/chat-001.md`

### Memorize

I would like this sourfaces/naming convetion was written in glocal context or architecture reference doc or where you consider better place to always be present

is it all clear?
if so, write design

## AI:

Design written → `design.md` (draft, version 1). It captures exactly the model you stated, structured around your three surface-classes:

- **CLI** = slug/human-first; friendly identifier resolved to a ULID at the CLI edge; a ULID twin only where a real AI caller shells out to `loom` (none today, so none built).
- **MCP agent surface** (write tools + `do-next-step`) = strict ULID. This is where the original deferred item lands: `do-next-step` drops its tolerant `resolveDocIdOrThrow` for a strict `pl_` guard, because `next.ts` now resolves slug→ULID before calling it. That closes the `mcp-read-surface-naming` chat-001:239 loose end.
- **MCP human-pointable read surface** = slug paths, `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` — your session-start `read loom/cli/.../chat-001.md` example.

For the **memorize** ask: full three-class table goes into `api-naming-reference.md` (its canonical home, already holds the `*Ulid`/`*Slug` rules), plus a compact always-present 3–4 line summary in `loom/ctx.md` §3 — because api-naming-reference is citation-loaded only, and you want this present *every* session.

**One thing I did not decide for you** — the migration path for the public flag renames. The idea leaned toward deprecated aliases for one release; I recommend the opposite: a **clean rename, no alias shims**, consistent with your no-legacy-trash stance and the near-zero external-user reality. That's the only open call in the design; everything else follows from the agreed model. One word — **clean break** or **aliases** — and I'll finalize the design and write the plan.

## AI:

Clean break recorded. Design finalized (draft → active) with the migration decision written in as **Decided — clean break** (old arg/flag names removed, not aliased).

Plan written → `plans/plan-001.md`, 7 steps:

1. CLI internal call-site rename (`weaveId` → `weaveSlug`, no slug through a `*Ulid` param)
2. CLI user-facing args slug-first, clean break (old names removed, README in lockstep)
3. `next.ts` edge-resolution (friendly `[plan]` → `pl_` ULID via `getState`)
4. Tighten `do-next-step` to strict ULID — **blocked by step 3** (safe only once the CLI resolves at the edge); closes the `mcp-read-surface-naming` deferred item
5. MCP context resource slug-path form (verify/extend, don't duplicate)
6. Document the convention — `api-naming-reference.md` table + always-present `loom/ctx.md` §3 summary + CLAUDE.md/template sweep (this is your "memorize" ask, landed as a real step)
7. Tests + full build/test green

The step-4→step-3 dependency is enforced in the plan (blockedBy stored as the step-id slug, verified). No req doc for this thread, so steps carry no `satisfies` — fine, req is optional.

Plan is `active`, not started. Say `go` and I'll start it and implement step 1 (CLI internal call-site rename), or `go all` to run the whole plan through, stopping only on an error or a design fork.

## Rafa:

Idea, design marked done
I started plan
Do whole plan

## AI:

Whole plan done — all 7 steps ✅, plan auto-completed. Summary of what shipped:

**CLI (slug/human-first):**
- Internal call sites: every `weaveId` var carrying a slug → `weaveSlug` (`refine`, `weaveDesign`, `weavePlan`, `status`, `validate`, `startPlan`).
- User-facing placeholders → entity names (`[weave]`, `<plan>`, `<doc>`, `<draft>`, `--thread <slug>`, `--weave <weave>`) in `index.ts` + README. **Finding:** these are commander help-text only, so the "clean break" cost users nothing — no command/flag string needed renaming.
- `next.ts`: `resolvePlanUlid` resolves any friendly ref (omitted → active plan · `pl_` ULID · `weave/thread` slug · plan id/stem) to a `pl_` ULID **at the CLI edge**.

**MCP (strict ULID for agents, slug-path for humans):**
- `do-next-step` tightened to strict `pl_` ULID via a shared `isPlanUlid` guard — **closes the `mcp-read-surface-naming` deferred item** that started this whole thread.
- Context resource: fixed the human-pointable doc-slug form so `loom://context/{weave}/{thread}/{docSlug}` resolves by filename stem (`chat-001.md`) — verified live on your exact example.

**Docs (the memorize ask):** the "Surfaces and their consumers" table in `api-naming-reference.md`, a compact always-present summary in `loom/ctx.md §3`, and a pointer sentence in `CLAUDE.md`. Deliberately did *not* mirror it into the `LOOM_CLAUDE_MD` template — it's repo-specific API-authoring guidance.

**Verification:** `build-all` clean, `test-all` green (added `do-next-step` accept/reject tests + a context slug-path test; fixed one stale fixture that seeded a legacy kebab plan id).

Two follow-ups I flagged but deliberately did **not** silently fold in: (1) the fs helper `resolveWeaveIdForPlan` still has the `Id` token (fs-layer rename, its own sweep); (2) `start-plan`/`complete-step` could adopt the same edge-resolver to be equally slug-friendly (enhancement, not a regression). And a heads-up: the running `loom mcp` server in *this* session is on the old dist until an MCP/session restart — the strict prompt + slug-path resolution are proven via the CLI, but the live agent server won't reflect them until you restart. Nothing committed — tree is dirty with the changes for your review.

## Rafa:

mcp restarted
do (1) and (2)
 
commit

## AI:

Both follow-ups done, full suite green, committing now.

**(1) fs helper rename** — `resolveWeaveIdForPlan` → `resolveWeaveSlugForPlan` (it returns a weave *slug*): renamed the definition + param (`planId`→`planUlid`) + internals in `pathUtils.ts`, and swept all 8 references — 1 CLI (`startPlan`) + 7 app use-cases (`addStep`, `removeStep`, `updateStep`, `reorderSteps`, `completeStep`, `closePlan`, `doStep`) — plus the JSDoc mention in `idUtils.ts` and the integration-test comment. The fs barrel is `export *`, so no barrel edit. (I left the app use-cases' internal `weaveId` *locals* alone — renaming every app-layer local is a separate, broader cleanup, not part of the fs-helper rename.)

**(2) edge-resolution for `start-plan` + `complete-step`** — extracted `resolvePlanUlid` into a shared `packages/cli/src/planArg.ts` (mirrors `threadArg.ts`), now used by all three plan commands. `start-plan <plan>` and `complete-step <plan>` resolve a friendly ref (ULID · `weave/thread` · plan id/stem) → the plan's canonical id at the CLI edge, so they're as slug/human-first as `next`. `next.ts` slimmed to import the shared resolver.

Verified: `build-all` clean, `test-all` green (the two new `do-next-step` tests + the context slug-path test all pass; the legacy-fixture path still works because `resolvePlanUlid` matches a plan by its id/stem).

## AI:

Done — thread `app/app-use-case-naming` + its idea are created (draft, priority 150 — deliberately low). Now the honest answer to *"are there more surfaces, this is never ending"*:

## No — it's bounded, and the part that mattered is already done

I audited it rather than guessing. Real state:

| Surface (where a model/user *fills* a value) | Status |
|---|---|
| MCP tool schemas (`weave_slug`, `thread_ulid`, `plan_ulid`) | ✅ done (`api-contract-refactor`) |
| MCP resource **path** placeholders + prompts | ✅ done (`mcp-read-surface-naming` + this thread) |
| CLI args/flags | ✅ done (`cli-surface-naming`) |
| VS Code extension **MCP call sites** | ✅ already correct — it passes `{ weave_slug, thread_ulid }` today |

**The bug-causing surfaces are complete.** The `threadId`-means-slug ambiguity only bites where someone fills a value *from the name alone* — every such boundary is now aligned. It literally cannot reproduce the duplicate-thread class of bug anymore.

**What's left is not "surfaces" — it's internal naming:**
- ~150 `weaveId` locals/deps-params inside `app` use-cases → the new thread.
- ~179 `weaveId` in the extension — but those are its *internal* tree/state locals, not API args (call sites are already right). Optional, separate.
- **One genuine straggler:** `loom://state?weaveId=` query param (`state.ts:14`) still names a slug `weaveId`. Small — I folded it into the new idea's scope.

None of that can fill a value wrong. It's readability, not correctness.

## The blunt part

This is internal-consistency polish on a project with **no users yet**. The new thread captures it so it's not lost, but I set it low-priority on purpose and its idea says outright: *after it, the naming initiative is closed.* If I were you I'd leave it in the backlog and spend the next cycle on something that produces a validation signal, not a cleaner variable name only you will ever read. The "never ending" feeling is a real signal — and here the truthful reading is "you're at the end of the part worth doing," not "there's an infinite tail."

Nothing committed for the new thread (idea is draft).