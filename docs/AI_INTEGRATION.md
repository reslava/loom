# AI Integration — REslava Loom

How REslava Loom connects an AI agent to your documents: the **MCP server** that is the agent surface, the **two AI paths**, how **context is injected before the AI acts**, the **collaboration modes**, and the **approval gates** that keep it safe.

> **This is the reader's-eye view.** The canonical MCP surface — every resource, tool, and prompt with its exact arguments — lives in **[mcp-reference](../loom/refs/mcp-reference.md)**. How context is assembled lives in **[loom-context-pipeline-reference](../loom/refs/loom-context-pipeline-reference.md)**. The requirements model lives in **[loom-requirements-reference](../loom/refs/loom-requirements-reference.md)**. When this overview and a reference disagree, the reference wins.

---

## 1. Philosophy: a collaborator, stateful through documents

Loom treats the AI as a **collaborator, not an autonomous agent**. The agent:

- Reads **persistent Markdown documents** instead of relying on chat memory — the docs *are* its memory.
- Has the right context **assembled and handed to it before it acts**, not left to chance or to a rule it might ignore.
- Mutates state **only through Loom's tools**, each behind a human approval gate.
- **Stops for your `go`** after each step — never barrels ahead.

The payoff: every decision is captured in a durable doc, the AI can't corrupt state or run destructive commands behind your back, and what the AI saw is always visible to you.

---

## 2. The agent surface: the Loom MCP server

The AI reaches Loom through the **Model Context Protocol (MCP)**. `packages/mcp` exposes a stdio server (`loom mcp`) with four kinds of capability:

| Capability | What it is | Examples |
|------------|-----------|----------|
| **Resources** | Read Loom state (read-only). | `loom://state`, `loom://context/{docId}`, `loom://diagnostics` |
| **Tools** | Mutate Loom state (each is a workflow event). | `loom_create_idea/design/plan/req`, `loom_complete_step`, `loom_append_to_chat`, `loom_promote`, `loom_finalize_req` |
| **Prompts** | Guided workflow templates with context pre-loaded. | `do-next-step`, `continue-thread` |
| **Sampling** | The server asks the host to run an LLM inference on its behalf. | the `loom_generate_*` / verify paths (API-key host only) |

**All writes to Loom docs go through tools** — frontmatter, body, state mutation, prose alike. That's what makes MCP the single gate: reducers run, the link index updates, and plan-step validation fires on every change. The full catalogue is in [mcp-reference](../loom/refs/mcp-reference.md).

The MCP server runs inside any MCP-capable host: **Claude Code (CLI)**, the **Claude desktop app**, Cursor, Continue, etc. (Note: the *Claude VS Code extension* does not host MCP today.)

---

## 3. Two AI paths

There is no built-in LLM client baked into Loom. The AI is whatever host you point at the MCP server, and there are two paths — chosen automatically:

**Path A — the agent IS the host (Claude Code CLI, default).** Claude Code connects to `loom mcp` and calls the low-level tools directly (`loom_create_*` with `content`, `loom_update_doc`, `loom_append_to_chat`, `loom_complete_step`). Because Claude *is* the AI here, **sampling is intentionally disabled** — recursive server→client inference would be the host asking itself. No API key needed; works with a Claude Pro subscription.

**Path B — the extension supplies inference (API-key sampling).** When the VS Code extension can't find Claude Code on PATH, it acts as the MCP client and services `sampling/createMessage` callbacks using a configured provider key. This is the path the `loom_generate_*` / `loom_refine_*` tools use. Configure it in VS Code settings (prefix `reslava-loom.`):

```json
{
  "reslava-loom.ai.provider": "anthropic",
  "reslava-loom.ai.apiKey": "sk-...",
  "reslava-loom.ai.model": "",
  "reslava-loom.ai.baseUrl": ""
}
```

Supported providers: `anthropic`, `openai`, `deepseek` (and OpenAI-compatible endpoints via `baseUrl`). You never choose between A and B — the extension uses Claude Code if present, otherwise the API key. See [architecture-reference §2a](../loom/refs/architecture-reference.md).

---

## 4. Context injection — the pipeline

Loom's core promise: **before the AI acts, it already holds exactly the documents it needs.** Every AI-launching action runs the **Unified Context Pipeline**, which assembles a `ContextBundle` and prepends it to the prompt:

