# Loom — AI-assisted workflow for VS Code

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

## The panel

The Loom panel (Activity Bar) shows your **weaves** (project areas) and **threads** (workstreams). Each thread holds its own idea, design, plans, and chats.

Right-click any node for context actions: new idea, new design, new plan, new chat, refine, promote, archive.

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `reslava-loom.user.name` | `User` | Your display name in chat headers |

AI inference runs through the MCP server's sampling — configure your API key in your MCP host (Claude Code, Cursor), not in VS Code settings.

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
