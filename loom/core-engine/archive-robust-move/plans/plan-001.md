---
type: plan
id: pl_01KWH64BCSH2SS5P60HBRSHMBP
title: Atomic-or-fail folder moves via a shared helper
status: done
created: 2026-07-02
updated: 2026-07-02
version: 1
design_version: 2
tags: []
parent_id: de_01KWH5FR1BGXFH3GBKECKHG9DF
requires_load: []
target_version: 0.1.0
actual_release: 1.14.0
steps:
  - id: movetreeorthrow-helper-in-packages-fs
    order: 1
    status: done
    description: "Add moveTreeOrThrow(source, dest, fs) to packages/fs: ensureDir(dirname(dest)) → fs.move(source, dest, {overwrite:false}) → if source still exists, best-effort remove(dest) then throw an actionable 'source still present (file open/locked), no changes kept' error. Export it."
    files_touched: [packages/fs/src/moveTree.ts, packages/fs/src/index.ts]
    blocked_by: []
    satisfies: []
  - id: adopt-the-helper-in-archive-restore
    order: 2
    status: done
    description: "Route all fs.move folder-move callers through moveTreeOrThrow: archive.ts:70, restore.ts:45, and thread.ts (move-to-weave + rename-slug moves). Replace the inline ensureDir+fs.move pairs so all three share the atomic-or-rollback guarantee."
    files_touched: [packages/app/src/archive.ts, packages/app/src/restore.ts, packages/app/src/thread.ts]
    blocked_by: [movetreeorthrow-helper-in-packages-fs]
    satisfies: []
  - id: regression-test-for-the-copy-fallback
    order: 3
    status: done
    description: "Add tests/archive-robust-move.test.ts (dist-importing, custom assert): inject an fs whose move copies but leaves the source → assert moveTreeOrThrow throws AND removed dest (rollback, no duplicate); happy path → source gone, dest present. Wire into scripts/test-all.sh."
    files_touched: [tests/archive-robust-move.test.ts, scripts/test-all.sh]
    blocked_by: [adopt-the-helper-in-archive-restore]
    satisfies: []
---
# Atomic-or-fail folder moves via a shared helper

## Goal

Give every folder-move (archive, restore, thread move/rename) one atomic-or-fail-loud contract so a move can never leave a surviving source (the silent-duplicate half-move). Introduce a single shared `moveTreeOrThrow` helper in packages/fs that wraps fs.move and, if the source still exists afterward, rolls back the just-made copy and throws an actionable error; then route all current fs.move callers through it. Rollback is the settled behaviour: either the move fully succeeded or nothing changed.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add moveTreeOrThrow(source, dest, fs) to packages/fs: ensureDir(dirname(dest)) → fs.move(source, dest, {overwrite:false}) → if source still exists, best-effort remove(dest) then throw an actionable 'source still present (file open/locked), no changes kept' error. Export it. | packages/fs/src/moveTree.ts, packages/fs/src/index.ts | — | — |
| ✅ | 2 | Route all fs.move folder-move callers through moveTreeOrThrow: archive.ts:70, restore.ts:45, and thread.ts (move-to-weave + rename-slug moves). Replace the inline ensureDir+fs.move pairs so all three share the atomic-or-rollback guarantee. | packages/app/src/archive.ts, packages/app/src/restore.ts, packages/app/src/thread.ts | movetreeorthrow-helper-in-packages-fs | — |
| ✅ | 3 | Add tests/archive-robust-move.test.ts (dist-importing, custom assert): inject an fs whose move copies but leaves the source → assert moveTreeOrThrow throws AND removed dest (rollback, no duplicate); happy path → source gone, dest present. Wire into scripts/test-all.sh. | tests/archive-robust-move.test.ts, scripts/test-all.sh | adopt-the-helper-in-archive-restore | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
