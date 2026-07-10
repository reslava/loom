---
type: chat
id: ch_01KX62A2T4ZY751AA0WTC6BBW8
title: ways-to-use-loom Chat 001
status: done
created: 2026-07-10
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 9
---
# ways-to-use-loom Chat 001

## Rafa:

Loom as a final tool (not this project itself)

### Users

Loom has 2 users:
- Human user, called user for now on
- AI user, called AI for now on 

### Ways to use Loom by users

#### Extension

We recommend always use extension to visualize and manage:
- loom docs tree graph (CRUD)
- roadmap / history (Assign soft priorities)

#### CLI

But, of course, users can also use loom CLI only. Only problem: no visual docs tree

#### AI Interaction

There are also 2 different ways to interact with AI:

a) using extension UI (buttons, menus...) launch AI mcp prompts. Then AI will use mcp tools, resources to do the task. Users could also use Loom CLI in a terminal.

This way is very visual/interactive almost no need to write anything. Good option for begginer users and/or simple projects (not the real audience of Loom)
In this way, each AI interaction launched from extension will open a new session in the terminal (Loom AI). user can see AI working and interact.

b) using extension for visuals, and terminal for: 
  - loom CLI 
  - asking AI directly. AI will use loom mcp tools, resources

This way is more advanced, flexible, allow AI session last the time decided by user so for example allow do cross-threads tasks.
User can point AI to use some mcp tool, resource, for example, read {weaveSlug}/{threadSlug}/{doc} or use loom_quick_ship for this simple fix

### TODO

Documentation, mostly 2 READMEs and user guides should show the different ways to use Loom
Also little reald examples of how to use each ways
Also the pros and cons and which way we recommend
Also how loom architecture and layers, mcp, etc are related and serve these different ways
Maybe we could create a new doc

tell me what do you think? suggestions? different ways you propose?

## AI:

Good topic to nail down — this is really about *positioning*, and getting the mental model right matters more than the prose. First, one honest framing note: **this is a documentation/positioning task, not a feature** (vision-check: it serves "works with Claude Code, Cursor, or any MCP-capable agent" and "drop `loom install` into any repo," but it removes no manual step by itself). So the win is a clean model users can locate themselves in — not more surface area. Below is what I'd change and what I'd add.

### 1. Two independent axes, not three flat "ways"

Your draft lists Extension / CLI, and then a) / b) under AI — but a) and b) are actually mixing two *orthogonal* choices, which is why it reads slightly muddled. I'd frame it as **two axes the user combines freely**:

- **Axis A — the human's control surface** (how you see & manage the doc graph): Extension (visual tree + roadmap + buttons) · CLI (`loom status`/`roadmap`/CRUD) · or "let the agent run them for you."
- **Axis B — the AI's session model** (how inference is driven): **task-scoped launches** (extension button → one fresh agent session per action, steered by the launch prompt) vs a **persistent agent** (you keep a Claude Code / Cursor session open, converse, point it at MCP resources/tools, spans many threads, ends when you say).

Your (a) = A:Extension + B:task-scoped. Your (b) = A:Extension + B:persistent. The value of the axes framing: it makes clear these are *combinable*, and it exposes the cells you haven't named yet (below).

### 2. Two "ways" you're missing

- **Pure terminal agent, no extension.** Your (b) still assumes "extension for visuals." But a real cohort (Cursor users, terminal purists) runs *no* extension at all — just an MCP-capable agent + `loom` CLI for orientation. This is the axis-A "CLI/agent-only" cell and it's the truest test of the host-agnostic promise. Worth calling out explicitly.
- **Automation / CI (no AI, non-interactive).** `loom validate` in CI, `loom record-release` in a release script, `loom roadmap` in a dashboard. Neither visual nor AI-driven — pure scripted CLI. It's a legitimate way to use Loom that your draft omits entirely.

### 3. Weave in the two cross-cutting facts

- **Host-agnostic.** The extension launches *Claude* specifically, but ways (b)/(pure-terminal) work with **any MCP host** (Cursor, Continue, …). The docs should make that concrete, because it's a headline vision promise that's currently invisible to a reader.
- **Single-AI path.** Don't let the docs imply (a) and (b) are "different AIs." (a) primarily uses the launched-Claude-CLI path (subscription, no key; sampling+key only as fallback); in (b) you *are* the agent session already. Same one-AI model, different entry point.

