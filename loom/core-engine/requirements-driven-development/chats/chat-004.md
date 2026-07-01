---
type: chat
id: ch_01KTYKYVPKVXRP7X5YE8BG9SZ2
title: loom_refine_req fix
status: done
created: "2026-06-12T00:00:00.000Z"
updated: 2026-06-14
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 16
---
# loom_refine_req fix

## Rafa:

### Problem

In a thread with plan and reqs already, when we create a new plan and use `loom_refine_req` to generate new reqs for the new plan, will use same numbering hidding first plan INs handles

### How to fix

make `loom_refine_req` **append-only / immutable**:
if first plan have IN1 to IN6...
- New plan in thread → **append** fresh handles (`IN7`, `IN8`, …); **never renumber, reuse, or delete** a handle.
- A deferred plan-1 IN **stays in the req** as an uncovered Included item → `verify` keeps surfacing it until some plan covers it. (Deferral tracking preserved.)
- A superseded/abandoned requirement gets a **status marker** (e.g. struck-through or a `~deferred`/`~dropped` tag), not removal — so citations to it still resolve.

With that, `verify` checks **every** plan against the cumulative req and it's correct by construction: no dangling citations, no collisions, and nothing disappears. 

**Net:** the fix is a guard in `loom_refine_req` (refuse/warn on renumber-or-delete of an existing handle; only allow append + status changes). 

### Target version

v1.6.1

What you think?

## AI:

**Vision tie:** serves "AI faithfully acts on durable user-authored intent" — removes the manual step of re-checking that requirement handles didn't get scrambled when a thread's req grows across plans.

### You're right on the principle

The root cause isn't numbering — it's that an `IN`/`EX`/`C` handle is a **citation target** (plan steps point at it via `satisfies`). Once a handle is cited it's a primary key: renumber or delete it and every citation either dangles or silently re-points to the wrong requirement. So the real invariant is **handle stability / referential integrity**, and "append-only + status marker, never renumber/delete" is the correct shape. Agreed.

Four sharpenings so we fix the cause, not paper the symptom.

### 1. The guard belongs in core, at the req-write choke point — not as advice inside one tool

Today `loom_refine_req` blind-saves whatever `content` the agent hands it (`refineReq` use-case, `app/src/req.ts:108` — no diff, no check). The bug is the agent regenerating the body from scratch and renumbering. So the fix is a **pure deterministic check in core** — `diffReqHandles(prevParsed, nextParsed) → violations` — called inside the `refineReq` use-case *before* save: **refuse** on renumber/delete of an existing handle; allow append + status change. Pure, runs always, and because both the extension and a CLI agent go through that one use-case it covers both paths. (One thing to confirm: that `loom_update_doc` can't also write a `req` body and sneak past it — if it can, the check moves down to the save path so there's no back door.)

### 2. Refine becomes a *merge*, not a *regenerate*

"Re-extract from the chat" and "append-only" are in tension — a fresh extraction produces a fresh list. So `refine_req` has to **reconcile against the existing req**: keep matched handles stable, append genuinely-new items as `IN7+`, mark removed ones dropped. The semantic "is this the same as `IN3`?" match is AI work; `diffReqHandles` is the deterministic backstop that makes the merge *safe by construction*. Right division of labor: AI proposes the merge, pure core refuses an unsafe one.

### 3. Minimal status model — only "dropped" needs a marker

Your two cases collapse to **one** new state:

- **Deferred** (in scope, no plan covers it yet) needs **no marker at all** — an uncovered Included item already surfaces in `verify` as uncovered. That's deferral tracking for free.
- **Dropped / superseded** needs the marker: it must stay citation-resolvable *and* be **exempt** from the "every Included needs a covering step" check, or `verify` nags forever.

