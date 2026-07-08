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

**Shared rules are mechanically enforced, not just remembered.** Every rule that exists in *both* surfaces is tagged with a stable `<!-- rule:{id} -->` marker, placed immediately before the rule/section in both files. `tests/claude-md-sync.test.ts` (run by `./scripts/test-all.sh`) asserts two things:

1. **Rule-set parity** — the set of `<!-- rule:{id} -->` ids is identical across both surfaces. Add (or remove) a shared rule in one file without mirroring its marker in the other, and `test-all` fails, naming exactly which id is missing on which side. This is the drift guard — discovery moves out of live recursive sessions.
2. **Verbatim invariants** — a small set of tokens that must never diverge regardless of voice: the `🔧 MCP:` / `📡 MCP:` / `⚠️ MCP unavailable — editing file directly` prefixes, the core `loom_*` write-path tool names, and the four stop-rule hallmark phrases. The test asserts each appears in both surfaces.

**Wording is allowed to differ by purpose — and should.** The recursive file addresses Rafa and assumes this repo's install state; the template addresses a generic user ("the user", "if a gate hook is installed") and is terser. The test locks the rule *set* and the *invariant tokens*, **never** the prose, so each surface keeps its tailored voice.

**To change a shared rule:** edit it in **both** `CLAUDE.md` and the `LOOM_CLAUDE_MD` template, keeping its `<!-- rule:{id} -->` marker. To add or retire a shared rule, add/remove its marker in both. Purely Loom-repo-specific content (the Architecture section, active-work pointer, package paths, Applied learning) stays in this file only and carries no marker. Drift between the two files = inconsistent behavior between Rafa's recursive sessions and every downstream Loom user — which is why `test-all` now enforces it.

---

## Doc-sync contract — when structure changes, these docs change together

Loom's canonical facts (filenames, the workflow loop, the layer diagram) are restated across several human- and agent-facing docs. **When you change one of the three structural axes below, update every doc in that row in the same commit.** Drift here means the docs lie about the tool. (The `CLAUDE.md` ⇄ `LOOM_CLAUDE_MD` pair is *additionally* machine-enforced — see the section above; the rest of this contract is a discipline, not a test.)

| When you change… | Update all of |
|------------------|---------------|
| **Filename / layout scheme** (doc filenames, folder layout, ordinals) | `loom/refs/architecture-reference.md` · `loom/refs/workspace-directory-structure-reference.md` · `loom/refs/workflow-reference.md` · `loom/refs/getting-started-reference.md` · `README.md` · `CLAUDE.md` **+ the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts`** · `loom/ctx.md` |
| **Workflow / phases** (the loop, phase order, a new phase such as `req`) | `loom/refs/workflow-reference.md` · `loom/refs/staleness-reference.md` · `loom/refs/loom-requirements-reference.md` · `loom/refs/architecture-reference.md` · `loom/refs/demo-script-reference.md` · `README.md` · `loom/ctx.md` — *`vision-reference.md` stays deliberately abstract; its loop omits phase detail by design.* |
| **Package layers / architecture** (dependency rule, MCP surface) | `loom/refs/architecture-reference.md` · `loom/refs/implementation-contract-reference.md` · `loom/refs/mcp-reference.md` (the MCP resource/tool/prompt surface — the only human-readable map of `loom://` resources) · `loom/ctx.md` · `CLAUDE.md` **+ the `LOOM_CLAUDE_MD` template** |

Also sweep the **package READMEs** (`packages/vscode/README.md` — the VS Code Marketplace listing · `packages/cli/README.md` — the npm listing) and `docs/*.md` (the public user guides) — they are user-facing surfaces that carry filename and workflow examples that must not contradict the refs.

---

<!-- rule:what-loom-is -->
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

