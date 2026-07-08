# Loom — AI-assisted workflow for VS Code

**Document-native workflow for AI-assisted development.**

> 🎬 **Workflow demo** — `chat → idea → design → plan → do-step → done`, with the document graph building node-by-node in the sidebar.

![Loom workflow demo](https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/loom-demo-workflow.gif)

Loom turns your project into a structured collaboration surface between you and AI. Instead of a chat window that forgets everything, you get a document-driven loop:

**chat → idea → design → req → plan → implement → done**

Every stage is a Markdown document. The AI reads them, writes to them, and tracks progress through them — across sessions, without losing context.

🔗 **Get Loom:** [GitHub repo](https://github.com/reslava/loom) · [CLI on npm](https://www.npmjs.com/package/@reslava/loom) · [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=reslava.loom-vscode) · [Open vsx](https://open-vsx.org/extension/reslava/loom-vscode)

📚 **Guides:** [Core concepts & workflow](https://github.com/reslava/loom/blob/main/docs/USER_GUIDE.md) · [Extension User Guide](https://github.com/reslava/loom/blob/main/docs/EXTENSION_USER_GUIDE.md) · [CLI / Claude Code Guide](https://github.com/reslava/loom/blob/main/docs/CLI_USER_GUIDE.md)

> 💬 **Feedback appreciated.** Using Loom? Tell me how it's going — I'm always looking for ways to improve it. I'd like to know what worked and what got in the way. Click the **Feedback** button in the status bar or run `loom feedback`; it opens a prefilled GitHub issue you edit before sending. Opt-in, nothing sent automatically.

---

## Why Loom

Loom started as a hand-built habit: while developing the .NET library [REslava.Result](https://github.com/reslava/nuget-package-reslava-result), I got tired of ephemeral AI chats that forgot every decision between sessions, so I began keeping ideas, designs, plans, and requirements as persistent Markdown — grouped by feature, so the AI always had the right context. Loom automates that.

```
Traditional AI chat:          Loom:
  knowledge drifts & dies       knowledge becomes artifacts
                                artifacts become context
                                context drives implementation
```

**The part that matters most isn't the loop — it's how Loom decides what the AI sees.** A graph of typed docs, scope-loaded `ctx` summaries, reference docs with conditional `requires_load` / `load_when`, locked **requirements** (include / exclude / constrain), and a **Context panel** that shows the exact bundle *before* you launch. The AI's memory is structural, not conversational. → [How context works](https://github.com/reslava/loom/blob/main/docs/USER_GUIDE.md#4-giving-the-ai-the-right-context)

---

## Install — one click, no CLI

1. **Install this extension** from the VS Code Marketplace (search `Loom AI`, publisher `reslava`).
2. Open a folder and click **Initialize Loom** in the Loom panel.

That's it. The Loom engine is **bundled inside the extension** and runs on VS Code's own runtime — no `npm install`, no global `loom` command, no Node to set up. Initializing creates `.loom/` (config + the `CLAUDE.md` AI session contract), `loom/` (your doc workspace), and `.mcp.json` (so an AI agent can drive Loom too).

**1-click, always-current, zero-config.** The AI agent Loom launches runs the *same bundled engine* as the extension — never a separate global `loom` that could drift — so your agent is always the version you installed. And when you update the extension, your session rules and config refresh themselves on the next open. Nothing to re-run, nothing to keep in sync.

📚 **New here?** → [Getting Started](https://github.com/reslava/loom/blob/main/loom/refs/getting-started-reference.md) — install to your first idea in five minutes.

---

## Three ways to run Loom

Loom is one engine with three delivery surfaces. Pick the one that fits — you don't need all three.

| Surface | Who it's for | Setup |
|---------|--------------|-------|
| **VS Code extension** | You, working in VS Code | Install the extension — **1 click, no CLI** |
| **AI agent (MCP)** | Claude Code, Cursor, Continue, any MCP host | `loom install` writes `.mcp.json` (pinned `npx`) — no global install |
| **CLI** | Terminal, scripting, CI | `npx @reslava/loom …` (pinned; global `npm i -g` optional) |

The extension is the recommended default; the CLI/MCP path serves agents and hosts the extension can't reach. → [Architecture: delivery surfaces](https://github.com/reslava/loom/blob/main/loom/refs/architecture-reference.md#delivery-surfaces--audiences)

---

## Connect an AI agent

Want a coding agent (Claude Code, Cursor, …) to drive Loom directly? `loom install` (or the extension's **Initialize**) already wrote `.mcp.json` to your project root, using a pinned `npx` command so the agent needs **no global install**:

```json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@reslava/loom@<version>", "mcp"],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

The agent then has access to all Loom tools (`loom_create_idea`, `loom_do_step`, `loom_complete_step`, etc.) and resources (`loom://context/...`).

---

## The loop

1. **Chat** — open a chat doc, think out loud with the AI (*AI Reply*).
2. **Idea** — create one with *Weave Idea* and flesh it out with *Refine Idea*, or *Promote* a chat straight to an idea.
3. **Design** — click *Generate Design* to define how to build it.
4. **Plan** — click *Generate Plan* to get a concrete step-by-step implementation list.
5. **Implement** — click *Do Step* to have the AI implement the next step, record what was done, and mark it complete.

Each stage produces a Markdown document visible in the Loom panel. Nothing disappears between sessions.

---

## The LOOM panel

The **Loom** Activity Bar icon opens the Loom sidebar, which contains two views: **Threads** and **Context**.

### Threads view

Shows your **weaves** (project areas) → **threads** (workstreams) → docs (idea, design, plans, chats, done docs). Buttons appear inline on a node and in its right-click menu, grouped by what they do.

A **Show Roadmap** toolbar toggle re-lays this view into the derived cross-weave roadmap — one **Roadmap** band (present + future threads in a single dependency-then-priority order, each row showing its status and, when blocked, what it's blocked on) and **History** (shipped plans). In roadmap mode the status filter folds to *all / roadmap / history*, the History band can group by thread, and drag-to-reorder spans the whole Roadmap list, writing soft `priority` (never overriding a hard dependency). It's all computed from the documents — no roadmap list to maintain.

<table>
<tr>
<td width="50%" valign="top"><a href="https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/screenshots/loom/loom-rdd.png"><img src="https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/screenshots/loom/loom-rdd.png" alt="Loom Threads + Context view" width="100%" /></a></td>
<td width="50%" valign="top"><a href="https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/screenshots/loom/loom-roadmap.png"><img src="https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/screenshots/loom/loom-roadmap.png" alt="Loom Roadmap view" width="100%" /></a></td>
</tr>
<tr>
<td valign="top"><b>Threads + Context</b> — every weave → thread → doc (chat, idea, design, plan, req, reference, done) in one graph, each node carrying its <i>derived</i> state: reqs marked <code>🔒 locked · ✅ covered</code>, plan step counts (<code>3/3 · done</code>), and staleness ⚠. The <b>CONTEXT</b> panel shows the exact docs — and their token cost — the AI will receive for the selected node, <i>before</i> you launch.</td>
<td valign="top"><b>Roadmap</b> — the same graph re-laid as the derived roadmap: present + future threads in one dependency-then-priority order (status, soft priority <code>p20</code>, and what each is blocked on), over a <b>History</b> band grouped by shipped version with date and thread.</td>
</tr>
</table>

<sub>Click either image to view full size.</sub>

**AI actions** (run the agent):

| Button | What it does |
|--------|-------------|
| *Generate Design (AI)* | Turn an idea into an architecture + decisions doc |
| *Generate Plan (AI)* | Break a design into numbered, reviewable implementation steps |
| *Do Step(s)* | AI implements the next pending step; marks it ✅ and writes a done note |
| *AI Reply* | Continue the conversation inside a chat doc with full thread context loaded |
| *Refine Idea / Design / Plan* | Re-run generation on a stale doc after its parent was updated |
| *Refresh Context* | Regenerate the `ctx.md` summary for a weave |

**Create & promote** (structure, no AI):

| Button | What it does |
|--------|-------------|
| *Weave Idea / Design / Plan* | Create an idea, design, or plan doc on a thread |
| *Weave Chat* | Start a new chat doc on a thread |
| *Promote to Idea / Design / Plan / Reference* | Turn a chat or doc into the next doc type in one click |
| *Create Reference* / *Add References…* | Add a `loom/refs/` doc, or wire one into a doc's `requires_load` |

**Manage** (state & tree):

| Button | What it does |
|--------|-------------|
| *Start Plan* / *Close Plan* | Move a plan to `implementing` / finish it |
| *Complete Step* | Mark the current step ✅ without running the AI |
| *Mark Done* / *Mark Active* | Flip a doc's status |
| *Rename* / *Archive* / *Delete* | Inline doc management from the tree |
| *Validate* | Check a weave for broken links and stale docs |

Right-click any node for the same actions as a context menu.

### Context view

Shows every document that *would* be loaded into the AI's context for the selected node — **before** you launch anything. Updates as you click around. What you see here is what the AI gets.

Each row is one doc, marked by why it's there:

| Symbol | Meaning |
|--------|---------|
| ✓ | Auto-included (ctx, parent chain, or a matching `always` reference) |
| 📌 | You pinned it in |
| 🚫 | You excluded it |
| ⊘ | Excluded but pulled back in by another doc's `requires_load` |
| 🔒 | `load: always` — locked on (force-off prompts a warning) |
| ⚠ / ❌ | Stale / missing |

Click a row to **open the doc**. Use the inline actions to **include / exclude / reset**; choices persist per target in `.loom/context-prefs.json`. Per-doc and total token estimates let you keep launches lean.

### Send feedback

A **Feedback** button in the status bar (and the `Loom: Send Feedback` command) opens a prefilled GitHub issue carrying only Loom version, OS, and non-PII usage counts (weaves / threads / done plans / current release) — opt-in, editable before you send, nothing sent automatically.

### Usage telemetry (opt-in, off by default)

Separately from feedback, Loom can send **anonymous, content-free** usage telemetry so we can see whether the workflow loop is used and where people stall. It is **off by default**; on first activation Loom asks once, and sends nothing unless you choose *Enable*.

- **Turn on/off:** click the **Telemetry: On/Off** item in the status bar (one click — first enable confirms what's sent), or toggle the `reslava-loom.telemetry.enabled` setting. Either is the kill switch.
- **Sent only when on:** a random install id, Loom version, OS, `is_ci`, the surface (`extension`), and fixed workflow events (`workspace_activated`, `session_started`, `doc_generated`/`doc_refined` with the doc *type*, `plan_started`, `step_completed`, `plan_done`, `command_invoked`, `error`).
- **Never sent:** document content, titles, slugs, paths, weave/thread names, or any PII. Events go to PostHog (EU).

---

## A real project in Loom

[ChordFlow](https://github.com/reslava/chord-flow) — a Rhythm & Progression Trainer for guitar — is built with Loom from outside this extension's own repo: the same panel, driving an unrelated app.

<table>
<tr>
<td width="50%" valign="top"><a href="https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/screenshots/chord-flow/chord-flow-caged-chords-implementing.png"><img src="https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/screenshots/chord-flow/chord-flow-caged-chords-implementing.png" alt="ChordFlow Threads + Context view" width="100%" /></a></td>
<td width="50%" valign="top"><a href="https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/screenshots/chord-flow/chord-flow-roadmap.png"><img src="https://raw.githubusercontent.com/reslava/loom/main/packages/vscode/media/screenshots/chord-flow/chord-flow-roadmap.png" alt="ChordFlow Roadmap view" width="100%" /></a></td>
</tr>
<tr>
<td valign="top"><b>Threads + Context</b> — ChordFlow's music-domain weaves (CAGED system, interval lattice, octave shapes), a plan mid-implementation, and a diagnostics banner: <code>1 stale · 3 plan steps blocked · 11 req coverage gaps</code>.</td>
<td valign="top"><b>Roadmap</b> — ChordFlow's derived roadmap and shipped-version history, computed from its own documents.</td>
</tr>
</table>

<sub>Click either image to view full size.</sub>

---

## AI setup

Every AI button picks its path automatically:

**1. Claude Code CLI (default)**

If `claude` is on your PATH, buttons open a persistent **Loom AI** terminal and run `claude "<prompt>"`. Claude reads your Loom docs, calls the right MCP tools, and writes the result back. No API key needed — works with a Claude Pro subscription.

```bash
# Install Claude Code CLI (free with Claude Pro)
npm install -g @anthropic-ai/claude-code
```

**2. API key / sampling (fallback)**

If Claude Code CLI is not installed, the extension calls the AI provider directly via its configured API key. Set in VS Code settings:

```
reslava-loom.ai.apiKey  → your Anthropic / OpenAI / DeepSeek key
reslava-loom.ai.provider → anthropic | openai | deepseek
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `reslava-loom.user.name` | `User` | Your display name in chat headers |
| `reslava-loom.ai.provider` | `anthropic` | AI provider for API key path (anthropic/deepseek/openai) |
| `reslava-loom.ai.apiKey` | — | API key (fallback — not needed if Claude Code CLI is installed) |
| `reslava-loom.ai.model` | — | Model override (blank = provider default) |
| `reslava-loom.telemetry.enabled` | `false` | Opt in to anonymous, content-free usage telemetry (never documents/titles/paths/PII). Off by default; this is also the kill switch |

---

## Requirements

- VS Code 1.85+ — the extension is self-contained (bundled server; no separate CLI or Node install)
- For AI actions: [Claude Code](https://docs.anthropic.com/claude-code) (recommended — no API key) *or* an API key in settings

---

## Documentation

- [User Guide](https://github.com/reslava/loom/blob/main/docs/USER_GUIDE.md) — concepts, the workflow loop, and how context works
- [Extension User Guide](https://github.com/reslava/loom/blob/main/docs/EXTENSION_USER_GUIDE.md) — the panel, buttons, and CONTEXT view
- [CLI / Claude Code Guide](https://github.com/reslava/loom/blob/main/docs/CLI_USER_GUIDE.md) — driving Loom from the terminal
- [Getting Started](https://github.com/reslava/loom/blob/main/loom/refs/getting-started-reference.md) — install to first idea in five minutes
- [How Loom works](https://github.com/reslava/loom/blob/main/loom/refs/vision-reference.md) — the chat → design → req → plan → implement loop
- [Architecture](https://github.com/reslava/loom/blob/main/loom/refs/architecture-reference.md) — MCP surface, doc types, frontmatter
- [Staleness Model](https://github.com/reslava/loom/blob/main/loom/refs/staleness-reference.md) — how the tree's staleness ⚠ is decided (one directional, version-based rule)

---

## License

MIT
