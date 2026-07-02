---
type: idea
id: id_01KWH56AJ9M2AZEEJ72JZ8C93J
title: loom_archive must move atomically, never silently copy
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: null
requires_load: []
---
# loom_archive must move atomically, never silently copy

## Problem

`loom_archive` is supposed to **move** a thread/weave folder under `loom/.archive/`, leaving nothing behind in the live tree. In live use it instead **copied** — the archived thread appeared under `.archive/` *and* the original stayed in place, so the user had to delete the source folder by hand. A half-move that silently duplicates data is worse than a loud failure: the tree now has two copies of the same thread, the link index sees duplicate ULIDs, and the roadmap/state can double-count.

## Repro

1. Archive a thread that has docs open in editor tabs — observed on `core-engine/plan-steps-v2`.
2. Result: `loom/.archive/core-engine/plan-steps-v2/` created (copy) **and** `loom/core-engine/plan-steps-v2/` still present.
3. Expected: source folder gone; only the `.archive/` copy remains.

## Likely cause

`packages/app/src/archive.ts` uses `fs.move(source, archivedPath, { overwrite: false })` (fs-extra). fs-extra's `move` falls back to **copy-then-unlink** when a plain rename isn't possible; on Windows an open file handle (a doc open in a VS Code tab, or the extension/MCP holding the file) makes the post-copy `unlink`/rmdir of the source fail. If that failure is swallowed, the copy succeeds and the source survives — exactly the observed half-move. The same class of bug affects `restoreItem` (the inverse move) and possibly `moveThread`/`rename`.

## Fix direction (to design)

- **Atomic-or-fail:** after the move, assert the source no longer exists; if it does, either retry the source removal or throw a clear error and roll back the copy — never return success with a surviving source.
- **Surface the real error:** don't swallow the unlink/rmdir failure. Report "couldn't remove source (file in use?)" so the user knows to close tabs and retry.
- **Audit siblings:** `restoreItem`, `moveThread`, and any other `fs.move` caller share the fallback and need the same guarantee.
- **Regression test:** simulate/force a copy-fallback path and assert the source is gone (or the op throws) — a dist-importing test in `tests/`.

## Vision check

Serves "weave/threads and docs operations: new, delete, rename, drag & drop" — archive is a core no-AI CRUD op, and a CRUD op that silently duplicates instead of moving breaks the "documents are the database" trust. Removes the manual step "delete the leftover source folder by hand after every archive."

## Next step

design