```
global ctx → weave ctx → thread req → load:always references (filtered by mode)
           → parent chain (idea → design → plan) → target doc → requires_load (transitive)
```

The assembler is a pure function in `packages/app`; the impure boundary is the `loom://context/{id}` MCP resource. The *same* bundle drives the prompt, the `📄 {Title} — loaded for context` visibility lines, and the sidebar CONTEXT panel — so what the AI saw and what you see can never diverge. Each action passes a **mode** (`chat`, `implementing`, `design`, …) that filters which references are relevant via their `load_when`. Full design: [loom-context-pipeline-reference](../loom/refs/loom-context-pipeline-reference.md).

---

## 5. Collaboration modes

### Chat — think out loud, in a durable doc

The agent replies **inside** the chat doc (appended under `## AI:`, with your turns under `## {your name}:`), with full thread context already loaded. The chat is durable memory, not a throwaway window — decisions made there become context for later work. No state changes occur from a chat reply.

**Voice convention:** first person in conversation blocks (`## AI:` / `## {name}:`); third person in all structured sections (Goal, Architecture, decisions). The agent appends via `loom_append_to_chat`.

### State changes — only through tools, behind approval

A workflow transition (promote, start a plan, complete a step, lock a req) is **always** an explicit tool call, never a silent edit. In the extension these surface as buttons; in a Claude Code session the agent calls the tool and pauses. The non-negotiable **stop rhythm** applies: the agent does one step, records it in the `done` doc, marks it ✅, names the next step and the files it will touch — then **stops and waits for your `go`** (unless you authorized a range up front).

---

## 6. Generation

Promoting a chat into a formal doc (idea/design/plan/req) is *generation*. It takes one of two forms, matching the two AI paths:

- **Claude Code (Path A):** the agent creates the doc in a **single call** — `loom_create_*` with the `content` argument — born at version 1 with real content. (It must *not* follow with `loom_update_doc`; that's a wasted round-trip.)
- **Extension (Path B):** `loom_generate_*` runs the generation through MCP sampling using the configured API key.

Both produce the same doc; the difference is only *who* runs the inference.

---

## 7. Requirements verification

When a thread has a locked `req`, Loom can check that the plan honours it — scope traceability, not functional correctness:

1. **Planner citation (prevention).** Each `PlanStep` carries `satisfies: [reqIds]`; the planner is handed the *Excluded* / *Constraints* lists as hard boundaries, so most violations never occur.
2. **Structural check (pure, always).** A deterministic check: every *Included* item has a covering step; no step cites an *Excluded* item; constraints carry through. No AI.
3. **Semantic backstop (AI).** "Did a step violate `EX1` phrased differently?" — runs as a **sampling** diagnostic in the extension; in a Claude Code session the agent verifies directly (sampling is blocked there).

In the extension this is the *Verify Plan Against Requirements* command (`loom_verify_req`), whose findings go to the *Loom Req Verify* output. Full model: [loom-requirements-reference](../loom/refs/loom-requirements-reference.md).

---

## 8. Visibility — you see what the AI saw

Two mechanisms keep the AI's context auditable:

- **`📄 {Title} — loaded for context`** lines — one per doc that went into the prompt (the literal bundle).
- **`🔧 MCP: loom_tool(...)` / `📡 MCP: loom://...`** lines — emitted before every tool call and resource read, so MCP usage is never hidden.
- **The sidebar CONTEXT panel** — a live view of the same `ContextBundle`, with per-doc include/exclude toggles persisted to `.loom/context-prefs.json`.

If you don't see the `📄` / `🔧` / `📡` markers, either MCP isn't running or it's being bypassed (which the session contract forbids).

---

## Related reading

- [mcp-reference](../loom/refs/mcp-reference.md) — canonical MCP resources, tools, and prompts.
- [loom-context-pipeline-reference](../loom/refs/loom-context-pipeline-reference.md) — how the context bundle is assembled.
- [loom-requirements-reference](../loom/refs/loom-requirements-reference.md) — the requirements model and verification.
- [ARCHITECTURE.md](ARCHITECTURE.md) — the layered system this surface sits on.
- [USER_GUIDE.md §4](USER_GUIDE.md#4-giving-the-ai-the-right-context) — the same context model, for users.
