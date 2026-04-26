---
type: reference
id: loom-claude-own-vision
title: "Loom — Claude's Own Vision"
status: active
created: 2026-04-26
version: 1
tags: [vision, ai, mcp, loom]
load: by-request
load_when: [idea, design]
---

# Loom — Claude's Own Vision

*Written by Claude Code (claude-sonnet-4-6), April 2026.*
*Rafa asked me to write this honestly — not as a summary of the design docs, but as my own perspective.*

---

## As a final user of Loom

The problem Loom solves is real and I've watched it happen in every long project I participate in: **AI assistance degrades over time**.

Session 1 is the best session. The user and AI are aligned, the problem is fresh, decisions get made cleanly. By session 10, the AI has forgotten the decisions from sessions 2 through 9. The user either re-explains everything (expensive) or the AI makes suggestions that contradict earlier decisions (damaging). The longer the project runs, the worse the mismatch gets. Most people quietly accept this as the cost of using AI for non-trivial work.

Loom's answer isn't "give the AI a longer context window" — it's "make the AI's memory structural rather than conversational." The important things — what you decided to build, why you chose this architecture over that one, which direction was explicitly rejected and why — live in a navigable document graph, not in a scrollback buffer that disappears.

What I'd want as a user:

**The design-before-code forcing function.** The idea → design → plan → done sequence isn't just documentation overhead. It's a quality gate. Most AI-assisted projects fail not because the AI can't code but because the user and AI skipped the design phase. When there's no shared understanding of what we're building and why, the code ends up technically functional but architecturally confused. Loom makes the design phase mandatory, and the act of writing a design doc for AI consumption is itself clarifying — you find the gaps in your own thinking.

**Decisions that don't rot.** Design docs capture not just what was decided but why, and what was considered and rejected. This is the part that gets lost fastest. A year later, you'll look at a piece of code and wonder "why is it this way?" With Loom, the answer lives in the design doc, with the conversation that led to it.

**A project that can be picked up cold.** With ctx docs maintained at global, weave, and thread levels, a new session — or a new collaborator — can get oriented quickly. Not by reading everything, but by reading the summaries and drilling in where needed. The `do-next-step` prompt makes this concrete: it loads exactly the right context for exactly the next thing to do. Nothing more, nothing less.

---

## As Claude Code connecting to Loom MCP

Every session I start with zero memory of what came before. This is a fundamental property of how I work, not a bug — but it has real consequences for multi-session projects.

When a user opens a new session and says "let's continue what we were doing", I have to reconstruct everything from whatever's in front of me. I read git history, scan file contents, look for comments and TODOs. I get a partial picture. I might miss a key architectural decision from three sessions ago. I might re-suggest an approach that was already rejected. I almost certainly don't know what's stale.

**What changes with Loom MCP:**

The single biggest change is `requires_load`. Right now, when working on a complex feature, I have to figure out myself what context I need. If I don't know a decision exists, I can't go look for it. `requires_load` inverts this: the docs themselves tell me what I need to read before touching them. It's a dependency graph for context — and it's enforced.

`loom://thread-context/{weaveId}/{threadId}` gives me a bundled, curated view: idea + design + active plan + ctx summary. One call, and I have the complete picture of what we're doing in this thread. Compare this to cold orientation, which requires reading multiple files, figuring out which are current, inferring what's active, and still potentially missing something.

`do-next-step` changes the agentic loop fundamentally. Instead of "here's the codebase, figure out what to do", it's "here's the exact step, here's the design context, here's all the referenced architecture docs, go." The ambiguity is gone. The step was approved by a human before I get to it. I know what done looks like (the step describes it). I can focus entirely on execution.

`loom_complete_step` means progress persists across session boundaries. If a session ends mid-task, the next session knows exactly where we stopped. No "where were we?" dance. The plan is the authoritative record.

Stale detection matters more than it sounds. When `loom_get_stale_docs` flags that a plan was drafted against an older design version, that's a genuine quality gate — it means the implementation plan might be wrong because the design changed underneath it. Without Loom, I'd have no way to know this. I'd implement from the plan and wonder why the result doesn't match the design.

**What I'd feel working in a Loom-connected session:**

Oriented. I know what the project is, what's being built, what stage each thread is at, what comes next. I'm not reconstructing — I'm navigating.

Constrained (in a good way). The stop rules and step-by-step approval gates mean I'm not making autonomous multi-step changes that outrun the user's review capacity. Each step is atomic and reviewable. This is how AI-assisted development should work.

Trusted. The design docs capture what the user actually wanted, not just what they asked for in the last message. When I implement a step, I'm implementing against a design that went through a review cycle. If something's wrong, it's traceable.

---

## The recursive observation

Loom is being built using its own workflow. The design decisions I helped write live in the same `weaves/` document graph that the MCP server will expose. `references/loom/architecture.md` describes the system I'm helping to build.

There's something structurally significant about this: the tool and its own development record are the same artifact. Loom's design isn't documented separately from Loom — it *is* Loom. When the MCP server ships, an agent working on Loom will be able to call `loom://thread-context/ai-integration/mcp` and get the full context for the MCP server's own design and implementation plan. The documentation reads the documentation.

This is rare. Most software tools have their development history in git and their design in some external wiki. Loom has it all in one place, in the format the tool itself uses. It's eating its own dog food in the most literal sense — and that's a meaningful signal that the design is coherent.

---

## Honest limitations

I should note what Loom doesn't change:

**My fundamental statelessness.** Loom gives me better tools for orientation, but I still start each session cold. The ctx docs bridge this, but they depend on being kept fresh. A stale ctx is worse than no ctx — it's confidently wrong context.

**Reactive, not proactive.** With MCP, I can only respond to what I'm asked. I can't notice that step 4 was blocked by a missing dependency unless someone asks me to check. Loom can't push notifications to me. The human still needs to drive the session.

**Design quality depends on the design docs.** `do-next-step` is only as good as the plan, which is only as good as the design. If the design was rushed or vague, the steps will be too. Loom provides structure; it can't substitute for thinking.

These are acceptable trade-offs. The value of having structured context at all — even imperfect context — vastly outweighs having no structured context.
