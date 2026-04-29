---
type: chat
id: mcp-chat
title: "Mcp Chat"
status: active
created: 2026-04-26
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
# CHAT

## Rafa:
I am realizing something very important
I designed this app when I was developing my last app with you using claude pro subs like now.
Using Claude VSCode extension you act like an agent and you are able to read, update, create files, execute bash commands, etc

But now, for loom, we are using AI API, I think this was of collaborations is much more limited.
Are AI API able of ead, update, create files, execute bash commands, etc?

## AI:

Good question — this is the core distinction between an AI API call and an AI agent.

**The Claude API itself** is just text in / text out. It cannot read files, write files, or run commands on its own. It generates text responses.

**What makes Claude Code (VS Code extension / CLI) capable** of file operations and bash commands is **tool use** — the API supports a feature where you send a list of tool definitions (read_file, write_file, bash, etc.) alongside the prompt. When Claude decides to use a tool, it returns a structured tool-call response; the *client code* (Claude Code itself) executes the actual operation and sends the result back to Claude. Claude never directly touches the filesystem — the client does.

So for Loom's AI integration, you have two options:

**Option A — Simple (current design): prompt only**
Loom sends a context-enriched prompt → Claude returns a text response → Loom parses the response and writes/updates files. Claude isn't aware of the filesystem; it just generates markdown. This is what the existing `chatNew`, `weaveIdea`, `refineDesign` etc. use cases do. Limited but sufficient for document generation.

**Option B — Agentic: tool use loop**
Loom defines tools (`read_doc`, `save_doc`, `list_threads`, `run_step`, etc.) and sends them to the API. Claude can call them in a loop (read → think → write → verify → done). This matches how Claude Code works. This is what would enable truly autonomous step execution — Claude reads the plan, implements the step, updates the plan table, marks it done.

For Loom right now, Option A covers the designed use cases well. Option B becomes relevant when you want `loom.doStep` to actually implement a plan step end-to-end without Rafa writing the code manually. The Claude Agent SDK is built exactly for this pattern.

The short answer: the API can do everything Claude Code does — it just requires Loom to implement and hand the tools to it.

## Rafa:
What happen with codebase, for exmpla, when you are implementing a feature:
- first you read codebase files
- do some grep looking same pattersn
- etc
Is this possible with option A? I don't think so
With option B? I think it requires a huge invest in developing tools
If we use Claude Agent SDK, loom is not AI agnostic 

## AI:

You're right on all three points. Let me be precise:

