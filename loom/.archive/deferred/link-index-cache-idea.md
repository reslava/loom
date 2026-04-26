---
type: idea
id: link-index-cache-idea
title: "Cache Serialized Link Index to Disk"
status: deferred
created: 2026-04-18
version: 1
tags: [performance, link-index, cache, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# Cache Serialized Link Index to Disk

## Problem
The link index is currently rebuilt from scratch on every `loom status` and `loom validate` command by scanning all Markdown files in the `threads/` directory. For large projects with hundreds of documents, this introduces noticeable latency and redundant I/O. The CLI experience degrades as the project grows.

## Idea
Serialize the in‑memory `LinkIndex` to a JSON file at `.loom/cache/link-index.json` after each full build. On subsequent commands, load the cached index and **invalidate it only when necessary** by comparing file modification times (`mtime`) against the cache's generation timestamp. If any document has changed since the cache was written, rebuild the index incrementally or perform a full rebuild.

**Proposed cache structure:**
```json
{
  "generated": "2026-04-18T10:00:00.000Z",
  "loomRoot": "/path/to/loom",
  "documents": { ... },
  "parent": { ... },
  "children": { ... },
  "stepBlockers": { ... }
}
```

**Invalidation strategy:**
- On startup, check if `.loom/cache/link-index.json` exists.
- If it exists, stat all `.md` files in `threads/`. If any file has an `mtime` newer than `generated`, the cache is **stale** and a full rebuild is performed.
- If no files have changed, load the cached index directly (near‑instant).

**Fallback:** If the cache is missing or stale, perform a full rebuild and write a new cache file.

## Why Defer
- The current full‑scan performance is **acceptable for MVP** and typical project sizes.
- Caching introduces complexity around cross‑platform file watching and invalidation logic.
- The **VS Code extension** will use incremental updates via file watchers, making this less critical for the primary visual interface.
- This is a performance optimization, not a functional requirement.

## Open Questions
- Should the cache be invalidated when `.loom/workflow.yml` changes?
- How to handle multiple CLI commands running concurrently (e.g., file locks)?
- Should we use a more robust hashing mechanism (e.g., content hash) instead of `mtime`?

## Next Step
Re‑evaluate after the VS Code extension is stable and real‑world performance data is available. Create `link-index-cache-plan-001.md` when ready.

**Status: Deferred for post‑MVP consideration.**