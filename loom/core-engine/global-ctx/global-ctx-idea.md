---
type: idea
id: global-ctx
title: "Global Ctx — Project-Level Context Summary"
status: draft
created: 2026-04-26
version: 1
tags: [ctx, ai, core-engine, mcp]
parent_id: null
child_ids: []
requires_load: [loom-architecture]
---

# Global Ctx — Project-Level Context Summary

## Problem

Loom has per-weave and per-thread ctx docs, but no project-level summary. AI agents starting a new session have to read architecture.md + multiple weave ctx files cold to understand the overall project state. This is inefficient and easy to skip.

## Idea

Add a **global ctx** at `weaves/ctx.md` — a project-level AI-generated summary that agents read first before diving into any weave or thread work.

### 3-layer ctx hierarchy

```
weaves/ctx.md                          ← global ctx  (NEW)
weaves/{weave}/ctx.md                  ← weave ctx   (existing)
weaves/{weave}/{thread}/ctx/           ← thread ctx  (existing)
```

Each layer is self-contained but references the layer above when needed. No duplication.

### What each layer contains

| Layer | Path | Summarizes |
|-------|------|-----------|
| Global | `weaves/ctx.md` | Architecture.md + `load: always` refs + active weaves/threads roster + project health |
| Weave | `weaves/{weave}/ctx.md` | All threads in weave, their status, active plan summary, key decisions |
| Thread | `weaves/{weave}/{thread}/ctx/` | Idea + design decisions + plan progress + open questions |

### What global ctx is NOT

- Not a duplicate of `references/loom/architecture.md` (that doc stays as the authoritative reference)
- Not a static doc — it is AI-generated and regenerated when source docs change
- Not stored in `references/` — references are static architectural facts; ctx is dynamic AI state

### Session start protocol change

After global ctx ships, agents should read it *first* before any weave or thread work:

1. `weaves/ctx.md` → overall project state  ← NEW
2. `.loom/_status.md` → active plan + last session
3. Active plan `requires_load` chain

### Stale tracking

Global ctx becomes stale when any `load: always` reference doc is updated, or when the active weave set changes significantly. `loom_get_stale_docs` should include global ctx in its check.

## Scope of changes

All layers of Loom need updating:

| Package | Change |
|---------|--------|
| `core` | Add `GlobalCtx` doc type or treat as `ctx` with `scope: global` |
| `fs` | `threadRepository` / new `globalCtxRepository` — read/write `weaves/ctx.md` |
| `app` | `refreshGlobalCtx` use case (sampling-based), `getStale` checks global ctx |
| `mcp` | `loom_refresh_ctx` with no args → refreshes global ctx; `loom://state` summary field draws from global ctx |
| `vscode` | Session start hint — "global ctx is stale, refresh?" |
| `CLAUDE.md` | Session start protocol: read `weaves/ctx.md` first |
| `references/loom/architecture.md` | Add `weaves/ctx.md` to ctx hierarchy table and directory structure |

## Open questions

- Does global ctx get its own `type: ctx` frontmatter field with `scope: global`, or is it just a regular ctx doc at a known path?
- Should `loom mcp start` auto-refresh global ctx if stale, or leave that to the agent?
- Does global ctx include a "recently done" section (last 3 closed plans) to orient agents?
