# <img src="packages/vscode/media/loom.png" alt="Loom" width="64" /> Loom

**Your AI coding agent forgets everything every session. Loom is the memory it doesn't have.**

Docs are the database. Your AI reads them, plans in them, and picks up exactly where it left
off — across a fresh session, with your project's full context. No re-explaining.

![Loom workflow demo](packages/vscode/media/loom-demo-workflow.gif)

🔗 **Get Loom:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=reslava.loom-vscode) · [Open VSX](https://open-vsx.org/extension/reslava/loom-vscode) · [CLI on npm](https://www.npmjs.com/package/@reslava/loom) · [GitHub](https://github.com/reslava/loom)

📚 **Guides:** [Which way is for you?](./docs/WAYS-TO-USE-LOOM.md) · [Core concepts](./docs/USER_GUIDE.md) · [VS Code Extension](./docs/EXTENSION_USER_GUIDE.md) · [CLI / Claude Code](./docs/CLI_USER_GUIDE.md)

---

## The problem

Every AI coding tool has the same flaw: **context is a growing garbage bag.** One long session
piles up old decisions, dead ends, and half-finished threads — and the model degrades as it
reasons over all of it at once.

- **Session 1 is the best session.** By session 10 the AI has forgotten sessions 2–9.
- **Re-explaining context every morning is expensive** — and letting the AI contradict a
  decision you made last week is worse.
- There's no structure beneath the chat — just a window that grows forever with no memory of
  what was decided, or why.

The cause isn't model quality. It's that there's no workflow underneath.

## What Loom does

Loom replaces the chat window with a **document graph that _is_ the workflow.** Every idea,
design, plan, and done-note is a typed, linked Markdown file. The AI reads exactly the right
slice for the task in front of it — nothing more, nothing less.

- **A session is a document graph, not a chat log.** Ideas → designs → plans with steps, all in
  Markdown, versioned in git. State is derived from the files; nothing lives only in the model's head.
- **The AI resumes mid-plan.** Close the terminal, come back tomorrow, ask for the next step — it
  rereads the plan and continues with full context. No re-explaining what you're building.
- **Specs propagate.** Change a design and its plans are flagged stale; ask the AI to *refine* and
  the change flows downstream. Context can't silently drift.
- **Works with the agent you already use.** A VS Code extension for the visual flow — and it runs
  headless as a CLI and an MCP server for Claude Code, Cursor, or any MCP-capable agent.

## See it

<table>
<tr>
<td width="50%" valign="top"><a href="packages/vscode/media/screenshots/loom/loom-rdd.png"><img src="packages/vscode/media/screenshots/loom/loom-rdd.png" alt="Loom Threads + Context view" width="100%" /></a></td>
<td width="50%" valign="top"><a href="packages/vscode/media/screenshots/loom/loom-roadmap.png"><img src="packages/vscode/media/screenshots/loom/loom-roadmap.png" alt="Loom Roadmap view" width="100%" /></a></td>
</tr>
<tr>
<td valign="top"><b>Threads + Context</b> — your project as one graph: weave → thread → doc, each node carrying its <i>derived</i> state (locked reqs, step counts, staleness ⚠). The <b>Context</b> panel shows the exact docs — and their token cost — the AI will receive for the selected node, <i>before</i> you launch anything.</td>
<td valign="top"><b>Roadmap</b> — the same graph re-laid as a derived roadmap: present + future threads in dependency-then-priority order, over a history of shipped versions. No list to maintain — it's computed from the documents.</td>
</tr>
</table>

<sub>Click either image to view full size.</sub>

## Quick start

**In VS Code (recommended — 1 click, no CLI, no Node):**

1. Install **Loom AI** from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=reslava.loom-vscode) and click **Initialize Loom**.
2. Create a thread and a chat, and type what you want to build.
3. Click **AI Reply** to think it through, then **Generate Design** → **Generate Plan**.
4. Click **Do Step** — the AI implements the next step, writes a done-note, and marks it ✅.

**From the terminal — a persisted Claude Code session + Loom "slang":**

```bash
npx @reslava/loom install                       # scaffold loom/ + .mcp.json into your repo
loom create thread ui dark-mode --title "Dark Mode"
loom create chat ui dark-mode                   # a chat doc to think in
```

Now the distinctive part. Open the project in Claude Code and drive it with short **Loom slang** —
each word maps to one action, and the AI writes every reply *back into the doc*, never into a
terminal that scrolls away:

- Describe the dark-mode feature in `chat-001.md` and ask for a design and plan, then say
  **`reply ui/dark-mode/chat-001.md`** → the AI answers *inside the chat* with the full thread
  loaded, and drafts the design + plan docs.
- When the plan looks right, say **`do plan`** → the AI implements each step, marks it ✅, and
  writes a done-note — pausing for your `go` between steps.

Close the terminal, come back tomorrow: the next session rereads the plan and picks up exactly
where you stopped.

→ Full walkthrough: **[install to your first idea in five minutes](./loom/refs/getting-started-reference.md)**.

## Reports — query the *why*, not just the code

Any tool with an LLM can summarize a codebase. What a codebase-only tool *can't* do is tell you
**why** — which alternatives were weighed, why one won, where the code drifted from the design —
because that reasoning was never in the code. It's in your chats, designs, and done-notes. Loom
reads *those*.

```bash
loom report project-overview        # orient a newcomer, from the roadmap
loom report decisions --weave auth  # the "why" behind a weave's choices
loom report release-notes           # draft the next changelog, from the unreleased done plans
```

Each report is a versioned doc, and **every claim cites the source it came from**. → **[Reports reference](./loom/refs/reports-reference.md)**.

## Proven on real projects

Loom is **built using Loom** — every feature in this repo went through its own loop (chat → idea →
design → req → plan → done), living in the `loom/` graph next to the code it describes. It's also
driving [**ChordFlow**](https://github.com/reslava/chord-flow), a separate, unrelated app whose
entire music domain was designed in Loom chats before any code was written — the first real test
that the workflow holds up outside this repo.

## Learn more

| Guide | What's inside |
|-------|---------------|
| [Which way is for you?](./docs/WAYS-TO-USE-LOOM.md) | The four ways to run Loom (Guided · Power terminal · Pure agent · Automation) and how to pick |
| [User Guide](./docs/USER_GUIDE.md) | Concepts, the workflow loop, and **how Loom decides what the AI sees** — the part that matters most |
| [Extension User Guide](./docs/EXTENSION_USER_GUIDE.md) | The VS Code panel, buttons, and Context view |
| [CLI / Claude Code Guide](./docs/CLI_USER_GUIDE.md) | Driving Loom from the terminal via an MCP agent |
| [Architecture](./docs/ARCHITECTURE.md) · [AI Integration](./docs/AI_INTEGRATION.md) | How the layered system fits together, and how an agent plugs in via MCP |
| [All reference docs](./loom/refs/) | The deep material: context pipeline, requirements model, staleness, MCP surface, command lists |

> 💬 **Using Loom? I'd love to know how it's going.** Click **Feedback** in the status bar or run
> `loom feedback` — it opens a prefilled GitHub issue you edit before sending. Opt-in, nothing sent
> automatically.

---

## License

MIT © 2026 Rafa Eslava
