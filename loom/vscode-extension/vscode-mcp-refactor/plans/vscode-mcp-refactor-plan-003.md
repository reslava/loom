---
type: plan
id: pl_01KV8NT170M8QYG99VH598Y0SA
title: Close the vscode→fs layer gap — route all extension mutations through MCP
status: done
created: 2026-06-16
updated: 2026-06-16
version: 1
design_version: 1
req_version: 4
tags: []
parent_id: de_01KQYDFDDFZT3CVEBS43EJHVWT
requires_load: []
target_version: 0.1.0
steps:
  - id: tool-loom-create-weave
    order: 1
    status: done
    description: "Add loom_create_weave: app createWeave use-case (ensureDir the weave folder — a weave has no manifest, so this is the whole job) + MCP tool wrapper + register in server.ts."
    files_touched: [packages/app/src/weave.ts, packages/mcp/src/tools/createWeave.ts, packages/mcp/src/server.ts]
    blocked_by: []
    satisfies: [IN3]
  - id: tool-loom-delete
    order: 2
    status: done
    description: "Add loom_delete: app deleteItem use-case that removes a doc by id, or a whole thread/weave folder by {weaveId, threadId?} — the single sanctioned destructive path + MCP tool + register."
    files_touched: [packages/app/src/remove.ts, packages/mcp/src/tools/delete.ts, packages/mcp/src/server.ts]
    blocked_by: []
    satisfies: [IN3]
  - id: tool-archive-folders
    order: 3
    status: done
    description: "Extend loom_archive to thread/weave folders: today the archive use-case is doc-only; add folder archival (move loom/{weave}[/{thread}] to loom/.archive/{weave}[/{thread}], mirroring the path)."
    files_touched: [packages/app/src/archive.ts, packages/mcp/src/tools/archive.ts, packages/mcp/src/server.ts]
    blocked_by: []
    satisfies: [IN3]
  - id: tool-loom-restore
    order: 4
    status: done
    description: "Add loom_restore: app restore use-case (move a doc or thread/weave folder from loom/.archive back to loom/, cleaning up empty archive container dirs) + MCP tool + register."
    files_touched: [packages/app/src/restore.ts, packages/mcp/src/tools/restore.ts, packages/mcp/src/server.ts]
    blocked_by: []
    satisfies: [IN3]
  - id: migrate-create-commands
    order: 5
    status: done
    description: Migrate threadCreate.ts and weaveCreate.ts to call loom_create_thread / loom_create_weave via getMCP(root); remove the raw fs import and drop the eager chats/ ensureDir (chats dirs are created lazily on first chat, matching MCP-created threads).
    files_touched: [packages/vscode/src/commands/threadCreate.ts, packages/vscode/src/commands/weaveCreate.ts]
    blocked_by: []
    satisfies: [IN3, IN4, C1]
  - id: migrate-delete
    order: 6
    status: done
    description: Migrate deleteItem.ts to call loom_delete via getMCP(root); remove the raw fs import. Keep the modal confirm in the UI, pass the resolved doc id or {weaveId, threadId} to the tool.
    files_touched: [packages/vscode/src/commands/deleteItem.ts]
    blocked_by: []
    satisfies: [IN3, IN4, C1]
  - id: migrate-archive-restore
    order: 7
    status: done
    description: Migrate archiveItem.ts and restoreItem.ts to call loom_archive (folder-aware) / loom_restore via getMCP(root); remove the raw fs imports and the in-command path-mirroring/cleanup logic (now in the use-cases).
    files_touched: [packages/vscode/src/commands/archiveItem.ts, packages/vscode/src/commands/restoreItem.ts]
    blocked_by: []
    satisfies: [IN3, IN4, C1]
  - id: migrate-validate-via-mcp
    order: 8
    status: done
    description: "Route validate.ts through MCP: add a validation MCP surface (a loom://diagnostics resource or loom_validate tool returning structured per-doc issues) and call it via getMCP(root); remove the direct app and fs imports."
    files_touched: [packages/mcp/src/tools/validate.ts, packages/mcp/src/server.ts, packages/vscode/src/commands/validate.ts]
    blocked_by: []
    satisfies: [IN4, C1]
  - id: migrate-refs-picker-via-mcp
    order: 9
    status: done
    description: "Replace the fs.readdirSync(loom/refs) enumeration in addRequiresLoad.ts with an MCP read (a loom://refs resource listing reference docs as {id,title,file}); remove the fs import. The write already goes through loom_update_doc."
    files_touched: [packages/mcp/src/server.ts, packages/vscode/src/commands/addRequiresLoad.ts]
    blocked_by: []
    satisfies: [IN4, C1]
  - id: guard-ban-fs-app-imports-in
    order: 10
    status: done
    description: "Add the build-time import guard: a test (or ESLint no-restricted-imports) that fails if anything under packages/vscode/src imports fs, fs-extra, or the app package. Wire it into ./scripts/test-all.sh."
    files_touched: [tests/vscode-no-fs-imports.test.ts, scripts/test-all.sh]
    blocked_by: []
    satisfies: [C1, IN4]
  - id: build-test-smoke-test
    order: 11
    status: done
    description: "Build (./scripts/build-all.sh), run ./scripts/test-all.sh, then smoke-test in the Extension Development Host: create + delete + archive + restore both a weave and a thread, confirm thread.md is written on create, validation runs, and the refs picker works."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Close the vscode→fs layer gap — route all extension mutations through MCP

