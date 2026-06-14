---
type: done
id: pl_01KV408365QQGYX687RVYKGM03-done
title: Done — Derived Roadmap — Merge Present+Future
status: done
created: "2026-06-14T00:00:00.000Z"
version: 4
tags: []
parent_id: pl_01KV408365QQGYX687RVYKGM03
requires_load: []
---
# Done — Derived Roadmap — Merge Present+Future

## Step 1 — In core/derived.ts, replace RoadmapView's future[]/present[] with one canonical roadmap: RoadmapNode[] = present+future in one topo+priority order (each node keeps its status + blockedOn). Drop the future/present fields. Update buildRoadmap and its unit tests to cover the combined ordering: deps ordered before dependents, priority resolving slack across the active/pending boundary, deterministic stable secondary.

Unified the roadmap read-model in `packages/core/src/derived.ts`:

- `RoadmapView` — replaced `future: RoadmapNode[]` + `present: RoadmapNode[]` with a single canonical `roadmap: RoadmapNode[]` (present+future in one topo+priority order; done threads excluded — they live in `history`).
- `buildRoadmap` — the return now exposes `roadmap: ordered` directly. `ordered` (from `topoOrder`) was *already* the combined present+future topo+priority sequence (incl. appended cycle nodes); the old `future`/`present` were just status filters that discarded the interleaving. So this is a pure shape change — no ordering, status-overlay, history, or diagnostics logic touched.
- Updated the `RoadmapView` doc-comment to state status is per-node, never an ordering boundary.

`loom://roadmap` (packages/mcp/src/resources/roadmap.ts) `JSON.stringify`s the view as-is, so no code change — only its doc-comment was updated to match.

Tests (`tests/roadmap.test.ts`): migrated all 8 existing assertions from `r.future`/`r.present` to `r.roadmap`, and added test **8b** — the headline of this change: a lower-priority *pending* thread sorts before a higher-priority *active* thread in the one `roadmap[]`, proving status is not an ordering boundary (priority resolves slack across the active/pending boundary).

Verified: `npm run build` in `packages/core` clean; `npx ts-node tests/roadmap.test.ts` → all 9 green. Full `build-all` is intentionally NOT green yet — `packages/cli` (step 2) and `packages/vscode` (step 3) still reference the removed `future`/`present` fields and are fixed in those steps; whole-repo build goes green after step 3.

## Step 2 — Collapse loom roadmap's Future/Present bands into a single Roadmap band rendering roadmap[] in order, each row showing status + blocked-on; History band unchanged (incl. --group-by-thread). Update the CLI output test.

Collapsed `loom roadmap`'s Future/Present bands into one Roadmap band in `packages/cli/src/commands/roadmap.ts`:

