---
type: done
id: pl_01KV8NT170M8QYG99VH598Y0SA-done
title: Done — Close the vscode→fs layer gap — route all extension mutations through MCP
status: done
created: 2026-06-16
version: 11
tags: []
parent_id: pl_01KV8NT170M8QYG99VH598Y0SA
requires_load: []
---
# Done — Close the vscode→fs layer gap — route all extension mutations through MCP

## Step 1 — Add loom_create_weave: app createWeave use-case (ensureDir the weave folder — a weave has no manifest, so this is the whole job) + MCP tool wrapper + register in server.ts.

Added `loom_create_weave`.

- **`packages/app/src/weave.ts`** (new): `createWeave({ weaveId }, { getActiveLoomRoot, fs })` — `ensureDir`s `loom/{weaveId}`, refuses if it already exists, returns `{ weaveId, filePath }`. A weave has no manifest doc, so the dir is the whole job; kept behind an app use-case so the "every loom/ mutation goes through app" invariant holds.
- **`packages/mcp/src/tools/createWeave.ts`** (new): thin wrapper mirroring `createThread.ts` — imports the use-case from `../../../app/dist/weave`, passes `{ getActiveLoomRoot: () => getActiveLoomRoot(root), fs }`.
- **`packages/mcp/src/server.ts`**: imported `createWeave` and added it to the `create` group registry.

Note: live MCP server won't expose the new tool until the session/MCP restarts (build doesn't hot-reload the running `loom mcp`); validated by build + tests instead.

## Step 2 — Add loom_delete: app deleteItem use-case that removes a doc by id, or a whole thread/weave folder by {weaveId, threadId?} — the single sanctioned destructive path + MCP tool + register.

Added `loom_delete`.

- **`packages/app/src/remove.ts`** (new): `removeItem(input, deps)` with a discriminated `RemoveInput = { id } | { weaveId, threadId? }`. Doc path resolves via `resolveDocIdOrThrow`; folder path is `loom/{weave}[/{thread}]` with a pathExists guard. `fs.remove` either way; returns `{ removed }`. Destructive/irreversible by contract (archive is the recoverable path).
- **`packages/mcp/src/tools/delete.ts`** (new): wrapper exposing `id` / `weaveId` / `threadId`; builds the union and injects `{ getActiveLoomRoot, resolveDocIdOrThrow, fs }`.
- **`packages/mcp/src/server.ts`**: imported as `deleteItem`, added to the `doc` (lifecycle) group next to `archive`.

## Step 3 — Extend loom_archive to thread/weave folders: today the archive use-case is doc-only; add folder archival (move loom/{weave}[/{thread}] to loom/.archive/{weave}[/{thread}], mirroring the path).

Extended `loom_archive` to thread/weave folders and moved the logic into an app use-case (closing the pre-existing layering smell where the tool did `fs.move` directly).

- **`packages/app/src/archive.ts`** (new): `archiveItem(input, deps)` with `ArchiveInput = { id } | { weaveId, threadId? }`. Resolves the source (doc via `resolveDocIdOrThrow`, or folder `loom/{weave}[/{thread}]`), asserts it's inside `loom/`, mirrors the path under the single top-level `loom/.archive/` tree, `fs.move`. Returns `{ source, archivedPath }`.
- **`packages/mcp/src/tools/archive.ts`** (rewritten): now a thin wrapper over the use-case; input gains `weaveId`/`threadId` alongside `id`. **Result shape changed** from `{ id, archivedPath }` → `{ source, archivedPath }` (watch tests).
- Path convention is unchanged and still matches `archiveItem.ts` in the extension, so both surfaces agree.

## Step 4 — Add loom_restore: app restore use-case (move a doc or thread/weave folder from loom/.archive back to loom/, cleaning up empty archive container dirs) + MCP tool + register.

Added `loom_restore`.

- **`packages/app/src/restore.ts`** (new): `restoreItem(input, deps)` with `RestoreInput = { weaveId, threadId? } | { archivedRelPath }`. Moves `loom/.archive/{rel}` → `loom/{rel}`, then prunes archive container dirs left empty by the move (walks up to, but not into, `.archive/`). Docs are addressed by archive-relative path because archived docs aren't in the live link index (can't resolve by id). Returns `{ source, restored }`.
- **`packages/mcp/src/tools/restore.ts`** (new): wrapper exposing `weaveId`/`threadId`/`archivedRelPath`.
- **`packages/mcp/src/server.ts`**: imported `restore`, added to the `doc` group.

