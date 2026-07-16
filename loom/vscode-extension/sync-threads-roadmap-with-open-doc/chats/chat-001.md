---
type: chat
id: ch_01KXMQDV14CAYXXZWKW4ZKG0X8
title: sync-threads-roadmap-with-open-doc Chat 001
status: done
created: 2026-07-16
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 15
---
# sync-threads-roadmap-with-open-doc Chat 001

## Rafa:

Currently when I change doc opened in VSCode ide, extension view threads tree automatically select that doc and sync

Tweaks, new sync additions for better UX:

1. Do the same when active view in extension is roadmap, select corresponding thread of the document

2. Keep the sync when User click extension toolbar button toggle `Show roadmap`/ `Show threads` with the opened doc. Currently when this button is clicked, no sync occurs.

Do you like, agree?
Any other tweak suggestion to improve the UX?

## AI:

Yes — I agree with both, and I'd frame them as one idea: **"keep the active doc and the tree in sync no matter which view is showing or what triggered the change."** Today that sync only fires on one trigger (editor-change) and only really works in one view (threads). Let me ground each tweak in the current code so we pick the right fix, not a patch.

**How the sync works today.** `onDidChangeActiveTextEditor` (`extension.ts:135`) gates on `syncDocToTreeEnabled`, then does `getNodeByFilePath(path)` → `treeView.reveal`. `getNodeByFilePath` is a lookup into `filePathToNode`, built by `buildNodeMaps` over whatever nodes the current view produced.

**Tweak 1 (sync in roadmap view) — agree, but there's a real subtlety.** In roadmap mode the tree *is* rebuilt into node maps (`treeProvider.ts:171`), so `getNodeByFilePath` isn't empty — but each roadmap thread node maps **exactly one** representative doc path: `resolveThreadDocPath` picks the latest open chat, else design → idea → manifest (`treeProvider.ts:563`). So a naive "just reuse the existing sync in roadmap mode" would only highlight the thread when *that one* doc is open. Open a plan, an older chat, or the req of the same thread and nothing matches — silent no-op.

So tweak 1 isn't "make the existing lookup run in roadmap mode" — it needs **doc → owning-thread** resolution: given any open file, find its thread and reveal that roadmap node. That's the design decision I want to flag (see below).

