---
type: done
id: pl_01KXC3SBTYSNVKK0J326V1GM7J-done
title: Done — Reports in the extension (Group D) — Reports tree node + generate action
status: done
created: 2026-07-13
version: 6
tags: []
parent_id: pl_01KXC3SBTYSNVKK0J326V1GM7J
requires_load: []
---
# Done — Reports in the extension (Group D) — Reports tree node + generate action

## Step 1 — Add a `loom://reports` MCP resource that lists report artifacts WITHOUT adding them to LoomState (storage decision A stays intact — reports remain out of the graph/link-index/diagnostics). app/fs: a small scanner over top-level `loom/reports/` (cross-weave) and each `loom/{weave}/reports/` (weave-scoped), returning per report `{ id (rp_ ULID), title, kind, weaveSlug|null, generated_at, filePath }`. mcp: register the resource returning that list as JSON. This is the SINGLE read the extension tree consumes — the extension never fs-scans loom docs directly (all state via MCP resources). Add a tests/ test exercising the scanner against the existing reports on disk.

Added the `loom://reports` MCP resource — the single read path that surfaces report artifacts to the extension (reports stay out of LoomState per storage decision A).

- **`packages/app/src/listReports.ts`** (new) — read twin of `createReport`. `listReports(deps)` scans `loom/reports/` (cross-weave, `weaveSlug: null`) and each `loom/{weave}/reports/` (weave-scoped, `weaveSlug: <slug>`), returns `ReportSummary[] = { id, title, kind, weaveSlug, generated_at, filePath }`. Filters to `type: report`, skips malformed/unreadable docs, skips `reports`/`.archive` dirs when enumerating weaves, orders newest-first by `generated_at` (title tiebreak). Pure read; IO via injected `deps.fs` + `loadDoc` from fs (app→fs layering intact).
- **`packages/mcp/src/resources/reports.ts`** (new) — thin `handleReportsResource(root, uri)` calling `listReports`, returns `{ reports }` JSON. Mirrors `handleRefsResource`.
- **`packages/mcp/src/server.ts`** — imported the handler, added `loom://reports` to `CONCRETE_RESOURCES` (so it auto-appears in `loom://catalog`), and added the `uri === 'loom://reports'` read branch.
- **`tests/reports-resource.test.ts`** (new) + wired into `scripts/test-all.sh` — builds a temp loom with 2 cross-weave + 1 weave-scoped report plus non-report noise; asserts count=3, newest-first order, `weaveSlug` null vs slug, metadata passthrough, and that non-report markdown is ignored.

Decision: kept the scanner in app (twin of `createReport`) rather than inline in the mcp handler, so report read+write are symmetric and the extension consumes one MCP resource — no direct fs scan. Build/test deferred to step 5 per the plan.

## Step 2 — Render cross-weave reports (top-level `loom/reports/`) under a dedicated **Reports** node, sibling to the Refs node, mirroring the refs section in treeProvider.ts:216-235. Source the docs from the new `loom://reports` resource — NOT from LoomState. (Note: there is no phantom 'reports' weave to fix — getState.ts:63-67 already excludes `loom/reports/` from state so it is never misread as a weave; the real gap is simply that reports are invisible in the tree.) Render each report as a read-only, click-to-open TreeItem with a 'graph'/'output' icon.

Added a dedicated cross-weave **Reports** node to the tree, sibling to Refs, sourced from `loom://reports` (not LoomState). All in `packages/vscode/src/tree/treeProvider.ts`:

- **`ReportInfo` interface** — shape of a report from the `loom://reports` resource (`id, title, kind, weaveSlug, generated_at, filePath`); explicitly NOT a LoomState `Document`.
- **`readReports()`** — best-effort MCP read of `loom://reports` via `getMCP(root).readResource`, parses `{ reports }`; on failure returns `[]` so the rest of the tree still renders (mirrors the state-read error posture).
- **`createReportsSection(reports, weaveSlug?)`** — a `Reports` TreeItem (contextValue `reports-section`, `graph` icon) whose children are report nodes; preserves the resource's newest-first order.
- **`createReportNode(report)`** — a read-only, click-to-open node (`vscode.open` on `filePath`), `graph` icon, description = kind, tooltip = kind + generated_at. No mutate/menu commands (read-only display).
- **`getRootChildren`** — after the Refs block, fetch reports and push a `Reports` node built from the cross-weave subset (`weaveSlug === null`); shown only when at least one cross-weave report exists.

Note recorded in code comments: there is no phantom 'reports' weave to fix (getState.ts:63-67 already excludes loom/reports/); this step fills the pure-absence gap. Weave-scoped reports are step 3 (will reuse the same `readReports()` fetch, hoisted up). Build/test at step 5.

## Step 3 — Render weave-scoped reports (`loom/{weave}/reports/`) under their weave as a **Reports** subsection (mirror createRefsSection). Source them from the `loom://reports` resource filtered by weaveSlug — never a direct fs scan in the extension (that violates the extension→MCP-only layering; all state through MCP resources). Read-only, click-to-open.