All four missing tools now exist (create_weave, delete, folder-aware archive, restore). Build deferred to step 11.

## Step 5 — Migrate threadCreate.ts and weaveCreate.ts to call loom_create_thread / loom_create_weave via getMCP(root); remove the raw fs import and drop the eager chats/ ensureDir (chats dirs are created lazily on first chat, matching MCP-created threads).

Migrated the create commands onto MCP; removed all raw `fs`.

- **`threadCreate.ts`** (rewritten): drops `fs`/`path` imports, the `pathExists` pre-check, the `ensureDir(threadPath)` and the eager `ensureDir(chats/)`. Now `getMCP(root).callTool('loom_create_thread', { weaveId, threadId })` → `waitForRefresh` → reveal. **This fixes the original bug**: `thread.md` is now written by the app use-case on create, and calling it on a pre-existing manifest-less folder heals it (the use-case only writes `thread.md` if absent).
- **`weaveCreate.ts`** (rewritten): same shape, calls `loom_create_weave`, drops the eager `chats/`.

Both mirror `chatNew.ts` (try/catch → notification on failure). `chats/` dirs are now lazy (created on first chat), matching MCP-created threads.

## Step 6 — Migrate deleteItem.ts to call loom_delete via getMCP(root); remove the raw fs import. Keep the modal confirm in the UI, pass the resolved doc id or {weaveId, threadId} to the tool.

Migrated `deleteItem.ts` onto `loom_delete`; removed `fs`/`path`.

- Branches on node shape (not the suffix-bearing `contextValue`): `node.doc?.id` → `{ id }`; `weaveId + threadId` → thread folder; `weaveId` only → weave folder. Confirmed via package.json that `loom.delete`'s when-clause (`/^(weave|thread|idea|design|plan|chat|done|ctx|loose|reference)/`) excludes archived nodes, so every target is live — no archive-path handling needed here.
- Keeps the modal confirm; on success `getMCP(root).callTool('loom_delete', args)` → `treeProvider.refresh()`; failures surface as a notification.

## Step 7 — Migrate archiveItem.ts and restoreItem.ts to call loom_archive (folder-aware) / loom_restore via getMCP(root); remove the raw fs imports and the in-command path-mirroring/cleanup logic (now in the use-cases).

Migrated archive + restore onto MCP; removed raw `fs` and the in-command path-mirroring/cleanup.

- **`archiveItem.ts`** (rewritten): same live-item branching as delete (`doc.id` / `weaveId+threadId` / `weaveId`) → `loom_archive`. The path-mirroring logic moved into the app use-case (step 3).
- **`restoreItem.ts`** (rewritten): archived folders → `{ weaveId, threadId? }`; an archived doc → `{ archivedRelPath }` computed as `node.doc._path` minus the `loom/.archive/` prefix (uses `path`, which the guard permits — only `fs`/`fs-extra`/`app` are banned). The empty-archive-dir cleanup moved into the app use-case (step 4).

Both now thin: build args → `getMCP(root).callTool(...)` → `refresh()`; failures notify.

## Step 8 — Route validate.ts through MCP: add a validation MCP surface (a loom://diagnostics resource or loom_validate tool returning structured per-doc issues) and call it via getMCP(root); remove the direct app and fs imports.

Routed `validate` through MCP — removed the only `vscode→app` *import*.

Design decision (was flagged resource-vs-tool): chose a **tool** in the `query` group, because validation is read-only and joins the existing read-only query tools (`getStaleDocs`, `searchDocs`, `getBlockedSteps`) — not a fork — and `mcp-client.callTool` already JSON-parses the result, so the command gets structured `{ results }` directly. A resource would have forced manual `JSON.parse` and a query-param URI template.

- **`packages/mcp/src/tools/validate.ts`** (new): wraps the existing `validate` app use-case; returns only `{ results }` (never the LinkIndex — it carries functions/maps). Registered in the `query` group.
- **`packages/vscode/src/commands/validate.ts`** (rewritten): drops `@reslava-loom/app/dist/validate`, `@reslava-loom/fs/dist`, and `fs-extra`. Now `getMCP(root).callTool('loom_validate', weaveId ? { weaveId } : { all: true })` and renders the same Output channel. This is the import that the step-10 guard most needed gone.

## Step 9 — Replace the fs.readdirSync(loom/refs) enumeration in addRequiresLoad.ts with an MCP read (a loom://refs resource listing reference docs as {id,title,file}); remove the fs import. The write already goes through loom_update_doc.

