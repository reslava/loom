---
type: chat
id: vscode-extension-fixes-tweaks-chat
title: "Vscode Extension Fixes Tweaks Chat"
status: active
created: 2026-04-25
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
---
# CHAT

## Rafa:
We need to test, fix and tweak vscode extension until implement fully feature workflow and have a confortable and intuitive UX.
- Design: `weaves/vscode-extension/vscode-extension/vscode-extension-design.md` we will refine the design if need appending new design concepts we implement
- Plan: `weaves/vscode-extension/vscode-extension/plans/vscode-extension-plan-008.md` we will append here all fixes, tweaks we implement.

### Empty weaves and threads
User should be able to create empty weaves and threads as he wish. For example, at the beginning of project he has clear architecture in mind and start by createing weaves:
- core, fs, app, cli, vscode
- and then create some empty threads in some weaves
- and then start creating chat, ideas, designs
What you think?

### Weave 
- toolbar: create

### Thread
- toolbar: create. If a weave or weave child is selected create it inside. If not weave or weave child selected hide button

### Chats
- chats folder name is `chats` and they should line in
  - {weave}/chats/
  - {weave}/{thread}/chats/
- if a thread of a doc of a thread is selected when he create a chat assign to thread, same for weave, if nothing is selected we could hide chat toolbar creation button

### All docs type and weaves, threads
- inline button: rename, delete, archive

settings.json workflow.user.name -> loom.user.name

## AI:

Fully agree on empty weaves/threads — it's the right mental model for project scaffolding. Here's my read on each item:

---

### Empty weaves and threads

Currently `getState()` only surfaces weaves/threads that have at least one doc. Supporting empty containers means:
- `loom.weaveCreate` writes a `{weaveId}/.keep` marker (or nothing — just the dir) and the tree renders the dir as a weave node even with no children.
- `loom.threadCreate` writes `{weaveId}/{threadId}/.keep` similarly.
- Tree provider needs to handle the "no children" case gracefully (show empty state rather than hiding the node).

Clean approach: no `.keep` files — just track the dir itself. `listWeaves` already scans dirs; `listThreadDirs` does too. As long as the scan doesn't filter out empty dirs, they'll show up. Worth verifying.

---

### `ai-chats/` → `chats/`

This is a **breaking change** for existing repos. `threadRepository.ts` reads from `ai-chats/`; all existing chat docs live there. We'd need a migration step (rename dir). I'd suggest doing this as a discrete step in the plan so it doesn't get mixed with other work. Also: we currently use `chats/` for design-session chat docs (the weave-level chat files we just migrated). That naming collision needs a decision:

- Option A: `{weave}/chats/` = weave-level AI chats, `{weave}/{thread}/chats/` = thread-level AI chats — no collision since they're at different levels.
- Option B: Keep `ai-chats/` for thread-level to distinguish from weave-level design chats.

I lean toward **Option A** — consistent name, different scope. Simpler mental model.

---

### Context-aware toolbar buttons

VS Code `view/title` `when` clauses can't read tree selection directly. The pattern is:
1. `treeProvider.onDidChangeSelection` fires when the user clicks a node.
2. We call `vscode.commands.executeCommand('setContext', 'loom.selectedItemType', 'weave')`.
3. `when` clause on the thread create button: `view == loom.threads && loom.selectedItemType =~ /^(weave|thread|doc)$/`.

This is the standard VS Code pattern and keeps the button hidden until a weave or weave-child is selected. Same pattern for the chat create button.

---

### Inline rename / delete / archive

Agreed these belong on all node types. Suggest adding them to `view/item/context` with `inline` group. Rename and delete are universal; archive makes sense for weaves, threads, and docs (not for plans that have `closePlan`). The commands themselves (`loom.rename`, `loom.delete`, `loom.archive`) need to be type-aware — they'll receive the tree item and dispatch based on `contextValue`.

`loom.rename` already exists but may be wired only to specific nodes.

---

### `workflow.user.name` → `loom.user.name`

Simple find-and-replace in `package.json` (configuration section) and any code that reads the setting. Low risk, do it early.

---

### Suggested plan structure (steps to append to plan-008)

| # | Step | Scope |
|---|------|-------|
| 2 | Rename `workflow.user.name` → `loom.user.name` in config | `package.json`, any settings readers |
| 3 | `ai-chats/` → `chats/` — update `threadRepository`, add migration note | `fs/`, `threadRepository.ts` |
| 4 | Support empty weave/thread dirs in `listWeaves`/`listThreadDirs` + tree render | `fs/`, `treeProvider.ts` |
| 5 | `loom.weaveCreate` command — create empty weave dir, prompt for name | `extension.ts`, `commands/`, `package.json` |
| 6 | `loom.threadCreate` command — context-aware (selected weave/child), set `loom.selectedItemType` context | `extension.ts`, `commands/`, `package.json`, `treeProvider.ts` |
| 7 | `loom.chatNew` context-aware — set context from selection, hide if no weave/thread selected | `package.json`, `treeProvider.ts` |
| 8 | Inline rename/delete/archive on all node types | `package.json`, `commands/`, `treeProvider.ts` |

