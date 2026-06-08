---
type: done
id: pl_01KTJS51X8B0QWC8Z6MQAKGY5Y-done
title: Done — CLI Commands — Tier 1+2 Plan
status: done
created: "2026-06-08T00:00:00.000Z"
version: 7
tags: []
parent_id: pl_01KTJS51X8B0QWC8Z6MQAKGY5Y
requires_load: []
---
# Done — CLI Commands — Tier 1+2 Plan

## Step 1 — Add packages/cli/src/mcpClient.ts: an in-process MCP client helper that builds the server via createLoomMcpServer(root), connects over an in-memory transport pair, runs initialize + notifications/initialized, and exposes readResource(uri) / listResources() / getPrompt(name, args) with teardown. Add a unit test that round-trips loom://catalog and asserts non-empty grouped markdown.

Added the in-process MCP client helper for the CLI delivery layer.

**Files created:**
- `packages/cli/src/mcpClient.ts` — `connectLocalMcp(root)` builds the server via `createLoomMcpServer(root)`, links it to the client over `InMemoryTransport.createLinkedPair()` (shipped by the MCP SDK), and `Client.connect()` runs the `initialize` + `notifications/initialized` handshake automatically. Returns a `LocalMcpClient` façade exposing `readResource(uri)` (joins text contents), `listResources()` (returns `{uri, title}`), `getPrompt(name, args)` (joins text messages), and `close()` (tears down client + server). No subprocess, no stdio framing, no LOOM_ROOT env juggling — the design's key decision.
- `tests/cli-mcp-client.test.ts` — unit test that creates a minimal temp root (`.loom/` marker only, since the catalog is built from the live tool registry and needs no weave docs), round-trips `loom://catalog`, and asserts the markdown is non-empty, carries its header, is grouped (`### ` headings), and lists a known tool. Also asserts `listResources()` returns `loom://catalog` with non-empty titles.

**Decisions:**
- Imported `createLoomMcpServer` from `../../mcp/dist/server` mirroring the existing `index.ts` import style; esbuild bundles it in-process.
- Client info version is cosmetic (`loom-cli`/`1.0.0`); not coupled to package.json.
- Test placed in `tests/` and run via ts-node against the `.ts` source (CLI is esbuild-bundled to a single file, so there is no per-module `dist` to import). Verified green: `npx ts-node --project tests/tsconfig.json tests/cli-mcp-client.test.ts` passes. Registration into `test-all.sh` is deferred to Step 7.

## Step 2 — Add `loom catalog` (commands/catalog.ts) — readResource('loom://catalog'), print grouped markdown — and wire it into index.ts.

Added the `loom catalog` command.

**Files created:**
- `packages/cli/src/commands/catalog.ts` — `catalogCommand()`: resolves the active loom root via `getActiveLoomRoot()` (from `fs/dist`), opens the in-process MCP client (`connectLocalMcp`), reads `loom://catalog`, prints the grouped markdown, and closes the client in a `finally`. Follows the existing command error pattern (`chalk.red` + `process.exit(1)` on throw).

**Files edited:**
- `packages/cli/src/index.ts` — imported `catalogCommand` and registered `program.command('catalog')` with a description, placed just before the `mcp` command.

**Verification:** `npx ts-node packages/cli/src/index.ts catalog` prints the full grouped tool index (Create/Refine/Generate/... groups), confirming the in-process handshake → readResource → print path works end-to-end from a plain terminal.

## Step 3 — Add `loom resources` (commands/resources.ts): bare command lists resources (uri + title) via listResources(); `loom resources read <uri>` subcommand prints readResource(uri). Wire both into index.ts.

Added the `loom resources` command with a `read` subcommand.

**Files created:**
- `packages/cli/src/commands/resources.ts` — two handlers:
  - `resourcesListCommand()` — `listResources()`, prints each `uri` (cyan, padded to align) + `title`. Empty-state message when none.
  - `resourcesReadCommand(uri)` — `readResource(uri)`, prints the contents. Generalizes `loom catalog` and makes templated resources (`loom://context/<id>`, `loom://summary`, etc.) reachable from the terminal.
  - Both resolve the active loom root, open/close the in-process MCP client in a `finally`, and use the standard `chalk.red` + `process.exit(1)` error path.