## Goal

Five extension commands reach around the vscode→mcp→app chain and mutate loom/ (or import app) with raw fs: threadCreate (the bug — creates the folder but never writes thread.md), weaveCreate, deleteItem, archiveItem/restoreItem, plus validate importing the app package directly and addRequiresLoad reading loom/refs via fs. The loom-mcp-gate hook only guards Claude Code sessions editing files; it has no reach into the extension's compiled code, so these commands are the one actor that can silently corrupt state (no reducers, no link-index update, no manifest). They grew because MCP surface is missing: there is no loom_create_weave, loom_delete, or loom_restore, and loom_archive is doc-only. This plan builds those four tools (app use-case + MCP tool + registration each), migrates all five commands plus the two read-path offenders onto MCP, and lands a build-time import guard so nothing under packages/vscode/src can import fs, fs-extra, or the app package again. Advances req IN3 (mutations route through loom_* tools), IN4 (remove app imports), and constraint C1 (dependency direction vscode→mcp→app).

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add loom_create_weave: app createWeave use-case (ensureDir the weave folder — a weave has no manifest, so this is the whole job) + MCP tool wrapper + register in server.ts. | packages/app/src/weave.ts, packages/mcp/src/tools/createWeave.ts, packages/mcp/src/server.ts | — | IN3 |
| ✅ | 2 | Add loom_delete: app deleteItem use-case that removes a doc by id, or a whole thread/weave folder by {weaveId, threadId?} — the single sanctioned destructive path + MCP tool + register. | packages/app/src/remove.ts, packages/mcp/src/tools/delete.ts, packages/mcp/src/server.ts | — | IN3 |
| ✅ | 3 | Extend loom_archive to thread/weave folders: today the archive use-case is doc-only; add folder archival (move loom/{weave}[/{thread}] to loom/.archive/{weave}[/{thread}], mirroring the path). | packages/app/src/archive.ts, packages/mcp/src/tools/archive.ts, packages/mcp/src/server.ts | — | IN3 |
| ✅ | 4 | Add loom_restore: app restore use-case (move a doc or thread/weave folder from loom/.archive back to loom/, cleaning up empty archive container dirs) + MCP tool + register. | packages/app/src/restore.ts, packages/mcp/src/tools/restore.ts, packages/mcp/src/server.ts | — | IN3 |
| ✅ | 5 | Migrate threadCreate.ts and weaveCreate.ts to call loom_create_thread / loom_create_weave via getMCP(root); remove the raw fs import and drop the eager chats/ ensureDir (chats dirs are created lazily on first chat, matching MCP-created threads). | packages/vscode/src/commands/threadCreate.ts, packages/vscode/src/commands/weaveCreate.ts | — | IN3, IN4, C1 |
| ✅ | 6 | Migrate deleteItem.ts to call loom_delete via getMCP(root); remove the raw fs import. Keep the modal confirm in the UI, pass the resolved doc id or {weaveId, threadId} to the tool. | packages/vscode/src/commands/deleteItem.ts | — | IN3, IN4, C1 |
| ✅ | 7 | Migrate archiveItem.ts and restoreItem.ts to call loom_archive (folder-aware) / loom_restore via getMCP(root); remove the raw fs imports and the in-command path-mirroring/cleanup logic (now in the use-cases). | packages/vscode/src/commands/archiveItem.ts, packages/vscode/src/commands/restoreItem.ts | — | IN3, IN4, C1 |
| ✅ | 8 | Route validate.ts through MCP: add a validation MCP surface (a loom://diagnostics resource or loom_validate tool returning structured per-doc issues) and call it via getMCP(root); remove the direct app and fs imports. | packages/mcp/src/tools/validate.ts, packages/mcp/src/server.ts, packages/vscode/src/commands/validate.ts | — | IN4, C1 |
| ✅ | 9 | Replace the fs.readdirSync(loom/refs) enumeration in addRequiresLoad.ts with an MCP read (a loom://refs resource listing reference docs as {id,title,file}); remove the fs import. The write already goes through loom_update_doc. | packages/mcp/src/server.ts, packages/vscode/src/commands/addRequiresLoad.ts | — | IN4, C1 |
| ✅ | 10 | Add the build-time import guard: a test (or ESLint no-restricted-imports) that fails if anything under packages/vscode/src imports fs, fs-extra, or the app package. Wire it into ./scripts/test-all.sh. | tests/vscode-no-fs-imports.test.ts, scripts/test-all.sh | — | C1, IN4 |
| ✅ | 11 | Build (./scripts/build-all.sh), run ./scripts/test-all.sh, then smoke-test in the Extension Development Host: create + delete + archive + restore both a weave and a thread, confirm thread.md is written on create, validation runs, and the refs picker works. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:tool-loom-create-weave -->
### Step 1 — Tool: loom_create_weave

Mirror the createThread use-case shape in packages/app/src/thread.ts: (input {weaveId}, deps ScaffoldDeps) => {weaveId, filePath}, idempotency via a pathExists guard. No thread.md-style manifest for weaves. Register in the server.ts tool table (new weave group, or alongside thread).

<!-- step:tool-loom-delete -->
### Step 2 — Tool: loom_delete

Input is a discriminated shape: {id} for a single doc (resolve via findDoc then fs.remove), or {weaveId, threadId?} for a folder. Keep it in app so the rule 'all loom/ mutation goes through a use-case' holds even for deletes (no reducer needed, but the seam must exist). The MCP tool returns the removed path(s).

<!-- step:tool-archive-folders -->
### Step 3 — Tool: archive folders

Match the path convention already in archiveItem.ts (mirror weave/thread path under the single top-level loom/.archive/). Extend the existing use-case/tool input to accept a folder target {weaveId, threadId?} in addition to a doc {id} — do not fork a second tool.

<!-- step:tool-loom-restore -->
### Step 4 — Tool: loom_restore

Inverse of archive: same {id} | {weaveId, threadId?} shape. Port the empty-archive-weave-dir cleanup currently in restoreItem.ts into the use-case so the UI command becomes a thin caller.

<!-- step:migrate-create-commands -->
### Step 5 — Migrate: create commands

Mirror chatNew.ts: try/catch around getMCP(root).callTool(...), then treeProvider.waitForRefresh() + reveal. Drop the local pathExists pre-check — let the tool's idempotency guard report a duplicate. This fixes the original bug: thread.md is now written by the app use-case the moment the thread is created.

<!-- step:migrate-validate-via-mcp -->
### Step 8 — Migrate: validate via MCP

This is the only vscode-to-app import break (not just fs). Decide resource vs tool: a loom://diagnostics?weave={id} resource fits the read-only nature and the existing loom:// resource pattern; the extension renders results into its Output channel unchanged. Reuse the existing validate app use-case behind the MCP surface.

<!-- step:guard-ban-fs-app-imports-in -->
### Step 10 — Guard: ban fs/app imports in vscode

Same philosophy as claude-md-sync.test.ts and the loom-mcp-gate hook, pointed at the layer the hook can't see. Carve-out: claudeTerminal.ts writes a prompt tmpfile to os.tmpdir() — allow it via node:fs restricted to tmp, or whitelist that one file by path with a comment. Land this last so it goes green exactly when the final fs/app import is removed.

<!-- step:build-test-smoke-test -->
### Step 11 — Build, test, smoke-test

Live Extension-Host testing is req EX1 (excluded from automated scope) — this step is the manual verification gate before the plan closes, not an automated requirement.
