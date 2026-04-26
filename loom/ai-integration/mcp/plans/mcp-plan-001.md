---
type: plan
id: mcp-plan-001
title: "Loom MCP Server — Implementation Plan"
status: implementing
created: 2026-04-25
version: 1
tags: [ai, mcp, integration, agent, loom]
parent_id: mcp-design
child_ids: []
requires_load: [mcp-design]
design_version: 1
---

# Loom MCP Server — Implementation Plan

## Goal

Implement `packages/mcp/` — a TypeScript MCP server that exposes Loom's document graph to any MCP-compatible AI agent (Claude Code, Cursor). Replaces the standalone AI API layer entirely; all AI generation goes through MCP sampling or the host agent directly.

## Phases

| Phase | Scope | Steps |
|-------|-------|-------|
| 1 | Package scaffold + CLI wiring | 1–5 |
| 2 | State & diagnostics resources | 6–10 |
| 3 | Document reading resources | 11–14 |
| 4 | Document authoring tools | 15–20 |
| 5 | Workflow transition tools | 21–27 |
| 6 | Search & query tools | 28–31 |
| 7 | Prompts | 32–37 |
| 8 | Sampling (VS Code AI buttons) | 38–40 |
| 9 | Testing | 41–44 |
| 10 | Documentation & release | 45–47 |

---

## Phase 1 — Package scaffold + CLI wiring

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 1 | Create `packages/mcp/` with `package.json` (deps: `@reslava-loom/app`, `@reslava-loom/fs`, `@reslava-loom/core`, `@modelcontextprotocol/sdk`, `fs-extra`; devDeps: `typescript`, `@types/node`) | `packages/mcp/package.json` | — |
| ☐ | 2 | Create `packages/mcp/tsconfig.json` — extends root, `outDir: dist`, targets `packages/app` and `packages/fs` via `references` | `packages/mcp/tsconfig.json` | 1 |
| ☐ | 3 | Create `packages/mcp/src/server.ts` — exports `createLoomMcpServer(root: string): Server` factory; registers all resource / tool / prompt / sampling handlers (stubs for now) | `packages/mcp/src/server.ts` | 2 |
| ☐ | 4 | Create `packages/mcp/src/index.ts` — entry point; reads `LOOM_ROOT` env var (falls back to `process.cwd()`), calls `createLoomMcpServer`, connects stdio transport, starts server | `packages/mcp/src/index.ts` | 3 |
| ☐ | 5 | Wire `loom mcp` subcommand in `packages/cli/src/index.ts`; add `packages/mcp` to `scripts/build-all.sh` and `tsconfig.json` project references | `packages/cli/src/index.ts`, `scripts/build-all.sh` | 4 |

**Notes:**
- Transport: `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`
- Server capabilities to declare: `{ resources: {}, tools: {}, prompts: {}, sampling: {} }`
- `LOOM_ROOT` must be the workspace root (not `.loom/`); the MCP server calls `getActiveLoomRoot(LOOM_ROOT)` internally

---

## Phase 2 — State & diagnostics resources

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 6 | Implement `loom://state` resource — calls `getState(deps)` with optional `?weaveId=` and `?threadId=` query params; serializes to JSON; if `threadId` provided and no `weaveId`, error | `packages/mcp/src/resources/state.ts` | 5 |
| ☐ | 7 | Implement `loom://status` resource — reads `.loom/_status.md` raw text; returns `{ content, deprecated: true }` with note that this endpoint will be removed in Stage 2 | `packages/mcp/src/resources/status.ts` | 5 |
| ☐ | 8 | Implement `loom://link-index` resource — calls `buildLinkIndex(root)` and serializes the index map as JSON | `packages/mcp/src/resources/linkIndex.ts` | 5 |
| ☐ | 9 | Implement `loom://diagnostics` resource — runs `getState`, iterates all docs, collects broken `parent_id`s, dangling `child_ids`, orphaned docs (docs with a non-existent `parent_id`); returns structured array | `packages/mcp/src/resources/diagnostics.ts` | 6 |
| ☐ | 10 | Implement `loom://summary` resource — pulls `state.summary` counts (totalWeaves, activeWeaves, implementingWeaves, totalPlans, stalePlans, blockedSteps); returns JSON | `packages/mcp/src/resources/summary.ts` | 6 |