**Files edited:**
- `packages/cli/src/index.ts` — imported both handlers; registered `program.command('resources')` with `.action(resourcesListCommand)` (bare form lists) and a nested `.command('read <uri>')` subcommand wired to `resourcesReadCommand`.

**Verification:** `loom resources` lists all six concrete resources (state/status/link-index/diagnostics/summary/catalog) with titles; `loom resources read loom://summary` prints the summary JSON. (Pre-existing buildLinkIndex diagnostics print to stderr — unrelated to this command.)

## Step 4 — Add `loom context <docId>` (commands/context.ts) over readResource('loom://context/<docId>') with --mode and the thread/<weave>/<thread> form, and `loom next [plan-id]` (commands/next.ts) over getPrompt('do-next-step', {planId}) defaulting to the active plan. Wire into index.ts.

Added `loom context <docId>` and `loom next [plan-id]`.

**Files created:**
- `packages/cli/src/commands/context.ts` — `contextCommand(docId, {mode})`: builds `loom://context/${docId}` and appends `?mode=${mode}` when `--mode` is given, then `readResource` + print. The docId is passed straight into the URI, so the `thread/<weave>/<thread>` form (and any future templated form) works with no special-casing.
- `packages/cli/src/commands/next.ts` — `nextCommand(planId?)`: when planId is omitted, `resolveActivePlanId()` calls the app `getState` use-case and picks the first `implementing` plan (else first `active`) across all weaves/threads — the do-next-step prompt **requires** a planId (it throws otherwise), so the default must be resolved CLI-side. Then `getPrompt('do-next-step', {planId})` + print. Friendly yellow message when no active plan exists.

**Files edited:**
- `packages/cli/src/index.ts` — imported both handlers; registered `program.command('context <docId>')` with `--mode <mode>` and `program.command('next [plan-id]')`.

**Decisions:**
- Active-plan resolution mirrors `status.ts` (implementing > active precedence) but scans the whole workspace, not a single weave, since `loom next` is workspace-global.

**Verification:** `loom next` (no arg) resolved the active plan `pl_01KTJS51X8B0QWC8Z6MQAKGY5Y` and printed its implementing-mode context bundle + next-step instruction; `loom context thread/cli/cli-commands` printed the thread's chat-mode bundle.

## Step 5 — Add `loom search <query>` (commands/search.ts) over the app search use-case, printing id + title + snippet. Verify the app use-case exists; if missing add the thin wrapper in app, not the CLI. Wire into index.ts.

Added `loom search <query>`. The app search use-case did **not** exist — the search logic lived inline inside the `loom_search_docs` MCP tool. Per the plan ("if missing add the thin wrapper in app, not the CLI") and CLAUDE.md's no-duplication rule, I extracted it into a real app use-case that is now the single source of truth for both surfaces.

**Files created:**
- `packages/app/src/searchDocs.ts` — `searchDocs(input, deps)` use-case following the app `(input, deps) => result` convention. `input: {query, type?, weaveId?}`, `deps: GetStateDeps`. Calls `getState` then matches (case-insensitive substring) id/title/content across thread docs + loose fibers, returns `SearchResult[]` (id/type/title/weaveId/threadId/filePath/excerpt). Exports `SearchDocsInput`, `SearchDocsDeps`, `SearchResult`.
- `packages/cli/src/commands/search.ts` — `searchCommand(query, {type, weave})`: calls the app use-case with `fsDeps`, prints `id [type] title` + a gray snippet per result; yellow empty-state.

**Files edited:**
- `packages/app/src/index.ts` — export the new use-case + types.
- `packages/mcp/src/tools/searchDocs.ts` — **refactored** to call `searchDocs` from `app/dist` and `JSON.stringify` the result; deleted its private copy of the search/excerpt logic. Tool wire contract (name/inputSchema/JSON output) unchanged — single source of truth now.
- `packages/cli/src/index.ts` — imported + registered `program.command('search <query>')` with `--type` and `--weave` options.

