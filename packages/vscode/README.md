# Loom — AI-assisted workflow for VS Code

<img src="media/loom.png" alt="Loom" width="80" />

> Demo GIF coming — see `media/loom-demo.gif` once recorded.

Loom turns your project into a structured collaboration surface between you and AI. Instead of a chat window that forgets everything, you get a document-driven loop:

**chat → idea → design → plan → implement → done**

Every stage is a Markdown document. The AI reads them, writes to them, and tracks progress through them — across sessions, without losing context.

---

## Install

**1. Install the CLI** (required — the extension talks to it):

```bash
npm install -g @reslava/loom
```

**2. Install the extension** from the VS Code marketplace: search `reslava.loom`.

**3. Initialize Loom in your project**:

```bash
loom install
```

This creates `.loom/` (config), `loom/` (your doc workspace), and a `CLAUDE.md` that wires up the AI session contract.

---

## Connect an AI agent

Loom works best with an MCP-capable AI agent (Claude Code, Cursor). Add `.mcp.json` to your project root:

```json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "loom",
      "args": ["mcp"],
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

| Weave→ | Thread→ | Chat→ | Idea→ | Design→ | Plan→ | Done |
|---|---|---|---|---|---|---|
|<img src="media/icons/weave-implementing.svg" alt="Loom" width="32" />|<img src="media/icons/thread-implementing.svg" alt="Loom" width="32" />|<img src="media/icons/chat.svg" alt="Loom" width="32" />|<img src="media/icons/idea.svg" alt="Loom" width="32" />|<img src="media/icons/design.svg" alt="Loom" width="32" />|<img src="media/icons/plan-implementing.svg" alt="Loom" width="32" />|<img src="media/icons/status-done.svg" alt="Loom" width="32" />|

1. **Chat** — open a chat doc, think out loud with the AI.
2. **Idea** — click *Generate Idea* to formalize what you want to build.
3. **Design** — click *Generate Design* to define how to build it.
4. **Plan** — click *Generate Plan* to get a concrete step-by-step implementation list.
5. **Implement** — click *Do Step* to have the AI implement the next step, record what was done, and mark it complete.

Each stage produces a Markdown document visible in the Loom panel. Nothing disappears between sessions.

---

## The LOOM panel

The **Loom** Activity Bar icon opens the Loom sidebar, which contains two views: **Threads** and **Context**.

### Threads view

Shows your **weaves** (project areas) → **threads** (workstreams) → docs (idea, design, plans, chats, done docs). Toolbar buttons act on the selected node.

| Button | What it does |
|--------|-------------|
| *Generate Idea* | Formalise a chat or prompt into a scoped idea doc |
| *Generate Design* | Turn an idea into an architecture + decisions doc |
| *Generate Plan* | Break a design into numbered, reviewable implementation steps |
| *Do Step* | AI implements the next pending step; marks it ✅ and writes a done note |
| *AI Reply* | Continue the conversation inside a chat doc with full thread context loaded |
| *Generate Ctx* | Regenerate the ctx summary for a weave or thread |
| *Refine* | Re-run generation on a stale doc after its parent was updated |
| *Promote* | chat → idea → design → plan in one click |
| *Start Plan* | Move a plan from `draft` to `implementing` |
| *Rename / Archive* | Inline doc management from the tree |

Right-click any node for the same actions as a context menu.

### Context view

Shows which documents will be loaded into the AI's context window for the selected thread. Updates automatically when you click a different tree node.

| Section | What it contains |
|---------|-----------------|
| **Pinned** | Docs always loaded for this thread: idea + design + active plan + ctx summaries. Shown with a green ✓ and token count. Click to toggle off. |
| **Opt-in** | Optional docs: chats, reference docs. Shown with an empty circle. Click to toggle on. |
| **Total** | Estimated token count for all currently loaded docs. |

The token counts let you see exactly how much context the AI will receive before clicking a button — useful for keeping sessions lean by toggling off opt-in docs you don't need.

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

---

## Requirements

- VS Code 1.85+
- Node.js 18+
- `@reslava/loom` CLI installed globally

---

## Documentation

- [Getting Started](https://github.com/reslava/loom/blob/main/loom/refs/getting-started.md) — install to first idea in five minutes
- [How Loom works](https://github.com/reslava/loom/blob/main/loom/refs/vision-reference.md) — the chat → design → plan → implement loop
- [Architecture](https://github.com/reslava/loom/blob/main/loom/refs/architecture-reference.md) — MCP surface, doc types, frontmatter

---

## License

MIT
