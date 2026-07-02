---
type: done
id: pl_01KWH64BCSH2SS5P60HBRSHMBP-done
title: Done — Atomic-or-fail folder moves via a shared helper
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: pl_01KWH64BCSH2SS5P60HBRSHMBP
requires_load: []
---
# Done — Atomic-or-fail folder moves via a shared helper

## Step 1 — Add moveTreeOrThrow(source, dest, fs) to packages/fs: ensureDir(dirname(dest)) → fs.move(source, dest, {overwrite:false}) → if source still exists, best-effort remove(dest) then throw an actionable 'source still present (file open/locked), no changes kept' error. Export it.

Added `moveTreeOrThrow(source, dest, fs = fsExtra)` in `packages/fs/src/utils/moveTree.ts` (co-located with pathUtils), exported from `packages/fs/src/index.ts`. It ensures the dest parent, records whether dest pre-existed, then runs `fs.move`. If `move` **throws** (copy landed but source removal failed) OR **resolves but the source still exists** (defensive), it rolls back — but only removes a dest **we** created, never a pre-existing one — and throws an actionable error ("a file is likely open or locked … No changes were kept"). Net contract: either the move fully succeeded or the tree is unchanged.

## Step 2 — Route all fs.move folder-move callers through moveTreeOrThrow: archive.ts:70, restore.ts:45, and thread.ts (move-to-weave + rename-slug moves). Replace the inline ensureDir+fs.move pairs so all three share the atomic-or-rollback guarantee.

Routed every folder-move caller through the helper: `packages/app/src/archive.ts` (archive), `restore.ts` (restore), and `thread.ts` — both `renameThread` and `moveThread` (2 sites, replaced via replace_all). Dropped the now-redundant inline `ensureDir(dirname(dest))` in archive/restore since the helper ensures it. Left `thread.ts` `flattenLegacySingletons`' raw `fs.move` untouched: it's an internal legacy-migration *file* rename within one thread, not a user folder move — out of scope for the archive/restore/move guarantee.

## Step 3 — Add tests/archive-robust-move.test.ts (dist-importing, custom assert): inject an fs whose move copies but leaves the source → assert moveTreeOrThrow throws AND removed dest (rollback, no duplicate); happy path → source gone, dest present. Wire into scripts/test-all.sh.

Added `tests/archive-robust-move.test.ts` — drives `moveTreeOrThrow` with an injected fake `fs` (a Set of existing paths) across 4 cases: happy path (source gone, dest present); copy-leaves-source where move *resolves* (throws + rolls back, source kept, no duplicate); move *throws* after copying dest (throws + rolls back); and a pre-existing dest that must NOT be clobbered on failure. A real OS file-lock can't be triggered portably, so the fake fs is the deterministic way to exercise the fallback. Wired into `scripts/test-all.sh` after entities-crud. `build-all` green; full `test-all` green including the 18 MCP integration tests — no regressions from the archive/restore/thread changes.
