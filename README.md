# <img src="packages/vscode/media/loom.png" alt="Loom" width="64" /> Loom

**Document-native workflow for AI-assisted development.**

Loom gives AI agents structured, scoped, persistent context — so every session is as sharp
as the first, and every decision is traceable.

> *"The workflow of serious projects needs to be organised and persistent: ideas, designs,
> plans, reference material, appropriate context. Documents represent the state of the project —
> fresh, defined and auditable — as opposed to an ever-expanding, opaque and degraded chat history."*
> — Rafa Eslava

| Context | Reference |
|---|---|
|<img src="packages/vscode/media/icons/ctx.svg" alt="Loom" width="32" />|<img src="packages/vscode/media/icons/reference.svg" alt="Loom" width="32" />|

---

## The Problem

AI is capable of nothing unless directed by someone competent, with knowledge. And the current
interface of AI-assisted development makes that direction almost impossible to sustain.

Every AI coding tool has the same structural flaw: **context is a shared garbage bag**. One long
session accumulates everything — old decisions, abandoned paths, half-finished discussions — and
the model degrades as it tries to reason over all of it simultaneously. You either hit the context
limit and lose history, or keep a bloated context and pay with quality.

- Session 1 is the best session. By session 10 the AI has forgotten sessions 2–9.
- Re-explaining context every session is expensive. Letting the AI make suggestions that contradict
  earlier decisions is damaging.
- There's no guidance, no structure, no persistent state — just a chat window that grows forever
  with no memory of what was actually decided.

The cause isn't model quality. It's that there's no workflow beneath the chat.

---

## What Loom Does

Loom replaces the chat window with a **document graph that is the workflow**. Every idea, design
decision, implementation plan, and done-summary is a typed, linked markdown document. The AI reads
exactly the right slice of that graph for the current task — nothing more, nothing less.

```
loom/
  ctx.md                       ← global project summary (read first every session)
  refs/                        ← static architectural facts (architecture.md, etc.)
  {weave}/                     ← workstream (e.g. "auth", "payment-system")
    ctx.md                     ← AI-generated weave summary
    {thread}/                  ← feature thread
      {thread}-idea.md         ← raw concept
      {thread}-design.md       ← design decisions and conversation log
      plans/
        {plan-id}.md           ← implementation steps table
      done/
        {done-id}.md           ← post-implementation summary
      chats/                   ← AI conversation logs
```

Every document has typed frontmatter. Status is derived from documents — there is no central state
file. Changes are versioned in git.

---

## Fresh, Scoped, Auditable

This is what Loom does that no chat-native tool can:

**Fresh** — each session starts clean. The AI loads the thread context (idea + design + active plan +
`requires_load` chain) and nothing else. Old chats, dead ends, and prior sessions don't pollute new
ones — they're in the docs, available on demand, not injected by default.

**Scoped** — a session started on step 4 of a plan is as sharp as a session started on step 1.
The AI isn't carrying the weight of steps 1–3 in its working context. Context is bounded by the
thread, not by the length of the chat history.

**Auditable** — because the context is explicit (the docs that are loaded are visible and
version-controlled), you know *why* the AI gave the answer it gave. In a chat tool that's opaque —
the model's behaviour depends on 80 messages of invisible history. In Loom, the context *is* the
docs.

---

## How Loom is Different

Most AI tools in this space are **prompt wrappers** — they make it easy to run a prompt, maybe with
some RAG on top, but the workflow is still ad-hoc. The human holds the plan in their head.

The closest alternatives are Linear + Cursor workflows stitched together manually, or fully-autonomous
agents (Devin-style) that run until done. Loom sits in a different position:

| | Prompt wrappers | Autonomous agents | **Loom** |
|--|--|--|--|
| Memory across sessions | ❌ | ❌ partial | ✅ document graph |
| Human approval gates | ❌ | ❌ | ✅ every phase transition |
| Context scope control | ❌ | ❌ | ✅ thread-bounded |
| Auditable context | ❌ | ❌ | ✅ version-controlled docs |
| Works with existing agents | — | — | ✅ MCP standard |

Loom's thesis: **human-in-the-loop, document-native, resumable**. The human drives. The AI executes.
The docs remember everything.

---

## How AI Agents Use Loom

Loom exposes its document graph as an **MCP server** (Model Context Protocol). Any MCP-compatible
agent — Claude Code, Cursor, Continue, Cline — can read and write Loom state via standard tools.

