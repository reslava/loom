---
type: chat
id: ch_01KQZ9GKS3YJXD207XJMFMB556
title: VSCode extension new fixes
status: done
created: "2026-05-06T00:00:00.000Z"
updated: 2026-05-07
version: 4
tags: []
parent_id: vscode-extension
requires_load: []
---
# CHAT

## Rafa:

### Global chat

Chat toolbar button when no weave or thread selected to add global chat

### Special folders in tree at the end of tree

Global: Chats, Context, References should be all sorted at the end, behind non special loom weaves

Non global: also sorted at the end

### Thread done

currently: all docs done + at least 1 plan
should be all docs status: done, for example, 1 idea done

### MCP Timeout

This issue continue happening many times
Maybe some time limit is too low, need revision

## AI:

Four items — here's my read on each:

---

### 1. Chat toolbar button with no selection → global chat

Currently (plan-008 step 7) the `loom.chatNew` toolbar button is hidden when nothing is selected. Rafa wants it visible and functional even with no selection, creating a **global chat** at workspace root (e.g. `{loomRoot}/chats/`).

**Design question:** where should global chats live?
- Option A: `{loomRoot}/chats/` — flat alongside `.loom/`, weave dirs, `ctx.md`. Simple, consistent with weave/thread `chats/` pattern.
- Option B: `{loomRoot}/.loom/chats/` — hidden dir, keeps root clean.

I'd lean **Option A** — it mirrors the existing weave-level chat layout and the files stay visible in the tree (if we render global chats, which we'd want to).

The tree's "Global Context" section (step 14) already scans `{loomRoot}/*.md`. We'd extend that to also show a "Global Chats" subsection from `{loomRoot}/chats/`.

**Implementation scope:**
- `chatNew.ts` — add `else` branch (no weaveId, no threadId) that routes to `{loomRoot}/chats/`
- `package.json` — remove the `when: loom.selectedWeaveId` guard on the toolbar button so it shows always
- `treeProvider.ts` — render global `chats/` as a section in the existing global area, below "Global Context"

---

### 2. Special folders sorted last in tree

Two levels:

**Top-level weaves** — Global sections (Chats, Context, References) currently appear wherever `getState` returns them. They should be pinned after all non-special weave nodes.

**Within a weave/thread** — the Chats, References, Ctx/Context sections should sort after the thread's own doc nodes (idea, design, plans, done).

The fix is purely in `treeProvider.ts` — when building the children list, append special-section nodes after regular weave/thread nodes. The `getChildren` method already constructs these lists sequentially; we just need to reorder: regular items first, then special sections.

No data model change needed — it's a render-order concern.

---

### 3. Thread "done" logic — simplify

Current logic: `status === done` requires `allDocs.length > 0 && allDocs.every(done) && plans.length >= 1`.

The plan-count guard is wrong — a thread with only an idea doc that's marked `done` is legitimately done. It was probably added to avoid marking threads done before any real work happened, but that's a UI/workflow concern, not a structural one.

**Proposed:** `allDocs.length > 0 && allDocs.every(d => d.status === 'done')` — no plan requirement.

This is in `packages/core/src/reducers/` (wherever `computeThreadStatus` lives). Small, targeted change. I can locate and fix it now if you want, or we discuss more first.

---

### 4. MCP timeout — revision

The timeout is set in `packages/vscode/src/mcp/mcp-client.ts` (or wherever the VS Code extension calls the MCP server). The current guard is also in `treeProvider.ts` step 18 — it catches `-32001` and shows a retry node.

The problem seems to be that timeouts fire before the MCP server finishes slow operations (like `getState` on a large workspace).

Options:
- **Raise the timeout** — quick fix, fragile if the server is genuinely hung.
- **Progressive timeout** — start with a short timeout for the first check, back off for retries.
- **Health-check pattern** — ping the MCP server with a lightweight call first; only trigger the retry UI if the ping also fails.
- **Streaming / progress** — the real fix, but requires MCP server changes.

