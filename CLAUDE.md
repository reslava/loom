# CLAUDE.md — REslava Loom Session Contract

## Required session-start context

**Always load [loom/loom-ctx.md](loom/loom-ctx.md) at the beginning of every session.**
It is the global ctx doc — concept, architecture, and operating rules in one place.
Read it before responding to the first user turn. This emulates the auto-loaded
global context that ctx-typed docs are designed to provide in Loom.

After reading it, output exactly this line so Rafa knows the global context is loaded:

```
📘 loom-ctx loaded — global context ready
```

If the read fails for any reason, output `⚠️ loom-ctx not loaded — proceeding without global context` instead, and continue.

---

## What this project is

**REslava Loom** is a document-driven, event-sourced workflow system for AI-assisted development.
Markdown files are the database. State is derived. AI collaborates step-by-step with human approval.

This repository *uses its own workflow* to build itself. The `loom/` directory contains the living
design documents. The `packages/` directory contains the implementation.

---

## Stage

**Stage 2 — MCP Active.** All state is served through MCP. No manual `_status.md` file.
Claude Code and CLI both route through MCP for all state reads and mutations.

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

```bash
# Build all packages
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

<!-- ═══════════════════════════════════════════════════════════════════════════
  MCP tools (Stage 2)

  Toggle: comment out this entire block (from the opening comment to the
  closing comment) to fall back to Stage 1 manual mode at any time.
═══════════════════════════════════════════════════════════════════════════ -->

## MCP tools (Stage 2)

> **Fallback toggle:** To revert to Stage 1 manual mode, comment out this
> entire section. The manual workflow (direct file edits following frontmatter
> conventions) remains valid as a fallback at all times.

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

Add this to `{workspace}/.claude/mcp.json` (project-scoped) or `~/.claude.json` (global):

```json
{
  "mcpServers": {
    "loom": {
      "command": "loom",
      "args": ["mcp"],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

### Primary entry points

| Entry point | When to use |
|-------------|-------------|
| `loom://thread-context/{weaveId}/{threadId}` resource | Load full context for a thread before working on it |
| `do-next-step` prompt | Get the next incomplete step with full context pre-loaded |
| `continue-thread` prompt | Review thread state and get a next-action suggestion |
| `validate-state` prompt | Review diagnostics and identify issues to fix |

### Rules

- **All Loom state mutations must go through MCP tools** — create doc, mark step done, rename, archive, promote. Never edit weave markdown files directly to change state — doing so bypasses reducers, link index, and plan-step validation.
- Use `loom://thread-context` before starting any thread work. It bundles everything the agent needs (idea, design, active plan, requires_load refs) in a single read.
- `do-next-step` prompt is the primary workflow driver: call it with the active planId to get context + step instruction in one shot.
- `loom_generate_*` tools require sampling support from the MCP client (Claude Code only). If sampling is unavailable, use `loom_create_*` tools manually.

<!-- end MCP tools (Stage 2) -->

---

## AI session rules

- **Chat Mode (default):** Respond naturally. Never modify frontmatter or files without explicit approval.
- **Action Mode:** Only when Rafa explicitly asks. Respond with a JSON proposal per the handshake protocol.
- **Never propose state changes** (version bumps, status transitions) without being asked.
- Rafa uses the name `Rafa` in `## Rafa:` headers. Respond under `## AI:`.
- Keep responses aligned with the ongoing design conversation in the document.
- **Chat docs are the conversation surface (always reply inside).** Whenever a `-chat.md` doc is the active context of the session — Rafa asked you to read it, opened it in the IDE while discussing it, references a line/section inside it, or the previous turn was already written into it — every reply goes inside that doc, appended at the bottom under `## AI:`. This is not optional and does not require Rafa to repeat "reply inside" each turn. Once a chat doc is active, keep replying inside it for all follow-ups until Rafa explicitly says `close` or switches to a different chat doc. The terminal response should be a brief one-liner pointing at the appended reply, not a duplicate of the content.
- **Why this matters:** Chats are Loom's User↔AI collaboration medium and the durable context database. Replies that live only in the terminal disappear; replies inside the chat doc persist as part of the project's shared memory. Treat the chat doc as the canonical place the conversation lives.
- **MCP tools for Loom state changes:** All Loom state mutations (create doc, mark step done, rename, archive, promote) must go through MCP tools once MCP is active. Never edit weave markdown files directly to change state — doing so bypasses reducers, link index, and plan-step validation.

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

---

## Session start protocol

**Order of operations at session start:**

1. **Load global ctx** — read [loom/loom-ctx.md](loom/loom-ctx.md). Emit `📘 loom-ctx loaded — global context ready` (or the failure variant if the read fails).
2. **Read active work from MCP** — `loom://state?status=active,implementing`. Emit `🧵 Active: <list of thread IDs>`. This replaces any hand-written "active work" pointer; MCP is the only source of truth.
3. **Call `do-next-step` prompt with the active planId.** This bundles:
   - Thread context (idea, design, current plan, requires_load docs)
   - Next incomplete step with instructions
   - Pre-filled `loom_complete_step` call ready to execute

**No manual `.loom/_status.md` file** — MCP's `loom://state` resource is the only source of truth.

After the `do-next-step` call, if context is loaded, output this block and **STOP**:

```
📋 Session start  [Stage 2 — MCP]
> Active weave:  {weave-id}
> Active plan:   {plan title} — Step {N}
- Next step: {step description}

STOP — waiting for go
```

**Any time a doc is read because a rule requires it** (outside session start), output:
`📄 {filename} read as required`

---

## Non-negotiable stop rules

1. **After each step**: mark ✅ in the plan · state the next step + files that will be touched · **STOP** — wait for `go`. For ad-hoc tasks (no active plan), end every response with a `Next:` line: one sentence describing what comes next, or "waiting for direction."
2. **Error loop**: after a 2nd consecutive failed fix — stop, write root-cause findings, wait for `go`. Never push forward blindly.
3. **Design decision**: when a decision affects architecture, API shape, or test design — explain options and trade-offs, **STOP** and wait.
4. **User says "STOP"**: respond with `Stopped.` only — nothing else.

---

## Collaboration style

- Discuss design before implementing — Rafa thinks out loud and reaches better solutions through dialogue.
- When a design question is open, present trade-offs and ask — don't just pick one.
- If Rafa's proposal has a problem, explain it briefly then let him respond.
- Don't rush to write code or create files until the design feels settled.
- Do not make any changes until you have 95% confidence in what you need to build. Ask follow-up questions until you reach that confidence.
- Always choose the cleanest, most correct approach even if it is harder or slower. Patches and workarounds accumulate debt. If the clean approach requires more work, say so — never silently pick the easy path.

---

## Applied learning

- `CLAUDE.md` is gitignored — changes are local only, never committed.
- Ask Rafa if something is not clear before proceeding.
- Clean approach always preferred — state the extra cost, never silently patch.
- Reducers must stay pure — no filesystem or VS Code calls inside reducer functions.
- `buildLinkIndex` must be called once per `getState`, then passed to `loadThread` — never N+1.
- Cross-plan blockers in `isStepBlocked`: missing plan = blocked, existing plan = not blocked (best-effort).
- `generatePlanId` regex matches plan IDs not filenames — no `.md` suffix in the pattern.
- Stage 2: `getState()` is internal to MCP — extension must never call it directly. All state through MCP resources.