```json
{
  "mcpServers": {
    "loom": {
      "command": "loom",
      "args": ["mcp"],
      "env": { "LOOM_ROOT": "${workspaceFolder}" }
    }
  }
}
```

The agent owns code execution. Loom owns workflow state. Each stays in its lane.

### Key resources (read-only)

| Resource | What it returns |
|----------|----------------|
| `loom://context/{docId}` (or `loom://context/thread/{weaveId}/{threadId}`) | Unified context pipeline: global/weave/thread ctx + parent chain (idea + design + active plan) + requires_load — the complete "what am I working on" payload |
| `loom://state?weaveId=&threadId=` | Full project state JSON, filterable |
| `loom://plan/{id}` | Plan doc with parsed steps array |
| `loom://requires-load/{id}` | Recursively resolved context chain |
| `loom://diagnostics` | Broken links, dangling references |

### Key tools (state mutations)

| Tool | What it does |
|------|-------------|
| `loom_complete_step` | Mark a plan step done (idempotent) |
| `loom_create_idea / design / plan / chat` | Create Loom documents |
| `loom_update_doc` | Rewrite doc content, preserve frontmatter |
| `loom_promote` | idea → design → plan, chat → idea |
| `loom_refresh_ctx` | Regenerate ctx summary via AI sampling |
| `loom_get_stale_docs` | List all docs whose parent has been updated since last generation |

### Key prompts (guided workflows)

| Prompt | What it does |
|--------|-------------|
| `do-next-step` | Loads the active plan step + all required context; primary "do work" entry point |
| `continue-thread` | Loads thread context and proposes the next action |
| `weave-idea / design / plan` | Guided document creation via AI sampling |

---

## The Workflow

| Weave→ | Thread→ | Chat→ | Idea→ | Design→ | Plan→ | Done |
|---|---|---|---|---|---|---|
|<img src="packages/vscode/media/icons/weave-implementing.svg" alt="Loom" width="32" />|<img src="packages/vscode/media/icons/thread-implementing.svg" alt="Loom" width="32" />|<img src="packages/vscode/media/icons/chat.svg" alt="Loom" width="32" />|<img src="packages/vscode/media/icons/idea.svg" alt="Loom" width="32" />|<img src="packages/vscode/media/icons/design.svg" alt="Loom" width="32" />|<img src="packages/vscode/media/icons/plan-implementing.svg" alt="Loom" width="32" />|<img src="packages/vscode/media/icons/status-done.svg" alt="Loom" width="32" />|

```
0. Chat      → think with the AI, explore the problem space
   ↓ Promote
1. Idea      → raw concept, rough scope
   ↓ Promote
2. Design    → decisions, trade-offs, rejected alternatives, conversation log
   ↓ Promote
3. Plan      → numbered implementation steps, each reviewable
   ↓ DoStep
4. Implement → agent executes one step at a time, marking progress
   ↓
5. Done      → post-implementation summary, links to what was built
```

Human approves each phase transition. The agent never advances without a checkpoint.

### Chat — a better AI window
<img src="packages/vscode/media/icons/chat.svg" alt="Loom" width="24" />
Loom chats look like a normal AI chat window but work completely differently:

| | Usual AI chat | Loom chat |
|--|--|--|
| Context | Everything in the session, growing forever | Thread-bounded: idea + design + active plan only |
| History | Lost when session ends | Persisted as a versioned markdown doc |
| Scope | Whatever the user remembered to mention | Explicit: exactly the docs in `requires_load` |
| Reusable | No — ephemeral | Yes — future sessions load it on demand |
| Promotable | No | Yes — any chat can become an idea, design, or plan |

Chats live inside threads, so the AI always has the right context loaded before you type the first
message — not because you pasted it in, but because the thread document graph defines it.

### Promote — turning conversation into structure

The most powerful workflow command. Any chat can be promoted to a formal doc with one click:

- **Chat → Idea** — the exploration becomes a scoped concept with success criteria
- **Idea → Design** — the concept becomes an architecture document with decisions and trade-offs
- **Design → Plan** — the architecture becomes numbered, reviewable implementation steps
- **Chat → Reference** — useful findings become a permanent reference doc in `loom/refs/`