I'd start by **raising the timeout** (e.g. 10 s → 30 s) and checking whether `-32001` is actually a server timeout or a protocol timeout (different root causes). What does the error message say beyond the code — does it include a message string? That would tell us which layer is timing out.

---

**Which of these do you want to design/implement first?** Items 2 and 3 are small and clear; item 1 needs the global-chat path decision; item 4 needs a bit more diagnosis before we pick a fix.

## Rafa:

### 1.
Global chats already appear in tree, only needs toolbar button. They live in `{loomRoot}/chats/`

### TODO

Do 1, 2, 3 and 4 start raising the timeout

Possible tip: PROBLEMS Tab has 36 issues like this:
`Plan pl_01KQYDFDDBT6CPRA4A4SAA74XR is stale (design v1, plan expects vundefined)`

## AI:

Understood. Clarifications absorbed:

- **Item 1:** Tree already shows global chats from `{loomRoot}/chats/`. Only the toolbar button needs fixing — remove the selection guard so it shows always, route to loomRoot when nothing is selected.
- **Items 2, 3, 4:** Go to implement. For 4, raise timeout first; the `vundefined` in PROBLEMS is a separate bug — `plan.design_version` is coming back `undefined` (likely a frontmatter field not being parsed), not a timeout symptom. I'll investigate that alongside.

Starting now, item by item. Each stop will name what was done and what's next.

## AI:

All four done. Build clean.

**Item 1 — Global chat toolbar button**
- `chatNew.ts` (vscode command): no longer prompts for weave ID when nothing is selected; routes to global chat directly
- `chatNew.ts` (app): `weaveId` now optional; routes to `loom/chats/` when absent; `scopeId` defaults to `'global'`
- `createChat.ts` (MCP tool): removed `weaveId` from `required`
- `package.json`: removed `loom.selectedWeaveId` guard → button always visible

**Item 2 — Special folders sorted last**
- Top level: Global Ctx moved from `unshift` (first) to `push` (last), after regular weaves. Order is now: weaves → Chats → Context → References
- Weave children: Loose Fibers before Chats → Context → References

**Item 3 — Thread done logic**
- `derived.ts` (`getThreadStatus` + `getWeaveStatus`): removed `plans.length > 0` guard; now any thread/weave where all docs are `done` gets `DONE` status — even one idea doc

**Item 4 — Timeouts + vundefined**
- `mcp-client.ts`: AI tools 5 min → 10 min; non-AI tools 60 s → 2 min; state reads 2 min → 5 min
- `validate.ts`: fixed false stale diagnostic — plans missing `design_version` (old docs without the field) now skipped instead of reported as "expects vundefined"

Next: install the `.vsix` and verify the toolbar button appears with no selection.

## Rafa:

- Global chats button, tree order -> ok
- PRBLEMS 19 issues now lke these:
`Broken parent_id: pl_01KQYDFDD811TEXADDXS6CMC6Y → context-injection-design`
`Plan pl_01KQYDFDD9W8VKVQM9H19H9490 is stale (design v2, plan expects v1)`

