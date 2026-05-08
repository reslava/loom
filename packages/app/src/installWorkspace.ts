import * as fs from 'fs-extra';
import * as path from 'path';
import { initLocal } from './init';
import { ConfigRegistry } from '../../core/dist/registry';

export interface InstallWorkspaceInput {
    force?: boolean;
}

export interface InstallWorkspaceDeps {
    fs: typeof fs;
    registry: ConfigRegistry;
    cwd: string;
}

export interface InstallWorkspaceResult {
    path: string;
    loomDirCreated: boolean;
    claudeMdWritten: boolean;
    rootClaudeMdPatched: boolean;
    mcpJsonWritten: boolean;
    loomCtxWritten: boolean;
}

const LOOM_CLAUDE_MD = `# Loom Session Contract

> **Maintainer note (Loom repo only):** this file is the project-agnostic
> CLAUDE.md installed by \`loom install\`. The Loom repo also has its own
> recursive \`CLAUDE.md\` at the repo root with project-specific rules. The
> two MUST stay in sync — every rule shared by both surfaces (session
> rules, MCP visibility, chat-reply context injection, stop rules, session
> start protocol) lives in both files. See the sync rule in the recursive
> CLAUDE.md.

## What Loom is

**Loom** is a document-driven, event-sourced workflow system for AI-assisted development.
Markdown files are the database. State is derived. AI collaborates step-by-step with human approval.

---

## Key terminology

| Term | Meaning |
|------|---------|
| **Weave** | A project folder under \`loom/\`. The core domain entity. |
| **Thread** | A workstream subfolder inside a Weave (\`loom/{weave}/{thread}/\`). Contains idea, design, plans, done docs, chats. |
| **Plan** | An implementation plan doc (\`*-plan-*.md\`) with a steps table. Lives in \`{thread}/plans/\`. |
| **Design** | A design doc (\`*-design.md\`). Contains the design conversation log. |

Thread layout: \`loom/{weave-id}/{thread-id}/{thread-id}-idea.md\`, \`{thread-id}-design.md\`, \`plans/\`, \`done/\`.

---

## MCP tools

> **MCP host availability:** the Loom MCP server only runs inside hosts that
> implement the MCP client protocol — **Claude Code (CLI), the Claude desktop
> app**, and other MCP-capable agents. The **Claude VS Code extension does NOT
> support MCP today** — sessions running there cannot reach \`loom://\` resources
> or \`loom_*\` tools and must fall back to direct file edits (with the
> \`⚠️ MCP unavailable — editing file directly\` visibility prefix).

### Claude Code config

Create this as \`.mcp.json\` in the **project root** (NOT \`.claude/settings.json\` —
that file is for permissions/hooks/env and ignores \`mcpServers\`):

\`\`\`json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "loom",
      "args": ["mcp"],
      "env": {
        "LOOM_ROOT": "\${workspaceFolder}"
      }
    }
  }
}
\`\`\`

Project-scoped MCP servers need a one-time approval per project — run \`claude\`
interactively in the project root and approve the \`loom\` server, or use
\`claude /mcp\` to manage. Verify with \`claude mcp list\`.

### Primary entry points

| Entry point | When to use |
|-------------|-------------|
| \`loom://thread-context/{weaveId}/{threadId}\` resource | Load full context for a thread before working on it |
| \`do-next-step\` prompt | Get the next incomplete step with full context pre-loaded |
| \`continue-thread\` prompt | Review thread state and get a next-action suggestion |
| \`validate-state\` prompt | Review diagnostics and identify issues to fix |

### Rules

- **All writes to \`loom/**/*.md\` go through MCP tools** — frontmatter, body, state mutations, and prose edits alike (see the "AI session rules" hard rule below for the full breakdown and the gate hook that enforces it).
- Use \`loom://thread-context\` before starting any thread work.
- \`do-next-step\` prompt is the primary workflow driver: call it with the active planId to get context + step instruction.
- **\`loom_generate_*\` tools use MCP sampling (server→client)** — the Loom MCP server calls back to the host to run inference. Two paths:
  - **VS Code extension**: sampling works — the extension advertises \`{ sampling: {} }\` and routes \`sampling/createMessage\` through its configured AI API key.
  - **Claude Code CLI sessions**: sampling is intentionally blocked — Claude Code is already the AI; recursive server→client inference returns \`MethodNotFound\`. **Always use \`loom_create_*\` + \`loom_update_doc\`** instead: create the doc shell, then write content directly.

---

## AI session rules

- **Chat Mode (default):** Respond naturally. Never modify frontmatter or files without explicit approval.
- **Action Mode:** Only when the user explicitly asks. Respond with a JSON proposal per the handshake protocol.
- **Never propose state changes** (version bumps, status transitions) without being asked.
- **Chat docs are the conversation surface (always reply inside).** Whenever a \`-chat.md\` doc is the active context of the session — the user asked you to read it, opened it in the IDE while discussing it, references a line/section inside it, or the previous turn was already written into it — every reply goes inside that doc, appended at the bottom under \`## AI:\`. This is not optional and does not require the user to repeat "reply inside" each turn. Once a chat doc is active, keep replying inside it for all follow-ups until the user explicitly says \`close\` or switches to a different chat doc. The terminal response should be a brief one-liner pointing at the appended reply, not a duplicate of the content.
- **Why this matters:** Chats are Loom's User↔AI collaboration medium and the durable context database. Replies that live only in the terminal disappear; replies inside the chat doc persist as part of the project's shared memory.
- **MCP tools for ALL writes to \`loom/**/*.md\` (hard rule):** Every write to a Loom doc — frontmatter or body, new doc or existing, state mutation or prose edit — goes through a \`loom_*\` MCP tool. No exceptions for "small" edits, typo fixes, or appending a single line. If a \`loom-mcp-gate\` PreToolUse hook is installed in this workspace, direct \`Edit\`/\`Write\`/\`MultiEdit\` to \`loom/**/*.md\` is **physically blocked**; if you see a deny from the gate, switch to the right MCP tool — don't route around it.
  - Chats → \`loom_append_to_chat\`
  - New idea/design/plan/done → \`loom_create_*\` (or \`loom_generate_*\` if sampling is available)
  - Step progress → \`loom_complete_step\` / \`loom_append_done\`
  - Existing doc body or frontmatter → \`loom_update_doc\`
  - Renames/archives → \`loom_rename\` / \`loom_archive\`
  - Excluded from the gate: \`loom/refs/*.md\`, \`loom/.archive/**/*.md\`, repo-root \`CLAUDE.md\`, anything outside \`loom/\`. Edits to those use normal \`Edit\`/\`Write\`.
  - If MCP is genuinely down, output \`⚠️ MCP unavailable — editing file directly\`, ask the user to disable the gate hook via \`/hooks\`, and proceed only with explicit go.
- **Treat MCP tool failures as findings, not friction.** If a \`loom_*\` tool returns the wrong shape, a malformed doc (missing Steps table, double type-suffix, broken frontmatter), or times out — stop, report what happened in the active chat, and let the user decide how to proceed. Routing around a buggy MCP tool by editing the file directly hides the bug.

### MCP visibility (required)

Before any MCP call, output one line:
\`\`\`
🔧 MCP: loom_tool_name(key="value", ...)
📡 MCP: loom://resource-uri
\`\`\`

If MCP is unavailable, output:
\`\`\`
⚠️ MCP unavailable — editing file directly
\`\`\`

### Chat-reply context injection (required)

When replying inside a chat doc that lives in a thread (\`loom/{weave}/{thread}/chats/...\`):

- **First reply for this thread in the current conversation** — read the thread context (idea + design + active plan + any \`requires_load\` docs) before responding. Emit one visibility line per doc:
  \`\`\`
  📡 MCP: loom://thread-context/{weave}/{thread}
  📄 {thread}-idea.md — loaded for context
  📄 {thread}-design.md — loaded for context
  📄 {plan-id}.md — loaded for context  (only if an active plan exists)
  \`\`\`
- **Same thread, no \`refine\` / \`generate\` since last reply** — context is already in the conversation transcript. Do NOT re-read. Emit only the tool-call visibility line:
  \`\`\`
  🔧 MCP: loom_append_to_chat(id="{chat-id}")
  \`\`\`
- **Same thread, but a \`refine\` or \`generate\` ran since last reply** — re-read the context (it may have changed) and re-emit the doc-loaded visibility lines.

For a chat at weave root (loose fiber, no thread), load the parent doc(s) the chat refers to and emit \`📄 {doc}.md — loaded for context\` for each.

The "is this thread already in transcript?" decision lives **in the AI**, not in the MCP server — the server is stateless across calls and cannot see the LLM transcript.

---

## Session start protocol

**Order of operations at session start (mandatory, including after conversation compaction):**

1. **Load global ctx** — read \`loom/loom-ctx.md\`. Emit:
   \`\`\`
   📘 loom-ctx loaded — global context ready
   \`\`\`
   (or \`⚠️ loom-ctx not loaded — proceeding without global context\` on failure).
2. **Read active work from MCP** — \`loom://state?status=active,implementing\`. Emit \`🧵 Active: <thread IDs>\`. MCP is the only source of truth — do not maintain a hand-written active-work pointer.
3. **Call \`do-next-step\` prompt** with the active planId. Bundles thread context (idea, design, current plan, requires_load docs), the next incomplete step, and a pre-filled \`loom_complete_step\` call.

After the reads, output this block and **STOP**:

\`\`\`
📋 Session start
> Active weave:  {weave-id}
> Active plan:   {plan title} — Step {N}  (or "no active plan")
- Next step: {step description}

STOP — waiting for go
\`\`\`

---

## Non-negotiable stop rules

1. **After each step**: mark ✅ in the plan · state the next step + files that will be touched · **STOP** — wait for \`go\`.
2. **Error loop**: after a 2nd consecutive failed fix — stop, write root-cause findings, wait for \`go\`.
3. **Design decision**: when a decision affects architecture, API shape, or test design — explain options and trade-offs, **STOP** and wait.
4. **User says "STOP"**: respond with \`Stopped.\` only — nothing else.

---

## Collaboration style

- Discuss design before implementing — think out loud and reach better solutions through dialogue.
- When a design question is open, present trade-offs and ask — don't just pick one.
- Do not make any changes until you have 95% confidence. Ask follow-up questions until you reach that confidence.
- Always choose the cleanest, most correct approach. If it requires more work, say so.
`;