**Option A for codebase work**: Not fully. You can pre-load relevant files into the prompt manually (which is what `requires_load` in frontmatter does — it's a human-driven "here's the context" hint). But autonomous exploration — "read this file, grep for that pattern, follow the import" — is impossible. The AI can only work with what you stuffed into the prompt upfront. For document generation this is fine. For actual code implementation it isn't.

**Option B investment**: It's not as large as it sounds for the core tools. You need maybe 5 tools: `read_file`, `write_file`, `list_dir`, `grep`, `run_command`. These are 20–30 lines each. The real cost is the **tool-loop infrastructure** — sending tool calls back to the model, executing them, feeding results back, iterating until done. That's ~100 lines of orchestration code. Not trivial but not huge either. The tools themselves are completely generic and reusable.

**Claude Agent SDK = lock-in**: Correct. The SDK is Anthropic-only. But here's the key insight: **the tool-use pattern itself is not Anthropic-specific**. OpenAI, DeepSeek (via OpenAI-compatible API), and most modern models support the same tool-call format. So you can build the tool loop directly against the provider abstraction Loom already has (`reslava-loom.ai.provider`) and stay AI-agnostic. The Agent SDK just wraps this pattern with convenience helpers — you don't need it.

**What Loom actually needs right now**: The current `loom.doStep` design sends context + plan to the AI and gets back a suggested implementation in text. Rafa reviews and applies it. That's Option A. It works for doc-centric steps (update a design doc, draft a plan section). It won't write and compile code autonomously.

**The architectural decision**: When you want `doStep` to actually write code, the minimum viable path is:
1. Add `read_file` + `write_file` + `grep` tools to the existing AI provider layer
2. Implement a small tool-loop in `packages/app/src/doStep.ts`
3. Keep it provider-agnostic (both Claude and DeepSeek support this)

That's a contained piece of work — no Agent SDK, no lock-in. Worth a dedicated design conversation when you're ready to go there.

## Rafa:

If Loom manages only markdown docs database workflow of development, for me is good, because as we are doing now, I can guide you to implement code referencing the docs. But most of user could view Loom as an extra friction documentation only tool.

This is not the final idea I though, a completely full atomatic AI-User collaboration based just on the docs, but with same capabilities for AI to access codebase, bash tools, etc

Are we able to get this?

## AI:

Yes — and this is actually the most important design question Loom has to answer. Let me lay out the landscape clearly.

**The friction problem is real.** A tool that only produces markdown is a tax, not a multiplier. Users won't adopt it unless the docs *drive* something — not just inform a human who then drives something.

**The full vision is achievable**, and there are two credible paths:

---

**Path 1 — Loom builds its own agent loop**

Implement Option B: add `read_file`, `write_file`, `grep`, `bash` tools to Loom's AI layer. When Rafa clicks `doStep`, Loom runs a full tool loop — AI reads the codebase, writes code, runs tests, updates the plan table. Rafa reviews a diff, not a text suggestion.

Pros: fully self-contained, AI-agnostic (tool use works on OpenAI, DeepSeek, Claude).
Cons: Loom is now building a coding agent — significant scope, competing with Cursor/Copilot.

---

**Path 2 — Loom as the workflow brain, existing agents as the hands**

This is the more interesting path. Claude Code, Cursor, and Copilot already have codebase access, grep, bash. What they're missing is **structured project memory** — context that persists across sessions, a defined workflow state, approval gates. That's exactly what Loom docs provide.

In this model:
- Loom generates a rich context package from its weave/thread/plan docs
- That context is fed to Claude Code (via a custom command or CLAUDE.md) or Cursor (via a rules file)
- The agent executes; Loom tracks what was done and updates the plan

Rafa is already doing this manually. Loom could automate the context handoff: `loom doStep` generates a prompt with full context and opens it in Claude Code. The agent does the work. Loom reads the result and marks the step done.

Pros: Loom doesn't need to rebuild what Claude Code already does. Each tool stays in its lane.
Cons: depends on external tools; not fully self-contained.

---

**Which path?**

Path 2 is the faster unlock and has a stronger position. Loom is not trying to be a coding agent — it's the structured layer that makes AI agents coherent across a project over time. "AI agents are stateless and amnesiac; Loom gives them memory and a plan."

Path 1 can come later as an embedded option when you want Loom to work without needing Claude Code installed.

The real question: does the v1 story for other users need to work without Claude Code? Or is "use Loom + Claude Code together" an acceptable (and even better) answer?

## Rafa:
- I think building a coding agent is a huge task, am I right? Also I do not like to reinvent what has been already done
- If we use Claude Code or Cursor, then Loom is not AI agnostic and we need to implement interfaces for each AI agent we want to suppport. Also current AI API ley way to use AI is not valid then, correct?

I lean to loom + claude code (no ai agnostic), but which tech tools then to send, get info to Claude Code agent
this Claude Code is the terminal based correct? 
Claude VSCode extension is not the ritght choice for what we want to do, correct?

## AI:

Yes, building a coding agent is a large task — and unnecessary given what already exists. Don't reinvent.

**Clarifying the tools:**
- **Claude Code** = the CLI (`claude` in terminal) + VS Code extension (sidebar with file access, bash, etc.). It's the same agent, two surfaces. You're using it right now in this conversation.
- **The chat sidebar you use with me** — that's also Claude Code (VS Code extension mode). When I read files and run bash commands, that IS Claude Code acting as an agent.
- **Claude VSCode extension** (the older, simpler chat panel) is not the right choice — it's just a chat UI with no tool access.

**The AI-agnostic concern has a clean answer: MCP.**

MCP (Model Context Protocol) is an open standard — not Anthropic-proprietary. Cursor supports it. Claude Code supports it. Other agents are adding it. Loom could expose an **MCP server** that provides tools like:
- `loom_list_weaves` / `loom_get_plan` / `loom_get_thread_context`
- `loom_mark_step_done` / `loom_create_chat`

Any MCP-compatible agent — Claude Code, Cursor, future tools — can then use Loom's structured data natively. Loom becomes the memory layer, not locked to one agent.

**Does the current AI API usage become invalid?** No — it coexists:
- Loom still calls the AI API directly for document generation (chatNew, weaveIdea, refineDesign) — Option A stays as-is
- MCP is a separate channel for agents to read/write Loom's structure
- They serve different purposes and don't conflict

**Architecture in one picture:**
```
User
 └── Claude Code (VS Code / CLI)
       ├── [has] read_file, write_file, bash, grep  ← already built
       └── [via MCP] Loom server
             ├── get_plan_step → returns context for current step
             ├── mark_step_done → updates plan table
             ├── list_threads → weave/thread structure
             └── get_context → summarised doc context for a thread

Loom (separately)
 └── calls AI API directly → generates idea/design/chat docs
```

**Conclusion:** Build Loom as an MCP server. This is ~200 lines of code in `packages/mcp/` (or added to `packages/cli/`). It keeps Loom AI-agnostic (MCP is open), leverages Claude Code's existing tools, and doesn't require building a coding agent. The current AI API integration stays unchanged for document generation.

Worth a design doc for this. Want to start one?

## Rafa:
I prefer sepparated `packages/mcp/`
Create design `weaves/ai-integration/mcp/mcd-design.md`
Enumerate the endpoints needed and category them.
Inclide any info you consider useful to be able later to create a good, robust plan.
Is typescript good enough for mcp servers?
How we colud define loom after implementing loom mcp server?
Will we face any limitation compared to possibilities developing with AI agent directly?

## AI:

Design created at [weaves/ai-integration/mcp/mcp-design.md](weaves/ai-integration/mcp/mcp-design.md). I corrected the typo `mcd` → `mcp` to match the folder/thread name. Quick answers to your questions; full detail in the doc:

**Is TypeScript good enough?** Yes — first-class. Anthropic publishes `@modelcontextprotocol/sdk` for TS. Python and Go also have official SDKs; TS is the natural fit since the rest of Loom is TS. No reason to switch languages.

**Endpoints categorized into 7 groups:**
1. **Discovery & State** — `loom://state`, `loom://weaves`, `loom://link-index` (resources)
2. **Document Reading** — `loom://docs/{id}`, `loom://thread-context/{...}`, `loom://requires-load/{id}`
3. **Document Authoring** — `loom_create_idea/design/plan/chat`, `loom_update_doc`, `loom_append_to_chat`
4. **Workflow Transitions** — `loom_start_plan`, `loom_complete_step`, `loom_close_plan`, `loom_promote`, `loom_archive`, `loom_rename`
5. **Search & Query** — `loom_find_doc`, `loom_search_docs`, `loom_get_blocked_steps`, `loom_get_stale_plans`
6. **Diagnostics** — `loom://diagnostics`, `loom://summary`
7. **Prompts** (templates) — `continue-thread`, `do-next-step`, `refine-design`, `validate-state`

**How Loom is redefined:**
> Loom is the structured project memory for AI-assisted development — a markdown document graph that any AI agent can read, write, and reason over via MCP. The VS Code extension is the **human surface**; the MCP server is the **agent surface**. Both operate on the same underlying graph.
>
> One-liner: *"Your AI co-developer's long-term memory."*

**Limitations vs direct Agent SDK** (full list in design doc):
1. No control over conversation flow — agent's host owns the loop
2. No proactive notification (Loom can't ping the agent)
3. Streaming progress is limited — tool responses are atomic
4. No tool-call ordering guarantees — tools must validate preconditions
5. Per-agent UX differences — can't control how tools appear
6. Discovery is on the agent — needs good tool descriptions + CLAUDE.md hints
7. stdio is single-user local — remote/multi-user needs HTTP + auth (out of scope for v1)

For a single-developer workflow tool, all seven are acceptable. The wins (no coding agent to build, AI-agnostic, leverages existing agents) outweigh them.

**Key open questions for the plan** — listed in the design's "Open questions" section: subcommand vs separate binary, project-root discovery via env var, whether to expose AI-API-backed tools, etc.

Ready for plan when you are.

## Rafa:
Tell me briefly about building a coding agent in Loom. 
A brief comparisong of building a coding agent vs MCP?

## AI:

### Building a coding agent in Loom — what it means

Loom owns the full AI loop:
- Defines tools: `read_file`, `write_file`, `grep`, `bash`, `apply_patch`, plus Loom-specific (`mark_step_done`, etc.)
- Sends prompt + tool definitions to AI provider (Claude/OpenAI/DeepSeek)
- Receives tool calls, executes them locally, sends results back
- Repeats until model says "done"
- Renders progress in VS Code UI (chat panel, diff view, approval gates)
- Handles errors, retries, context-window management, prompt caching

Roughly: ~200 LOC for tools + ~500 LOC for the agent loop + ~500 LOC for UI surfaces (diff review, approval, history). Plus ongoing tuning of system prompts, tool descriptions, error recovery. Realistically a multi-week effort, then continuous maintenance as models evolve.

### Brief comparison

| Dimension | Build coding agent | MCP server |
|-----------|--------------------|------------|
| **Initial work** | ~1000+ LOC + ongoing prompt/loop tuning | ~200–300 LOC, mostly thin wrappers over existing app use cases |
| **Owns the AI loop** | Yes — Loom orchestrates | No — host agent (Claude Code, Cursor) orchestrates |
| **Codebase access** | Loom implements (read/write/grep/bash tools) | Comes free from host agent |
| **AI provider** | Loom calls API directly, picks model | Host agent picks the model |
| **AI-agnostic** | Yes (tool-use is cross-provider) | Yes (MCP is open, multi-agent) |
| **UX** | Self-contained in VS Code extension | Requires Claude Code / Cursor / etc. installed |
| **Approval/diff gates** | Loom builds them | Host agent provides them |
| **Maintenance burden** | Track model changes, tune prompts, fix loop bugs | Track MCP spec changes only |
| **Differentiation risk** | Competes with Cursor/Copilot/Claude Code on their turf | Complements them — distinctive position |
| **Offline / no-host case** | Works alone | Doesn't work without an agent |
| **Diff review UX** | Custom-built | Whatever the host agent provides |
| **Context window** | Loom manages | Host agent manages |

### Bottom line

**Coding agent** = build a competitor to Claude Code from scratch, then keep up with it forever.
**MCP** = ship Loom's *unique value* (structured project memory) and let best-in-class agents do code execution.

The only reason to pick the coding-agent path is if Loom must work standalone with no external agent. If "use Loom alongside Claude Code/Cursor" is acceptable, MCP is the dramatically smaller, more defensible, and more durable choice. Coding-agent capability can still be added later as a fallback mode without throwing the MCP work away.

## Rafa:

I pick MCP 
`mcp-design.md`

## Open questions for plan

- **Subcommand vs separate binary.** can MCP code lives in packages/mcp, but with cli command `loom mcp` (subcommand of CLI) ? I am not sure which options of both you propose is better, help me to decide.
- **Resource URI scheme.** I do not see the difference between `loom://` and `loom://`? Tell me
- **Streaming for `getState`.** Two endpoints filter (`?weaveId=...`) and (`?threadId=...`). What you think?
- **Project root discovery.** stdio MCP servers don't get the workspace path automatically. Probably an env var (`LOOM_ROOT`) or first-tool-call argument.
- **Whether to expose AI-API-backed tools (e.g., `loom_generate_idea_draft`).** yes. Single source of truth.

You design doc you said:

### 1. Discovery & State (resources)

| Endpoint | Type | Description |
|----------|------|-------------|

| `loom://state` | Resource | Full Loom state JSON (weaves, threads, summary). Same shape as `getState`. |
`state` should be the only source of truth, but with filters by weave, thread options

| `loom://status` | Resource | Contents of `.loom/_status.md`. |
_status is a temporary solution to be able to use loon before loom is fully implemented. Should be deleted of Loom when Loom is ready.

## AI:

All five decisions resolved. Updating the design doc with them. Answers inline:

**1. Subcommand vs separate binary**
Use `loom mcp` (CLI subcommand). Code lives in `packages/mcp/` as its own TS package; the CLI just delegates to it. Benefits: single global install (`npm i -g @reslava-loom/cli`), MCP config is simply `{ "command": "loom", "args": ["mcp"] }`, no second install step. A separate binary only makes sense if you ever want to distribute the MCP server independently of the CLI — not needed here.

**2. URI scheme — `loom://` vs what?**
The question in the design was `loom://` (custom scheme) vs file-style paths. `loom://state` means "the URI scheme is `loom`, the path is `state`". It's a virtual address — not a file on disk. For actual doc files we'd use `file:///absolute/path.md` so agents can also open them in the editor. For Loom virtual resources (state, diagnostics, summary) use `loom://`. No ambiguity.

**3. Streaming / filtering `getState`**
Agreed: `loom://state` with `?weaveId=` and `?threadId=` query params is the right shape. This collapses `loom://weaves`, `loom://weaves/{id}`, and `loom://weaves/{id}/threads/{threadId}` into one endpoint. Simpler catalog, single source of truth, and agents can request just what they need.

**4. Project root discovery**
Keeping env var `LOOM_ROOT`. Simplest reliable approach; no MCP spec change needed.

**5. AI-API-backed tools**
Yes, include them. `loom_generate_idea_draft`, `loom_generate_design_draft`, etc. — Loom calls the AI API internally and returns the draft. The agent doesn't spend its own tokens on Loom-domain generation. Single source of truth for AI behavior.

**6. `loom://state` as single source of truth**
Agreed. Collapsing the discovery endpoints. Filtered `loom://state` replaces the per-weave/per-thread resource hierarchy.

**7. `_status.md`**
Exposing it in v1 as a temporary resource (marked deprecated). Drop it once Loom derives status from docs+code natively. Noted in the design.

Design doc updated with all decisions now.

## Rafa:

### MCP Testing
- can be tested with cheap DeepSeek API Key ? I don't think so, we need a real agent. So this imply use YOU, claude code. If so, use the cheapest model Haiku for tests.
- how to make tests for loom MCP ? options ?

## AI:

**DeepSeek for MCP testing?** Correct — not possible. DeepSeek is just an API; it has no MCP client infrastructure. MCP requires a *host agent* (Claude Code, Cursor, etc.) that knows how to connect to an MCP server, discover its tools, call them, and process responses. DeepSeek via API is a bare model — you'd have to build an MCP client on top of it, which is the whole tool you don't have yet.

**Testing options — three layers:**

### Layer 1 — MCP Inspector (no AI, no cost, best for development)

```bash
npx @modelcontextprotocol/inspector loom mcp
```

Anthropic's official CLI tool. Spawns the MCP server and opens a browser UI where you can manually invoke any tool, read any resource, inspect request/response shapes, and see errors. No model, no API key, no cost. This is the right tool for building and debugging tools. Use it constantly during implementation.

### Layer 2 — Automated TS tests (no AI, runs in CI)

Use `@modelcontextprotocol/sdk`'s client library to write integration tests that:
1. Spawn `loom mcp` as a subprocess (stdio transport)
2. Connect the MCP client
3. Call each tool with valid and invalid args
4. Assert response shapes and error codes

```typescript
const client = new Client({ name: 'test', version: '1.0' }, { capabilities: {} });
await client.connect(new StdioClientTransport({ command: 'loom', args: ['mcp'] }));
const result = await client.callTool({ name: 'loom_complete_step', arguments: { planId: 'x', stepNumber: 1 } });
// assert result
```

This covers correctness of tool implementations without any AI. Cheapest CI path.

### Layer 3 — Claude Code + Haiku (real agentic tests, minimal cost)

Configure in Claude Code's MCP settings (`~/.claude.json` or workspace `.claude/mcp.json`):
```json
{ "mcpServers": { "loom": { "command": "loom", "args": ["mcp"] } } }
```

Set Claude Code to use `claude-haiku-4-5-20251001` (cheapest Claude model, fully capable of MCP tool calling). Run scenarios: "what weaves do I have?", "mark step 2 done in plan X", "create an idea in the core weave". Haiku handles this kind of structured tool-calling well and costs ~5× less than Sonnet.

**Recommended order:** Inspector during build → TS tests in CI → Haiku e2e for integration sign-off. The TS tests catch regressions without touching the API; Haiku e2e confirms the real agent UX works.

This approach goes in the plan's "Testing" section.

## Rafa:

If we use:
Loom ai-integration <-> Agnostic API key
Loom MCP Server <-> Claude Code
We are forcing user to pay 2 different AI services
I think we should do everything through MCP
What you think?

## AI:

You're right — two AI services is the wrong UX. This is a clean architectural insight.

**If the user has Claude Code connected via MCP, Claude Code IS the AI.** There's no reason Loom should also call the API separately:

- "Draft an idea for X" → user asks Claude Code → Claude generates → calls `loom_create_idea` via MCP → saved in Loom
- "Refine this design" → user asks Claude Code → Claude reads `loom://thread-context/...` via MCP → writes refinement → calls `loom_update_doc` via MCP
- "Create a plan from this design" → same pattern

The VS Code toolbar buttons (Weave Idea, Weave Design, Weave Plan) currently fire a direct API call. In the MCP model they'd instead become "open Claude Code with this context pre-loaded" — the agent does the AI work, Loom just provides the structured save target.

**What this changes:**

| Current design | MCP-only design |
|----------------|-----------------|
| Loom has its own AI provider (`reslava-loom.ai.*`) | Dropped — no API key needed in Loom settings |
| `packages/app/src/chatNew.ts`, `weaveIdea.ts`, `refineDesign.ts` call AI API | Dropped or kept as non-AI scaffolding (just create blank doc) |
| VS Code toolbar buttons call AI directly | Toolbar buttons open Claude Code with context, or are removed |
| `loom_generate_idea_draft` MCP tool (Loom calls AI internally) | Unnecessary — agent generates directly |
| User needs 2 API keys | User needs 1 (Claude Code / any MCP host) |

**The only concern: standalone users**

A user without Claude Code (or any MCP agent) would have no AI in Loom at all. The VS Code extension becomes a pure document management tool for them.

Two options:
- **A)** Accept it. "Loom requires an MCP host agent for AI features. Claude Code is the recommended host." This is a clean dependency that's honest upfront.
- **B)** Keep a minimal fallback: blank doc creation (no AI) for standalone mode; full AI generation only when MCP host is connected. VS Code extension detects if `loom.aiEnabled` (MCP connected) and toggles AI-dependent buttons accordingly.