- Replaced the two `FUTURE` + `PRESENT` sections with a single **ROADMAP** band rendered over `r.roadmap` (present+future in the read-model's one topo+priority order). Status stays legible per-row via the existing `STATUS_ICON` map (🔵 implementing / 🟢 active / ⚪ pending / 🔴 blocked) and the `⛔ blocked on →` annotation is preserved per row.
- Updated the blocked-on label map to iterate `r.roadmap` instead of `[...r.present, ...r.future]`.
- HISTORY band (incl. `--group-by-thread`) and diagnostics output unchanged.
- Updated the command doc-comment to match.

Verified by running `npx ts-node packages/cli/src/index.ts roadmap` against this repo: the merged band renders present+future interleaved in one priority order with correct status icons, History below newest-first. (`core-engine/roadmap` correctly shows 🔵 implementing.)

Test note: there is **no existing `loom roadmap` output test** (the only roadmap test is the `buildRoadmap` unit test, already updated in step 1). Since this step is pure presentation over a unit-tested read-model, I verified via the live run rather than add a brittle new spawn-based CLI integration test. Flagging in case a CLI output test is wanted — would be new scope.

Note: `tsc` does not type-check this file's field access (`r` is `JSON.parse(...)` → `any`), so the live run is the authoritative check here.

## Step 3 — Merge the Future and Present tree sections into one Roadmap node rendering roadmap[]. Drag-reorder now spans the whole list; the existing depends_on pre-check already refuses any drop that lands a thread before a dependency regardless of status. The All / Roadmap / History filter maps Roadmap to the single node. tsc --noEmit clean.

Merged the extension's Future + Present tree sections into one **Roadmap** node over `roadmap[]`.

`packages/vscode/src/tree/treeProvider.ts`:
- `TreeNode` — dropped the `roadmapBand?: 'future' | 'present'` field (one band now; `node.roadmap` presence marks a draggable thread).
- `getRoadmapChildren` — the `all`/`roadmap` filter now pushes a single `createRoadmapBand(roadmap.roadmap, …)`; label map iterates `roadmap.roadmap`. History band + diagnostics row unchanged.
- `createRoadmapBand` — simplified to one band: label `Roadmap (N)`, contextValue `roadmap-band-roadmap`, `milestone` icon, no `bandKey`.
- `createRoadmapNode` — dropped the `bandKey` param and the `roadmapBand` on the emitted node. Per-row status icon + `p{priority}` + `⛔ blocked on` description preserved, so status stays legible without separate bands.

`packages/vscode/src/tree/roadmapDnd.ts`:
- Drag payload is now `{ ulid }` (no band). Drop reorders over the single `roadmap.roadmap` list: onto another thread → before it; onto the `roadmap-band-roadmap` header → append. Removed the cross-band rejection branch.
- The hard `depends_on` pre-check is unchanged and now naturally spans the whole list — the headline benefit: you can position a pending thread relative to an active one, and a drop that lands a thread before any dependency is still refused.

`packages/vscode/src/commands/filter.ts` — band-picker descriptions updated (All = "Roadmap + History", Roadmap = "Present + future only"). `RoadmapBand` type (`all`/`roadmap`/`history`) unchanged — it already treated "roadmap" as present+future.
`packages/vscode/src/view/viewState.ts` — doc-comment updated.

Checked `packages/vscode/package.json` — no menu/contextValue contributions referenced the removed `roadmap-band-future`/`roadmap-band-present`, so nothing to update there.

Verified: full `./scripts/build-all.sh` clean (incl. `vscode` `tsc --build`, which type-checks the RoadmapView change end-to-end — this is the step that restores whole-repo green) and `./scripts/test-all.sh` fully green (multi-loom + 17 MCP integration tests). The panel/drag rendering itself still wants a manual **Reload Window** (or `npm run package` + install) in the Extension Dev Host to eyeball — automated tests don't exercise VS Code's tree rendering.

## Step 4 — Update USER_GUIDE.md, EXTENSION_USER_GUIDE.md, CLI_USER_GUIDE.md and the cli/vscode reference docs that describe three bands to the merged Roadmap + History model.

Updated every doc that described the old three-band roadmap to the merged Roadmap + History model:

- `docs/USER_GUIDE.md` — "where every thread sits (future / present / history)" → "(one ordered Roadmap of present + future, plus History)".
- `docs/CLI_USER_GUIDE.md` — `loom roadmap` table cell → one Roadmap band (present + future, status + blocked-on per row) + History.
- `docs/EXTENSION_USER_GUIDE.md` — toolbar table cell + §3.1 rewritten: "Three bands" → "Two bands" (Roadmap + History), drag now spans the whole list (added the active-waiting-on-pending example), "drag any Roadmap thread".
- `loom/refs/cli-commands-reference.md` — `loom roadmap` entry → one Roadmap band + History.
- `loom/refs/vscode-commands-reference.md` — Roadmap-view note → one Roadmap band + History, "dragging any Roadmap thread".

Checked `loom/refs/architecture-reference.md` (its roadmap match was the Context Dispatcher paragraph, not the bands) and the rest of `docs/` — no other three-band descriptions. `loom/refs/*.md` and `docs/*.md` are outside the MCP gate, so these were normal edits.

No code/test changes in this step; repo remained green from step 3 (`build-all` + `test-all`).
