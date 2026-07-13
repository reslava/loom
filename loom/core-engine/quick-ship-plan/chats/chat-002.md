---
type: chat
id: ch_01KXE7Q2AS84543SRY185K9E29
title: quick-ship-plan title Chat 002
status: done
created: 2026-07-13
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 1
---
# quick-ship-plan title Chat 002

## Rafa:

current loom_quick_ship has no title param, so plans generated with the tool has generice titles, no descriptives for roadmap

add a plan title param to the tool to allow descriptive titles for the plans

if all is clear and grounded:
code quick
retitle the plan properly
commit

## AI:

Done — `code quick`.

**What changed**
- `packages/app/src/quickShip.ts` — added optional `title` to `QuickShipInput`, passed through to `createPlan` (trimmed; omitted → `createPlan`'s existing `{threadSlug} Plan` fallback, unchanged).
- `packages/mcp/src/tools/quickShip.ts` — added `title` to the tool schema + `handle()` passthrough, and noted it in the tool description.
- `tests/quick-ship.test.ts` — case (a) now passes `title` and asserts the plan carries it; case (b) asserts the generic default still holds when no title is passed.

Root cause was exactly as you described: `quickShip` never forwarded a title, so `createPlan` always fell back to the generic `{threadSlug} Plan`. The param already existed on `createPlan` — this just threads it through. Parity: quick-ship is MCP-only by design (CLI + button deferred), so nothing to mirror.

Build + full suite green (23/23, all files pass).

**One caveat worth flagging:** the MCP server running in *this* session is the pre-build in-memory build, so the live `loom_quick_ship` call still dropped the new `title` arg — plan-002 was minted with the generic title, and I retitled it with `loom_retitle`. The param is real in the built code; it'll take effect on the live tool after an MCP/session restart. (Known "MCP stale after build" behaviour.)

**Retitles**
- plan-002 (the record of this work) → "Quick-ship: descriptive plan title param".
- plan-001 (this thread's plan, was the generic "quick-ship-plan Plan") → "Quick-ship one-call done-plan recorder (loom_quick_ship)".

Committing now.