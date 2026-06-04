# CLAUDE.md — REslava Loom Session Contract

## Required session-start context

**Always load [loom/ctx.md](loom/ctx.md) at the beginning of every session.**
It is the global ctx doc — concept, architecture, and operating rules in one place.
Read it before responding to the first user turn. This emulates the auto-loaded
global context that ctx-typed docs are designed to provide in Loom.

After reading it, output exactly this line so Rafa knows the global context is loaded:

```
📘 loom-ctx loaded — global context ready
```

If the read fails for any reason, output `⚠️ loom-ctx not loaded — proceeding without global context` instead, and continue.

---

## Two CLAUDE.md surfaces — keep them in sync

This repository owns **two** CLAUDE.md surfaces and they MUST stay in sync:

1. **This file (`CLAUDE.md` at the repo root)** — the *recursive* contract: rules for using Loom to build Loom itself. Project-specific (mentions `packages/`, `loom/refs/vision-reference.md`, current threads, etc.).
2. **The `LOOM_CLAUDE_MD` template in [`packages/app/src/installWorkspace.ts`](packages/app/src/installWorkspace.ts)** — the *project-agnostic* contract installed as `.loom/CLAUDE.md` in any project that runs `loom install`. No project-specifics.

**When you change session rules, MCP visibility rules, chat-reply rules, stop rules, or session-start protocol, update both.** The recursive file may carry extra project-specific guidance, but every rule shared by both surfaces (anything a generic Loom user also needs) must mirror. If a change is purely Loom-repo-specific (e.g., the active-work pointer, package paths), it stays in this file only — and you must say so explicitly when proposing the change.

Drift between these two files = inconsistent behavior between Rafa's recursive sessions and every downstream Loom user. Treat them as one logical contract with two physical files.

---

## What this project is

**REslava Loom** is a document-driven, event-sourced workflow system for AI-assisted development.
Markdown files are the database. State is derived. AI collaborates step-by-step with human approval.

This repository *uses its own workflow* to build itself. The `loom/` directory contains the living
design documents. The `packages/` directory contains the implementation.

---

## Architecture

```
packages/
  core/       Pure domain logic. No IO. No side effects.
              Entities, reducers, events, utilities.
  fs/         Infrastructure. File IO, frontmatter parsing, link index.
              Repositories: weaveRepository, threadRepository, linkRepository.
  app/        Use-case orchestration. Calls core + fs. No CLI/UI logic.
              All use-cases follow: (input, deps) => result
  cli/        Thin delivery layer. Parses args, calls app, prints output.
  vscode/     Thin presentation layer. Calls app, renders tree view.
              Currently under active development.
  mcp/        Agent surface. Exposes Resources, Tools, Prompts, Sampling via MCP.
              Implemented — released in 0.4.0.

loom/         Design documents in Weave/Thread graph layout.
  core-engine/
    core-engine/          ← Thread (idea + design + plans + done)
    id-management/        ← Thread
    weave-and-thread/     ← Thread
    link-index/           ← Thread
    ...                   ← more threads
  vscode-extension/
    vscode-extension/     ← Thread
    vscode-extension-visual/
    vscode-extension-toolbar/
    ...
  ai-integration/
  multi-workspace/
  docs-infra/
  workflow/
loom/refs/    Static architectural facts, patterns, API notes.
```

**Dependency rule:** `cli / vscode / mcp → app → core + fs`. Layers never import upward.
**Injection rule:** Every app use-case receives its dependencies explicitly via a `deps` argument.

---

## Key terminology