**Verification:** Rebuilt `app` and `mcp` with `tsc --build --force` (clean, no type errors — confirms the refactored MCP tool and CLI both bind to the new app signature). `loom search "in-process MCP" --type design` returns the CLI Commands — Design doc with an id/title/snippet line. The MCP tool's behavior is exercised by the existing integration test in Step 7.

## Step 6 — Add `loom stale` (commands/stale.ts) and `loom blocked` (commands/blocked.ts) over the existing app stale-docs and blocked-steps use-cases, printing doc/step + reason. Wire into index.ts.

Added `loom stale` and `loom blocked`. Like search (Step 5), the "existing app stale-docs and blocked-steps use-cases" did **not** exist — the logic lived inline in the MCP tools. Extracted both into app use-cases (single source of truth), refactored the MCP tools to call them, added the CLI commands.

**Files created:**
- `packages/app/src/getStaleDocs.ts` — `getStaleDocs(deps)` returns `StaleDoc[]` (plans behind design_version + children whose parent updated after them). Exports `StaleDoc`, `GetStaleDocsDeps`.
- `packages/app/src/getBlockedSteps.ts` — `getBlockedSteps(deps)` returns `BlockedStep[]` (unsatisfied "Blocked by" deps across implementing plans). Exports `BlockedStep`, `GetBlockedStepsDeps`.
- `packages/cli/src/commands/stale.ts` — `staleCommand()`: app use-case + `fsDeps`, prints `id [type] title` + yellow reason; green "no stale docs" empty-state.
- `packages/cli/src/commands/blocked.ts` — `blockedCommand()`: app use-case + `fsDeps`, prints `planId step N: desc` + yellow blockers; green empty-state.

**Files edited:**
- `packages/app/src/index.ts` — export both use-cases + types.
- `packages/mcp/src/tools/getStaleDocs.ts` and `getBlockedSteps.ts` — **refactored** to call the app use-cases and `JSON.stringify`; deleted their private logic copies. Wire contracts unchanged.
- `packages/cli/src/index.ts` — imported + registered `program.command('stale')` and `program.command('blocked')`.

**Verification:** Rebuilt `app` + `mcp` (clean). `loom stale` lists 46 stale docs with reasons (e.g. `design_version 1 < current 2`); `loom blocked` lists 1 blocked step with `blocked by: 1, 2, 3, 4`. MCP-tool parity is exercised by Step 7's integration test.

## Step 7 — Add command tests in the tests/commands.test.ts style against a fixture loom for each new command, then run ./scripts/build-all.sh and ./scripts/test-all.sh and confirm green.

Added command tests for every new command and ran the full build + test suite green.

**Files edited:**
- `tests/commands.test.ts` — added `testNewCliCommands()` (registered in `runAll`): seeds a hermetic fixture loom (`feature` weave/thread, active design, implementing plan whose step 2 is blocked by step 1) and exercises each new command via the globally-linked `loom` binary:
  - `loom catalog` → asserts `loom_do_step` present
  - `loom resources` → asserts `loom://catalog` listed
  - `loom resources read loom://summary` → asserts `totalWeaves`
  - `loom context feature-design` → asserts `loom:context-bundle`
  - `loom next feature-plan-001` → asserts `Implement step 1`
  - `loom search "Second step"` → asserts the plan id is found by content
  - `loom stale` → asserts output mentions "stale" (empty + non-empty both do)
  - `loom blocked` → asserts the plan with the blocked step is listed
- `scripts/test-all.sh` — registered `tests/cli-mcp-client.test.ts` (the Step 1 unit test) right after `commands.test.ts`.

**Verification:**
- `./scripts/build-all.sh` — clean: core → fs → app → mcp → cli (esbuild bundle, 1022kb) → npm link → vscode. No errors.
- `./scripts/test-all.sh` — all green. The new `Tier 1+2 CLI command tests` (8 commands) and `cli-mcp-client` unit test pass; the MCP integration suite (16 passed, 0 failed) confirms the refactored `loom_search_docs` / `loom_get_stale_docs` / `loom_get_blocked_steps` tools (now delegating to the shared app use-cases) still work end-to-end. Whole suite reports "✅ All tests passed".
