---
type: idea
id: id_01KSTFYVRPJF86BEYYNTT81C4N
title: Sidebar CONTEXT UX — see and toggle what the AI gets
status: done
created: "2026-05-29T00:00:00.000Z"
updated: 2026-06-01
version: 3
tags: []
parent_id: null
requires_load: []
---
# Sidebar CONTEXT UX — see and toggle what the AI gets

## The gap

The Unified Context Pipeline (Phase 1 + 2 shipped, 2026-05-25 / 2026-05-29) produces a deterministic `ContextBundle` with `auto` / `user-include` / `user-exclude` reasons and a `.loom/context-prefs.json` slot in the design for sidebar-driven overrides. The plumbing exists; the *surface* doesn't.

Today the pipeline runs silently when a user clicks Reply / do-step / refine / promote. The user has no surface to:

- **See, before launch, what the AI is about to receive.** The `📄 {Title} — loaded for context` lines land in the chat *after* the AI runs, mixed into the AI's reply. Inspection is post-hoc, never pre-launch.
- **Override an auto-included doc out** without editing frontmatter (`load_when`) or deleting the file.
- **Add a doc the auto-load missed** without manually editing `requires_load` somewhere upstream.

Phase 3 of the pipeline plan committed to this surface — a CONTEXT section in the sidebar tree, interactive include/exclude toggles, and persistent overrides in `.loom/context-prefs.json`. This thread owns that work.

## Why this hurts

- **The trust loop is open.** The pipeline promises "you see exactly what the AI saw"; today the user sees it *retrospectively*. If the AI gives a weird answer, "what did it actually load?" is investigative work, not a glance at the sidebar.
- **Override paths are too sharp.** The only way to exclude a doc from auto-load today is to edit its frontmatter (`load_when`) or delete the file. Both are workspace-level changes for what should be a per-launch decision. Users either burn the bridge or copy/paste around the loader.
- **Token waste is invisible.** With the budget-and-summarisation phase (Phase 5) still pending, the user has no way to see "this chat is about to ship 14k tokens of context" and trim before launch. That's a feedback loop with no signal.
- **Power users have no escape hatch.** "I want *this one extra doc* included for *this one reply*" is currently impossible without modifying `requires_load` on some doc and reverting after.

## What it ships

A single new sidebar surface that reads from the `ContextBundle` and writes to `.loom/context-prefs.json`:

- A CONTEXT section in the tree showing every doc that *would* be loaded right now for the active target + mode, with `auto` / `user-include` / `user-exclude` visually distinct.
- Toggle on each entry: include / exclude / reset-to-auto.
- Override persistence to `.loom/context-prefs.json` (per-target, possibly per-mode — design decision).
- A small "Add doc" affordance to include something the auto-load missed.
- Stale and missing markers carried through from the bundle (they already exist in the data — surface them in the tree).

## What it does NOT ship

- Token budgeting / summarisation logic (Phase 5 of context-pipeline).
- Thread/weave ctx-load (lives in `core-engine/ctx-load/` — sibling thread). The sidebar surfaces whatever the assembler currently emits; if ctx-load is still inert when this thread implements, the sidebar will show fewer rows. No coupling.
- Multi-target session prefs ("for this whole branch, never load X"). Maybe Phase 4+; out of scope here.

## Vision link

Serves two pipeline-reference user-POV promises directly:

- *"You see exactly what the AI saw."* — pre-launch, not retrospective.
- *"You stay in control."* — toggles instead of frontmatter edits.

Removes the current manual step: "edit `load_when` and restart the session" or "paste the context summary into the chat by hand". Replaces both with a single click in the tree.

## Coordination

- **Pipeline core** is settled — the `overrides` argument shape, the `auto / user-include / user-exclude` reasons, and `.loom/context-prefs.json` as the persistence file are all in `context-pipeline-design.md` / `loom-context-pipeline-reference.md`. This thread does not redesign those; it builds the UI that uses them.
- **VS Code tree-view** is the dominant consumer but not the only one. The persistence path needs to be choosable so non-VSCode clients can read/write the same prefs. Design decision deferred to `context-sidebar-design.md`.
- **`ctx-load` sibling thread** is independent — ships when it ships; sidebar shows whatever assembler emits.
