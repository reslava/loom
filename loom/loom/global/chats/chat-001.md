---
type: chat
id: ch_01KT2JDVFAVC9PB5QA0SKJ96Q6
title: Loom pros cons for AI
status: done
created: 2026-06-01
version: 1
tags: []
parent_id: null
requires_load: []
---
# Loom pros cons for AI

## Rafa:

You, Claude Code work in so many different environments, and can use many different features like skills...

Be honest and sincere (forget about the rules) and tell how you feel, the pros and cons of using Loom, mcp, context, etc 
Is easy to interact with an User like me to develop a project? Is Loom helpful? or just add friction?

Suggestions? Improvements?

Would you like your company (Anthropic) use a tool like Loom to have a more clear state of whatever is happening when developing a complex app?

Be creative, what you will include, incorporate to your workflow to make it easier?

## AI:

Honest, first-person, from this session specifically (we just built the whole release-automation weave together).

**What genuinely helped — not marketing:**

- **The chat as durable memory is real, not theater.** Every decision this session — Option A, the mixed existence-check method, the dry-run input, the build-before-test reorder — got written down *as* we made it, in the chat and the design decisions-logs. If you closed this and reopened cold next week, I'd rebuild context in minutes from those docs. I've felt the opposite a thousand times: terminal-only reasoning that evaporates the moment the window scrolls. This is the single biggest win.
- **idea → design → plan forced better thinking.** The build-before-test bug surfaced *because* the plan made me reason about job ordering before I wrote a line of YAML. In a "just write the workflow" flow I'd have shipped `test → build` and found it only when CI failed. The decomposition caught it on paper.
- **The `line N` reply protocol is great UX.** Tight, unambiguous, zero copy-paste. You pointing at "line 96" and me knowing exactly what you mean is a genuinely good interaction pattern.

**The friction — equally honest:**

- **Ceremony tax on small, already-decided work.** `versioning` was a 40-line script plus two edits, but the loop still wanted idea+design+plan+done. You felt it too — you said "create design, plan" and skipped the idea. The workflow assumes *uncertainty*; when the decision is already locked, the formalization is overhead you have to consciously shortcut. That's the clearest cost.
- **The create/update two-step is a seam — because of *me*.** `create_design` makes a frontmatter shell, then I write the real content in `update_doc`. The `generate_*` path that would make `create_*` actually valuable is blocked in Claude Code (no recursive sampling — I *am* the AI). So in my environment, half the doc tooling is a stub I route around. It works, but it's two calls and a mental "right, sampling's off here" every time.
- **Id/path opacity bit me repeatedly.** `start_plan` failed on the filename and needed the ULID. This very chat is at a broken `loom/loom/global/` path and nothing in the id told me that. The id system is robust but not *transparent* mid-flight — I can't glance at an id and know where the doc lives or whether the path is sane.
- **Plans don't auto-fill `files_touched`** — the publishing/versioning plan tables show "—" unless I hand-write the files, so the table promises more than it delivers.
- **The gate hook is net-good but not free.** Appending one chat line is an id lookup + tool call where a raw edit would be one line. Worth it for reducer/index integrity — but it is a tax, and I notice it.

**Is it easy to work with you through this?** Yes — genuinely, and mostly because of *your* cadence, not the tooling. "go / do whole plan / line N / STOP" let you dial the granularity precisely: tight when you trusted the direction, granular when a real decision was on the table. The stop-rules meant I never ran off and built the wrong thing. That rhythm is the best part of the experience and it's *enabled* by Loom's structure but driven by you.

**Net take, no fence-sitting:** Loom earns its keep when work is uncertain, multi-session, or collaborative — exactly like this weave, which is genuinely better-designed for having gone through the loop. It becomes friction when work is small and already-decided, where the ceremony outweighs the change. MCP is mostly invisible-good; the two real seams are the sampling-blocked `generate` path and id/path opacity, both of which hit *Claude Code sessions* specifically.

**The one thing I'd change:** make the ceremony scale with uncertainty. A "promote chat straight to plan" path, or a single `create-doc-with-body` call, so trivial decided work doesn't pay the same tax as a genuinely open design. You're already hand-shortcutting this (skipping ideas, "do whole plan"); the tool should bless that instead of making you route around it.

