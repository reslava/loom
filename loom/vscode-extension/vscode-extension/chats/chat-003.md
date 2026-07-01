---
type: chat
id: ch_01KS7NZ463WFBEECKK43X15432
title: VSCode features
status: done
created: 2026-05-22
version: 1
tags: []
parent_id: null
requires_load: []
---
# VSCode features

## Rafa:

After user create any kind of doc, select it in tree

## AI:

**Vision check:** Removes the manual step of hunting for a newly created doc in the tree — serves the create → inspect → act loop directly.

**The mechanism:** VS Code's `TreeView.reveal(element, { select: true, focus: false })`. This requires using `vscode.window.createTreeView()` instead of `registerTreeDataProvider()` so we hold a `TreeView` reference with the `reveal` method.

**What needs to happen after any create command succeeds:**

1. Call `treeProvider.refresh()` as usual.
2. Wait for refresh to complete (the `_onDidChangeTreeData` event fires; `refresh()` should return a promise or we resolve after one tick).
3. Call `treeView.reveal(provider.findNodeById(newDocId), { select: true, focus: false })`.

**Required changes:**

- `extension.ts`: replace `registerTreeDataProvider` with `createTreeView` and pass the `TreeView` reference into the command layer.
- `LoomTreeProvider`: add `findNodeById(id: string): TreeNode | undefined` — walk the internal node list (already built during `getChildren`) and return the matching node.
- Each create command (`weaveIdea`, `weaveDesign`, `weavePlan`, `newChat`): after refresh, call `treeView.reveal(...)` with the returned doc id.

**One subtlety:** `reveal()` only works if the node is visible (its parent is expanded). We should pass `{ expand: true }` alongside `select: true` to ensure the thread node opens before revealing the child doc.

```typescript
// after create + refresh
const node = treeProvider.findNodeById(newDoc.id);
if (node) {
  await treeView.reveal(node, { select: true, focus: false, expand: true });
}
```

Want me to sketch out the full diff across the three files, or is the shape clear enough to implement?

## Rafa:

Implement it

## AI:

On it. Reading the current extension code now.

## AI:

Done. Here's what was changed:

**`treeProvider.ts`**
- Added `_afterRefreshCallbacks` array and `waitForRefresh()` method.
- `waitForRefresh()` pushes a resolver and fires `_onDidChangeTreeData`; the resolver is called inside `getRootChildren()` after `buildNodeMaps()` runs (so `filePathToNode` is fresh). Also drained in error/empty paths so promises never hang.

**`commands/revealDoc.ts`** (new)
- `revealDocAfterCreate(treeProvider, treeView, filePath)` — awaits `waitForRefresh()`, then calls `treeView.reveal(node, { select: true, focus: false, expand: true })`.

**Updated create commands** — all now call `revealDocAfterCreate` instead of `treeProvider.refresh()`:
- `weaveIdea.ts` — added `treeView` param
- `weaveDesign.ts` — added `treeView` param
- `weavePlan.ts` — added `treeView` param
- `chatNew.ts` — already had `treeView`; replaced `refresh()` with reveal
- `createReference.ts` — added `treeView` param

**`extension.ts`** — passes `treeView` to the three commands that newly needed it.

TypeScript type-check passes clean. Build with `cd packages/vscode && npm run package` when ready to test.

## Rafa:

Also select tree node when create a Weave or Thread

## AI:

On it. Weave/thread nodes have no file path so `getNodeByFilePath` doesn't cover them — adding `getNodeByWeaveId` / `getNodeByThreadId` lookups to the tree provider, then wiring up `weaveCreate` and `threadCreate`.

## AI:

Done.

**`treeProvider.ts`**
- Added `weaveIdToNode` and `threadKeyToNode` maps, cleared on each refresh alongside `filePathToNode`.
- `buildNodeMaps` now populates them: weave nodes (have `weaveId`, no `threadId`, no `doc`) go into `weaveIdToNode`; thread nodes (have both, no `doc`) go into `threadKeyToNode` keyed by `weaveId/threadId`.
- Added `getNodeByWeaveId(weaveId)` and `getNodeByThreadId(weaveId, threadId)` public methods.

**`weaveCreate.ts`** — added `treeView` param; replaced `treeProvider.refresh()` with `waitForRefresh()` + `treeView.reveal(getNodeByWeaveId(weaveId))`.