**Notes:**
- Resources are registered via `server.resource(uri, handler)`
- URI pattern: exact URIs for static resources; use `ResourceTemplate` for parameterised (`loom://docs/{id}`)
- All resources return `{ contents: [{ uri, mimeType: 'application/json' | 'text/plain', text }] }`

---

## Phase 3 — Document reading resources

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 11 | Implement `loom://docs/{id}` resource — uses `findDocumentById(root, id)` to resolve path; loads raw markdown; returns `{ uri, mimeType: 'text/plain', text }` | `packages/mcp/src/resources/docs.ts` | 5 |
| ☐ | 12 | Implement `loom://thread-context/{weaveId}/{threadId}` resource — loads (in priority order): (1) fresh ctx summary if present, (2) idea + design + active plan, (3) all `requires_load` refs. Accepts optional `?mode=` param (idea/design/plan/implementing) — when set, filters included reference docs using their `load_when` field (v1: include all if `load_when` not yet implemented; add filter once `load-when-plan-001` is done). Bundles into single markdown with `## {type}: {id}` section headers. | `packages/mcp/src/resources/threadContext.ts` | 5 |
| ☐ | 13 | Implement `loom://plan/{id}` resource — loads the plan doc via `findDocumentById`; returns JSON with frontmatter + parsed `steps` array (using `parseStepsTable`) | `packages/mcp/src/resources/plan.ts` | 5 |
| ☐ | 14 | Implement `loom://requires-load/{id}` resource — loads the doc, reads its `requires_load` array, recursively fetches each listed doc (deduplicated), returns the union as a JSON array of `{ id, path, content }` objects | `packages/mcp/src/resources/requiresLoad.ts` | 11 |

**Notes:**
- `loom://thread-context` is the highest-value resource for agents — it is what replaces the manual "read all these files" step
- Bundle format for thread-context: separate sections per doc with `## {type}: {id}` headings

---

## Phase 4 — Document authoring tools

Each tool delegates to the corresponding existing `packages/app/` use case. The MCP layer is thin — validate args, call the use case, return the result.

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 15 | `loom_create_idea` — args: `weaveId`, `threadId?`, `title`, `content`; delegates to `weaveIdea` app use case; returns `{ id, filePath }` | `packages/mcp/src/tools/createIdea.ts` | 5 |
| ☐ | 16 | `loom_create_design` — args: `weaveId`, `threadId`, `title`, `content`; delegates to `weaveDesign`; returns `{ id, filePath }` | `packages/mcp/src/tools/createDesign.ts` | 5 |
| ☐ | 17 | `loom_create_plan` — args: `weaveId`, `threadId`, `title`, `steps[]` (each: `{ order, description }`); delegates to `weavePlan`; returns `{ id, filePath }` | `packages/mcp/src/tools/createPlan.ts` | 5 |
| ☐ | 18 | `loom_update_doc` — args: `id`, `content` (markdown body, no frontmatter); loads the doc via `findDocumentById`, preserves frontmatter, replaces body, saves; returns `{ id, filePath }` | `packages/mcp/src/tools/updateDoc.ts` | 11 |
| ☐ | 19 | `loom_append_to_chat` — args: `id`, `role` (`"AI"` or `"Rafa"`), `body`; loads the chat doc, appends `\n\n## {role}:\n{body}`, saves; returns `{ id, filePath }` | `packages/mcp/src/tools/appendToChat.ts` | 18 |
| ☐ | 20 | `loom_create_chat` — args: `weaveId`, `threadId?`, `title?`; delegates to `chatNew` app use case; returns `{ id, filePath }` | `packages/mcp/src/tools/createChat.ts` | 5 |

