---
type: plan
id: pl_01KQYDFDDB47NXHQ9RPNJ4T294
title: Directory Structure Migration — weaves/ → loom/
status: done
created: "2026-04-26T00:00:00.000Z"
version: 1
design_version: 1
tags: [migration, structure, filesystem, core-engine]
parent_id: null
requires_load: [workspace-directory-structure-reference, rf_01KQYDFDDDMS4N0V9G73MNV5JR]
---

# Directory Structure Migration — weaves/ → loom/

## Goal

Migrate the Loom repository from the old directory layout to the new canonical structure:

| Before | After |
|--------|-------|
| `weaves/` (docs root) | `loom/` |
| `references/` (at project root) | `loom/refs/` (flattened — no inner `loom/` subdir) |
| `_archive/` | `.archive/` |
| No `refs/` at weave/thread level | `refs/` available at all 3 levels |

Target structure: `loom/ctx.md` · `loom/refs/` · `loom/chats/` · `loom/.archive/` · `loom/{weave}/{thread}/`

---

## Steps

