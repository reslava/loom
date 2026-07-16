---
type: idea
id: id_01KXMREPXPN7WXJ29X6W70Q8SB
title: Sync the tree to the active doc across all views and triggers
status: done
created: 2026-07-16
version: 1
tags: []
parent_id: null
requires_load: []
---
# Sync the tree to the active doc across all views and triggers

## What we want

Keep the extension's tree selection in sync with the document open in the editor **regardless of which view is showing (Threads or Roadmap) or what triggered the change**. Today the sync is one-trigger, one-view: it fires only on editor switch and only lands reliably in Threads view.

Concretely:

1. **Sync in Roadmap view.** When the Roadmap view is active and the editor's document changes, select the roadmap node for that document's owning thread.
2. **Keep sync across the view toggle.** When the user clicks the `Show roadmap` / `Show threads` toolbar toggle while a doc is open, re-select the corresponding node in the newly-shown view. Today the toggle refreshes the tree but drops the selection.
3. **Sync on re-enable (bonus).** When the user turns the doc→tree sync back **on**, immediately jump to the currently-open doc instead of waiting for the next editor switch.

## Why it matters

The extension is the visual bridge between the user, their docs, and the AI. "The tree always points at what I'm looking at" is a small, constant orientation cue — and right now it silently breaks in exactly the cases above:

- In Roadmap view the current sync only matches a thread's **one** representative doc (`resolveThreadDocPath` — latest open chat, else design → idea → manifest). Open a plan, an older chat, or the req of that same thread and nothing highlights — a silent no-op that reads as "sync is broken."
- Toggling views loses the selection every time, so the user re-hunts for their thread after each toggle.

Both are papercuts against the same expectation, and both stem from the sync being wired to a single trigger and a single exact-path lookup.

## How (agreed direction)

- **One primitive.** Extract the inline editor-change sync into a single `syncActiveEditorToTree()` and call it from every trigger that should re-sync: editor change, after the roadmap toggle's refresh settles, and on sync re-enable.
- **Doc → owning-thread resolution (option b).** Build a `filePathToThreadKey` index from the full `loom://state` already read each refresh (every thread lists its docs' `_path`), independent of view mode. Resolve any open file → thread key → the visible node (roadmap thread node, or the thread node in Threads view). No path-parsing, no fs assumptions — authoritative and identical across both views. This also makes Threads-mode sync robust for docs the exact-path map doesn't currently cover.

## Success criteria

- Opening **any** doc of a thread (idea, design, req, any plan, any chat) selects that thread's node in **both** Threads and Roadmap views.
- Clicking `Show roadmap` / `Show threads` with a doc open keeps the corresponding node selected in the newly-shown view.
- Re-enabling the doc→tree sync immediately selects the node for the currently-open doc.
- No path/fs assumptions added to the extension; resolution flows from `loom://state`.
- Sync remains a no-op when `syncDocToTreeEnabled` is off.
