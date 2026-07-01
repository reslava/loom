---
type: chat
id: ch_01KV3NFS4DHC6ERP7QF5F97YFZ
title: Phase 2 - Extension Surface
status: done
created: "2026-06-14T00:00:00.000Z"
updated: "2026-06-14T00:00:00.000Z"
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 8
---
# Phase 2 - Extension Surface

## Rafa:

plan roadmap-plan-002.md is started
check if feature group/display roadmap history by thread is taken into account
if not, include it

do whole plan
stop if you fall in an error loop or have any question design decision to make


## AI:

**On "group/display roadmap history by thread" — partially there, weakly.** It appears only in Step 2's *prose* ("history … group-by-thread"), not in the step's structured `description`, with no dedicated step and no req handle (`IN8` is just "future/present/history bands"). The read-model already gives it for free: `loom://roadmap`'s `history` is a flat `ShippedPlan[]` where each entry carries `weaveId`/`threadId`, and Plan-1's CLI already groups on `weave/thread` via `--group-by-thread`. So grouping is **pure rendering — no read-model change**. Since it isn't first-class in Plan-2, per your "include it" I'll make it explicit.

Before I run the whole plan, two decisions (both Rule-3). The extension is a **TreeView** today — no webview — so "panel" is ambiguous, and the choice shapes all of steps 1–5:

**1. How to render the roadmap "panel":**
- **(A) Re-layout the existing TreeView** into three top-level bands — Future / Present / History — when the Roadmap toggle is on, reading `loom://roadmap` and reusing `createSectionNode`, the (to-be-added) drag-drop controller, and the filter. Thin renderer, consistent with everything here. ← **strong lean**
- (B) A new **Webview** panel — richer custom layout, but heavy new infra, duplicate state plumbing, harder to test. The design itself says "thin renderer over the read-model," which is (A).

**2. How to include group-by-thread:**
- **(a)** Add it as an explicit **Step 5** — "History band groups by thread via a toggle (default flat newest-first; mirrors the CLI's `--group-by-thread`)" — so it gets its own ✅ + done note and a req citation. ← lean
- (b) Fold it into Step 2's history-band rendering (works, but not separately tracked).
- UX either way: an **opt-in toggle** (default flat newest-first, matching the CLI) vs always-grouped.