I lean toward **A** for v1 — Loom is a developer workflow tool; developers who want AI use Claude Code or Cursor. Standalone no-AI Loom is Jira without the features — not a compelling product. MCP = AI is the right coupling.

**Practical consequence:** drop `reslava-loom.ai.*` settings from `package.json` and the entire `packages/app/src/ai*` layer. Everything AI goes through the MCP server. Major scope reduction.

Worth deciding now before the MCP plan is written, since it determines how much of the existing AI layer to keep.

## Rafa:

- Option A -> Update `weaves/ai-integration/mcp/mcp-design.md` 

- Will need some MCP `prompts` and / or `samples`, using them could be useful ?

## AI:

Plan created at [weaves/ai-integration/mcp/plans/mcp-plan-001.md](weaves/ai-integration/mcp/plans/mcp-plan-001.md).

Design doc updated. Both prompts and sampling are now in the design — and they're key pieces, not optional extras.

**Prompts — yes, very useful.** They're Loom's "guided workflow" surface: the user selects a prompt, the MCP server automatically loads all required context (idea + design + active plan + `requires_load` chain), and the agent gets a fully assembled task. This replaces the manual "read all these files before starting" step that Rafa currently does. Added prompts: `weave-idea`, `weave-design`, `weave-plan` alongside the existing `continue-thread`, `do-next-step`, `refine-design`, `validate-state`.

