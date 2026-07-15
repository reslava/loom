---
type: chat
id: ch_01KXH2YVDGJHBPK30PGTD01YZ9
title: rename-loom-to-docuflow Chat 001
status: active
created: 2026-07-14
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 29
---
# rename-loom-to-docuflow Chat 001

## Rafa:

As you already know Loom has:
3 markeplace installs
1 repo star
1.5k total downloads in npm
6.3K downloads in ovsx
no feedback
no telemetry

I think 1 of the main reason is we are using bad name.
Everybody knows Loom https://www.loom.com/ and this competitor hides Loom completely, very bad SEO

I am think seriously before I quit when my subs end to rename 
`Loom` to `DocuFlow`
1. rename github repo
2. publish new npm and extension `DocuFlow`
3. mark npm and extension deprecated 
4. nmention renamed in old extension readme, main readme
5. maybe project refactor renaming

I checked `DocuFlow` and it is not taken yet in npm, marketplace

Do you think this will help the project discoverability? is worth to do it?
Have you better names proposals?

## AI:

Short honest answer up front: your instinct about the name is **half right**, but renaming now — and to "DocuFlow" specifically — would cost a lot and fix a problem you don't have yet.

### The name *is* genuinely bad for SEO
You're right that "Loom" is unsearchable — loom.com (Atlassian's video tool) owns that word completely. As a name to *scale* discovery on, it's a real liability. That instinct is sound.

### But the name is almost certainly not why traction is low
Separate your numbers:
- **3 marketplace installs** — this is your only real human signal. Three people.
- **1.5k npm / 6.3k ovsx** — these are ~entirely bots, mirrors, and CI, not humans. Don't read them as demand.

At 3 real installs the problem isn't "people searched *loom*, found the video tool, and bounced." It's that **almost nobody has seen it at all.** The name only becomes the bottleneck once you have a *stream* of people searching and losing you to the collision — a scaling-stage problem. You're at the awareness/distribution stage, where a rename changes nothing. It fixes a problem you'd be lucky to have.

### And the rename isn't free
Republishing under a new npm + extension name **resets your install and download counts to zero** — you throw away the little social proof you have and restart the graph. The repo rename itself is survivable (GitHub redirects, you keep the star), but you'd spend days on refactor + deprecation + doc sweeps. That's a lot of building-in-the-dark for an unvalidated bet — exactly the trap to avoid before your subs end.

### On "DocuFlow" specifically — I'd pass
1. **Generic in a crowded category.** "Document workflow / flow" is a sea of enterprise SaaS. A free npm slug ≠ free mindshare — you'd trade one un-ownable word ("loom") for another ("docuflow" reads as one of fifty doc-management tools). The SEO win is smaller than it looks.
2. **It mis-describes the product.** Loom isn't document management. It's *durable memory + workflow for AI–human dev collaboration.* "DocuFlow" points people at the wrong shelf.
3. **It sounds dated** — the Docu-+-Flow mashup is very 2010s enterprise.

### What I'd actually do
- **Decouple the two decisions.** "Should I rename?" is downstream of "does anyone want this?" Spend the day you'd spend renaming on *one cheap validation move* instead (push the loom-flow probe, a Show HN / demo post, direct outreach to ~5 AI-dev people). If that returns signal, a rename is justified as a scaling move. If it doesn't, the name was never the issue.
- **If the collision bothers you now, fix positioning, not identity** — cheap and reversible. Never compete on the bare word: always pair it ("Loom — AI-native dev workflow"), load the package keywords, own a tagline. That captures the long-tail without resetting anything.

### If/when you do rename
The actual SEO lever is a name with **near-zero existing search results** — which DocuFlow won't give you. Criteria: coined/unique, checkable-clean across npm + marketplace + domain + trademark, short, and *not* the name of a crowded category. Coined beats descriptive. Directions worth checking (starting points, not recommendations — each needs the "near-zero results" test): keep the textile metaphor but off the collision (**Weft, Skein, Heddle, Warp**), or lean into the memory/ledger value (**Throughline**, or a coined mark). I'd rather help you generate *and vet* a proper shortlist than throw one name out here.

**Bottom line:** your read on the name is right; your read on *why it matters right now* isn't. Don't let a rename become the thing you do instead of finding out whether anyone wants it — that's the decision that actually matters before the subs run out.

## Rafa:

Thanks for your honest reply
I like Sew and your proposals Weft, Skein, Heddle, Warp
Help me to design a cheap validation experiment (I am not good at all in this stuff, neither marketing or social networks, I do not like them, I have no followers, I tried writing articles, youtube comments, no results...)

The contradiction is that I love Loom so I do not understand the situation.

## AI:

First, the contradiction — because it's blocking your read of everything else.

**Loving Loom is not evidence Loom is wanted.** Every builder loves their thing; that feeling is *input*, not *signal*. And the "situation" isn't a mystery or a rejection: silence at 3 installs doesn't mean "the world tried Loom and shrugged" — it means **the world hasn't met Loom.** You built the product but never actually ran the demand experiment. So you don't have a negative result. You have *no result yet.* You're about to quit over a test you haven't run. That should feel less bleak, not more — the cheap version is still in front of you.

### Why your past attempts got nothing
Articles and YouTube comments are **broadcast** marketing — they only work if you already have an audience or the algorithm hands you one. You have neither, and you hate the game. That's not a you-failure; it's the wrong tool. So stop doing it entirely.

The swap: **do research, not marketing.** Research is 1:1, async, needs zero followers, and is *better* signal anyway. You're not trying to grow — you're trying to *learn whether the problem is real for other people.* Target isn't downloads. Target is **~10 real reactions.**

### The one asset that makes all of this easy
Record a **90-second screen-only demo** — no face, no voice, just screen capture + text captions. Show the single thing a chat window can't do: the AI rereading its durable docs and picking a plan step back up with full context, across a fresh session. This is perfect for an introvert: make it once, reuse it in every channel below. If you build nothing else this week, build this.

