---
type: chat
id: ch_01KV3YGHMT3VMFR5VEMNW17BDT
title: group pending active
status: done
created: 2026-06-14
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 5
---
# group pending active

## Rafa:

Extension roadmap should present Future (pending) and Present (active) grouped under same tree node, so users can sort all of them.

For example, some active thread with Phase 1 done is waiting another pending thread to be done for Phase 2, but having them under different tree nodes do not let sort them properly by drag & priority.

## AI:

Agree, and the reason is in the data model, not just the UX. Splitting **Present** and **Future** into two sibling tree nodes invents a drag barrier that doesn't exist in the underlying data:

- The authored input is **one `priority` per thread**, and the order is **one topo+priority sequence**. The active-vs-pending split is a *derived status overlay*, not an ordering boundary. Rendering it as two nodes makes the renderer disagree with the read-model.
- Your example is the proof: a pending thread that blocks an active thread's Phase 2. The whole point of the roadmap is placing those two relative to each other — and a per-node drag space makes that impossible. (If the active thread `depends_on` the pending one, the topo sort already *wants* the pending one ordered first; today you can't drag to express that.)
- We already named the concept — Step 3's filter has a **"Roadmap (future+present)"** value. This just promotes that combined view from a filter option to the actual tree grouping.

**Vision link:** serves "both User and AI always know weaves/threads state" — removes the manual limitation of not being able to order the whole forward backlog as one list.

So the shape I'd build: two top-level nodes — **Roadmap** (present+future, one drag-orderable list) and **History** (past, immutable, not part of the backlog). Status stays legible per-row: every node already shows its status icon + `pN` + the `⛔ blocked on` annotation, so merging the band loses **no** information — it only removes the barrier.

One real decision before I touch code (Rule 3):

**Where the unified order lives.** `buildRoadmap` today returns separate `future[]` and `present[]` arrays — the split is baked into the *read-model*, not just the renderer. To drag across the boundary cleanly:

- **(A)** Add a combined ordered field to `RoadmapView` (e.g. `roadmap: RoadmapNode[]` = present+future in one topo+priority order); keep `future`/`present` as derived views for anything that still wants bands. Hard logic stays in `core`; CLI and extension both render the same single order. ← **lean** (matches "thin renderers over the read-model").
- **(B)** Leave the read-model as-is and have the extension concatenate `present`+`future` and re-sort by (topo index, priority) at render time. Less core change, but the ordering logic moves into the renderer — exactly the derivation the design says belongs in `core`, and the CLI wouldn't benefit.

**Smaller, related:** does the CLI `loom roadmap` follow (collapse its Future/Present bands into one **Roadmap** band) or stay three-band? I lean **follow** — one model, one rendering shape everywhere — but it's a visible CLI change, so flagging it.

I'd also *not* add a collapsible Present/Future sub-split inside the merged node — that would re-introduce the exact drag barrier you're removing. Status icons carry that signal per-row instead.

Which way on the read-model (A/B), and should the CLI follow?

## Rafa:

A, and CLI follows

## AI:

Locked: **(A)** unified order in the read-model, **CLI follows**.

The change, end to end:

- **core/derived.ts** — `buildRoadmap` gains the canonical forward list `roadmap: RoadmapNode[]` (present+future in one topo+priority order, each node carrying its `status` + `blockedOn`). History unchanged. I'd **drop** the separate `future` / `present` fields rather than keep them — every consumer moves to `roadmap` + per-node status, so retaining them is exactly the dead-weight we don't want. (Flagging since it's a read-model shape change; say so if you'd rather keep them.)
- **cli `loom roadmap`** — collapse Future/Present into one **Roadmap** band over `roadmap[]`, `⛔ blocked on` per row, History below. `--group-by-thread` (history) unchanged.
- **vscode** — merge the two sections into one **Roadmap** node; drag-reorder now spans the whole list. The `depends_on` pre-check generalizes for free — it already refuses any drop that lands a thread before a dependency, regardless of status. The existing **All / Roadmap / History** filter now maps Roadmap → the single node.
- **tests** — derived unit tests for the combined ordering + CLI output, plus the existing roadmap tests updated off the old `future`/`present` fields.
- **docs/refs** — USER_GUIDE / EXTENSION_USER_GUIDE / CLI_USER_GUIDE and the cli/vscode reference docs that currently describe three bands.

