# Ways to Use Loom

**Loom is not one workflow — it's a doc graph with several doors onto it.** This guide
maps the ways you can run Loom, gives a real example of each, and helps you pick the one
that fits how you work. Whichever door you use, you're editing the **same** `loom/` doc
graph — so you can mix and switch freely.

## Contents

- [Two users](#two-users)
- [Two axes](#two-axes)
- [The four recipes](#the-four-recipes)
- [Pick your way](#pick-your-way)
- [How the architecture serves this](#how-the-architecture-serves-this)
- [Patterns for the persistent agent](#patterns-for-the-persistent-agent)

---

## Two users

Every Loom project has **two users**:

- **The human** (you) — decides direction, writes chats, clicks the buttons or drives the terminal.
- **The AI** — reads the docs, writes ideas/designs/plans, implements steps, records what it did.

Loom exists to make that collaboration durable: markdown documents are the shared context
database both users read and write. Everything below is just *how the human drives the AI*
and *how the human sees the graph*.

Because that shared database *is* the repo, the project also keeps its whole **decision history** —
every idea, design, plan, and the chats behind them, versioned in git. See
[The decision trail is part of the repo](../README.md#the-decision-trail-is-part-of-the-repo).

---

## Two axes

The ways to use Loom fall out of **two independent choices** you combine freely:

- **Axis A — your control surface:** how *you* see and manage the doc graph.
  - **Extension** — the VS Code tree, roadmap, and buttons.
  - **CLI-only** — the terminal (`loom status`, `loom roadmap`, doc CRUD commands).
- **Axis B — the AI session model:** how inference is driven.
  - **Task-scoped launch** — an extension button opens **one fresh AI session per action**, steered by a launch prompt. The AI does that one task; you watch.
  - **Persistent agent** — you keep **one long-lived agent session** open (Claude Code, Cursor, …), converse with it, point it at Loom's MCP tools/resources, and end it when *you* decide.

### The matrix

```
                          AXIS B — AI SESSION MODEL
                ┌────────────────────────┬───────────────────────────┐
                │  Task-scoped launch    │  Persistent agent         │
                │  (button → 1 fresh     │  (you keep one agent      │
                │   AI session/action)   │   session open, you end)  │
 ┌──────────────┼────────────────────────┼───────────────────────────┤
 │ Extension    │  ① GUIDED              │  ② POWER TERMINAL         │
 │ (tree,       │  beginner / simple     │  extension for the tree,  │
 │  roadmap,    │  click a button,       │  drive a persistent agent │
 │  buttons)    │  watch AI work         │  + CLI in the terminal    │
 ├──────────────┼────────────────────────┼───────────────────────────┤
 │ Terminal /   │  —                     │  ③ PURE AGENT             │
 │ CLI only     │  (launches are an      │  terminal-only, no ext.,  │
 │ (no ext.)    │   extension mechanism) │  any MCP host             │
 └──────────────┴────────────────────────┴───────────────────────────┘

 Orthogonal — no AI, non-interactive:
 ④ AUTOMATION / CI — scripted CLI (loom validate, record-release, roadmap in CI)
```

Two things to read from the matrix:

- **The bottom-left cell is intentionally empty.** Task-scoped launches only come from the
  extension — a button is what writes the launch prompt. So "CLI-only + task-scoped" isn't a
  real combination; there's no fourth interactive recipe hiding there.
- **Automation (④) isn't a cell — it's a layer under everything.** Any of ①–③ can *also* run
  Loom's CLI in CI. It's drawn to the side to keep the 2×2 clean.

---

## The four recipes

### ① Guided — extension buttons, watch AI work

**For:** beginners, simple projects, anyone who wants a visual, near-zero-typing loop.

You live in the VS Code tree. Each AI action is a button; clicking it opens a Claude terminal
that does exactly that one task while you watch.

> **Example.** Right-click a thread → **Generate Idea**. A Claude terminal opens with a launch
> prompt, reads the thread's chat, and writes `idea.md`; you review it in the tree. Then
> **Generate Design** → **Generate Plan** → **Start Plan** → **DoStep**, **DoStep**, … —
> each a click, each a fresh session you can watch and interrupt.

### ② Power terminal — extension for the tree, a persistent agent in the terminal

**For:** advanced users who want the visual map *and* a long-lived agent they steer directly.

You keep the extension open for the tree and roadmap, but instead of clicking buttons you run
an agent in a terminal and talk to it. The session lasts as long as you want.

> **Example.** With the extension open, you run `claude` in a terminal and say: *"Read
> `ai-integration/context-dispatcher/design`, then draft the plan for this thread."* The agent
> loads `loom://context/ai-integration/context-dispatcher/design`, proposes the plan, and on
> your go writes it with `loom_create_plan`. You keep going — implement steps, refine a doc —
> in the same session, watching the tree update as it writes.

**Starting a thread this way — the chat-driven loop.** The usual entry point is a chat you and
the agent think in together:

1. **You create a chat** and write the thread's starting point — from the terminal with
   `loom create chat <weave> <thread>`, or via the extension.
2. **You point the agent at it:** *"read `ai-integration/ways-to-use-loom/chat-001`."*
3. **The agent loads the thread context** (the `loom://context/...` bundle — global/weave ctx +
   parent chain) so it answers from state, not from zero.
4. **The agent replies inside the chat** with `loom_append_to_chat` — the reply persists in the
   doc, not just the terminal scrollback.
5. **You reply in the chat doc** with your next thought.
6. **You say "reply."**
7. **The agent reads just your new turn** with `loom_read_chat_tail` (the turns since its last
   reply, not the whole chat) and appends its answer — back to step 5.

That loop — chat → point → load → reply → repeat — is how a thread gets thought through before
anything is formalized into an idea or design.

### ③ Pure agent — terminal-only, any MCP host

**For:** terminal purists and non-VS-Code editors (Cursor, Continue, …). The truest test of
Loom's *"works with any MCP-capable agent"* promise.

No extension at all. You configure the Loom MCP server in your agent host and converse with the
agent; you orient yourself with the CLI instead of a tree.

> **Example.** In Cursor with the Loom MCP server configured, you check where you are with
> `loom status` and `loom roadmap`, then tell the agent: *"Continue the `staleness-model`
> thread — do the next step."* It reads `loom://context/...`, implements, records the done note,
> and marks the step — no extension, same doc graph.

You are not limited to reading and stepping: every NO-AI tree operation the extension exposes as
a button has a CLI twin, so the whole doc graph is manageable from the terminal —
`loom archive` / `loom restore` / `loom delete` (guarded, `--yes` to skip the prompt),
`loom move-thread`, `loom set-priority`, `loom set-thread-deps`, `loom close-plan`,
`loom quick-ship`, and `loom promote <doc> <type> --body-file <path>`.

### ④ Automation / CI — scripted CLI, no AI

**For:** keeping the doc graph honest in pipelines. No AI, non-interactive.

The `loom` CLI is scriptable, so parts of Loom belong in CI and release scripts.

> **Example.** A GitHub Action runs `loom validate` to fail the build on broken doc links, and
> your release script calls `loom record-release` to stamp the shipped version onto done plans.
> No agent involved.

---

## Pick your way

| Your situation | Recommended recipe |
|----------------|--------------------|
| New to Loom, or a small/simple project | **① Guided** |
| Editor-centric, but you want to steer the AI directly / do longer sessions | **② Power terminal** |
| You live in the terminal, or use Cursor / another MCP host | **③ Pure agent** |
| You need doc-graph checks or release stamping in CI | **④ Automation** (alongside any of the above) |

These aren't exclusive. A common shape is **② Power terminal** day-to-day, **④ Automation** in
CI, and dropping to **① Guided** buttons for a quick one-off generate.

---

## How the architecture serves this

The reason the ways interoperate is that they all ride **one shared spine: MCP over one doc graph.**

```
  Extension ─┐
             ├─▶  MCP server  ─▶  app  ─▶  core + fs   (the loom/ doc graph)
  Agent ─────┘
  CLI ─────────────────────────▶  app  ─▶  core + fs
```

- The **extension** and any **agent** are thin MCP *clients* — they never touch the doc graph
  directly; every read/write goes through `loom://` resources and `loom_*` tools.
- The **CLI** is a thin delivery layer over the same `app` use-cases.

Because there's a single source of truth and a single set of state-mutating operations, it
doesn't matter which door you came through — a plan you started with a button, a step you did
with a terminal agent, and a `loom validate` in CI are all reading and writing the same graph.

---

## Patterns for the persistent agent

A long-lived agent session (ways ② and ③) gives you some useful freedom. Two patterns worth
knowing — both already fit Loom's model, nothing special to configure:

- **Borrow context from another thread.** Mid-work on thread-A, ask the agent to read another
  thread's idea to recall why a past decision was made — *"read `core-engine/staleness-model`'s
  idea so you know why we chose the version-based model."* That's a pointed read
  (`loom://context/{weave}/{thread}/idea`); you stay in thread-A, its scope doesn't change.
- **Switch threads early.** Sometimes you start thread-A and immediately realize thread-B has to
  come first. When thread-A has almost no context invested yet, spin up thread-B (idea + a chat),
  point the agent there, and switch. It's cheap precisely because A hadn't started for real.

Both respect Loom's core discipline: **one thread = one slice of work, with fresh thread context
injected when a session starts, and the session closed when the thread is done and committed.**
The freedom is in *reading across* threads and *choosing* which thread to work — not in blurring
a thread's scope.