**Tweak 2 (keep sync across the Show roadmap/Show threads toggle) — fully agree, clean fix.** `toggleRoadmap` (`extension.ts:203`) updates state and calls `treeProvider.refresh()` but never re-syncs to the active editor, so the selection is lost on every toggle. The fix is just to re-run the sync **after** the refresh settles (there's already `waitForRefresh()` used by `revealDocAfterCreate`).

**What ties both together — one primitive.** Right now the sync logic is inlined in the editor-change handler. I'd extract a single `syncActiveEditorToTree()` and call it from every trigger that should re-sync:
1. `onDidChangeActiveTextEditor` (exists)
2. after `toggleRoadmap` refresh (tweak 2)
3. after re-enabling the `Show sync` toggle — so turning sync back **on** immediately jumps to the current doc, instead of waiting for the next editor switch (small bonus, same primitive)

**The one decision I need from you (tweak 1's resolver).** How should "any doc → its thread node" resolve in roadmap mode?

- **(a) Path-based:** parse `loom/{weave}/{thread}/…` from the file path → `getNodeByThreadId(weave, thread)`. Simplest, but bakes in a path assumption and the extension currently avoids fs/path knowledge (it goes through state/MCP only).
- **(b) State-index (my lean):** build a `filePathToThreadKey` map from the full `loom://state` we already read each refresh (every thread lists its docs' `_path`), independent of view mode. Then resolve any file → thread key → roadmap node. No path parsing, authoritative, works identically in both views. Costs one small index built at refresh.

I lean **(b)** — it's the view-mode-agnostic, no-assumptions path, and it also makes threads-mode sync robust for docs that aren't currently mapped. Any other UX tweak on my side: I'd keep it to these; a *reverse* sync (tree-click → open doc) already exists via node commands, so no need there.

Do you want me to go with (b), and should the re-enable-sync bonus (#3 above) be in scope or left out?

## Rafa:

I like (b) and bonus (#3)
write idea

## Rafa:

Like idea, marked done
write design

## AI:

Created `design.md` (draft, v1) — id `de_01KXMRVF617KKJC0316833FB8F`.

It commits the agreed direction to concrete code:

- **Resolver (b):** a `filePathToThreadKey` map built from the full `loom://state` we already read each refresh, over every doc-bearing field (`req/idea/design/manifest/plans/dones/chats/refDocs`) → `getThreadNodeByFilePath` that reuses `threadKeyToNode` (resolves the right node per view, no `roadmapEnabled` branching).
- **Resolution order:** exact `getNodeByFilePath` preferred, thread-node fallback — strictly additive, no Threads-view regression.
- **One primitive** `syncActiveEditorToTree()` reading `activeTextEditor` itself, wired to three triggers: editor change, roadmap toggle (after `waitForRefresh()`), sync re-enable.
- Edge cases (loose/global docs → no-op, disabled → inert, toggle timing) + manual verification steps, since this is extension UI wiring outside the `dist` test harness.

Next: review the draft design — `refine` for changes, `finalize` to lock, or say `write req` / `write plan` and I'll continue the loop.

## Rafa:

write req + plan

## Rafa:

req locked and verified coevered
plan started
do plan

## AI:

`do plan` — implemented steps 1–4 and built clean. Summary of what landed:

**`packages/vscode/src/tree/treeProvider.ts`**
- New `filePathToThreadKey` index (absolute doc path → `weaveSlug/threadSlug`), cleared + rebuilt each refresh via `buildFilePathToThreadKey(state)`, before the view branch so it's populated in both views. Covers `req/idea/design/manifest/plans/dones/chats/refDocs`.
- New `getThreadNodeByFilePath(path)` → resolves through the existing `threadKeyToNode`, so it yields the roadmap node in Roadmap view and the thread node in Threads view with no `roadmapEnabled` branching.

**`packages/vscode/src/extension.ts`**
- New `syncActiveEditorToTree()` primitive: no-op when sync is off, reads `activeTextEditor` itself, reveals `getNodeByFilePath(path) ?? getThreadNodeByFilePath(path)` (exact node preferred → thread-node fallback).
- Editor-change handler now just calls it.
- `toggleRoadmap` is async: after `refresh()`, `await waitForRefresh()` then re-sync — selection survives the Show roadmap/threads toggle.
- Both sync-toggle commands call it after flipping the flag — turning sync back on jumps to the current doc; inert when turning off.

**Build:** `./scripts/build-all.sh` green, no TS errors — steps 1–4 all typecheck.

**Step 5 needs your hands** — the extension UI can't be driven from here. Reload Window, then run:
1. Roadmap view — open a plan / older chat / req of a thread → its roadmap node selects (was a silent no-op before).
2. Doc open → toggle Show roadmap ↔ Show threads → selection persists.
3. Sync off → switch docs → sync on → jumps to the current doc.
4. Threads view — exact doc node still selects (no regression).

I left step 5 **pending**; say the word once the four check out and I'll complete it + close the plan (and commit if you want). If anything misbehaves, tell me which scenario and I'll fix.

## Rafa:

Fails when click toggle Show roadmap ↔ Show threads

## AI:

Found and fixed the root cause of scenario 2.

The resolver leaned on `threadKeyToNode`, but `buildNodeMaps` only fills that map for nodes whose `contextValue` starts with `"thread"`. In **Roadmap view** the thread node's `contextValue` is `"roadmap-thread"` — so it was never indexed, and `getThreadNodeByFilePath` came back empty in Roadmap view (which is exactly the toggle-to-roadmap and roadmap-editor-change cases). I broadened the guard in `buildNodeMaps` to also match `contextValue === "roadmap-thread"`, so thread-level nodes register in both views.

Rebuilt clean. Please **Reload Window** and re-run the checks — scenario 2 (and scenario 1 for non-representative docs like a plan/req) should now select the roadmap node:
1. Roadmap view — open a plan / older chat / req → its roadmap node selects.
2. Doc open → toggle Show roadmap ↔ Show threads → selection persists.
3. Sync off → switch docs → sync on → jumps to current doc.
4. Threads view — exact doc node still selects.

Step 5 still pending your confirmation; on `go` I'll complete it, close the plan, and commit if you want.

## Rafa:

Still fails when click toggle Show roadmap ↔ Show threads
(also when change VSCode left siderbar tool or start VSCode and come back to loom, no sync with opened doc)

Working when change active doc in any of both views

## AI:

Your data pinned it: editor-change works in both views (so resolution is correct), but the failing cases all share one trait — **the editor didn't change; the tree rebuilt or re-appeared**. That's a *timing* problem, not a lookup problem.

When the tree rebuilds (toggle) or re-appears, VS Code is still painting rows, and `treeView.reveal` is silently dropped if the target row isn't rendered yet — and there's no "tree rendered" event to wait on. Fixes:

1. **Deferred reveal** — new `syncActiveEditorToTreeDeferred()` yields one macrotask (`setTimeout(…, 0)`) so the render settles before revealing.
2. **Toggle** — removed the redundant `refresh()` that double-fired the tree event, and it now `await waitForRefresh()` then does the deferred reveal.
3. **New visibility trigger** — `treeView.onDidChangeVisibility` → deferred sync when the Loom view becomes visible. This covers the two extra cases you hit: switching sidebar tools back to Loom, and opening VS Code with a doc already open.

Rebuilt clean. **Reload Window** and re-check:
1. Toggle Show roadmap ↔ Show threads with a doc open → selection persists.
2. Switch to another sidebar view and back to Loom → selects the open doc.
3. (Restart VS Code with a doc open, come back to Loom → selects it.)
4. Editor-change in both views still works (no regression).

If the toggle still misbehaves, the next lever is a slightly longer defer or revealing off the tree's post-render — but the macrotask defer is the standard fix and should do it. On your `go` I'll complete step 5 and close the plan.

## Rafa:

All working
The only gap is when reload window, vscode start, need to change active doc to start syncing. If it is easy fix ok, if not we could leave this. Tell me

## AI:

Easy fix — done. On startup/reload the already-open doc triggers nothing (the editor didn't *change*, and the Loom view may already be visible so no visibility *change* fires either). Added one initial sync at activation: after the first tree build settles (`waitForRefresh()` → node maps exist), it does the deferred reveal for the current doc.

Rebuilt clean. **Reload Window** with a doc open → the tree should now select it without you switching docs.

If that checks out, everything in the plan is verified — say `go` and I'll complete step 5 and close the plan.

## Rafa:

Working
go
commit

## AI:

All scenarios verified — plan complete and closed (all 5 steps ✅, `plan-001-done.md` finalized). Shipped:

- **`treeProvider.ts`** — state-derived `filePathToThreadKey` index + `getThreadNodeByFilePath`, and `threadKeyToNode` now also registers the `roadmap-thread` node so resolution works in both views.
- **`extension.ts`** — one `syncActiveEditorToTree` primitive (exact-node → thread-node fallback) plus a deferred variant, wired to five triggers: editor change, view toggle, sync re-enable, view-visibility, and initial activation.

Committing now.