const LOOM_CTX_MD = `---
type: ctx
id: loom-ctx
title: "Loom — Global Context"
status: active
created: ${new Date().toISOString().slice(0, 10)}
version: 1
tags: [ctx, vision, architecture, session-start]
parent_id: null
child_ids: []
requires_load: []
load: always
---

# Loom — Global Context

**Read at the start of every session.** Concept, architecture, and operating rules.

## 1. Concept

Loom is a **collaboration medium between User and AI**, where **markdown documents
are the shared context database**.

The loop:
1. **User and AI talk in chats** — free-form thinking surface.
2. The user clicks a button to ask the AI to **formalize** a conversation into an
   *idea*, *design*, or *plan*.
3. The user clicks another button to ask the AI to **implement the next step** of a
   plan. The AI writes code and records what it did in the matching \`-done.md\`.
4. The chat keeps going as the conversation log.

Buttons must do real work, not flip state.

## 2. Architecture

**Stage 2 layers:** \`cli / vscode → mcp → app → core + fs\`. Layers never import
upward. The VS Code extension **must not** import \`app\` directly — MCP is the gate.

## Glossary

- **Weave** — a project folder under \`loom/\`; the core domain entity.
- **Thread** — workstream subfolder inside a weave; holds idea + design + plans + done + chats.
- **Loose fiber** — a doc at weave root, not yet grouped into a thread.
- **Plan** — implementation plan with a steps table (\`*-plan-NNN.md\`).
- **Done** — post-implementation notes (\`*-done.md\`).
- **Chat** — User↔AI conversation log (\`*-chat.md\`).
- **Ctx** — AI-optimised context summary; auto-loaded.

## 3. Rules

- **Stage 2 — MCP active.** All Loom state mutations go through MCP tools.
- **Primary entry point:** \`loom://thread-context/{weaveId}/{threadId}\` and the
  \`do-next-step\` prompt.
- **Chat docs are the conversation surface.** When a \`-chat.md\` doc is the active
  context, every reply goes inside it under \`## AI:\`.
- **MCP visibility:** before each MCP call, output \`🔧 MCP: tool_name(...)\` or
  \`📡 MCP: loom://...\`. If MCP is unavailable: \`⚠️ MCP unavailable — editing file directly\`.
- **Stop rules:** after each step, two failed fixes, or any architectural decision —
  STOP and wait for \`go\`.
`;

