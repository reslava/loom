---
type: plan
id: pl_01KWEHB46B8AKB9WNRZCFYZ4RV
title: Loom entities CRUD
status: done
created: 2026-07-01
updated: 2026-07-01
version: 2
design_version: 8
tags: []
parent_id: de_01KWEGNABRHPMVY50E6DGRX4WQ
requires_load: []
target_version: 0.1.0
steps:
  - id: canonical-filename-module
    order: 1
    status: done
    description: Add a canonical doc-filename derivation module + per-thread ordinal allocator (gaps allowed, by created order) and unify ALL filename-derivation sites onto it — docPathInThread's fallback switch AND the per-type MCP create tools, which currently disagree — producing idea.md, design.md, plan-NNN.md, plan-NNN-done.md, chat-NNN.md; req/thread/reference unchanged.
    files_touched: [packages/fs/src/repositories/docNaming.ts, packages/fs/src/repositories/threadRepository.ts]
    blocked_by: []
    satisfies: []
  - id: loom-migrate-layout-command
    order: 2
    status: done
    description: "Add loom migrate-layout (its own CLI command, not folded into migrate-to-threads.ts): a one-pass, rename-only sweep of existing docs to the new scheme sharing the naming module, with --dry-run."
    files_touched: [packages/app/src/migrateLayout.ts, packages/cli/src/commands/migrate-layout.ts, packages/cli/src/index.ts]
    blocked_by: [canonical-filename-module]
    satisfies: []
  - id: enforce-weave-only-threads
    order: 3
    status: done
    description: "Remove the dead weave-root document-creation code paths so every doc must live in a thread: strip the no-threadId branch from weaveIdea/weaveDesign/weavePlan and require a thread for weave-root chat creation."
    files_touched: [packages/app/src/weaveIdea.ts, packages/app/src/weaveDesign.ts, packages/app/src/weavePlan.ts]
    blocked_by: []
    satisfies: []
  - id: app-weave-thread-folder-crud
    order: 4
    status: done
    description: Add app use-cases renameWeave (rename weave folder), renameThread (rename thread folder slug; thread.md ULID and docs untouched), and moveThread (move a thread folder to another weave; th_ ULID and depends_on survive).
    files_touched: [packages/app/src/weave.ts, packages/app/src/thread.ts, packages/app/src/index.ts]
    blocked_by: [canonical-filename-module]
    satisfies: []
  - id: app-movedoc-reference-renamedocfile
    order: 5
    status: done
    description: "Add moveDoc(id, toWeaveId, toThreadId) that hard-refuses when the doc has a parent_id or children, or when the destination singleton slot (idea/design) is occupied; and renameDocFile(id, newSlug) guarded to type:reference."
    files_touched: [packages/app/src/moveDoc.ts, packages/app/src/renameDocFile.ts, packages/app/src/index.ts]
    blocked_by: [canonical-filename-module]
    satisfies: []
  - id: mcp-tools-for-entity-crud
    order: 6
    status: done
    description: "Expose the new app use-cases as thin MCP tools: loom_rename_weave, loom_rename_thread, loom_move_thread, loom_move_doc, loom_rename_doc_file; register them so the auto-generated loom://catalog picks them up. loom_rename stays title-only."
    files_touched: [packages/mcp/src/tools/renameWeave.ts, packages/mcp/src/tools/renameThread.ts, packages/mcp/src/tools/moveThread.ts, packages/mcp/src/tools/moveDoc.ts, packages/mcp/src/tools/renameDocFile.ts, packages/mcp/src/tools/index.ts]
    blocked_by: [app-weave-thread-folder-crud, app-movedoc-reference-renamedocfile]
    satisfies: []
  - id: extension-wiring-f2-drag-and-drop
    order: 7
    status: done
    description: "Fix the mis-wired rename: F2 renames doc title vs weave/thread folder by node kind; add a reference-only 'Rename file' action; add drag-and-drop (thread→weave = loom_move_thread, loose-fiber doc→thread = loom_move_doc with rejection message); make the destructive tree action archive-first with a separate confirmed delete; fix package.json when-clauses."
    files_touched: [packages/vscode/src/commands/rename.ts, packages/vscode/package.json, packages/vscode/src/tree/treeProvider.ts]
    blocked_by: [mcp-tools-for-entity-crud]
    satisfies: []
  - id: tests-build
    order: 8
    status: done
    description: Add tests for filename/ordinal derivation, migrate-layout --dry-run, and the moveDoc loose-fiber/slot guards; then run build-all and test-all and fix fallout.
    files_touched: [tests/entities-crud.test.ts, scripts/build-all.sh, scripts/test-all.sh]
    blocked_by: [canonical-filename-module, loom-migrate-layout-command, app-weave-thread-folder-crud, app-movedoc-reference-renamedocfile, mcp-tools-for-entity-crud]
    satisfies: []
---
# Loom entities CRUD

## Goal

