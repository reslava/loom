# CLAUDE.md — Loom Session Contract

> **This is the Loom template for end users.**
> Run `loom init` to inject the Loom-managed section into your existing `CLAUDE.md`.
> Loom only touches content between `<!-- loom:start -->` and `<!-- loom:end -->` markers.
> Everything outside those markers belongs to you and is never modified.

---

<!-- loom:start -->

## Loom — AI Agent Persistent Memory

**Loom** is a document-driven workflow system installed in this project. It gives AI agents
persistent context, workflow state, and approval gates so multi-session work stays coherent.

Loom stores all project memory as markdown files in `weaves/` and `references/`. The AI agent
reads and writes this memory via the Loom MCP server.

### Loom MCP config

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

### Primary agent entry points

| Entry point | When to use |
|-------------|-------------|
| `loom://thread-context/{weaveId}/{threadId}` | Starting work on a specific thread — loads idea + design + active plan + ctx |
| `loom://state` | Getting full project state (filterable with `?weaveId=&threadId=`) |
| `do-next-step` prompt | Implementing the next plan step — auto-loads all required context |
| `continue-thread` prompt | Proposing the next action on a thread |

### MCP tools rule

All Loom state mutations (create doc, mark step done, rename, archive, promote) must go through
MCP tools. Never edit weave markdown files directly — doing so bypasses reducers, link index,
and plan-step validation.

### Session start protocol

At the start of every session:

1. Read `weaves/ctx.md` — global ctx: overall project state, active weaves, recent decisions.
2. If working on a specific thread, call `loom://thread-context/{weaveId}/{threadId}`.
3. If implementing a plan step, use the `do-next-step` prompt — it loads all `requires_load` docs automatically.

Output this block and **STOP**:

```
📋 Session start
> Active weave:  {weave-id}
> Active thread: {thread-id}
> Active plan:   {plan title} — Step {N}  (or "no active plan")
- Docs read: {doc1} ✓ · {doc2} ✓ · ...

STOP — waiting for go
```

**Any time a doc is read because a rule requires it**, output: `📄 {filename} read as required`

### Ctx hierarchy

```
weaves/ctx.md                          ← global ctx  (read first)
weaves/{weave}/ctx.md                  ← weave ctx
weaves/{weave}/{thread}/ctx/           ← thread ctx  (most specific)
```

Prefer ctx docs over raw source docs when ctx is fresh. Check staleness with `loom_get_stale_docs`.
Regenerate with `loom_refresh_ctx`.

### Key terminology

| Term | Meaning |
|------|---------|
| **Weave** | A workstream folder under `weaves/`. Groups related threads. |
| **Thread** | A subfolder inside a Weave. Contains idea, design, plans, done docs, chats. |
| **Plan** | An implementation plan doc with a numbered steps table. Lives in `{thread}/plans/`. |
| **Ctx** | An AI-generated context summary. Three scopes: global, weave, thread. |
| **`requires_load`** | Frontmatter field listing doc IDs the agent must read before working on this doc. |

### Document frontmatter

```yaml
---
type: idea | design | plan | done | chat | ctx
id: kebab-case-id
title: "Human Readable Title"
status: draft | active | implementing | done | archived
created: YYYY-MM-DD
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
```

**`requires_load`** is enforced: read listed docs before responding to any request about this doc.
The MCP resource `loom://requires-load/{id}` resolves the full chain recursively.

### Non-negotiable stop rules

1. **After each step**: mark ✅ in the plan · state the next step · **STOP** — wait for `go`.
   For ad-hoc tasks, end every response with `Next:` — one sentence on what comes next.
2. **Error loop**: after 2nd consecutive failed fix — stop, write root-cause findings, wait.
3. **Design decision**: when a decision affects architecture or API shape — explain options and trade-offs, **STOP** and wait.
4. **User says "STOP"**: respond with `Stopped.` only.

<!-- loom:end -->

---

<!-- CUSTOMIZE: Add your project-specific content below this line -->

## What this project is

<!-- Describe your project here -->

## Architecture

<!-- Describe your project's architecture, packages, and dependency rules here -->

## Build and test

```bash
# Add your build and test commands here
```

## Current active work

<!-- Loom will read this from weaves/ctx.md at session start. You can add manual notes here. -->

## Collaboration style

<!-- Add your preferred working style, tone, and decision-making preferences here -->

## Applied learning

<!-- Add project-specific lessons learned, gotchas, and conventions here -->