So it's a single field: `status: active | dropped` on Included items. That's a real (small) schema touch — `ReqItem` grows a `status`, and `parseReq` learns to read the marker. I'd avoid strikethrough (`~~…~~` is display, not data); a parseable token like `` - `IN3` ~dropped …`` keeps `parseReq` trivial and round-trip stable. **This is the one call I'd want from you:** the exact marker syntax, and whether a dropped `IN` stays inline in Included or moves to a "Dropped" tail.

### 4. Cross-plan coverage must aggregate, or "correct by construction" doesn't hold

Your "verify checks every plan against the cumulative req" only works if the coverage reducer counts a covering step in **any** plan in the thread, not just the active one — `IN3` covered by plan-1, `IN7` by plan-2, both satisfied. Need to confirm `reqCoverage` aggregates across all thread plans; if it's per-plan today, fixing that is part of this work.

### Scope / version

The guard alone is a true patch (v1.6.1). The dropped-status marker + `parseReq` change + cross-plan aggregation is a small *feature*. Worth deciding up front: ship 1.6.1 as **guard-only** (refuse renumber/delete; no dropped-marker yet) and land dropped-status in 1.7.0 — or do it all together. My lean: guard + cross-plan aggregation are the integrity core, do them together; the dropped-marker can follow once we've settled its syntax.

### One conceptual confirm

`req` is **thread-scoped and cumulative**, never plan-scoped — a second plan doesn't get "its own reqs," it appends to the one thread req. Your append-only rule enforces exactly that, so we're aligned; I just want to make sure the model in your head is "one growing thread spec," not "reqs per plan." If it's the latter, that's a bigger design fork worth opening before any code.

## Rafa:

Agree all.

### Scope / version

All together: 1.7.0

### One conceptual confirm

yes, `req` is thread-scoped and cumulative

### Tool name

Maybe we should rename `loom_refine_req` to `loom_merge_req` to make it semantically correct?

## AI:

Locked in: **all together, v1.7.0**, `req` thread-scoped & cumulative confirmed.

### On the rename — yes, `loom_merge_req`

I'll push slightly past "maybe" to a recommendation: **rename it.** The reason is protective, not cosmetic. The whole feature exists because an agent treated `req` as free-rewritable and clobbered handles. The name is the first thing the agent reads — `refine_req` *invites* the exact assumption we're killing ("refine = rewrite this doc, like refine_idea/design/plan"). `merge_req` advertises the contract up front: incoming extraction is **reconciled** against the existing spec, not substituted for it. Name-as-guardrail, and it's the truthful description of `diffReqHandles` + append-only.

Worth being clear-eyed about the one real cost: **it breaks family symmetry.** `req` becomes the only doc-type without a `refine_*` tool. I think that's *acceptable and even desirable* here — `req` genuinely is the odd one out (the only append-only, immutable-handle doc), so a different verb signals a different contract rather than hiding it. But we should say so in the tool description so the divergence reads as intentional, not an oversight.

Two conditions so the rename stays honest:

1. **`merge` must still carry the full refine semantics it has today** — re-open `locked → draft`, bump `version`, mark downstream idea/design/plan stale. "Merge" names the handle-reconciliation; it must not quietly drop the staleness-propagation half. The description should state both: *"reconciles new/changed requirements into the thread spec under append-only rules (never renumbers or deletes a handle), re-opens a locked req to draft, and bumps version → downstream stale."*
2. **Rename the app use-case too** (`refineReq → mergeReq` in `app/src/req.ts`) and the `diffReqHandles` call site, so the layer names agree end to end — no `merge` tool calling a `refine` use-case.

Keep **`loom_generate_req` as-is**. The pairing just shifts from generate↔refine to **generate (birth) ↔ merge (evolve)**, which actually reads cleaner for this doc-type: you generate the spec once, then every later change merges into it.

Breaking rename is fine at 1.7.0 — no compat shim, no `refine_req` alias left behind (your clean-no-legacy rule). Straight delete-and-replace.

So the 1.7.0 shape is: `loom_create_req` · `loom_generate_req` · **`loom_merge_req`** · `loom_finalize_req` · `loom_verify_req`. Want me to turn all of this into a Phase-2-followup plan (or a fresh thread plan), or keep refining the design first?

