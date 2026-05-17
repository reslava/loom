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

The agent then has access to all Loom tools (`loom_create_idea`, `loom_do_step`, `loom_complete_step`, etc.) and resources (`loom://thread-context/...`).

---

## The loop

1. **Chat** — open a chat doc, think out loud with the AI.
2. **Idea** — click *Generate Idea* to formalize what you want to build.
3. **Design** — click *Generate Design* to define how to build it.
4. **Plan** — click *Generate Plan* to get a concrete step-by-step implementation list.
5. **Implement** — click *Do Step* to have the AI implement the next step, record what was done, and mark it complete.

Each stage produces a Markdown document visible in the Loom panel. Nothing disappears between sessions.

---

## The CONTEXT panel

The CONTEXT panel (Activity Bar) shows your **weaves** (project areas) and **threads** (workstreams). Each thread holds its own idea, design, plans, chats, and done docs.

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

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `reslava-loom.user.name` | `User` | Your display name in chat headers |
| `reslava-loom.ai.provider` | `anthropic` | AI provider (anthropic/deepseek/openai) |
| `reslava-loom.ai.apiKey` | — | API key for the configured provider |
| `reslava-loom.ai.model` | — | Model override (blank = provider default) |

**AI configuration:** The extension defaults to Claude (Anthropic). For Claude, set `reslava-loom.ai.apiKey` to your Anthropic API key. You can also use OpenAI or DeepSeek by changing `reslava-loom.ai.provider`.

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