Replaced the `fs.readdirSync(loom/refs)` enumeration with an MCP resource read.

- **`packages/mcp/src/resources/refs.ts`** (new): `handleRefsResource` lists `loom/refs/*.md` via `loadDoc` (proper frontmatter parse, not regex) → `{ refs: [{ id, title, file }] }`. Skips malformed docs.
- **`packages/mcp/src/server.ts`**: imported the handler, added a `loom://refs` entry to `CONCRETE_RESOURCES`, and wired the `uri === 'loom://refs'` switch case.
- **`packages/vscode/src/commands/addRequiresLoad.ts`** (rewritten): drops `fs` and `path`; reads `loom://refs`, JSON-parses, builds the QuickPick, and still writes via `loom_update_doc`. Cleaner than the old inline title/id regex — the server does the parsing now.

That removes the last raw-`fs` read in the command layer (only `claudeTerminal.ts`'s tmpfile write remains, which the guard will carve out).

## Step 10 — Add the build-time import guard: a test (or ESLint no-restricted-imports) that fails if anything under packages/vscode/src imports fs, fs-extra, or the app package. Wire it into ./scripts/test-all.sh.

Added the import guard (option A scope, per Rafa) — and migrated the extra violators the commands-only audit had missed.

Migrations:
- **`diagnostics.ts`**: dropped `@reslava-loom/app` (validate), `@reslava-loom/fs` (buildLinkIndex/loadDoc), and `fs-extra`. Now calls `loom_validate` via MCP and builds the id→Uri map from the `loom://link-index` resource (`byId`). Keeps only vscode + path + getMCP.
- **`services/tokenEstimatorService.ts`**: removed the dead `estimateFromFile`/`estimate` (token estimates come from the context bundle server-side); the service is now a pure `format()` helper with no imports. Updated `extension.ts` construction (`new TokenEstimatorService()`).
- **`tree/treeProvider.ts`**: removed the `fs.existsSync('.loom')` early-out and the `fs`/`path` imports; workspace-initialised state is now derived from the `loom://state` read (`!state` / `weaves.length === 0` ⇒ empty tree).

Guard:
- **`tests/vscode-no-fs-imports.test.ts`** (new): scans `packages/vscode/src/**/*.ts`, fails on any import of `fs`/`fs-extra`/`node:fs`/`fs/promises`/`@reslava-loom/app`/`@reslava-loom/fs`. `@reslava-loom/core` (types + IO-free helpers) stays allowed. WHITELIST = `commands/claudeTerminal.ts` (tmpfile) + `extension.ts` (pre-MCP `.loom/` bootstrap), both now carrying a justifying comment; the test also fails on a stale whitelist entry.
- Wired into `scripts/test-all.sh` after `claude-md-sync`.

Standalone run: **green** — 46 files scanned, no forbidden imports.

## Step 11 — Build (./scripts/build-all.sh), run ./scripts/test-all.sh, then smoke-test in the Extension Development Host: create + delete + archive + restore both a weave and a thread, confirm thread.md is written on create, validation runs, and the refs picker works.

Build + automated tests green; live smoke test is Rafa's manual gate.

- `./scripts/build-all.sh` — all packages compile (core→fs→app→mcp→cli→vscode).
- `./scripts/test-all.sh` — **all green**, including the MCP integration suite (17/17) and the new `vscode-no-fs-imports` guard.

**Regression caught & fixed during this step:** `resolution-dx.test.ts` failed because my archive/delete/restore/createWeave tools resolved paths via `getActiveLoomRoot(root)`, which — when the passed root lacks `.loom/` (the test fixture) — walks up from cwd and returns the *real* loom workspace. The old archive tool used the raw `root`. Fixed all four tool wrappers to pass `getActiveLoomRoot: () => root` (the server-provided `root` is already the active loom root), dropping the now-unused `getActiveLoomRoot` import. Re-ran: resolution-dx + full suite pass.

**Manual smoke test still pending (Rafa):** create/delete/archive/restore a weave + thread, confirm `thread.md` is written on create, validation runs, refs picker works. ⚠️ Requires a **Reload Window** (rebuilt extension) AND a fresh MCP server — the session's running `loom mcp` is stale, so the new tools (`loom_create_weave`, `loom_delete`, `loom_restore`, `loom_validate`, folder-aware `loom_archive`) and the `loom://refs` resource won't be live until restart.