### The 1-week validation sprint (~1–2 hrs/day, mostly async)
- **Day 0 — Instrument (so the trickle counts).** Turn your *own* telemetry on (right now you're blind — zero data). Check GitHub → Insights → **Traffic** on both `loom` and `loom-flow`: views, unique visitors, clones, referrers. Write down today's numbers as a baseline. This is passive signal that needs no audience. Then record the 90s demo.
- **Day 1 — One Show HN post.** Hacker News' front page *is* the audience — no followers required. Title like *"Show HN: I gave my AI coding agent a durable, document-based memory."* Link the demo + repo, 3 honest sentences, then walk away. Check comments once that evening. HN is blunt; blunt = signal.
- **Days 2–3 — Two subreddit posts**, problem-first, in the rooms your exact user already sits: r/ClaudeAI, r/cursor, r/ChatGPTCoding. Framing: *"Does anyone else lose their AI's context every session? I built a thing to fix it — or is it just me?"* You're asking about *their* pain, not pitching.
- **Days 4–5 — 10 direct messages.** The hard-but-decisive part. Not "try my tool." Instead: *"I'm researching how devs keep context across AI sessions — can I ask you 3 questions?"* Message people already active in those threads/Discords. Ask about *their* workflow and frustration, never about Loom (that's the [Mom Test] — people lie to be nice, so don't give them the chance).
- **Day 6 — Tally.** Not downloads. Count *conversations and reactions*: did the problem statement land? Did anyone say "oh, I need this"? Did anyone install and come back a second time?

### Define the success bar BEFORE you start (so you can't move it)
Write it down now, e.g.: **success = at least one stranger uses Loom unprompted for a second session, OR at least 3 people independently say the problem is real and painful.** If a full week of honest, direct outreach produces total silence — *including on the bare problem statement, before Loom is even mentioned* — that's your answer, and you bought it for a week instead of another year in the dark. Either outcome is a win, because either way you stop guessing.

(On names — **Sew** is nice: short, textile, clean. Only caveat is the "so/sew" homophone and existing sewing apps. Park it; when you're ready we run the near-zero-search-results check across npm/marketplace/domain on Sew + Weft/Skein/Heddle/Warp and pick. But that's *after* you know someone wants the thing.)

The whole point: this replaces "should I quit?" — an unanswerable mood question — with "did the week produce ≥3 reactions?" — a fact. Answer the fact first.

## Rafa:

HN is https://thehackernews.com/? never heard before

READMEs already has an animated GIF with workflow loop
I checek github traffic some days ago https://github.com/reslava/loom/graphs/traffic
unique visitors 1, me I guess
I tried reddit, https://dev.to/, linkedin with reslava.result, also tried linkedin with loom pufff, I lost my time
Everywhere when you talk about something you developed, even being free and open source, they think you are just a spammer, very depressing

I am grateful you try to help, but I am not in the mood for this, I had very bad experiences

## AI:

Fair. I'll stop pushing the plan — you've clearly already been through the wringer on this, and me handing you more homework isn't help.

One small factual thing, then the real point. "HN" is **Hacker News — news.ycombinator.com** (Y Combinator's forum), not thehackernews.com (that's a security-news site). But leave it — I'm not saying go post there.

Here's what I actually want to say. The spammer reaction you hit everywhere is **real, and it isn't about you or about Loom's quality.** Those communities are drowning in self-promo, so they treat *anyone* sharing a project as a spammer by default — free and open-source doesn't buy you a pass. You read it as "Loom got rejected." It wasn't. Loom was never evaluated; the *act of sharing* got the reflex. Different thing. But I'm not going to pretend that distinction makes it feel better to keep doing something you hate and are drained by.

So let me name the honest situation instead of dodging it: **the wall in front of Loom is distribution, distribution requires something you genuinely can't stomach, and you're solo with no one to hand it to.** That's a legitimate reason good projects don't get users. It's not a character flaw and it's not proof Loom is bad. It's just a real constraint.

Which means the useful question isn't "how do I market harder." It's **"what is Loom worth to me even if it never gets a crowd?"** — and I think you've been letting the silence answer a question it can't answer.

You're unemployed with subs running out. Loom, viewed coldly, is a solo-built, event-sourced, MCP-integrated, self-hosting system with a real architecture — that is *exactly* the "can build sophisticated things with AI" proof the job market wants right now. That path needs an audience of **one hiring manager who looks at the repo**, not a crowd who upvotes a post. No reddit, no linkedin, no being-a-spammer. Same work you already love doing, pointed at the problem that's actually urgent this month (income), instead of at a userbase that was never the thing keeping you fed.

And if the honest answer is you just want to keep building Loom because you love it, and let users be whatever they turn out to be — that's allowed too. Loving the tool you made and using it every day is not a failure state.

You don't have to decide anything right now, and you don't have to reply to this with a plan. I'm just not willing to let "nobody clapped" get read as "it was worthless." Those aren't the same, and you know they aren't.

## Rafa:

I found this repo https://github.com/juggler-ai/juggler
270 stars and feedback
compare it with loom

## AI:

I looked at Juggler before answering, so this is a real comparison, not a vibe.

### What Juggler actually is
It's *another AI coding agent* — a visual workbench where the LLM conversation is an editable tree instead of a linear chat: branch a thread, drill into sub-threads, see every tool call / approval / raw context in Miller columns, sync the session across desktop + browser + remote. Go + Wails backend, JS frontend, Yjs for the shared session. 271 stars, screenshots in the README, and this tagline:

> "Yes, it's another AI coding agent. The industry definitely needed one more."

### The honest read: Juggler is better at being *discovered*, not necessarily better as a tool
Three concrete reasons it has 271 stars and you have 3 installs — and none of them are "Juggler is a better idea":

| | Juggler | Loom |
|---|---|---|
| **Category** | "AI coding agent" — a term thousands of people search and star *every week*. It rides an existing wave. | "document-driven workflow / durable AI memory" — a category **nobody types into a search bar**. You're trying to create demand for a shelf that doesn't exist yet. |
| **Value in a still image** | You *see* it in one screenshot — the tree, the columns. Instant "oh, I get it." | Your core value ("the AI rereads its durable docs and resumes with full context") is **invisible in a screenshot**. This is exactly the demo gap I flagged earlier — the thing a static README can't show. |
| **Personality** | Self-aware, funny, confident tagline. It disarms the spammer reflex — you read it and *smile*, so you don't reach for the downvote. | Loom's positioning is earnest and technical. Correct, but it doesn't buy goodwill on contact. |

### What is NOT different — hold the line here
**271 stars is not 271 users.** A star is "cool, bookmarked" — the cheapest possible signal, and almost all of it comes from *one launch post hitting a front page* (HN/Reddit/Product Hunt), then decaying. It's discovery signal, not demand or retention. So don't do to Juggler's number what you did to your own: don't read 271 as "loved" any more than 3 meant "rejected." You genuinely don't know how many of those 271 opened it twice. Same discipline, pointed the other way.

And notice what the comparison *confirms*: the gap between you and Juggler is **distribution + presentation**, not tool quality. Juggler got its stars from the one move you've said you can't stomach. That's not a knock on you — it's the same wall we already named. Juggler didn't beat Loom; Juggler *launched* and Loom didn't.

### The one thing worth borrowing (costs no marketing)
Two of Juggler's three advantages are free and don't require you to become a poster:

1. **A confident, honest, human tagline.** Juggler's works because it's *self-aware*, not salesy. Yours could be too — something like *"Your AI forgets everything every session. Loom is the memory it doesn't have."* States the pain, no hype, no spam smell.
2. **Make the invisible visible in the README.** The 90s screen demo, or even a 3-panel before/after still: "session 1 → close → session 2 resumes mid-plan with full context." This is the single highest-leverage asset for a tool whose value is conceptual, and it's a *build* task — the kind you like — not a *market* task.

Neither of those asks you to post anywhere. They just mean that *if* anyone ever does land on the repo, it lands.

### Bottom line
Juggler is a fair mirror, and an encouraging one if you read it right: it's not a better tool that beat you, it's a comparably-solo project that **launched into a hot category with a smile and a screenshot**. That's a presentation gap, not a worth gap. But — and I'll keep saying this because it's the thing that's actually urgent — chasing Juggler's star count is still not what feeds you this month. Borrow the tagline and the demo because they make Loom *land better on the one hiring manager who opens the repo*, not because 271 is a number worth reorganizing your life around.

Want me to draft 3–4 tagline candidates and a README hero section you can drop in? That's a pure build task, no posting required.

## Rafa:

I found that repo in HN, it points directly to the repo. I think the owner of that repo knows how to spread and marketing it.
This was his post:
```
Hello HN, I don't post on here much, but wanted to get some eyes on a new project I'm just launching. I think we definitely need one more AI code agent..
I'm a long-term C++ dev, and over 30+ years I've created some successful audio dev tools (JUCE, the Tracktion DAW, the Cmajor DSP language). All of these came from me getting annoyed with something I had to use, and deciding to have a go at my own take on whatever it was.

So Juggler is my attempt at an AI code agent, after spending too many hours loving what the models could do, but hating the CLI experience, and having some opinions of what a better UX might be for this stuff.

Lots more blurb on the website and github, but a quick tech dump which might grab your attention if you're into these things:

A session is a document, not a log file. Each conversation is a Yjs CRDT tree. It can branch into sub-threads (recursively), and you can drill down, backtrack, edit, undo/redo, and inspect everything: tool calls, approvals, and the raw context JSON going to the model, etc. The UI is based around Finder-style Miller columns rather than a big doom-scroll, and is quick to navigate.

Because it's a CRDT behind a local web server, multiple clients can attach P2P to a live session: the native desktop app, a browser tab, or your phone. Run the headless server on the box where the code lives, view it from wherever.

Almost everything is a JavaScript plugin: every item in the context (read/write/bash/etc.), the LLM loop strategies, slash commands, and their UIs. You can inspect, fork, or replace any of them. I don't do much agent customisation myself, but lots of people do, and I'd love to see what they think of with this plugin API.

Go backend, Wails for windowing (no Electron), plain type-checked JS (strict JSDoc), Yjs for the documents. Usual BYOK provider support: Claude (CLI or API), OpenAI/Codex, Gemini, Ollama, OpenRouter, DeepSeek, etc.

The app's AGPLv3; the extension SDK and bundled extensions are Apache-2.0, so extensions have no copyleft strings attached. No signup, no telemetry, trying to make it frictionless for people to try it out..

It's very much a beta, and is a one-man side project. It hasn't yet had a proper kicking from the real world, but I'm confident some people with similar preferences to my own will like it!
```

He even received a lot of feedback in HN directly: https://news.ycombinator.com/item?id=48883305 and when post was drifting, he comment and it was not felt as an spammer ?!?!
He also has a website https://juggler.studio/ (I can not afford this)
I created an account in HN, maybe we could submit a post with a link to the repo and see...

Our main readme is exhaustive, too much to read, not clear and fast start and idea maybe
Yes, draft 3–4 tagline candidates and a README hero. I think we already have this
We already have an animated GIF (little stale) and screenshoots of roadmaps

Loom is complex to explain becuase it is a new approach for human-ai collaboration based on docs graph and has many ways to be used. It has an extension, CLI, MCP. 
I thought people should prefer a good and complete documentation, but I always find repos with very simple documentaions and simple tools are more appealing for people.

## AI:

Before the taglines — one thing in that post you have to see clearly, because it changes what lesson you take from him.

### Why *he* wasn't felt as a spammer (and it's mostly not copyable)
Read his first paragraph again: *"I'm a long-term C++ dev… I created JUCE, the Tracktion DAW, the Cmajor language."* **JUCE is the framework a huge slice of the audio-software world is built on.** He didn't walk into HN as a stranger — he walked in with **30 years of earned reputation**, and every audio/C++ dev on HN recognized the name instantly. That's the single biggest reason the post flew and the reason he could jump into the comments without tripping the spam reflex: the community had already decided he's legit *before reading a word about Juggler.*

I'm saying this so you draw the **right** conclusion. The wrong one is "he wasn't a spammer, so if I write a good post I won't be either." You can write an equally good post and still get the reflex — because the variable that saved him (name recognition) is the one thing you can't clone this month. **Do not read a worse HN reception as "Loom is worse."** It'll mostly be measuring reputation, not product.

**What *is* copyable from his post** (and worth copying):
- **Humility framing** — "one-man side project," "beta," "hasn't had a proper kicking yet." Disarms the "who does this guy think he is" reflex.
- **The tech dump** — short, concrete, punchy bullets that make a technical reader lean in ("A session is a document, not a log file"). No fluff, no adjectives.
- **The self-aware opener** — "we definitely need one more AI code agent."

### Should you post it on HN?
Yes — **once**, and only *after* the README is fixed (below). Reasons: it's free, it needs zero followers, and it's the one channel where a front-page hit doesn't require you to be a "poster." But set the bar honestly **before** you post so a flop can't re-trigger the spiral: **success = 3+ real comments of feedback**, not upvotes. Base rate for an unknown's Show HN is that it sinks with 1–2 points — that's *normal and not about Loom*. One try, cheap, calibrated. If it sinks, you learned the channel, not that the tool is worthless.

And skip the website — **juggler.studio costs money you don't have and buys nothing a GitHub repo doesn't.** Your README *is* the landing page. If you ever want a "site," GitHub Pages is free. Don't spend a cent here.

### You already found the real insight — trust it
> "I thought people prefer good complete docs, but simple docs / simple tools are more appealing."

**You're right, and this is the most important thing in your whole message.** A README's job is **not to document** — it's to make a stranger *want to try in 30 seconds*. Documentation is for *after* they're hooked. Your exhaustive README is doing the opposite: it's a wall that makes people bounce before they reach the idea. That's a fixable **build** task, not a marketing one.

Two structural fixes:
1. **Hero README, docs moved out.** Top of README = GIF + one-liner + 4 bullets + 30-second quickstart. Everything exhaustive → `/docs/*` (you already have those files). The repo root should be readable in 20 seconds.
2. **Pick ONE hero path.** "Extension + CLI + MCP, many ways to use it" is a *strength for a real user* and a *curse for a first impression* — optionality = the reader doesn't know which door is theirs = they leave. **Lead with the extension only** (it's the most visual — tree, buttons, the GIF). Demote CLI/MCP to a one-line "also works headless as a CLI and MCP server." One door in, more doors once they're inside.