## AI:

Good instinct to weigh it — `merge` names the *mechanism* (combine two versions), but the thing we actually want the name to advertise is the *contract* (additive, non-destructive, handles are permanent). A few candidates ranked by how well they signal that contract:

- **`loom_amend_req`** — my pick. "Amend" is the document/legislative sense: you add amendments, you mark clauses repealed, you **never delete or renumber** existing ones. That maps 1:1 onto append `IN7+` / mark dropped-not-removed / handles immutable. It describes the *contract*, which is exactly what we want the agent to internalize. One wrinkle: in git, `amend` means "replace the last commit" — but in the context of a *requirements spec* the legal/spec meaning dominates and disambiguates. Reads naturally: "amend the req."
- **`loom_merge_req`** — close second. Familiar (git merge = reconcile, non-destructive), accurate to the reconcile-incoming-against-existing operation. Slightly weaker than `amend` because merge is about combining *branches/versions*, not about the immutability rule itself.
- **`loom_reconcile_req`** — most *precise* to the diff-and-integrate step, but heavier and more jargon-y; a mouthful next to the other `loom_*` verbs.
- **`loom_extend_req`** — truthful to the common case (append growth) but too narrow: it undersells the "mark dropped / reconcile a changed item" half, implying add-only.

I'd reject `update` (collides with `update_doc` and "update" implies overwrite — the very assumption we're killing) and `sync`/`revise` (both connote destructive mirror/rewrite).

**Recommendation: `loom_amend_req`** — it's the one name where the contract ("additive, immutable handles, repeal-don't-delete") is legible from the verb alone. Same two conditions as before still apply: it must still re-open `locked→draft` + bump version + propagate staleness, and the app use-case renames to match (`amendReq`).

So the candidate 1.7.0 shape: `loom_create_req` · `loom_generate_req` · **`loom_amend_req`** · `loom_finalize_req` · `loom_verify_req`. Your call between `amend` and `merge` — both are defensible; I just think `amend` tells the truth louder.

## Rafa:

I pick `loom_amend_req` but it come to my mind `loom_append_req` or `loom_append_new_reqs`, what you think?


## AI:

Stick with **`loom_amend_req`** — `append` is a subset of what the tool does, so it would undersell and mislead.

