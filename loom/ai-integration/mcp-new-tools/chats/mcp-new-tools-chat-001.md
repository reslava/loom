---
type: chat
id: ch_01KTTH5BTWHVR449VDKMBD6BSY
title: mcp-new-tools Chat
status: active
created: "2026-06-11T00:00:00.000Z"
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 23
---
# mcp-new-tools Chat

## Rafa:

Dogfooding Loom in project `J:/src/chord-flow` I asked you to tell me friction points.

### AI Friction

This is your reply:

1. **Full-body replace is the sharpest edge.** Changing one line in a 200-line `ctx.md` or design doc means re-supplying the entire body through `loom_update_doc`. It's token-expensive and genuinely error-prone — I'm retyping content just to touch a sentence. A section/patch-level edit tool would remove the single biggest source of risk in working with Loom docs.
2. **No clean way to amend a plan step.** The `EX4` citation lint had no MCP-native fix in Claude Code (only the sampling-based `refine`, which doesn't work here), so a known-cosmetic wart just had to stay. Steps feel write-once.
3. **The ceremony has a cost.** The visibility lines and the reply-inside-the-chat rule are *right* — but the fact that "reply inside the chat" is flagged as your #1 most-violated rule tells you something: the friction is real enough that even a careful agent drifts toward the terminal. The durable-by-default place to reply should be the path of least resistance, not the disciplined one.

### New mcp tools to reduce the friction

1. Section/patch-level edit tool. Will be this enough? Edit line level will be useful? Letting AI to edit the doc directly is too dangerous? Suggestions?
2. Plan edit step tool. Enough? Plan edit steps also, is this good for re-ordering steps?
3. Chat docs are the main starting docs for Loom workflow but they are oppsite to normal way of AI to chat. Any solution to force AI to append the reply inside the doc even using terminal Claude CLI? Will be useful to keep a pointer to the next line to read automatically in frontmatter for example. How to avoid wasting many tokens? Suggestions?



## AI:

Good — these three are the right frictions to attack, and they're not equally hard. Let me take each, because the *shape* of the right tool differs a lot between them.

### 1. Section/patch-level edit

**The danger isn't prose edits — it's frontmatter and the steps table.** That reframe answers most of your sub-questions:

- A patch on body *prose* has no reducer semantics. There's no state to derive from "fixed a typo in paragraph 3." So letting me touch body prose with a surgical edit is **not** dangerous — what's dangerous is touching frontmatter (status/version/parent_id) or the canonical `## Steps` table, both of which are reducer/tool-owned.
- So the clean tool is a **string-match patch** (`old_string` → `new_string`, exactly like my native Edit tool) **scoped to body prose only**, that:
  - refuses if `old_string` overlaps frontmatter,
  - refuses if it touches the generated `## Steps` table (that's plan-tool territory — see #2),
  - still routes through the same load → write → re-index pipeline `loom_update_doc` uses, so the link index and frontmatter validation run identically.

That last point matters: this is **not** "editing the file directly." It's a narrower-input MCP tool that produces the same validated write — just without me retyping 200 lines. So it's actually *less* error-prone than full-body replace, not more.

**Line-level edit: no.** Line numbers shift and I don't reliably know them without re-reading the whole doc — which defeats the token saving and adds a brittle failure mode. String-match is what I'm genuinely good at; line ranges are a footgun.

**Recommendation:** one tool, `loom_patch_doc(id, old_string, new_string)`, body-prose-scoped, hard-refusing frontmatter and the Steps table. That single tool removes "the sharpest edge" you named.

### 2. Plan edit step

Since the recent release moved steps into YAML frontmatter (source of truth, body table generated), editing a step = editing frontmatter = must go through a tool. The EX4 wart is exactly this: a one-field fix on one step with no MCP-native path in Claude Code.

I'd split this into **two operations, not one overloaded tool**:

- **`loom_update_step(planId, stepId, {description?, title?, files?, satisfies?, detail?, blockedBy?})`** — amend fields of an existing step. This directly kills the EX4 wart. This is the one you need first.
- **Reordering** is a *separate* need with integrity constraints, so don't fold it into the edit tool. `loom_reorder_steps(planId, orderedStepIds)` — and because `blockedBy` references step **ids** (stable), reordering is just changing display/execution order; the ids stay glued to their steps, so blockers don't break. 

**One guard worth deciding now:** should `update_step` / `reorder` be allowed on a step that's already ✅ done? A completed step has a `done.md` that cites it. My instinct: allow reordering completed steps freely, but **block substantive edits** to a completed step's `description`/`satisfies` unless you explicitly force it — otherwise the done doc silently describes work that no longer matches the step. That's a design decision for you.

**Tension to name honestly:** step-edit must stay a *surgical* primitive (fix a citation, rename a step). It must **not** become the back door for substantive plan changes that should go through refine/regenerate — that's the "fix the generator, not the artifact" rule. The EX4 case is legitimately surgical; I'd document the tool as "for cosmetic/citation/typo fixes, not for redesigning steps."

### 3. Forcing the reply inside the chat doc

This is the deepest one, and the key realization is: **the rule is currently enforced by prose discipline, and discipline degrades — that's *why* it's your #1-violated rule.** The fix is mechanical, not more prose. And you already have the template for it.

You solved the exact-parallel problem once: direct edits to `loom/**/*.md` aren't prevented by asking nicely, they're physically blocked by the `loom-mcp-gate` PreToolUse hook. **Do the same thing here:**

- A **Stop hook** that fires when the turn ends, checks "is a chat doc the active context AND did this turn call `loom_append_to_chat`?" — if a chat is active and no append happened, it blocks the stop and injects "you replied in the terminal; append to the chat first." That moves enforcement from *my discipline* to *the harness*, exactly like the edit-gate. This is the real fix.
- Honest limit: a hook can reliably detect "no append happened," but it **can't easily capture my terminal prose and auto-file it** — the harness doesn't hand the assistant's text to the hook cleanly. So the realistic mechanism is **enforce/remind**, not **auto-capture**. I'd rather be straight with you about that than promise magic.

On **token waste** — three real sources, two already handled:
- Re-reading context every turn → already mitigated by the "is this thread in the transcript?" rule.
- Writing duplicate replies (terminal + doc) → already the rule (terminal = one-line pointer).
- The remaining real cost is **re-reading the whole chat on first touch.** That's where your frontmatter-pointer idea earns its place — framed as a **read cursor** (last-read offset / last `## AI:` line), not a "next line to read." Then a `loom_read_chat_tail(id)` returns only Rafa-turns *after* the last AI reply instead of the whole doc, and `append_to_chat` auto-advances the cursor. Incremental read = the token win you're after.

So Q3 = **two moves**: (a) a Stop hook for enforcement [the durable-by-default fix], (b) a read-cursor + tail-read for tokens [your pointer idea, sharpened].

---

**My priority ordering if you build these:** `loom_patch_doc` (#1) first — biggest, most-felt friction, lowest risk. Then `loom_update_step` (#2) — small, kills a known wart. Then the chat Stop hook (#3a) — highest leverage on the most-violated rule, but it's a hook + harness work, not just an MCP tool, so it's a bigger lift.

Three things I need from you before any of this becomes an idea/design:

1. **Patch scope** — do you want `loom_patch_doc` to refuse frontmatter+Steps-table and *only* touch prose (my recommendation), or also allow a structured frontmatter-field edit path?
2. **Completed-step guard** — block substantive edits to done steps, or trust the operator and allow them?
3. **Chat enforcement appetite** — are you willing to add a Stop hook (mechanism), or do you want to stay rule-only for now and just take the token optimization?

Worth a candid note: all three are genuinely good friction-reducers, and #1 + #2 are cheap. But this is also more Loom-building-Loom — if the goal right now is validating whether anyone *else* feels these frictions, #1 (`patch_doc`) is the one a real external user would hit on day one. The other two are dogfooding-depth polish.

## Rafa:

1. Loved your approach
2. Liked. About `loom_update_step` and `loom_reorder_steps` guard on `done` steps. In my opinion will be very rare the need to update or reorder a done step, maybe is better to don't let the AI do that, what you think? Are real use cases to allow it?
3. Maybe the final approach to make Loom chat docs are implement all, hooks, rules and token optimization, I wonder if this will be too restrictive for AI?
Also I have a doubt, I noticed loom install did not reply:
`.claude/hooks/loom-mcp-gate.ps1` in `chord-flow` project, so there are no hooks there, correct? this should be fixed, correct?

About your note: thanks for the advise! I have any feedback yet and probably Loom will die alone. I am improving Loom just for the pleasure of doing things right, I am the only user of Loom, together with you.

## AI:

**2 — done-step guard: I agree with you, freeze them.** And there's a principled reason, not just "it's rare": Loom is event-sourced — markdown is the database, state is derived, done docs are the audit trail. A completed step is *history*. Editing or reordering it silently rewrites history, and the `done.md` that cites it now describes work that no longer matches. The honest move for a wrong done-step is to record the correction *forward* (a note in `done.md`, or a new step), never to mutate the past.

Real use cases to allow it? I went looking and couldn't find one worth the integrity cost:
- *Reorder a done step* — meaningless. Done is done; its position is historical.
- *Edit a done step's text* (e.g. fix a citation) — the only semi-real case, and it's pure cosmetics on a frozen record. Not worth a mutation path that can corrupt the audit trail.

So: **`loom_update_step` and `loom_reorder_steps` operate on pending/active steps only; done steps are immutable.** If you ever truly must, that's a manual archive-level escape hatch, not an AI tool. This keeps the tools honest with the event-sourcing model.

**3 — "will implementing all three be too restrictive?" The reframe: it's not three restrictions.**
- Token-optimization (read-cursor + tail-read) is *pure help* — zero restriction, it just stops me re-reading 200 lines.
- The reply-inside rule already exists — not new.
- Only the **Stop hook** is a genuine new restriction.

So the real risk isn't "too restrictive in general" — it's **false positives in the hook's detection predicate.** The hook has to answer "is a chat doc the active context *right now*?" and fire only then. If it over-fires, it'll nag on turns where I correctly *shouldn't* append:
- you said `close`,
- a status-only turn with nothing to record,
- an implementation turn where the active context is a *plan*, not a chat.

That over-firing is exactly what would feel oppressive. And here's the catch: a Stop hook is **stateless** and can't see the transcript — it's the same "is this thread active? lives in the AI, not the server" problem your own CLAUDE.md already calls out. So the hard part isn't the restriction, it's **giving the hook a cheap, reliable signal for "a chat is active."** My recommendation: **don't build the hook blind.** Ship the token-opt (pure win) + keep the rule now, and treat the hook as a separate spike whose *first* deliverable is solving detection (e.g. `loom_append_to_chat` writes an "active chat + last-append-turn" marker into `.loom/session-state`, and `close` clears it). If detection can't be made cheap and false-positive-free, the hook isn't worth it and rule+token-opt is the right stack. So: not too restrictive *if* detection is solved; quietly miserable *if* it isn't.

**4 — Your install observation is correct, and it's bigger than a missing file.** I checked `packages/app/src/installWorkspace.ts`. Its steps write `.loom/CLAUDE.md`, `.mcp.json`, `.loom/ctx.md`, `.loom/settings.json`, and seed `.claude/settings.local.json` (attribution + `enabledMcpjsonServers: ["loom"]`). It **never** writes `.claude/hooks/loom-mcp-gate.ps1` and never registers a `PreToolUse` hook. So yes — chord-flow has the *rule* (in the installed `.loom/CLAUDE.md` template) but not the *enforcement*.

The uncomfortable implication: **the gate hook exists only in this repo, hand-placed. Every downstream Loom install has zero physical enforcement** — the "Direct Edit/Write is physically blocked" guarantee is true *only where we're standing*. That also undercuts the Q3 plan: "just mirror the edit-gate hook" assumes the edit-gate ships, and it doesn't.

Should it be fixed? Yes — but two things make it more than a one-line copy:
1. **Portability.** The gate is a `.ps1`. A macOS/Linux user can't run PowerShell hooks. Shipping enforcement means a cross-platform hook (a node script the hook command invokes, or per-OS variants) plus registering it in `.claude/settings.json` `PreToolUse` — `installWorkspace` currently touches `settings.local.json` only.
2. **Sequencing.** This is arguably the prerequisite for #3a. There's no point designing a *chat* Stop hook to ship to users until the *edit* gate hook ships to users — same machinery, same install gap. Fix the install-the-hook story once, reuse it for both.

So the picture across your three asks: **#1 `patch_doc`** and **#2 `update_step`/`reorder` (pending-only)** are clean, cheap, ship-now MCP tools. **#3** has a hidden dependency you just surfaced — the hook-install pipeline doesn't exist yet, so the honest order is: token-opt now → build the hook-install pipeline (which also finally ships the edit-gate to users) → then both gates ride on it.

On your closing note — understood, and no need to dress it up. Building it because it should be built right is a legitimate reason on its own; the work is good regardless of the audience count. I'll keep being straight with you about which parts are real leverage and which are polish, because that's the most useful thing I can be when there's no external signal to lean on.

Want me to turn this into the thread's idea doc — scoped as "MCP friction-reduction tools" with #1/#2 as the shippable core and #3 + the hook-install pipeline as a dependent second phase? Or keep chatting the shape first?

## Rafa:

I see even here there are no active hooks, I renamed `.claude/settings.jsonDISABLED` in the past due to some problem, so hooks aren't be loading at all and you are working just under rules, but for documents you are always using mcp tools. It looks just loom chat docs replies work againts your nature.

Dure to hooks portability for install, maybe we should drop them for now, I am the only final user and work in every project just with the rules. What you think?

Create idea & design for the rest of ideas here include chat token optimization read-cursor + tail-read

## AI:

That detail changes my recommendation — and it's the most useful data point in this whole thread. If the gate hook has been off the entire time and I've *still* been routing every doc write through MCP tools, then the empirical verdict is in: **rules alone are sufficient for doc-writes.** The hook was insuring a risk that wasn't materializing. And the one place rules-alone genuinely fails — chat replies — is exactly the place a hook is hardest to build (the stateless detection problem) and least portable.

So **yes, drop hooks.** Reasons, in order of weight:
1. **Proven unnecessary where it'd be easy.** Doc-write enforcement is redundant — you have months of evidence (hook off, MCP still used).
2. **You're the only user.** The cross-platform install pipeline buys *you* nothing; it was only ever for hypothetical downstream users who don't exist yet. Classic YAGNI.
3. **Vision alignment.** Your own north star says the durable path should be the *path of least resistance, not the disciplined one.* A hook forces the path. The token-optimization makes it *cheap*. For the one weak spot (chat replies), making the reply cheap is more aligned than making it mandatory — incentive over restriction.

So the chat-reply drift gets addressed the *right* way: not "force me with a hook," but "make appending so cheap there's no pull toward the terminal." That's what the read-cursor + tail-read is really for — it's not just a token saving, it's the mechanism that makes the durable path the easy one.

Decision recorded: **hooks dropped / out of scope.** I'll note it explicitly in the design as a rejected alternative with this rationale, so the reasoning survives.

Creating the **idea** and **design** now, scoped to:
- `loom_patch_doc` — body-prose string-match edit
- `loom_update_step` + `loom_reorder_steps` — pending-only step editing (done steps immutable)
- Chat token optimization — frontmatter read-cursor + `loom_read_chat_tail`, with `append_to_chat` auto-advancing the cursor
- Hooks — explicitly rejected, rationale recorded

Will point you at both when written.

## AI:

Both written (status: draft):
- **Idea** → `mcp-new-tools-idea.md` (`id_01KTTM64G1B2XZMDS739CDABYF`) — scope, the three frictions/fixes, hooks-rejected, success criteria, priority.
- **Design** → `mcp-new-tools-design.md` (`de_01KTTM79FTN3R728DZGTXZCSJE`) — tool shapes, guards, the done-step immutability rule, read-cursor mechanics, rejected alternatives, and three open questions.

The three open questions in the design need your call before a plan:
1. **Read-cursor representation** — line-index vs byte-offset vs "last `## AI:` block index" (block-index is most robust to reflow but needs a stable block parse).
2. **`patch_doc` on plan bodies** — reject only matches that hit the Steps block, or forbid patching plan bodies entirely (force all plan edits through structured tools)?
3. **`reorder_steps` done rule** — I assumed "done steps keep their leading positions"; confirm that matches how completed steps are actually ordered.

Both are `draft` — not finalized, so nothing's locked. Want to settle the three open questions, then I'll turn this into a plan?

## Rafa:

1. last `## AI:` block index. Be aware to use string defined in `settings.json` "ai.model"
2. i think reject only matches that hit the Steps block is enough, agree?
3. yes, done steps keep their leading positions

settle this in design if you agree

create plan

## AI:

Design settled (all three resolutions baked in + a "Resolved decisions" section), and the **plan** is created:

**Plan** → `mcp-new-tools-plan-001.md` (`pl_01KTTMWSJ60X1X4VWGRV4T1R81`), target **1.4.0** (lockstep):
1. **loom_patch_doc** — body-prose string-match, frontmatter never matched, reject Steps-block intersection for plans.
2. **loom_update_step** — amend a pending step's fields, regenerate table, reject done steps.
3. **loom_reorder_steps** — permutation-only reorder, done steps pinned as leading block *(blocked by step 2 — shared step-frontmatter foundation)*.
4. **Chat read-cursor + append auto-advance** — last-AI-block index in frontmatter, detection keyed on configured `ai.model`/`user.name`.
5. **loom_read_chat_tail** — return content after the last AI block *(blocked by step 4)*.
6. **Tests, build, docs sync, bump to 1.4.0** — MCP integration tests, build-all + test-all, sync both CLAUDE.md surfaces + verify `loom://catalog`, version bump *(blocked by 1–5)*.

One thing worth flagging while it's fresh: I set the target in the plan goal + step 6, but I **couldn't set `target_release: "1.4.0"` on the design's frontmatter** — `loom_update_doc` only exposes content/status/requires_load, and no other MCP tool sets `target_release`. So the design frontmatter still says whatever it was born with. That's arguably a *fourth* small friction (release metadata isn't writable through the MCP surface). Options: (a) add a `target_release` param to `loom_update_doc`, (b) fold it into a future `loom_finalize_doc` at finalize time, or (c) ignore it for a one-user repo. Want me to add it to this thread's scope, or leave it?

Plan is ready but nothing's started. Step 1 (`loom_patch_doc`) is first and unblocked — say `go` to begin.

## Rafa:

(a) add a `target_release` param to `loom_update_doc`

do whole plan

question: when chat new functionality is implemented:
- launching AI chat reply from extension will use new methods and token optimization,correct? 
- how I instruct AI when I use terminal Claude CLI? now I should not use `line 555` prompt, what should I prompt?

## AI:

Good calls. Two things before I start coding:

**`target_release` param** — folding into the plan. Since the step-editing tools don't exist *yet* (that's literally what we're building — I can't add a formal plan step without them, the bootstrap irony), I'll implement the `loom_update_doc` `target_release` param as the first piece of Step 1's work and then use it to stamp this design's `target_release: "1.4.0"`. Calling it out so the plan-vs-reality stays honest.

**Your two questions — and they expose a real scope gap, so thank you:**

1. *Extension chat-reply launch using the new methods?* — **Only if we update the launch prompt.** The extension launches a Claude CLI agent with a task prompt, and that prompt out-ranks CLAUDE.md and tool descriptions. So the agent will only use `loom_read_chat_tail` + the cursor if the **launch prompt tells it to**. That's `packages/vscode` launch-prompt text, which my plan did **not** cover — it only synced the two CLAUDE.md surfaces. So I'm expanding **Step 6** to also update the extension's chat-reply launch prompt to use `read_chat_tail`. Without that, the extension path keeps reading whole chats.

2. *How to prompt from terminal Claude CLI now?* — The whole point is you **stop needing `line 209`-style pointers.** After this ships, when a chat is the active context you just say **`reply`** (or `continue chat`) and I call `loom_read_chat_tail` to pull only your turns since my last reply — no line number, no full re-read. First touch in a fresh session, name it once: **`reply in mcp-new-tools chat`**. I'm also expanding Step 6's CLAUDE.md sync to encode this as the default rule ("chat active → first touch uses `read_chat_tail`"), so the line-pointer habit retires itself.

Net: Step 6 grows to cover (a) the two CLAUDE.md surfaces, (b) the new terminal chat-reply rule, (c) the extension launch-prompt update. Starting Step 1 now and running straight through per your "do whole plan."

## AI:

Steps 1–5 implemented and **build-all is green** (core → fs → app → mcp → cli → vscode all compile). Step 6 (integration tests, docs sync, version bump) left pending per your "stop for new stuff". Done notes for each step are in `plans/done/`.

**What shipped (code):**
- **`loom_patch_doc`** — body-prose string-match edit; frontmatter never matchable; plans reject matches that hit the generated `## Steps` table (rest of the plan body is patchable).
- **`target_release`** param added to `loom_update_doc` (design docs only).
- **`loom_update_step`** — `UPDATE_STEP` event + pure reducer; amends `description`/`files`/`satisfies`/`blockedBy`; **rejects done/cancelled steps**.
- **`loom_reorder_steps`** — `REORDER_STEPS` event + reducer; permutation-only; **done steps pinned as leading block**.
- **Chat cursor** — `ChatDoc.last_ai_block`; `loom_append_to_chat` now round-trips through the serializer and advances the cursor on AI turns (no version bump — existing semantics preserved).
- **`loom_read_chat_tail`** — returns only the turns since the last AI reply; falls back to on-the-fly detection for chats with no cursor yet.

**Three things you need to know (for "new stuff"):**

1. **None of this is live in *this* session.** The running `loom mcp` is the pre-build process — the new tools/params won't exist until you restart the Claude Code session (or the MCP server). That's also why I **couldn't stamp this design's `target_release: "1.4.0"` yet** — the `target_release` param only exists in the rebuilt binary. First thing after restart, I can run `loom_update_doc(target_release="1.4.0")` on the design.

2. **Design refinement to confirm.** I narrowed `loom_update_step`'s fields to `description`/`files`/`satisfies`/`blockedBy` and **dropped `title`/`detail`** — because `frontmatterUtils` is explicit that title/detail are *body-owned prose*, not frontmatter, and aren't even read back into the step model. So they belong to `loom_patch_doc` (which can edit the `### Step N` sections), not `update_step`. Clean split, no frontmatter↔body drift. But the design doc's text still lists title/detail in the patch — want me to update the design to match (in step 6, or now)?

3. **Plan `files_touched` were guesses.** A couple differed from reality — e.g. `patch_doc` lives entirely in the MCP tool layer (like `update_doc`), not a separate `app/src/patchDoc.ts`; the chat cursor lives in core/entities, not `fs/src/settings.ts`. The done notes record the actual files.

Step 6 remains: integration tests (patch guards, done-step immutability, reorder leading-block, tail-read with a custom `ai.model`), `test-all`, sync both CLAUDE.md surfaces + the extension launch prompt, verify `loom://catalog`, and the 1.4.0 bump. Ready when you are — waiting for new direction.

## Rafa:

I reconnected mcp. Tell me if is worth to test chat new mcp tools

### About sync both CLAUDE.md surfaces

This is part of the analysis I asked you for:
```
The two CLAUDE.md surfaces drift

There are two copies of the session contract: the root `CLAUDE.md` and the `LOOM_CLAUDE_MD`
template in `installWorkspace.ts`. The rule says to keep them in sync, but sync-by-convention
drifts. I've noticed small inconsistencies between them during sessions.

This should be automated: one source of truth in a file, with a build step or test that verifies
the template matches. The recursive Loom session is a bad place to discover drift.
```

Maybe we could implement this before step 6, what you think?
If you agree, create a plan for it

## AI:

**Worth testing the chat tools? Yes — and I just did.** `loom_read_chat_tail` on this chat returned exactly your latest turn, and notably surfaced the *full* message including "Maybe we could implement this before step 6… create a plan for it" — which my earlier line-limited read had cut off. So it both works and already earned its keep. That ran the on-the-fly fallback (this chat has no `last_ai_block` yet). This very reply is the *other* half of the test: it's the first append through the rebuilt tool, so it should write a `last_ai_block` cursor into this chat's frontmatter. If you peek at the frontmatter after this, you'll see it appear — and a follow-up `read_chat_tail` would then return "(no new turns)".

**CLAUDE.md sync — agreed, before step 6.** The synergy is the clincher: step 6 makes me hand-sync both surfaces for the new tools, which is the exact drift moment you're describing. Build the guard first, and step 6's sync is verified for free.

**Plan created** → `claude-md-sync-plan-001.md` (`pl_01KTTR6XZYBZJ0HDK4HQKB79AS`), 4 steps:
1. Extract the shared contract core into one canonical file (`scripts/claude-md/contract-core.md`); bracket the injection region in both surfaces with `<!-- LOOM-CONTRACT:start/end -->` markers; project-specifics stay outside.
2. `scripts/sync-claude-md.ts` — injects the core between markers in both surfaces; `--check` mode fails on drift.
3. Wire `--check` into `test-all` (drift fails the suite — discovery moves out of live sessions).
4. Run the sync to converge + rewrite the "Two CLAUDE.md surfaces" section to document the edit-core→sync flow.

This is your stated model — "one source of truth in a file, with a build step or test that verifies." Two things to flag:

- **The one real complexity (step 2):** the template isn't a normal file — it's a TS *template literal* (`LOOM_CLAUDE_MD`) inside `installWorkspace.ts`, and the CLI ships bundled by esbuild. So the sync script edits the marked region *inside that string literal* (with backtick/`${}` escaping), rather than the install reading the core file at runtime (which wouldn't survive bundling). Tractable, but it's the part most likely to need care.
- **Placement:** I put the thread in the existing `loom` meta-weave (`loom/loom/claude-md-sync/`) since it's a contract/meta concern. If you'd rather stand up a proper `docs-infra` weave (the architecture doc references one, but it doesn't exist on disk), say so and I'll move it.

Plan is `draft`, nothing started. Also still holding: the mcp-new-tools design refinement (drop title/detail from `update_step`) and stamping that design's `target_release: "1.4.0"` (now possible — MCP is live). Want me to (a) start this sync plan, (b) do those two quick mcp-new-tools cleanups first, or (c) something else?

## Rafa:

(b) then (a), i alredy started the plan

## AI:

**(b) done and verified** — both via the new live tools:
- `loom_patch_doc` dropped `title`/`detail` from the design's `update_step` patch list (`replacements: 1`).
- `loom_update_doc(target_release="1.4.0")` stamped the design (frontmatter now shows `target_release: 1.4.0`, v4).

**(a) — STOP, design finding before I touched any file.** I read the *actual* `LOOM_CLAUDE_MD` template in `installWorkspace.ts` against the root `CLAUDE.md`, and the plan's premise — "extract one verbatim shared core, inject into both, verify they're equal" — **is false.** The two surfaces are not "shared core + extra sections." They're **deliberately adapted paraphrases** of the same rules. Concretely, the shared rules differ by design:

- **Persona:** root says *Rafa* / "until Rafa says `close`"; template says *the user* / "until the user says `close`".
- **Install state:** root states the `loom-mcp-gate.ps1` hook *is* installed; template hedges "*if* a gate hook is installed in this workspace".
- **Numbering:** root's session-start makes the catalog **step 3** (5-step protocol); the template makes it **step 2** (shorter protocol).
- **Condensation:** the template is a terser rewrite (e.g. the single-AI section is one bullet vs root's three paragraphs), and the MCP-visibility block is merged vs root's three separate blocks.
- **Root-only sections** (Architecture, Current active work, Build/test, Applied learning, Two-surfaces) interleave *between* the shared ones — they're not all at the end.

So there is **no byte-identical region** to extract or to assert equal. A verbatim sync/diff check would either always fail or have nothing to lock. The root cause of the drift you've felt isn't "no sync script" — it's that **both files are hand-maintained paraphrases with real, intentional per-surface variation**, so a rule added to one is easy to forget in the other, *and* the wording legitimately differs.

That changes the solution space. Three honest options:

1. **Variable-templated single source (correct/durable).** One canonical contract with placeholders for the genuine variables — `{{USER}}` (Rafa/the user), `{{GATE_CLAUSE}}` (installed vs if-installed), `{{CATALOG_STEP}}`, and an include/exclude flag for root-only sections — plus a small renderer that generates *both* files. `test-all` asserts the on-disk files match a fresh render. True single source; respects the real differences. Cost: build the renderer + define the variable/section set; both files become generated artifacts (still human-readable, but you edit the source, not them).

2. **Normalize-then-sync (simpler mechanism, heavier edit).** Rewrite the shared rules to be *identical* (use "the user" even in the recursive file, unify step numbers, un-condense the template) so the original marker-inject approach works. Cost: flattens the recursive file's tailored voice and the template's deliberate terseness — I'd argue against it; the adaptations are features.

3. **Structural drift test (lightest, catches your actual failure mode).** Don't unify wording at all. Tag each shared rule with a stable id marker (e.g. `<!-- rule:chat-reply -->`) in both files; a test asserts the *set of rule-ids* matches across both. Catches "a rule was added/removed in one but not the other" — the exact "small inconsistencies" you described — without forcing identical prose. Cost: low; doesn't catch wording drift within a rule.

My read: if the pain is "I added/changed a rule in one and forgot the other," **(3)** is cheap and hits it dead-on. If you want genuine one-source-of-truth, **(1)** is the right durable build. I'd skip (2).

The current plan assumes a world that doesn't exist, so whichever you pick, I'll revise it (I can use the new `loom_update_step` to rewrite the steps). Which approach — 1, 3, or something else?

## Rafa:

As you said 1 is correct/durable, true single source, but also both are for different surfaces. So wording is different of purpose, right? 1 implie more effort than 2, but is worth to do it? what you think?

## AI:

You just made the argument that decides this — and it points *away* from 1, not toward it.

"Wording differs by purpose" is exactly right, and it has two consequences:

1. **It kills option 2 outright.** If the surfaces must read differently (Rafa vs the user, gate-installed vs if-installed, terse vs full), you *can't* normalize them to identical without degrading one. So 2 isn't "the cheaper 1" — it produces a worse result. Drop it.

2. **It shrinks option 1's payoff.** Single-source via templating only pays off when the surfaces are *nearly identical* and vary by a token or two — then one source + a couple of substitutions is clearly better than two copies. But we've established they vary by **voice, structure, detail level, and which sections exist at all.** To template that you need placeholders *and* conditionals *and* per-surface section includes — at which point the "single source" is a placeholder-laden file that's harder to read than either contract, and you're *still* making all the same per-surface wording judgments, just expressed as template logic. You've moved the effort, not removed it. And a session contract is a document humans (you, and every downstream user) actually read — turning it into a generated artifact has a real readability cost.

So: **is 1 worth the extra effort? No — I don't think so, precisely because of the point you raised.** The juice isn't worth the squeeze when the two outputs are meant to read differently.

What's actually worth building is **option 3**, because your real pain is *presence* drift — "I changed/added a rule in one and forgot the other" — not *wording* drift. Tag each shared rule with a stable id in both files (`<!-- rule:chat-reply -->`, `<!-- rule:stop-rules -->`, …); a `test-all` check extracts the rule-id set from each and asserts they match. That catches the exact failure mode, costs almost nothing, and lets each surface keep its purposeful voice.

One cheap refinement worth adding to 3: a tiny **verbatim-invariant** list for the handful of things that genuinely *must* match byte-for-byte regardless of surface — the visibility prefixes (`🔧 MCP:`, `📡 MCP:`, `⚠️ MCP unavailable — editing file directly`), the tool names, the stop-rule count. The test asserts those strings appear identically in both. So: structural rule-set parity + a few exact-string locks. Catches presence drift *and* the specific tokens that can't be allowed to diverge, without the templating tax.

My recommendation: **option 3 (+ the invariant locks).** Want me to revise the plan to that — I'll rewrite the steps with `loom_update_step` — or do you still want to weigh 1?

## AI:

Already done — and we reached the same conclusion independently. I archived the old plan and created a fresh one rather than surgically amending, for the reasons I flagged: `loom_update_step` is scoped to surgical edits (not a wholesale approach swap), and editing in place would leave semantically-stale step ids (`sync-script-inject-check` for what's now a drift-test step). A fresh plan with zero completed steps loses nothing and reads coherently.

- **Old plan** → archived to `loom/.archive/loom/claude-md-sync/plans/claude-md-sync-plan-001.md` (matches your mirror-path convention — the tool honored it).
- **New plan** → `pl_01KTTSTE25N3CD8A1KT2KJ3KC1` (reused the `claude-md-sync-plan-001.md` filename, since the old one moved out of the plans dir).

**Revised plan — option 3 + invariant locks (4 steps):**
1. **Tag shared rules with stable ids in both surfaces** — add `<!-- rule:{id} -->` markers before each shared rule in the root CLAUDE.md *and* the `LOOM_CLAUDE_MD` literal; root-only sections get none. Zero wording change — just the parity seam.
2. **Build the two-surface drift test** (`tests/claude-md-sync.test.ts`) — assert the rule-id *sets* match across both surfaces (naming which ids are missing where), plus verbatim-invariant locks (the `🔧 MCP:` / `📡 MCP:` / `⚠️ MCP unavailable…` prefixes, tool names, stop-rule count) appear identically.
3. **Wire into `test-all`** — drift fails the suite; discovery leaves live sessions.
4. **Document the convention** — rewrite the "Two CLAUDE.md surfaces" section: rule-id markers + invariant list + test-all enforcement, explicitly noting per-surface wording may differ by purpose.

The goal prose now records *why* option 3 over option 1 (so the decision survives).

Small meta-note: this whole detour exposed a real gap — there's **no clean "revise a plan's approach" path** (update_step is surgical, regenerate is blocked in Claude Code, so you archive + recreate). Worth a thought for later, not now.

New plan is `active`, nothing started; step 1 is unblocked. Say `go` to start it — or want to eyeball the new plan first?

## AI:

**CLAUDE.md two-surface sync plan — done (4/4), test green.**

1. Tagged 13 shared rules with `<!-- rule:{id} -->` markers in both surfaces (root `CLAUDE.md` + the `LOOM_CLAUDE_MD` template literal). Root-only sections unmarked.
2. `tests/claude-md-sync.test.ts` — asserts the rule-id *sets* match + 12 verbatim invariants (visibility prefixes, core tool names, the 4 stop-rule hallmarks); no-duplicate guard. Passing: 13 ids match, 12 invariants present.
3. Wired into `scripts/test-all.sh` — drift now fails the suite.
4. Documented the convention in the "Two CLAUDE.md surfaces" section (markers + invariants + test-all enforcement, and that per-surface *wording* may differ by purpose — only the rule set + invariants are locked).

Nice moment: the test **caught my own documentation** — the prose's literal `<!-- rule:id -->` examples got miscounted as a phantom rule, so it failed on a duplicate. That's the guard proving itself. I fixed it durably by line-anchoring the marker regex (only standalone-line markers count) + using the `{id}` placeholder in prose.

Honest reflections from this run (you like these):
- **Dogfooding paid off live:** `read_chat_tail` surfaced your full turn that a line-read had truncated; `patch_doc`/`update_doc(target_release)` did the design cleanups; the cursor wrote itself into this chat's frontmatter. The new tools work in anger, not just in tests.
- **A real friction I hit:** there's no clean "revise a plan's whole approach" path — `update_step` is (correctly) surgical, regenerate is blocked in Claude Code, so I archived + recreated. Worked fine, but it's a gap worth a future thought.
- **The archive tool honored your mirror-path convention** (`loom/.archive/{weave}/{thread}/`), contrary to its own "same level" description — so the memory about that was stale; behavior is correct now.

**Still open (the original deferred work): mcp-new-tools plan step 6** — integration tests for the new tools, `build-all` + `test-all`, sync both CLAUDE.md surfaces for the new tools (now *guarded* by the drift test — the synergy we sequenced for), verify `loom://catalog`, and the 1.4.0 bump.

Want me to pick up mcp-new-tools step 6 next, or stop here?

## Rafa:

mcp-new-tools plan step 6

fix loon_archive description

### About "revise a plan's whole approach" path

We need a clean:
- update whole plan tool. 
- add a mew step?
- delete a step?
What you think? suggestions?


## AI:

**`loom_archive` description fixed** — now says it mirrors the path under `loom/.archive/` (matches the actual behavior; the old "same level" text was just wrong). Goes live on next build.

**Plan-revision tools — my take on your three:**

- **`loom_add_step` — yes, build it.** Same step fields as `create_plan` (`description`, `title?`, `files?`, `blockedBy?`, `satisfies?`, `detail?`) + a position (`append` default, or `after:{stepId}` / `before:{stepId}`). New stable slug id, recompute `order`.
- **`loom_remove_step` — yes, build it.** Remove a *pending* step by id. Two guards: (1) reject removing a done/cancelled step (same immutability rule as `update_step`); (2) handle `blockedBy` references pointing *at* the removed step — strip them (or reject and tell you which steps depend on it). Recompute `order`.
- **`loom_update_whole_plan` — I'd skip it.** A plan with done steps has history (its `done.md` cites them); a wholesale steps-array replace either clobbers that history or has to preserve the done ones — at which point it's just add/remove/update on the *pending* steps. And for a plan with **no** done steps, "recreate" (archive + create) is equivalent and more honest — a fundamentally different approach genuinely *is* a new plan. So `add` + `remove` + `update_step` + `reorder_steps` give you full CRUD; wholesale pivot = recreate. A whole-replace tool mostly adds a footgun.

**But there's a foundational issue underneath all three** — and it's already latent in the `reorder_steps` I shipped. The body's per-step detail sections are headed `### Step N — {title}`, **keyed by order number N**. The moment you reorder/add/remove, those N's drift from the table (step "### Step 2" might now be row 3), and title/detail aren't in frontmatter so the saver can't regenerate them. So add/remove/reorder keep the *table* correct but leave the *detail prose* stale. The clean fix is a real design decision:
- **(a)** Key detail sections by stable step **id**, not order N (e.g. `### {id}` or an HTML anchor), and have the saver regenerate/prune them from the step model — detail still body-authored, but addressable so it survives restructuring; or
- **(b)** Persist `title`/`detail` into frontmatter and make the body a full generated projection (reverses the current "body owns prose" decision).

This is exactly the kind of thing that deserves its own thread (idea → design → plan) rather than being bolted on — it's the difference between "two more tools" and "step structure that's actually safe to restructure." I'd lean (a).

**Sequencing recommendation:** the new 1.4.0 tools are done and dogfooded — let's **close mcp-new-tools step 6 and ship 1.4.0 first**, then spin up a dedicated thread for the step-CRUD tools (add/remove + the detail-keying fix) for a later release. Don't expand 1.4.0's scope now.

On **step 6 itself:** it ends in a real release action (the 1.4.0 version bump + tag), so I want your explicit go before running it. Want me to start step 6 now (integration tests → build-all + test-all → sync the new tools into both CLAUDE.md surfaces, now drift-guarded → verify catalog → 1.4.0 bump)?

## Rafa:

okey
1. close mcp-new-tools step 6 and ship 1.4.0 first
2. then then spin up a dedicated thread for the step-CRUD tools (add/remove + the detail-keying fix) for a later release


## AI:

**mcp-new-tools step 6 done — plan complete (6/6). 1.4.0 is committed + tagged locally, NOT pushed.**

- **Tests:** `tests/mcp-new-tools.test.ts` covers all four tools' guards (update_step done-rejection, reorder permutation + done-leading-block, patch_doc uniqueness + Steps-table refusal, read_chat_tail tail with a custom `ai.model`). Full `test-all` green — including all 16 MCP integration tests.
- **CLAUDE.md:** both surfaces synced for the new tools (writes-breakdown + a `read_chat_tail` note); the drift test confirms parity (13 rule ids, 12 invariants).
- **Release prep:** catalog verified; CHANGELOG written (root 1.4.0 notes + vscode lockstep note); all 7 `package.json` → 1.4.0.
- **Git:** commit `0caf247` `release: v1.4.0 …`, tag `v1.4.0` (local).

**Push is gated for your go** — it's the public release trigger. Because it's a lightweight tag, `--follow-tags` won't carry it (the gotcha), so push explicitly:
```
git push && git push origin v1.4.0
```
Say "push it" and I'll run those, or run them yourself.

Two flags: `bump-version.sh` reminds to eyeball the **3 READMEs** for hardcoded version strings (I didn't touch them); and both plans are now `done` (mcp-new-tools + claude-md-sync).

**Next when you're ready:** the deferred **step-CRUD tools** thread — `loom_add_step` / `loom_remove_step` + the detail-section-keying fix (so `### Step N` prose survives restructuring).