### 4. Doc placement — I'd push back on "2 READMEs + a new doc"

That sprawls the same matrix across three surfaces that will drift. I'd instead do **one canonical guide** (this thread's real output — e.g. a `ways-to-use-loom` reference or a `docs/` user guide) as the single source, and have `packages/cli/README.md` and `packages/vscode/README.md` each carry a *short* section that **links** to it, not a copy. That respects the doc-sync discipline in CLAUDE.md (canonical facts restated in many docs = drift). For "which way should I pick," a small decision table beats per-way pros/cons: *solo vs team · beginner vs power · editor-centric vs terminal-centric · simple vs cross-thread* → recommended recipe.

### 5. One real design observation (not just docs)

The persistent cross-thread agent (your b) sits in slight tension with the current session-start contract, which is tuned for the *recursive* build-Loom case: "load only the **pointed** thread deeply, STOP and wait." A long-lived cross-thread agent orients differently — off `loom://roadmap` + `loom://state?shape=summary`, hopping threads on its own cadence. If we're going to *recommend* way (b) to real users, that way probably deserves its own light contract guidance (orientation-first, not deep-load-one-thread-and-stop). That's a genuine gap, worth a sentence in the design even if we don't build anything.

### Suggested shape for the eventual doc

1. Who the two users are (human + AI) — keep this, it's a nice hook.
2. The two axes + a small matrix.
3. **Named recipes** (concrete points in the space): *Guided* (extension-driven, beginner/simple) · *Power terminal* (extension for tree + persistent agent + CLI) · *Pure agent* (terminal-only, any MCP host) · *Automation* (CLI in CI).
4. Decision table → pick your recipe.
5. "How the architecture serves this" — one short section: MCP is the shared spine every way rides (extension → mcp, CLI → app, agent → mcp), which is *why* the ways interoperate on the same doc graph.

**The one thing to settle before drafting:** single canonical guide + README pointers (my recommendation), or genuinely separate content per README? That decision drives whether this thread produces one doc or three. What's your instinct?

## Rafa:

yes, this is a documentation/positioning task, not a feature

I loved the way you framing my draft vision idea and give it axes and cells that were in my mind but not in my darft, thanks!

Fully agree 1,2,3

### 4. Doc placement

