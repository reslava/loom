# CLAUDE.md — REslava Loom Session Contract (Stage 2 / MCP)

> **This is the target CLAUDE.md for when Loom's MCP server is live.**
> Replace `CLAUDE.md` with this content once `packages/mcp/` ships and MCP is the active agent surface.
> Maintained at `references/CLAUDE-reference.md` during development.

---

## What this project is

**REslava Loom** is a document-driven, event-sourced workflow system for AI-assisted development.
Markdown files are the database. State is derived. AI collaborates step-by-step with human approval.

Loom is the AI agent's **persistent project memory** — a markdown document graph (weaves → threads →
ideas → designs → plans → done) that any MCP-compatible agent can read, write, and reason over.
It gives stateless AI agents persistent context, workflow state, and approval gates so multi-session
work stays coherent.

This repository *uses its own workflow* to build itself. The `weaves/` directory contains the living
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
  vscode/     Human surface. Tree view, commands, toolbar, inline buttons.
  mcp/        Agent surface. Resources, Tools, Prompts, Sampling via MCP.

weaves/       Design documents in Weave/Thread graph layout.
references/   Static architectural facts, patterns, API notes.
```

**Dependency rule:** `cli / vscode / mcp → app → core + fs`. Layers never import upward.
**Injection rule:** Every app use-case receives its dependencies explicitly via a `deps` argument.
**MCP rule:** All Loom state mutations must go through MCP tools. Never edit weave files directly.

---

## Key terminology

| Term | Meaning |
|------|---------|
| **Weave** | A project folder under `weaves/`. Also the core domain entity (`Weave` interface). |
| **Thread** | A workstream subfolder inside a Weave. Contains idea, design, plans, done docs, chats. |
| **Loose fiber** | A doc at weave root (no thread). Idea or design not yet grouped into a thread. |
| **Loom** | The tool itself (CLI + VS Code extension + MCP server). Also a workspace instance. |
| **Plan** | An implementation plan doc (`*-plan-*.md`) with a steps table. Lives in `{thread}/plans/`. |
| **Design** | A design doc (`*-design.md`). Contains the design conversation log. |
| **Ctx** | A context summary doc, AI-generated. Three scopes: global, weave, thread. |

Thread layout: `weaves/{weave-id}/{thread-id}/{thread-id}-idea.md`, `{thread-id}-design.md`, `plans/`, `done/`.

---

## MCP integration

Loom is configured as an MCP server in Claude Code's settings:

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

**Primary entry points for agents:**

| Entry point | When to use |
|-------------|-------------|
| `loom://thread-context/{weaveId}/{threadId}` | Starting work on a specific thread — loads idea + design + active plan + ctx |
| `loom://state` | Getting full project state JSON (filterable with `?weaveId=&threadId=`) |
| `do-next-step` prompt | Implementing the next step in an active plan |
| `continue-thread` prompt | Proposing the next action on a thread |
| `weave-idea / weave-design / weave-plan` prompts | Guided doc creation via sampling |

**Key tools:**

- `loom_complete_step` — mark a plan step done (idempotent)
- `loom_create_idea / design / plan / chat` — create Loom docs
- `loom_update_doc` — rewrite doc content, preserve frontmatter
- `loom_promote` — idea → design → plan, chat → idea
- `loom_refresh_ctx` — regenerate ctx summary via sampling (pass no args for global ctx)
- `loom_rename` / `loom_archive` / `loom_get_stale_docs`

**Key resources:**

- `loom://state?weaveId=&threadId=` — full Loom state JSON, filterable
- `loom://thread-context/{weaveId}/{threadId}?mode=` — bundled context for a thread
- `loom://plan/{id}` — plan doc with parsed steps array
- `loom://requires-load/{id}` — recursively resolved `requires_load` chain
- `loom://diagnostics` — broken links, dangling child_ids

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

# Run CLI from source
npx ts-node packages/cli/src/index.ts status

