---
type: idea
id: memory-fs-adapter-idea
title: "In‑Memory Filesystem Adapter for Testing"
status: deferred
created: 2026-04-17
version: 1
tags: [testing, fs, architecture, deferred]
parent_id: null
child_ids: []
requires_load: []
---

# In‑Memory Filesystem Adapter for Testing

## Problem
The current test suite uses the real filesystem (via `fs-extra`). This causes:
- **Slowness:** Disk I/O adds overhead.
- **EBUSY errors on Windows:** Files are locked briefly, causing flaky cleanup.
- **State leakage:** Tests must carefully clean up temporary directories.
- **Difficult unit testing:** `app` use‑cases cannot be tested in isolation without real files.

## Idea
Create an **in‑memory filesystem adapter** that implements the same interface as the `fs` layer used by `app` use‑cases. During tests, inject the memory adapter instead of the real `fs` module.

**Interface to mock (subset of `fs-extra`):**
```typescript
interface FileSystem {
    ensureDir(path: string): Promise<void>;
    outputFile(path: string, data: string): Promise<void>;
    readFile(path: string): Promise<string>;
    pathExists(path: string): Promise<boolean>;
    remove(path: string): Promise<void>;
    // ... other methods as needed
}
```

**Memory adapter:**
```typescript
class MemoryFS implements FileSystem {
    private files = new Map<string, string>();
    // ... implement methods using the Map
}
```

**Benefits:**
- **Lightning‑fast tests:** No disk I/O.
- **No EBUSY errors:** Memory operations are atomic.
- **Isolated unit tests:** Each test gets a fresh `MemoryFS` instance.
- **True unit testing of `app` layer:** No dependency on real filesystem.

## Why Defer
- The current test suite works (with occasional EBUSY workarounds).
- Implementing a full `fs-extra` compatible memory adapter is non‑trivial.
- This is an infrastructure improvement, not a user‑facing feature.

## Open Questions
- Should we mock the entire `fs-extra` API or only the subset we use?
- Should the memory adapter simulate permissions and errors?
- Can we use an existing library like `memfs` instead of building our own?

## Next Step
Evaluate `memfs` as a drop‑in replacement. Create `memory-fs-adapter-plan-001.md` when ready.

**Status: Deferred for post‑MVP consideration.**