| Term | Meaning |
|------|---------|
| **Weave** | A project folder under `loom/`. Also the core domain entity (`Weave` interface). |
| **Thread** | A workstream subfolder inside a Weave (`loom/{weave}/{thread}/`). Contains an idea, a design, plans, done docs, and thread-level chats. The core entity is `Thread`. |
| **Loose fiber** | A doc at weave root (no thread). Idea or design that hasn't been grouped into a thread yet. |
| **Loom** | The tool itself (CLI + VS Code extension). Also a workspace instance. |
| **Plan** | An implementation plan doc (`*-plan-*.md`) with a steps table. Lives in `{thread}/plans/`. |
| **Design** | A design doc (`*-design.md`). Contains the design conversation log. Lives in `{thread}/`. |
| **Ctx** | A context summary doc, auto-generated or manually written. |

Thread layout: `loom/{weave-id}/{thread-id}/{thread-id}-idea.md`, `{thread-id}-design.md`, `plans/`, `done/`.

---

## Current active work

**Active design weaves:**
- `loom/vscode-extension/` — VS Code extension refactoring to use MCP (human surface)
  - New thread: `vscode-mcp-refactor/` — Refactor extension to call MCP instead of app
  - Existing thread: `vscode-extension/` — Original extension architecture (for reference)
- `loom/ai-integration/` — MCP server (agent surface), resources, tools, prompts, sampling

## VS Code Extension — Refactoring Plan

**Active refactor thread:**
- `loom/vscode-extension/vscode-mcp-refactor/` — Refactor VS Code extension to use MCP
  - Idea: Why we're refactoring (single source of truth, decoupling, consistency)
  - Design: Architecture, file structure, MCP client interface
  - Plan: 5 implementation steps (mcp-client.ts, tree view, commands, remove imports)

**Architecture change:**
- Before: `vscode → app → fs/core`
- After: `vscode → mcp → app → fs/core`

This makes the extension a thin UI client with no direct app imports.

---

## Build and test

**Always use `./scripts/build-all.sh` to build.** It compiles all packages in dependency order and re-links the global `loom` CLI so the MCP server picks up the changes. Never build individual packages with `tsc` or `npm run package` in a sub-package — they don't update the global install.

```bash
# Build all packages (always use this)
./scripts/build-all.sh

# Run full test suite
./scripts/test-all.sh

# Run individual tests
npx ts-node --project tests/tsconfig.json tests/multi-loom.test.ts
npx ts-node --project tests/tsconfig.json tests/commands.test.ts
npx ts-node --project tests/tsconfig.json tests/id-management.test.ts
npx ts-node --project tests/tsconfig.json tests/workspace-workflow.test.ts

# Run MCP integration tests (spawns loom mcp subprocess)
npx ts-node --project tests/tsconfig.json packages/mcp/tests/integration.test.ts

# Run CLI from source
npx ts-node packages/cli/src/index.ts status

# Migration script (for new repos still on flat layout)
npx ts-node --project tests/tsconfig.json scripts/migrate-to-threads.ts --dry-run
```

---

## Document frontmatter conventions

All docs use this canonical key order (enforced by `serializeFrontmatter`):

```yaml
---
type: idea | design | plan | ctx
id: kebab-case-id
title: "Human Readable Title"
status: draft | active | ...
created: YYYY-MM-DD
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
# design-specific:
role: primary | supporting
target_release: "0.x.0"
actual_release: null
---
```

**`requires_load`** lists workspace-relative document IDs that must be read before working on this doc.
Claude Code should honour this: read the listed docs before responding.

---

## MCP tools

> **MCP host availability:** the Loom MCP server only runs inside hosts that
> implement the MCP client protocol — **Claude Code (CLI), the Claude desktop
> app**, and other MCP-capable agents (Cursor, Continue, etc.). The
> **Claude VS Code extension does NOT support MCP today** — sessions running
> there cannot reach `loom://` resources or `loom_*` tools and must fall back
> to direct file edits (with the `⚠️ MCP unavailable — editing file directly`
> visibility prefix). The Loom VS Code extension (`packages/vscode/`) is a
> separate thing — it is itself an MCP *client* talking to the Loom MCP
> server, and is unrelated to whether the *Claude* VS Code extension hosts MCP.