The tool does three things: (1) **append** new handles `IN7+`, (2) **mark** an existing item dropped/superseded — a *status change on an existing line*, not an append, and (3) **re-open** `locked→draft` + bump version + propagate staleness. `append` only names (1). An agent reading `append_req` would be surprised it also repeals items and re-opens a locked spec — the name would be lying by omission about exactly the parts that make this feature safe. `amend` is the only verb that covers all three: amendments add, amendments repeal (mark, don't delete), and amending a locked document re-opens it. 

Two more nits against the append variants:
- `loom_append_new_reqs` breaks the family — every sibling is singular `_req` (`create_req`, `generate_req`, `finalize_req`, `verify_req`); a plural `_new_reqs` reads bolted-on.
- You already have **`loom_append_to_chat`**, which is a *pure* add-to-end. Reusing "append" for req would imply the same pure-add semantics in your tool vocabulary — precisely the wrong mental model here.

So: **`loom_amend_req`** it is. That settles the API surface. Ready to turn the full design into the 1.7.0 plan whenever you want — say the word.

## AI:

Plan created → `requirements-driven-development-plan-005.md` (`pl_01KTYY898NNAD8KVNC649J54PW`).

**Scope-shrinking finding while grounding the plan:** Phase 2 is more shipped than our chat assumed. `PlanStep.satisfies` exists, `checkReqCoverage` exists, and crucially **`loom_verify_req` already aggregates steps across *all* thread plans** (`thread.plans.flatMap(p => p.steps)` in `verifyReq.ts:55`). So my concern #4 (cross-plan coverage) is **already correct** — it's out of scope. The real gap is narrower than "Phase 2": just the integrity guard, the dropped-status model, and the rename.

Five steps, layered core → app → mcp → vscode → release:

1. **core (pure):** `ReqItem.status: active|dropped`; `parseReq` reads a `~dropped` marker; `checkReqCoverage` exempts dropped from `uncovered` (but keeps it citation-resolvable); new `diffReqHandles(prev,next)` — every prior handle must survive, new ids are appends. Unit-tested.
2. **app:** `refineReq → amendReq`, runs `diffReqHandles` before save and **throws** on delete/renumber (escape hatch = `~dropped`); keeps re-open + version-bump.
3. **mcp:** `loom_refine_req → loom_amend_req` (rename file + tool + description), guard violations surfaced as clean findings, old registration deleted (no alias).
4. **vscode:** req node *Refine* button → *Amend*, launch-prompt updated to "amend, don't rewrite".
5. **build + test + smoke + lockstep 1.7.0 bump.**

**One honest gap I want to flag (recursive dogfooding):** this new scope — the dropped-status model and the integrity guard — isn't represented in *this thread's own* req (`IN1`–`IN9`). I cited the nearest existing handles (`IN2` immutable/stable-ids, `IN6` coverage reducer, `IN4` lifecycle) but strictly we should `amend` the thread req to add `IN10`+ for "handle referential integrity" and "dropped status", then have the plan cite those. We can't use `loom_amend_req` to do it (doesn't exist yet) — the bootstrap is to append carefully via the current `loom_refine_req`, *not renumbering*. Want me to do that req amend first (proper RDD order), or build the feature and backfill the req handles at the end?

That's the one open call; otherwise the plan's ready to start.

## Rafa:

Could we do that with current `loom_refine_req`? I think it will create IN1
In my opinion better approach is do the plan, dogfood new `loom_ammed_req` in this thread and test it.

If you agree, do whole plan

## AI:

Agreed — and you're right about the bug: today's `loom_refine_req` would re-extract from the chat and very likely hand back a body starting at `IN1`, clobbering the existing handles. That's literally the defect we're fixing, so bootstrapping the req with it would be self-defeating. Build first, then dogfood the *new* `loom_amend_req` to add `IN10`+ to this thread — that's the cleanest possible integration test (the feature proves itself on its own thread).

One caveat so we're not surprised: the **live in-session `loom mcp` is stale after a build** — it won't expose the renamed `loom_amend_req` until a session/MCP restart. So this session, the dogfood happens via the **step-3 integration test** (it spawns a fresh `loom mcp` from `dist`, so it *does* see the new tool). Actually calling `loom_amend_req` here in the chat to append `IN10`+ to this thread's `req.md` is a post-restart follow-up. I'll flag it at the end rather than fake it.

Authorized for the whole plan — starting now, doing all 5 steps without stopping between them (error-loop and any design-fork still interrupt). I'll mark ✅ and append a done note per step.

## AI:

**Plan 005 implemented — steps 1–4 ✅, step 5 all but the live dogfood.**

- **core:** `ReqItemStatus`, `parseReq` reads `~dropped`, `checkReqCoverage` exempts dropped, new pure `diffReqHandles` guard.
- **app:** `refineReq → amendReq` with the guard (throws naming the dropped handle on delete/renumber).
- **mcp:** `loom_refine_req → loom_amend_req` (deleted old, no alias), guard violation returned as a clean `{ ok:false, error }`; moved into the `req` tool group; integration test asserts append ok / delete refused / old tool gone.
- **vscode:** *Refine Requirements → Amend Requirements*, append-only launch prompt.
- **docs:** `loom-requirements-reference.md` (handle-immutability + dropped-status + amend), both CHANGELOGs, lockstep **1.7.0** across all `packages/*`.
- **Build green; full `test-all` green (17/17 MCP integration incl. the new amend block; req / req-coverage / req-diff / req-usecases all pass).**