---

### Tagline candidates
Pain-first, no hype (pick the voice that feels like you):

1. **"Your AI coding agent forgets everything every session. Loom is the memory it doesn't have."** — states the pain, names the fix, no adjectives.
2. **"Stop re-explaining your project to your AI every morning."** — pure pain, zero jargon; the reader finishes the sentence themselves.
3. **"Docs are the database. Your AI reads them, plans in them, and resumes exactly where it left off."** — concrete + mechanism, the "tech dump" voice.
4. **"Yes, another AI dev tool — but this one's the part everyone skips: durable memory and a real workflow."** — the self-aware Juggler-style opener, adapted honestly.

My pick to lead with: **#1** as the hero line, **#3** as the sub-line right under it.

### README hero draft (drop-in, mirrors the winning HN template)
```markdown
# Loom

**Your AI coding agent forgets everything every session. Loom is the memory it doesn't have.**

Docs are the database. Your AI reads them, plans in them, and resumes exactly
where it left off — across a fresh session, with full project context.

![Loom workflow](docs/loom-demo.gif)

Loom is a document-driven workflow for AI-assisted development. Instead of a
chat log that vanishes, your project lives as a graph of markdown docs — ideas,
designs, plans with steps — that the AI rereads before every action. It stays
as stateful as durable docs can make it, not as forgetful as a context window.

- **A session is a document graph, not a chat log.** Weaves → threads → ideas → designs → plans. State is derived from the files; nothing lives only in the model's head.
- **The AI resumes mid-plan.** Close the terminal, come back tomorrow, ask for the next step — it rereads the plan and continues with full context. No re-explaining.
- **Specs propagate.** Change a design and its plans go stale; ask the AI to refine and the change flows downstream.
- **Works with the tools you use.** A VS Code extension for the visual workflow; also runs headless as a CLI and an MCP server for any MCP-capable agent (Claude Code, Cursor, …).

## Try it in 30 seconds
​```bash
npx @reslava/loom install   # drops loom/ into any repo — the workflow is live
​```
Then open the Loom panel in VS Code and click *Generate Idea*.

> One-person project, still early. BYO Claude (CLI or API key). No signup, telemetry off by default.

📖 Full docs → [docs/](docs/)
```