**Sampling — this is the critical piece that makes Option A work cleanly.** MCP sampling is where the *server* asks the *host agent* to run an LLM inference on its behalf. This is what powers the VS Code toolbar buttons (Weave Idea, Weave Design, AI Reply) without a separate API key:

1. User clicks "Weave Idea" in VS Code
2. VS Code extension → Loom MCP server
3. Loom MCP server issues `sampling/createMessage` to host (Claude Code)
4. Claude Code generates content using its own connection
5. Loom server saves the result via `loom_create_idea`

Single billing — the user's Claude Code subscription handles everything. No `reslava-loom.ai.*` API keys.

**One caveat:** Cursor doesn't support MCP sampling yet (as of today). For those clients, the AI generation buttons degrade gracefully — show a message pointing to the agent chat instead.

**What was removed from the design:**
- `loom_generate_*` tools (replaced by sampling)
- `reslava-loom.ai.*` settings (entire AI provider layer dropped)
- Standalone AI fallback mode

Design is clean now. Ready for plan.

## Rafa:

### mcp -> app
`mcp` should always call an `app` function to get/set info from/to loom, thin wrappers over existing `app` use cases. Agree? What happen when we implement a use case no being define yet in `app`? We should implement `app` use case before `mcp`. Agree?

### Stateful AI
My vision of Loom always has been `Making AI stateful`
Incorporing MCP is an approach than gives AI a set of resources, tools, ... and AI decide how and when to use them. So we must ensure that the reference data and tools of Loom are so clear and useful that AI always decide to use Loom instead of read full codebase to get fresh context.
To achieve AI stateful we relay in:
- requires_load frontmatter field
- ctx 
- reference 
- making stale of childIds docs when a doc is updated. Show stale docs to user by UX, easy UX tools to update stale docs with AI. Stale docs knows their parent.

