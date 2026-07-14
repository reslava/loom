---
type: ctx
id: loom-ctx
title: Loom — Global Context
status: active
created: 2026-04-29
updated: 2026-07-14
version: 17
tags: [ctx, summary]
parent_id: null
requires_load: []
source_hash: b23348fb5638ae8979b7c91d741e1cd9f2ec8968
last_refreshed: 2026-07-14
---
# loom — Global Context

> Always-loaded architecture & API companion to CLAUDE.md. CLAUDE.md holds the rules
> and workflow contract; this doc holds *what Loom is* — architecture, API, stack, and
> where the deep refs live. No rule is restated here. (What Loom is *for*:
> [vision](refs/vision-reference.md); the loop: [workflow](refs/workflow-reference.md).)

## Architecture

Event-sourced and document-driven: markdown docs under `loom/` are the database and
state is derived. Packages flow one direction only — `cli / vscode / mcp → app → core +
fs + telemetry` (layers never import upward; the VS Code extension reaches Loom **only**
through MCP):

- **core** — pure domain logic: entities, reducers, events, the frontmatter serializer. No IO, no async, no VS Code.
- **fs** — infrastructure: file IO, gray-matter frontmatter load/save, link index, repositories.
- **telemetry** — leaf infra (opt-in, content-free usage events; off by default), injected via `deps`.
- **app** — use-cases `(input, deps) => result`. Two surfaces: `getState(deps)` (read — builds the link index once) and `runEvent(weaveSlug, event, deps)` (mutate — load → reduce → save). Reducers stay pure; side effects run *after* the reducer.
- **cli / vscode / mcp** — thin delivery. Every write to `loom/**/*.md` goes through an MCP `loom_*` tool (so reducers, link index, and plan-step validation run); a PreToolUse gate enforces it.

→ Deep: [architecture-reference.md](refs/architecture-reference.md)

## API & contracts

- **Identity:** every entity is addressed by a ULID **except weave** (slug-identified — the one documented exception). A `*Ulid` param is the ULID; a `*Slug` param is a folder/slug. `*Id` is banned as a reference suffix.
- **Casing by surface:** snake_case at the MCP schema (`weave_slug`, `thread_ulid`), camelCase in the app (`weaveSlug`, `threadUlid`); the tool `handle()` maps between them.
- **Which form each surface speaks (by consumer):** CLI = slug/human-first · MCP write tools + workflow prompts = strict ULID (`*_ulid` rejects a stem) · MCP context/read resources = slug-path human-pointable (`loom://context/{weaveSlug}/{threadSlug}/{docSlug}`).
- **Tri-surface parity:** a capability is exposed on every surface its consumer needs, with names mirrored CLI ⇄ MCP ⇄ extension and by-consumer exceptions (agent-only workflow tools, setup ops).

→ Deep: [api-naming-reference.md](refs/api-naming-reference.md)

## Stack — language, tech, libraries, dependencies

- **TypeScript** monorepo; one **lockstep** version across all `packages/*` (never independent per-package versions).
- CLI on **commander**, bundled with **esbuild** (version + PostHog key inlined at build). MCP on the **@modelcontextprotocol/sdk**. Frontmatter via **gray-matter**. Telemetry via **PostHog** (EU), key baked at release.
- One server codebase, two delivery vehicles: the VS Code extension bundles its own MCP server (spawned via Electron-as-Node); hand-launched agents use an `npx`-pinned `.mcp.json`. No persistent global `loom` install.

## Build, test & CI

- **Build:** `./scripts/build-all.sh` — compiles all packages in dependency order and relinks the global CLI. Never `tsc` a sub-package alone.
- **Test:** `./scripts/test-all.sh` — a hand-listed set of standalone `ts-node` scripts under root `tests/` (a lightweight custom `assert`, no framework). Tests import built `dist`, so build first. New test → `tests/{name}.test.ts` + a `run_test` line.
- **Enforced contracts:** `claude-md-sync.test.ts` locks the CLAUDE.md ⇄ `LOOM_CLAUDE_MD` rule set + invariants; layer-import guards keep the core/fs/vscode boundaries honest.
- **Release:** synchronized CLI + extension (bump → build/test → tag → push → publish); `record-release` stamps `actual_release` onto done plans.

## Documentation map

Reference docs live in `loom/refs/` and are **citation-loaded** (via a doc's `requires_load`), not auto-included. Load when relevant:

- [architecture-reference.md](refs/architecture-reference.md) — layers, MCP surface, doc-type table, frontmatter schema, stale rules · *any structural work*
- [api-naming-reference.md](refs/api-naming-reference.md) — the Slug/Ulid convention + per-surface table · *any API / tool authoring*
- [workflow-reference.md](refs/workflow-reference.md) — the loop, phases, transitions · *workflow changes*
- [mcp-reference.md](refs/mcp-reference.md) — the `loom://` resource / tool / prompt surface · *MCP work*
- [loom-slang-reference.md](refs/loom-slang-reference.md) — the canonical User→AI verbs · *interpreting slang*
- [staleness-reference.md](refs/staleness-reference.md) — the directional, version-based staleness model

The live surface index is the `loom://catalog` resource (tools + resources + prompts).

## AI collaboration

- **Chat docs are the conversation surface** — when a `chat-NNN.md` is active, every reply goes inside it under `## AI:` (terminal-only replies are lost).
- **MCP visibility** — emit `🔧 MCP: tool(...)` / `📡 MCP: loom://...` before each call; `⚠️ MCP unavailable — editing file directly` when falling back.
- **Find a tool via `loom://catalog`, then `ToolSearch select:<name>`** — never keyword-flail (tool schemas are deferred).
- **Context dispatcher** — when stepping through one plan, declare what you already hold (`context: "skip"` / `alreadyLoaded`) so only the delta re-injects.
- The full session contract — session-start protocol, stop rules, the hard write-path rule — lives in [CLAUDE.md](../CLAUDE.md).