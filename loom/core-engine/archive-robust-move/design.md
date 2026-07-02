---
type: design
id: de_01KWH5FR1BGXFH3GBKECKHG9DF
title: loom_archive must move atomically, never silently copy
status: draft
created: 2026-07-02
updated: 2026-07-02
version: 2
idea_version: 1
tags: []
parent_id: id_01KWH56AJ9M2AZEEJ72JZ8C93J
requires_load: []
---
# loom_archive must move atomically, never silently copy

## Goal

Make `loom_archive` (and every sibling folder-move) **atomic-or-fail-loud**: after the operation the source is gone and only the destination exists, or the operation throws a clear, actionable error and leaves the tree exactly as it was. It must never return success with the source still present — the silent-duplicate half-move observed on `plan-steps-v2`.

## Root cause

`packages/app/src/archive.ts` calls `fs.move(source, dest, { overwrite: false })` (fs-extra). `fs.move` renames when it can, but falls back to **copy-then-remove** when a plain rename fails (cross-device, or — on Windows — when a handle is open). If the post-copy removal of the source fails (a doc open in a VS Code tab, or the extension/MCP holding the file), fs-extra surfaces an error, but the **copy has already happened** — so a caller that swallows or mis-handles the error is left with both copies. The same `fs.move` fallback is shared by `restoreItem` (the inverse move) and `moveThread`, so all three carry the identical risk.

## Approach — a shared `moveTreeOrThrow` helper, atomic-or-rollback

Extract one helper (in `packages/fs`, since it is pure IO) that all folder-moves call instead of `fs.move` directly:

```ts
// packages/fs — the single move seam for archive / restore / moveThread
export async function moveTreeOrThrow(source: string, dest: string, fs): Promise<void> {
    await fs.ensureDir(path.dirname(dest));
    await fs.move(source, dest, { overwrite: false });
    // Atomic-or-fail: fs.move may have copied but failed to remove the source.
    if (await fs.pathExists(source)) {
        // Roll back the copy so the tree is never left with a duplicate.
        await fs.remove(dest).catch(() => {/* best-effort; report original cause */});
        throw new Error(
            `Move incomplete: source still present at "${source}". A file there is likely ` +
            `open or locked (close editor tabs holding these docs and retry). No changes were kept.`,
        );
    }
}
```

**Decision (settled) — on a failed move, roll back the copy.**
Rolling back (removing the just-made `dest` copy when the source survives) keeps the tree in its *original, consistent* state: no duplicate ULIDs, no double-counting in the link index / roadmap. The alternative (leave the copy, throw) forces the user into the exact manual cleanup we are trying to eliminate. Rollback is best-effort — if even the rollback fails we still throw, reporting the original cause, but that is a rare double-fault. Net contract: **either the move fully succeeded, or nothing changed.**

## Changes

1. **`packages/fs`** — add `moveTreeOrThrow(source, dest, fs)` as above; export it.
2. **`packages/app/src/archive.ts`** — replace the inline `ensureDir` + `fs.move` with `moveTreeOrThrow`.
3. **`packages/app/src/restore.ts`** — same substitution for the inverse move.
4. **`moveThread`** (wherever the thread-folder move lives) — same substitution, so drag-move a thread across weaves gets the identical guarantee.
5. The MCP tools already relay thrown messages to the host, so the new error text surfaces to the user with no tool change.

## Testing

Add `tests/archive-robust-move.test.ts` (dist-importing, custom `assert`, `run().catch` style — the repo's test shape). Because forcing a real Windows file-lock is not portable, test the **helper** with an injected `fs` whose `move` copies but leaves the source (simulating the fallback failure):
- Assert `moveTreeOrThrow` **throws** with the "source still present" message.
- Assert it **removed the dest copy** (rollback) — no duplicate left behind.
- Happy path: `move` removes the source → helper resolves, source gone, dest present.
Wire it into `scripts/test-all.sh`.

## Out of scope

- Retry-with-backoff on the source removal (could mask a genuinely stuck handle; fail-loud is the safer default now).
- Detecting *which* file is locked (OS-specific; the actionable "close editor tabs and retry" message is enough).
