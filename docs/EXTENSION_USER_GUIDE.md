# Loom — VS Code Extension User Guide

> **New to Loom?** Read **[Core concepts & workflow](USER_GUIDE.md)** first — it explains weaves, threads, the chat → idea → design → plan → done loop, and how context works. This guide covers only what's specific to driving Loom with the **VS Code extension**: setup, the panel, the buttons, and the CONTEXT view.

---

## Contents

1. [Install](#1-install)
2. [Connect an AI agent](#2-connect-an-ai-agent)
3. [The Loom panel](#3-the-loom-panel)
4. [Driving the workflow with buttons](#4-driving-the-workflow-with-buttons)
5. [The CONTEXT panel](#5-the-context-panel)
6. [Settings](#6-settings)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Install

**1. Install the CLI** (the extension talks to it):

```bash
npm install -g @reslava/loom
```

**2. Install the extension** — search `reslava.loom` in the VS Code Marketplace.

**3. Initialize Loom in your project**, from the project root:

```bash
loom install
```

This creates `.loom/` (config), `loom/` (your document workspace), a `CLAUDE.md` session contract, and the MCP wiring. The Loom icon then appears in the Activity Bar.

> First time? The extension ships a **Get Started** walkthrough (Command Palette → *Welcome: Open Walkthrough* → "Get Started with Loom") that steps you through CLI install, `loom install`, AI setup, and your first weave.

---

## 2. Connect an AI agent

Every AI button picks its path automatically at click time:

**Path A — Claude Code CLI (default, recommended).** If `claude` is on your PATH, buttons open a persistent **Loom AI** terminal and run `claude "<prompt>"`. Claude reads your docs, calls the right Loom tools, and writes the result back. No API key needed — works with a Claude Pro subscription.

```bash
npm install -g @anthropic-ai/claude-code
```

**Path B — API key (fallback).** If Claude Code isn't installed, the extension calls a provider directly using a configured API key (see [Settings](#6-settings)). This path uses MCP *sampling* — the extension runs the inference on the server's behalf.

You don't choose between them; the extension uses Claude Code if present, otherwise the API key.

---

## 3. The Loom panel

Click the **Loom** icon in the Activity Bar. The sidebar has two views:

### Threads view

A tree: **weaves** → **threads** → documents (idea, design, plans, chats, done). The toolbar (top of the view) and right-click context menus act on the selected node.

| Toolbar button | What it does |
|----------------|--------------|
| **Show Roadmap** | Re-lay the tree into the derived cross-weave roadmap (one Roadmap band + History). See [§3.1](#31-the-roadmap-view). |
| **New Weave** | Create a new project area. |
| **Set Grouping** | Group the tree by type / thread / status / release. |
| **Filter by status** / **Filter by text** | Narrow what's shown. |
| **Toggle Archived** | Show or hide archived items. |
| **Sync Doc → Tree** | When on, selecting a file in the editor highlights it in the tree. |
| **Refresh** | Re-read state. |

### 3.1 The Roadmap view

**Show Roadmap** swaps the weave tree for the **derived cross-weave roadmap** — computed from the documents, never a hand-maintained list. Two bands:

- **Roadmap** — present *and* future threads (active, implementing, pending, blocked) in one dependency-then-`priority` order. Each row shows its status, and a blocked thread shows **what it's blocked on** — including a thread in *another weave*, the one fact you can't eyeball by hand. Because it's a single ordered list, you reorder the whole forward backlog as one — e.g. placing a pending thread that an active thread is waiting on right next to it.
- **History** — shipped plans, newest first. A **Group History by Thread** toggle (roadmap-mode only) groups them under their thread.

In roadmap mode the status filter folds to **all / roadmap / history**, and you can **drag any Roadmap thread to reorder it** — that writes its soft `priority`. A drag that would place a thread before one it depends on is refused: the hard dependency graph always wins; `priority` only orders the slack it leaves free.

> Each thread needs a `thread.md` manifest (`th_` ULID + `priority` + `depends_on`) to appear. New threads get one automatically; for a project created before this feature, run `loom migrate` once to backfill them (the roadmap also flags any that are missing).

### Context view

Shows exactly which documents will be fed to the AI for the selected node, updating as you click around. Covered in depth in [§5](#5-the-context-panel).

---

## 4. Driving the workflow with buttons

Select a node in the Threads view; its available actions appear as inline icons and in the right-click menu. The buttons map onto the workflow loop:

| Node | Action | What it does |
|------|--------|--------------|
| Weave | **New Weave / Weave Thread** | Create a project area or a workstream inside it. |
| Thread | **Weave Idea / Design / Plan**, **Weave Chat** | Create the doc shell of each type. |
| Thread | **Generate Requirements** | Extract the explicit include / exclude / constraints from the thread's chat into a draft `req` doc. |
| Chat | **AI Reply** | The AI replies *inside* the chat doc with full thread context loaded. |
| Chat | **Promote to Idea / Design / Plan** | Turn the conversation into a formal doc in one click. |
| Req (draft) | **Refine Requirements** | Re-extract from the chat (or open it for manual curation); bumps the version. |
| Req (draft) | **Finalize (Lock) Requirements** | Lock the scope spec 🔒 — from here it auto-loads into every action in the thread. |
| Req / Thread | **Verify Plan Against Requirements** | Check the plan covers every *Included* item and violates no *Excluded* one — structural check plus an AI semantic pass; findings go to the *Loom Req Verify* output. |
| Idea | **Refine Idea** | AI fleshes out / updates the idea. |
| Idea | **Generate Design (AI)** | Produce a design doc from the idea. |
| Design | **Refine Design** | Re-run after the idea changed. |
| Design | **Generate Plan (AI)** | Produce a numbered plan from the design. |
| Plan (draft) | **Start Plan** | Move the plan to `implementing`. |
| Plan (implementing) | **Do Step(s)** | AI implements the next pending step, writes a done note, marks it ✅, then stops for your `go`. |
| Plan (implementing) | **Complete Step** | Manually mark a step done. |
| Plan | **Refine Plan** | Re-run after the design changed. |
| Plan | **Close Plan** | Finish the plan; emit the `done` record. |
| ctx section | **Refresh Context** | Regenerate the weave/global ctx summary. |
| refs section | **Create Reference** | Add a new reference doc. |
| idea/design/plan | **Add References…** | Add `requires_load` citations to this doc. |

> **There is no "Generate Idea" button.** You start an idea with **Weave Idea** (creates the shell) and **Refine Idea** to have the AI fill it in — or **Promote to Idea** straight from a chat.

> **Requirements are optional but powerful.** *Generate Requirements* → curate the draft → *Finalize (Lock)* gives the thread a scope spec that auto-loads into every later action and that the planner cites step-by-step. Lock it *before* generating the design and plan to get the full benefit. Concept and lifecycle: [loom-requirements-reference](../loom/refs/loom-requirements-reference.md).

**The stop rhythm applies here too:** *Do Step* implements one step and waits. Watch the **Loom AI** terminal, approve with `go`, or authorize a range in your prompt.

> **Full command list:** every extension command and its menu placement is catalogued in [vscode-commands-reference](../loom/refs/vscode-commands-reference.md).

---

## 5. The CONTEXT panel

The **Context** view is your window into the context pipeline: it shows every document that *would* be loaded for the selected node, **before** you launch anything. What you see here is what the AI gets — by construction.

### Reading the rows

Each row is one document, with a symbol showing why it's there:

| Symbol | Meaning |
|--------|---------|
| ✓ | Auto-included (ctx, parent chain, or an `always` reference that matches the current mode). |
| 📌 | You pinned it in (a manual include). |
| 🚫 | You excluded it. |
| ⊘ | You (or a filter) excluded it, but another doc's `requires_load` pulls it in anyway — the tooltip names which doc requires it. |
| 🔒 | Marked `load: always` — locked on; you can still force it off, with a warning. |
| ⚠ | Stale — flagged but still shown. |
| ❌ | Missing — a `requires_load` target that doesn't exist. |

Each row also shows a **token estimate**, and the panel shows a running total — so you can see how heavy a launch will be before you click.

### Acting on a row

- **Click a row** → opens that document in the editor.
- **Exclude from context** (✓ → 🚫) → drop a doc from the next launch.
- **Include in context** (🚫/available → 📌) → force a doc in.
- **Reset to auto** → drop your override and return the doc to its automatic state.
- Excluding a 🔒 `load: always` reference prompts a confirmation first.

### Persistence

Your include/exclude choices are saved per target in **`.loom/context-prefs.json`** and reused on every future launch for that doc — until you reset them. There's no "just this once" mode; reset is the undo. Because the panel, the prompt, and the saved overrides all read the same source, they can't disagree.

---

## 6. Settings

Settings are under `reslava-loom.` in VS Code settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `reslava-loom.user.name` | — | Your display name in chat/doc headers (e.g. `Rafa`). |
| `reslava-loom.ai.provider` | `anthropic` | Provider for the API-key path (`anthropic` / `deepseek` / `openai`). |
| `reslava-loom.ai.apiKey` | — | API key for the fallback path. Not needed if Claude Code CLI is installed. |
| `reslava-loom.ai.model` | — | Model override; blank uses the provider default. |
| `reslava-loom.ai.baseUrl` | — | Base URL override for OpenAI-compatible endpoints. |

> The API key is only used by the fallback path. With Claude Code on your PATH, you can leave it blank.

---

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Tree says "No Loom workspace found" | Run `loom install` in the project root, then **Refresh**. |
| An AI button does nothing / errors | Check `claude` is on your PATH, *or* set an API key in settings. Then run **Reconnect MCP**. |
| CONTEXT panel is empty | Select a chat / plan / design node — the panel follows the selected node. |
| "Couldn't open …" when clicking a context row | The doc id didn't resolve — usually a missing or renamed file; check it still exists. |
| A doc you expected isn't loading | Open the CONTEXT panel: it shows whether the doc was filtered (mode/`load_when`), excluded, or simply not cited. Adjust with a toggle or `requires_load`. |
| Changes not reflected | **Refresh** the tree, or **Reconnect MCP** if the server seems out of sync. |
