---
type: chat
id: ch_01KV8T6JD7YEE8EQ87CRD7WVRX
title: core-purity Chat
status: active
created: 2026-06-16
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 2
---
# core-purity Chat

## Rafa:

I started the Plan 
Do whole plan

## AI:

Starting the whole plan **"Move ConfigRegistry IO into fs + add a core-purity guard"** (5 steps) — you authorized all steps, so I'll run through them without stopping between each, marking ✅ + appending a done note per step.

Two adjustments to the plan as written, both for correctness:
- **Import paths**: step 2 says repoint to `@reslava-loom/fs/dist`, but the actual repo convention is *relative* paths (`../../fs/dist` from app, `../../../fs/dist` from cli/mcp). I'll follow the real convention.
- **Duplicate types**: `packages/fs/src/utils/workspaceUtils.ts` already redefines `LoomEntry`/`LoomRegistry` (a pre-existing duplicate of the ones in `core/src/registry.ts`). To avoid leaving trash, the moved `registryRepository.ts` will own those types and `workspaceUtils.ts` will import them — one definition, no duplication.

Also: the importer set is wider than the plan's indicative file lists (cli `next`/`status`/`search`/`blocked`/`stale`, and all of mcp's resources/tools construct `new ConfigRegistry()`). The grep is the source of truth, so I'll repoint all of them.

## AI:

✅ **Whole plan done** — all 5 steps complete, plan auto-transitioned to `done`.

**What changed**
1. `ConfigRegistry` moved out of pure core → `packages/fs/src/repositories/registryRepository.ts` (it's inherently IO). Deleted `packages/core/src/registry.ts`. Consolidated the pre-existing duplicate `LoomEntry`/`LoomRegistry` in `workspaceUtils.ts` to import from the repository — one definition, no trash.
2. Repointed **28** importers (7 app, 11 cli, 10 mcp) to the fs layer, split the 4 combined mcp imports, and dropped the `ConfigRegistry` re-export from the core barrel.
3. Verified `packages/core/src` has zero fs/os/node:fs imports.
4. Added `tests/core-no-fs-imports.test.ts` (no whitelist — core is 100% IO-free) and wired it into `test-all.sh`.
5. `build-all` clean; `test-all` fully green; new guard scans 44 core files, 0 violations.

**Outcome vs. the idea**: the "core has zero IO" contract is restored *and* mechanically locked — the same drift can't recur silently. The guard would have gone red on the old `registry.ts`.

Nothing committed — all changes are in the working tree (`packages/**` + `tests/**` + `scripts/test-all.sh`). Say the word and I'll commit to `main`.

Next: waiting for direction (commit?).

## Rafa:

commit, push

### Do we need more guards?

Now we have 2 guards:
tests/core-no-fs-imports.test.ts
tests/vscode-no-fs-imports.test.ts

in loom/refs/architecture-reference.md we have 
Package Relationships line 22

```markdown
## 1. Package Relationships (Stage 2)


CLI (packages/cli)          VSCode (packages/vscode)
  │                              │
  │                         thin MCP client
  └──────────┬─────────────────┬─┘
             │                 │
             │                 ▼
             │          MCP Server (packages/mcp)
             │          resources, tools, prompts, sampling
             │                 │
             └─────────────────┤
                                ▼
         Application Layer (app)
         Use-cases: weaveIdea, weaveDesign, weavePlan,
         finalize, rename, startPlan, completeStep,
         closePlan, chatNew, promoteToDesign, etc.
         Query use-cases: searchDocs, getStaleDocs,
         getBlockedSteps (shared by MCP tools + CLI)
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
         Domain Layer (core)    Infrastructure Layer (fs)
         Entities, reducers,    Repositories, serializers,
         events, validation     link index, path utils

**Dependency rules (Stage 2):**
- `cli` may call app directly (inspection/queries) or reach the MCP surface
  **in-process** — `packages/cli/src/mcpClient.ts` builds the server with
  `createLoomMcpServer` over the SDK's in-memory transport and runs the handshake
  internally, so commands like `loom catalog` / `loom resources` / `loom context` /
  `loom next` read MCP resources & prompts with no subprocess or hand-typed JSON-RPC.
  Query commands (`loom search` / `stale` / `blocked`) call the shared app query
  use-cases directly — the same ones their MCP tools delegate to (one source of truth).
- `vscode` **must** call MCP only — no direct app imports
- `mcp` server may **only** import from `app` — it is the gate
- `app` may **only** import from `core` and `fs`
- `core` may **only** import from itself
- `fs` may **only** import from `core` and standard libraries
```

Should we create guards for all Dependeccy rules?
