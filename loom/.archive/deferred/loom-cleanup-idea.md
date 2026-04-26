---
type: idea
id: loom-cleanup-idea
title: "`loom cleanup` — Remove Stale or Unwanted Looms"
status: deferred
created: 2026-04-18
version: 1
tags: [cli, cleanup, maintenance, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# `loom cleanup` — Remove Stale or Unwanted Looms

## Problem
Over time, the global registry (`~/.loom/config.yaml`) accumulates entries for test looms, deleted directories, and abandoned workspaces. The `loom list` command shows these as `[missing]` or clutters the output with obsolete names. There is currently no built‑in way to remove these entries or delete the associated directories cleanly.

## Idea
Introduce a `loom cleanup` command that:

- **Lists** stale looms (`[missing]` paths).
- **Removes** registry entries for specified looms (or all stale entries).
- **Optionally deletes** the loom directory if it still exists.

**Proposed syntax:**
```bash
loom cleanup [--dry-run] [--delete-files] [<name>...]
```

**Options:**
- `--dry-run`: Show what would be removed without actually removing anything.
- `--delete-files`: Also delete the loom directory from disk (if it exists).
- `<name>...`: Specific loom names to clean up. If omitted, cleans all stale looms.

**Example:**
```bash
loom cleanup --dry-run
# Would remove: test-loom-1776273930066, test-loom-1776274012602 (5 entries)

loom cleanup test-loom-1776273930066
# Removes only that registry entry

loom cleanup --delete-files
# Removes all stale registry entries and deletes their directories
```

## Why Defer
- Manual cleanup (`rm -rf ~/looms/test-*` and editing `config.yaml`) is sufficient for MVP.
- The command is a convenience, not a core workflow requirement.
- Higher‑priority work (Validation Extraction, VS Code extension) should come first.

## Open Questions
- Should `loom cleanup` also remove orphaned cache directories?
- Should there be a confirmation prompt when `--delete-files` is used?
- Should `loom setup` automatically clean up stale entries with the same name?

## Next Step
Re‑evaluate after the VS Code extension is stable. Create `loom-cleanup-design.md` and a corresponding implementation plan.

**Status: Deferred for post‑MVP consideration.**