**API naming rule (hard).** When authoring or reviewing any `loom_*` tool or app use-case, names must be unambiguous to the final consumer (a model reasoning from the name alone): a **ULID reference parameter is `*Ulid`, never `*Id`** (`*Id` is banned as a reference suffix); a **folder/slug parameter is `*Slug`** (including `weaveSlug`); every entity is addressed by its ULID **except weave** (slug-identified — the one documented exception). Casing is per surface: **snake_case at the MCP schema** (`weave_slug`, `thread_ulid`), **camelCase in the app** (`weaveSlug`, `threadUlid`); the tool `handle()` maps between them. **Which *form* a surface accepts is set by its consumer:** the **CLI is slug/human-first** (friendly refs resolved to a ULID at the CLI edge; a ULID twin only where a real AI caller needs it), the **MCP write tools + workflow prompts are strict ULID** (a `*_ulid` rejects a stem), and the **MCP context/read resources are slug-path human-pointable** (`loom://context/{weaveSlug}/{threadSlug}/{docSlug}`). Full convention + the surface table: [loom/refs/api-naming-reference.md](loom/refs/api-naming-reference.md). *(This rule governs Loom's own API authoring — repo-specific, so it carries no `rule:` marker and is not mirrored into the `LOOM_CLAUDE_MD` template.)*

**API-refactor scope rule (hard).** Any API or naming refactor must sweep **every surface that speaks the API in the same change**, not only the one where it started: **MCP tools · MCP resources (URI placeholders) · MCP prompts (both arg names *and* the tool-call guidance in their bodies) · the CLI (command args + flags) · the VS Code extension's call sites** — plus their reference docs. **Audit by *surface*, never by "tools + use-cases"** — that framing silently omits resources, prompts, and the CLI, which is exactly how the `api-contract-refactor` fixed the write path but left the read surface on the old `*Id` naming (see `core-engine/mcp-read-surface-naming`). A refactor that stops at one surface is incomplete by definition. *(Repo-specific authoring rule — no `rule:` marker, not mirrored to the template.)*

---

<!-- rule:key-terminology -->
## Key terminology

| Term | Meaning |
|------|---------|
| **Weave** | A project folder under `loom/`. Also the core domain entity (`Weave` interface). |
| **Thread** | A workstream subfolder inside a Weave (`loom/{weave}/{thread}/`). Contains an idea, a design, plans, done docs, and thread-level chats. The core entity is `Thread`. |
| **Loose fiber** | A doc at weave root (no thread). Idea or design that hasn't been grouped into a thread yet. |
| **Loom** | The tool itself (CLI + VS Code extension). Also a workspace instance. |
| **Plan** | An implementation plan doc (`plan-NNN.md`) with a steps table. Lives in `{thread}/plans/`. |
| **Design** | A design doc (`design.md`). Contains the design conversation log. Lives in `{thread}/`. |
| **Ctx** | A context summary doc, auto-generated or manually written. |

Thread layout (flat canonical filenames — identity is the frontmatter ULID, so a folder rename rewrites no doc content): `loom/{weave}/{thread}/idea.md`, `design.md`, `req.md`, `thread.md`, `plans/plan-NNN.md`, `done/plan-NNN-done.md`, `chats/chat-NNN.md`.

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

**Test architecture (don't relearn this every time).** The suite is `./scripts/test-all.sh` — a hand-listed set of **standalone `ts-node` scripts under the root `tests/` dir**. Each imports the *built* `packages/*/dist`, uses the lightweight custom `assert` from `tests/test-utils.ts`, and ends with `run().catch(e => { … process.exit(1) })` — there is **no test framework**. To add a test: write `tests/{name}.test.ts` in that style and add a `run_test tests/{name}.test.ts` line to `scripts/test-all.sh`. **Jest is NOT wired in** — no jest config, no per-package `test` script. A jest-style `*.test.ts` (`describe`/`it`/`expect`) placed under `packages/*/test/` would never run, so never author one there — every test goes in root `tests/` in the style above. Because tests import `dist`, run `./scripts/build-all.sh` before `./scripts/test-all.sh`.

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

### Dogfooding server config — never a global `loom`

Post-1.19 there is **one server codebase, two sanctioned delivery vehicles, zero persistent global installs.** When dogfooding Loom on this repo (or on Chord Flow), the launched agent / your terminal `claude` must run **your local build**, not a published release — so do **not** put `command: "loom"` in `.mcp.json` (that's the retired global-CLI form; the extension will offer to migrate it away). Two supported dev paths:

- **Through the extension** (Extension Development Host or an installed dev `.vsix`): the extension binds the launched agent to its *bundled* server via `--strict-mcp-config --mcp-config`, so the agent runs whatever `build-all.sh` last produced. Nothing to configure.
- **Standalone terminal `claude`**: point `.mcp.json` at the local built server explicitly —
  ```json
  { "mcpServers": { "loom": { "type": "stdio", "command": "node",
      "args": ["<repo>/packages/vscode/dist/loom-mcp.js"],
      "env": { "LOOM_ROOT": "<repo>" } } } }
  ```
  Local, explicit, rebuilt by `build-all.sh`, can't drift. (End users instead get the `npx`-pinned form, kept current by the extension's activation-time install.)

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

<!-- rule:mcp-tools -->
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

<!-- rule:single-ai -->
### AI provider model — single-AI (by design)

Loom requires **exactly one** AI provider, never two: *run Loom with whatever AI path you have; only one is required.* Two intentional paths, user picks one:

- **Primary — launched Claude CLI agent.** The Loom VS Code extension's AI actions (refine / generate / promote) call `launchClaude()` (`packages/vscode/src/commands/*.ts`) to open a **Claude Code terminal with a task prompt**; that agent (the user's Claude subscription) reads the docs and writes via content tools (`loom_update_doc` / `loom_create_*`). No API key, no `sampling/createMessage`, and the user can watch + steer it. Because the **launch prompt text** governs behaviour, per-doc-type rules (e.g. req-aware citation of the `Satisfies` column) must live in those launch prompts — *not* in the `loom_refine_*` tools, which the launched agent is explicitly told NOT to call.
- **Fallback — sampling + API key.** When Claude CLI is absent, the command falls back to the `loom_refine_*` / `loom_generate_*` sampling tools → `sampling/createMessage` → `makeAIClient()` (`reslava-loom.ai.apiKey`, default `claude-haiku-4-5`). This serves users who prefer the key path; it is **by design, not legacy**.

The rule is "only one AI is *required*," not "Claude CLI only." A user configures one path or the other, never both.

<!-- rule:claude-code-config -->
### Claude Code config

Create `.mcp.json` in the **project root** (NOT `.claude/settings.json` — that file
is for permissions/hooks/env and does not honour `mcpServers`). For user-global
config use `~/.claude.json` instead.

```json
{
  "mcpServers": {
    "loom": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@reslava/loom@<version>", "mcp"],
      "env": {
        "LOOM_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

This is the canonical form `loom install` writes (pinned to the installing version;
the extension self-heals the pin on upgrade). The legacy `"command": "loom"` global-CLI
form is **retired** — the extension offers to migrate it. For *dogfooding this repo* on
your local build, use a local-path dev config instead (see [Dogfooding server config](#dogfooding-server-config--never-a-global-loom)).

Project-scoped MCP servers require one-time approval per project — run `claude`
interactively in the project root and approve `loom`, or use `claude /mcp`.
Verify with `claude mcp list`.

<!-- rule:primary-entry-points -->
### Primary entry points

| Entry point | When to use |
|-------------|-------------|
| `loom://catalog` resource | Grouped index of every `loom_*` tool (name + one-line purpose). **Read it before searching for a tool**, then `ToolSearch select:<exact name>` — it removes the discovery search, not the one-time schema fetch |
| `loom://context/{docUlid}` resource (or `loom://context/thread/{weaveSlug}/{threadSlug}`) | Load the assembled context bundle (global/weave/thread ctx + parent chain + requires_load) for a doc or thread before working on it |
| `do-next-step` prompt | Get the next incomplete step with full context pre-loaded |
| `continue-thread` prompt | Review thread state and get a next-action suggestion |
| `validate-state` prompt | Review diagnostics and identify issues to fix |

<!-- rule:mcp-rules -->
### Rules

- **`loom://catalog` is loaded at session start (step 3) — consult it, never keyword-flail.** MCP tool schemas are deferred, so you only see tool *names* until you fetch them. The catalog (loaded up front) is the grouped name index; find the exact tool in it, then `ToolSearch select:<exact name>` (one targeted fetch). If for any reason the catalog is not yet in context when you need a `loom_*` tool, read `loom://catalog` **before** the first `ToolSearch` — a blind `ToolSearch` for a `loom_*` tool (keyword guessing without the catalog) is a rule violation.
- **All writes to `loom/**/*.md` go through MCP tools** — frontmatter, body, state mutations, and prose edits alike (see the "AI session rules" hard rule below for the full breakdown and the gate hook that enforces it).
- Use `loom://context/{docUlid}` (or `loom://context/thread/{weaveSlug}/{threadSlug}`) before starting any thread work. The Unified Context Pipeline bundles everything the agent needs (global/weave/thread ctx, idea, design, active plan, requires_load refs) in a single read.
- `do-next-step` prompt is the primary workflow driver: call it with the active planUlid to get context + step instruction in one shot.
- **Plans are structured, never hand-authored tables.** Create a plan with `loom_create_plan` by passing `goal` (prose) + a `steps` array of objects (`{ description, title?, files?, blockedBy?, satisfies?, detail? }`) — **never** a Markdown steps table. Loom owns the canonical `## Steps` table; steps live in YAML frontmatter (the source of truth) and the body table is a generated view. `blockedBy` references step `id`s (or plan ids). `loom_create_plan` does **not** accept a `content` body (idea/design/reference still do).
- **`loom_generate_*` / `loom_refine_*` tools use MCP sampling (server→client)** — the Loom MCP server calls back to the host to run inference. This is the **fallback** AI path (see "AI provider model" above); the extension's *primary* path launches a Claude CLI agent that writes via content tools instead. Two host behaviors:
  - **VS Code extension (sampling fallback)**: when Claude CLI is absent, the extension's `mcp-client.ts` advertises `{ sampling: {} }` and routes `sampling/createMessage` through `makeAIClient()` (`reslava-loom.ai.apiKey`). Only reachable on that fallback path.
  - **Claude Code CLI sessions**: sampling is intentionally blocked — Claude Code is already the AI; recursive server→client inference is not supported and returns `MethodNotFound`. **Create docs in a single call:** idea/design/reference take a `content` body; **a plan takes `goal` + a structured `steps` array** (objects, never a Markdown table — see the plan rule above). The doc is born at version 1 with real content. For an existing doc, do the edit yourself and write it via `loom_update_doc`. Never call `loom_refine_*` / `loom_generate_*` here — they'll `MethodNotFound`.
<!-- rule:context-ledger -->
- **Declare what you already hold — don't re-receive it (Context Dispatcher, model C).** The MCP server is stateless and can't see your context window, so context injection dedupes against a ledger *you* declare. When advancing through several steps of one plan in a single session, pass `context: "skip"` (coarse — "I hold the whole thread") or `alreadyLoaded: [{ id, version }]` (precise, per-doc) on every `loom_do_step` after the first: the brief then injects only the *delta* (docs absent from your ledger, or whose version changed) and lists the assumed-present rest in `contextManifest`. The dedupe unit is `{id@version}` — a refine bumps the version, so a changed doc always re-injects (there is no silent under-load). After a context compaction, or whenever unsure, drop the flag and re-receive the full bundle. The `loom://context` resource takes the same ledger via `?loaded=id@version,…`.

---

<!-- rule:ai-session-rules -->
## AI session rules

> **#1 rule — reply INSIDE the active chat doc.** This is the single most-violated rule. If a chat doc is the active context and you answer only in the terminal, that is a **bug**, not a stylistic choice — the reply is lost the moment the terminal scrolls. Once a chat doc is active, every reply (including short follow-ups) goes inside it via `loom_append_to_chat` until Rafa says `close` or opens a different chat. See the full rule below.

- **Chat Mode (default):** Respond naturally. Never modify frontmatter or files without explicit approval.
- **Action Mode:** Only when Rafa explicitly asks. Respond with a JSON proposal per the handshake protocol.
- **Never propose state changes** (version bumps, status transitions) without being asked.
- Rafa uses the name `Rafa` in `## Rafa:` headers. Respond under `## AI:`.
- Keep responses aligned with the ongoing design conversation in the document.
- **Chat docs are the conversation surface (always reply inside).** Whenever a chat doc (`chat-NNN.md`, i.e. `type: chat` in frontmatter) is the active context of the session — Rafa asked you to read it, opened it in the IDE while discussing it, references a line/section inside it, or the previous turn was already written into it — every reply goes inside that doc, appended at the bottom under `## AI:`. This is not optional and does not require Rafa to repeat "reply inside" each turn. Once a chat doc is active, keep replying inside it for all follow-ups until Rafa explicitly says `close` or switches to a different chat doc. The terminal response should be a brief one-liner pointing at the appended reply, not a duplicate of the content.
- **Why this matters:** Chats are Loom's User↔AI collaboration medium and the durable context database. Replies that live only in the terminal disappear; replies inside the chat doc persist as part of the project's shared memory. Treat the chat doc as the canonical place the conversation lives.
- **MCP tools for ALL writes to `loom/**/*.md` (hard rule):** Every write to a Loom doc — frontmatter or body, new doc or existing, state mutation or prose edit — goes through a `loom_*` MCP tool. No exceptions for "small" edits, typo fixes, or appending a single line. Direct `Edit`/`Write`/`MultiEdit` to `loom/**/*.md` is **physically blocked** by the `loom-mcp-gate` PreToolUse hook (`.claude/hooks/loom-mcp-gate.ps1`); if you see the gate's deny message, switch to the right MCP tool — don't try to route around it.
  - Chats → `loom_append_to_chat`
  - New idea/design/plan/done → `loom_create_*` (or `loom_generate_*` if sampling is available)
  - Step progress → `loom_complete_step` / `loom_append_done`
  - Existing doc body or frontmatter → `loom_update_doc`
  - Surgical body-prose edits → `loom_patch_doc` (one-line/section find-and-replace — preferred over re-supplying the whole body via `loom_update_doc`; refuses the generated plan `## Steps` table)
  - Plan step edits → `loom_update_step` (amend a pending step's description/files/blockedBy/satisfies) / `loom_add_step` (insert a step — append, or before/after an existing step) / `loom_remove_step` (delete a pending step; strips blockedBy references to it and reports them) / `loom_reorder_steps` (reorder pending steps); done steps are immutable history
  - Renames/archives → `loom_retitle` (doc title) / `loom_rename_reference_file` (reference filename) / `loom_archive`
  - Excluded from the gate: `loom/refs/*.md` (reference docs maintained by hand), `loom/.archive/**/*.md` (archived/deferred docs are frozen — no reducer to run), `CLAUDE.md` at repo root, anything under `packages/**`. Edits to those use normal `Edit`/`Write`.
  - If MCP is genuinely down (rare), output `⚠️ MCP unavailable — editing file directly`, ask Rafa to disable the hook via `/hooks` for this session, and proceed only with explicit go.
- **Treat MCP tool failures as findings, not friction.** If a `loom_*` tool returns the wrong shape, a malformed doc (missing Steps table, double type-suffix, broken frontmatter), or times out — stop, report what happened in the active chat, and let Rafa decide how to proceed. Routing around a buggy MCP tool by editing the file directly hides the bug; you've now also bypassed the very thing you were supposed to be testing.

<!-- rule:mcp-visibility -->
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

<!-- rule:context-injection -->
### Chat-reply context injection (required)

When replying inside a chat doc that lives in a thread (`loom/{weave}/{thread}/chats/...`):

- **First reply for this thread in the current conversation** — read the thread context (idea + design + active plan + any `requires_load` docs) before responding. Load up front, before you start diagnosing — do not answer from code and backfill the read afterward (that is the "context loaded at the wrong time" failure). Emit one visibility line per doc:
  ```
  📡 MCP: loom://context/{chat-id}?mode=chat
  📄 idea.md — loaded for context
  📄 design.md — loaded for context
  📄 plan-NNN.md — loaded for context  (only if an active plan exists)
  ```
  (The Unified Context Pipeline assembles global/weave/thread ctx + the chat's parent chain + requires_load; the chat itself is the target.)
- **Same thread, no `refine` / `generate` since last reply** — context is already in the conversation transcript. Do NOT re-read. Emit only the tool-call visibility line:
  ```
  🔧 MCP: loom_append_to_chat(id="{chat-id}")
  ```
- **Same thread, but a `refine` or `generate` ran since last reply** — re-read the context (it may have changed) and re-emit the doc-loaded visibility lines.

To load the chat's own new turns cheaply on first touch, call `loom_read_chat_tail` — it returns only the turns since your last `## AI:` reply (via the chat's `last_ai_block` cursor) instead of re-reading the whole chat.

For a chat at weave root (loose fiber, no thread), load the parent doc(s) the chat refers to and emit `📄 {doc}.md — loaded for context` for each. No thread-scoped context call.

The "is this thread already in transcript?" decision lives **in the AI**, not in the MCP server — the server is stateless across calls and cannot see the LLM transcript.

---

<!-- rule:session-start -->
## Session start protocol

**Order of operations at session start:**

1. **Load global ctx** — read [loom/ctx.md](loom/ctx.md). Emit `📘 loom-ctx loaded — global context ready` (or the failure variant if the read fails).
2. **Load vision and workflow** — read [loom/refs/vision-reference.md](loom/refs/vision-reference.md) (north star — what Loom is for, what manual steps it replaces; ground for the vision-check rule under Collaboration style) and [loom/refs/workflow-reference.md](loom/refs/workflow-reference.md) (canonical loop, phase definitions, and transitions). Emit `🌟 vision + workflow loaded` on success.
3. **Load the tool catalog** — read the `loom://catalog` resource so the grouped `loom_*` surface index (tools + resources + prompts) is in context *before* any tool is needed. Emit `📡 MCP: loom://catalog` then `🗂️ loom-catalog loaded — surface index ready`. This is mandatory and unconditional: it removes the "first `ToolSearch` runs blind" moment that causes the index to be skipped. Once loaded here, never `ToolSearch` for a `loom_*` tool without first consulting this index — go straight from catalog → `ToolSearch select:<exact name>`.
4. **Load the project map** — read `loom://state?shape=summary`: the cheap weave/thread skeleton + status (a few KB), **not** the full state graph (~2 MB — every plan's every step). Emit `📡 MCP: loom://state?shape=summary` then `🧵 Active: <list of active/implementing thread IDs>`. This is the always-loaded orientation read; it replaces the old full-state read and any hand-written "active work" pointer. The map is enough to know what threads exist, their status, and where the active work is — never read the full `loom://state` at session start.
5. **Load only the pointed thread deeply.** When Rafa pointed you at a chat/doc/thread, the pointer *is* the active-thread signal — scope the deep load to it: call the `do-next-step` prompt with that thread's active planUlid (or read `loom://context/thread/{weaveSlug}/{threadSlug}`). This bundles:
   - Thread context (idea, design, current plan, requires_load docs)
   - Next incomplete step with instructions
   - Pre-filled `loom_complete_step` call ready to execute

   Do **not** load other threads' content. With no pointer, use the step-4 map to pick what to work on, then load that thread.

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

<!-- rule:stop-rules -->
## Non-negotiable stop rules

1. **After each step**: mark ✅ in the plan · state the next step + files that will be touched · **STOP** — wait for `go`. For ad-hoc tasks (no active plan), end every response with a `Next:` line: one sentence describing what comes next, or "waiting for direction." **Exception — explicit multi-step authorization:** when the user explicitly asks for a range or all steps in advance (e.g. "do steps 2–4", "do all remaining steps", "do the whole plan") via chat, Claude CLI, or the extension, continue through the authorized range without stopping between steps. Still mark ✅ and append the per-step done note as each completes. Rules 2 (error loop) and 3 (design decision) continue to interrupt the range — they always stop.
2. **Error loop**: after a 2nd consecutive failed fix — stop, write root-cause findings, wait for `go`. Never push forward blindly.
3. **Design decision**: when a decision affects architecture, API shape, or test design — explain options and trade-offs, **STOP** and wait.
4. **User says "STOP"**: respond with `Stopped.` only — nothing else.

---

<!-- rule:commit-last -->
## Commit last — don't dirty the chat you just committed

When a chat turn asks you to commit, the chat reply is **part of the work**, so it must land *before* the commit, not after. Otherwise `loom_append_to_chat` re-dirties the very doc the commit just captured, and the action meant to clean the tree is the one that leaves it modified. This is the most common source of nonsense "doc changed again" churn in Loom-built repos.

1. Append your reply to the active chat first (`loom_append_to_chat`).
2. Then stage everything — including the chat doc — and commit as the **last** action of the turn.
3. **Never reference the commit hash in the reply.** Doing so forces the reply to come after the commit (chicken-and-egg) and re-dirties the doc. Describe *what changed*, not the commit object — the hash is always recoverable from `git log`.

This guarantees a clean tree only at the end of *that* turn; the next chat turn legitimately re-dirties the doc (a living conversation log is always ahead of the last commit). That's expected — the rule only stops a commit from leaving its own trigger doc modified.

---

<!-- rule:collaboration-style -->
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
