---
type: chat
id: ch_01KXCA2G7GBS8JD7DQZ0EDDAVS
title: doc-graph-reports — plan-007 Chat 006
status: done
created: 2026-07-12
updated: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 8
---
# doc-graph-reports — plan-007 Chat 006

## Rafa:

I started plan-007
if plan-007 is grounded
do plan

## AI:

**Verdict: plan-007 is only *partially* grounded — I'm not running `do plan` yet.** One load-bearing premise is false against the current code, and steps 1–2 hide an unresolved architecture decision. Details, since you asked me to gate on groundedness:

**What checks out ✅**
- `treeProvider.ts:163-235` really is the refs pseudo-weave special-casing — accurate anchor.
- The `launchClaude` / `--run` agent-launch pattern exists (12 command files under `packages/vscode/src/commands/`) — step 3 is reusable as described.
- The tree has zero report/`rp_` handling today — confirmed.
- Real report docs exist to exercise this: `loom/reports/` (2) + `loom/core-engine/reports/` (2).

**The false premise ❌ (this is the blocker)**
The Goal and step 1 say top-level `loom/reports/` "renders as a **phantom 'reports' weave** with its report docs shown as Loose Fibers." It doesn't. `getState.ts:63-67` already skips `reports` explicitly — comment: *"so a top-level reports dir is never misread as a phantom weave."* And weave-scoped `reports/` is in `RESERVED_SUBDIR_NAMES` (`pathUtils.ts:8`, `weaveRepository.ts`), so it's excluded from thread discovery too. My session-start state summary confirms it: 11 weaves, `refs` present, **no `reports` weave**.

So the *actual* current behavior is simpler than the plan thinks: **reports don't appear anywhere — top-level and weave-scoped alike — because they're deliberately kept out of LoomState (storage decision A).** There is no phantom-weave/loose-fiber bug to "instead of" fix. Step 1's rationale is describing a bug that the code already prevents. The plan reads as written against an older/assumed state — stale relative to the code.

**The unresolved architecture decision (stop-rule 3)**
Because reports are *intentionally* out of LoomState, surfacing them needs a **new data path**, and steps 1–2 leave it open ("a small MCP resource/read **or an fs scan surfaced to the extension**"). That "or" isn't a free choice: the extension talks to MCP only — *all state through MCP resources, never a direct fs scan* (our own applied-learning rule). So the only architecturally-legal option is a **new MCP resource** (e.g. `loom://reports`) that lists report artifacts (cross-weave + weave-scoped). That resource doesn't exist yet (not in the catalog), and the plan doesn't carry it as a real step. This is the decision I need your call on:

- **A — add a `loom://reports` MCP resource (my recommendation).** Keeps decision A intact (reports stay out of the graph/state), respects the extension→MCP layering, gives the tree a clean read. Cost: one new resource in `mcp` + a small fs scan in `app`/`fs`, then the tree consumes it. This becomes a new step 1.
- **B — reverse decision A**, fold reports into LoomState as a first-class `reports` section like `refs`. Fewer moving parts in the extension, but it undoes a deliberate design decision (reports would re-enter state/link-index/diagnostics surfaces) — I'd argue against.

**Also:** step 4 is "manually verify in the Extension Development Host" — that needs you (a human in the EDH); I can't complete it solo.

**Recommendation:** don't `do plan` as-is. Let me *refine plan-007* first: (1) rewrite step 1 — the bug is "reports are invisible in the tree," not "phantom weave"; (2) insert the `loom://reports` MCP-resource step (pending your A/B call); (3) keep step 4 as a human checkpoint. Once refined, `do plan` is safe to run. Which way on A vs B?

## Rafa:

Agree all your recommendations, including A — add a `loom://reports` MCP resource

## AI:

Done — plan-007 refined (A applied, false premise removed, Goal prose fixed). New shape, 5 steps:

