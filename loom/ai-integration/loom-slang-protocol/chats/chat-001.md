---
type: chat
id: ch_01KX916TWVHKF2GV76CWDT1JAX
title: loom-slang-protocol Chat 001
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 22
---
# loom-slang-protocol Chat 001

## Rafa:

read idea

is it all grounded

create a table with all CLI / MCP commands, mark the ones that are candidate to be pointed by human user and if it is possible candidate or not for a slan word(s) (1 or 2) and suggestion(s)(1 or 2)

i a slang chain 2 ot 3 commands show it explicity bellow

## AI:

## Is the idea grounded?

Yes — all three seed mappings resolve to real surface, verified against the live `loom://catalog` and `packages/cli/src/index.ts`:

- `reply` → `loom_read_chat_tail` → `loom_append_to_chat` ✅ both exist
- `read {weaveSlug}/{threadSlug}/{docSlug}` → `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` ✅ resource exists
- `do quick` → `loom_quick_ship` ✅ exists

**One update to fold in:** the idea's own worked example — *"once `loom set-status <slug> <status>` exists (see `cli/cli-mcp-command-parity`)… no slang needed"* — is no longer hypothetical. `loom set-status <doc> <status>` / `loom_set_status` **shipped**. So the idea's central argument (as commands get self-naming, the slang set *shrinks*) now has a live, not future, proof point. Worth rewording that paragraph from "once it exists" to "now that it exists."

Otherwise the design stance holds and is well-grounded: slang earns its place **only** for verbs that are (a) ambiguous English **or** (b) a fixed multi-tool chain. Everything with a clean 1:1 self-naming command needs none.

---

## The full surface, marked