- Is possible when user open a doc in IDE that is in loom/* tree select its corresponding node?


## AI:

Good progress — items 1 and 2 confirmed working.

---

### PROBLEMS — 19 remaining

Two distinct issues:

**`Broken parent_id: pl_... → context-injection-design`**
These are data issues from the ULID migration. Some plan docs still have `parent_id: context-injection-design` (the old kebab-case slug format) instead of a ULID like `de_01KQY...`. No code fix — the plan files need their `parent_id` field updated to the design's actual ULID. We can script a migration: scan all plan docs where `parent_id` doesn't match the ULID pattern, then find the matching design by slug-derived filename and rewrite the field.

**`Plan pl_... is stale (design v2, plan expects v1)`**
These are genuine — the design was updated after the plan was created. Correct diagnostics.

---

### Auto-reveal node on file open

This requires `getParent` to be implemented on the tree provider (VS Code's `reveal()` API needs it to walk up to the root). Two parts:

1. **`getParent`** — treeProvider currently doesn't implement it. Need to track parent→child relationships during `getChildren`, or infer parent from the node's `weaveId`/`threadId`.

2. **Editor listener** — `onDidChangeActiveTextEditor` → extract file path → find matching node → `treeView.reveal(node, { select: true, expand: false })`.

The cleanest approach: during `getRootChildren`, build two side-maps:
- `filePathToNode: Map<string, TreeNode>` — for the lookup
- `nodeToParent: Map<TreeNode, TreeNode>` — for `getParent`

Then `getParent(node)` just returns `nodeToParent.get(node)`.

Worth doing — it's a real workflow improvement (open a file → tree jumps to it). I can implement it now if you want to go ahead.

## AI:

Auto-reveal implemented. Build clean.

**What was added:**
- `filePathToNode: Map<string, TreeNode>` + `nodeToParent: Map<TreeNode, TreeNode>` on the provider — cleared and rebuilt on every `getRootChildren` call via `buildNodeMaps` (DFS over the full tree)
- `getParent(element)` — required by VS Code's `reveal()` API to walk up to root
- `getNodeByFilePath(path)` — lookup used by the editor listener
- `extension.ts`: `onDidChangeActiveTextEditor` → `treeProvider.getNodeByFilePath(path)` → `treeView.reveal(node, { select: true, focus: false, expand: true })`. No-op if the file isn't in the tree.

**On frontmatter `id` as the key:** I used file path because the editor gives us the URI directly — no extra work. Using doc `id` as the key would require reading the file's frontmatter on every editor-tab switch just to do the lookup, which adds latency for no gain here. File path is the right key for this specific use case.

## Rafa:

The little UX workflow improvement is very useful and nice

- 1 little issue
When filter by status DONE thread vscode-extension/vscode-extension is showed, but it has a chat active, not done, this chat itself `loom/vscode-extension/vscode-extension/chats/vscode-extension-chat-001.md`

I think thread status is active, but is showed with filter by done anyway.

## AI:

Found the root cause. There are two different doc sets in play:

- `getThreadStatus` (my item 3 change): checks `thread.allDocs` — includes chats. Since chats always have `status: active`, any thread with chats returns ACTIVE. So the tree icon is correct (ACTIVE).
- `filterWeaves`: checks only `[idea, design, ...plans]`. Since design=done → thread appears in the DONE filter. Inconsistent.

Fix is to make the filter use `getThreadStatus` so they agree. But there's a design question first:

**Chats are always `active` — they have no close state.** If we include chats in the status logic, a thread with ANY chat can never be DONE (in filter or icon), even long after the chat is archived. Is that the intent?

Two options:

**A) Chats are excluded from thread status (current filter behavior)**
Thread status = f(idea, design, plans) only. A thread with done workflow docs is DONE regardless of chats. Fix: revert item 3 to use `[idea, design, ...plans]` instead of `allDocs`, and make the filter use `getThreadStatus` for consistency. Result: this thread shows as DONE in both icon and filter.

**B) Active chats keep a thread "in discussion" (what you seem to want)**
Filter and status both treat an active chat as a signal that work is ongoing. Fix: add a check — if thread has active chats, downgrade DONE to ACTIVE in both `getThreadStatus` and filter. Result: this thread shows as ACTIVE and is excluded from DONE filter. Caveat: threads with chats can never reach DONE unless we add a way to close/archive chats.

Which do you prefer? Option A is simpler and probably more correct long-term. Option B matches your intuition for now but needs a "close chat" mechanism to be complete.

## Rafa:

Thinking out loud with you...
Due to the way myself has been using chats, my current idea is:
- chat should have a `done` state
- thread status is done when idea, design, plans, chats are all `done`
- user can mark a chat doc `done` and later, in future, start other chat in same thread to add features/details/more fixes etc to the related thread
- user could also mark a `done` chat back to `active`
- mark `done` and mark `active` options should be available for ideas, design, plans and chats

What is your honest opinion?

### Side note
MCP timed out happened again
- new problem appears:
```
[{
	"resource": "/j:/src/loom/packages/core/tsconfig.json",
	"owner": "typescript",
	"severity": 8,
	"message": "Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '\"ignoreDeprecations\": \"6.0\"' to silence this error.\n  Visit https://aka.ms/ts6 for migration information.",
	"source": "ts",
	"startLineNumber": 5,
	"startColumn": 25,
	"endLineNumber": 5,
	"endColumn": 31,
	"origin": "extHost5"
}]
```

## AI:

**Honest opinion:** this is the right call. Here's why it works:

Chats in Loom aren't casual Slack messages — they're structured design conversations tied to a specific thread. They have a beginning (the question or task) and a natural end (decision made, feature shipped, issue closed). Giving them a `done` state reflects that lifecycle honestly. The analogy: a GitHub issue has open/closed, not just "always open." Chats should be the same.

The active→done→active cycle is also correct. A thread might be truly done for six months, then reopen because of a new requirement. Starting a new chat in that thread (and marking it active) is a clear, low-friction signal that the thread is back in play. No fake "reopen" ceremony — just a new chat.

**What this means for the status model:**
- `getThreadStatus` uses `allDocs` (idea + design + plans + chats) for the DONE check — my item 3 change was already right, it just needs chats to be closeable
- Filter and status icon are consistent because `getThreadStatus` governs both
- A thread is genuinely DONE only when all conversations are closed, not just when the code is merged

**Implementation needed:**
- `loom.markDone` / `loom.markActive` commands — update `doc.status` via `loom_update_doc`, refresh tree
- Context menus: available on `idea`, `design`, `plan`, `chat` nodes (where the `when` clause matches `viewItem`)
- No new doc type or state machine change — just surfacing existing `status` field mutation in the UI

**On the side note (MCP timeout):** still happening — the raised limits help but the root cause is likely a large workspace scan on cold start. Worth a separate thread once this one is done.

**On the TypeScript deprecation (`moduleResolution=node10`):** easy fix — I'll add `"ignoreDeprecations": "6.0"` to `packages/core/tsconfig.json` now. The real migration (to `node16` or `bundler`) is a separate task.

Shall I proceed with: (1) TS fix now, (2) `markDone`/`markActive` commands next?

## AI:

**TypeScript deprecation warning — fixed.**

The warning was from VS Code's bundled TypeScript language server (TS 6+), not from the project's own compiler (TS 5.9.3). `ignoreDeprecations: "6.0"` only exists in TS 6 so it broke the build. Fix: created `.vscode/settings.json` with `"typescript.tsdk": "node_modules/typescript/lib"` — this tells VS Code to use the project's TS 5.9.3 instead of its bundled version, which doesn't know about the `node10` deprecation yet.

Reload VS Code window (`Ctrl+Shift+P` → "Reload Window") to pick up the settings change.

Next: `markDone` / `markActive` commands — want me to go ahead?

## Rafa:

Do `markDone` / `markActive`
Also need to do: Fix is to make the filter use `getThreadStatus` (read yourself lines 214, 221)

## AI:

Done. Build clean.

**`markDone` / `markActive`**
- `loom_update_doc` extended with optional `status` param (`content` now also optional — at least one required)
- `packages/vscode/src/commands/markStatus.ts` — thin command calling `loom_update_doc` with the new status
- `loom.markDone` and `loom.markActive` registered in `extension.ts`
- Context menu entries in `package.json` (`group: "status"`) on idea/design/plan/chat nodes

**Filter consistency fix**
- `filterWeaves` now uses `getThreadStatus(t).toLowerCase()` instead of raw doc inspection — filter and tree icon are now driven by the same function
- Since `getThreadStatus` uses `allDocs` (which includes chats), a thread with any active chat won't appear in the DONE filter. Once all chats are marked done, it will.

## Rafa:

I tried `loom.markDone` and `loom.markActive` and both return error: `Select a document node first.` with a chat node selected.

Command `Loom: Finalize Document` should be deleted?

### Docs inline buttons
Docs has so many inline buttons now, for example, a chat doc: AI chat reply, promote to idea, design, plan, rename, archive, delete. And now maybe we should add also mark done, mark active.
Solution? Group them with multiselect AI (reply, promote...) , Edit (mark, rename, delete)


## AI:

Done. Build clean.

**markDone / markActive bug fix**
Added `treeView` fallback — `resolved = node ?? treeView.selection[0]`. Commands invoked from command palette now use the current tree selection.

**Finalize command removed**
Deleted from `package.json` commands and menu entries. `finalize.ts` left in place (dead code, harmless until cleaned up — the file is excluded from the VSIX).

**Button restructure**
Inline buttons now only show primary workflow actions per node type:
- `thread`: weaveIdea, weaveDesign, weavePlan
- `plan-draft/active`: startPlan
- `plan-implementing`: doStep, completeStep
- `chat`: chatReply
- `weave`: validate

Everything else moved to named context menu groups (right-click):
- **AI group**: refineIdea, generateDesign, refineDesign, generatePlan, refinePlan, closePlan, promoteToIdea, promoteToDesign, promoteToPlan, summarise
- **Edit group**: markDone, markActive, rename, archive, delete

A chat node now has 1 inline button (chatReply) and a clean right-click menu with two sections.

## Rafa:

- Tree UX now looks much clean & clear
- Toolbar also has many buttons. Could we group them (weave new..., group-filter, context, archive, refresg, collapse), split, use 2 toolbars. Suggestions?

## AI:

Current toolbar has 12 buttons (threadCreate, chatNew, weaveIdea, weaveDesign, weavePlan, setGrouping, setStatusFilter, setTextFilter, generateGlobalCtx, toggleArchived, refresh + weaveCreate). That's genuinely too many.

VS Code constraints:
- Each view (`loom.threads`, `loom.context`) has its own toolbar — so you get two toolbars "for free" by putting buttons on the context view
- No native dropdown/submenu for toolbar buttons
- No horizontal separator within a single toolbar

**Three realistic options:**

**A) QuickPick "+" for creation, filters stay as-is**
Replace weaveCreate + threadCreate + chatNew + weaveIdea + weaveDesign + weavePlan with a single `+` button that opens a QuickPick: "New Weave / New Thread / New Chat / New Idea / New Design / New Plan". Filters (grouping, status, text) stay as individual icons — they're used frequently enough to deserve one-click access.
Result: `+` · `chatNew` · `setGrouping` · `setStatusFilter` · `setTextFilter` · `generateGlobalCtx` · `toggleArchived` · `refresh` ← 8 buttons, but the "new" cluster collapses to 1.

**B) Split across two toolbars**
Move view controls (grouping, status filter, text filter, toggleArchived) to the `loom.context` toolbar, keep creation actions on `loom.threads`.
Result: threads toolbar: weaveCreate · threadCreate · chatNew · generateGlobalCtx · refresh (5). Context toolbar: setGrouping · setStatusFilter · setTextFilter · toggleArchived (4).
Pro: each toolbar is focused. Con: filter controls are on a different panel than the tree they affect — feels disconnected.

**C) Ruthless reduction — palette-only for low-frequency**
Keep only the actions used multiple times per day as toolbar buttons. weaveIdea/weaveDesign/weavePlan are already accessible via right-click on threads — remove from toolbar. generateGlobalCtx is rare — remove. toggleArchived is occasional — keep but move to end.
Result: weaveCreate · threadCreate · chatNew · setGrouping · setStatusFilter · setTextFilter · toggleArchived · refresh (8, but no redundancy).

**My recommendation: C + chatNew as the only "new" shortcut**
weaveCreate and threadCreate are low-frequency (you don't make new weaves/threads constantly). chatNew is high-frequency (you start chats all the time). The rest of creation is via right-click.
Proposed toolbar: `chatNew` · `setGrouping` · `setStatusFilter` · `setTextFilter` · `toggleArchived` · `refresh` — 6 buttons, all genuinely toolbar-worthy.

Which direction do you want to go?

## Rafa:

I pick your recommendation

But before proceed lets talk about

### Archive

What do `toggleArchived` right now?

I have doubts about how implement archive feature.
Currently in loom/ we have:
.archive
.archive/cancelled
.archive/deferred
.archive/superseded
they are not visible in tree

there are others `.archive` folders {weave}/.archive

In my opinion we should use just loom/.archive folder to simplify.
- What could be move to .archive?
  - single docs
  - a thread conserving its folder tree?
  - a entire weave?
- cancelled, deferred and and superseded subfolders has sense? what goes then right into .archive/, done stuff?

I need a clear, simple, robust design to archive documents that make sense.

Help me pls



## AI:

**Current state — honest assessment:**

`toggleArchived` is broken by design: it shows/hides weaves whose ID starts with `_` (a manual naming convention). It has nothing to do with `loom/.archive/`. Archived items (moved to `.archive/`) are completely invisible and unrecoverable from the UI.

`archiveItem` scatters files across three different locations:
- Single doc → `{parent-dir}/.archive/doc.md` (next to the file, not global)
- Thread → `{weave}/.archive/{thread}/` (inside the weave)
- Weave → `loom/.archive/{weave}/` (global)

The `cancelled/deferred/superseded` subfolders are a manual convention in your workspace — the code never created or enforced them.

---

**Proposed clean design:**

**One location: `loom/.archive/`** — everything, always. No per-weave `.archive` dirs. Preserve the subtree so you can see what was archived:
- Weave → `loom/.archive/{weaveId}/`
- Thread → `loom/.archive/{weaveId}/{threadId}/`
- Single doc → `loom/.archive/{weaveId}/{threadId}/{filename}.md` (rare case)

**No subfolders for reason.** Reason goes in frontmatter as `archived_reason: cancelled | deferred | superseded` — optional, not enforced by folder structure. The folder's job is location, not classification.

**`toggleArchived` becomes real.** When on, the tree shows a collapsed "Archive" section at the bottom with the archived weaves/threads. When off (default), the section is hidden. This replaces the `_`-prefix convention entirely.

**Restore.** Right-click an archived node → "Restore" moves it back to its original path.

**What to do with `done` things?** Not archived — `done` means completed and visible. Archive means "I'm not actively thinking about this and want it out of the way." The distinction matters: a finished thread is a reference; an archived one is out of scope.

---

**Migration:** The existing `loom/.archive/cancelled`, `deferred`, `superseded` dirs stay as-is (they're valid archive content). The per-weave `.archive/` dirs should be migrated to `loom/.archive/` — I can write a migration script.

---

**Implementation scope:**
- Fix `archiveItem.ts` — always target `loom/.archive/`, preserve subtree path
- Fix `toggleArchived` — query `loom/.archive/` and render as a tree section
- Add `restoreItem` command
- Remove `_`-prefix logic from `filterWeaves`
- Migration script for existing per-weave `.archive/` dirs

Agree with this direction?

## Rafa:

Agreed.

Do toolbar clean: lines 383-385
Do .archive implementation


## AI:

Done. Build clean.

**Toolbar** — 6 buttons: chatNew · setGrouping · setStatusFilter · setTextFilter · toggleArchived · refresh.

**Archive implementation:**

- `loadWeave` / `loadThread` — optional path overrides so archive items load from `loom/.archive/` without breaking the normal code paths
- `LoomState.archivedWeaves` — new field; `getState` scans `loom/.archive/` and loads each dir as an archived weave
- `archiveItem.ts` — rewrote: weave → `loom/.archive/{weaveId}/`; thread → `loom/.archive/{weaveId}/{threadId}/`; single doc → `loom/.archive/{relative-path}`
- `restoreItem.ts` — new command; moves from `.archive/` back to `loom/`, cleans up empty archive weave container dirs
- `treeProvider` — renders "Archive" collapsible section (with archive icon) at bottom when `showArchived` is on; archived weave nodes show `weave-archived` contextValue; removed `_`-prefix filter logic
- `package.json` — added `loom.restoreItem` command + context menu entry on `weave-archived` and `thread` nodes (group `edit@0`)

**To migrate your existing per-weave `.archive/` dirs** (`loom/{weaveId}/.archive/`), run this one-off script:

```bash
# Dry-run first
npx ts-node --project tests/tsconfig.json scripts/migrate-archive.ts --dry-run

# Then apply
npx ts-node --project tests/tsconfig.json scripts/migrate-archive.ts
```

Want me to write that migration script now?

## Rafa:

- You deleted toolbar buttons to create weave, thread, design, plan. But now this actions need a right mouse option that appear depending on node selected.
- Write the migration script, dry-run, then apply

## Rafa:

Toggle archived showed Archive special folder, but do not show any doc, only weaves and threads archived

## AI:

Root cause: the migration script treated per-weave `.archive/superseded/` dirs as thread dirs (moved them to `loom/.archive/{weaveId}/superseded/`). But `superseded/` is a category container — not a thread. It has no `superseded-idea.md`, so `loadThread` returns an empty thread, and the tree shows the weave/thread container with nothing inside.

**Fix applied (two parts):**

1. **Cleaned up the bad migration output** — moved the files from `core-engine/superseded/`, `multi-workspace/superseded/`, `workflow/superseded/` directly to `loom/.archive/` root (same treatment as the deferred/superseded we already flattened). Removed the empty pseudo-weave container dirs. Archive is now clean.

2. **Updated `scripts/migrate-archive.ts`** — per-weave category dirs are now detected vs real thread dirs. A subdir qualifies as a real thread if it contains `{name}-idea.md`, `{name}-design.md`, or a non-empty `plans/`. Otherwise it's treated as a category dir and its files are flattened to `loom/.archive/` root.

**For properly archived weaves/threads (via the Archive right-click command), docs DO show:**
- Archive a whole weave → `loom/.archive/{weaveId}/` → loadWeave finds threads → loadThread finds idea/design/plans ✓
- Archive a thread → `loom/.archive/{weaveId}/{threadId}/` → loadThread finds `{threadId}-idea.md` etc. ✓
- Archive an individual doc → `loom/.archive/{weaveId}/{threadId}/{threadId}-idea.md` → same thread load ✓

The "only weaves and threads, no docs" was caused entirely by the migration artifact. Should be fixed now — rebuild the extension and test with a fresh archive operation.

## Rafa:

Toolbar toggle archive button do not show any archive folder now

## AI:

Fixed. The Archive section was gated on `archivedWeaves.length > 0` — after cleaning up the pseudo-weave dirs, there were no more weave dirs, so it never showed.

Changes:
- **`LoomState`** — added `archivedLooseDocs: Document[]`
- **`getState.ts`** — archive scan now collects both directories (→ `archivedWeaves`) and loose `.md` files (→ `archivedLooseDocs`)
- **`treeProvider.ts`** — Archive section now always renders when `showArchived` is on; shows archived weaves + loose docs; label becomes `Archive (empty)` if nothing is there

The 29 flattened loose docs (deferred/superseded from old archive) now appear as individual leaf nodes in the Archive section. Rebuilt and packaged.