Rendered weave-scoped reports (`loom/{weave}/reports/`) under their weave as a **Reports** subsection, sourced from `loom://reports` filtered by weaveSlug — no extension fs scan. All in `packages/vscode/src/tree/treeProvider.ts`:

- **`weaveScopedReports: Map<string, ReportInfo[]>` field** — weave-scoped reports keyed by weave slug, populated once per refresh; read by the *synchronous* weave-node builders (same pattern as `this.state` feeding sync helpers, since `getWeaveChildren` can't be async).
- **Hoisted the fetch** — `readReports()` now runs once in `getRootChildren` *before* `groupWeaves`, populating `weaveScopedReports` (weave-scoped entries) and a local `allReports`. The cross-weave Reports node (step 2) now reuses `allReports` instead of re-reading the resource — single fetch per refresh.
- **`getWeaveChildren`** — after the Refs subsection, pushes a `Reports` subsection built from `this.weaveScopedReports.get(weave.id)` when non-empty (reuses `createReportsSection`).

Decision: instance-field-over-refresh rather than threading a reports param through `groupWeaves → createWeaveNode → getWeaveChildren` — matches the existing `this.state` convention and avoids widening three sync signatures. Consistent placement: reports show in the normal tree view alongside Refs/Ctx; like those, they don't appear in the roadmap-view early-return path (acceptable — reports are a normal-view concern). Build/test at step 5.

## Step 4 — Add a Generate-report command (command palette + a menu/button on the Reports node) that prompts for kind (and optional weave/thread/filters) and launches a Claude agent to synthesize + save the report end-to-end — reuse the --run / launchClaude agent-launch pattern (packages/vscode/src/commands/*), pre-allowing loom_create_report. Refresh the tree on completion so the new report appears.

Added a **Generate Report** command (palette + inline button on any Reports node) that launches a Claude agent to synthesize + persist a report.

- **`packages/vscode/src/commands/generateReport.ts`** (new) — mirrors the `createReference` launchClaude pattern. QuickPick of report kinds driven by core's `reportKindSlugs()`/`getReportKind()` (drift-free vs the `report` prompt's validation), optional weave + thread input boxes (thread only offered when a weave is given; a weave-scoped Reports node pre-fills its weave, the cross-weave node's 'reports' sentinel = no filter). Builds a launch prompt telling the agent to: (1) call the `report` MCP prompt with kind/weave/thread, (2) synthesize the markdown from ONLY the returned slice, (3) persist via `loom_create_report` — with explicit "don't hand-write files, don't call loom_generate_* (sampling unavailable)". After launch, shows an info message with a **Refresh** action (the agent writes async in the terminal, so completion can't be hooked — one-click reveal).
- **`packages/vscode/src/extension.ts`** — imported `generateReportCommand`, registered `loom.generateReport` (passes the clicked `node`).
- **`packages/vscode/package.json`** — added the `loom.generateReport` command contribution (title "Generate Report", `$(graph)` icon, Loom category → appears in the palette) and a `view/item/context` inline menu entry gated on `viewItem == reports-section` (button on both cross-weave and weave-scoped Reports nodes).

Decision: pre-allowing `loom_create_report` — the launched agent binds the bundled server and this is a normal write tool the agent calls itself; no extra allow-list plumbing exists in the launchClaude path (other generate/refine launches rely on the same), so the prompt just instructs the tool call. Refresh-on-completion is a user-triggered Refresh action rather than a fake timer, since terminal completion isn't observable. Build/test is step 5.

## Step 5 — Run build-all + test-all. Then manually verify in the Extension Development Host: cross-weave reports appear under the Reports node (no phantom 'reports' weave), weave-scoped reports appear under their weave, click opens the file read-only, and the Generate-report action produces a saved report that shows up after refresh.

**Build + test PASSED, EDH verification PASSED (Rafa).**

- `./scripts/build-all.sh` clean (extension bundle + all packages compile); `./scripts/test-all.sh` green incl. the new `tests/reports-resource.test.ts`; MCP integration 23/23.
- EDH checks by Rafa: (1) cross-weave Reports node ✅ — no phantom 'reports' weave; (2) weave-scoped Reports subsection ✅; (4) Generate Report action ✅ — produced a real weave-scoped report at `loom/core-engine/reports/Core Engine Ideas — What Loom Set Out to Build (2026-07-13) - ideas report.md`.
- (3) **read-only:** first pass opened reports editable — a gap vs snapshot immutability. Fixed by declaring report paths read-only in the extension manifest (`contributes.configurationDefaults` → `files.readonlyInclude` for `**/loom/reports/**` and `**/loom/*/reports/**`), so reports open read-only however opened (tree / quick-open / search), while `loom_create_report` still writes via fs (regeneration unaffected). Re-verified in EDH after Reload Window — read-only now works. ✅

Plan complete (auto-closed to done).