### Tokens consume
`weaves/ai-integration/load-when/load-when-design.md` is pending. `load-when` will be very important.
To save tokens, ctx should be the source of truth for AI.
We ensure to have always fresh ctx info docs global, per weave and per thread.
ctx docs should include `load-when` field, filled by AI when create/update ctx summary

### Important global reference docs
- architecture
- directory-structure

### CLAUDE.md
We need to ensure that this file sync with loom, Claud and user to make collaboration weaves smoothly

### TODO
1. What you think? Agree? Impovements, suggestions?
2. Update the `mcp-design.md` and `plans/mcp-plan-001.md` if needed.
3. Update `references/loom/architecture.md` including frontmatter fields
Include `AI agent`, `MCP server`, `MCP cli`, some briefly mention to a resource, tool, promptm, sampling example, all that make the diagram clear and complete.

## AI:

All three points fully agreed. Refinements below, then I'll update the docs.

---

### 1. mcp → app: Agree completely

MCP is the third delivery layer, same rule as CLI and VS Code:

```
cli / vscode / mcp  →  app  →  core + fs
```

If an app use case doesn't exist yet, implement it in app first, then wrap it in MCP. No bypassing. I'm adding this as a named design decision in `mcp-design.md` (it was only in the technical notes before).

---

### 2. Stateful AI — strong agreement, two additions

