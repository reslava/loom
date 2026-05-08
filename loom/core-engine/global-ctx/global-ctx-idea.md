---
type: idea
id: id_01KQYDFDDC5KQMGQJKN66H5RX9
title: Global Ctx — Project-Level Context Summary
status: done
created: "2026-04-26T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 2
tags: [ctx, ai, core-engine, mcp]
parent_id: null
requires_load: [rf_01KQYDFDDDMS4N0V9G73MNV5JR]
---

# Global Ctx — Project-Level Context Summary

## Problem

Loom has per-weave and per-thread ctx docs, but no project-level summary. AI agents starting a new session have to read architecture.md + multiple weave ctx files cold to understand the overall project state. This is inefficient and easy to skip.

## Idea

Add a **global ctx** at `loom/ctx.md` — a project-level AI-generated summary that agents read first before diving into any weave or thread work.

### 3-layer ctx hierarchy

```
loom/ctx.md                          ← global ctx  (NEW)
loom/{weave}/ctx.md                  ← weave ctx   (existing)
loom/{weave}/{thread}/ctx/           ← thread ctx  (existing)
```

Each layer is self-contained but references the layer above when needed. No duplication.

### What each layer contains

| Layer | Path | Summarizes |
|-------|------|-----------|
| Global | `loom/ctx.md` | Architecture.md + `load: always` refs + active weaves/threads roster + project health |
| Weave | `loom/{weave}/ctx.md` | All threads in weave, their status, active plan summary, key decisions |
| Thread | `loom/{weave}/{thread}/ctx/` | Idea + design decisions + plan progress + open questions |

### What global ctx is NOT

- Not a duplicate of `loom/refs/architecture-reference.md` (that doc stays as the authoritative reference)
- Not a static doc — it is AI-generated and regenerated when source docs change
- Not stored in `loom/refs/` — refs are static architectural facts; ctx is dynamic AI state

### Session start protocol change

After global ctx ships, agents should read it *first* before any weave or thread work:

1. `loom/ctx.md` → overall project state  ← NEW
2. `.loom/_status.md` → active plan + last session
3. Active plan `requires_load` chain

### Stale tracking

Global ctx becomes stale when any `load: always` reference doc is updated, or when the active weave set changes significantly. `loom_get_stale_docs` should include global ctx in its check.

## Scope of changes

All layers of Loom need updating:

| Package | Change |
|---------|--------|
| `core` | Add `GlobalCtx` doc type or treat as `ctx` with `scope: global` |
| `fs` | `threadRepository` / new `globalCtxRepository` — read/write `loom/ctx.md` |
| `app` | `refreshGlobalCtx` use case (sampling-based), `getStale` checks global ctx |
| `mcp` | `loom_refresh_ctx` with no args → refreshes global ctx; `loom://state` summary field draws from global ctx |
| `vscode` | Session start hint — "global ctx is stale, refresh?" |
| `CLAUDE.md` | Session start protocol: read `loom/ctx.md` first |
| `loom/refs/architecture-reference.md` | Add `loom/ctx.md` to ctx hierarchy table and directory structure |

## Open questions

- Does global ctx get its own `type: ctx` frontmatter field with `scope: global`, or is it just a regular ctx doc at a known path?
- Should `loom mcp start` auto-refresh global ctx if stale, or leave that to the agent?
- Does global ctx include a "recently done" section (last 3 closed plans) to orient agents?