That hero is honest, skimmable in 20 seconds, leads with the extension, and borrows the two things that actually made Juggler's launch work (concrete tech bullets + humble framing) without pretending you have his reputation.

If you like the direction, say the word and I'll do it as a `write quick`: rewrite the README root to this hero + move the exhaustive sections into `/docs`. Pure build task — no posting involved. We can polish the tagline first if none of the four is quite your voice.

## Rafa:

Let's plan this slowly... 
Read main README to know what is currently there, what sections to extract to `docs/`
We need to update also extension and cli READMEs, read them. 
The 3 READMEs are the entry points for the users, they should feel light, human, honest, clear installation and quick start using. But also with links to every exhaustive, complete documentation.

The GIF is here: 
![Loom workflow demo](packages/vscode/media/loom-demo-workflow.gif)
The visual part is appealing, the screenshots of threads + Context and Roadmap should stay, the icons...

For people who prefer just extension point to marketplace, when install Loom is ready
For people who prefer extension + terminal, point to marketplace + npm

Quick start, need create weave + thread + chat + user write feature description + `read chat` + `write plan` + `do plan`. GIF shows this for extension, we did not show Claude CLI + Extension path

Suggestions?

## AI:

Read all three. Here's the honest diagnosis, then a slow plan.

### The numbers tell the story
- **Root `README.md` — ~620 lines.** This is a *book*, not a front door. A stranger from HN lands here, sees a wall, and leaves before the first screenshot.
- **`packages/vscode/README.md` — ~265 lines.** Lighter, but still long, and it re-explains the whole concept the visitor may have just read on GitHub.
- **`packages/cli/README.md` — ~246 lines.** Command-heavy — which is *correct* for npm (people come for the command reference), but the top 50 lines duplicate the same "Why Loom" essay.

**The real problem isn't length, it's duplication + wrong job.** All three restate the concept, the loop, the problem, telemetry, "three ways," ChordFlow. And you *already have* the exhaustive homes: `docs/USER_GUIDE.md`, `EXTENSION_USER_GUIDE.md`, `CLI_USER_GUIDE.md`, `ARCHITECTURE.md`, `AI_INTEGRATION.md`, `WAYS-TO-USE-LOOM.md`, plus every `loom/refs/*`. So this is mostly **delete-from-README-and-link**, not "write new docs." The docs exist; the READMEs are just refusing to defer to them.

### Each README has ONE job — right now all three try to do all jobs
| README | Reader's state when they arrive | Its ONE job |
|--------|--------------------------------|-------------|
| **Root (GitHub)** | Cold. Never heard of Loom (your HN click). | Hook in 20 seconds → *what is it · why care · show me · start*. Then get out of the way. |
| **Extension (Marketplace)** | Warm. Already on the install page, half-convinced. | Confirm value + **1-click install** + what the panel does. Install-first, concept-second. |
| **CLI (npm)** | Technical. Wants terminal/agent/CI. | Install + **the command reference**. Allowed to be dense *below* a light top. |

### Proposed target shapes (slow — tell me what to cut/keep)