Since this changes the `RoadmapView` shape and the rendering the design specifies (§2, §5–6), the clean path is a small **design refine** to record the merged-node model, then a **Plan-3** in this thread to implement it.

Want me to do that — refine the design + create Plan-3 — or skip the ceremony and implement directly on `main`?

## AI:

Done — design refined, Plan-3 created.

**Design** (`roadmap-design.md`, refined in place via MCP — sampling is blocked in a Claude Code session, so this is the sanctioned "edit + write" path, not `loom_refine_design`):
- §2 `RoadmapView` — `future[]`/`present[]` replaced by one canonical `roadmap: RoadmapNode[]`; Order bullet now states status is per-node, never an ordering boundary.
- §5 CLI — three-band → two-band (**Roadmap** + **History**).
- §6 — added **Plan-3** to the build phases.
- New **Resolved decision (2026-06-14 — one orderable Roadmap node)** capturing (A) + CLI-follows and why.

**Plan-3 — `roadmap-plan-003.md`** (status `active`, 4 steps):
1. `core/derived.ts` — unified `roadmap[]` + unit tests · *IN3, C3, C5*
2. CLI `loom roadmap` — one Roadmap band · *IN7* · blocked by 1
3. Extension — merge into one Roadmap tree node, drag spans the list · *IN8, IN9, IN10* · blocked by 1
4. Docs + refs · *IN7, IN8* · blocked by 2, 3

**One finding to decide — req drift.** The locked req still enumerates the old layout: `IN7` "future / present / history renderer", `IN8` "panel (future / present / history bands)", `IN9` "all / history / roadmap". After this merge those wordings are stale. The clean fix is a small append-only `loom_amend_req` (re-opens to draft → re-`loom_finalize_req`) restating IN7–IN9 as the merged Roadmap + History model, so `loom_verify_req` stays honest. Want me to amend + re-lock the req as well, or leave it?

Plan-3 is `active`, not started. Say `go` and I'll `loom_start_plan` then implement step 1 (the read-model is the headline + everything else depends on it).

## AI:

**Plan-3 (Merge Present+Future) is done — all 4 steps ✅, plan auto-finished.**

What shipped:
1. **Read-model** — `buildRoadmap` now returns one canonical `roadmap: RoadmapNode[]` (present+future, single topo+priority order); `future`/`present` dropped. The combined order already existed inside `topoOrder`; the old fields just discarded the interleaving. +unit test proving a lower-priority *pending* thread sorts before a higher-priority *active* one.
2. **CLI** — `loom roadmap` prints one **ROADMAP** band + History; verified live against this repo.
3. **Extension** — one **Roadmap** tree node; drag-reorder spans the whole list, so you can finally drop a pending blocker right next to the active thread waiting on it. The hard `depends_on` pre-check still refuses an illegal drop. Filter `all/roadmap/history` unchanged.
4. **Docs** — USER_GUIDE / CLI_USER_GUIDE / EXTENSION_USER_GUIDE + cli/vscode reference docs updated from three bands → Roadmap + History.

Also: design refined in place, and the locked **req** amended (IN7–IN9 reworded to the merged model) + re-locked, append-only.

**Verified:** `build-all` clean (incl. vscode type-check) · `test-all` green (multi-loom + 17 MCP integration). The panel/drag visuals still want a manual **Reload Window** (or `npm run package` + install) to eyeball — automated tests don't render VS Code trees.

Nothing committed yet (working tree). Like Plan-2, this is a user-visible change. Want me to **commit + bump + release** (this'd be 1.9.0, lockstep), or do the Reload-Window eyeball first? And do you want a CLI `loom roadmap` output test added (none exists today)?