This means you never start a formal document from scratch. You think out loud with the AI in a chat,
and when the conversation reaches something concrete, you promote it. The structure comes from the
conversation, not the other way around. No copy-pasting from a chat window into a document — the
doc *is* the promoted chat.

**Staleness detection:** when a design is updated, linked plans are flagged stale. The agent sees
the warning and knows to re-read the design before implementing. Context can't silently drift.

**`requires_load`:** documents declare their own dependencies. Before working on any doc, the agent
reads everything in its `requires_load` chain. It can't miss context it doesn't know exists.

---

## VS Code Extension

<img src="packages/vscode/media/loom.png" alt="Loom" width="64" />

The VS Code extension is the **human surface** over the same document graph.

> Demo GIF coming — see `packages/vscode/media/loom-demo.gif` once recorded.

**The CONTEXT panel** (Activity Bar) shows your weaves → threads → plans, chats, done docs.

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
| *Rename / Archive* | Inline doc management |

### AI button paths

Every AI button in the extension picks its path automatically at click time:

| Path | When it runs | Who it works for |
|------|-------------|-----------------|
| **Claude Code CLI** (default) | `claude` is on PATH | Claude Pro subscribers and API-key users with Claude Code installed |
| **API key / sampling** (fallback) | CLI not found | Users with `reslava-loom.ai.apiKey` set in VS Code settings |

On the CLI path the button opens a persistent **Loom AI** terminal and runs `claude "<prompt>"`. Claude reads Loom docs, calls the right MCP tools directly, and writes the result back — no API key needed, no separate billing.

Install from the VS Code marketplace: search **`reslava.loom`**.

---

## Architecture

```
cli / vscode / mcp  →  app (use-cases)  →  core (domain) + fs (infrastructure)
```

- **`core`**: Pure domain logic — entities, reducers, events, validation. No IO.
- **`app`**: Orchestration use-cases. All state changes go through here.
- **`fs`**: Infrastructure — file IO, frontmatter parsing, link index, repositories.
- **`cli`**: Thin delivery layer — command parsing, console output.
- **`vscode`**: Human surface — tree view, commands, toolbar.
- **`mcp`**: Agent surface — MCP resources, tools, prompts, sampling.

No layer imports upward. All MCP tools delegate to `app` — no bypassing.

---

## Status

| Feature | Status |
|---------|--------|
| Core engine (entities, reducers, events) | ✅ Shipped |
| Filesystem layer (repositories, link index) | ✅ Shipped |
| App use-cases (idea, design, plan, step, finalize, rename, archive) | ✅ Shipped |
| CLI commands | ✅ Shipped |
| VS Code extension (tree view, toolbar, commands) | ✅ Shipped |
| MCP server (`loom mcp`, resources, tools, prompts) | ✅ Shipped (v0.5.0) |
| VS Code AI buttons — CLI terminal path (Claude Pro) | ✅ Shipped (v0.6.0) |
| VS Code AI buttons — API key path (sampling fallback) | ✅ Shipped (v0.5.0) |
| `loom init` with CLAUDE.md fusion | ✅ Shipped |

---

## Quick Start

```bash
npm install -g @reslava/loom

# Initialize Loom in your project
cd my-project
loom init

# Create your first idea
loom weave idea "Add Dark Mode" --weave ui

# Check project state
loom status
```

---

## Why MCP (not a custom AI integration)

MCP (Model Context Protocol) is an open standard for AI agent tool integration — Anthropic-published
but supported by Cursor, Continue, Cline, and others. Implementing once exposes Loom to every
MCP-compatible agent.

The agent owns code execution, bash, file edits, search — everything a coding agent already does
well. Loom owns workflow state. Single billing via the user's existing agent connection. No separate
API keys.

---

## References

| Document | Purpose |
|----------|---------|
| [Architecture Reference](./loom/refs/architecture-reference.md) | Package relationships, AI integration, frontmatter fields, directory structure |
| [CLI Commands Reference](./loom/refs/cli-commands-reference.md) | Every `loom` command |
| [VS Code Commands Reference](./loom/refs/vscode-commands-reference.md) | All VS Code commands and keybindings |
| [Workspace Structure Reference](./loom/refs/workspace-directory-structure-reference.md) | Directory layout and file naming |
| [Claude's Vision of Loom](./loom/refs/loom-claude-own-vision.md) | AI perspective on what Loom changes |

---

## License

MIT © 2026 Rafa Eslava
