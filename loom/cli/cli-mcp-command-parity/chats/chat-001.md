---
type: chat
id: ch_01KX6SR6K2RR7JXF6CPDKKDX9V
title: cli-mcp-command-parity Chat 001
status: done
created: 2026-07-10
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 19
---
# cli-mcp-command-parity Chat 001

## Rafa:

this is active chat now

add a short ToC to WAYS-TO-USE-LOOM.md
commit: 
docs/WAYS-TO-USE-LOOM.md
docs/USER_GUIDE.md
docs/EXTENSION_USER_GUIDE.md
loom/ai-integration/ways-to-use-loom/chats/chat-001.md

### About *draft*

we will keep it, with your recommendation:
keep `draft`, but decouple it from the obsolete "ID generation" story.

the problem is the commands names and descriptions, framing

extension has mouse right menu option:
- `mark done` (i don't find to what command is this wired) and 
- `mark active` (i guess is wired to mcp `loom_finalize_doc`), but should be somethint like:
MCP: `loom_set_active`, CLI: `loom set-active` (or loom mark-active or better name we choose)
MCP: `loom_set_done`,  CLI: `loom set-done`
not currents:
- CLI: finalize <draft>  Finalize a draft document and generate its permanent ID
the description is stale and also still use ID instead of Slug
- MCP: `loom_finalize_doc` — Finalize a draft document: sets status to "active". 

What do you think? Agree?

## AI:

Got it — this is the active chat now.

**ToC:** added a short `## Contents` to `WAYS-TO-USE-LOOM.md` (6 top-level links), and cleaned the "Patterns for the persistent agent" heading so its anchor is stable. Committing the four files you listed as the last action of this turn (leaving the three new thread+idea folders uncommitted, as you scoped).

**Draft:** agreed and recorded — keep it, decoupled from the "ID generation" story.

## What `Mark Done` / `Mark Active` are actually wired to (I traced it)

Your guess was close but not quite — and the truth reframes the whole fix:

- `Mark Active` → `loom.markActive` → **`loom_update_doc({ id, status: 'active' })`**
- `Mark Done` → `loom.markDone` → **`loom_update_doc({ id, status: 'done' })`**

So they are **not** wired to `loom_finalize_doc`. They go through the **generic** `loom_update_doc` status setter. Meanwhile there's a *separate* `Finalize` command (`loom.finalize` → `finalize.ts` → `loom_finalize_doc`) that also flips draft→active.

**That means the real problem isn't the name — it's a redundancy.** We have *two* mechanisms that both set a plain doc's status to active:
1. `loom_update_doc({status})` — generic, already backs Mark Active/Mark Done.
2. `loom_finalize_doc` — dedicated draft→active, plus its stale CLI twin `finalize <draft>` ("generate its permanent ID", still says *ID* not *slug*).

## My recommendation (root-cause, not just a rename)

Split by whether the transition is *guarded* (does real work) or just a *label*:

- **Plain docs (idea / design): status is a label, not a state machine.** One setter is correct. So **retire `loom_finalize_doc` + CLI `finalize` as redundant**, and standardize on the generic setter. Give it the friendly CLI verbs you want — `loom set-active` / `loom set-done` (or a single `loom set-status <slug> <status>`) — all mapping to `loom_update_doc`. Fix every stale "permanent ID" / `<draft>`-by-ID string → slug. Unify the extension so `Mark Active`/`Finalize` aren't two buttons doing the same thing.
- **Plans / reqs: keep the typed, guarded transitions** — `loom_start_plan`, `loom_close_plan` (writes the done record), `loom_finalize_req` (locks scope). **Do not** collapse these into a generic `set_done`/`set_active`: a `set_done` that marks a plan done with pending steps is exactly the "buttons must do real work / false-step-4" anti-pattern. "Done" for a plan is *earned* by its steps, not set.

On MCP naming specifically: I'd lean **against adding new `loom_set_active`/`loom_set_done` MCP tools**, since `loom_update_doc({status})` already does it — adding twins grows the surface for no new capability. Keep the friendly verbs at the **CLI** edge (human-first, per the naming rule) and let them map to the existing tool. That also feeds the slang thread nicely (`set done` → one deterministic action).

**Two decisions for you** (I'm not touching code until you call these — API shape, stop rule 3):
1. **Retire `finalize` outright** (my rec) vs *rename* it to `set_active` and keep it as a distinct tool alongside `update_doc`?
2. CLI ergonomics: two verbs **`set-active` / `set-done`**, or one **`set-status <slug> <status>`**?

Note the blast radius when we do move: per the API-refactor scope rule this sweeps MCP tool + CLI command + the extension menu wiring + the README/guide tables that name *Mark Done / Finalize* — all in one change, no half-migration.

What's your call on the two?

## Rafa:

1. Retire `loom_finalize_doc` + CLI `finalize` 
2. CLI and MCP commands should mirror as much as possible unless human needs a Slug version vs ULID for example. One mcp generic command to set the status is nice and so I lean that CLI mirror MCP, `set-status <slug> <status>`, this is easy comand for human when is available. Extension should use similar naming so when human user use them quicly knows corresponding CLI command. So menu options should be:
- set status done
- set status active

Then we will not need slang word for this because human will know what to say:
`set status done for loom/cli/cli-mcp-command-parity/chats/chat-001.md`
And AI agent will know exactly what he wants

### About CLI ⇄ MCP ⇄ Extension command parity

This should be a hard rule contract
Everytime we touch CLI or MCP we should consider if the other part need a corresponding command and try to mirror them except when CLI human command needs a Slug version instead of ULID or similar case. Extension buttons, menu options should be named mirroring the commands.

What do you think? Agree? Better approach? Better naming?

## AI:

Agree on all of it — retire `finalize`, one generic `set-status`, CLI mirrors MCP, extension menu mirrors the command. And you're right that this *removes* the need for a slang word: `set status done for {path}` is self-describing, so it never needed one. That actually sharpens the slang thread — **slang is only for verbs that are ambiguous or map to a multi-tool sequence** (like `reply` = `read_chat_tail` + `append`); anything with a clear 1:1 command needs no slang. I'll note that in the slang idea.

One refinement on the generic setter — it makes your decision cleaner *and* fixes a latent bug I found while tracing:

### `loom_set_status` should be a **dedicated, guarded** tool — and status should leave `loom_update_doc`

Right now status is set through `loom_update_doc({status})`. If we just rename the CLI over that, we keep two problems:
- **Redundancy** — `update_doc` is really about *body + requires_load*; bolting status on it is the original sin that spawned the `finalize` duplicate in the first place.
- **A real latent bug** — because `loom_update_doc({status:'done'})` sets *any* status on *any* doc, right-clicking a **plan** → Mark Done today flips it to `done` **without** `close_plan` — no done-record, no pending-step check. That's exactly the "buttons must do real work" violation.

So the clean target:
- **New `loom_set_status` (MCP) ⇄ `loom set-status <slug> <status>` (CLI)** — the *single* status path, and **guarded**: it sets the free label statuses on plain docs (idea/design: `draft`/`active`/`done`), and **refuses** guarded transitions, pointing the caller to the right tool (plan→done ⇒ `close_plan`, req→locked ⇒ `finalize_req`).
- **Remove `status` from `loom_update_doc`** so there is exactly one way to set status. (Caveat: needs a quick caller audit — a few call sites, including `markStatus.ts`, move to `set_status`; that's inside the parity sweep anyway.)
- Extension menu: **`Set Status: Done` / `Set Status: Active`** → `loom_set_status`. Retire the separate `Finalize` command for plain docs (reqs keep their own `Finalize Req`).

Net: one honest, guarded verb across all three surfaces; the redundant `finalize` and the plan-bypass bug both gone.

### The parity contract — strong yes, and it belongs in CLAUDE.md

This is a genuinely good hard rule and it's the sibling of the two API rules already there (`API naming`, `API-refactor scope`). My proposed shape:

> **Tri-surface command parity (hard).** A capability is exposed on every surface its consumer needs, with **names mirrored** across CLI ⇄ MCP ⇄ extension. Touching a command on one surface obliges you to *consider and mirror* it on the others in the same change: CLI `foo-bar` ⇄ MCP `loom_foo_bar` ⇄ extension menu "Foo Bar". Exceptions are **by consumer, not by whim**: (a) form differences — CLI is slug/human-first where MCP is ULID-strict; (b) genuinely single-audience commands stay single-surface — agent-only workflow tools (`loom_do_step`, `loom_read_chat_tail`) need no CLI/menu twin; setup like `loom install` needs no MCP twin. "Consider parity" is the rule; blanket triplication is not.

Two notes on it:
- It's **repo-specific authoring** (about building Loom itself), so — like the other two — it lives in `CLAUDE.md` only, no `rule:` marker, not mirrored into the downstream template.
- I'd make it a **deliverable of *this* thread** (`cli-mcp-command-parity`): the design covers both the `set-status` refactor *and* writing this contract into CLAUDE.md. Coherent — the thread is literally about parity.

**Better naming?** `loom set-status <slug> <status>` is good and mirrors cleanly. The only alt worth a glance is git-style `loom status set <slug> <status>` (namespaced under a `status` subcommand) — but that collides with the existing `loom status` (project overview), so **`set-status` wins**. Extension: I'd use the colon form `Set Status: Done` for menu readability, but it's your call if you prefer flat `Set Status Done`.

If this lands, I think we're at design-doc readiness for this thread. Shall I write the `design.md` capturing: (1) retire `finalize`, (2) guarded `loom_set_status` + remove status from `update_doc`, (3) extension rename, (4) the tri-surface parity contract → CLAUDE.md? Or do you want to nail the guard behavior / the update_doc caller audit further first?

## Rafa:

write design

also add the note for the slang idea in `loom/ai-integration/loom-slang-protocol/idea.md`, this way it is not missed If we do that thread in a new session

### CLI, MCP, Extension 

Just to enforce the need of this thread and different surfaces parity:
We sell different ways to use Loom in docs/WAYS-TO-USE-LOOM.md
So when we sweep CLI, MCP commands we must be sure that all that ways are fully availables.
For example, a Power terminal user have all CLI commands that he will need to work with Loom

## AI:

Both done.

**`design.md` written** (draft) — it captures:
1. **Status model** — a table splitting *free label* statuses (idea/design/reference, and plan draft↔active) from *guarded* transitions (plan→implementing/done, req→locked), with the principle that `set_status` owns the free ones and **refuses** the guarded ones.
2. **`loom_set_status`** — new dedicated, guarded tool (MCP `doc_ulid`+status; CLI `set-status <slug> <status>`), the single status path.
3. **Trim `loom_update_doc`** back to body + requires_load, closing the latent "Mark Done on a plan bypasses `close_plan`" bug — with a caller-audit step.
4. **Retire `finalize`** everywhere (reqs keep `Finalize Req`); purge "permanent ID" wording; slug-addressed.
5. **CLI parity gaps** — add create-chat, plus a **four-ways availability audit** (your point: a Power-terminal user must have every CLI command the advertised ways need — folded in as both motivation and success criterion).
6. **Extension** rename → `Set Status: Done/Active`.
7. **Tri-surface parity contract** → CLAUDE.md (with the WAYS-TO-USE availability clause), repo-specific, no marker.

Plus **naming**, **success criteria**, **blast radius**, **non-goals**, and open items to confirm at plan time (update_doc caller list; confirming idea/design legitimately reach `done`; extension two-items-vs-quick-pick).

**Slang idea updated** — added a bullet to `loom-slang-protocol/idea.md` recording that slang is only for ambiguous/multi-tool verbs, with `set status done` as the worked example of a command that needs *none*, and the observation that clearer command names shrink the slang set. It won't be lost if that thread runs in a fresh session.

Neither is committed (you didn't ask, and design is still `draft`). Tree currently holds: the new `cli-mcp-command-parity` design + this chat, the slang idea edit, and the three new thread folders.

**Next options:** review/refine the design, or move this thread forward to a **plan** (I'd suggest a plan given the concrete multi-surface steps — no `req` needed unless you want a locked scope anchor). Your call.

## AI:

**`plan-001` written — 10 steps, dependencies wired.** The spine:

1. **Guarded `loom_set_status`** (core decision fn + app use-case + MCP tool) — the single status path.
2. **Trim `status` out of `loom_update_doc`** + migrate callers ← (1).
3. **Retire `loom_finalize_doc`** + finalize use-case ← (1).
4. **CLI `loom set-status` + drop `finalize`** ← (1,3).
5. **CLI create-chat** (`loom chat new`).
6. **Extension Set Status menu** + remove finalize ← (1,3).
7. **Four-ways CLI availability audit** ← (4,5).
8. **Tri-surface parity contract → CLAUDE.md.**
9. **Docs sweep** (READMEs, WAYS-TO-USE, CLI guide, mcp-reference, api-naming) ← (4,6).
10. **Tests + build** ← (1,2,3,4,6).

I confirmed the `blockedBy` ordinals resolved to real step-id slugs (no silent drops). Plan is `active` — say *start plan* / DoStep when you want to implement, and it'll begin with step 1.

Committing everything now: the `cli-mcp-command-parity` thread (idea + design + plan + this chat), the slang-idea note, and the two other new thread+idea folders.

## Rafa:

I started the plan
do 1-4

## AI:

**Steps 1–4 done ✅** (marked in the plan + notes in `done/plan-001-done.md`).

**1 — guarded `loom_set_status`:** core `decideSetStatus` (pure: allow / delegate / reject) + app `setStatus` (no version bump, idempotent) + MCP `loom_set_status` registered in the `doc` group.
**2 — trimmed `loom_update_doc`:** status param removed (body + requires_load only); audit confirmed the only status-caller was the extension's `markStatus.ts` (step 6). This kills the latent "Mark Done on a plan bypasses `close_plan`" bug.
**3 — retired finalize:** deleted `finalizeDoc.ts` + app `finalize.ts` + server wiring; kept `loom_finalize_req` (scope-lock).
**4 — CLI:** added `loom set-status <doc> <status>`, deleted `loom finalize` + its stale "permanent ID" help.

**Verified on the built CLI:**
- plan → done → *refused*, points to `loom_close_plan` ✅
- invalid status → *rejected* with the valid list ✅
- already-active → allow + idempotent, writes nothing ✅
- `loom finalize` → *unknown command* ✅
- `build-all` green across all six packages.

**Two things to flag:**
1. **A concurrent edit.** While testing, `plan-001.md` showed an added `updated:` timestamp that my code did **not** produce (an isolated run writes nothing) — it appeared around your "I started the plan", so likely the extension. I `git checkout`'d the file to isolate the test, which dropped that timestamp (content/decisions untouched). `loom_start_plan` + the step-completions have since rewritten the plan anyway. Flagging per our "don't silently revert concurrent edits" rule — nothing of yours was lost, but wanted you to know.
2. **Expected temporary half-state (by plan design).** The extension still references `loom_finalize_doc` and `loom_update_doc({status})` — so its *Mark Active/Done* and *Finalize* buttons are dead until **step 6**; CLAUDE.md/docs update in **steps 8–9**. Everything compiles; it's just mid-sweep.

I did **not** commit (you asked for "do 1-4", not a commit). Tree holds: the code changes + the plan/done updates.

**STOP — 1–4 complete.** Next is **step 5 — CLI create-chat** (`loom chat new`, mirror `loom_create_chat`; `packages/cli/src/index.ts` + a new command file). Say **commit** and/or **go 5** (or **do 5-10**).

## AI:

Committed — steps 1–4 (the `loom_set_status` refactor + finalize retirement) plus the plan/done progress are now in `main`. Tree is clean.

**STOP — waiting for go.** Next is **step 5 — CLI create-chat**: add `loom chat new` (mirror `loom_create_chat`) so a Power-terminal / Pure-agent user can start the chat loop from the terminal. Files: a new `packages/cli/src/commands/` command + `packages/cli/src/index.ts`. Then steps 6 (extension menu) · 7 (four-ways audit) · 8 (parity rule → CLAUDE.md) · 9 (docs sweep) · 10 (tests + build) remain.

Say **go 5** or **do 5-10**.

## Rafa:

Thanks for informing me!

We have a discrepancy CLI - MCP 

### MCP Create
- `loom_create_chat` — Create a new chat document in one of the two canonical chat homes.
- `loom_create_design` — Create a new design document in a thread.
- `loom_create_idea` — Create a new idea document in a weave (optionally in a specific thread).
- `loom_create_plan` — Create a new plan document in a thread.
- `loom_create_reference` — Create a new reference document in loom/refs/.
- `loom_create_req` — Create a thread's req (requirements) doc — the authoritative include/exclude/constraints spec, one flat `req.md` per thread.
- `loom_create_weave` — Create an empty weave folder (`loom/{weave_slug}`).

### CLI Weave
```
loom weave -h
Usage: loom weave [options] [command]

Weave a new document

Options:
  -h, --help                display help for command

Commands:
  idea [options] <title>    Create a new idea document (default: creates a thread named
                            after the title)
  design [options] <weave>  Create a new design document from an existing idea
  plan [options] <weave>    Create a new plan from a finalized design
  help [command]            display help for command
```

this is source of confusion and this discrepancies should be resolved as we stablished in
MCP - CLI - Extension parity / mirroring

Suggestions to decide before continue?

## AI:

Good catch — and it's exactly the kind of discrepancy the parity contract exists to kill. Two problems in one:

1. **Verb mismatch:** MCP says `create` (`loom_create_*`); CLI says `weave` (`loom weave idea|design|plan`). Same operation, two different words — pure confusion.
2. **Coverage gap:** CLI covers only 3 of the 7 create types (idea/design/plan). Missing: **chat, reference, req, weave-folder**.

(Side note: `weave` as a *verb* also collides with `weave` the *noun* — a project folder. Another reason to drop it.)

### Recommendation — Option B: a `loom create <type>` namespace

Rename `loom weave …` → **`loom create …`** and complete the set:

```
loom create idea <title>          ⇄  loom_create_idea
loom create design <weave>        ⇄  loom_create_design
loom create plan <weave>          ⇄  loom_create_plan
loom create chat <…>              ⇄  loom_create_chat      (new — step 5's goal)
loom create reference <title>     ⇄  loom_create_reference (new)
loom create req <weave> <thread>  ⇄  loom_create_req       (new)
loom create weave <slug>          ⇄  loom_create_weave     (new)
```

Why B over the flat **Option A** (`loom create-idea`, `loom create-chat`, …):
- **Name-mirrors MCP** — `create` + `<type>` maps 1:1 onto `loom_create_<type>`, satisfying the parity rule; the subcommand grouping is a legitimate CLI-ergonomic *form* (the rule explicitly allows form differences).
- **Discoverable** — `loom create -h` lists the whole create family in one place.
- **Reads naturally** — `loom create idea "Payment flow"`.
- Flat Option A works too and is a hair closer to the literal MCP token, but 7 top-level `create-*` commands clutter `loom -h` and don't group.

**Retire `loom weave` outright, no alias** (clean-migration, per how we work). CLI args stay human-first (title/slug), which is fine — the contract only mirrors *names*, not arg forms.

### One completeness note
`loom_create_thread` lives in MCP's **thread** group (not the Create group you pasted), and the CLI has no explicit thread-create either (today `create idea` implicitly makes a thread). Worth deciding whether `loom create thread` should exist too — but I'd keep that as a **follow-up**, not block this on it.

### Impact on the plan
This turns **step 5** from "add create-chat" into "**unify the CLI create surface to `loom create <type>` mirroring MCP (all 7 types), retiring `loom weave`**." Bigger, but it's the right root-cause fix and squarely the parity work. If you pick B, I'll amend step 5's description (via `loom_update_step`) to reflect it before implementing.

**Decisions for you:** (1) **B** (namespace) vs **A** (flat)? (2) include `loom create thread` now or defer? Once you call it, I'll amend step 5 and proceed.

## Rafa:

1 B
2 include `loom create thread` now

you told me: 
>today `create idea` implicitly makes a thread

non of the create {chat, idea, design, plan} should create a thread, this is source of errors
create a thread is other command

current mcp description for 
- `loom_create_idea` — Create a new idea document in a weave (optionally in a specific thread).
is wrong, an idea can be only created in a specific thread and only 1

amend step 5 and proceed
note: at the end of the plan we will sweep CLI - MCP - Extension to find any remaining discrepancy

## AI:

Yes — strongly agree. Three reasons, and one honest caveat:

1. **A thread is a real entity, not a side effect.** It has a stable `th_` ULID, a `thread.md` manifest, and roadmap metadata (priority, `depends_on`). Minting all that *implicitly* because someone jotted an idea conflates two different intents — "capture a thought" vs "commit to a workstream."
2. **Implicit creation is a genuine error source.** `loom weave idea "Paymnet flow"` silently creates a `paymnet-flow` thread from a typo; there's no moment to catch it. Explicit `create thread` gives that moment.
3. **It's actually the parity fix, not a new opinion.** MCP `loom_create_idea` *already requires* `thread_ulid` — the MCP write path is thread-first-explicit. The CLI's auto-create was the **divergence**. So making thread creation independent is precisely what brings CLI back in line with MCP — the exact discrepancy this thread exists to kill.

**Caveat (the honest cost):** it turns the common "start a new thing" from one command into two (`create thread` then `create idea`). I think that's the right trade — explicit beats magic, and the friction is small and truthful (you *are* making two things). If we ever want a one-shot starter, it should be its **own explicit command** (say `loom start <weave> <slug> "title"` = thread + idea), never magic buried inside `create idea`. That keeps the invariant: **no hidden thread creation, ever.**

I've already amended step 5 to this model — create commands (idea/design/plan/req/chat) resolve an *existing* thread and error if it's missing; `loom create thread` is the sole, explicit creator; `loom weave` is retired. Ready to implement on your **go**.

## AI:

**Step 5 done ✅** — the CLI create surface is unified and thread-first.

- **`loom create <type>`** namespace mirrors `loom_create_*`: `thread · idea · design · plan · req · chat · reference · weave`.
- **No implicit threads.** idea/design/plan/req/chat resolve an *existing* thread; a miss errors with `Create it first: loom create thread <weave> <slug>`. `create thread` is the sole explicit creator.
- **`loom weave` retired**; `weaveIdea/Design/Plan.ts` + `threadArg.ts` (the auto-create seam) deleted.
- **Shared `createReference` use-case** extracted to `app/` so CLI and MCP write byte-identical files.
- **Fixed the wrong `loom_create_idea` description** ("in a weave (optionally in a thread)" → "in a specific thread — one per thread; requires th_ ULID; never mints a thread") and tightened its handler; sibling create tools were already thread-first.

**Verified on the built CLI:** `loom create -h` lists all 8; `loom weave` is gone; end-to-end `create weave → thread (mints th_ ULID) → idea` works; missing-thread errors cleanly (no mutation); `create reference` works via the shared use-case. All scratch artifacts removed, git clean, build-all green.

Not committed (you said "go", not commit). Uncommitted: the create-namespace code + the plan/done progress.

**STOP.** Next is **step 6 — extension Set Status menu**: point `markStatus.ts` at `loom_set_status`, rename `loom.markDone/markActive` → `loom.setStatusDone/setStatusActive` (labels "Set Status: Done/Active"), and remove the `loom.finalize` command + `finalize.ts` + its menu entry. Files: `packages/vscode/src/commands/markStatus.ts`, `finalize.ts`, `extension.ts`, `package.json`.

Say **commit** and/or **go 6** (or **do 6-11**).

## AI:

**Steps 6–11 done — plan complete (auto-closed to `done`).**

- **6 — Extension:** `markStatus.ts` → `loom_set_status`; commands/labels → `Set Status: Done/Active`; `loom.finalize` + `finalize.ts` removed. (Needs a Reload Window to go live.)
- **7 — Four-ways audit:** ①②④ fully covered; **③ Pure agent** has a real gap (no CLI twins for human tree-management ops) — recorded.
- **8 — CLAUDE.md:** added the **Tri-surface command parity (hard)** rule (sibling of the API rules; repo-specific, no marker, so no template mirror / no sync-test impact).
- **9 — Docs sweep:** every live surface updated (README ×3, WAYS-TO-USE, CLI guide, refs: cli-commands/mcp/vscode-commands/architecture/staleness). Historical loom docs + CHANGELOG left as records.
- **10 — Tests:** new `set-status.test.ts` (guard) + migrated `version-on-content` (update_doc rejects status; set_status doesn't bump version) + migrated `id-management` (create/set-status). **build-all + test-all green** (incl. MCP integration 23/23).
- **11 — Final sweep:** status + create surfaces aligned. One remaining cluster (human tree-management CLI twins missing → breaks way ③) was **too big to fold in**, so it's tracked as a follow-up: **`cli/cli-management-command-parity`** (idea written) with the full discrepancy table + the `rename`/`retitle` and extension-`weave` naming cleanups.

**Net:** one guarded status verb across all three surfaces, `finalize` gone, `loom create <type>` thread-first mirroring `loom_create_*`, `loom weave` retired, the parity contract codified, docs swept, tests green.

**Not committed yet** (you said "commit then do 6-11" — that commit was step 5). The tree holds all of 6–11: extension + CLAUDE.md + docs/refs + tests + the plan/done progress + the new follow-up thread. Say **commit** and I'll land it (I'd suggest one commit for 6–11, and I can split the follow-up thread into its own `chore` commit if you prefer).

## Rafa:

commit 
then follow up thread into its own `chore` commit

## AI:

Committing in two: first the plan 6–11 changeset (extension + CLAUDE.md + docs/refs + tests + this thread's plan/done/chat), then the new `cli-management-command-parity` follow-up thread as its own `chore` commit. This closes out `plan-001` — the CLI ⇄ MCP ⇄ extension status-verb parity + create-surface unification are done and green; the remaining human tree-management CLI gap is now a tracked follow-up.