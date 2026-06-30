---
type: done
id: pl_01KWDB9R8XRCF7KDRMP81S5BGR-done
title: Done — Cheap, scoped session start — plan
status: done
created: 2026-06-30
version: 5
tags: []
parent_id: pl_01KWDB9R8XRCF7KDRMP81S5BGR
requires_load: []
---
# Done — Cheap, scoped session start — plan

## Step 1 — Remove the parsed-but-unused threadId param and its 'threadId requires weaveId' validation from the state resource handler.

Removed the dead `threadId` handling from `packages/mcp/src/resources/state.ts`: deleted the `url.searchParams.get('threadId')` parse and the `if (threadId && !weaveId) throw` validation block. `threadId` was parsed and validated but never applied to `weaveFilter` (built from `weaveId` + `status` only), so it was inert. No consumer needs thread-scoped structured state — `do-next-step` (next step + status) and `loom://context/thread/{weave}/{thread}` (content bundle) cover the pointed-thread need.

## Step 2 — Add a pure toStateSummary(state) helper in core that projects LoomState to the summary shape (weave/thread skeleton + status + activePlanId + pendingStepCount + stale + summary counts), plus a unit test.

Added `packages/core/src/stateSummary.ts` exposing `toStateSummary(state): StateSummary` — a pure projection of an already-computed `LoomState` into the session-start map. Per thread: `id`, `title` (manifest → idea → id fallback, mirroring `buildRoadmap`), `status` (`getThreadStatus` lowercased), `priority` (`manifest.priority` ?? `DEFAULT_ROADMAP_PRIORITY`), `activePlanId` (the `implementing` plan, else null), `pendingStepCount` (active plan's steps minus done/cancelled), `stale` (bool from `thread.stale`). Per weave: `id` + `getWeaveStatus`. Top-level carries `mode`, `loomName`, `generatedAt`, and the four chosen `summary` counts (totalWeaves, totalPlans, stalePlans, blockedSteps). Excludes steps, dones, chats, refDocs, allDocs, content, index. Exported `toStateSummary` + the `StateSummary`/`WeaveSummary`/`ThreadSummary` types from `packages/core/src/index.ts`. Added `tests/state-summary.test.ts` (6 cases: active-plan/pending count, no-active-plan null/0, title fallback chain, stale flag + default priority, carried counts, and a no-body-leak assertion) and registered it in `scripts/test-all.sh`.

## Step 3 — Add the shape=summary query param to loom://state: when present, return toStateSummary(state) serialized compactly (no indent). Add an MCP integration assertion that the summary read is small and omits step bodies.

Wired `shape=summary` into `packages/mcp/src/resources/state.ts`. Refactored the handler to resolve the full state once (cached for unfiltered reads, recomputed for filtered) and then branch on serialization: `shape=summary` → `JSON.stringify(toStateSummary(state))` (compact — indentation was ~28% of the full payload), otherwise the existing pretty-printed, content-stripped full shape. `shape` does not affect caching (it only changes serialization), so a bare `loom://state?shape=summary` still hits the tree's cache. The refactor also collapsed the duplicated cache-return branch into a single resolve-then-serialize path and added `shape=` to the stderr telemetry line. Added integration assertion (b1) in `packages/mcp/tests/integration.test.ts`: summary is a weave/thread skeleton with status/activePlanId/pendingStepCount, omits steps/plans/allDocs, leaks no step fields, and is smaller than the full payload.

## Step 4 — Update the session-start protocol in root CLAUDE.md and the LOOM_CLAUDE_MD template to the 5-step path (ctx → vision/workflow → catalog → state?shape=summary → pointed do-next-step/context-thread), keeping rule: markers aligned so claude-md-sync passes.

Rewrote the session-start protocol in both sync-enforced surfaces — root `CLAUDE.md` (rule:session-start, steps 4–5) and the `LOOM_CLAUDE_MD` template in `packages/app/src/installWorkspace.ts` (steps 3–4). The old "Read active work — loom://state?status=active,implementing" step becomes "Load the project map — loom://state?shape=summary" (the cheap KB skeleton, explicitly never the full ~2 MB graph at session start), emitting `📡 MCP: loom://state?shape=summary` + the `🧵 Active:` line. Added the scoped-deep-load step: when the user points at a chat/doc/thread, that pointer is the active-thread signal — load only that thread via do-next-step / context/thread, not other threads; with no pointer, pick from the map. Rule markers kept aligned and no verbatim-invariant token touched, so tests/claude-md-sync.test.ts stays green.

## Step 5 — Render loom status from the same toStateSummary projection so the CLI is the human view of the session-start map.

Wired `loom status`' list view (no weave-id) to render from `toStateSummary(state)` — the human view of the same projection `loom://state?shape=summary` serves. Each weave now prints its threads with status, active-plan pending-step count (`▶ N pending`), and a `stale` flag, instead of the old bare weave-name + status line. Directly addresses Rafa's "loom status shows very short info" complaint. The per-weave (`loom status <weave>`) and `--json` branches are untouched, so `tests/commands.test.ts` (asserts `status <weave> --verbose` shows step progress) stays green. Verified live: `loom://state?shape=summary` = 16,845 bytes vs the full filtered state at 2,039,372 bytes — a 121× reduction — and `loom status` renders the thread map.