**Legend**
- **Point?** = would a user naturally *name this to the AI mid-session* (vs. run it by hand in a terminal, or it's agent-only plumbing).
- **Slang?** applies the idea's rule: ✅ = ambiguous **or** a chain · ⚠️ = marginal (self-names but terse-worthy) · ❌ = self-names, no slang needed.
- CLI ⇄ MCP mirror, so rows pair both surfaces.

### A. Authoring / workflow verbs (pointable)

| Capability | CLI | MCP | Point? | Slang? | Suggested word(s) |
|---|---|---|---|---|---|
| Reply in active chat | — | `loom_append_to_chat` (+`loom_read_chat_tail`) | ✅ | ✅ chain + ambiguous | **`reply`** / `r` |
| Do next plan step | `next`, `start-plan`+`complete-step` | `do-next-step` → `loom_complete_step`+`loom_append_done` | ✅ | ✅ chain | **`step`** / `do step` |
| Quick-ship done work | `quick-ship` | `loom_quick_ship` | ✅ | ⚠️ self-names but terse | `do quick` / `ship` |
| Create idea/design/plan/req | `create idea\|design\|plan\|req` | `loom_create_idea\|design\|plan\|req` | ✅ | ❌ self-names | say "create design" |
| Create chat | `create chat` | `loom_create_chat` | ✅ | ⚠️ frequency | `new chat` / `nc` |
| Create thread/weave/reference | `create thread\|weave\|reference` | `loom_create_thread\|weave\|reference` | ✅ | ❌ | — |
| Refine idea/design/plan | `refine-design` | `loom_refine_idea\|design\|plan` | ✅ | ❌ self-names | say "refine design" |
| Promote doc | `promote` | `loom_promote` | ✅ | ❌ | — |
| Start / close plan | `start-plan`, `close-plan` | `loom_start_plan`, `loom_close_plan` | ✅ | ❌ | — |
| Set status | `set-status` | `loom_set_status` | ✅ | ❌ **(the idea's own example)** | — |
| Retitle / rename | `retitle`, `rename thread\|weave\|reference` | `loom_retitle`, `loom_rename_*` | ✅ | ❌ | — |
| Archive / restore / delete | `archive`, `restore`, `delete` | `loom_archive`, `loom_restore`, `loom_delete` | ✅ | ❌ | — |
| Move thread / priority / deps | `move-thread`, `set-priority`, `set-thread-deps` | `loom_move_thread`, `loom_set_priority`, `loom_set_thread_deps` | ✅ | ❌ | — |
| Req lifecycle | — | `loom_amend_req`, `loom_finalize_req`, `loom_verify_req` | ✅ | ❌ | — |
| Plan step CRUD | — | `loom_add_step`, `loom_update_step`, `loom_remove_step`, `loom_reorder_steps` | ✅ | ❌ | — |
| Refresh ctx | — | `loom_refresh_ctx` | ✅ | ⚠️ | `refresh` |
| Record release | `record-release` | `loom_record_release` | ⚠️ release flow | ❌ | — |

### B. Read / query (pointable — one real slang: `read`)

| Capability | CLI | MCP | Point? | Slang? | Suggested word(s) |
|---|---|---|---|---|---|
| Load context bundle | `context`, `resources read` | `loom://context/...` | ✅ | ✅ bare-phrase | **`read {path}`** / `ctx {path}` |
| Status / state | `status` | `loom://state`, `loom://summary` | ✅ | ⚠️ | `status` |
| Roadmap | `roadmap` | `loom://roadmap` | ✅ | ❌ self-names | — |
| Stale / blocked | `stale`, `blocked` | `loom_get_stale_docs`, `loom_get_blocked_steps` | ✅ | ❌ | — |
| Validate | `validate` | `loom_validate`, `validate-state` | ✅ | ❌ | — |
| Search | `search` | `loom_search_docs` | ✅ | ❌ | — |
| Catalog | `catalog` | `loom://catalog` | ✅ | ❌ | — |

### C. Agent-internal — never user-pointed → never slang

`loom_do_step`, `loom_read_chat_tail`, `loom_append_done`, `loom_patch_doc`, `loom_update_doc`, `loom_list_plan_steps`, `loom_find_doc`, `loom_get_context_prefs`/`loom_set_context_prefs`, `loom_seed_example`, all `loom_generate_*` (sampling — blocked in Claude Code), CLI `resolve-ulid`/`resolve-path`. These are the *mechanics* the AI runs under a pointable verb (e.g. `read_chat_tail` fires *inside* `reply`), so they're covered by the chain, not by their own word.

### D. Terminal-only setup / migration — out of scope (run by hand, not said to the AI)

`install`, `init`, `init-multi`, `setup`, `switch`, `list`, `current`, `mcp`, `migrate`, `migrate-layout`, `migrate-plan-steps`, `backfill-releases`, `backfill-design-versions`, `backfill-staleness-baselines`, `feedback`, `loom_install`. Not a slang surface at all.

---

## Slang chains shown explicitly

Only these expand to a **fixed multi-step sequence** — the real justification for slang:

**1. `reply`**  *(trigger: a chat doc is the active context)*
```
loom_read_chat_tail(id)        → pull the new user turns since my last ## AI:
   ↓ [compose the reply]
loom_append_to_chat(id, body)  → write it under ## AI:
```

**2. `step` / `do step`**  *(trigger: an active plan in `implementing`)* — the strongest chain, real work in the middle:
```
do-next-step(planUlid)         → brief: next pending step + context
   ↓ [implement the step: edits, build, test]
loom_append_done(planUlid, …)  → record what was actually done
loom_complete_step(planUlid, …)→ mark ✅
```

**3. `read {path}`**  *(trigger: a slug path follows the word)* — single resource, but the value is disambiguating a bare English word into one exact read:
```
loom://context/{weaveSlug}/{threadSlug}/{docSlug}[?mode=chat]
```

**4. `do quick {desc…}`**  *(marginal — single tool, listed for completeness)*
```
loom_quick_ship(weaveSlug, steps:[…], notes?)
```

---

## Recommendation

The table validates the idea's scope discipline: **the canonical set is small — `reply`, `read {path}`, `step`** (chains + ambiguity), with **`do quick`** optional. Every other pointable capability self-names, so per the idea's own rule it gets **no slang**. As the tri-surface parity work keeps sharpening command names, that "no slang needed" column only grows — which is exactly the thesis to lock into the design.

Open question back to you: do we also want the terse **single-letter aliases** (`r`, `s`) in the reference, or keep slang to whole words only to avoid a private-DSL feel? That's the one fork I'd settle before writing the design.

## Rafa:

I see the following are useful and I has been already many of using them already, but they need to be canonical to avoid confusion:
`read {path}`
`reply`
`do quick`
`do step {N}`
`do steps {N,M,Z}` or `do steps {N-Z}` 
`do plan` (do all the pending plan steps, whole plan if nothing is done yet)
`thread done` set-state of idea, design, active chat -> done

Do you like, agree?

I do not like single-letter aliases and you?

## AI:

Yes — I like this set, and it's **better than the narrower cut I proposed**. I under-weighted the `do`-family because I was judging each verb in isolation; seen together they form a real pattern.

**The organizing insight your list surfaces: `do` is an execution namespace.** `do quick`, `do step`, `do steps`, `do plan` all read as "execute a Loom action," which is exactly the English-collision guard the idea calls for — "do" is never an accidental bare word the way "read"/"reply" can be. I'd make that explicit in the design: **`do {target}` = the execute family; `read`/`reply` stand alone because they already live in the natural chat flow.** That framing also tells us where *future* slang goes (`do …`) without reopening the whole surface each time.

Per-word:

- **`read {path}`, `reply`** — agreed, unchanged. The two archetypes (bare-phrase read, chain).
- **`do quick`** — I concede "marginal" was wrong. It's not really self-naming a 1:1 call: the AI has to *assemble* `loom_quick_ship`'s payload (weave/thread, the repeatable done-steps, notes) from the conversation. The slang is buying the argument-assembly, not just the name. Canonical. *(Tiny nit: `do ship` is verb-noun-consistent with the rest of the family since "quick" is an adjective — but `do quick` is what you already say, so not worth churn.)*

**The step family is the strongest part — because it's already sanctioned by the contract.** `do step {N}` / `do steps {N,M}` / `do steps {N-Z}` / `do plan` map one-to-one onto the **stop-rule-1 exception** in CLAUDE.md ("explicit multi-step authorization… do steps 2–4 / do the whole plan → continue through the range without stopping"). So these aren't new behaviors — they're **canonical names for an authorization the stop-rules already define**:

- `do step {N}` → single step, **STOP after** (default rule 1).
- `do steps {range}` / `do plan` → run through, **no stop between steps** (the exception) — but **rules 2 (error loop) and 3 (design decision) still interrupt**. That carve-out is the safety rail and should be stated in the slang reference too.
- Grounding note: `{N}` is the **visible ordinal** in the plan's Steps table, but step identity is a stable kebab-slug (not `s1/s2`). So `do step 3` = `loom_list_plan_steps` → resolve ordinal 3 to its step id → `do-next-step`/`loom_do_step` → implement → `loom_append_done` → `loom_complete_step`. Another genuine chain → earns its slang.

**`thread done` — this is the one I want to pin before we call it canonical, and the code just told me why.** I checked `packages/core/src/derived.ts`: **a thread's status is *derived*, never stored** — there is no thread-status field and no `set-thread-status` tool (confirmed absent). A thread is `DONE` when **all its *deliverables* are done**, where deliverables = **idea, design, plans**; `req`/`ctx`/`reference` are deliberately excluded as perpetual context. Two consequences for your formulation ("set idea, design, active chat → done"):

1. **Chats aren't deliverables** — a chat's status has *zero* effect on the derived thread status. So `... active chat → done` is cosmetic; I'd drop it from the sweep (a living chat log arguably shouldn't be flipped "done" anyway).
2. **You listed idea+design but not plans — yet plans are what actually gate DONE**, and `loom_set_status` *guards* plan→done (it needs `close-plan` with all steps complete). So the honest definition is:

   > **`thread done`** = `set-status done` on **idea + design**, then `close-plan` each **completed** plan; if any plan still has pending steps, **stop and report it** (can't finish a thread with unfinished work). Chats untouched. The thread then flips `DONE` by derivation.

   That's still pure slang over existing tools (no new primitive needed — which is right, since there's nothing on the thread *to* set), but the doc-set and the plan-guard need to be exactly this or the word will lie (say "done" while the thread derives ACTIVE because a plan wasn't closed). **This is the one design decision I'd lock before promoting** — confirm that definition, or tell me you want a different doc-set.

**Single-letter aliases — full agreement, drop them.** They're the "private DSL nobody remembers" failure the idea explicitly warns against, and `r`/`s` collide with typos and ordinary text far more than whole words. Whole words (and the `do {target}` family) are self-documenting; a new user reads `do plan` and knows what it does. `r` teaches them nothing. I'll strike the `/ r` and `/ s` suggestions from my table.

So the canonical set I'd write into the design:

```
read {path}
reply
do quick
do step {N}
do steps {N,M}  |  do steps {N-Z}
do plan
thread done        (pending the doc-set decision above)
```

Next: confirm the `thread done` definition (idea+design done + close completed plans + report unfinished; chats excluded) and I think this is ready to promote to a design doc.

## AI:

Agreed on both — and together they fix what I got wrong. Revised model:

**`thread done` = set every *settable* thread doc → done, and never touch plans.**

- **All thread docs, not just idea+design** — you're right, I was too narrow. The user intent is "this thread is finished," so the sweep is idea, design, chats — the whole thread's authored docs.
- **Plans are excluded — never manually set.** This is exactly right and the code backs it: `loom_set_status` *guards* plan→done (it refuses unless the plan is closed with all steps complete), because plan status is **workflow-owned** — it moves through `start-plan` → step completion → `close-plan`, not by hand. So `thread done` doesn't set plans at all.

The two rules combine into the honest behavior:

> **`thread done`** — `set-status done` on idea, design, and chats. **Plans: never set.** If a plan still has pending steps, **stop and report it** ("plan-002 has 3 pending steps — `do plan` first"), because the thread can't truly be done with open work. Once its plans are already closed, the sweep flips the thread's *derived* status to DONE.

That report-if-open step isn't optional politeness — it's what keeps the word from lying. Recall the derivation (`derived.ts`): a thread is DONE only when idea + design + **plans** are all done. `thread done` can finish the first two; only the workflow can finish plans. So if a plan is open, the word warns instead of pretending.

**One remaining edge to settle — `req`.** "All docs done" bumps into one doc whose canonical resting state isn't `done`: a **`req` rests at `locked`**, and `derived.ts` deliberately treats a locked req as a *perpetual spec* — it's excluded from the done-check on purpose (same bucket as ctx/reference). So:

- **(a)** literal "all docs" → flip `req: locked → done` too, or
- **(b)** leave req at `locked` (it's the standing scope, like ctx — never "done").

I lean **(b)** for consistency with the derivation, but it's a real fork and your call. Everything else in the set is settled.

So the canonical vocabulary, updated:

```
read {path}
reply
do quick
do step {N}
do steps {N,M}  |  do steps {N-Z}
do plan
thread done      = set idea + design + chats → done; never plans (report if a plan is open)
                   [req: leave locked (my lean) or include — your call]
```

Settle the req fork and I'll promote this to a design doc.

## Rafa:

(b) keep req locked
I think all good

maybe i do not like the slang work: `thread done` becuase user could expect the whole thread becoming done and plans are not the case.
have you better wording for this?
maybe `docs done`?

## AI:

`req` stays `locked` — locked in (b).

On the wording: your instinct is right, and it's the same overpromise trap the idea warns about — `thread done` claims the *whole thread*, but the thread isn't done until its plans are, which this word can't do. So drop "thread" from the name; name the object it actually touches.

**`docs done` is good — I'd take it, with one honest caveat.** In Loom's ontology *plans are docs too*, so "docs done" is very slightly ambiguous about whether it includes plans. But in the **user's** mental model, "docs" = the things I wrote (idea, design, chat) and plans read as "work/steps," not "docs" — so in practice it lands fine, and it cleanly kills the whole-thread overpromise. Good enough to adopt.

If you want *zero* ambiguity (no "wait, plans are docs" flicker), two alternatives:

- **`wrap docs`** — "wrap up" signals finishing the authored side without the hard "done" claim; my favorite for tone.
- **`close docs`** — mirrors the existing `close-plan` (plans get *closed* via workflow; the authored docs get *closed* via this word). Nice symmetry, but keeps the "docs" scope question.

My ranking: **`docs done`** (adopt yours) ≈ **`wrap docs`** > `close docs`. All three beat `thread done`. Your pick — I don't have a strong preference between the top two.

Final vocabulary (pending only the word choice above):

```
read {path}
reply
do quick
do step {N}
do steps {N,M}  |  do steps {N-Z}
do plan
docs done        = set idea + design + chats → done; never plans (report if a plan is open); req stays locked
```

Pick the word and this is ready to promote to a design doc.

## AI:

Promoted to **`design.md`** (draft, linked to the idea). It captures everything we settled:

- The **earned-not-assigned** principle and the **`do` execution namespace**.
- The canonical table with trigger contexts + explicit chains.
- **`docs done`** semantics (idea + design + chats → done; never plans; req stays locked; report open plans) and its grounding in `derived.ts`.
- **Stop-rule alignment** for the step-family (`do step {N}` stops; `do steps`/`do plan` run through; rules 2 & 3 still interrupt).
- The **two homes** (reference + session contract) and the fact that **no code changes are needed** — it's documentation + contract work, since every word maps to existing tools.
- Deferred open questions (literal CLI aliases; `do quick` vs `do ship`).

Next options: **generate a req** to lock scope before implementation, or go straight to a **plan** (the implementation surface is already enumerated in the design). Your call.

## Rafa:

### Open questions 

- literal CLI aliases? I think we do not need them, agree?
- `do quick` (I am Spanish, for me `do quick` sounds better than `do ship` and `do quick` remind `do quick ship` command like a short form, agree) 

I think we do not need req for this, agree?
if so, promote to plan

## AI:

Good instinct to reopen this — it exposes a distinction we'd glossed over. First the easy ones: **`do quick` agreed** (and your reasoning is better than mine — it's the short form of `quick-ship`, and it maps to the existing `loom quick-ship` command, so the mnemonic is real). **No req agreed** — this is doc/contract work with an already-enumerated surface; a req would be ceremony. Both settled.

Now the CLI-alias question — I think the right frame isn't "aliases: yes/no" but **"which words are deterministic capabilities vs. which are agent-triggers,"** because that determines whether a CLI form is even possible:

| Word | Nature | Deterministic (CLI-able)? | Command today |
|------|--------|---------------------------|---------------|
| `read {path}` | read/query | ✅ yes | **exists** → `loom context <path>` |
| `do quick` | record done work | ✅ yes | **exists** → `loom quick-ship` |
| `docs done` | multi-doc state transition | ✅ yes | **none** ⟵ the gap |
| `reply` | AI composes prose | ❌ needs the agent loop | — |
| `do step {N}` | AI writes code | ❌ needs the agent loop | — |
| `do steps {…}` / `do plan` | AI writes code | ❌ needs the agent loop | — |

Two conclusions fall out:

1. **The agent-trigger words (`reply`, `do step/steps/plan`) can't be literal CLI commands** — `loom do-step` with no agent behind it can't implement anything. For these, slang stays a pure conversational convention. So the blanket "add `loom reply`" idea doesn't hold.

2. **The deterministic words already have commands** — `read {path}` → `loom context`, `do quick` → `loom quick-ship`. Slang just *points* at them; no new alias needed. **Except `docs done`, which has no command at all.**

And that's the real thing your reconsideration surfaced: **`docs done` is a deterministic state transition (set idea+design+chats done, skip plans, guard-check open plans) that currently has *no home except the AI improvising it each session.*** That's a **tri-surface parity gap**, and by our own hard rule + "correct path over short path," a deterministic capability that mutates state should be a real, tested tool — **`loom_docs_done` (MCP) ⇄ `loom docs-done` (CLI) ⇄ extension "Docs Done" button** — with the slang word `docs done` pointing at it, exactly like `do quick` → `quick-ship`. Leaving it as AI orchestration risks drift (one session forgets to skip plans, another flips the req).

So the fork — and it changes the plan:

- **Option A — slang is contract-only.** No code. `docs done` stays AI-orchestrated over `loom_set_status`. Plan = the 4–5 doc/contract steps.
- **Option B — promote `docs done` to a real tri-surface capability.** Adds core/app/mcp/cli/vscode + a test. The slang layer then points at a deterministic, guarded tool. More work, but it closes the parity gap and makes the one stateful slang word reproducible instead of improvised.

I lean **B for `docs done` specifically** (it's the only slang word that mutates state *and* lacks a command), while the rest stay contract-only pointers to existing commands. That gives us: real command where behavior must be deterministic; lightweight convention where the agent is doing the thinking.

This is a real design decision that sets the plan's scope, so I'm holding off on `create_plan`. **Your call: A or B (or B-plus if you want CLI forms for `read`/`do quick` too, though I'd argue those are redundant with `context`/`quick-ship`).**

## Rafa:

Agree only `docs done` has sense for a CLI command. But infact it is only a chain of `loom set-status {doc}` commands.
Do you think is worth to implement CLI `loom docs-done {weaveSlug}/{threadSlug}`?

## AI:

You're right, and it flips my recommendation: **no, not worth a CLI command — keep `docs done` contract-only (Option A).**

Your challenge is fair. It *is* mostly a chain of `loom set-status {doc} done`. The only parts that aren't a blind chain are (1) **discovery** — enumerate the thread's idea/design/chats so the caller needn't know each ULID — and (2) the **open-plan guard** — don't imply done while a plan has pending steps. Real, but small. And weighed against the cost, they don't justify a command:

- **Frequency is once-per-thread-lifecycle.** Building a 3-surface capability (tri-surface parity would pull in MCP + CLI + an extension button + tests) for a rare op is exactly the over-engineering our own rules warn against — parity is "*consider*," not "triplicate," and there's no extension button forcing a CLI twin.
- **Every real user reaches it through the agent.** In the ② Power-terminal / ③ Pure-agent ways the user *says* "docs done" to the AI — they don't type `loom docs-done`. A pure-CLI-no-AI human closing threads by hand is a user we don't have; coding for them now is building in the dark.
- **The discovery + guard are cheap for the AI and stay visible.** The agent runs `loom set-status` a few times in the open terminal where you can watch it — a tool would *hide* that. Transparency beats encapsulation here.

So the clean call is: **the determinism lives in the reference, not in code.** The slang entry spells the exact recipe — *sweep idea + design + chats → done; never plans; req stays locked; if any plan has pending steps, stop and report* — and the AI follows it every time. That's the same "one word → one known action" guarantee, at zero maintenance cost across three surfaces. If usage ever shows thread-closing is frequent (or the extension grows the button), we promote it to a real command *then*, with evidence.

Net: I withdraw the earlier lean toward B. **We're back to Option A — pure doc/contract, no code**, which is the plan I originally drafted. Say the word and I'll `create_plan` for the doc/contract work (reference + WAYS-TO-USE section + the shared CLAUDE.md/template rule + extension launch-prompt coverage).

## AI:

Plan is in — **`plan-001.md`** (draft), 5 steps, no code:

1. Author `loom/refs/loom-slang-reference.md` (the canonical table, triggers, chains, `docs done` recipe, rejections).
2. Add a "Loom slang" section to `docs/WAYS-TO-USE-LOOM.md`.
3. Add the shared rule to `CLAUDE.md` + the `LOOM_CLAUDE_MD` template with a matching `<!-- rule:loom-slang -->` marker.
4. Teach the vocabulary to the extension launch prompts (`packages/vscode/src/commands/*.ts`).
5. Build + test, verifying `claude-md-sync` parity (blocked by 1–4).

Steps 1–4 are independent, so we can do them in any order or batch them. Say **`do plan`** (or `do step 1`) when you want me to start — I'll need `start-plan` first to move it to implementing.

## Rafa:

I started the plan
do whole plan

## AI:

**Progress:** Steps 1–3 done — `loom-slang-reference.md` authored, the WAYS-TO-USE section added, and the `rule:loom-slang` block mirrored into both CLAUDE.md surfaces (parity preserved). Each marked ✅ with a done note.

**Stopping at Step 4 — I think it's unnecessary, and want your call before touching 30 command files.**

Step 4 was "teach the slang vocabulary to the extension launch prompts." Reading the actual prompts (`chatReply.ts`, `doStep.ts`) while doing the earlier steps, the premise doesn't hold:

- **Launched agents are task-scoped (way ①).** They get one explicit instruction and exit — there is no interactive user typing "reply" or "do plan" at them mid-task. Slang is a *User→AI interactive* verb; a task-scoped launch has no user turn to interpret.
- **The prompts already *embody* the chains.** `chatReply.ts` already tells the agent exactly `read_chat_tail` → compose → `append_to_chat` (that *is* `reply`). `doStep.ts`'s `buildPrompt` already tells it `do_step` → `append_done` → `complete_step` per step, run in order (that *is* `do step`/`do steps`/`do plan`). There's no vocabulary missing — the behavior is hardcoded correctly.
- **The interactive slang home is CLAUDE.md, which launched agents also load.** Ways ② / ③ (persistent agents, where slang actually fires) read the project `CLAUDE.md` / installed `.loom/CLAUDE.md` — already delivered by Step 3. And a launched `claude "<prompt>"` runs in the project cwd, so it loads CLAUDE.md too if it ever needs the words.

So adding slang text to the launch prompts is redundant at best and prompt-bloat at worst (every launch carries rules that never trigger). Per "correct path over short path," I'd rather drop the step than make a pointless edit that pretends to add value.

**Options:**
- **(a)** Drop Step 4 — `loom_remove_step` it (I'll fix Step 5's `blockedBy` reference), then Step 5 (build + test) is the last thing left.
- **(b)** You see a real need I'm missing (e.g. a specific prompt you want the words in) — tell me which, and I'll do exactly that.

I lean **(a)**. Which way?

## Rafa:

(a)

## AI:

**`do plan` complete — plan-001 is `done`.** Final tally:

1. ✅ `loom/refs/loom-slang-reference.md` — the canonical vocabulary (table, triggers, chains, `docs done` recipe, rejections).
2. ✅ `docs/WAYS-TO-USE-LOOM.md` — a "Loom slang" section for ways ② / ③.
3. ✅ `rule:loom-slang` mirrored into `CLAUDE.md` + the `LOOM_CLAUDE_MD` template.
4. ~~Teach the launch prompts~~ — removed as redundant (your call (a)).
5. ✅ Build + full test suite green; `claude-md-sync` confirms **17 shared rule ids** match across both surfaces (was 16) and all 12 invariant tokens present.

No runtime code changed — pure doc + contract, exactly as designed. The slang protocol is now live in the session contract, so future sessions (here and in any installed workspace) treat `read {path}` / `reply` / `do quick` / `do step` / `do steps` / `do plan` / `docs done` as canonical.

Working tree now has: the new reference, the design + plan + done docs for this thread, the WAYS-TO-USE edit, and the two CLAUDE.md-surface edits. Want me to **commit** it? If so I'll append the closing chat turn first, then commit as the last action (per the commit-last rule).

## Rafa:

With the last features implemented we are trying to reduce the friction for small/simple tasks/projects.
Example:
- User: 
  - user write in chat doc: find root cause of this UI bug...
  - AI CLI terminal: read fixes/fixUI/chat-001.md
- AI Agent:
  - AI CLI terminal: bug root cause found...
- User: 
  - AI CLI terminal: do quick, docs done, commit
- AI Agent: do the fix, create plan, done, set-status of chat done and commit

What do you think?

commit

## AI:

I like it a lot — this is the **lightweight lane**, and it's exactly what the slang was for: for a small/simple task you skip the idea→design→req→plan ceremony entirely and run *chat → AI fixes → `do quick` → `docs done` → `commit`*. Every piece already exists, so it costs nothing to support, and it directly attacks the "Loom feels heavy for tiny work" adoption barrier. The `do quick, docs done, commit` line is just three slang words executed in sequence — comma-chaining works naturally, no new mechanism.

Two things worth pinning so the word meanings don't drift:

1. **Keep `do quick` a *recording* verb, not an implicit implementer.** In your example the AI has only *found* the root cause when you say "do quick" — but `quick-ship` records *already-done* work; it doesn't apply the fix. So the fix has to happen first. Cleanest model for the lane: the AI applies the fix as the natural chat turn (you asked it to fix the bug), *then* `do quick` records that finished work as a one-shot done plan. If we let `do quick` silently mean "implement then record," the word stops being deterministic (sometimes it writes code, sometimes it doesn't). I'd phrase the ritual as **"fix it" → "do quick, docs done, commit"** — or accept that `do quick` after a root-cause discussion implies "make the change we just agreed, then record it," but only if we write that down explicitly. My lean: keep quick-ship pure; the fix is its own (possibly same-breath) ask.

2. **`docs done` degrades gracefully here** — in this lane there's no idea/design, just the chat + the quick-ship done plan, so `docs done` just sets the chat done. That's the right behavior; no change needed. And `commit` isn't Loom slang (it's a plain git ask governed by the commit-last rule), which is fine — it self-names.

Net: worth capturing as a documented **"quick-fix lane"** example (a short recipe in `loom-slang-reference.md` or WAYS-TO-USE), and worth deciding point 1 before we advertise it. Not blocking anything today. Want me to spin a small follow-up thread for the quick-fix lane, or fold a one-paragraph example into the slang reference?

Committing the slang-protocol work now.