**`threadCreate.ts`** — same pattern; `waitForRefresh()` + `treeView.reveal(getNodeByThreadId(weaveId, threadId))`.

**`extension.ts`** — passes `treeView` to `weaveCreateCommand`.

TypeScript clean. Build to test: `cd packages/vscode && npm run package`.

## Rafa:

Weave creation is worlking, but when I create a thread, looks like 2 things come selected: the weave (active, sourrounded by a rectangle) and the Chats directory. The thread created is unselected.

## AI:

**Root cause:** The Chats section node (and any other section inside a thread) also has `weaveId` + `threadId` set and no `doc` — so it was overwriting the actual thread node in `threadKeyToNode` as `buildNodeMaps` walked the children.

**Fix:** tightened the conditions in `buildNodeMaps` to match on `contextValue`:
- Weave nodes: `contextValue === 'weave'`
- Thread nodes: `contextValue?.startsWith('thread')` (covers `'thread'`, `'thread-has-idea'`, `'thread-has-idea-has-design'`, etc.)

Section nodes (`'chats-section'`, `'ctx-section'`, `'refs-section'`, `'plans-section'`) no longer match either condition. TypeScript clean.

## Rafa:

After many tries fixing a simple stuff, selected the right tree node after creating anything, the behaviour is still rare:
When select a weave, right mouse, create a thread...
- Weave has background highlighted and rectangle sourounding
- Thread als have background highlighted but no rectangle

## AI:

**Root cause:** it's the `focus: false` flag in `reveal()`, not a node-mapping bug.

In VS Code's TreeView:
- **Selection background** (the filled highlight) is the *selection* state.
- **Outlined rectangle** is the *focus* state — the keyboard-focused item.
- The focused item always *also* renders with the selection background. So "focus" visually implies "selection", but the inverse isn't true.

What's happening with thread create:
1. You right-click the weave → weave becomes selected + focused (rectangle).
2. Context menu runs `threadCreate` → creates folder, calls `reveal(threadNode, { select: true, focus: false })`.
3. `select: true` moves the *selection* to the thread → thread gets background highlight.
4. `focus: false` leaves *focus* on the weave → weave keeps its rectangle, and because focus implies selection-background, the weave still looks "selected" too.

That's why both rows look highlighted but only the weave has the rectangle.

**Fix:** use `focus: true` on thread create (and weave create, for the same reason — the previously-selected node retains focus). In `threadCreate.ts:41`:

```ts
if (threadNode) treeView.reveal(threadNode, { select: true, focus: true, expand: false });
```

Same change in `weaveCreate.ts`. For **doc** creation (`revealDocAfterCreate`), `focus: false` is arguably fine because the user often wants to keep typing in the editor — but it has the same visual quirk if the tree was the last-focused control. I'd flip it to `focus: true` everywhere for consistency: after a create, the new thing should be the one selected *and* focused. The editor focus is unaffected (the tree's `focus` only moves focus *within* the tree view).

**Why I'm sure this isn't a buildNodeMaps regression:** the rectangle showing on the weave is the smoking gun — that's the focus indicator, which `reveal` with `focus: false` is documented to leave alone. Mapping bugs would produce a missing or wrong selection, not a stuck focus rectangle.