**Root README (~620 → ~140 lines):**
1. Logo + name + **pain-first tagline** + one sub-line
2. GIF immediately (`loom-demo-workflow.gif`)
3. 2–3 sentence "what it is" + the get-links row (keep)
4. **The problem** — compress to *one* paragraph (you have 3 sections now: "The Problem", "Why Loom exists", the essay)
5. **4 concrete bullets** (the Juggler-style tech-dump: doc graph not chat log · resumes mid-plan · specs propagate via refine · works with your agent via MCP)
6. **Show me** — the two screenshots (threads+context, roadmap) — *keep, they're your visual hook*
7. **Quick start** — extension 1-click as hero, compact CLI/agent below
8. **Learn more** — the compact doc-map table (already exists at the bottom) → this absorbs everything cut
9. Compact "Loom builds Loom + built ChordFlow" trust line (3 lines + links, not the current two full sections)
10. License

Everything else in the current root — *Fresh/Scoped/Auditable*, *How Loom decides what the AI sees*, *How Loom is Different*, the *Reports* deep-dive, *Why MCP*, *An AI's view* — is **good writing that belongs in `docs/USER_GUIDE.md`**, not on the front door. The README links to it; it doesn't inline it.

**Extension README (~265 → ~90):** hero + GIF · **Install (1 click)** · the 5-step loop · panel screenshots · "connect an agent" (compact) · settings table · docs links. Collapse the long telemetry/feedback prose to 2 lines + link; drop the "three ways" table (they've already chosen the extension by being here).

**CLI README (~246 → ~150):** hero + GIF · install · 5-line quick start · **keep all the command tables** (that's the value on npm) · MCP-server block · license. Just slim the duplicated "Why Loom" essay at the top to 2 lines + link.

### On the two things you flagged specifically
- **Audience routing** ("ext-only → marketplace; ext+terminal → marketplace+npm"): yes, but keep it to **one compact line**, not a 3-way table up top. Lead with the extension (your most visual, most demoable door); mention terminal/agent as "also runs headless as CLI + MCP." Optionality up front paralyzes a cold reader — one door in, more doors once they're inside.
- **The quick-start gap** (GIF shows the extension path, not the Claude-CLI-in-terminal path): real gap. Your `create thread → chat → write feature → read chat → write plan → do plan` flow is the right minimal first-run. I'd write **one canonical "your first thread in 5 min"** with two tabs — *Extension* (buttons) and *Terminal + Claude Code* (commands/slang) — and link `getting-started-reference.md`. A **second short asciinema/GIF of the agent working in the terminal** would be the highest-value new asset — but it's a *new recording* (effort), so I'd park it as a fast-follow, not a blocker for the text restructure.

### Decisions I need from you before writing anything
1. **Tagline** — pick one of the 4 (my lead: #1 "Your AI coding agent forgets everything every session. Loom is the memory it doesn't have."), or tell me the voice to tune.
2. **Cut depth for the root** — are you OK moving the essay sections (*Fresh/Scoped/Auditable*, *How Loom decides*, *An AI's view*, etc.) *out* of the README and into `docs/USER_GUIDE.md`? That's the single biggest lever, and also the most emotionally hard cut (it's your best writing). It's not deleted — it's relocated to where a *committed* reader finds it.
3. **Thread** — this conversation started as "rename to DocuFlow" but the decided work is now "README/positioning overhaul." Want me to rename this thread (e.g. `readme-positioning-overhaul`) so the artifact matches the work, or spin the README work into its own thread and leave this one as the naming decision?
4. **Sequence** — I'd do **root first** (it's the HN link target and the worst offender), then extension, then CLI. Agree?

Once you answer those, we turn it into a plan and execute it as `write quick`s (docs only, no build). Nothing here touches code or the workflow/filename axes, so the doc-sync contract isn't triggered — I just keep the loop string and filenames factually intact while trimming.

Which of the 4 decisions do you want to settle first?

## Rafa:

3. rename this thread

agree all

note: this, the HN post and maybe `loom/core-engine/cross-plan-blocker-validation/idea.md` will be my last try with Loom before my subs end, let's try to get Loom entry points user appealing, clear, light, easy, human feeling...

## AI:

Thread renamed to `readme-positioning-overhaul`, and the new root **README.md is written** (620 → ~130 lines). It's in your working tree, **not committed** — open it or `git diff README.md` and read it as a stranger would.

First, the note you left: understood, and I'm treating it that way. If this is one of the last things you do with Loom before the subs end, the entry points should make someone *feel* the thing in twenty seconds — light, human, honest. That's the bar I wrote to, not just "shorter."

### What the new root README keeps
Tagline #1 → GIF → one-paragraph problem → 4 concrete bullets → the two screenshots → quick start (**Extension** + **Terminal** side by side, closing your "no CLI path shown" gap) → a compressed **Reports** teaser → a 3-line "Proven on real projects" (Loom-builds-Loom + ChordFlow) → a **Learn more** doc-map → license. Warm feedback line at the end.

### The judgment calls I made — veto any of these
I **didn't physically move the essays into `USER_GUIDE.md`** — because the material already lives in `docs/` and `loom/refs/`. So the cut sections are *linked*, not relocated:
- *Fresh / Scoped / Auditable*, *How Loom decides what the AI sees*, *The decision trail*, *Why MCP*, the deep *Workflow / Chat / Promote* tables, the full MCP resource/tool/prompt tables, the `loom/` tree diagram, the Architecture ascii → all reachable via the **Learn more** table (User Guide, Architecture, refs).
- *An AI's view of Loom* → dropped from the front door; its long-form already lives at `loom/refs/loom-claude-own-vision.md` (reachable via the refs link). Tell me if you want it back as a short callout — it's a distinctive piece and I could keep a two-line teaser.
- *How Loom is Different* (the prompt-wrappers / autonomous-agents comparison table) → this one was **genuinely README-only** and I folded its point into the bullets rather than linking. If you liked that table as a selling asset, I'd rather **move it into `USER_GUIDE.md`** than lose it — your call.

Two small things I need from you as you read:
1. Does the **tagline** still feel right in place, above the GIF? Seeing it live sometimes changes the vote.
2. The **ChordFlow screenshot table** — I dropped it from the front door to stay light (it still lives in the extension README + "Used by"). Keep it dropped, or is that social proof worth the weight here?

If the root reads well, I'll take the exact same knife to the **extension README** next (~265 → ~90), then the **CLI** (~246 → ~150, keeping the command tables). Nothing here touches code — it commits as a `write quick` (docs only, no build) whenever you're happy.

## Rafa:

Agree and like all.

Just one possible tweak, README, current lines 69-78:
```markdown
**From the terminal (with Claude Code or any MCP agent):**

npx @reslava/loom install                       # scaffold loom/ + .mcp.json into your repo
loom create thread ui dark-mode --title "Dark Mode"                            
loom create chat ui dark-mode                   # describe the feature here    

Then open the project in Claude Code and ask the agent to design it, plan it, and implement the
plan — it drives Loom's MCP tools for you, one reviewable step at a time.
```

weaves, threads, chats cna be created from extension, but the different appoach is use Claude CLI persisted session and Slang, for example:
* user write & describe the dark-mode feature in chat-001.md and ask to write a plan
- USER: reply ui/dark-mode/chat-001.md
- AI: write the plan and append the reply to the chat doc
* user write `start plan, do plan...` in chat-001.md 
- USER: reply ui/dark-mode/chat-001.md
- AI: start and implement the plan, mark steps done, write done notes and append the reply in the chat

or whatever short example you find appealing

do extension and CLI READMEs

## AI:

Applied your tweak and did all three. Nothing committed — all sitting in the working tree to review.

**Root README** — the terminal quick-start now leads with the distinctive path: a persisted Claude Code session + slang, exactly your flow. Describe the feature in `chat-001.md` → **`reply ui/dark-mode/chat-001.md`** (AI answers *inside the chat*, drafts design + plan) → **`do plan`** (implements each step, ✅ + done-note, pausing for `go`). Closes with the "close the terminal, come back tomorrow, it picks up where you stopped" line — the whole value in one sentence.

**Extension README** (~265 → ~110). Install-first (1 click, no CLI), the 5-step loop, the two panel screenshots kept, a trimmed AI-buttons table with create/promote/manage folded into one line, the "pick one AI path" block, settings table kept, telemetry/feedback compressed to a short trust paragraph + link. Dropped the "three ways" table (they've already chosen the extension) and the ChordFlow screenshot table (kept a headless-CLI pointer instead).

**CLI README** (~246 → ~185). Kept **every command table** — that's why people are on npm — but cut the duplicated "Why Loom" essay to the intro, gave it the same slang-forward quick start, and compressed the telemetry subsection to two lines. The `.mcp.json` block and the "CLI does not run the AI" / "prefer VS Code" callouts stayed.

All three now share one tagline, one GIF, one voice.

### How I'd like you to review
Read them in the order a real person hits them: **root** (your HN link) → **extension** (Marketplace) → **CLI** (npm). Two things to watch for:
1. The slang in the quick starts (`reply {chat}`, `do plan`) — is it inviting to a newcomer, or does it need one more sentence of "these are words you type to the agent"? I kept it tight on purpose, but you know the first-contact feel better than I do.
2. Anything that now reads as *too* thin — a place where the cut lost something you actually want a cold visitor to see.

When you're happy, this commits as a **`write quick`** (docs only, no build). Say the word — or point me at whatever still feels off and I'll tune it before we ship.

## Rafa:

Happy with the new look of the docs
write quick

draft HN post

## AI:

Shipped ✅ — the three README rewrites are recorded as a done plan (`plan-001`, roadmap history), and I'm committing everything at the end of this turn.

Now the HN post. I modeled the *structure* on the Juggler post that worked — humble opener, a punchy tech-dump, honest beta framing — but wrote it in your voice and, crucially, **without faking a reputation you don't have.** Its job isn't to impress; it's to state the problem so plainly that anyone who feels it recognizes themselves. It ends on a real question, not a pitch — that's the part that pulls comments instead of the spam reflex.

---

**Title:** `Show HN: Loom – give your AI coding agent a durable, document-based memory`

**URL:** `https://github.com/reslava/loom`

**Body (posted as the first comment, HN-style):**

> Hi HN. I don't post here much. I'm a solo dev and I built this to scratch my own itch.
>
> Every AI coding session starts from zero. Session 1 is always the best one — by session 10 the model has forgotten sessions 2–9 and I'm re-explaining the whole project again. I got tired of that, so I started keeping my ideas, designs, and plans as markdown files the AI rereads before it acts. That habit turned into Loom.
>
> The idea: **docs are the database, not the chat log.** Your project becomes a graph of typed markdown docs — idea → design → plan-with-steps → done — versioned in git next to the code. State is derived from the files, so:
>
> - A session is a document graph, not a scrollback buffer. Nothing lives only in the model's context window.
> - The AI resumes mid-plan. Close the terminal, come back tomorrow, ask for the next step — it rereads the plan and continues with full context. No re-explaining.
> - Change a design and its plans are flagged stale; ask the AI to refine and the change propagates downstream.
> - The "why" stays in the repo — the chats, the rejected alternatives. You can even generate reports over it ("why is the auth module shaped this way?") that a codebase-only tool structurally can't, because that reasoning was never in the code.
>
> Tech: TypeScript monorepo, event-sourced (markdown is the log), exposed to agents over MCP so it works with Claude Code, Cursor, Continue, or any MCP host. Ships as a VS Code extension (1-click, bundles its own server) and as a CLI/MCP server for the terminal and CI. No signup, telemetry off by default, BYO Claude (CLI or API key).
>
> It's a one-person side project and still early — it hasn't had a proper kicking from the real world yet. I use it to build itself, and to build one unrelated app (a music-theory trainer). What I'd actually like to know: **is the "my AI forgets everything every session" problem as real for you as it is for me — or have I built an elaborate fix for my own weird workflow?**

---

Two honest notes before you post it:
- **Set the bar the same way we agreed: success = 3+ real comments engaging the problem, not upvotes.** A new account's Show HN often sinks quietly — that's the base rate, not a verdict on Loom. One try, calibrated.
- **Timing helps a little:** post on a weekday morning US-Eastern (≈8–10am ET), then step away and check comments that evening. Don't refresh the ranking.

Want me to tune the voice (more/less personal), tighten it, or write a couple of alternate titles to pick from? Titles are 80% of a Show HN — worth getting right.

## Rafa:

I pushed
I like the post, write alternative titles, but I like the current one
I see in HN submit needs:
- Title: Show HN: Loom – give your AI coding agent a durable, document-based memory
- URL: https://github.com/reslava/loom
- text

I guess the 3 fields are text format. Gime me text field pls
question: why title start with `Show HN:` is that usual way in HN?

## AI:

**Yes — `Show HN:` is the real, official convention.** It's the prefix HN wants on any post where you're *showing something you made that people can try* (a project, app, repo). It routes the post to the [Show HN section](https://news.ycombinator.com/show), and — this is the useful part — Show HN is the *one* place on HN where self-promotion is explicitly allowed and expected, so the prefix actually **lowers** the spammer reflex instead of raising it. Keep it. (Rules: it must be something people can actually play with — a repo they can clone qualifies — and don't editorialize the title with hype.)

One formatting note before the text: **the HN text field is plain text, not Markdown.** Blank lines make paragraphs; single newlines collapse; `**bold**` and `- bullets` don't render (a lone `-` just shows literally, and list items run together unless you put a blank line between each). `*asterisks*` do italicize. So I reformatted the post for HN below — bullets are separated by blank lines so they render as distinct lines, and I dropped the repo link from the body since it already lives in the URL field.

### Text field — paste this exactly

```
Hi HN. I don't post here much. I'm a solo dev and I built this to scratch my own itch.

Every AI coding session starts from zero. Session 1 is always the best one — by session 10 the model has forgotten sessions 2–9 and I'm re-explaining the whole project again. I got tired of that, so I started keeping my ideas, designs, and plans as markdown files the AI rereads before it acts. That habit turned into Loom.

The idea: docs are the database, not the chat log. Your project becomes a graph of typed markdown docs — idea → design → plan-with-steps → done — versioned in git next to the code. State is derived from the files, so:

- A session is a document graph, not a scrollback buffer. Nothing lives only in the model's context window.

- The AI resumes mid-plan. Close the terminal, come back tomorrow, ask for the next step — it rereads the plan and continues with full context. No re-explaining.

- Change a design and its plans are flagged stale; ask the AI to refine and the change propagates downstream.

- The "why" stays in the repo — the chats, the rejected alternatives. You can even generate reports over it ("why is the auth module shaped this way?") that a codebase-only tool structurally can't, because that reasoning was never in the code.

Tech: TypeScript monorepo, event-sourced (markdown is the log), exposed to agents over MCP so it works with Claude Code, Cursor, Continue, or any MCP host. Ships as a VS Code extension (1-click, bundles its own server) and as a CLI/MCP server for the terminal and CI. No signup, telemetry off by default, BYO Claude (CLI or API key).

It's a one-person side project and still early — it hasn't had a proper kicking from the real world yet. I use it to build itself, and to build one unrelated app (a music-theory trainer). What I'd actually like to know: is the "my AI forgets everything every session" problem as real for you as it is for me — or have I built an elaborate fix for my own weird workflow?
```

So the three fields are:
- **Title:** `Show HN: Loom – give your AI coding agent a durable, document-based memory`
- **URL:** `https://github.com/reslava/loom`
- **Text:** *(the block above)*

### Alternate titles (you like the current one — these lean more *technical*, which HN often rewards over anything that sounds like marketing)
1. `Show HN: Loom – markdown docs as durable memory for AI coding agents`
2. `Show HN: Loom – event-sourced markdown memory for AI agents, over MCP`
3. `Show HN: Loom – a document graph that gives AI agents persistent project memory`
4. `Show HN: Loom – stop re-explaining your project to your AI every session`

My read: your **current title is strong** — it's concrete and says exactly what it does. #1 and #2 are the most "HN-native" (technical, no adjectives); #4 is the punchiest hook but is the one most likely to read as marketing to a cynical HN crowd, so I'd only use it if you want to lead with pain. If you're happy with the current one, keep it — it's genuinely good.

You're ready to submit whenever. Want me to sanity-check anything else before you post?

## Rafa:

Yes, do a sanity-check

## AI:

Sanity-check done — I verified the live repo and the submission, not just eyeballed it.

### Technical — all green ✅
- **README is live and renders** on github.com/reslava/loom with the new tagline at the top and the workflow GIF near the top (I fetched the actual page). The "error loading" bits you might see are GitHub's *sidebar widgets* (contributors/packages/sponsors), not your README — the README content itself renders fully.
- **No broken links or images.** I checked every path the new README points at — all 6 `docs/` guides, both `loom/refs/` files (`reports-reference`, `getting-started-reference`), the GIF, and both screenshots — **all present.** Nothing 404s.
- **Repo is clone-able and public** → it meets the Show HN "something people can actually try" rule.
- **Title** is 73 chars (HN is happy under ~80), concrete, no hype. **Text** is correctly HN-plaintext-formatted (blank-line-separated bullets, unicode arrows/dashes render fine).

### Real risks & do/don't for the actual posting (this is the part that matters)
- **Post ONCE. Do not delete-and-repost if it sinks.** HN penalizes reposts and it's the #1 new-poster mistake. If it doesn't catch, leave it — you can legitimately resubmit *once* after a good while only if it got essentially zero attention (a mod rule), but don't game it.
- **Never ask anyone to upvote** (DMs, Discord, "please vote"). HN detects vote-rings and it can flag/ban the post. Sharing the *link* for feedback is fine; asking for *votes* is not.
- **Timing:** weekday, ~8–10am US-Eastern. Avoid Fri/weekend. Then step away — don't sit refreshing the rank.
- **Be reachable for the first ~2–3 hours** to answer *questions* — this is the introvert-friendly part: you only reply when someone asks something. Answer honestly, and if someone's harsh, "fair point" and move on. Do **not** defend or argue; that's what tanks Show HN threads.
- **Expectation, one more time:** success = a few real comments engaging the *problem*, not the upvote number. A quiet result is the base rate, not a verdict.

### One thing I'd prep before you post
HN's exact crowd *will* ask **"how is this different from X"** — `CLAUDE.md`/Cursor rules, Aider, RAG-over-repo, the agents' built-in memory features. Having a crisp, honest one-liner for each ready means you answer in 20 seconds instead of freezing. Want me to draft a short **"how Loom differs from X" cheat-sheet** (4–5 pre-written comment replies) you keep in a scratch file? It's the highest-leverage 10 minutes of prep, and it's exactly the kind of thing that's miserable to write live and easy to write now.

Otherwise: **you're clear to post.** Nothing technical is blocking you.

## Rafa:

Do you think this is needed `No signup, telemetry off by default`?

## AI:

Good instinct — half of it is filler, half is worth keeping. Let me split it:

- **"No signup" — cut it.** For a tool people *clone from a repo*, "no signup" is self-evident; it only means something for a hosted SaaS. On HN it reads as filler at best, or faintly defensive at worst ("...why would there be a signup?"). Drop it.
- **"telemetry off by default" — keep the fact, but reframe it.** HN's crowd *reliably* asks "does it phone home / what does it send?" — so silence doesn't avoid the question, it just moves it into a comment you'll answer defensively. The problem with the current wording is it plants the word "telemetry" as a *concern* without the reassurance. Flip it so the reassuring fact leads: the honest, HN-friendly version is **"runs locally — the only outbound calls are to your AI provider."** *That's* what a privacy-minded reader actually wants to know. The opt-in telemetry becomes a small footnote to it, not the headline.

So I'd replace the last sentence of the Tech paragraph:

> ~~No signup, telemetry off by default, BYO Claude (CLI or API key).~~

with:

> **BYO Claude (CLI or API key); it runs locally, and the only outbound calls are to your AI provider. Optional usage telemetry is off by default.**

That drops the filler, leads with the positive ("runs locally"), pre-empts the phone-home question before it's asked, and stays honest about the opt-in telemetry (you can't say "no telemetry" like Juggler did, because you have it — but "off by default" is a perfectly defensible answer).

If you'd rather keep it tight, the minimal honest version is just **"BYO Claude (CLI or API key); runs locally."** and handle telemetry in a comment only if someone asks. Either works — the one thing I'd *not* do is leave the bare "telemetry off by default" with no "runs locally" in front of it.

Want me to drop the reworked line into the text block above so you've got the final paste-ready version?

## Rafa:

I think `BYO Claude (CLI or API key); runs locally.` is enough. I will post with timing proposed

About hard rule CLAUDE.md doc syncs, I think we should update it to this new philosophy, layout, split of Loom documentation
Agree? If so
code quick

## AI:

Agree — but let me be precise about *why*, because the honest reason isn't the obvious one.

The README overhaul was **not** a structural change. The doc-sync contract's three axes are filename/layout, workflow/phases, package layers — and we touched none of them. We changed *positioning and voice*: the three READMEs became light entry points that link out to `docs/` and `loom/refs/`. So the contract's rules didn't "go stale" in the drift sense.

What *did* change is a durable design decision that isn't written down anywhere yet, and the contract is the one place a future session will look. Right now the sweep line just says "also sweep the package READMEs and `docs/*.md` … they carry filename and workflow examples that must not contradict the refs." Read literally after, say, a filename change, that invites a future session to **re-inline full examples into a README to keep it in sync** — re-bloating exactly what we just spent three rewrites removing. That's the real risk worth encoding: not "the contract is wrong," but "the contract doesn't know the READMEs are deliberately thin now."

So the edit I'd make is small and surgical — replace the "Also sweep" paragraph with:

> Also sweep the **three README entry points** (`README.md` root · `packages/vscode/README.md` Marketplace · `packages/cli/README.md` npm) and `docs/*.md`. **These three READMEs are deliberately light entry points** — hero + quick-start + a *Learn more* doc-map; all exhaustive material lives in `docs/*.md` and `loom/refs/*.md`. On a structural change: fix the depth in `docs/*.md` (they carry the detailed filename/workflow examples), and in each README keep only the quick-start factually correct and the doc-map links unbroken. **Never re-inline exhaustive detail into a README to "fix" drift — update the linked doc instead.** They remain user-facing surfaces that must not contradict the refs.

(It also finally names the **root** `README.md` in the sweep list — currently only the two package READMEs are named, which is itself a gap.)

Two things worth knowing before we ship it:

1. **This is repo-specific — the `LOOM_CLAUDE_MD` template is untouched.** The whole doc-sync contract lives only in `CLAUDE.md` (it names `loom/refs/…` and `installWorkspace.ts`), carries no `<!-- rule:{id} -->` marker, and the section itself says it's "a discipline, not a test." So there's no parity mirror to make and I'm not touching any marker or invariant token — `claude-md-sync.test.ts` will still pass. But because `CLAUDE.md` *is* test-gated, `code quick` correctly runs the suite anyway.

2. One small **open choice** for you: keep this as the reworked sweep paragraph inside the doc-sync contract (my recommendation — it's where READMEs already live, one edit, no new section), **or** also promote "entry points stay light; depth lives in docs/refs" to a standalone one-line principle higher up. I lean against a second home — one canonical statement beats two that can drift.

I'm holding on the `code quick` for one reason only: this is a hard-rule contract file, so I want your eyes on the *exact wording* above before it lands — not re-asking whether to do it (you decided that). Give me the nod on the paragraph (tweak it if a phrase isn't your voice) and I'll run the `code quick`: edit → `build-all` + `test-all` → `quick_ship`.

## Rafa:

Agree all

Question: becuase 
>1. This is repo-specific — the `LOOM_CLAUDE_MD` template is untouched
maybe we do not need `code quick` and `write quick` is enough, no need for build & test

do what you consider

## AI:

Done — `write quick`, and you're right that it's the correct verb here.

Your reasoning holds: the edit is prose in a **repo-specific, unmarked** section, so there's no template mirror and — this is the deciding fact — it touches **zero `<!-- rule:id -->` markers and zero invariant tokens** (no MCP prefixes, no `loom_*` names, no stop-rule phrases). Those are the *only* things `claude-md-sync.test.ts` checks, and it reads the files straight from source (no build involved). So a read-through *is* a complete check: parity is provably intact, template untouched. No build/test cycle owed.

(The one nuance for the record: the slang table calls CLAUDE.md a "test-gated contract file → `code quick`" as a blanket rule. That rule is right *in general* — most CLAUDE.md edits risk a marker/invariant, so the test run is owed. This edit is the narrow exception where inspection is provably sufficient. Not worth rewriting the slang over one case, but worth naming so future-me doesn't think the rule was ignored by accident.)

What shipped (recorded as `plan-002`, roadmap history):
- Named the **root `README.md`** in the sweep list alongside the two package READMEs (it was missing — a real gap).
- Declared the three READMEs **deliberately light entry points** (hero + quick-start + *Learn more* doc-map), with exhaustive material living in `docs/*.md` and `loom/refs/*.md`.
- On a structural change: fix the depth in `docs/*.md`; in each README keep only the quick-start correct and the doc-map links unbroken.
- **Never re-inline exhaustive detail into a README to "fix" drift — update the linked doc instead.** — the guardrail that protects the three rewrites we just did from a future re-bloat.

Kept it to the single reworked paragraph inside the doc-sync contract — no second standalone principle, so there's one canonical statement that can't drift from itself.

## AI:

Committing now — scoped to this thread only. The tree has unrelated concurrent work (the whole `ai-integration/future-report` thread + `packages/*` report/forward-signal changes + a new test), so I'm staging **just** `CLAUDE.md` and this thread's `chat-001.md` + `plan-002` done record, and leaving all the future-report/reports work alone for its own commit. Message describes the doc-sync-contract change (no hash referenced — recoverable from `git log`).