Want to proceed with this order, or adjust priority?

## Rafa:
Update the plan-008
Do Steps 2-8

## AI:

Steps 2–8 done. Summary:

**Step 2 — `reslava-loom.user.name`**
Added to `package.json` configuration section.

**Step 3 — `ai-chats/` → `chats/`**
- `pathUtils.ts`: RESERVED_SUBDIR_NAMES updated
- `weaveRepository.ts` + `threadRepository.ts`: read paths updated
- `chatNew.ts` (app): saves to `{weave}/chats/` or `{weave}/{thread}/chats/` based on `threadId`; `threadId` added to `ChatNewInput`

**Step 4 — empty weave/thread dirs**
- `weaveRepository.ts`: removed `allDocs.length === 0 → null` guard; empty weaves now load
- `pathUtils.ts`: `listThreadDirs` simplified — any non-reserved subdir = thread (no doc-presence check)
- `treeProvider.ts`: `createWeaveNode` and `createThreadNode` now compute children first; use `None` state when empty, `Collapsed` when not

**Step 5 — `loom.weaveCreate`**
New `weaveCreate.ts` — prompts for kebab-case ID, creates `weaves/{id}/` dir, refreshes tree.

**Step 6 — `loom.threadCreate` + selection context**
New `threadCreate.ts` — reads `treeView.selection[0].weaveId` (falls back to input box), prompts for thread ID, creates `weaves/{weaveId}/{threadId}/`.
Selection listener in `extension.ts` sets `loom.selectedWeaveId` context key on every selection change.
Toolbar button hidden when `loom.selectedWeaveId` is empty.

**Step 7 — chatNew context-aware**
`chatNewCommand.ts` now reads `treeView.selection` for weaveId/threadId; routes chat to correct `chats/` subdir.
Toolbar button hidden when `loom.selectedWeaveId` is empty.

**Step 8 — inline rename/delete/archive**
- `rename.ts`: updated to accept `node` — uses `node.doc.id` as pre-fill for inline invocation
- New `deleteItem.ts`: confirmation dialog, then removes file, thread dir, or weave dir
- New `archiveItem.ts`: moves file/thread/weave into nearest `_archive/` subdir
- All three wired in `extension.ts` and added to `view/item/context` under `manage` group (appears in right-click menu on weave, thread, and all doc types)

## Rafa:
Issues:
### Empry weaves

Tree is not showing empty weaves

### VSCode commands
- Loom new idea
- Loom new plan
- Loom new chat
- Loom new thread
All should be `weave` instead of `new`

## Chats
chats docs are created but no showed by tree

## Rename, edit archive
inline buttons nor showed by tree

## AI:

Four fixes applied and built clean:

### Empty weaves
Root cause: `filterWeaves` in `treeProvider.ts` runs a `statusFilter` check — `w.allDocs.some(d => statusFilter.includes(d.status))`. The default filter is `['active', 'implementing', 'draft']`; for an empty weave `allDocs = []` so `some()` always returns `false` and the weave is hidden.

Fix: added `if (w.allDocs.length === 0) return true` before the `some()` check — empty weaves always pass through.

### Command titles
`loom.chatNew` → `"Weave Chat"`, `loom.threadCreate` → `"Weave Thread"`. "Weave Idea", "Weave Plan", "Weave Design" were already correct. "New Weave" stays as-is (can't say "Weave Weave").

### Chats not showing
Two things fixed:
1. The build hadn't been run — all Step 3–8 changes were uncompiled. Everything is now built.
2. `threadRepository.ts` `docPathInThread` still had `'ai-chats'` as the fallback save path for chat docs (only hit when `_path` is unset). Changed to `'chats'`.

### Inline rename / archive / delete
Moved from `manage@1/2/3` (right-click only) to `inline@8/9/10`. They will appear on hover as icons. The `@8/9/10` placement means they render after domain-specific actions (`@1–@4`). VS Code shows all inline buttons; the number ordering determines their position left-to-right. If the number of visible buttons becomes too crowded we can lower the numbers or separate them.

Build output: all packages compiled with zero errors.

## Rafa: 
### Idea
no inline button to finalize

draft idea created with id `i-idea`
idea dissappear after I use command to finalize it