### Claude Code config

Create `.mcp.json` in the **project root** (NOT `.claude/settings.json` — that file
is for permissions/hooks/env and does not honour `mcpServers`). For user-global
config use `~/.claude.json` instead.

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

Project-scoped MCP servers require one-time approval per project — run `claude`
interactively in the project root and approve `loom`, or use `claude /mcp`.
Verify with `claude mcp list`.

### Primary entry points

| Entry point | When to use |
|-------------|-------------|
| `loom://context/{docId}` resource (or `loom://context/thread/{weaveId}/{threadId}`) | Load the assembled context bundle (global/weave/thread ctx + parent chain + requires_load) for a doc or thread before working on it |
| `do-next-step` prompt | Get the next incomplete step with full context pre-loaded |
| `continue-thread` prompt | Review thread state and get a next-action suggestion |
| `validate-state` prompt | Review diagnostics and identify issues to fix |

### Rules

- **All writes to `loom/**/*.md` go through MCP tools** — frontmatter, body, state mutations, and prose edits alike (see the "AI session rules" hard rule below for the full breakdown and the gate hook that enforces it).
- Use `loom://context/{docId}` (or `loom://context/thread/{weaveId}/{threadId}`) before starting any thread work. The Unified Context Pipeline bundles everything the agent needs (global/weave/thread ctx, idea, design, active plan, requires_load refs) in a single read.
- `do-next-step` prompt is the primary workflow driver: call it with the active planId to get context + step instruction in one shot.
- **`loom_generate_*` tools use MCP sampling (server→client)** — the Loom MCP server calls back to the host to run inference. Two paths, different behavior:
  - **VS Code extension**: sampling works — the extension's `mcp-client.ts` advertises `{ sampling: {} }` and routes `sampling/createMessage` through its configured AI API key. Use `loom_generate_*` buttons freely.
  - **Claude Code CLI sessions**: sampling is intentionally blocked — Claude Code is already the AI; recursive server→client inference is not supported and returns `MethodNotFound`. **Create docs in a single call by passing `content` to `loom_create_*`** (idea/design/plan all accept it — the doc is born at version 1 with real content). Use `loom_update_doc` only for *later* edits to an existing doc, never as a second step right after creation.

---

## AI session rules

- **Chat Mode (default):** Respond naturally. Never modify frontmatter or files without explicit approval.
- **Action Mode:** Only when Rafa explicitly asks. Respond with a JSON proposal per the handshake protocol.
- **Never propose state changes** (version bumps, status transitions) without being asked.
- Rafa uses the name `Rafa` in `## Rafa:` headers. Respond under `## AI:`.
- Keep responses aligned with the ongoing design conversation in the document.
- **Chat docs are the conversation surface (always reply inside).** Whenever a chat doc (any file matching `*-chat.md` or `*-chat-NNN.md`, i.e. `type: chat` in frontmatter) is the active context of the session — Rafa asked you to read it, opened it in the IDE while discussing it, references a line/section inside it, or the previous turn was already written into it — every reply goes inside that doc, appended at the bottom under `## AI:`. This is not optional and does not require Rafa to repeat "reply inside" each turn. Once a chat doc is active, keep replying inside it for all follow-ups until Rafa explicitly says `close` or switches to a different chat doc. The terminal response should be a brief one-liner pointing at the appended reply, not a duplicate of the content.
- **Why this matters:** Chats are Loom's User↔AI collaboration medium and the durable context database. Replies that live only in the terminal disappear; replies inside the chat doc persist as part of the project's shared memory. Treat the chat doc as the canonical place the conversation lives.
- **MCP tools for ALL writes to `loom/**/*.md` (hard rule):** Every write to a Loom doc — frontmatter or body, new doc or existing, state mutation or prose edit — goes through a `loom_*` MCP tool. No exceptions for "small" edits, typo fixes, or appending a single line. Direct `Edit`/`Write`/`MultiEdit` to `loom/**/*.md` is **physically blocked** by the `loom-mcp-gate` PreToolUse hook (`.claude/hooks/loom-mcp-gate.ps1`); if you see the gate's deny message, switch to the right MCP tool — don't try to route around it.
  - Chats → `loom_append_to_chat`
  - New idea/design/plan/done → `loom_create_*` (or `loom_generate_*` if sampling is available)
  - Step progress → `loom_complete_step` / `loom_append_done`
  - Existing doc body or frontmatter → `loom_update_doc`
  - Renames/archives → `loom_rename` / `loom_archive`
  - Excluded from the gate: `loom/refs/*.md` (reference docs maintained by hand), `loom/.archive/**/*.md` (archived/deferred docs are frozen — no reducer to run), `CLAUDE.md` at repo root, anything under `packages/**`. Edits to those use normal `Edit`/`Write`.
  - If MCP is genuinely down (rare), output `⚠️ MCP unavailable — editing file directly`, ask Rafa to disable the hook via `/hooks` for this session, and proceed only with explicit go.