**Notes:**
- Tool return shape: `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`
- All tools must call `treeProvider.refresh()` equivalent after write — in MCP context this means no tree refresh (VS Code extension handles its own watcher); just ensure file is saved
- `loom_update_doc` should increment `version` in frontmatter

---

## Phase 5 — Workflow transition tools

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 21 | `loom_start_plan` — args: `id`; loads plan, validates status is `draft` or `active`, calls `startPlan` app use case; returns updated plan | `packages/mcp/src/tools/startPlan.ts` | 5 |
| ☐ | 22 | `loom_complete_step` — args: `planId`, `stepNumber`; loads plan, marks step done in the steps table (idempotent — no error if already done), saves; returns updated steps | `packages/mcp/src/tools/completeStep.ts` | 5 |
| ☐ | 23 | `loom_close_plan` — args: `id`, `summary?`; calls `closePlan` app use case; returns `{ planId, doneDocId, doneDocPath }` | `packages/mcp/src/tools/closePlan.ts` | 5 |
| ☐ | 24 | `loom_promote` — args: `sourceId`, `targetType` (`"idea"` \| `"design"` \| `"plan"`); dispatches to the appropriate promote use case (`promoteToIdea`, `promoteToDesign`, `promoteToPlan`); returns new doc `{ id, filePath }` | `packages/mcp/src/tools/promote.ts` | 5 |
| ☐ | 25 | `loom_finalize_doc` — args: `id`; calls `finalize` app use case (moves `-temp` doc to final form); returns `{ oldId, newId, filePath }` | `packages/mcp/src/tools/finalizeDoc.ts` | 5 |
| ☐ | 26 | `loom_archive` — args: `id`; delegates to `archiveItem` (moves doc/thread/weave dir to `_archive/`); returns `{ id, archivedPath }` | `packages/mcp/src/tools/archive.ts` | 5 |
| ☐ | 27 | `loom_rename` — args: `oldId`, `newTitle`; delegates to `rename` app use case; returns `{ oldId, newId, updatedCount }` | `packages/mcp/src/tools/rename.ts` | 5 |

**Notes:**
- Each tool description must explicitly state its preconditions (e.g., "`loom_complete_step`: call only on plans with status `implementing`") so the agent uses them correctly
- `loom_complete_step` idempotency: if step is already done, return current steps without error

---

## Phase 6 — Search & query tools

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 28 | `loom_find_doc` — args: `id`; calls `findDocumentById(root, id)`; returns `{ id, filePath }` or error if not found | `packages/mcp/src/tools/findDoc.ts` | 5 |
| ☐ | 29 | `loom_search_docs` — args: `query`, `type?`, `weaveId?`; loads full state (optionally scoped), filters docs whose `id`, `title`, or `content` contains `query` (case-insensitive); returns array of `{ id, type, weaveId, threadId?, filePath, excerpt }` | `packages/mcp/src/tools/searchDocs.ts` | 6 |
| ☐ | 30 | `loom_get_blocked_steps` — no args; loads state + link index; runs `isStepBlocked` for every plan step; returns array of `{ planId, stepNumber, stepDescription, blockedBy }` | `packages/mcp/src/tools/getBlockedSteps.ts` | 6 |
| ☐ | 31 | `loom_get_stale_plans` — no args; loads state; returns array of `{ planId, threadId, weaveId, designVersion, planDesignVersion }` for plans where `plan.design_version < thread.design.version` | `packages/mcp/src/tools/getStalePlans.ts` | 6 |
| ☐ | 32 | `loom_get_stale_docs` — generalised stale check: returns all docs (ctx, ideas, designs) whose parent (via `parent_id`) or parent thread/weave has been updated since the doc's `created` date; includes stale plans. Agent uses this to know what needs refreshing. | `packages/mcp/src/tools/getStaleDocs.ts` | 6 |
| ☐ | 33 | `loom_refresh_ctx` — args: `weaveId`, `threadId?`; triggers ctx regeneration via sampling (loads idea+design+recent chats, asks host agent for a summary, saves to `{thread}/ctx/{ctx-id}.md` or `{weave}/ctx.md`); returns `{ ctxId, filePath }` | `packages/mcp/src/tools/refreshCtx.ts` | 38 |