# Start MCP server (stdio, for testing)
loom mcp
```

---

## Document frontmatter conventions

All docs use this canonical key order (enforced by `serializeFrontmatter`):

```yaml
---
type: idea | design | plan | done | chat | ctx | reference
id: kebab-case-id
title: "Human Readable Title"
status: draft | active | implementing | done | archived
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
design_version: 1        # plan field — stale when < parent design.version
# reference-specific:
load: always | by-request
load_when: [idea, design, plan, implementing]
---
```

**`requires_load`** lists doc IDs that must be read before working on this doc. Claude Code should
honour this: read the listed docs before responding. The MCP resource `loom://requires-load/{id}`
resolves the full chain recursively.

**`load_when`** controls which reference docs auto-include at each operation mode, saving tokens.
`loom://thread-context?mode=implementing` applies this filter automatically.

---

## Ctx hierarchy

Three layers. Read from global → weave → thread for orientation; thread-level ctx is the most specific.

```
weaves/ctx.md                          ← global ctx
weaves/{weave}/ctx.md                  ← weave ctx
weaves/{weave}/{thread}/ctx/           ← thread ctx
```

- **Global ctx** (`weaves/ctx.md`) — architecture refs + `load: always` docs + active weaves roster + project health
- **Weave ctx** — all threads in weave, statuses, active plan summary, key decisions
- **Thread ctx** — idea + design decisions + plan progress + open questions

Ctx docs are AI-generated. Regenerate stale ones with `loom_refresh_ctx`. Check staleness with `loom_get_stale_docs`.

---

## AI session rules

- **Chat Mode (default):** Respond naturally. Never modify frontmatter or files without explicit approval.
- **Action Mode:** Only when Rafa explicitly asks. Respond with a JSON proposal per the handshake protocol.
- **Never propose state changes** (version bumps, status transitions) without being asked.
- Rafa uses the name `Rafa` in `## Rafa:` headers. Respond under `## AI:`.
- Keep responses aligned with the ongoing design conversation in the document.
- **When asked to read a file ending in `-chat.md`**: reply by writing inside that doc at the bottom under `## AI:`. Continue replying inside the doc for all follow-up messages until Rafa says `close`.
- **MCP tools for Loom state changes:** All Loom state mutations (create doc, mark step done, rename, archive, promote) must go through MCP tools. Never edit weave markdown files directly to change state — doing so bypasses reducers, link index, and plan-step validation.

---

## Session start protocol

**These reads are mandatory at the start of every session.**

1. Read `weaves/ctx.md` — global ctx: overall project state, active weaves, recent decisions.
2. If working on a specific thread, call `loom://thread-context/{weaveId}/{threadId}` — loads idea + design + active plan + ctx bundle.
3. If implementing a plan step, use the `do-next-step` prompt — it auto-loads all `requires_load` docs.

After completing the reads, output this block and **STOP**:

```
📋 Session start
> Active weave:  {weave-id}
> Active thread: {thread-id}
> Active plan:   {plan title} — Step {N}  (or "no active plan")
- Docs read: {doc1} ✓ · {doc2} ✓ · ...
- Last session: {date} — {summary}

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

- Ask Rafa if something is not clear before proceeding.
- Clean approach always preferred — state the extra cost, never silently patch.
- Reducers must stay pure — no filesystem or VS Code calls inside reducer functions.
- `getState()` is the single query entry point — never traverse files directly from the extension.
- `buildLinkIndex` must be called once per `getState`, then passed to `loadThread` — never N+1.
- Cross-plan blockers in `isStepBlocked`: missing plan = blocked, existing plan = not blocked (best-effort).
- `generatePlanId` regex matches plan IDs not filenames — no `.md` suffix in the pattern.
- MCP is a delivery layer — always delegate to `app`. If a use case doesn't exist in `app`, implement it there first, then wrap in the MCP tool. No bypassing.
- `loom_complete_step` must be idempotent — safe to call twice, no double-marking.
- Global ctx (`weaves/ctx.md`) should be the first thing an agent reads. Regenerate if stale before starting session work.
