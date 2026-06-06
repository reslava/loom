---
type: chat
id: ch_01KTCVFDJ3PEW8CGWJMCFNA5ZA
title: requirements-driven-development Chat
status: active
created: "2026-06-05T00:00:00.000Z"
updated: 2026-06-06
version: 3
tags: []
parent_id: null
requires_load: []
---
# requirements-driven-development Chat

## Rafa:

requirements-dogfooding idea:
we could generate `req` docs on real Loom threads to test + showcase
first we should pick useful, interesting thread with requirements
we could start by using `test` weave

i can try to use extension or you could use mcp

suggestions?

note: when we generate 2 or 3 requierements docs we will release v1.0.0


## AI:

Good instinct to dogfood — but I'd steer away from `test` weave as the *primary* target. It's the safe choice and that's exactly its weakness. A `req` doc on throwaway content proves the mechanism *runs*; it proves nothing about *faithfulness*, which is the only thing worth showcasing. The feature's entire claim is "a stated exclusion survives the chain." You can only demonstrate that on a thread whose chat actually stated includes/excludes/constraints that mattered.

So my filter for picking threads: **does the originating chat contain sharp, citable scope** — an exclusion someone could have silently dropped, a constraint the planner had to respect?

Three candidates, strongest first:

1. **This thread (RDD itself).** The most compelling showcase: the requirements feature gets its own `req.md`, extracted from chat-001. chat-001 already reads as include/exclude/constraints (body = three ID'd lists; `req` thread-scoped only; *no step-count policy in the generator*). Self-referential, on-brand, and the scope is genuinely sharp — "Excluded: step-count / banned-step rules baked into the generator" is the exact failure this thread exists to kill. It's retro (idea/design already `done`) but that's fine for a showcase.

2. **A thread with a real, lost exclusion.** The canonical failure is the landing-page demo (`no interaction testing`, dropped on promotion). If that weave is reachable, retro-fitting a `req` there *replays the original bug in reverse* and is the most honest proof we have. If it's not in this workspace, `vscode-mcp-refactor` carries a hard constraint (extension must not import `app`) that's perfect constraint-citation material.

3. One more sharp-scope thread to hit your 2–3 target for v1.0.0.

On **extension vs MCP — don't pick one, do both deliberately.** The design promises two delivery paths for the same logic (sampling `generate` in the extension vs agent-as-author via `loom_create_req`+`content` in CLI). Dogfooding only one leaves half the feature untested:
- **Extension** exercises the real user UX — the Generate/Refine/Finalize buttons and the sampling path. This is your showcase/GIF surface.
- **MCP/CLI (me)** exercises the agent-as-author path, the finalize lock, and downstream injection + Phase-2 coverage. This is the path that actually proves the verification machinery earns its keep.

Concretely: I generate the RDD-self `req` via MCP now (cheap, immediate, and it'll show up in this thread's own context so we can literally watch it inject), and you drive at least one via the extension buttons for the showcase. Then the v1.0.0 notes can honestly say both surfaces were exercised.

One decision before we start: do you want these reqs **finalized/locked** (so we also test the lock + downstream-staleness path), or left `draft` (just testing extraction)? Locking is where Phase 2 earns its keep — I'd lock at least one.

What threads do you have in mind? Point me at one or two with real scope in their chats and I'll start with RDD-self.

## Rafa:

I just mentioned `test` weave for 1st testing, I will delete that weave before next release

We will do both extension & MCP
We will locked reqs to test phase 2
Ok, let's start with this thread, then you help me to choose another to test extension, I can not remember a good one now

## AI:

Done — RDD-self `req` created via MCP and **locked**: `rq_01KTCWA9S049W8ZXMJ7VFRJ99R` → `loom/core-engine/requirements-driven-development/req.md`.

Extracted faithfully from chat-001 + the settled idea/design: **9 Included**, **7 Excluded**, **5 Constraints**, all ID'd. The marquee one is `EX1` — *no step-count rule / banned-step list hardcoded into the generic generator* — the exact failure this whole thread was built to kill, now captured as an explicit, citable exclusion. `EX4` (scope traceability, not runtime correctness) and `C4` (sampling boundary) are the other two I'd point a viewer at.

**One honest dogfooding finding, surfaced immediately —** this is the feature working *and* showing its retro limitation:

Now that a locked `req` exists on this thread, the Phase-2 structural check (`checkReqCoverage`) will run against `plan-002`. But `plan-002` was authored *before* the req existed, so its steps carry **no `Satisfies` ids** — which means coverage will flag **every `IN` id as uncovered**. That's not a bug; it's exactly what "prevention beats detection" predicts: a req retro-fitted onto an already-built thread can't have been cited *as the plans were generated*. It's a clean demonstration of why `req` has to be **first** in the chain. Two ways to read it for v1.0.0:
- **Leave it** — the uncovered-coverage diagnostic on a retro thread is itself a truthful showcase of the check firing.
- **Back-cite** — refine `plan-002` to add `Satisfies` ids so coverage goes green, showing the citation contract end-to-end. More polished, but slightly artificial (we'd be citing after the fact).

I lean *leave it* for the dogfood and instead get a **clean forward-cited example** from the next thread — where the req is locked *before* its plan is generated, so the planner cites it natively. That's the more honest end-to-end proof.

**Next thread for the extension test —** strongest candidate I can name: **`vscode-mcp-refactor`**. It has a single, razor-sharp constraint ("the extension must not import `app` — MCP is the only gate") that's perfect `Constraint`-citation material, and an equally clean exclusion boundary (UI-only, no domain logic). If you drive *that* one through the extension buttons (Generate → curate → Finalize) **before** generating any new plan for it, we get the forward-cited, coverage-green example to pair with this retro one.

If you'd rather pick from a wider field, say the word and I'll scan the other threads' chat openers for sharp include/exclude/constraint scope and bring back a ranked shortlist.

Next: your call — drive `vscode-mcp-refactor`'s `req` via the extension, or have me scan for alternatives. (Leaving `plan-002` uncited unless you want the back-cite.)

## Rafa:

is `checkReqCoverage` diagnostic wired to extension? can I run it from tree?
i would like to try refine plan-002 so we check if refine take req.md into the proccess and then verify how requirements pass with checkReqCoverage

we can try extension to generate req for vscode-mcp-refactor
and when new feature is coming we could test the whole workflow, including starting by reqs, but for now I have no next feature

what you think?


## AI:

**Q1 — is `checkReqCoverage` wired to the extension / runnable from the tree? Yes, two surfaces:**

1. **Passive (automatic).** `getState` runs `checkReqCoverage` for every thread with a locked req + plans and folds the count into `state.summary.reqCoverageGaps`. The tree paints a top warning row — `⚠️ N req coverage gaps` — whenever that's > 0 (`treeProvider.ts:155-162`). Since we just locked this thread's retro req against an uncited `plan-002`, that row should appear on the next refresh — your first visible dogfood signal.
2. **Active (on demand).** Right-click the **req node** (or use its inline icon, `inline@2`) → **"Verify Plan Against Requirements"** (`loom.verifyReq`). It calls `loom_verify_req` → structural `checkReqCoverage` **plus** the semantic AI pass, dumping findings to the "Loom Req Verify" output channel (or a ✅ if clean). So yes — you can run it from the tree right now.

**Q2 — "does refine take `req.md` into the process?" — I checked the code, and the answer is _no_. This is the finding, and it's a good one:**

`loom_refine_plan` → `refinePlan` (`packages/app/src/refinePlan.ts`) loads **only the plan doc itself** + any manually-passed `context_ids`. It never calls `assembleContext`, never reads the thread's locked req, never hands Excluded/Constraints in as boundaries. Worse, its `SYSTEM_PROMPT` emits the **legacy 5-column table** (`Done | # | Step | Files touched | Blocked by`) — *there is no `Satisfies` column in it at all.*

Three consequences, in order of importance:
- **Refine is req-blind.** Phase-2 step 5 taught only `loom_generate_plan` + the weave-plan prompt to cite req. `refine_plan` was never updated — it's a genuine Phase-2 gap. So refining `plan-002` would **not** produce citations; it'd prove the gap, not faithfulness.
- **Refine would _strip_ `Satisfies`.** Because the refine prompt regenerates the table in 5-column form, refining *any* plan that already carried `Satisfies` ids would silently drop them. That's a latent regression, not just a missing feature.
- **Refine is sampling-only → I can't run it here.** `refine_plan` routes through `samplingAiClient` (server→client), which is blocked in a Claude Code CLI session. So in *this* session refine returns `MethodNotFound` — only the extension can execute it.

So your proposed experiment is valuable, but its result is already legible from the source: refine doesn't pull req. The genuinely useful output of this dogfood is the **decision it surfaces** —

> **Should we close the gap and make `refine_plan` req-aware (the clean path), or just log it and move on?**

The clean fix mirrors `generate`: have `refine_plan` read the thread's locked req, hand `Excluded`+`Constraints` in as hard boundaries, emit `satisfies` per step, and switch the refine `SYSTEM_PROMPT` to the 6-column table so it stops stripping citations. That's a small, well-scoped Phase-2 follow-up — and it'd also make a *much* better demo than refining a retro plan: lock req → refine plan → watch citations + coverage go green, all req-driven.

**On the rest —** agreed: generate `vscode-mcp-refactor`'s req via the extension, and defer the full forward "start-by-req" workflow until a real next feature exists. Inventing a synthetic feature just to exercise the path would be dishonest dogfooding; better to wait for genuine work.

STOP — this is a design call. Tell me: **(a)** fix `refine_plan` to be req-aware now (I'd open it as a small Phase-2 follow-up plan), **(b)** log it as a known gap and proceed to the `vscode-mcp-refactor` extension test, or **(c)** something else. I'd lean (a) — it's a latent regression (silent `Satisfies` stripping), not just a missing nicety.

## AI:

Right — and the reason is a real UX finding, not just you missing it: **there is no button literally named "checkReqCoverage" (or "coverage") anywhere in the extension.** The structural check has no standalone entry point. It surfaces only two ways:

1. **Passive — the summary row.** When any thread has coverage gaps, the Loom tree paints a top row `⚠️ N req coverage gaps` (`treeProvider.ts:155-162`). It's read-only and aggregate — not a button, and it only appears *after a refresh* once the tree has seen the new `req.md`. I created `req.md` via MCP just now, so hit the Loom view's **Refresh** first. (Heads-up: the running `loom mcp` / extension can be stale until reconnect — if the req node or warning row doesn't show, reconnect MCP / reload.)

2. **Active — folded inside a differently-named command.** `checkReqCoverage` runs *as part of* **"Verify Plan Against Requirements"** (`loom.verifyReq`), which lives on the **req node only** — not the thread, not the plan:
   - Expand the thread → click the **req** doc (the ⚖️ "law" icon, shows `🔒 locked`).
   - **Hover it** → an inline verify icon appears (menu group `inline@2`), **or right-click** → **"Verify Plan Against Requirements"**.
   - That calls `loom_verify_req` → structural coverage **+** semantic pass; results go to the **"Loom Req Verify"** output channel (or a ✅ toast if clean).

So if you were scanning for the word "coverage," it's invisible by design — the label is "Verify Plan Against Requirements." **The honest UX gap:** the cheap, always-on deterministic check (the one that should be the most discoverable) has the *least* discoverable surface — buried under a verb ("Verify") that also implies the expensive AI pass. Worth a follow-up: a plain "Check Coverage" action, or at least renaming, so the structural check reads as the default and the semantic pass as the add-on.

**Most likely concrete cause you can't find it at all:** your loaded VSIX predates Phase 2. You rebuilt + reloaded the vsix after **Phase 1**; `loom.verifyReq` is **Phase 2, step 6** — if you haven't rebuilt the extension and reloaded the window since Phase 2 shipped, the command simply isn't in your running build.

**30-second check:** Command Palette (`Ctrl+Shift+P`) → type `Verify Plan Against Requirements`.
- **Present** → it's there; you just need to reach it via the req node (and refresh the tree to see the req node).
- **Absent** → stale VSIX. Rebuild + reinstall the extension and **Reload Window**, then the req node's verify action appears.

Next: run that palette check and tell me present/absent — that tells us instantly whether it's a discoverability problem (reach it on the req node) or a stale-build problem (rebuild the vsix). Still holding on the `refine_plan` req-blindness decision from my last message.

## Rafa:

- Do (a) fix `refine_plan` to be req-aware. Any other command that should be req-aware?

- I rebuild all and vsix
I ran `Verify Plan Against Requirements` and got this:
```
{
  "weaveId": "core-engine",
  "threadId": "requirements-driven-development",
  "structural": {
    "uncovered": [
      {
        "id": "IN1",
        "text": "A dedicated `req` doc-type — one flat `req.md` per thread, body = three ID'd lists, single stem (`type: req` + `req.md`) like `ctx`."
      },
      {
        "id": "IN2",
        "text": "Three immutable lists — `✅ Included` / `❌ Excluded` / `⛓ Constraints` — each item carrying a stable `IN`/`EX`/`C` id, parsed by a pure `parseReq`."
      },
      {
        "id": "IN3",
        "text": "`req` is born **first** in the chain (chat → req → idea → design → plan) **and** always-loaded — injected into every thread context bundle before the parent chain."
      },
      {
        "id": "IN4",
        "text": "Lifecycle: generate-from-chat extraction → user curates → explicit `finalize` lock → refine/reopen at version+1."
      },
      {
        "id": "IN5",
        "text": "Planner-citation contract — plan steps carry a `satisfies` column; the planner cites requirements as it generates (prevention over detection)."
      },
      {
        "id": "IN6",
        "text": "Pure structural coverage reducer (`checkReqCoverage`, deterministic, runs always): every Included id has ≥1 covering step; no step cites an Excluded id."
      },
      {
        "id": "IN7",
        "text": "Semantic backstop — an AI judgment pass for phrased-differently violations of an Excluded/Constraint item."
      },
      {
        "id": "IN8",
        "text": "`req_version` staleness propagation — re-locking marks downstream idea/design/plan stale via the existing machinery."
      },
      {
        "id": "IN9",
        "text": "Wired across all four layers: core, app, mcp, and the VS Code extension (tree node + Generate/Refine/Finalize buttons)."
      }
    ],
    "excludedViolations": [],
    "unknownCitations": []
  },
  "semantic": null,
  "semanticError": "MCP error -32603: No AI API key configured. Set \"reslava-loom.ai.apiKey\" in VS Code settings."
}
```

## AI:

Good — two things land here.

**1. Your verify output is the showcase working exactly as designed.** The command being present at all confirms your VSIX is now on the Phase-2 build (it was stale before — that was the "can't find it" cause). The structural result reads:
- `uncovered: [IN1…IN9]` — all nine Included items have zero covering steps. **Correct and expected**: `plan-002` predates the req and carries no `Satisfies` ids, so the reducer truthfully reports "nothing is cited." This is the retro-fit limitation made visible — proof that req must come *first* to go green.
- `excludedViolations: []`, `unknownCitations: []` — nothing is wrong, there's just nothing cited.
- `semanticError: "No AI API key configured"` — orthogonal. The structural pass (the cheap deterministic one) ran fine; the semantic pass needs `reslava-loom.ai.apiKey` in VS Code settings. Optional — set it only when you want to watch the AI backstop fire.

So the dogfood already paid out: it surfaced the `refine_plan` gap *and* demonstrated the structural reducer end-to-end through the extension.

---

**2. "Any other command that should be req-aware?" — yes, and it's a family, not a one-off.**

I audited the generate/refine surface. The root cause is structural:

- **Generate family is already mostly req-aware** — because it routes through `loom://context/thread/...`, and that bundle injects the locked req *first* (Phase 1, §2). So:
  - `loom_generate_plan` ✅ — sees req **and** cites `satisfies` (Phase-2 step 5).
  - `loom_generate_design` ✅ (framing) — sees req in the bundle; respects Excluded/Constraints. No `satisfies` (design has no step schema — correct).
  - `loom_generate_idea` ⚠️ low — loads **no** thread context, just the prompt. But idea is the *seed* (chat → req → idea); req is born from the same chat, so this is the least important. Defensible to leave.

- **Refine family is uniformly req-blind** — every refine use-case loads only the bare doc (`loadDoc(filePath)`) and never assembles thread context. None of them see the locked req:
  - `refinePlan` 🔴 **critical** — req-blind **and** its `SYSTEM_PROMPT` emits the legacy 5-column table, so it *strips* any existing `Satisfies`. Active data loss, not just a missing feature.
  - `refineDesign` 🟠 — req-blind; would happily reintroduce Excluded scope on a refine. No data-loss, just drift risk.
  - `refineIdea` 🟡 — req-blind, and has no `extraContext` param at all. Lowest severity.

**The clean root-cause fix (recommended):** make the refine family assemble the same `loom://context/thread/...` bundle the generate family already uses — one code path, req injected first. Refine reads the bare doc only because it predates the unified context pipeline; closing that is the durable fix, not a patch. Concretely:
- **refine_plan**: assemble context (req first) → hand Excluded/Constraints as hard boundaries → switch `SYSTEM_PROMPT` to the **6-column** table (add `Satisfies`) → preserve existing citations and add new ones. This is the latent-regression fix.
- **refine_design**: inject context so it respects scope on refine. Small.
- **refine_idea**: optional — inject context for consistency. Smallest.

One architecture note for the plan: the app refine use-cases currently take `extraContext: string` and the **mcp tool** is what calls `handleContextResource` (same split generate uses). I'd keep that split — mcp assembles the bundle and passes it in; the app use-case stays thin and IO-free. The only app-layer change is `refinePlan`'s prompt (5→6 col) + `satisfies` round-trip.

---

STOP — scope decision, your call:
- **(i)** Just `refine_plan` (critical only), or
- **(ii)** the whole refine family — `refine_plan` (full) + `refine_design` + `refine_idea` (framing). *I lean (ii)* — same root cause, same code path; fixing one and leaving two half-blind is exactly the kind of inconsistency that bites later. `refine_idea` can be the cheap last step.

Tell me (i) or (ii) and I'll open it as a Phase-2 follow-up plan — and this time the plan's own steps will carry `Satisfies` ids against the RDD-self req, so it's the green counterpart to plan-002's red.

## Rafa:

Do (ii)

## AI:

Done (ii). Opened **plan-003** — `pl_01KTDYGX7CN9GNSQ8QC7ZW2VZ9` (`requirements-driven-development-plan-003.md`), parented to the design. Four steps, each citing the req slice it honestly advances:

| # | Step | Satisfies |
|---|------|-----------|
| 1 | app — `refinePlan` 6-col table + emit/preserve `satisfies` | IN5, IN3 |
| 2 | app — `refineDesign`/`refineIdea` framing-aware | IN3 |
| 3 | mcp — refine tools assemble the thread bundle | IN9, C1, IN3 |
| 4 | build + test green + smoke regression & win | IN5, IN6 |

And this plan **dogfences itself** — three things fell out of just creating it:

**1. The citation contract works end-to-end (deterministic proof).** I ran Verify on the thread right after creating plan-003. Coverage moved from **9 uncovered → 5 uncovered** in one shot:
- Now uncovered: `IN1, IN2, IN4, IN7, IN8` — precisely the items plan-003 doesn't touch (doc-type, parser, lifecycle, semantic backstop, staleness — those were shipped by plan-001/002).
- `IN3, IN5, IN6, IN9` flipped **covered**, `excludedViolations: []`, `unknownCitations: []` (C1 accepted as a valid Constraint citation).

So `satisfies` round-tripped through `parseStepsTable → checkReqCoverage` with zero AI involved. This is the green counterpart to plan-002's all-red — and the prevention-over-detection story made literal: cite as you write, the cheap structural check goes green on its own.

**2. `req_version: 1` was auto-stamped on plan-003's frontmatter.** The IN8 staleness baseline fired on creation — when we re-lock the req to v2 someday, this plan will correctly show stale.

**3. Two findings worth logging (don't fold into plan-003 — different surface):**
- 🔴 **`loom_list_plan_steps` drops `satisfies` from its output.** It returns order/description/files/done/blockedBy but **not** the citations. The data is fine (the table body is the source of truth and the parser reads col 5 — Verify proved it); the *list/picker projection* just omits it. So the step-picker can't show the very contract it's meant to surface. Small fix: add `satisfies` (and ideally a per-step covered/uncovered flag) to that tool's projection. Want it as its own tiny follow-up plan?
- 🟡 The semantic pass returned `MethodNotFound` here (CLI sampling blocked, per C4) vs the extension's earlier "no API key" — both correct, just host-dependent wording. No action.

---

Next: **plan-003 step 1** — rewrite `refinePlan`'s `SYSTEM_PROMPT` to the 6-column table and make it emit/preserve `satisfies` (the latent-regression fix). Files: `packages/app/src/refinePlan.ts` + a refine round-trip test.

STOP — waiting for `go` (and tell me if you want the `loom_list_plan_steps` projection gap as its own follow-up).

## Rafa:

- Update plan with a new step to include: Add `satisfies` to `loom_list_plan_steps` 
- Do whole plan

## AI:

plan-003 done — all 5 steps ✅, auto-closed to `done`, build + full test suite green.

**What shipped (refine family is now req-aware):**
- **`refinePlan`** — 6-column table + req boundaries in the prompt. The real root cause turned out deeper than "strips Satisfies": `frontmatterSaver` regenerates the table from `PlanDoc.steps`, so the AI's table was being *discarded entirely* — refine couldn't change steps at all. Fix re-parses the refined body and **merges**: `done` always preserved (refine never un-completes a step), `satisfies` preserved when the AI omits it but updated when the AI provides it, and a malformed reply falls back to existing steps (never wipes).
- **`refineDesign` / `refineIdea`** — respect injected Excluded/Constraints; `refineIdea` gained the `extraContext` plumbing it lacked.
- **mcp wiring** — new `refineContext.ts` helper; all three refine tools assemble the doc's context bundle (locked req first) via `loom://context/{id}?mode=refine`. Used the doc-id form so the pipeline resolves the thread — no path-parsing. App stays IO-free (C1).
- **`loom_list_plan_steps`** — now returns per-step `satisfies` (the projection gap you spotted).

**Verification:**
- `test-all` green, **13/13** MCP integration (incl. a new assertion that `list_plan_steps` returns `satisfies`).
- New `tests/refine-plan.test.ts` (stub AIClient + real fs) proves the regression is closed: 5-col reply → citations + done survive; 6-col reply → re-cites; tableless reply → no wipe.
- The live AI refine path is sampling-only (blocked in CLI), so it's covered by the deterministic stub test rather than a live run — and the earlier Verify already proved `satisfies → checkReqCoverage` end-to-end (9→5 uncovered).

**On your question — yes, reconnect MCP.** This session's running `loom mcp` is stale after build-all; the req-aware refine and the `satisfies` projection won't show live until you reconnect (`/mcp`). The `loom_complete_step`/done writes just now worked only because those tools were unchanged. After reconnecting you can right-click the **req** node → **Verify** to re-run coverage, and `list_plan_steps` will show citations.

This plan also cited itself green: it advances IN3/IN5/IN6/IN9 + C1 against the locked req — the forward-cited counterpart to plan-002's retro red.

Next: with the refine family fixed, the remaining dogfood item is generating `vscode-mcp-refactor`'s req via the extension (forward-cited from the start). Want to do that next, or pause here?

## Rafa:

I reconnected mcp, I ran `Verify plan...`:
```
{
  "weaveId": "core-engine",
  "threadId": "requirements-driven-development",
  "structural": {
    "uncovered": [
      {
        "id": "IN1",
        "text": "A dedicated `req` doc-type — one flat `req.md` per thread, body = three ID'd lists, single stem (`type: req` + `req.md`) like `ctx`."
      },
      {
        "id": "IN2",
        "text": "Three immutable lists — `✅ Included` / `❌ Excluded` / `⛓ Constraints` — each item carrying a stable `IN`/`EX`/`C` id, parsed by a pure `parseReq`."
      },
      {
        "id": "IN4",
        "text": "Lifecycle: generate-from-chat extraction → user curates → explicit `finalize` lock → refine/reopen at version+1."
      },
      {
        "id": "IN7",
        "text": "Semantic backstop — an AI judgment pass for phrased-differently violations of an Excluded/Constraint item."
      },
      {
        "id": "IN8",
        "text": "`req_version` staleness propagation — re-locking marks downstream idea/design/plan stale via the existing machinery."
      }
    ],
    "excludedViolations": [],
    "unknownCitations": []
  },
  "semantic": null,
  "semanticError": "MCP error -32603: No AI API key configured. Set \"reslava-loom.ai.apiKey\" in VS Code settings."
}
```

Tree top status, shows `5 reqs coverage gaps`

Is correct?

### Plan green, red

in line 295 you said:
>This plan also cited itself green: it advances IN3/IN5/IN6/IN9 + C1 against the locked req — the forward-cited counterpart to plan-002's retro red.

where you get that green and red?
when I ran `Verify plan against requirements` command, which plan is verified? all? last?

### Result of verify

Should result of `Verify...` be showed somehow in req tree node? 
At least something similar to `5 reqs coverage gaps`

### Pending

`vscode-mcp-refactor`'s req via the extension

## AI:

All correct, and your green/red question caught a real imprecision in my wording. Four answers:

**1. Is the result correct? Yes.** Uncovered = {IN1, IN2, IN4, IN7, IN8} = the 9 Included items minus the 4 that plan-003 cites (IN3, IN5, IN6, IN9). plan-002 cites nothing, so it adds no coverage. 5 gaps → the tree's "5 reqs coverage gaps" matches exactly.

But note *what* "gap" means here: those 5 items **were actually built** — IN1/IN2/IN4 by plan-001 (Phase 1 doc-type/parser/lifecycle), IN7/IN8 by plan-002 (semantic backstop + staleness). The check reports them uncovered because **no step cites them** — plan-001 predates the req entirely and plan-002's steps carry no `satisfies`. The deterministic reducer can only see citations, not "was this feature shipped." That's the retrofit limitation, working as intended: cite-as-you-go prevents gaps; bolting a req onto finished plans doesn't backfill citations.

**2. Where did "green/red" come from? — my shorthand, not a tool output. Correcting it:** there is **no per-plan green/red verdict** anywhere in Verify. I was describing intent, not what the tool prints:
- plan-002 = "red" → cites zero requirements (if it were the only plan, every IN would be uncovered).
- plan-003 = "green" → every one of its steps carries a citation; it's the forward-cited, well-formed plan.

But coverage is computed at the **thread level over all plans pooled**, so you never *see* a separate green plan and red plan — you see one aggregate number for the thread (the 5 gaps). My line implied a per-plan badge that doesn't exist. Apologies for the loose framing.

**3. Which plan does "Verify Plan Against Requirements" check? — ALL of them, pooled.** `loom_verify_req(weaveId, threadId)` flattens **every** plan's steps in the thread (`verifyReq.ts:54` → `thread.plans.flatMap(p => p.steps)`) and checks the union against the locked req. Not the last plan, not a selected plan — the whole thread's plans together. The question it answers is: *"across all this thread's plans, is every ✅ Included id cited by at least one step, and does any step cite an ❌ Excluded id?"* The command name ("...Plan...", singular) is misleading — it's thread-scoped, not plan-scoped. Worth renaming to "Verify Thread Against Requirements."

**4. Should the Verify result show on the req node? — yes, and it's the right fix for the discoverability gap.** Right now coverage surfaces only two ways: the global summary row ("5 reqs coverage gaps", all threads aggregated) and the on-demand output-channel dump. The req node itself shows only `🔒 locked`. A per-thread badge on the req node — e.g. `🔒 locked · ⚠️ 5 gaps` (or `✅ covered` when clean) in its description — would put the structural result exactly where you look at the req, no command needed. That's the cheap always-on check finally getting a visible home. It's an extension-UX change (tree node description + a coverage count the tree already computes for the summary row, so the data's in hand).

So two follow-ups fall out of your questions:
- (a) **req-node coverage badge** — surface per-thread gaps/clean on the req node description.
- (b) **rename** `loom.verifyReq` "Verify Plan Against Requirements" → "Verify Thread…" (it's thread-scoped).

Both are small and extension-only. Want me to open them as a plan (forward-cited against this thread's req — they'd advance IN9, the "wired across the extension" item), or park them and do the `vscode-mcp-refactor` req generation first?

Next: your call — (a)+(b) as a small follow-up plan, or move to `vscode-mcp-refactor`'s req via the extension.

## Rafa:

a+b

## AI:

Opened **plan-004** — `req-node coverage badge + verify-thread rename` (`requirements-driven-development-plan-004.md`), forward-cited against the req. 3 steps:

1. **app/core** — surface per-thread coverage in state (IN6, IN9). *Scope correction from my "extension-only" earlier:* `getState` only keeps the aggregate gap count, so per-thread coverage has to ride down in `loom://state` first — the tree must read it, never recompute (getState is MCP-internal).
2. **vscode** — req-node badge (`🔒 locked · ⚠️ N gaps` / `· ✅ covered`) + rename the command to "Verify **Thread** Against Requirements" (IN9).
3. **build + test + smoke** (IN6, IN9).

This one *will* go green on Verify when done — every step is cited, and it only surfaces the existing reducer (no new policy, EX1/EX4 respected).

Next: **plan-004 step 1** — surface per-thread req coverage in `getState`/state (`packages/app/src/getState.ts`, the core thread/state type, possibly `state.ts` resource projection). STOP — waiting for `go` (or say "do whole plan" to run all three).

## Rafa:

- Do whole plan
- I we refine `requirements-driven-development-plan-002.md` will add `satisfied` column and more reqs will be green? Could we try it?

## AI:

**plan-004 done** — all 3 steps ✅, build + test green (14/14 integration incl. the new per-thread `reqCoverage` test). After a **Reload Window** the RDD thread's req node will read `🔒 locked · ⚠️ 5 gaps`, and the palette command becomes "Verify Thread Against Requirements".

**Now your experiment — yes, it'll work, and here's exactly what to expect.**

`plan-002` today is a **legacy 5-column table** (no `Satisfies` column at all — its steps parse to empty citations). Running **Refine** on it now (post-plan-003, req-aware) will: inject the locked req, switch it to the 6-column table, and have the AI cite the `IN`/`C` ids each step advances. Predicted mapping from plan-002's steps:
- step 1 (satisfies column / PlanStep) → **IN5**
- step 2 (`checkReqCoverage`) → **IN6**
- step 3 (`req_version` staleness) → **IN8**
- step 5 (planner cites) → **IN5**
- step 6 (semantic backstop) → **IN7**

IN5/IN6 are already covered by plan-003, so the **new** greens are **IN7 and IN8** → thread gaps drop **5 → 3** (remaining: IN1, IN2, IN4 — the Phase-1 doc-type/parser/lifecycle items that live in `plan-001`). Refine `plan-001` too and you'd hit **0 gaps / ✅ covered**.

**Two things before you run it:**
1. **I can't run it from here** — `loom_refine_plan` is sampling-only and CLI sampling is blocked (same boundary as the semantic verify). It has to be the extension's **Refine** button.
2. **Set `reslava-loom.ai.apiKey` in VS Code settings first** — refine *is* a sampling call, so without the key it'll fail exactly like the semantic verify did ("No AI API key configured"). Then **Reload Window** (to load the req-aware refine build), then right-click `plan-002` → **Refine**, then watch the req-node badge / re-run Verify.

**One honest trade-off:** this converts plan-002 from the truthful "retro-red" showcase into a green plan. That's fine — you're now demonstrating the *refine fix* instead, which is the more valuable story (the tool retroactively repairs an uncited legacy plan). Just flagging that we lose the red/green contrast we set up earlier.

If you'd rather see it go green **without** the AI (deterministically, precise citations I control), I can add the `Satisfies` column to plan-002 via `loom_update_doc` from here — but that tests `update_doc`, not `refine`. Your call which one you want to exercise.

Next: run Refine on plan-002 in the extension (after setting the API key + Reload Window) and paste the new Verify output — or tell me to do the deterministic `update_doc` version instead.

## Rafa:

doubt, why `loom_refine_plan` is sampling-only? 
I checked it and it is also available mcp tool

## AI:

Good catch, and the resolution is a distinction worth nailing down: **"available" ≠ "runnable here."** I just proved it — I called `loom_refine_plan` on plan-002 from this CLI session and got:

```
MCP error -32603: MCP client does not support sampling (sampling/createMessage returned MethodNotFound)
```

plan-002 is untouched (it fails *before* the save). Here's why both things are true at once:

- **Why it's listed/available:** tools are registered on the **server** (the `loom mcp` process). Every MCP host — CLI or extension — sees the full tool list, so `loom_refine_plan` shows up everywhere and is callable everywhere. Listing is a server fact.
- **Why it's "sampling-only":** its *implementation* does a **server→client sampling call** (`samplingAiClient` → `sampling/createMessage`). That's the server asking the **host** to run inference. Whether that works depends on the **host's** capabilities, not the server's:
  - **VS Code extension** advertises `{ sampling: {} }` and routes the call through your configured AI key → works.
  - **Claude Code CLI** does **not** advertise sampling — by design: Claude Code is *already* the AI, so a recursive "server asks the agent's host to run another model" call is intentionally blocked → `MethodNotFound`.

So the tool is invoked fine in CLI; it just hits a wall the instant it tries to generate. Same boundary as `loom_generate_*` and the semantic half of `loom_verify_req` (that's the same `MethodNotFound` you saw on the verify's semantic pass).

**Why `generate` has a CLI workaround but `refine` doesn't:** `generate` *creates a new doc*, so in CLI the agent (me) writes the body itself and passes it via `loom_create_*(content=…)` — no sampling. `refine` is "the AI re-reads and rewrites the existing doc in place" — the AI transform *is* the operation, so there's no content-injection shortcut. The thing that *does* let me write doc content from CLI is `loom_update_doc` — which is exactly the deterministic alternative I offered.

**Net for plan-002:** in this CLI session refine genuinely can't run. Two paths:
- **(extension)** set `reslava-loom.ai.apiKey`, Reload Window, right-click plan-002 → Refine — tests the real refine fix.
- **(here, deterministic)** I add the `Satisfies` column via `loom_update_doc` with the IN ids I predicted (IN5/IN6/IN7/IN8) — exercises `update_doc`, makes coverage drop 5→3 immediately, but doesn't test refine.

Next: tell me which — run Refine yourself in the extension, or have me do the deterministic `loom_update_doc` version now.

## Rafa:

We had an early chat about Loom AI constrain:
`Loom need only one AI to work with` (one payment way only)
I mean I am using Claude pro subs, I have no API Key, all Loom features should be available, extension included without need any API Key.

Now you tell me `refine` is not available through CLI and need to setup an API Key to be executed from extension.

This need to be solved.

### From extension

vsix code could pass the doc to be refined to AI

### From CLI

We should find a workaround, like update_doc but refine focused

### Suggestions

What you think? Suggestions?
Also we nee to add this Loom AI architecture constrain to CLAUDE.md and architecture-reference or other proper doc to never be forgotten again

## AI:

You're right that this matters, and it's a real architectural decision — so I'm going to lay out the landscape and stop for your call, not just patch it. **Vision tie:** this serves the element you're asserting — *Loom runs on the one AI the user already pays for* — and removes the manual step of funding/configuring a second provider. That's worth getting right at the architecture level.

**First, a hard technical correction to the premise — it reframes everything:** **Claude Pro is not API-accessible.** A Pro subscription powers claude.ai and Claude Code; there is no API key behind it. So "use my Claude Pro everywhere, including the standalone Loom extension" is *physically impossible* for the extension — an arbitrary VS Code extension cannot bill inference against a Pro sub. The achievable, honest version of your constraint is: **Loom must never require a *second, separately-paid* AI; it uses the AI of whatever host is driving the session.** With that framing, there are two separate problems with two different fixes.

**Problem A — refine (and the semantic verify) can't run in the CLI / agent host.**
Grounded in code: `loom_refine_plan` → `samplingAiClient` → `sampling/createMessage`, which Claude Code blocks by design (it's already the AI). `generate` has a CLI escape hatch (`loom_create_*(content=…)` — the agent writes the body, no sampling); refine has none.
- **Fix (recommended): give refine a content path, identical to create.** Add an optional `content` to `loom_refine_plan`/`refine_design`/`refine_idea`: when supplied, skip sampling and run the *same* merge/version/`satisfies` logic on the agent-authored body; sampling stays as the fallback for hosts that provide it. In the CLI, the agent (your Claude, already paid) reads `loom://context` + the req, produces the refined doc, and passes it. Zero second AI. Symmetric with the pattern we already trust.

**Problem B — the Loom extension requires `reslava-loom.ai.apiKey`.**
Grounded in code: the extension advertises `{ sampling: {} }`, and its handler calls `makeAIClient()`, which **throws without `reslava-loom.ai.apiKey`** (a separate Anthropic/OpenAI key). It does *not* use VS Code's built-in model access. This is the actual "second payment." Options:
- **(B1, recommended) Route the extension's sampling through VS Code's Language Model API (`vscode.lm`).** `vscode.lm.selectChatModels()` + `sendRequest()` uses the model access the user *already* has in VS Code (Copilot etc.) — no Loom-specific key, no second Loom bill. Honest caveat: that's "the AI you already pay VS Code/Copilot for," which may not literally be Claude — but it satisfies "no separate provider to fund for Loom." Requires the user to have an LM provider + a one-time consent prompt.
- **(B2) Demote the key to optional.** Try `vscode.lm` first; fall back to a configured key only if the user explicitly sets one. (B1+B2 together is the clean target.)
- **(B3) Drop standalone-extension AI entirely** and make the extension a thin UI that only does AI when an agent drives it. Cleanest conceptually, but removes a feature you built — probably too far.

**My recommendation: A + (B1 with B2 as the override).** That gives you: CLI/agent → your Claude does everything (no key); extension → VS Code's own model access (no Loom key); a configured key survives only as an opt-in escape hatch, never a requirement.

**On documenting it so it's never forgotten — three places, and one is already wrong:**
1. `loom/refs/mcp-reference.md` §"AI generation — via sampling" currently says *"Only Claude Code supports MCP sampling"* — that's **backwards** (Claude Code blocks it; the extension supports it). Needs correcting as part of this.
2. `loom/refs/architecture-reference.md` — add the single-AI constraint as a first-class architectural rule.
3. **Both** CLAUDE.md surfaces (the repo-root recursive file *and* the `LOOM_CLAUDE_MD` template in `installWorkspace.ts`) — this is a generic rule every Loom user needs, so it must mirror to both per the sync contract.

Proposed constraint statement (edit freely before I write it anywhere):
> **Loom single-AI constraint.** Loom must never require the user to pay for or configure a second AI provider. Loom's generative work is performed by the AI already driving the session: in an agent host (Claude Code CLI / IDE agent) the agent does it via content-accepting tools (`loom_create_*` / `loom_refine_*` / … with `content`) — Loom never samples there; in the standalone Loom VS Code extension, AI runs through VS Code's Language Model API (`vscode.lm`), never a bespoke `reslava-loom.ai.apiKey`. A configured key may exist only as an optional override, never a requirement.

This is a design decision (architecture + API shape) and a vision-level one, so I'm stopping here rather than building. **Decisions I need from you:**
1. Accept the premise correction (Claude Pro ≠ API key; constraint = "no *second* paid AI")?
2. Go with **A + B1/B2**? Or do you want B3 (extension does AI only under an agent)?
3. Approve / edit the constraint wording above.

Once you decide, I'd open it as a new thread or plan (it's bigger than the RDD thread — it's an AI-architecture change touching mcp + vscode + docs). STOP — waiting for your direction.

## AI:

Ran Verify after your extension refine. The result is a **partial success worth being honest about** — refine worked in *form* but not in *substance*:

**What worked (the plan-003 fix is live):**
- plan-002 is now a **6-column table** (`Satisfies` column added) — was legacy 5-col.
- Step descriptions are **enriched with `design §5.1/§5.2/…` references** — that's proof the refine actually saw the injected req + design context. The req-awareness wiring works end-to-end through the extension, no settings key needed.
- **All 7 steps are still ✅** — done-status survived the refine. That validates the merge logic (preserve `done`, never wipe) on a real run, not just my unit test.

**What didn't (the finding):**
- **Every `Satisfies` cell is `—`.** The model added the column and improved prose but cited **nothing**. So coverage is unchanged: `uncovered: [IN1, IN2, IN4, IN7, IN8]`, still 5 gaps. No reqs went green. My "IN7/IN8 → green" prediction was wrong *in practice* — the prediction assumed the model would do the step→req-id mapping; it didn't.

**Likely cause:** the extension's default model is `claude-haiku-4-5` (`makeAIClient.ts:7` — the anthropic default, unless you set `reslava-loom.ai.model`). Haiku is strong enough to reformat the table and enrich descriptions, but too weak to do the harder reasoning step — "which IN/C id does *this* step advance?" It silently left the citations blank rather than guessing. The deterministic merge then kept them empty (prior cells were also empty).

So the dogfood actually surfaced something useful: **the refine plumbing is correct, but citation *quality* is model-bound.** Three levers:
- **(a)** bump the model — set `reslava-loom.ai.model` to a Sonnet/Opus and re-refine; a stronger model should populate `Satisfies` and turn IN7/IN8 green.
- **(b)** I curate plan-002's citations deterministically here via `loom_update_doc` (I know the right mapping: step1/5→IN5, step2/4→IN6, step3→IN8, step6→IN7) — makes it green now, demonstrates the human-approves-citations path.
- **(c)** strengthen the refine prompt's citation instruction (but a weak model may still under-perform — model choice is the bigger lever).

This also feeds the AI-architecture thread above: the extension is using an Anthropic key (probably `ANTHROPIC_API_KEY` from your env, per `makeAIClient`'s fallback) on the haiku default — both the *provider* (single-AI constraint) and the *model* (citation quality) are live questions.

Next: (a) bump model + re-refine, (b) let me curate the citations deterministically to show it green, or (c) park and return to the single-AI architecture decision. Your call.

## Rafa:

- I think you forget extension launch terminal with AI CLI prompt, no problem, no API Key needed. This way user can observe AI working and interact, much better than sampling or API Key. That is the reason why I choose this method, and also fit in single-AI
- refine command uses CLI and Claude Opus High effort like this session
- single-AI architecture is grounded, needed to be memorized in CLAUDE.md and important docs


## AI:

You're right and I was analyzing the wrong path. The real mechanism, from `refinePlan.ts:14-21`:

- **Claude CLI installed (your case):** `launchClaude()` opens a Claude Code terminal with a task prompt; the Opus agent reads the plan + design and writes via `loom_update_doc`. The prompt literally says *"Do not use loom_refine_plan — sampling is unavailable in Claude Code CLI."* **No key, no sampling, single-AI, observable + interactive.** This is the primary path.
- **No Claude CLI:** only *then* does it fall back to `loom_refine_plan` → sampling → `makeAIClient` (the `reslava-loom.ai.apiKey` / haiku path I mistakenly treated as primary). My entire Problem-A/B analysis was about the fallback. Scratch it.

I've saved this to my own memory so I stop re-deriving it wrong.

**This also pins down the empty-`Satisfies` cause — and it's not model weakness.** The launch prompt in `refinePlan.ts:20` is: *"…read its parent design. Update the plan steps table to reflect the current design, then loom_update_doc…"* It says **nothing about the req or the Satisfies column.** So Opus did exactly what it was told: enriched the descriptions from the design (that's the `§5.x` references) and saved — and left `Satisfies` empty because nothing asked it to cite. **My plan-003 work made the `loom_refine_plan` *tool* + app use-case req-aware, but the extension's primary path never calls that tool — it uses a hand-written launch prompt that bypasses all of it.** That's the actionable gap: to make extension-refine populate citations, the **launch prompt** needs the req + Satisfies instructions (the same boundaries I put in the tool).

So three things fall out, and I want your direction before touching anything:

**1. Document the single-AI architecture (you directed this).** Proposed statement:
> **Loom single-AI constraint.** Loom never requires a second, separately-paid AI. The extension's AI actions launch a **Claude Code CLI agent** (`launchClaude`) with a task prompt; that agent (the user's Claude subscription) does the work and writes via content tools (`loom_update_doc` / `loom_create_*`) — never `sampling/createMessage`, never an API key. The agent is observable and interactive in the terminal. The `loom_refine_*` / `loom_generate_*` sampling path (`makeAIClient` + `reslava-loom.ai.apiKey`) is a fallback for when Claude CLI is absent, and is the only place a second provider appears.

Where: **CLAUDE.md (both surfaces** — repo-root recursive *and* the `LOOM_CLAUDE_MD` template, per your sync contract), **`architecture-reference.md`**, and **fix `mcp-reference.md`** whose §"AI generation — via sampling" still says *"Only Claude Code supports MCP sampling"* — backwards.

**2. Open decision — the sampling/key fallback.** Keep it (graceful no-Claude degrade), deprecate it, or **delete it** (you lean delete-legacy over shims)? If deleted, Claude CLI becomes a hard requirement and the `makeAIClient`/anthropic/openai clients + `reslava-loom.ai.apiKey` setting go away. This shapes the doc wording, so I need it before writing.

**3. Fix the extension refine launch prompt to be req-aware** (so citations actually populate) — a real follow-up, separate from the docs.

STOP — your calls on (1) wording, (2) keep/delete the fallback, (3) whether to fix the launch prompt now.

## Rafa:

1. document it
2. another Loom design decision was: Claude CLI as main but fallback to sampling, API Key for users that use it. So we keep fallback by Loom design. Also document it. Loom should ran with whatever AI way and only one is required.
3. Do the fix

## AI:

Done — all three, build green.

**1 + 2 — single-AI documented (fallback kept by design):**
- **CLAUDE.md (root)** — new "AI provider model — single-AI (by design)" section: primary = launched Claude CLI agent (no key), fallback = sampling + `reslava-loom.ai.apiKey`, *exactly one required, never both*. Also corrected the old sampling bullet that framed the key path as the extension's main behaviour.
- **`LOOM_CLAUDE_MD` template** (`installWorkspace.ts`) — mirrored the same generic rule, per the two-surface sync contract.
- **`architecture-reference.md` §2a** — added the explicit "Single-AI constraint (by design)" paragraph (its dual-path diagram was already correct).
- **`mcp-reference.md`** — fixed the **backwards** claims: §"AI generation" and §"Sampling" said *"Only Claude Code supports MCP sampling"* — now corrected (Claude Code CLI *blocks* it; the extension *provides* it as fallback), with a single-AI note.
- Saved to my own memory too (corrected: fallback is intentional, don't propose deleting it).

**3 — extension refine launch prompts are now req-aware** (`packages/vscode/src/commands/`):
- `refinePlan.ts` — the launch prompt now tells the agent to read the thread's `req.md`, keep the 6-column table, treat ❌ Excluded / ⛓ Constraints as hard boundaries, cover every ✅ Included, **fill each step's `Satisfies` with the IN/C ids it advances**, and preserve ✅ done status. This is the actual fix for the empty-citations problem — it lives in the launch prompt, where the behaviour is really governed.
- `refine.ts` (design) + `refineIdea.ts` — read the req and respect Excluded/Constraints (no `Satisfies`, no step table).

**To see it work:** Reload Window (extension build), then re-run **Refine** on plan-002. plan-002 currently has the 6-col column but empty cells (from the old prompt); the new prompt should populate IN5/IN6/IN7/IN8 and drop the thread to ~3 gaps. No model bump needed — it's Opus already; the prompt was the gap, not the model.

Next: Reload Window + re-refine plan-002 and paste the Verify output — that closes the loop on both the launch-prompt fix and your original "do reqs go green" experiment. Or tell me where you want to go.

## Rafa:

I ran refine plan-002 again, satisfied column has been filled
reqs gaps down from 5 to 3:
```
{
  "weaveId": "core-engine",
  "threadId": "requirements-driven-development",
  "structural": {
    "uncovered": [
      {
        "id": "IN1",
        "text": "A dedicated `req` doc-type — one flat `req.md` per thread, body = three ID'd lists, single stem (`type: req` + `req.md`) like `ctx`."
      },
      {
        "id": "IN2",
        "text": "Three immutable lists — `✅ Included` / `❌ Excluded` / `⛓ Constraints` — each item carrying a stable `IN`/`EX`/`C` id, parsed by a pure `parseReq`."
      },
      {
        "id": "IN4",
        "text": "Lifecycle: generate-from-chat extraction → user curates → explicit `finalize` lock → refine/reopen at version+1."
      }
    ],
    "excludedViolations": [],
    "unknownCitations": []
  },
  "semantic": null,
  "semanticError": "MCP error -32603: No AI API key configured. Set \"reslava-loom.ai.apiKey\" in VS Code settings."
}
```

Doing the experiment and req dogfood in Loom brings so many gaps and design settle downs

We could try `vscode-mcp-refactor`'s req via the extension

Suggestions?

## AI:

That closes the loop cleanly. Gaps 5→3, uncovered now `{IN1, IN2, IN4}` — precisely the Phase-1 doc-type/parser/lifecycle items that live in **plan-001** (still uncited). So the launch-prompt fix works end-to-end: refine read the req, cited IN5/IN6/IN7/IN8, and the deterministic check moved. Refine plan-001 the same way and you'd hit **0 gaps / ✅ covered** on the whole thread.

**On your reflection — yes, and it's worth saying plainly.** This one dogfood session surfaced, in order: refine was req-blind *and* discarded the AI's table; `loom_list_plan_steps` dropped citations; "Verify Plan" was misnamed (it's thread-scoped) and had no visible home; coverage had no per-thread badge; the AI-architecture doc was *backwards* in `mcp-reference.md`; and the big one — the extension's **launch prompts**, not the MCP tools, govern AI behaviour, so my whole tool-level fix was being bypassed. None of that came from planning; it came from *running* the feature on real docs. That's exactly the cheap validation worth doing — every one of those is a bug a real user would've hit, found for the price of locking a couple of reqs. The "design settle-downs" (single-AI now written into three docs) are the durable payoff.

**Suggestion — yes, do `vscode-mcp-refactor`'s req via the extension.** I checked: that thread has an idea, design, a chat, and 2 plans, so `generate_req` has real material to extract from. And the **Generate Req button uses `launchClaude`** (same dual path) — so it runs through your Claude CLI agent, **no API key needed**, you watch it work.

The full now-possible loop:
1. Right-click the `vscode-mcp-refactor` thread → **Generate Requirements** → it reads the chat/idea/design and writes a draft `req.md`.
2. **Curate** the Included/Excluded/Constraints, then **Finalize** (lock).
3. **Refine** its plan(s) → now req-aware → `Satisfies` populates.
4. **Verify** → watch coverage.

Honest framing: this still isn't a *pure* greenfield "req-first" demo (the plans predate the req, like RDD), because you don't have a brand-new feature in flight. But with the refine-to-cite loop working, it's the complete retro→green story on a *second, independent* thread — which is better validation than re-running RDD.

One choice for you: run **Generate Req cold** (don't let me pre-read the thread) so we honestly test the extraction quality, then paste the draft and we critique what the AI pulled vs. what you'd have written. That's the more useful dogfood than me predicting it first.

Next: generate the req on `vscode-mcp-refactor` in the extension and paste the draft — or tell me to pre-read the thread and predict it first.

## Rafa:

I ran Generate Requirements in `vscode-mcp-refactor` thread, generated `loom/vscode-extension/vscode-mcp-refactor/req.md`
I locked it, and verify -> 6 gaps:
```
{
  "weaveId": "vscode-extension",
  "threadId": "vscode-mcp-refactor",
  "structural": {
    "uncovered": [
      {
        "id": "IN1",
        "text": "Extension has **no imports from `packages/app/`** — all direct app dependencies removed."
      },
      {
        "id": "IN2",
        "text": "Add a new `mcp-client.ts` — a stdio MCP client wrapper for the extension."
      },
      {
        "id": "IN3",
        "text": "Tree view reads state via the `loom://state` resource instead of calling `getState()`."
      },
      {
        "id": "IN4",
        "text": "All mutations go through `loom_*` tools (and workflow prompts) rather than app use-cases."
      },
      {
        "id": "IN5",
        "text": "Commands/buttons call MCP tools or prompts instead of app use-cases directly."
      },
      {
        "id": "IN6",
        "text": "Extension becomes a thin UI wrapper around the MCP protocol, holding no domain logic."
      }
    ],
    "excludedViolations": [],
    "unknownCitations": []
  },
  "semantic": null,
  "semanticError": "MCP error -32603: No AI API key configured. Set \"reslava-loom.ai.apiKey\" in VS Code settings."
}
```

What you think?


## AI:

Cold extraction — honest read: **the substance is right, the granularity is sloppy.** That's a useful finding, not a failure.

**Wins:**
- **Faithful, no hallucination.** Every item maps to the real refactor (`vscode → mcp → app`): no-app-imports, add `mcp-client.ts`, tree reads `loom://state`, mutations via `loom_*`. It pulled the actual design, not invented scope.
- **C2 is excellent** — *"the MCP client exposes exactly `readResource` / `callTool` / `callPrompt`."* Concrete, testable, the kind of constraint a human would be glad they wrote down.
- **EX1** (defer live extension-host testing) is a clean, correct exclusion — same shape as RDD's "no interaction testing."
- **EX2 ↔ IN6** is a decent include/exclude pairing (no domain logic in the extension, stated both positively and as a boundary).

**The real weakness — over-splitting / non-orthogonal Included items:**
- **IN6 isn't a requirement, it's the thesis.** *"Extension becomes a thin UI wrapper holding no domain logic"* is the *outcome* — the sum of IN1+IN4+IN5. It belongs in the title/goal, not as a line item you'd cover with "a step."
- **IN5 ≈ IN4.** "Commands/buttons call MCP tools instead of app use-cases" (IN5) is "all mutations go through `loom_*`" (IN4) from the button angle. Two phrasings of one rule.
- So of 6 Included, ~2 are redundant. Coverage will still work (a step can cite several), but it inflates the gap count and muddies "did we cover everything."

**The finding for the *generator*:** `generate_req`'s extraction tends to **restate the same scope at different altitudes** (deliverable vs. outcome vs. angle). Worth a line in the generate-req prompt: *"Included items must be orthogonal and individually verifiable; put the overall outcome in the title, not as an item; don't restate one requirement from two angles."* That's a real prompt improvement this dogfood earned.

**6 gaps** is the expected retro state — plan-001/002 predate the req and cite nothing. Same pattern as RDD.

Two ways forward, your pick:
- **(a) Curate first (recommended), then refine plans.** Reopen the req (Refine Requirements), merge IN5→IN4 and demote IN6 to the title, re-lock at **v2**. Bonus: that exercises the **req reopen→relock + `req_version` staleness** path (RDD's IN8) live on a second thread — does the tree mark plan-001/002 stale after the bump? Then refine the plans to cite the cleaned-up ids → Verify.
- **(b) Refine plans now**, leave the req as-is — faster path to green, skips the curation/staleness test.

I lean (a) — it both fixes the req quality *and* dogfoods the staleness machinery you haven't exercised yet. Next: tell me (a) or (b), and whether you want me to draft the merged req body (I'd hand it to you to paste via Refine, since I can't sample) or you curate it directly in the extension.

## Rafa:

What if we do:
- Add the line in the generate-req prompt
- I refine the plan

I do not like do manual editing, it is not truthful

## AI:

Agreed — fixing the generator instead of hand-editing is the truthful path. I saved that as a standing principle so I stop offering to patch artifacts by hand.

**Done (built):** added the orthogonality rule to the req generator in both places:
- `REQ_BODY_SHAPE` in `commands/req.ts` — shared by **Generate Req *and* Refine Req** (the launch-prompt path you use): *"each ✅ Included item must be orthogonal and individually verifiable; don't restate one requirement from two angles; don't add the overall outcome/thesis as an Included item (that's the goal); prefer fewer, sharper items."*
- The `loom_generate_req` sampling prompt in `generate.ts` — same line, so the fallback path stays consistent.

**Correction to my earlier (a) — I was wrong about the staleness bonus.** Re-generating the req is the right truthful fix, but it will **not** mark plan-001/002 stale: `req_version` staleness only fires on downstream docs that recorded a `req_version` baseline (i.e. were built *after* a locked req). These plans **predate** the req, so they have no baseline to compare — correctly, they won't flip stale. To actually exercise staleness you'd need a plan generated *after* the lock, then re-lock at v2. So drop that as a reason; the reason to re-generate is purely req quality.

**Truthful sequence (no manual editing anywhere):**
1. **Reload Window** (picks up the new prompt).
2. **Refine Requirements** on `vscode-mcp-refactor` → it re-extracts from the chat with the orthogonality rule → should collapse IN5→IN4 and drop IN6 (the thesis). Re-opens to draft + bumps to v2.
3. Glance at the result, **Finalize** to re-lock.
4. **Refine** plan-001 and plan-002 → now req-aware → `Satisfies` populates against the cleaner ids → **Verify**.

That gives a fully tool-produced artifact at every step — exactly the truthful dogfood. Next: Reload Window, re-run Refine Requirements, and paste the new req body — we'll see if the orthogonality rule actually sharpened it (and that itself tests whether the prompt fix works).

## Rafa:

I did 1, 2, 3, when i was about to do 4 i noticed plan `loom/vscode-extension/vscode-mcp-refactor/plans/vscode-mcp-refactor-plan-001.md` are empty now

## AI:

Investigated before touching anything. **Good news: today's Refine Requirements did NOT empty it.** Git proof:
- `vscode-mcp-refactor-plan-001.md` and `-plan-002.md` are **not in this session's modified files** — their current empty state matches `HEAD`. They were committed empty *before* today.
- Refine Requirements only writes `req.md`. It never touched these plans.

**But it IS a real, pre-existing data-loss bug — and the dogfood just surfaced it.** History of plan-001:
- At the **earliest commit** (`d023adb`, the original MCP-refactor commit) plan-001 had a **full 6-step table** — in the *old* column format `| # | Step | Status | Notes |`, plus Definition-of-Done and Notes sections. Real, implemented work.
- By a later commit it was **empty** — body reduced to a doubled `## Steps` header with no rows. The loss happened around `115e9ca "apply ULID migration to all loom/ docs"`.

**Mechanism (high confidence):** the migration/reformat ran `parseStepsTable` on the old `| # | Step | Status | Notes |` format. The current parser expects `Done | # | Step | Files touched | Blocked by | [Satisfies]` — the old format **doesn't parse**, so `parseStepsTable` returned `[]`, and `updateStepsTableInContent` then **overwrote the populated table with an empty one**. Silent wipe. (The later title-sync commit just normalized `# Steps` → `## Steps`, giving the doubled header.) plan-002 was hit the same way.

This is the **exact class of bug my plan-003 refine fix guards against** (empty/unparsed → don't wipe) — but it already happened here historically, in the *migration* path, which has no such guard.

So two things, and both are your call (I've touched nothing):

**1. Recovery (truthful — it's in git, not invention).** The full original steps survive at `d023adb`. Options:
- **(a)** I reconstruct plan-001/002's tables in the *current* 6-column format from the git original (same steps, all ✅ done since they shipped), via `loom_update_doc`. Faithful migration of real history — then they parse, and step 4 (cite the req) becomes possible.
- **(b)** Leave them empty (they're `done`; the work shipped) and skip citing them — accept that vscode-mcp-refactor can't go fully green.

**2. The root-cause fix (recommended follow-up).** Guard `updateStepsTableInContent` (and/or the save path) to **never replace a non-empty steps table with an empty one** when `parseStepsTable` yields zero rows — refuse and keep the original, same principle as the refine fallback. That stops any future reformat/migration from silently wiping tables.

This blocks your step 4 either way. STOP — tell me: recover via (a) or (b), and whether to add the guard (2) now as its own small plan.

## Rafa:

recover via (a)
fit root-cause

## AI:

Both done.

**Recovery (a) — complete and verified.** Restored both plans from git, faithfully, in the current 6-column format:
- **plan-001** — 6 steps (mcp-client.ts, tree→`loom://state`, chat command, weaveIdea, remaining commands, remove app imports), all ✅, from `d023adb`.
- **plan-002** — 6 steps (sampling handler, chatReply revert, `loom_do_step`, doStep command, toolbar button, EDH test), all ✅, from `560038c`.
- Both kept their Definition-of-Done + Notes, carry a transparent **"Recovered 2026-06-06 from git commit …"** note, bumped to v2, status still `done`. Wrote them via `loom_update_doc` (re-parses the table → real steps), and read plan-001 back to confirm the table persisted.

**Root-cause fix — shipped + tested.** Added a data-loss guard to `updateStepsTableInContent` (`planTableUtils.ts`): **it now refuses to replace a populated steps table with an empty one** when the new table would be empty (the parse-miss case). Detection is format-agnostic, so it catches a *foreign/legacy* table that `parseStepsTable` can't read — exactly the migration scenario that wiped these plans. New regression test in `plan-table-utils.test.ts` (legacy populated table + empty steps → untouched; genuinely-empty section → still fillable). `build-all` + `test-all` green (14/14 integration).

So the dogfood's biggest catch is closed: it found a **silently-shipped data-loss bug in real plans**, we recovered the data from git, and we guarded the cause so no future reformat/migration can repeat it. (One note: the guard is in `dist` but the live MCP in this session is stale until you reconnect/Reload — recovery didn't need it, but the guard goes live on reconnect.)

**Step 4 is now unblocked.** The recovered plans have real steps with empty `Satisfies`. To finish the vscode-mcp-refactor loop: **Refine** plan-001 and plan-002 in the extension (now req-aware) → they'll cite the (cleaned, once you re-generate) req → **Verify** → coverage drops toward green.

Next: re-run **Refine Requirements** to apply the orthogonality fix to the req, then **Refine** the two recovered plans, then **Verify** — and paste the results. Or tell me where you want to go.

## Rafa:

I did all. reqs shows ✅covered.
commit, push all