const MCP_JSON = JSON.stringify({
    mcpServers: {
        loom: {
            type: 'stdio',
            command: 'loom',
            args: ['mcp'],
            env: {
                LOOM_ROOT: '${workspaceFolder}',
            },
        },
    },
}, null, 2);

export async function installWorkspace(
    input: InstallWorkspaceInput,
    deps: InstallWorkspaceDeps
): Promise<InstallWorkspaceResult> {
    const root = deps.cwd;
    const loomDir = path.join(root, '.loom');
    const loomClaudeMdPath = path.join(loomDir, 'CLAUDE.md');
    const rootClaudeMdPath = path.join(root, 'CLAUDE.md');
    const mcpJsonPath = path.join(root, '.mcp.json');
    const loomDocsDir = path.join(root, 'loom');
    const loomCtxPath = path.join(loomDocsDir, 'loom-ctx.md');

    // Step 1: init .loom/ structure (idempotent if exists)
    let loomDirCreated = false;
    if (!deps.fs.existsSync(loomDir)) {
        await initLocal({ force: input.force }, { fs: deps.fs, registry: deps.registry });
        loomDirCreated = true;
    } else if (input.force) {
        await initLocal({ force: true }, { fs: deps.fs, registry: deps.registry });
        loomDirCreated = true;
    }

    // Step 2: write .loom/CLAUDE.md
    deps.fs.ensureDirSync(loomDir);
    deps.fs.writeFileSync(loomClaudeMdPath, LOOM_CLAUDE_MD, 'utf8');
    const claudeMdWritten = true;

    // Step 3: patch root CLAUDE.md
    const importLine = '@.loom/CLAUDE.md';
    let rootClaudeMdPatched = false;
    if (deps.fs.existsSync(rootClaudeMdPath)) {
        const existing = deps.fs.readFileSync(rootClaudeMdPath, 'utf8');
        if (!existing.includes(importLine)) {
            deps.fs.writeFileSync(rootClaudeMdPath, `${importLine}\n\n${existing}`, 'utf8');
            rootClaudeMdPatched = true;
        }
    } else {
        deps.fs.writeFileSync(rootClaudeMdPath, `${importLine}\n`, 'utf8');
        rootClaudeMdPatched = true;
    }

    // Step 4: write .mcp.json at project root (skip if exists and not --force)
    let mcpJsonWritten = false;
    if (!deps.fs.existsSync(mcpJsonPath) || input.force) {
        deps.fs.writeFileSync(mcpJsonPath, MCP_JSON, 'utf8');
        mcpJsonWritten = true;
    }

    // Step 5: ensure standard loom/ subdirectories exist
    deps.fs.ensureDirSync(loomDocsDir);
    deps.fs.ensureDirSync(path.join(loomDocsDir, 'chats'));
    deps.fs.ensureDirSync(path.join(loomDocsDir, 'refs'));
    deps.fs.ensureDirSync(path.join(loomDocsDir, '.archive'));
    let loomCtxWritten = false;
    if (!deps.fs.existsSync(loomCtxPath) || input.force) {
        deps.fs.writeFileSync(loomCtxPath, LOOM_CTX_MD, 'utf8');
        loomCtxWritten = true;
    }

    return { path: root, loomDirCreated, claudeMdWritten, rootClaudeMdPatched, mcpJsonWritten, loomCtxWritten };
}
