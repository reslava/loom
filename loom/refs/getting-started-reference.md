---
type: reference
id: getting-started
title: "loom — Getting Started"
status: active
created: 2026-05-14
version: 1
tags: [onboarding, getting-started, tutorial, public]
parent_id: null
requires_load: []
slug: getting-started
load: by-request
---

# loom — Getting Started

One-page guide: from zero to your first AI-generated idea in five minutes.

---

## 1. Install

```bash
npm install -g @reslava/loom
```

Then install the VS Code extension: search **`reslava.loom`** in the Extensions panel.

---

## 2. Initialize Loom in your project

Open your project folder in VS Code and run:

```bash
loom install
```

This creates:
- `.loom/` — config, hooks, AI session contract (`CLAUDE.md`)
- `loom/` — your document workspace (weaves, threads, chats, plans)
- `.mcp.json` — MCP server config so your AI agent can reach Loom tools

---

## 3. Connect your AI agent

Loom works best with **Claude Code** (or any MCP-capable agent).

Open Claude Code in the project root. On first launch it will prompt you to approve the `loom` MCP server — approve it. Verify with:

```
claude mcp list
```

You should see `loom` listed as connected.

---

## 4. Write your first chat

In VS Code, open the Loom panel (Activity Bar). Click **New Weave** and give it a name (e.g. `my-feature`).

Inside the new weave, click **New Chat**. A chat doc opens. Type your first thought:

```
## User:

I want to build a user authentication system with email/password login and JWT tokens.
```

Save the file.

---

## 5. Generate your first idea

Back in the Loom panel, right-click the chat doc and choose **Generate Idea**. Loom sends the chat to your AI agent, which writes a structured `*-idea.md` doc capturing the concept, goals, and success criteria.

Review the idea doc. When it looks right, click **Finalize** to promote it from `draft` to `active`.

---

## 6. Continue the loop

From an active idea you can:

- **Generate Design** — architecture, components, decisions
- **Generate Plan** — concrete implementation steps table
- **Do Step** — AI implements the next pending step, records what was done

Each stage produces a Markdown doc you can read, edit, and track. Nothing disappears between sessions — the AI rereads the docs at the start of each turn.

---

## What's next

- Read `loom/ctx.md` in your project — it's the global context the AI loads at session start. Customize it to describe your project.
- Use `loom://thread-context/{weave}/{thread}` in Claude Code to load full thread context before working.
- The `do-next-step` MCP prompt is the primary workflow driver once you have an active plan.