The vision is correct and it's the best one-sentence positioning for Loom: *"Making AI stateful."*

**What you listed + where it lives in MCP:**

| Mechanism | Status | MCP role |
|-----------|--------|----------|
| `requires_load` | Implemented | `loom://requires-load/{id}` resource resolves the chain |
| `ctx` docs | Partially — manual | `loom_refresh_ctx` tool (to add — generates fresh summary), `loom_get_stale_ctx` (to add) |
| `reference` docs | Design exists (`load-when-design`) | `loom://thread-context` filters references by `load_when` + mode |
| Stale child tracking | Plans only (`design_version`) | Extend: add `loom_get_stale_docs` tool; show stale ctx/ideas in tree |

**Two additions needed:**
1. `loom_refresh_ctx` tool — calls AI (via sampling) to regenerate the ctx summary for a thread or weave; saves to `{thread}/ctx/` or `{weave}/ctx.md`
2. `loom_get_stale_docs` tool — generalises `loom_get_stale_plans` to all doc types: returns any doc where its parent (via `parent_id`) has been updated since the doc's last `created/updated` timestamp

---

### 3. Tokens via ctx + load-when

`load-when-design` is well-designed. The integration point with MCP:

`loom://thread-context/{weaveId}/{threadId}?mode=implementing` should filter included references using `load_when` — same enforcement logic the design specifies for `getAIContext(doc, mode)`. For v1 include all ctx (no filter); add `?mode=` filtering once `load-when` is implemented.