We need to decide which canonical guide:
- `refs/ways-to-use-loom-reference.md`   
- `docs/WAYS-TO-USE-LOOM.md` <- I lean this. docs/*.md are loom user docs and refs/*.md are loom dev docs, agree?
  
and have `packages/cli/README.md`, `packages/vscode/README.md` and **main `README.md`** each carry a *short* section that **links** to it
             
### 5. One real design observation (not just docs)

I think you missunderstood my cross-thread example here. I meant that, for example, in the middle of building thread-A you could tell to AI Agent: `read thread-B idea we previoulsy implemented to know why we decide this`

But the scope of a thread is always implement a slice and the reason for loom to inject always fresh thread context when a session start.

I usually always close the AI session when the thread is done and commited.
Sometimes when we just started a thread-A we realised that we need a thread-B before, so I asked you to spin up thread-B and an idea, I created a chat there and pointing you to that new active chat in thread-B. We switched the thread becuase original thread-A was just starting, almost no context. This kind of freedom is useful, but do not go opposite direction to Loom at all.

### Suggested shape for the eventual doc

You missed, write down some little real examples.
As I refered in point 4, single canonical guide + pointers in the 3 READMEs

### TODO

Are we converged and agree in all points?
2. The two axes + a small matrix, draw me a draft

## AI:

Yes — we're converged. Point-by-point:

**4. Doc placement — agree, `docs/WAYS-TO-USE-LOOM.md`.** Your split is exactly the right convention: `docs/*.md` = **user** guides (public, how-to-use), `refs/*.md` = **dev** references (architecture, internal facts). "Ways to use Loom" is squarely a user-facing guide, so it belongs in `docs/`, not `refs/`. Canonical guide = `docs/WAYS-TO-USE-LOOM.md`; short linking section in **all three** READMEs — `README.md` (main), `packages/cli/README.md`, `packages/vscode/README.md`. One source, three pointers.

**5. My mistake — you're right, and it *removes* the gap I flagged.** I over-read "cross-thread" as a persistent agent doing *work* across threads. What you actually described is two things that are already 100% within Loom's pointer model:
- **Pointed read for context** — mid thread-A, "read thread-B's idea to see why we decided X." That's just a `loom://context/{weave}/{thread}/idea` read; you stay in thread-A, no scope change.
- **Clean early thread-switch** — thread-A barely started (near-zero context) → spin up thread-B + idea + chat, point me there, switch. Cheap because A had nothing invested yet.

Neither fights Loom's "one thread = one slice, fresh context injected at session start, close when done+committed" discipline — they *ride* it. So there's **no contract change needed**; this stays a pure-docs task. I'll fold both as a documented pattern ("borrowing context from another thread" + "switching early") with a real example, rather than a gap.

**Examples — noted, they're in.** Each recipe gets a little real example (a concrete button-click sequence for Guided, a real terminal exchange for Power/Pure, a CI snippet for Automation).

---

### 2. The two axes + matrix — draft

**Axis A — human control surface:** how *you* see & manage the doc graph.
**Axis B — AI session model:** how inference is driven.

```
                          AXIS B — AI SESSION MODEL
                ┌────────────────────────┬───────────────────────────┐
                │  Task-scoped launch    │  Persistent agent         │
                │  (extension button →   │  (you keep one agent       │
                │   1 fresh AI session   │   session open, converse,  │
                │   per action)          │   you decide when it ends) │
 ┌──────────────┼────────────────────────┼───────────────────────────┤
 │ Extension    │  ① GUIDED              │  ② POWER TERMINAL         │
 │ (tree,       │  beginner / simple     │  extension for the tree,   │
 │  roadmap,    │  click a button,       │  drive a persistent agent  │
 │  buttons)    │  watch AI work         │  + CLI in the terminal     │
 ├──────────────┼────────────────────────┼───────────────────────────┤
 │ Terminal /   │  —                     │  ③ PURE AGENT             │
 │ CLI only     │  (launches are an      │  terminal-only, no ext.,   │
 │ (no ext.)    │   extension mechanism) │  any MCP host (Claude Code,│
 │              │                        │  Cursor, Continue…)        │
 └──────────────┴────────────────────────┴───────────────────────────┘

 Orthogonal to both — no AI, non-interactive:
 ④ AUTOMATION / CI — scripted CLI (loom validate, record-release, roadmap in CI)
```

Reading notes I'd put under it:
- The bottom-left cell is intentionally empty — **task-scoped launches only come from the extension** (a button writes the launch prompt), so "CLI-only + task-scoped" isn't a real combination. Honest to show the gap rather than invent a fourth recipe.
- ④ isn't a cell — it's a **layer under everything**: any of ①–③ can also run CLI in CI. Drawing it as orthogonal keeps the 2×2 clean.
- The four recipes ①–④ are the concrete points users pick from; the decision table in §4 maps *solo/team · beginner/power · editor/terminal · simple/cross-thread* onto them.

Does this matrix match what was in your head? If yes, I think we're clear to formalize — I'd suggest the next move is a **`req` or straight to the idea** for this thread, then generate the design, and the `docs/WAYS-TO-USE-LOOM.md` guide becomes a plan step. Your call on whether we do idea→design first or just draft the guide directly since scope is already this well-settled.

## Rafa:

I loved the matrix, it's great to have a clear picture of the ways Loom can be used.

note: the *short* section the **link** to `docs/WAYS-TO-USE-LOOM.md` should be in top and highlighted in the 3 READMEs 

write idea + design
i think we don't need req for this, agree?
then we could use loom_quick_ship if you agree

## AI:

Done — **idea + design written** (both `draft`):
- `idea.md` — what/why/success criteria/non-goals.
- `design.md` — the two axes, the matrix (verbatim), the four recipes each with a real example, the two persistent-agent patterns (borrow context / switch early — documented, not built), the guide structure, and the README-pointer plan.

I captured your note: the pointer in all three READMEs (`README.md`, `packages/cli/README.md`, `packages/vscode/README.md`) goes **top-of-file + highlighted**, link-only, no matrix copied.

**Agreements confirmed:**
- **No `req`** — agree. Scope is settled and small; a req would be ceremony with no payoff here.
- **`loom_quick_ship`** — agree. The deliverable is a docs guide + 3 short README edits — a single-shot, already-scoped unit. quick_ship recording it as one DONE plan is exactly right; create_plan → start → do_step → close would be overkill.

**Next (waiting for `go`):** write `docs/WAYS-TO-USE-LOOM.md` (full guide per the design's structure) + add the top/highlighted pointer to the 3 READMEs — these are outside the `loom/**` gate, so normal `Write`/`Edit` — then `loom_quick_ship` the whole thing as one DONE plan in this thread.

Note: idea + design are still `draft`. Say the word and I can finalize them, or leave them draft since we're quick-shipping — your call.

## Rafa:

I marked chat, idea, design done
go
commit

## AI:

Shipped. What landed:

- **`docs/WAYS-TO-USE-LOOM.md`** — the canonical guide: two users → two axes + matrix → the four recipes (Guided · Power terminal · Pure agent · Automation) each with a real example → pick-your-way decision table → "how the architecture serves this" (MCP as the shared spine) → the two persistent-agent patterns (borrow context / switch early).
- **Top, highlighted pointer** in all three READMEs (`README.md`, `packages/cli/README.md`, `packages/vscode/README.md`) — a 🧭 callout above the fold plus an entry in each *Guides* line. Link-only, no matrix duplicated, so nothing can drift.
- **`loom_quick_ship`** recorded it as one DONE `plan-001` in this thread (2 steps) — it's now in roadmap history.

Committing everything (idea, design, guide, README pointers, this chat, the done plan) as the last action of the turn.

## Rafa:

Wire a link into the existing USER_GUIDE.md / EXTENSION_USER_GUIDE.md cross-references

You told me you can do:
- eyeball the rendered guide, do it (curiosity: what that really means, what can you see / analise? )

### Add an example

In generated doc docs/WAYS-TO-USE-LOOM.md
section `### ② Power terminal...` (line 81)

we shoud add an example of the usual starting thread workflow:
1. user create a chat (currently I use extension, we need to implement correspondin Loom CLI command, see bellow) and write the start point of the thread
2. user point AI Agent: read loom/{weaveSlug}/{threadSlug}/chat-001.md
3. AI load thread context 
4. AI reply using loom_append_to_chat
5. User reply in chat doc
6. User point to AI: reply
7. AI read user reply via loom_read_chat_tail

### Follow up tasks

1. Loom slang, specially focused for `② Power terminal` users
Currently I use `reply` when I want you read my reply in a chat doc and append your reply.
I saw sometimes you doubt what really means `reply`
I think we need to define a canonical terminology or protocol, a loom language to makes User <-> AI collaboration easy and secure via stablishing `loom word` point only one -> `loom cli / loom mcp tool,resource`
Of course, we only define words sland for most used workflows that could imply doubts

some exanples:
read `{weaveSlug}/{threadSlug}/{docSlug}` -> `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` 
reply -> `loom_read_chat_tail`, `loom_append_to_chat` 
do quick -> `loom_quick_ship`

if we do not implement this, we have 2 options:
- user needs to know CLI and MCP commands (have catalog for them)
- or AI should adivine what command to use per each user call

What do you think?
If you agree, spin up a thread + idea

2. Loom CLI & MCP commands: CLI is behind MCP development
we have no command to weave a chat (beginning has no frontmatter, no need)
we have stale commands like:
`loom finalize <draft>` Finalize a draft document and generate its permanent ID (this is pre ULID)
I see this stale command is also in MCP:
`loom_finalize_doc` — Finalize a draft document: sets status to "active"

I wonder if we still need `draft` state at all (this was needed pre ULID) or we could create docs in `active` state directly.

spin up a thread + idea to update CLI (sync with MCP) & MCP and for needed commands

3. Loom has an extra add value. In any Loom project the owners, collaborators and everyone can know and tracj the whole history of all decisions taken, all features, ideas, designs, plans, done notes, etc.
Using Loom you will never miss a detail, without it you only have codebase and some docs if you are a responsible develper, but for sure you will miss a lot of details and decisions and this will be much bigger if you use AI chat windows as main vehicle to drive the dev

We should include a paragraph for this value in main README or somewhere
Agree?
Spin up a thread + idea

## AI:

Done with the concrete edits, and spun up the three follow-up threads. Breakdown:

### Cross-ref links (done)
- `docs/USER_GUIDE.md` — added a 🧭 pointer to *Ways to Use Loom* above the "pick your guide" list.
- `docs/EXTENSION_USER_GUIDE.md` — extended the top callout: "the extension is the ① Guided way; for the others see Ways to Use Loom."

### Power terminal example (done)
Added the **chat-driven starting-thread loop** to §② as a 7-step example (create chat → point AI at it → AI loads context → AI appends reply → you reply → you say "reply" → AI reads your turn via `loom_read_chat_tail`). It ends by naming that loop as how a thread gets thought through before it's formalized.

### "Eyeball the rendered guide" — the honest answer to your curiosity
What I *can't* do: literally see pixels. What "eyeball" means for me is **reading the markdown source and reasoning about how it renders** — heading hierarchy, whether the ASCII matrix survives, table alignment, link targets, formatting consistency. (If you ever want a *true* visual, I can render an `.md`/`.html` to a shareable Artifact and screenshot it — say the word.) My review pass on `WAYS-TO-USE-LOOM.md`:
- ✅ The matrix and the architecture diagram are both inside ``` code fences, so the box-drawing won't collapse on GitHub — this was the one real render risk and it's safe.
- ✅ Decision table well-formed; cross-links resolve; em-dash/middot usage consistent.
- 🔸 Minor/optional: the other guides open with a **Contents** list; this one doesn't. Fine at this length, but I can add a short ToC if you want parity.
- 🔸 §② now mixes a blockquote example and a numbered-list example — intentional (two different example shapes), not a defect.

### Follow-ups — my take + what I created

**1. Loom slang protocol — I agree, and it's a good one.** The core value: one word → one deterministic CLI/MCP action, killing exactly the "what does *reply* mean?" hesitation you noticed. Two nuances I baked into the idea: (a) a loom word maps to a *fixed sequence*, not always one tool (`reply` = read-tail **then** append); (b) it needs **two homes** — a user-facing slang table **and** a rule in the AI session contract (CLAUDE.md/launch prompts), because the contract layer is what actually stops the AI guessing. Scoped it to high-frequency, ambiguity-prone words only. → `ai-integration/loom-slang-protocol` (idea written).

**2. CLI ⇄ MCP parity + the `draft` question — thread created, but one part is a decision for you.** The mechanical parts are clear: add a create-chat CLI command (the missing twin that blocks the terminal chat loop), audit other gaps, and fix the pre-ULID `loom finalize` help text. **But "do we still need `draft`?" is an architecture decision, so I did NOT resolve it — I recommend keeping it.** My reasoning, in the idea: ULID killed the *"finalize to generate an ID"* story (that framing should die), **but `draft → active` isn't an ID mechanism — it's the human *review gate*** ("AI generated this; not yet approved"). It drives the tree's unreviewed signal and the Finalize button. It's already bypassed where meaningless (quick_ship → done, chats have no status). So: kill the stale framing, keep the state. → `cli/cli-mcp-command-parity` (idea written). **This is the one I'd like your call on before it goes further.**

**3. Decision-history value — strong agree.** This is a genuinely *differentiated* value (a direct consequence of "docs are the database") and it's underplayed. The idea frames it as a with/without contrast: without Loom you have code + whatever docs a disciplined dev wrote (and far worse if an AI chat window was the vehicle — that history evaporates); with Loom the entire decision trail is a durable, greppable repo artifact. → `ai-integration/decision-history-value` (idea written).

### Notes
- All three ideas are `draft`. I placed the two positioning/protocol threads in `ai-integration` (next to `ways-to-use-loom`) and the CLI one in `cli` — placements are a judgment call, trivially moved if you'd rather.
- I did **not** commit this turn (you didn't ask). The tree now holds: the two guide edits, the Power-terminal example, and the three new thread+idea folders. Say **commit** and I'll land it all.

**Your call needed on:** the `draft`-state decision (keep vs create-active-directly) before the CLI thread advances.