**Files to touch:**
- `packages/vscode/src/commands/threadCreate.ts:41` — `focus: true`
- `packages/vscode/src/commands/weaveCreate.ts` — same line, `focus: true`
- `packages/vscode/src/commands/revealDoc.ts:13` — `focus: true` (recommended for consistency; tell me if you'd rather leave it `false` for doc creates).

Want me to apply this?

## Rafa:

I do not understand why many tries for this simple stuff.
Do the fix, and be sure after creating any type of loom doc and weave, thread the new node is selected and focused.


## AI:

Done. Changed `focus: false` → `focus: true` in all three create-reveal sites:

- `packages/vscode/src/commands/revealDoc.ts:13` — applies to idea/design/plan/chat/reference creates
- `packages/vscode/src/commands/threadCreate.ts:41`
- `packages/vscode/src/commands/weaveCreate.ts:30`

Left `extension.ts:106` alone — that's the `onDidChangeActiveTextEditor` sync (editor → tree). Stealing focus from the editor every time you switch tabs would be wrong; that path correctly stays `focus: false`.

**Why it took so many tries (honest answer):** the earlier fixes were chasing the wrong symptom. The first round wired up `reveal()` at all (it wasn't being called). The second round handled weave/thread nodes (no file path). The third tightened `buildNodeMaps` so section nodes didn't clobber thread nodes in the map. All three were real bugs — but each time the new symptom looked similar ("tree node doesn't end up selected the way I expect"), so it read like a regression of the same problem when it was actually a different layer. The focus-vs-selection distinction is the last layer: VS Code's TreeView treats them as orthogonal, and we'd been passing `focus: false` from the start without anyone questioning it. A single line, but invisible until the upstream bugs were out of the way.

Build: `cd packages/vscode && npm run package` — clean, packaged `loom-vscode-0.6.1.vsix`. Reload the extension host and try create weave/thread/idea/design/plan/chat — the new node should be the only one with both highlight and rectangle.

## Rafa:

Now I see the difference between select & focus with extension.
Now the behaviour is correct after creating weaves and threads.
But for docs, should select corresponding tree node and focus the doc in the IDE just created, agree? possible?

## AI:

Agree, and it's already mostly wired — just needed to walk back one of the changes I just made.

Each doc-create command (`chatNew`, `weaveIdea`, `weaveDesign`, `weavePlan`, `createReference`, `promoteTo*`, `refine*`) already calls `vscode.workspace.openTextDocument(...)` + `vscode.window.showTextDocument(...)` before `revealDocAfterCreate`. So editor focus is already moving to the new doc. The right behaviour is:

- **`showTextDocument`** → moves editor focus to the new doc ✓ (already there)
- **`reveal(node, { select: true, focus: false })`** → selects the tree node without stealing focus back from the editor

So `focus: true` in `revealDoc.ts` was wrong for docs — it was stealing focus *back* to the tree after the editor had it. Reverted that one line to `focus: false`.

For weave/thread (no doc to open), `focus: true` stays correct — those don't call `showTextDocument`, so the tree is the right place for focus to land.

Final state:
- `revealDoc.ts` (docs) → `select: true, focus: false` — editor keeps focus, tree node selected
- `threadCreate.ts` → `select: true, focus: true` — tree node selected + focused
- `weaveCreate.ts` → `select: true, focus: true` — tree node selected + focused
- `extension.ts:106` (editor → tree sync) → `focus: false` — unchanged

Rebuilt: `loom-vscode-0.6.1.vsix`. Reload and try create idea/design/plan/chat — new doc opens and is focused in the editor, new tree node is selected (highlighted) but the focus rectangle stays out of the tree.

## Rafa:

All loom kind of docs should use frontmatter Title field as only source of truth and do not contain any `# Title` section.

Fix this for all. packages/core/src/bodyGenerators should be updated, also chat and reference docs.
some actual `# {section}` sections should be converted to `## {section}` cuase loom docs should not have `#` section.

In a new Loom project `refs` directory is createdm bu does not appear in tree so there is no way to create a reference doc.


## AI:

Three separate sub-tasks here. Let me lay out the plan and stop before touching anything — this change touches generated content across the system, so I want to confirm scope.

---

### 1. Remove `# Title` from all doc bodies; convert `#` sections to `##`

**Sites I found that emit H1 (`#`) in generated content:**

*Title H1 (whole-doc):*
- `packages/app/src/promoteToIdea.ts:92`, `promoteToDesign.ts:92`, `promoteToPlan.ts:94`
- `packages/app/src/refineIdea.ts:56`, `refineDesign.ts:59`, `refinePlan.ts:59`
- `packages/mcp/src/tools/createReference.ts:48`

All of these wrap the generated body with `` `# ${title}\n\n${body}` `` — drop the `# ${title}\n\n` prefix and store just `body`.

*Section H1 (inside body templates):*
- `packages/core/src/bodyGenerators/planBody.ts:20` (`# Goal`), `:23` (`# Steps`) → `## Goal`, `## Steps`
- `packages/core/src/bodyGenerators/designBody.ts:15` (`# CHAT`) → `## CHAT` (or drop entirely — see chat question below)
- `packages/app/src/refineDesign.ts:44`, `refinePlan.ts:41` (`# Additional Context`) → `## Additional Context`
- `packages/core/src/planTableUtils.ts:75` — the `# Steps` regex replacement (must also match `## Steps` after migration; safest: replace both)
- `packages/app/src/installWorkspace.ts:210` — `# Global Context` in the template ctx doc → `## Global Context` (or drop)

*Chat-specific:*
- `packages/app/src/chatNew.ts:46` writes `# CHAT\n\n## ${name}\n`
- `packages/app/src/doStep.ts:87` writes `# CHAT\n\n## ${name}\n${content}...`
- The `## ${name}` block headers stay as-is (already `##`).
- **Question:** drop the leading `# CHAT` entirely (title is in frontmatter), or keep it as `## CHAT`? I lean **drop** — the `## ${name}` blocks are self-evidently chat content, and "CHAT" duplicates `type: chat` in frontmatter. Confirm.

**Risk to check first:** anything that *parses* the H1 to derive title or section identity. Quick grep before editing — if `loadDocument` or similar reads the first `# ...` line, we'd break it. From what I've seen so far, frontmatter is canonical for `title` already, but I want to verify before deleting.

**Migration of existing docs:** "Fix this for all" — I read that as "fix the generators AND migrate existing docs." Two ways:
- **(a)** Write a one-shot migration script (like `migrate-to-threads.ts`) that walks `loom/**/*.md`, strips the H1 if it matches frontmatter title, demotes other `#` sections to `##`. Idempotent. Recommended.
- **(b)** Just fix generators going forward; existing docs are left as-is until manually refined.

Which do you want?

---

### 2. `refs/` directory exists but doesn't appear in tree

Found it: `treeProvider.ts:192` — the refs section is only rendered when:
```ts
if (refsChats.length > 0 || allGlobalRefs.length > 0) {
```

Empty `refs/` folder → no node rendered → no way to right-click "Create Reference."

**Fix:** render the Refs section whenever the `refs` weave folder *exists on disk*, even if empty. Simplest change is to drop the `length > 0` guard and let the section render with no children, so the context menu attaches.

Alternatively, always render a global "References" root section (no `refs/` weave needed) — but that's a bigger architectural shift. I'd go with the minimal fix: render-if-folder-exists.

---

### Proposed order

1. **First**, grep for any code that reads `# ...` from doc bodies (to confirm no parse dependency).
2. Update all generators to stop emitting H1 (title and section).
3. Update `planTableUtils.ts` regex to match both `# Steps` and `## Steps` (for backward compat during migration).
4. Fix `treeProvider.ts:192` Refs section render condition.
5. (If you approve migration) write `scripts/migrate-remove-h1.ts` — dry-run first, then apply.
6. Build, manually verify in the extension.

**STOP — waiting for `go` on:**
- Drop `# CHAT` from chat docs entirely, or convert to `## CHAT`?
- Migrate existing docs (script), or only fix generators forward?
- Any other doc surface I missed?

## AI:

Good context — that simplifies things.

So `designBody.ts:15` emitting `# CHAT` (followed by `## ${userName}:`) is **dead code** — a leftover from when design docs hosted the conversation inline. Now that chats are separate docs in `chats/` folders, design docs don't need a `# CHAT` block at all.

**Updated plan for `designBody.ts`:**
- Drop the `# CHAT\n\n## ${userName}:\n` entirely.
- The generated design body should just be the body content (architecture, decisions, etc.) — no chat scaffolding.

I'll also check `promoteToDesign` / `refineDesign` for any related leftovers that assume an inline CHAT section, and the existing-doc migration (if you greenlight it) should optionally strip `# CHAT` + the trailing `## Name:` blocks from old design docs — or leave them as historical record. Safer default: **leave old design docs alone**, only fix the generator going forward. The historical CHAT content in old designs is real conversation, not boilerplate.

So the migration script (if approved) would:
- Strip leading `# ${title}` from all docs (where it matches frontmatter title).
- Demote `# Goal`, `# Steps`, `# Additional Context`, `# Global Context` → `##`.
- **Skip** the `# CHAT` section in old design docs entirely (preserve as-is).
- Skip chat docs (`type: chat`) — their format is already separate.

Still waiting on `go` for:
1. Migrate existing docs vs. generators-only?
2. Drop `# CHAT` from newly-created **chat** docs (`chatNew.ts`, `doStep.ts`)? My read: yes, drop it — frontmatter says `type: chat`, the `## Name:` blocks are self-explanatory.
3. Anything else missed?

## Rafa:

I realize one problem and changed my mind:

### Downside 

Having only frontmatter title has a big problem: VSCode markdown preview will not show any title for the loom doc. So better we will:

- Keep frontmatter title as unique source of truth
- Keep one `# {Title}` section in document as UX to be showed, not edited.
- Loom ensure:
  - frontmatter Title and `# {Title}` are identical
  - if they are different, Loom update `# {Title}` to be equal to frontmatter title
  - when a doc is renamed both are renamed at same time

### Migration

- Ensure both titles identical
- Ensure just one title, other H1 markdown sections -> H2
- Have in account after migration, showing plans and steps in tree now from `## Steps` instead of `# Steps`, update DoSteps, etc

- leave old design docs alone

`refs/` render if folder exists

What you think? Maybe good to do a commit push before migration?


## AI:

Good catch — the markdown preview reason is decisive. Updated plan below.

---

### New rule

- Frontmatter `title` is source of truth.
- Every doc body starts with exactly one `# {Title}` line, derived from frontmatter.
- All other H1s in bodies → H2.
- Loom enforces equality on every write and on rename.

---

### Where the "enforce equality" hook lives

Two reasonable spots:

**(a)** In `saveDocument` / write path — before writing to disk, regex-replace the first `# ...` line with `# ${frontmatter.title}`. If no H1 exists, prepend one. **Recommended** — single chokepoint, applies to MCP `loom_update_doc`, `loom_rename`, refine, promote, generate.

**(b)** In each generator / mutator individually — more places to remember.

Going with (a). Implementation: a `syncBodyH1(body, title): string` helper in `core`, called from the fs `saveDocument` (or wherever frontmatter+body are serialized together).

Catch: if a user manually edits the body H1 in their editor, the next Loom write will silently overwrite it. Desired per your spec ("`# {Title}` as UX to be shown, not edited") — but worth noting.

---

### Generator changes (forward)

- `planBody.ts` — `# Goal` → `## Goal`, `# Steps` → `## Steps`. (H1 title still emitted upstream.)
- `designBody.ts` — drop `# CHAT` + `## ${userName}:` entirely (dead leftover, designs don't host chats anymore).
- `refineDesign.ts:44`, `refinePlan.ts:41` — `# Additional Context` → `## Additional Context`.
- `installWorkspace.ts:210` — `# Global Context` → `## Global Context`.
- `chatNew.ts:46`, `doStep.ts:87` — change `# CHAT\n\n## ${name}\n` → `# ${title}\n\n## ${name}\n` (the new H1-title rule applies to chats too; drop the redundant "CHAT" word).
- `promoteToIdea/Design/Plan.ts`, `refineIdea/Design/Plan.ts`, `createReference.ts` — already emit `# ${title}` ✓ (keep, but they'll also need `## Goal/Steps` etc inside).

---

### Parser updates (must match new format)

- `planTableUtils.ts:75` — regex matches `# Steps`. Update to match `## Steps` (and accept either during transition).
- Anything in `doStep` / `app` that locates the steps table by `# Steps` heading → accept `## Steps`. I'll grep for all heading-based parsers before editing.
- Tree view step rendering (if it reads the table heading) — same.

---

### Rename path

- `loom_rename` already changes frontmatter `title`. After rename, the save-path H1 sync handles the body. Verify by grepping the rename tool — if it writes the body without going through `saveDocument`, plug it in.

---

### Migration script (`scripts/migrate-h1-titles.ts`)

For each `loom/**/*.md` (skip `.archive/`):
1. Read frontmatter + body.
2. If body has no H1, prepend `# {frontmatter.title}`.
3. If body's first H1 differs from frontmatter title, replace with frontmatter title (frontmatter wins).
4. Demote all *other* H1s (lines starting with `# ` after the first) to `## `.
5. **Skip old design docs**: detect by `type: design` + presence of `# CHAT` section inside body → leave entire body untouched (historical chat content preserved).
6. Skip chat docs (`type: chat`) for the H1-title rule? No — apply it (they should have `# ${title}` too). But preserve all `## Name:` blocks.
7. Dry-run first, print diff, then apply.

---

### Refs tree fix (independent, small)

`treeProvider.ts:192` — drop the `length > 0` guard on the global refs section so an empty `refs/` folder still renders, enabling the "Create Reference" context menu.

---

### Proposed execution order

1. Grep for all H1-heading parsers (avoid breakage).
2. Add `syncBodyH1` helper in `core` + wire into save path.
3. Update generators.
4. Update parsers (`planTableUtils`, etc.).
5. Fix refs tree render condition.
6. Build + manual verify in extension (create doc → preview shows title; rename → both update).
7. Write migration script, dry-run, share diff sample, then apply on approval.
8. Build again, run test suite.

**STOP — waiting for `go`.** Any disagreement on the save-path sync location (a) vs (b), or the migration scope?

## Rafa:

(a)

take into account if any H1 -> H2 needed maybe need also H2 -> H3 etc

Chat docs should have also both titles and no `# CHAT`

If all is clear, create a plan, starting by commit push step

## Rafa:

do the whole plan vscode-extension-plan-010

## AI:

Plan progress — steps 1-9 done, **STOPPED at step 10** (apply migration) for explicit approval. Reasoning: 159 file changes is a bulk destructive op; the plan itself flagged this as a manual go gate.

### What landed (commit 939f143)
Step 1 — committed and pushed reveal-after-create work.

### What's in working tree (uncommitted, awaiting migration go)
- **Step 2 — heading parser map**: only two parsers anchor on `# Steps`/`# Goal` — `planTableUtils.ts` and `promoteToPlan.ts:104`. Everything else (`appendDone`, `chatReply`, `summarise`) already uses `##`. Updated both to accept `#{1,2}` (legacy + new) and emit `##`.
- **Step 3 — sync helper**: `packages/core/src/bodyH1Sync.ts` (new) + exported from index. Wired into `packages/fs/src/serializers/frontmatterSaver.ts` — every MCP write now syncs first H1 to frontmatter title. Idempotent.
- **Step 4 — generators demoted**:
  - `planBody.ts` — `# Goal`/`# Steps` → `## Goal`/`## Steps`, `## Legend` → `### Legend` (it's a sub-section of Steps).
  - `designBody.ts` — dropped `# CHAT` block entirely (dead leftover).
  - `refineDesign.ts`/`refinePlan.ts` — `# Additional Context` → `## Additional Context`.
  - `promoteToPlan.ts` — system prompt + step-table regex updated.
- **Step 5 — chat generators**: `chatNew.ts` and `doStep.ts` no longer emit `# CHAT` — body starts with `## ${name}` and the save-path adds `# ${title}` from frontmatter.
- **Step 6 — refs tree**: `treeProvider.ts:188` — dropped the `length > 0` guard. Empty `refs/` folder now renders the Refs section so Create Reference is reachable.
- **Step 7 — build clean** (`./scripts/build-all.sh`).
- **Step 8-9 — migration script + dry-run**:
  - `scripts/migrate-h1-titles.ts` (new). Algorithm: ensure first H1 = frontmatter title; if any rogue H1 exists below, shift every heading from that point onward by +1 (preserves hierarchy of subtree under the demoted H1, leaves earlier siblings untouched). Skips old design docs containing `# CHAT` (preserves historical inline chats — 9 docs skipped).
  - Dry-run: **159 files would change**, 9 skipped, 0 errors.

### Diff samples that matter

Plans (the dominant pattern):
```
loom/.../ai-command-palette-plan-001.md
  - # Steps        → ## Steps
  - ## Notes       → ### Notes   (was child of Steps subtree → cascades)
  ## Goal stays as ## Goal       (sits before Steps, doesn't cascade)
```

Chat docs with old `# CHAT`:
```
- # CHAT  → # continue-deepseek Chat   (now matches frontmatter title)
```

Design docs where body H1 drifted from frontmatter title:
```
- # AI Provider Transport Abstraction
  → # AI Provider Transport Abstraction (API Key vs Subscription vs Ollama)
```

Trailing-`\r` cleanup as a side-effect on Windows line-ending titles:
```
- # AI Command Palette — Promote, Refine, Summarize\r
  → # AI Command Palette — Promote, Refine, Summarize
```

### Things worth your eyes before approving --apply

1. **Some titles change wording** because the body H1 had drifted from frontmatter (e.g. `CLAUDE.md Lifecycle` → `CLAUDE Lifecycle` — frontmatter omits `.md`). Frontmatter wins per the rule, but if any of these are *wrong in frontmatter*, fix frontmatter first.
2. **Hierarchy cascade** is per-doc — my +1 shift starts at the first rogue H1 and runs to EOF, lifting only that subtree's depths. Siblings before the rogue H1 are untouched.
3. Full dry-run output saved to `/tmp/migrate-dry-run.txt` (shows first 15 of 159) — happy to dump the full list or filter by weave if you want to spot-check.

### To proceed

Reply `apply` to run `npx ts-node ... scripts/migrate-h1-titles.ts --apply`, then I'll do the final test-suite + commit + push (plan steps 11-12).

**STOP — waiting for `apply` (or pushback on specific diffs).**

## Rafa:

apply

## AI:

Plan **complete**. Pushed in 2 commits:

- `939f143` — reveal-after-create wiring (foundation).
- `07bd6ea` — frontmatter title H1 sync + section demotion + refs tree fix + migration of 159 docs.

**Test suite:** all passing except one pre-existing failure unrelated to this work — `tests/close-plan.test.ts` asserts done-doc `status: final` but `packages/app/src/closePlan.ts:88` sets `status: 'done'`. Same on HEAD before my changes (last touched in commit `4abebba`). Flagging for separate cleanup — out of scope here.

**Migration result:** 159 docs migrated, 9 old design docs skipped (preserved their inline `# CHAT` history). Heading hierarchy cascades correctly — `# Steps` → `## Steps`, and any H2 in that section's subtree → H3.

**One side-effect to confirm in the extension:**
- VS Code markdown preview should now show the doc title for every doc.
- Refs section appears even with an empty `refs/` folder so Create Reference is reachable.
- Rename a doc → both frontmatter `title` and body `# Title` update (rename goes through `loom_rename` → `saveDoc` → `syncBodyH1`).

**Follow-up worth tracking separately (NOT done here):**
- Pre-existing close-plan `status: 'done'` vs test-expected `'final'` mismatch.
- `mcp/src/tools/generateGlobalCtx.ts:20` still has a literal `# Loom — Global Context` in the system prompt; the save-path sync will override it to whatever the frontmatter title is. Works correctly but the prompt text is now misleading — small cleanup for later.

All next session-start `do-next-step` calls on this thread will see plan-010 as `status: complete` (last step done). Ready for your next direction.

## Rafa:

- Fix the bugs you mentioned in lines 516-520

- When I renamed a chat in extension got this:

```
Failed to rename: MCP error -32603: Invalid frontmatter in j:\loom_demo\.loom\CLAUDE.md: Missing required field: type
```

## AI:

Investigated all three. Two are quick fixes, one needs a small design call before I touch it.

**Bug 1 — close-plan `status: 'done'` vs test-expected `'final'`**

Looked at the code/test split:
- `packages/app/src/closePlan.ts:88` writes the done doc with `status: 'done'`.
- `tests/close-plan.test.ts:57` asserts `status: final` on the done doc.
- Grep for `'final'` across `packages/**/src` → **zero matches**. Nothing in the source code ever produces or accepts `'final'`. The DoneDoc type/reducers don't know about it.
- `tests/close-plan.test.ts:66` *also* asserts the plan ends up at `status: 'done'`, which matches the code.

So the test is the outlier — `'final'` is a phantom status that exists nowhere except this one assertion. The correct fix is to change the test to `status: done` (matches code, matches type system, matches the plan's own status, matches everything else in the codebase). Changing the code to emit `'final'` would mean adding a brand-new status value purely to satisfy one test line, with no semantic distinction from `'done'`.

Recommend: **fix the test**, not the code.

**Bug 2 — `generateGlobalCtx.ts:20` literal `# Loom — Global Context` in the system prompt**

Confirmed at `packages/mcp/src/tools/generateGlobalCtx.ts:17-34`. The prompt says "Output structure (markdown body only — no frontmatter, no surrounding code fences):" and then leads with `# Loom — Global Context` before the `## 1. Concept` section.

Two problems:
1. Misleading: `syncBodyH1` will overwrite that H1 with whatever frontmatter `title` says, so the prompt is lying to the model about what gets persisted.
2. Doubly wrong now: with the H1-sync work, generators should *not* emit `# Title` lines at all — the save chokepoint adds them. So we want the sample to just start at `## 1. Concept`.

Fix: drop the `# Loom — Global Context` line and the surrounding blank line from the prompt. One-line edit.

**Bug 3 — rename fails: `Invalid frontmatter in j:\loom_demo\.loom\CLAUDE.md: Missing required field: type`**

Root cause found. Trace:
- `packages/app/src/rename.ts:91` calls `updateAllReferences(loomRoot, ...)`.
- `updateAllReferences` (line 27) calls `findMarkdownFiles(loomRoot)`.
- `loomRoot` is the **workspace root** (e.g. `j:\loom_demo`), not the docs dir.
- `findMarkdownFiles` (`packages/fs/src/utils/pathUtils.ts:23`) recursively walks every dir under that root, only excluding `.archive`. So it picks up `.loom/CLAUDE.md`, `node_modules/**/*.md`, `README.md`, etc.
- `updateAllReferences` then calls `loadDoc` on every result, which throws on the first file without valid Loom frontmatter — in your demo workspace, `.loom/CLAUDE.md`.

Compare to `packages/fs/src/repositories/linkRepository.ts:35`, which does it right: it scans `path.join(loomRoot, 'loom')` — the docs subtree only, never the whole workspace.

**Correct fix (root cause, not a symptom patch):** scope `updateAllReferences` to `path.join(loomRoot, 'loom')` so it only walks the Loom docs tree, mirroring linkRepository. This also makes rename dramatically faster on real workspaces (no node_modules sweep). I'd resist the alternative of "make `loadDoc` swallow errors silently" — that hides real corruption in actual Loom docs.

Side note while I was in there: `findMarkdownFiles` also doesn't skip `node_modules`, `.git`, `.loom`, `dist`, etc. — fine for its current callers (linkRepository constrains the dir before calling), but a footgun. Worth a separate exclude-list pass later; out of scope here.

**Proposed plan (one commit each):**
1. Test fix — `tests/close-plan.test.ts:57` `final` → `done`. Run `./scripts/test-all.sh`.
2. Prompt cleanup — drop the literal H1 from `generateGlobalCtx.ts` SYSTEM_PROMPT.
3. Rename scope fix — `updateAllReferences` walks `path.join(loomRoot, 'loom')` instead of `loomRoot`. Verify by running the rename test suite and manually retrying the chat rename in `j:\loom_demo`.

All three are in `app`/`mcp` packages, so I'd `./scripts/build-all.sh` once at the end and run `./scripts/test-all.sh`.

One thing to flag: the thread-context resource currently shows plan `pl_01KSAW3YTZ4YK0WBZK3R6ABMGV` (H1 sync / refs tree / 12 steps) as `implementing`, but your previous message said plan-010 was complete. These look like overlapping plans on the same thread. Not blocking the three fixes above, but worth a glance — do you want this new plan, the old plan-010, or were they meant to merge?

STOP — waiting for `go` (or pushback on any of the three approaches, especially #1 where you may have wanted `'final'` to mean something).

## Rafa:

go

## AI:

All tests green. Summary of what landed:

✅ **Bug 1** — `tests/close-plan.test.ts:57` changed `'final'` → `'done'` to match code/type system.
✅ **Bug 2** — `packages/mcp/src/tools/generateGlobalCtx.ts` dropped the misleading `# Loom — Global Context` literal from the SYSTEM_PROMPT.
✅ **Bug 3** — `packages/app/src/rename.ts` scopes `updateAllReferences` scan to `loomRoot/loom/` (was scanning whole workspace, hitting `.loom/CLAUDE.md`).

Build clean, full test suite passes. The rename fix should also resolve your `j:\loom_demo\.loom\CLAUDE.md` error — worth a manual retry from the extension to confirm.

Next: commit these three fixes (one or three commits?), and the plan-010 vs `pl_01KSAW3YTZ4YK0WBZK3R6ABMGV` overlap question I flagged is still open.

## Rafa:

I already marked plan vscode-extension-plan-010.md as done, I do not see any issue

1 commit push