**ctx hierarchy to maintain:**
- Global: `weaves/ctx.md` — project-level summary
- Per-weave: `weaves/{weave}/ctx.md` — weave summary
- Per-thread: `weaves/{weave}/{thread}/ctx/` — thread summary  

These should always be fresher than the full state and should be the first thing agents read. MCP `loom://thread-context` should prefer ctx docs over raw idea+design when ctx is fresh.

---

### 4. Global reference docs

`references/loom/architecture.md` updated below with MCP layer, frontmatter fields, and MCP primitives.

---

### 5. CLAUDE.md

Three things to sync:
1. Add `loom mcp` as the agent surface entry point (drop the standalone AI API references)
2. Add "use MCP tools for all Loom state changes — never edit weave files directly"
3. Add `loom://thread-context` + `do-next-step` prompt as the primary agent entry points

Will update in a follow-up — it's a session-critical file and deserves careful review.

---

Docs updated now.

## Rafa:

### Global ctx
We need to add global ctx. Maybe the best place could be with globale references: `references/ctx.md`. Agree? If so, include it in `references/loom/architecture.md`. We should update all layers of loom to support it. 

### 3 layers of context
Now we have 3 layers of context info:
1. global: this should summarize global reference docs: architecture.md and all AI consider that define the project and they way to implement it
2. per weave: only weave related info, referencing others when needed.
3. per thread: only thread related info, referencing others when needed.

