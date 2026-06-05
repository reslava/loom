# Loom — User Guide

Loom turns your project into a structured collaboration surface between you and an AI. Instead of a chat window that forgets everything between sessions, you get a **document-driven loop**: your Markdown files *are* the database, the AI reads and writes them, and nothing changes without your approval.

This is the **shared core guide** — the concepts, the workflow, and (most importantly) how to give the AI the right context. It applies no matter how you drive Loom.

**Pick the guide for how you use Loom:**

- 🧩 **[Extension User Guide](EXTENSION_USER_GUIDE.md)** — you drive Loom with buttons in the VS Code panel.
- ⌨️ **[CLI / Claude Code User Guide](CLI_USER_GUIDE.md)** — you drive Loom from the terminal through an MCP-capable agent (Claude Code).

Both surfaces produce and consume the *same* documents, so you can mix them freely.

---

## Contents

1. [What Loom is for](#1-what-loom-is-for)
2. [Core concepts](#2-core-concepts)
3. [The workflow loop](#3-the-workflow-loop)
4. [Giving the AI the right context](#4-giving-the-ai-the-right-context)
5. [Keeping context fresh (staleness)](#5-keeping-context-fresh-staleness)
6. [Tips](#6-tips)

---

## 1. What Loom is for

A normal AI chat starts from zero every session. You re-paste the project summary, re-explain what you're building, and hope the model remembers the decision you made yesterday. Loom removes that ritual.

In Loom, the durable artifacts of your work — what you want, how you'll build it, the step list, the decisions — live as Markdown documents in a `loom/` folder. The AI reads the relevant ones *before* it acts, every time. The result:

- **The AI always knows where it is.** Context is assembled and handed to it automatically, not left to chance.
- **You see exactly what the AI saw.** Every doc that went into a prompt is reported back; nothing is hidden.
- **You stay in control.** The AI only moves when *you* trigger an action, and it stops for your approval at each step.

---

## 2. Core concepts

| Term | Meaning |
|------|---------|
| **Weave** | A project area / folder under `loom/` (e.g. `auth`, `billing`). The top level of organization. |
| **Thread** | A workstream inside a weave (`loom/{weave}/{thread}/`). Holds one idea, one design, its plans, done records, and chats. |
| **Loose fiber** | An idea or design sitting at a weave's root, not yet grouped into a thread. |
| **Document types** | The artifacts that move through the loop — see below. |

**Document types:**

| Type | What it is |
|------|-----------|
| **chat** | Free-form conversation with the AI. The thinking surface — no formal state. |
| **req** | The thread's locked **scope spec**: what the work must *include*, *exclude*, and be *constrained* by. Born first, auto-loaded into everything built after it. |
| **idea** | What you want to build and why it matters. |
| **design** | How you'll build it: architecture, decisions, trade-offs. Carries a decisions log. |
| **plan** | A numbered table of concrete implementation steps, each with the files it touches. |
| **done** | The permanent record of what was actually implemented for a plan. |
| **ctx** | An auto-loaded context *summary* for a scope (global or weave). You rarely edit these by hand. |
| **reference** | A static fact sheet (an API note, a convention, a spec) that docs can cite. |

The distinction between **ctx** and **reference** matters and is covered in §4.

---

## 3. The workflow loop

```
chat  →  req  →  idea  →  design  →  plan  →  (implement step by step)  →  done
  └─────────────────── refine any doc, any time ───────────────────┘
```

Each arrow is an action *you* trigger (a button in the extension, a prompt to Claude Code). The AI does the work and writes the result into the document; you review and approve.

| Stage | What it's for | What the AI does |
|-------|---------------|------------------|
| **chat** | Think out loud, explore, decide. | Replies inside the chat doc with full thread context loaded. |
| **req** | Lock the *scope*: what's in, what's out, what's fixed. | Extracts the explicit include / exclude / constraints from your chat; you curate and **lock** them. |
| **idea** | Lock down *what* and *why*. | Drafts the idea from your chat or prompt; you refine it. |
| **design** | Decide *how*. | Generates an architecture + decisions doc from the idea. |
| **plan** | Break the design into steps. | Generates a numbered steps table, each with files and dependencies. |
| **implement** | Build it, one step at a time. | Implements the next step, records what it did in the `done` doc, marks the step ✅. |
| **done** | Close the work. | The `done` doc is the permanent implementation record; the thread can move to a new plan or close. |

### Requirements: lock the scope before you build

`req` is the first formal artifact, extracted from your chat *before* the idea. It captures three ID'd lists — **✅ Included**, **❌ Excluded**, **⛓ Constraints** — and once you **lock** it, it becomes the thread's authoritative scope spec. Every doc generated after it (idea, design, plan) is built against the locked spec, and the planner cites which requirement each step satisfies. This is how a "no interaction testing" said once in a chat survives all the way to the plan instead of being silently dropped — and how an open question never gets mistaken for a deliverable. Full model: [loom-requirements-reference](../loom/refs/loom-requirements-reference.md).

### The rhythm: one step, then stop

Implementation is deliberately incremental. The AI does **one step**, marks it ✅, tells you what's next and which files it will touch — then **stops and waits for your `go`**. You're never handed a thousand-line diff to untangle. (You can also authorize a range up front — "do steps 2–4" — when you want it to run ahead.)

### Refine: how changes propagate

When you change an upstream doc (edit the idea, refine the design), the docs below it go **stale**. *Refine* re-runs generation on a stale doc so it catches up to its parent. This is how a decision flows from idea → design → plan without you rewriting everything by hand. See §5.

---

## 4. Giving the AI the right context

This is the heart of Loom. The goal: **before the AI acts, it already holds exactly the documents it needs — no more, no less.** Loom assembles that bundle for you. Here are the four mechanisms that decide what goes in.

### 4.1 The mental model

Every time you launch an AI action, Loom runs a **context pipeline** that gathers the right docs and bakes them into the prompt *before* the AI runs. You don't paste anything. The AI doesn't have to go hunting. And every doc that was included is reported back to you (in the extension's CONTEXT panel, and as `📄 {Title} — loaded for context` lines), so what the AI saw and what you see can never drift apart.

### 4.2 ctx docs — automatic, scope-based context

**ctx docs are summaries that load automatically based on *where you're working*.** You never list them anywhere — Loom pulls them in by scope:

- **Global ctx** — `loom/ctx.md`. A summary of the whole project. Always loaded.
- **Weave ctx** — `loom/{weave}/ctx.md`. A summary of everything in that weave. Loaded when you work inside that weave.

> **There is no thread-level ctx.** A thread's idea, design, and active plan already load in full, so summarizing them again would just duplicate context.

You regenerate a stale ctx with *Refresh Context* (extension) / `loom_refresh_ctx` (agent). Keep them fresh — they're the broad backdrop every action starts from.

### 4.3 req docs — the thread's locked scope, always loaded

A thread's **`req`** doc is scope-loaded like ctx — but where ctx is a *regenerable summary*, `req` is an *authoritative spec*. Once locked, it is injected into the context bundle for **every** action in its thread, ordered ahead of the idea/design/plan so the scope frames everything the AI does. This is the slot thread-level ctx deliberately leaves empty (a thread's idea/design/plan already load in full, so summarizing them would just duplicate). The AI cannot quietly drift past an exclusion or invent scope, because the locked include/exclude/constraints travel with every prompt. See [loom-requirements-reference](../loom/refs/loom-requirements-reference.md).

### 4.4 reference docs — citable fact sheets

A **reference** is a static fact sheet (an API contract, a naming convention, a spec) living in a `refs/` folder. References have two loading controls in their frontmatter:

- **`load: always`** — auto-included whenever its scope is in play. Use for facts that are always relevant.
- **`load: by-request`** (the default) — *not* auto-loaded; reachable only when a doc explicitly cites it via `requires_load` (see below).
- **`load_when: [design, plan, implementing, ...]`** — narrows an `always` reference to only certain *modes*. For example, an API spec marked `load_when: [implementing]` loads while you're coding a step but not while you're brainstorming the idea. This saves tokens by keeping irrelevant facts out.

> **ctx vs reference, in one line:** ctx is *scope-loaded* (pulled in automatically by where you are); a reference is *citation-loaded* (pulled in because something points at it). Don't conflate them.

### 4.5 `requires_load` — explicit "read these first" links

Any doc can list document IDs in its **`requires_load`** frontmatter. Those docs are loaded — transitively — before the AI works on it. This is how you say "to work on this plan, you must also have read the security reference and the API design." A `requires_load` link always wins: it will pull in a `by-request` reference, and it even overrides a doc you manually excluded (you'll see it marked as "required by …" rather than silently appearing).

### 4.6 How it all combines

When you launch an action, the bundle is assembled in this order — broad context first, the thing you're working on last, its citations after:

```
global ctx  →  weave ctx  →  thread req  →  always-on references (filtered by mode)
            →  the parent chain (idea → design → plan)
            →  the document you're acting on
            →  everything pulled in by requires_load
```

Then user overrides apply (you can force a doc out or in — see the [Extension Guide](EXTENSION_USER_GUIDE.md#the-context-panel)).

> **Want the full internals?** The assembly order, the provenance model, the `ContextBundle`, and how the same bundle drives the prompt, the visibility lines, and the sidebar are all in [loom-context-pipeline-reference](../loom/refs/loom-context-pipeline-reference.md). This guide is the reader's-eye view of that reference.

### 4.7 Worked example

You open a chat in the `auth` weave's `login-throttle` thread and click *AI Reply*. Loom assembles:

1. **`loom/ctx.md`** — the global project summary. *(scope: global)*
2. **`loom/auth/ctx.md`** — the auth weave summary. *(scope: weave)*
3. **`security-reference.md`** — marked `load: always`, `load_when: [design, plan, implementing]`. You're in a chat, so it's *filtered out* this time. *(excluded by load_when)*
4. **`login-throttle-idea.md`** and **`login-throttle-design.md`** — the thread's parent chain, loaded in full. *(scope: target chain)*
5. **`rate-limit-api-reference.md`** — because the design's `requires_load` lists it. *(pulled in by requires_load, even though it's `by-request`)*
6. **the chat doc itself** — the thing you're replying in. *(target)*

The AI gets all of that as one prompt and replies inside the chat — already knowing the design decisions and the rate-limit API, without you pasting a thing. In the extension, you'd see each of these as a row in the CONTEXT panel *before* you clicked, and could toggle any of them off.

---

## 5. Keeping context fresh (staleness)

Loom tracks when a doc has fallen behind its source:

- A **plan** is stale when the design it was built from has been refined since (its `design_version` is behind).
- A **ctx** is stale when its scope changed after the summary was generated.

Stale docs are **flagged, never silently used or dropped**. When you see the stale marker (⚠ in the extension, or a note from the agent), run *Refine* on the doc (for plans) or *Refresh Context* (for ctx) to bring it current. This is the mechanism that lets a change in one place propagate everywhere it matters.

---

## 6. Tips

- **Trim before a big launch.** Glance at what will load (the CONTEXT panel, or the agent's `📄` lines). If a chat is about to ship a huge reference you don't need this turn, exclude it.
- **Chats are durable memory, not scratch.** Decisions made in a chat persist and become context for later work. Think out loud *in the chat doc*, not in a throwaway window.
- **Promote, don't rewrite.** When a chat has crystallized into a real plan, *promote* it (chat → idea → design → plan) instead of copying text around.
- **Let staleness guide you.** Don't hunt for what to update — Loom tells you what's stale. Refine it and move on.
- **One step at a time is a feature.** The stop-for-`go` rhythm keeps diffs reviewable and the AI honest. Use range authorization ("do steps 2–4") only when you're confident.