---

## Phase 7 — Prompts

Prompts are registered via `server.prompt(name, handler)`. Each handler loads required context from Loom state/resources and returns an array of `{ role, content }` messages the agent uses as context.

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 32 | `continue-thread` prompt — args: `weaveId`, `threadId`; fetches `loom://thread-context/{weaveId}/{threadId}`; returns it as `user` message + system instruction "review the thread and propose the next action" | `packages/mcp/src/prompts/continueThread.ts` | 12 |
| ☐ | 33 | `do-next-step` prompt — args: `planId`; loads plan via `loom://plan/{id}`, finds first incomplete step, loads full thread context + step `requires_load` refs; returns loaded context + "implement step N: {description}" instruction | `packages/mcp/src/prompts/doNextStep.ts` | 13, 14 |
| ☐ | 34 | `refine-design` prompt — args: `designId`; loads design doc + linked chat history (`chats/` dir for that thread); returns them as context + "propose refinements" instruction | `packages/mcp/src/prompts/refineDesign.ts` | 11 |
| ☐ | 35 | `weave-idea` prompt — args: `weaveId`, `threadId?`, `prompt`; returns a structured prompt asking the agent to draft a Loom idea doc (with correct frontmatter) from the user's description; agent is expected to call `loom_create_idea` with the result | `packages/mcp/src/prompts/weaveIdea.ts` | 5 |
| ☐ | 36 | `weave-design` and `weave-plan` prompts — same pattern; load linked idea/design doc as context, return drafting instruction; agent calls `loom_create_design` / `loom_create_plan` | `packages/mcp/src/prompts/weaveDesign.ts`, `packages/mcp/src/prompts/weavePlan.ts` | 11 |
| ☐ | 37 | `validate-state` prompt — no args; loads `loom://diagnostics` and `loom://summary`; returns them + "review diagnostics and propose fixes" instruction | `packages/mcp/src/prompts/validateState.ts` | 9, 10 |

---

## Phase 8 — Sampling (VS Code AI buttons)