**Heads-up:** Plan-2 is flagged **stale** (design v4 > plan's `design_version` 1), but the plan content still matches the current design, so I don't think a refine is needed — just flagging it.

**On your `go`** (with A + 5a-toggle, or your picks): I'll make the plan edits via the step tools (amend Step 2 / add Step 5), then implement 1→5 end-to-end — toolbar toggle → bands re-layout → filter fold → group-by-thread toggle → drag-reorder — building with `build-all`, stopping only on an error loop or a new decision.

Which way on 1 and 2?

## Rafa:

1. Briefly explain why B have a `richer custom layout, but heavy new infra, duplicate state plumbing, harder to test`
2. (a)

## AI:

Noted **2 → (a)**: group-by-thread becomes an explicit Step 5 with an opt-in toggle.

**1 — why a Webview (B) is "richer layout but heavy", grounded in the current code:**

**Richer custom layout (B's only real upside).** A `TreeView` can render *only* nested rows — each row is label + description + icon + collapse arrow, stacked vertically. It cannot draw columns, side-by-side bands, a real time-axis, or **arrows between threads** (e.g. a visual "A → blocked on → B" edge). A Webview is an arbitrary HTML/CSS/JS canvas, so a genuinely *graphical* roadmap (swimlanes, a timeline, dependency arrows) is only possible there. If we ever want that, B is the only door.

**Heavy new infra.** Everything today is one `TreeDataProvider` (`LoomTreeProvider`) registered as a view — no webview anywhere in the extension. B means standing up a parallel stack: a `WebviewViewProvider`, an HTML template, a bundled client-side script, a Content-Security-Policy, and a `postMessage`/`onDidReceiveMessage` protocol for *every* interaction. There's no webview build step in `packages/vscode` today, so that's new bundling plumbing too.

**Duplicate state plumbing.** The tree already owns the whole pipeline: `getMCP().readResource('loom://state')` with retry + reconnect-on-timeout (`readStateWithRetry`), `_onMCPStateChange`, auto-refresh, `ViewStateManager` persistence, and the file→node maps that power reveal/doc-sync. A webview's DOM can reuse **none** of that — you'd re-fetch `loom://roadmap` in the host, serialize and `postMessage` it in, re-post on every change, re-implement the timeout/reconnect UI, and round-trip every click (open doc, drag-reorder) back across the message channel to call the MCP tool. In the tree, `node.command` and a `TreeDragAndDropController` give you open-on-click and drag **for free**; the webview rebuilds both by hand over messages.

**Harder to test.** Tree nodes are plain objects you can assert on directly; webview behavior lives in browser-side JS behind a message boundary the current test setup doesn't reach. More parts (CSP, bundling, message protocol) = more to break and maintain.

**The clincher:** the design says "thin renderer over the read-model," and the three bands (future/present/history) are naturally a *list of sections* — exactly what the TreeView already does via `groupWeaves → createSectionNode`. So unless we specifically want a graphical timeline/arrow-graph, B's one advantage (custom layout) goes **unused**, and we'd pay all its cost for none of its benefit.

So: **(A)** unless you want the roadmap to be genuinely graphical (arrows/timeline) rather than three labeled bands of rows — in which case B's cost is justified and I'd say so. Your call on 1.

## Rafa:

For now (A). Loom has no feedback/users yet, I am the only user, no worth the extra effort

## AI:

Locked: **(A) TreeView re-layout** — agreed, it's the no-extra-effort path and the bands are a natural fit for the tree. Adding **Step 5** (group-by-thread toggle), then implementing the whole plan end-to-end (toolbar toggle → bands re-layout → filter fold → group-by-thread toggle → drag-reorder), building with `build-all`. I'll stop only on an error loop or a new decision, and report each step's ✅ + done note as I go.

## AI:

**Plan-2 (Extension Surface) is done — all 5 steps ✅, plan auto-finished.**

Built as a **TreeView re-layout** (your call A), pure renderer over `loom://roadmap`:

- **Step 1 — toggle:** `$(map)` "Show Roadmap" / `$(list-tree)` "Show Threads" toolbar button; `roadmapEnabled` persisted; grouping + text-filter hidden in roadmap mode; title shows "Roadmap".
- **Step 2 — bands:** Future / Present / History sections. Future/Present nodes show status icon + `pN` priority + the headline **`⛔ blocked on weave/thread`** annotation; click opens the thread's design/idea. A diagnostics row surfaces cycle/dangling/missing-manifest findings.
- **Step 3 — filter fold:** in roadmap mode the status filter becomes a band picker — **All / Roadmap (future+present) / History**. No redundant active+implementing value (Present subsumes it).
- **Step 4 — drag-reorder:** drag within a band renumbers spaced priorities via `loom_set_priority`; a drop that would place a thread before a `depends_on` target is **refused** (client pre-check), with the topo sort as the backstop.
- **Step 5 — group-by-thread (the one you asked me to add):** a roadmap-only toggle groups the History band under `weave/thread` headings (default flat newest-first); mirrors the CLI's `--group-by-thread`, no read-model change.

**Verified:** `build-all` clean · `tsc --noEmit` (vscode) clean · full `test-all` green (multi-loom + 17 MCP integration tests). The UI itself still wants a manual **Reload Window** in the Extension Development Host to eyeball the panel + drag — automated tests don't exercise VS Code rendering.

Nothing committed yet — Plan-1 is on `main` from before; these are working-tree changes in `packages/vscode/`. Want me to commit + push (you're solo on `main`), or do the Reload-Window check first?

## Rafa:

I run cd packages/vscode && npm run package, and check extension, looks nice

Update all READMEs, CHANGELOG and everything needed for release 1.8.0
Update
docs/USER_GUIDE.md
docs/EXTENSION_USER_GUIDE.md
docs/CLI_USER_GUIDE.md
if needed

bump 1.8.0
commit, push, tag

check if i miss some step


## AI:

**v1.8.0 is shipped and published.** Full release checklist + the answer to "did I miss a step":

## Release checklist — v1.8.0

| Step | Status |
|---|---|
| Feature implemented (Plan-2, all 5 steps ✅, plan auto-done) | ✅ |
| `build-all` + vscode `tsc --noEmit` + full `test-all` green | ✅ |
| Root `CHANGELOG.md` — 1.8.0 section | ✅ |
| `packages/vscode/CHANGELOG.md` — hand-added 1.8.0 (guard requires both) | ✅ |
| READMEs — root, cli, vscode | ✅ |
| Docs — USER_GUIDE, EXTENSION_USER_GUIDE, CLI_USER_GUIDE | ✅ |
| Version bump — all 7 `package.json` → 1.8.0 (lockstep) + CHANGELOG link refs | ✅ |
| Commit (incl. your done-marked docs + roadmap chat/done) | ✅ `db11647` |
| Annotated tag `v1.8.0` + pushed main + **tag pushed explicitly** | ✅ |
| Release CI — npm · Marketplace (vsce) · Open VSX · GitHub release | ✅ all green |

## The step you'd have missed
The **canonical `loom/refs/` reference docs** weren't updated for the roadmap (a Plan-1 gap, not just Plan-2): `cli-commands-reference` lacked `loom roadmap`/`loom migrate`, `architecture-reference`'s doc-type table lacked `thread` (and `req`), and `vscode-commands-reference` lacked the new toggles. Fixed and pushed in a follow-up `docs(refs)` commit (`18d098d`). These aren't in the published packages, so doing it after the tag was fine — the 1.8.0 artifacts are correct.

## Two non-blocking heads-ups
- **CI Node-20 deprecation warnings** — `upload/download-artifact@v4` on the release workflow run on Node 20, which GitHub forces to Node 24 on **2026-06-16**. Worth a small `.github/workflows` bump sometime; it didn't affect this release. *(Now being addressed.)*
- The `.vsix` files in `packages/vscode/` are gitignored (not committed) — the Marketplace/Open VSX builds come from CI, so nothing stale shipped.