**Ready for the live dogfood — reconnect MCP when you're set.** The running session still holds the stale `loom_refine_req`; after you reconnect, `loom_amend_req` is live and I'll use it on *this very thread* to append the new requirements this work introduced — proving the feature on its own req. Proposed handles to append (no renumber of IN1–IN9):

- `IN10` Requirement handles are immutable for the life of a thread — append-only; never renumber/reuse/delete; enforced by a pure guard on every amend.
- `IN11` `~dropped` retires an Included item while keeping its handle citation-resolvable and exempt from coverage.
- `IN12` The req evolve-path is `loom_amend_req` (reconcile under append-only rules), replacing refine for `req`.

Tweak that list however you like. Nothing is committed yet — I'll hold the git commit for your go too.

## Rafa:

thread already show 1 req gap
mcp reconnected
vsix pacaked and installed to have loom_ammed_req available from extension
launched loom_ammed_req from extension
generated correct IN10, IN11, IN12
i locked req
but it shows 4 gaps (1 previous and 3 new)


## AI:

`verify` confirms the 4 uncovered are **`IN1`, `IN10`, `IN11`, `IN12`** — all Included, no excluded-violations, no dangling citations. Two groups, **one root cause.**

- **`IN1` (the old gap):** Phase-1 `plan-001` built the `req` doc-type but none of its steps cite `IN1` in `satisfies`. A citation that was simply never added.
- **`IN10` / `IN11` / `IN12` (the 3 new):** `plan-005` implemented *exactly* these — the `diffReqHandles` guard, the `~dropped` model, the `loom_amend_req` rename — but its steps were authored and **completed before the handles existed** (I created the plan citing IN2/IN4/IN6; you added IN10–12 afterward via the amend dogfood). So no step cites them.

**This is the feature working, not failing.** We inverted RDD's own order — `chat → req → idea → design → plan` — by building plan-005 *before* the req existed (we had to; the tool we were building didn't exist yet). The coverage check correctly flags that the plan doesn't cite the spec. Good sign: it caught real drift on its own thread.

**But it exposes a genuine hole.** Once a step is `done`, there's **no way to record that it satisfies a requirement** — `loom_update_step` edits pending steps only; done steps are immutable. So *any* time a requirement is added or clarified mid-thread (which RDD explicitly invites, via amend + re-lock), the work that already satisfies it can never be cited → a permanent false gap. `IN1` is that same hole, just aged.

**Your call:**

- **A — keep done-steps fully immutable.** The 4 gaps stand as an honest "should've been req-first" scar. Zero new code, but this thread never goes green and `verify` cries wolf forever over work that's genuinely complete.
- **B — let `satisfies` be amendable on a done step** (narrow: citations only — never `description`/`files`/done-ness). Rationale: `satisfies` is *traceability metadata* ("what this work served"), not the immutable *record of what was done* — annotating it later doesn't rewrite history. Then cite `IN1` on plan-001 and `IN10`–`IN12` on plan-005 → thread goes green. Small change: relax the done-step guard in `loom_update_step` for the `satisfies` field only (or a dedicated `loom_cite_step`).

I recommend **B.** The dogfood found a real, recurring need (cite completed work against a later-clarified requirement), and the fix is principled rather than a workaround. Since 1.7.0 isn't tagged yet, it could fold in as part of this release, or land as 1.7.1.

One caveat to decide under B: do we let a done step cite *any* requirement (trusting the author), or only flag-and-let-human-confirm? I'd keep it author-trusted and lean on the semantic verifier to catch a bogus citation — same trust model as citing on a pending step.

Nothing committed yet. Want me to spec B (and fold it into 1.7.0), or leave the gaps as the honest record?

## Rafa:

From now on, new threads where reqs are created before a plan will no have this kind of gaps, correct?

But anyway I think will be useful to implement B and fold into 1.7.0 to fix possible future issues, agree?

If so, do B then, try new loom_add_step in plan, the do it. Agree?

Then finish release

## AI:

**Q: req-first new threads won't show these gaps — correct?** Largely yes. With `req` authored first, the planner cites `satisfies` as it generates each step (the `IN5` prevention contract), so every Included handle is covered at authoring time and `verify` is green from the start. The gap only re-appears if you **amend the req mid-thread** to add/clarify a requirement *after* steps are already done — which is exactly the case **B** fixes. So: req-first kills the *bootstrap* gap; B kills the *mid-thread-amend* gap. Together → green by construction.

**Agreed: implement B, fold into 1.7.0.** And yes — I'll build the B plan dogfooding `loom_add_step`, then implement.

**Mechanism (grounded in the reducer):** the block is `planReducer`'s `UPDATE_STEP` case — a `done` plan rejects it at the plan level (`:63`) and a done step rejects it again (`:70`). B relaxes both, but **only for a citation-only patch** (`satisfies` present, `description`/`files`/`blockedBy` all absent): that's traceability metadata — "what this work served" — not the "what I did" record, so it may be amended on a done step / done plan. A `cancelled` step still rejects it (cancelled work satisfies nothing). One tool, one narrow rule — no new `loom_cite_step` surface.

**Plan (B) — 3 steps, built via `loom_add_step`:**
1. **core** — citation-only relaxation in `planReducer` UPDATE_STEP + unit tests.
2. **close the gaps** — cite `IN1` on plan-001's covering step, `IN10`/`IN11` on plan-005 step 1, `IN12` on plan-005 step 3 → `verify` 0 uncovered.
3. **build + test + finish the 1.7.0 release** (commit + tag + push).

**One heads-up:** step 2 cites via the *live* `loom_update_step`, which won't have the new reducer until you reconnect MCP after the step-1 build (same stale-MCP situation as before). So I'll implement + build + test step 1, then **stop and ask you to reconnect** before citing. Starting now.

## AI:

**B step 1 ✅** — built plan-006 by dogfooding `loom_add_step` (3 steps, worked cleanly), then implemented the reducer relaxation: in `planReducer` UPDATE_STEP a **citation-only** patch (`satisfies` and nothing else) is now allowed on a done step *and* a done plan; `cancelled` steps and any non-citation edit on a done step still reject. New `step-crud` test block covers all four cases; build + full `test-all` green.

**Stop for reconnect.** Step 2 cites the four gaps through the *live* `loom_update_step`, which still holds the old reducer (it would reject a done-step edit). **Reconnect MCP** and I'll cite `IN1` (plan-001), `IN10`+`IN11` (plan-005 step 1), `IN12` (plan-005 step 3), then re-run `loom_verify_req` → expect 0 uncovered. After that, step 3 finishes the 1.7.0 release (CHANGELOG note, commit, tag, push).

## AI:

**Done — v1.7.0 shipped.**

- **B step 2 (live):** cited `IN1` (plan-001), `IN10`+`IN11` (plan-005 step 1), `IN12` (plan-005 step 3) through the relaxed `loom_update_step` → `loom_verify_req` returns **0 uncovered**. The mid-thread requirements were cited onto already-`done` steps — the exact thing the old reducer refused. B is proven on its own thread.
- **B step 3 (release):** fixed `loom_update_step`'s tool description (citation-only-on-done exception), CHANGELOG note, build + `test-all` green, committed `f82fc56`, tagged **`v1.7.0`** (annotated), pushed `main` + tag.

Net for the session: `loom_refine_req → loom_amend_req` (append-only, `diffReqHandles` guard, `~dropped` retire) **and** cite-on-done — both dogfooded end-to-end on this thread, which now verifies clean. The release workflow will cut the GitHub release from the `[1.7.0]` CHANGELOG section.

One genuinely useful thing this session surfaced for free: the **req-first inversion** is what created the gaps, and B is the durable fix for the recurring "requirement clarified after the work was done" case. Worth remembering as the canonical argument for authoring `req` before the plan.

`close` whenever you're ready — or point me at the next thing.