1. **`loom://reports` MCP resource** *(fs/app/mcp + tests)* — a scanner over top-level `loom/reports/` + each `loom/{weave}/reports/`, returning `{ id, title, kind, weaveSlug|null, generated_at, filePath }` as JSON. Reports stay out of LoomState (decision A intact); this is the single read the tree consumes. — *no blockers*
2. **Cross-weave Reports node** — a dedicated **Reports** node (sibling to Refs), sourced from `loom://reports`, read-only/click-to-open. Premise fixed: no phantom weave (getState.ts:63-67 already excludes it) — the real gap is invisibility. — *blocked by 1*
3. **Weave-scoped Reports subsection** — under each weave, from `loom://reports` filtered by weaveSlug; dropped the "fs scan in the extension" option (breaks extension→MCP layering). — *blocked by 1, 2*
4. **Generate-report action** — command-palette + Reports-node button, launches a Claude agent (launchClaude/`--run`) pre-allowing `loom_create_report`, refreshes the tree. — *blocked by 1, 2*
5. **build-all + test-all, then EDH verify** — the manual Extension-Development-Host check is **yours** (I can't drive the EDH); everything above I can implement + build/test. — *blocked by 2, 3, 4*

Steps 1–4 are fully implementable by me in one `do plan` run; step 5 hands off to you for the EDH check. Since this is a materially rewritten plan (new backend surface at step 1), I'm pausing once here so you can eyeball it before I start coding.

Say `go` / `do plan` and I'll run 1→4 straight through, then hand you step 5.

## AI:

`do plan` complete for the codeable half — steps 1–4 ✅, step 5 build+test ✅, EDH verify handed to you.

**Steps 1–4 (all ✅):**
1. **`loom://reports` MCP resource** — `packages/app/src/listReports.ts` (read twin of `createReport`) scans `loom/reports/` + `loom/{weave}/reports/` → `{ id, title, kind, weaveSlug, generated_at, filePath }`, newest-first; `packages/mcp/src/resources/reports.ts` + server wiring expose it (auto-listed in `loom://catalog`). Reports stay out of LoomState (decision A). New `tests/reports-resource.test.ts`.
2. **Cross-weave Reports node** — a `Reports` node sibling to Refs, sourced from `loom://reports`, read-only/click-to-open (`graph` icon). No phantom-weave hack.
3. **Weave-scoped Reports subsection** — under each weave, from the same resource filtered by weaveSlug; one fetch/refresh stashed on an instance field (mirrors `this.state`), no extension fs scan.
4. **Generate Report action** — palette command + inline button on any Reports node; QuickPick of kinds (from core's `reportKindSlugs()`), optional weave/thread; launches a Claude agent that drives the `report` prompt → `loom_create_report`; info message with a Refresh action.

**Step 5:** `build-all` clean, `test-all` green (incl. the new test; MCP integration 23/23). The **manual Extension-Development-Host checks are yours** (I can't drive the EDH) — the 4 checks are listed in the done doc. Confirm them and I'll mark step 5 ✅.

Nothing committed (you didn't ask). Say `commit` when you want it staged, or run the EDH checks first.

## Rafa:

Extension check:

1. ok
2. ok
3. clicking a report opens the file, but I could write, not read-only 
4. i generated report: `loom/core-engine/reports/Core Engine Ideas — What Loom Set Out to Build (2026-07-13) - ideas report.md`

## AI:

Good — 1, 2 pass and **4 is the big one**: the Generate Report action worked end-to-end and saved a *weave-scoped* report under `core-engine/reports/`. That also validates step 3 — after a tree Refresh it should show under **core-engine → Reports**. Nice.

**On 3 — you're right, that's a real gap.** Reports are immutable snapshots by design (regeneration mints a new dated report; there's no in-place edit — and the mcp-gate already blocks the *AI* from editing loom docs). A human being able to freely edit a snapshot in the editor contradicts that. I under-read "read-only" as "no mutate buttons + click-to-open like other docs" — but the file itself should open read-only.

**Fix (just shipped):** rather than a tree-click-only trick, I declared the report paths read-only in the manifest so they're protected *however* you open them (tree, Ctrl+P, search) — `contributes.configurationDefaults` → `files.readonlyInclude` for `**/loom/reports/**` and `**/loom/*/reports/**`. Reports now open with the editor's read-only lock; `loom_create_report` still writes fine (it goes through the fs, not the editor), so regeneration is unaffected.

It's a `package.json`-only change (no bundle rebuild needed), so: **Reload Window** in the EDH, open a report, confirm it's now read-only (you'll see the lock / "cannot edit in read-only editor"). If good, that closes step 5 and I'll mark it ✅.

Still nothing committed.

## Rafa:

Reports are read only
mark step 5 done
commit

## AI:

All four EDH checks pass — step 5 ✅, so **plan-007 is done** (auto-closed). Committing now.

The commit covers the whole Group D feature: the `loom://reports` resource (app `listReports` + mcp resource + server wiring + test), the cross-weave Reports node and weave-scoped subsection in the tree, the Generate Report command (+ palette/menu contribution), the read-only manifest default, and the plan/done docs. Scoped to just this feature — I'm leaving the unrelated `core-engine/ctx-surface-parity/` working files untouched.