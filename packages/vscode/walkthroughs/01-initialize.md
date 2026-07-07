# Initialize Loom — one click, no CLI

Loom's engine is **bundled inside this extension**. There's nothing to `npm install`, no global `loom` command, and no Node to set up — the extension runs its own server on VS Code's built-in runtime.

Clicking **Initialize Loom** creates, in this folder:

- `.loom/` — configuration and the AI session contract (`CLAUDE.md`)
- `.mcp.json` — so an AI agent (Claude Code, Cursor, …) can drive Loom too
- `loom/` — your document workspace (weaves, threads, ideas, designs, plans)

It's idempotent and safe to re-run — it only fills in what's missing.

> Prefer the terminal, or driving Loom from Cursor / CI? The `@reslava/loom` CLI is a separate install (`npm i -g @reslava/loom`) — you don't need it for the extension.