### TODO
Create an idea in `weaves/core-engine/global-ctx`

## AI:

### Global ctx location: `weaves/ctx.md`, not `references/ctx.md`

I'd push back on `references/ctx.md`. The distinction I want to preserve:

- **`references/`** — static architectural facts. Written by humans, versioned, rarely change. Architecture.md belongs here.
- **`ctx.md`** — AI-generated summaries. Dynamic, regenerated by `loom_refresh_ctx`, keyed to when the source docs last changed.

Mixing one dynamic file into a static directory creates an exception the code has to special-case. `loom_refresh_ctx` would need to know "global ctx lives in `references/` but weave/thread ctx lives in `{scope}/ctx.md`".

The cleaner path extends the existing pattern:

```
weaves/ctx.md            ← global ctx  (NEW)
weaves/{weave}/ctx.md    ← weave ctx   (existing)
weaves/{weave}/{thread}/ctx/  ← thread ctx  (existing)
```

Every scope follows `{scope}/ctx.md`. `loom_refresh_ctx` with `weaveId=null, threadId=null` writes to `weaves/ctx.md`. No special cases.

What global ctx *summarizes* is still the reference docs — architecture.md, `load: always` refs, and the active weave/thread roster. But it lives in `weaves/` because it's AI state, not a reference doc.

**One thing to add to `references/loom/architecture.md`:** just the path — `weaves/ctx.md` — in the ctx hierarchy table. Already planned.

---

### 3 layers — confirmed

Clean and agreed. Each layer's scope:

| Layer | Path | Summarizes |
|-------|------|-----------|
| Global | `weaves/ctx.md` | Architecture.md + `load: always` refs + active weaves/threads roster |
| Weave | `weaves/{weave}/ctx.md` | All threads in the weave, their status, active plan summary |
| Thread | `weaves/{weave}/{thread}/ctx/` | Idea + design decisions + plan progress + open questions |

Each layer references the layer above when needed (e.g., thread ctx may say "see weave ctx for broader context"), but never duplicates it.

This maps cleanly to the session start protocol:
1. Global ctx → where am I in the project overall?
2. Weave ctx → what's active in this workstream?
3. Thread ctx → what specifically am I doing right now?

And to MCP: `loom://thread-context` bundles thread ctx + weave ctx + any `requires_load` refs. Global ctx is always available at `loom://state` (summary field) or directly at `loom://docs/weaves/ctx`.

---

### Idea created

`weaves/core-engine/global-ctx/global-ctx-idea.md` — done below.