- **Treat MCP tool failures as findings, not friction.** If a `loom_*` tool returns the wrong shape, a malformed doc (missing Steps table, double type-suffix, broken frontmatter), or times out — stop, report what happened in the active chat, and let Rafa decide how to proceed. Routing around a buggy MCP tool by editing the file directly hides the bug; you've now also bypassed the very thing you were supposed to be testing.

### MCP visibility (required)

When calling any MCP tool, output one line before the call:
```
🔧 MCP: loom_tool_name(key="value", ...)
```

When reading any MCP resource, output:
```
📡 MCP: loom://resource-uri
```

If MCP is unavailable and you must fall back to direct file editing, output:
```
⚠️ MCP unavailable — editing file directly
```

This makes MCP usage visible. If you don't see these prefixes, either MCP is not running or the AI is bypassing it (which the rules forbid).

### Chat-reply context injection (required)

When replying inside a chat doc that lives in a thread (`loom/{weave}/{thread}/chats/...`):

- **First reply for this thread in the current conversation** — read the thread context (idea + design + active plan + any `requires_load` docs) before responding. Emit one visibility line per doc:
  ```
  📡 MCP: loom://context/{chat-id}?mode=chat
  📄 {thread}-idea.md — loaded for context
  📄 {thread}-design.md — loaded for context
  📄 {plan-id}.md — loaded for context  (only if an active plan exists)
  ```
  (The Unified Context Pipeline assembles global/weave/thread ctx + the chat's parent chain + requires_load; the chat itself is the target.)
- **Same thread, no `refine` / `generate` since last reply** — context is already in the conversation transcript. Do NOT re-read. Emit only the tool-call visibility line:
  ```
  🔧 MCP: loom_append_to_chat(id="{chat-id}")
  ```
- **Same thread, but a `refine` or `generate` ran since last reply** — re-read the context (it may have changed) and re-emit the doc-loaded visibility lines.

For a chat at weave root (loose fiber, no thread), load the parent doc(s) the chat refers to and emit `📄 {doc}.md — loaded for context` for each. No thread-scoped context call.

The "is this thread already in transcript?" decision lives **in the AI**, not in the MCP server — the server is stateless across calls and cannot see the LLM transcript.

---

## Session start protocol

**Order of operations at session start:**

1. **Load global ctx** — read [loom/ctx.md](loom/ctx.md). Emit `📘 loom-ctx loaded — global context ready` (or the failure variant if the read fails).
2. **Load vision and workflow** — read [loom/refs/vision-reference.md](loom/refs/vision-reference.md) (north star — what Loom is for, what manual steps it replaces; ground for the vision-check rule under Collaboration style) and [loom/refs/workflow-reference.md](loom/refs/workflow-reference.md) (canonical loop, phase definitions, and transitions). Emit `🌟 vision + workflow loaded` on success.
3. **Read active work from MCP** — `loom://state?status=active,implementing`. Emit `🧵 Active: <list of thread IDs>`. This replaces any hand-written "active work" pointer; MCP is the only source of truth.
4. **Call `do-next-step` prompt with the active planId.** This bundles:
   - Thread context (idea, design, current plan, requires_load docs)
   - Next incomplete step with instructions
   - Pre-filled `loom_complete_step` call ready to execute

After the `do-next-step` call, if context is loaded, output this block and **STOP**:

```
📋 Session start
> Active weave:  {weave-id}
> Active plan:   {plan title} — Step {N}
- Next step: {step description}

STOP — waiting for go
```

**Any time a doc is read because a rule requires it** (outside session start), output:
`📄 {filename} read as required`

---

## Non-negotiable stop rules

1. **After each step**: mark ✅ in the plan · state the next step + files that will be touched · **STOP** — wait for `go`. For ad-hoc tasks (no active plan), end every response with a `Next:` line: one sentence describing what comes next, or "waiting for direction." **Exception — explicit multi-step authorization:** when the user explicitly asks for a range or all steps in advance (e.g. "do steps 2–4", "do all remaining steps", "do the whole plan") via chat, Claude CLI, or the extension, continue through the authorized range without stopping between steps. Still mark ✅ and append the per-step done note as each completes. Rules 2 (error loop) and 3 (design decision) continue to interrupt the range — they always stop.
2. **Error loop**: after a 2nd consecutive failed fix — stop, write root-cause findings, wait for `go`. Never push forward blindly.
3. **Design decision**: when a decision affects architecture, API shape, or test design — explain options and trade-offs, **STOP** and wait.
4. **User says "STOP"**: respond with `Stopped.` only — nothing else.

---

## Collaboration style

- **Vision check (before any design proposal).** Before suggesting code, file changes, or architecture, state in one sentence which user-visible behavior in [loom/refs/vision-reference.md](loom/refs/vision-reference.md) this serves and which manual step it removes. If you cannot — if the proposal does not map to a vision element or replace a manual step — the proposal is probably wrong. Stop and ask before continuing. The cost of writing this sentence is one line; the cost of building the wrong thing is hours.
- Discuss design before implementing — Rafa thinks out loud and reaches better solutions through dialogue.
- When a design question is open, present trade-offs and ask — don't just pick one.
- If Rafa's proposal has a problem, explain it briefly then let him respond.
- Don't rush to write code or create files until the design feels settled.
- Do not make any changes until you have 95% confidence in what you need to build. Ask follow-up questions until you reach that confidence.
- Always choose the cleanest, most correct approach even if it is harder or slower. Patches and workarounds accumulate debt. If the clean approach requires more work, say so — never silently pick the easy path.
- **Correct path over short path.** When more than one fix or implementation route is available, choose the one that is architecturally sound and durable — the path that will still be right months from now — even if it requires more work, more files, or a wider refactor. Never trade correctness for speed. A patch that masks a root cause is a future bug with interest accrued: the next failure will be harder to diagnose because the symptom will have shifted. Before proposing a fix, name the root cause out loud; if your proposal does not address it, say so explicitly and justify why a workaround is acceptable here. Default is always: fix the cause, not the symptom.

---

## Applied learning

- Ask Rafa if something is not clear before proceeding.
- Clean approach always preferred — state the extra cost, never silently patch.
- Reducers must stay pure — no filesystem or VS Code calls inside reducer functions.
- `buildLinkIndex` must be called once per `getState`, then passed to `loadThread` — never N+1.
- Cross-plan blockers in `isStepBlocked`: missing plan = blocked, existing plan = not blocked (best-effort).
- `generatePlanId` regex matches plan IDs not filenames — no `.md` suffix in the pattern.
- `getState()` is internal to MCP — extension must never call it directly. All state through MCP resources.