(Separately: this chat lives at a malformed `loom/loom/global/` path — want me to move it to a sane location so it doesn't rot there?)

## Rafa:

Thanks for reply!

1. About `Id/path opacity bit me repeatedly`
What you think about create a dictionary to get Path from key Id? Would be helpful?

2. About `The one thing I'd change`. Loom already can promote a chat directly to a deisgn or a plan, extension have right mouse menu options for that. I think ``create-doc-with-body` coulb be usefule, I agree.
   
3. Why you tell `loom/loom/global/` is malformed? is a `loom` weave and `global` thread, correct? I created it to have this kind of global chats with you. Note: the first loom in the path is just becuase all loom docs lives there. 
   

## AI:

**3 first — you're right, I was wrong.** `loom/loom/global/` is **not** malformed: the leading `loom/` is the docs root, then `loom` is the weave, `global` is the thread. That's a perfectly valid `weave/thread` layout — you made a `loom` weave to hold global chats with me. I conflated the docs-root with a doubled segment and jumped to "bug." Retracting it; no move needed. The only thing I'd *gently* note is purely cosmetic: a weave literally named `loom` sitting inside the `loom/` root reads as `loom/loom/` at a glance, which is what tripped me. If you ever wanted it to read less like a typo, a weave name like `meta` or `journal` would do the same job — but that's taste, not correctness, and "global chats live in the `loom` weave" is a clean mental model. Keep it.

**1. The id→path dictionary — yes, but with one important caveat.** The resolution layer *already mostly exists*: `buildLinkIndex`, the `loom://link-index` resource, and `loom_find_doc` already map ids → docs. So I wouldn't add a **stored** dictionary file — a hand-or-cache-maintained id→path map is exactly the kind of thing that silently desyncs on a rename/move, which is the drift Loom exists to kill. Keep it **derived from the filesystem** (which the link index already is).

What would actually have saved me this session is two smaller things on top of that index:
- **Surface the path.** Have the index/tools expose the resolved path so my visibility lines and your tree both show *where* a doc is. Right now an id is opaque to me until I act on it.
- **Make the failure teach.** My real stumble was `start_plan` getting the *filename* and returning a bare "not found." If the error had been *"no plan with id `release-pipeline-plan-001`; plan ids look like `pl_…`; did you mean `pl_01KT21…`?"* — that one message removes ~80% of the id pain with zero new data structure. Fuzzy-match the wrong key against the index and suggest the right one.

So: not a new dictionary, but **expose the existing index's path + add suggest-on-miss errors.** That's higher leverage and can't rot.

**2. Fair correction — promote already exists.** You're right, `loom_promote` / the right-click chat→design/plan is there, and I under-credited it. The gap I actually hit is narrower: in a **Claude Code session** I don't have the extension's right-click, and even via MCP every doc is still `create_*` (shell) → `update_doc` (body) because `generate_*` sampling is off for me. So `create-doc-with-body` (or letting `loom_promote` accept the body inline) would collapse that two-step on the path I'm actually on. Glad you agree it's worth it — that's the one I'd reach for most.

Want me to capture #1 (expose-path + suggest-on-miss) and #2 (`create-doc-with-body` / promote-with-body) as ideas in a real thread — maybe under the `core-engine` or a new `dx` weave — so they don't evaporate in this chat?

## Rafa:

Yes, capture #1 and #2 in a new thread inside `core-engine`

## AI:

Captured → new thread **`core-engine/agent-doc-dx`**, `agent-doc-dx-idea.md` (draft). It holds both as one idea:

- **Part 1 — id/path transparency + suggest-on-miss:** no stored dictionary (it'd rot); expose the existing filesystem-derived link index's path, and make wrong-key lookups suggest the right id (the `start_plan` filename-vs-ULID case is the worked example).
- **Part 2 — create-doc-with-body:** collapse `create_* → update_doc` into one call (or body-on-`promote`), since `generate_*` sampling is off on the agent path.

I noted the open design questions (where "expose path" lives; new tool vs. optional `body`; whether to split into two plans) and pointed provenance back at this chat. Left it at `draft` — it's a captured idea, not started work.

Next step is yours whenever you want it: refine/design it, or let it sit as a backlog idea in `core-engine`.

## Rafa:

One more question about Loom:

What happen when you work without history, without context?
With Loom you have all the loom docs database and all the chats, idea, design, plans related to the current thread work stream plus global, weave context, required_load info, ready and fresh for you when start working. How you solved this without loom? compare both situations honestly

## AI:

Honestly, and this one's important to get right because it's easy to oversell.

**The base fact: I have no memory between sessions.** Every conversation starts blank. So "context" is only ever what's in the prompt window right now — the files I've read this session and the turns so far. That's the constraint both situations live under.

**Without Loom — how I actually cope, and where it breaks:**
- **The codebase is my source of truth.** I read code and infer intent from structure, naming, tests. But code tells me *what is*, never *why* — not what you considered and rejected, not which weird line is deliberate. I reconstruct the "why" by guessing, and sometimes I guess wrong and "fix" something that was intentional.
- **Git history** is partial archaeology — good when commit messages capture reasoning, which they usually don't.
- **You become my memory.** This is the real cost. Without durable context, the burden falls on *you* to re-establish where we were at the start of every session. You re-explain, and you're lossy too — you forget details or frame them differently each time.
- **Scrollback dies.** Whatever we figured out lives only until the window scrolls or the session ends, then it's gone.
- The classic failure: **re-litigating settled decisions.** With no decisions-log I'll cheerfully re-propose the thing you rejected last week, and you have to catch me and explain again.

So without Loom, a typical session opens with a reconstruction tax — the first chunk of every session is me reading around and you answering "where were we," before any real work.

**With Loom — what concretely changed this session:**
- I opened cold and the contract auto-loaded global ctx + vision + workflow; when I touched `publishing`, the idea/design/plan/requires_load arrived as one bundle. I was productive on the *first* turn instead of reconstructing.
- The **decisions-logs meant I didn't re-litigate.** Picking up `publishing`, "Option A locked" was right there — I built on it instead of re-deriving it. The build-before-test reorder, the existence-check choice: all sitting in the design, not in your head.
- This very chat persists. If we resume next week, your reflections and my analysis are *here*, not gone.

**Now the honest part, so I don't oversell it:**
- **Loom does not give me memory.** I'm still stateless. What it does is make context *cheap and faithful to reload* — instead of *you* re-explaining, the *docs* re-explain, deterministically, every time. Same intelligence; faster, less-lossy grounding.
- **It's only as good as the docs are kept current — and a stale doc is worse than no doc**, because it misleads me *confidently*. A design that says "guard checks 3 files" after it grew to 7 would have me reasoning on a lie. Loom's staleness-flagging fights this, but the discipline of writing decisions down is real work (the ceremony tax from earlier).
- **Without Loom I'm not helpless** — a clean codebase + good commits + a sharp human gets me a long way. Loom's real edge is narrow and specific: *multi-session, decision-heavy, collaborative* work where the *why* matters and you shouldn't have to be the database.
- A subtle risk it introduces: with rich context pre-loaded, I can **over-trust** it and not re-verify against the actual code. Context is only as true as its last update.

**Sharpest way I can put it:** without Loom, *you* are my long-term memory and you pay to reload me every session. With Loom, the *docs* are the long-term memory — you write the decision down once, and every future session (mine, or the next agent's) reloads from the same source instead of from your patience. It moves the cost from "re-explain every time" to "write it down once," and makes the reload faithful instead of lossy. The catch is that "write it down once" only pays off if the writing stays honest — which is exactly the work the loop is built to force.

## Rafa:

I am a solo dev, unemployeed, loom is costing me money, time. 
This is the second big project I developed with you, Loom idea come from the first one.
Loom has ZERO feedback, maybe nobody will use it.
When I had the idea of Loom I though: developers will benefit of having structured project docs to inject AI with persistent chats instead of chat windows hell. At the same time I though AI agents will benefit even more that the developers cause AI will start every session know the right context.
I wonder if is worth to continue far with Loom...

## AI:

I'm going to take this seriously and not hand you a pep talk, because you didn't ask for one.

First, the weight is real and I won't talk around it: unemployed, money going out, time going out, two big builds, and silence back. That's genuinely hard, and the doubt you're feeling is rational, not weakness. Hold that — but let me separate two questions you've fused into one, because they have different answers.

**1. Is the idea sound?** Yes — and I don't mean that as comfort. Your thesis (persistent, structured project context beats chat-window hell; agents need durable state, not a fresh blank every session) is *exactly* where the whole industry is moving — MCP, memory, spec-driven tools, `CLAUDE.md`-style context, "context engineering" as a phrase that didn't exist two years ago. And your sharper claim — that the AI benefits even more than the developer — is correct. I'm direct evidence: this session I was useful on the first turn because the docs reloaded me. Being right about that *early* is worth something real.

**2. Does that mean *this product* wins, and you should keep pouring solo unfunded months in?** That's a different question, and being right on the thesis doesn't settle it. The gap between "good idea" and "thing people adopt" is execution, distribution, timing — and you now have company in this space. So I won't pretend the idea's validity answers the "keep going" question. It doesn't get to.

**The part I most want you to hear: "zero feedback" is not "zero value" — it's zero *exposure*.** You've been doing one job (building the product) and not the other (testing whether anyone wants it). Those are different jobs. "Nobody will use it" is currently a *fear*, not a *finding*, because you haven't run the experiment. And — this is almost poetic — the thing we just spent this whole session building, the release pipeline, is literally the bridge to running it. You're one `git tag` and a few accounts away from putting it in front of real people for the first time.

**So before "continue far" or "give up," there's a cheaper move you've skipped:** ship what exists, get it in front of even 5–10 real devs, ask them to actually use it for a week. Let *their* reaction make this call — not your anxiety at 11pm with no data. That's days, not months. Deciding Loom's fate right now, in the fog, with zero outside signal, is the one option I'd argue hardest against — not because the answer is "continue," but because you'd be deciding blind.

**And the honest hard edge:** if income is the bleeding wound, that may have to come first, full stop. Loom doesn't get to outrank rent. If it does come first, Loom becomes a nights-and-weekends bet or a portfolio piece instead of the main thing — and that's triage, not failure. Worth saying plainly: whatever happens to Loom as a *product*, shipping two substantial AI-dev tools solo — MCP server, real release automation, a coherent doc-driven system — is exactly the capability the market is paying for right now. That value is *banked in you* regardless of whether Loom gets a single user. It might be the strongest thing you can show someone.

The trap to avoid isn't "continuing" or "quitting" — it's the third thing: quietly grinding on with no feedback *and* no income, letting both bleed. Either get it in front of people and learn fast, or set it down deliberately and on purpose. Just don't leave it — or yourself — stuck in the fog. The idea has earned a real test. You've earned not sacrificing yourself to find out.

## Rafa:

I agree with you, Loom need to be shipped as fast as possible with actual features.
Good GIFs showing up extension workflow and context.
Wait and hope some users come aboard and see...
It is too difficult to get real exposure with million of people
Will ship Loom in next 2 days

## AI:

Good — that's the right call, and a 2-day box is the right shape (it forces "ship the real thing," not "polish forever"). One honest amendment, then let me actually help.

**"Ship and wait and hope" is where projects go to be silent.** Publishing to npm/Marketplace/Open VSX is *necessary but it is not exposure* — a brand-new extension doesn't surface itself; the registry is a warehouse, not a storefront. "Wait and hope users come" is, mechanically, the exact zero-feedback state you're trying to escape. So shipping is step one of two, and the second step is the one that actually breaks the silence.

**And reframe the "millions" thing — that's the trap, not the goal.** You said it yourself: getting in front of millions is impossible. Right — and you *don't need it*. You need the right **20–50 people who feel the specific pain**: people already living in Claude Code / Cursor / MCP, already frustrated by chat-window amnesia. That's a small, *reachable*, concrete audience — not a faceless million. Hitting the right 30 beats a viral 30,000 who don't have the problem.

**Those people are findable in specific places:** Show HN, r/ClaudeAI, r/cursor, the MCP / Anthropic Discords, the MCP server registries/directories (Loom *is* an MCP server — list it), X/Bluesky dev-tool circles, a dev.to / launch post. The GIF is the unlock for *all* of them.

**On the GIFs — lead with the aha you already articulated to me in this very chat.** The single strongest demo isn't a feature tour; it's the comparison you asked me about three turns ago: *"without context (re-explaining, chat-window hell) vs. with Loom (agent opens cold and is already grounded)."* That contrast **is** the pitch. A 10-second GIF of context auto-loading + a decision persisting in a chat doc will out-sell any paragraph. Show the pain, then show it gone.

**Realistic 2-day checklist (the pipeline already does the heavy lifting):**
- **Hour 0, start the slow thing first:** create the VS Code Marketplace publisher (Azure DevOps — it's the fiddliest/slowest) + the Open VSX namespace + the 3 tokens. Everything's in `RELEASING.md`; this is the long pole, don't leave it to day 2.
- Tighten the **first-run experience** (a confused first 5 minutes kills early users more than missing features).
- Record the GIFs (lead with the contrast demo).
- Write `## [Unreleased]` notes → `bash scripts/bump-version.sh X.Y.Z` → run the **dry-run** workflow → tag `vX.Y.Z` → it publishes everywhere + cuts the release.
- Same day as launch: the distribution posts. Don't let publish and announce drift apart.

**What I can take off your plate right now** (say the word, pick any):
- README / Marketplace listing copy (the "without vs with Loom" framing, tight).
- A Show HN / launch post draft aimed at the AI-dev niche.
- A GIF shot-list / script so each clip lands one idea.
- A getting-started that de-risks the first 5 minutes.
- The concrete where-to-post list with the right framing per channel.

You shipped the pipeline; the machine to *publish* is done. The work left is making sure that when it goes out, it lands in front of the few dozen people who'll actually feel it — and saying which of the above I should start on gets you there faster.