Implement container-aware CRUD for Loom entities per the design. Weaves and threads are fs folders whose rename/move happen via thin MCP-mediated fs use-cases (never raw fs from the extension); document filenames flatten and humanize (idea.md, design.md, plan-NNN.md, plan-NNN-done.md, chat-NNN.md; references keep {slug}.md) with a one-pass loom migrate-layout command; cross-thread document moves are restricted to loose fibers (no parent, no children); delete is archive-first; references gain a filename-slug rename; the extension gets F2 (title on docs, folder on weave/thread) plus drag-and-drop (thread→weave, loose-fiber→thread); and the MCP gate is re-enabled. ULIDs remain the sole identity, so every folder/file rename rewrites zero doc content.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a canonical doc-filename derivation module + per-thread ordinal allocator (gaps allowed, by created order) and unify ALL filename-derivation sites onto it — docPathInThread's fallback switch AND the per-type MCP create tools, which currently disagree — producing idea.md, design.md, plan-NNN.md, plan-NNN-done.md, chat-NNN.md; req/thread/reference unchanged. | packages/fs/src/repositories/docNaming.ts, packages/fs/src/repositories/threadRepository.ts | — | — |
| ✅ | 2 | Add loom migrate-layout (its own CLI command, not folded into migrate-to-threads.ts): a one-pass, rename-only sweep of existing docs to the new scheme sharing the naming module, with --dry-run. | packages/app/src/migrateLayout.ts, packages/cli/src/commands/migrate-layout.ts, packages/cli/src/index.ts | canonical-filename-module | — |
| ✅ | 3 | Remove the dead weave-root document-creation code paths so every doc must live in a thread: strip the no-threadId branch from weaveIdea/weaveDesign/weavePlan and require a thread for weave-root chat creation. | packages/app/src/weaveIdea.ts, packages/app/src/weaveDesign.ts, packages/app/src/weavePlan.ts | — | — |
| ✅ | 4 | Add app use-cases renameWeave (rename weave folder), renameThread (rename thread folder slug; thread.md ULID and docs untouched), and moveThread (move a thread folder to another weave; th_ ULID and depends_on survive). | packages/app/src/weave.ts, packages/app/src/thread.ts, packages/app/src/index.ts | canonical-filename-module | — |
| ✅ | 5 | Add moveDoc(id, toWeaveId, toThreadId) that hard-refuses when the doc has a parent_id or children, or when the destination singleton slot (idea/design) is occupied; and renameDocFile(id, newSlug) guarded to type:reference. | packages/app/src/moveDoc.ts, packages/app/src/renameDocFile.ts, packages/app/src/index.ts | canonical-filename-module | — |
| ✅ | 6 | Expose the new app use-cases as thin MCP tools: loom_rename_weave, loom_rename_thread, loom_move_thread, loom_move_doc, loom_rename_doc_file; register them so the auto-generated loom://catalog picks them up. loom_rename stays title-only. | packages/mcp/src/tools/renameWeave.ts, packages/mcp/src/tools/renameThread.ts, packages/mcp/src/tools/moveThread.ts, packages/mcp/src/tools/moveDoc.ts, packages/mcp/src/tools/renameDocFile.ts, packages/mcp/src/tools/index.ts | app-weave-thread-folder-crud, app-movedoc-reference-renamedocfile | — |
| ✅ | 7 | Fix the mis-wired rename: F2 renames doc title vs weave/thread folder by node kind; add a reference-only 'Rename file' action; add drag-and-drop (thread→weave = loom_move_thread, loose-fiber doc→thread = loom_move_doc with rejection message); make the destructive tree action archive-first with a separate confirmed delete; fix package.json when-clauses. | packages/vscode/src/commands/rename.ts, packages/vscode/package.json, packages/vscode/src/tree/treeProvider.ts | mcp-tools-for-entity-crud | — |
| ✅ | 8 | Add tests for filename/ordinal derivation, migrate-layout --dry-run, and the moveDoc loose-fiber/slot guards; then run build-all and test-all and fix fallout. | tests/entities-crud.test.ts, scripts/build-all.sh, scripts/test-all.sh | canonical-filename-module, loom-migrate-layout-command, app-weave-thread-folder-crud, app-movedoc-reference-renamedocfile, mcp-tools-for-entity-crud | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |

<!-- step:canonical-filename-module -->
### Step 1 — Canonical filename module

The ordinal allocator counts existing plan-NNN/chat-NNN files and returns max+1 (never reuses gaps). Filenames keep a type token so the tree's filename→type inference still works. ULIDs stay in frontmatter as identity.

<!-- step:loom-migrate-layout-command -->
### Step 2 — loom migrate-layout command

Rename {threadId}-idea/design.md → idea.md/design.md; plan {threadId}-plan-NNN.md → plan-NNN.md and its done (mixed: {planULID}-done.md recent / {threadId}-plan-NNN.md legacy) → plan-NNN-done.md; chat {threadId}.md or {threadId}-chat-NNN.md → chat-NNN.md. Zero content rewrites (identity + links are frontmatter ULIDs; findDocumentById scans frontmatter). No weave-root sweep needed (none exist).

<!-- step:enforce-weave-only-threads -->
### Step 3 — Enforce weave-only-threads

Invariant: a weave folder's direct children are thread folders only. Callers must supply a threadId (create/select a thread first).

<!-- step:app-weave-thread-folder-crud -->
### Step 4 — App: weave/thread folder CRUD

Folder ops via fs behind app use-cases (the 'all loom/ mutation goes through app' seam). renameThread depends on flattened idea/design filenames (step 1) so a folder rename leaves no {oldThreadId}-idea.md mismatch.

<!-- step:app-movedoc-reference-renamedocfile -->
### Step 5 — App: moveDoc + reference renameDocFile

Loose fiber = no parent and no children (graph position). moveDoc moves chats into the destination chats/ folder. Developed chains move by moving the thread, never piecemeal.