Sampling lets the MCP server request the host agent to run an LLM inference. This powers the VS Code "Weave Idea", "Weave Design", "Weave Plan", "AI Reply" buttons without a separate API key.

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 38 | Create `packages/mcp/src/sampling.ts` — exports `requestSampling(server, messages, systemPrompt)` helper; calls `server.requestSampling({ messages, systemPrompt, maxTokens: 4096 })`; returns the generated text string; handles `MethodNotFound` error (client doesn't support sampling) by throwing `SamplingUnsupportedError` | `packages/mcp/src/sampling.ts` | 5 |
| ☐ | 39 | Expose sampling-backed tools: `loom_generate_idea`, `loom_generate_design`, `loom_generate_plan`, `loom_generate_chat_reply` — each loads the required context, calls `requestSampling`, then saves the result via the appropriate authoring tool; returns the saved doc `{ id, filePath }` | `packages/mcp/src/tools/generate.ts` | 38, 15–20 |
| ☐ | 40 | VS Code extension: add MCP connection detection — check if `LOOM_ROOT` MCP server is registered; set `loom.mcpConnected` context key; gate sampling-dependent AI buttons (Weave Idea, Weave Design, Weave Plan, AI Reply) on `loom.mcpConnected`; show status bar item "Loom MCP: connected / disconnected" | `packages/vscode/src/extension.ts`, `packages/vscode/package.json` | 39 |

**Notes:**
- `SamplingUnsupportedError` should be caught in VS Code extension and shown as a tooltip: "Connect Claude Code to use AI generation"
- `maxTokens: 4096` is a reasonable default for doc generation; plans may need up to 8192

---

## Phase 9 — Testing

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 41 | MCP Inspector smoke test — run `npx @modelcontextprotocol/inspector loom mcp` against a test workspace; manually verify each resource returns expected JSON shape and each tool executes without error; document any shape mismatches and fix | (manual, no new files) | 5–31 |
| ☐ | 42 | TS integration tests — create `packages/mcp/tests/integration.test.ts`; spawn `loom mcp` as subprocess via `StdioClientTransport`; test: (a) list resources, (b) read `loom://state`, (c) call `loom_create_idea` with valid args, (d) call `loom_complete_step` on a draft step, (e) error path: `loom_find_doc` with unknown ID | `packages/mcp/tests/integration.test.ts`, `packages/mcp/tests/fixtures/` | 41 |
| ☐ | 43 | Claude Code + Haiku e2e test — configure `loom mcp` in Claude Code MCP settings (model: `claude-haiku-4-5-20251001`); run 3 scenarios: (1) "list my weaves and tell me the active plan", (2) "mark step 2 done in plan {id}", (3) "create an idea called 'cache invalidation' in the core weave"; verify Loom state after each | (manual test session, notes in this doc) | 42 |
| ☐ | 44 | Add `packages/mcp` to `scripts/test-all.sh`; verify CI passes | `scripts/test-all.sh` | 42 |

---

## Phase 10 — Documentation & release

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| ☐ | 45 | Update `CLAUDE.md` — add MCP config snippet, note that `loom://thread-context` and `do-next-step` prompt are the primary entry points; add rule "always use Loom MCP tools for workflow state changes, never edit Loom docs directly" | `CLAUDE.md` | 43 |
| ☐ | 46 | Create `.cursor/rules/loom.md` — Cursor-compatible context file; same essence as CLAUDE.md addition but formatted for Cursor rules | `.cursor/rules/loom.md` | 43 |
| ☐ | 47 | Update `mcp-design.md` status `draft` → `active`; bump version; update `_status.md` | `loom/ai-integration/mcp/mcp-design.md`, `.loom/_status.md` | 44 |

---

## Technical notes

### Package structure

```
packages/mcp/
  src/
    index.ts             ← entry, stdio transport, LOOM_ROOT
    server.ts            ← createLoomMcpServer factory
    resources/
      state.ts
      status.ts
      linkIndex.ts
      diagnostics.ts
      summary.ts
      docs.ts
      threadContext.ts
      plan.ts
      requiresLoad.ts
    tools/
      createIdea.ts
      createDesign.ts
      createPlan.ts
      updateDoc.ts
      appendToChat.ts
      createChat.ts
      startPlan.ts
      completeStep.ts
      closePlan.ts
      promote.ts
      finalizeDoc.ts
      archive.ts
      rename.ts
      findDoc.ts
      searchDocs.ts
      getBlockedSteps.ts
      getStalePlans.ts
      generate.ts
    prompts/
      continueThread.ts
      doNextStep.ts
      refineDesign.ts
      weaveIdea.ts
      weaveDesign.ts
      weavePlan.ts
      validateState.ts
    sampling.ts
  tests/
    integration.test.ts
    fixtures/
  package.json
  tsconfig.json
```

### Claude Code MCP config

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

Config file location: `~/.claude.json` (global) or `{workspace}/.claude/mcp.json` (project-scoped).

### Key invariant

The agent has direct file access to `loom/`. It *could* edit Loom docs directly but that bypasses frontmatter invariants, link index updates, and plan-step parsing. Every tool description includes: "use this tool to modify Loom documents — do not edit weave files directly." This rule is also in `CLAUDE.md`.

### Dependency on existing app use cases

Phase 4–5 tools are thin MCP wrappers over existing `packages/app/` use cases. If the app use case doesn't exist yet (e.g., `promoteToDesign` may be partially implemented), the MCP tool exposes it but the app layer work is a blocker. This plan assumes app use cases are complete by Phase 4 start; if not, note the blocker per step.
