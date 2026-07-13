---
type: chat
id: ch_01KXDGJNAEXAB5MTNP872WR8D1
title: doc-graph-reports — fixes Chat 008
status: done
created: 2026-07-13
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 8
---
# doc-graph-reports — fixes Chat 008

## Rafa:

### Extension

Problem:
Global and weave Reports tree nodes do not appears when no folder/reports exists
Then `generate report` button does not appear, no way to create global / weave reports

When I update extension if Chord Flow I has no way to create a report

Fix:
Global tree node `Reports` (even with no folder and no reports) and button `generate report` should appears always

## AI:

Confirmed — this is a chicken-and-egg empty-state bug, and the fix is small.

## Root cause

The **Generate Report** button is already an inline button (`package.json` → `view/item/context`, `loom.generateReport`, `group: inline@1`), but it hangs off the `reports-section` tree node. That node is only ever built **when reports already exist**:

- `treeProvider.ts:275` — `if (crossWeaveReports.length > 0)` gates the top-level (cross-weave) Reports node.
- `treeProvider.ts:726` — `if (weaveReports && weaveReports.length > 0)` gates the per-weave Reports subsection.

So in a fresh workspace (Chord Flow, or any repo with no `loom/reports/` yet) there are zero reports → no `reports-section` node → nowhere for the button to live → you can never create the *first* report. The one action that would populate the node is only reachable once the node is already populated.

## Fix

**Always render the top-level `Reports` node**, even when empty — drop the `crossWeaveReports.length > 0` guard at `treeProvider.ts:275`. That single always-present node carries the inline **Generate Report** button, and its command already takes an optional **weave filter** (input box, `generateReport.ts:36`), so from that one node you can create *either* a cross-weave report *or* a weave-scoped one. That fully unblocks "no way to create a report."

No new folder is needed — `loom_create_report` creates `loom/reports/` (or `loom/{weave}/reports/`) on first write. The node is a pure UI affordance; it doesn't require the directory to exist.

## Two small sub-decisions for you

1. **Empty-state child.** When there are no reports, should the node show a placeholder child ("*No reports yet — generate one*") or just sit there as an empty collapsible? I lean **placeholder** — it explains the empty node and points at the button. Trivial either way.

2. **Per-weave subsection.** Leave the per-weave `Reports` subsection **data-driven** (appears under a weave only once that weave has reports)? I'd keep it that way rather than force an empty Reports node under all 11 weaves — that's a lot of tree clutter, and the top-level node's weave-filter input already creates weave-scoped reports. If you want per-weave *discoverability* (Generate Report pre-scoped to a weave, straight off the weave node), that's a slightly bigger change and I'd treat it as a follow-up.

My recommendation: always-on top-level `Reports` node + placeholder empty child, weave subsections stay data-driven. That's a ~10-line change in `treeProvider.ts`, no package.json change (the button contribution is already correct).

Say `code quick` (or `go`) and I'll implement it, build, and test.

## Rafa:

I agree with your recommendations.
Also include a right mouse menu option in weaves nodes: `generate weave report` so weave is pre-filled, could be useful, agree?

code quick

## AI:

Done — shipped as plan-008 (quick-ship). Agreed on the weave-node menu; it's in.

**What changed** (all in `packages/vscode`):

1. **Reports node always renders** — dropped the `crossWeaveReports.length > 0` guard (`treeProvider.ts`). Empty shows a *"No reports yet — generate one"* placeholder wired to `loom.generateReport`. The inline **Generate Report** button now exists in a fresh workspace, so the first report is creatable. Its weave-filter input already covers weave-scoped reports too.

2. **Same empty-state fix for global Refs and global Context** (you were right, both had the identical chicken-and-egg):
   - Refs node always renders → *"No references yet — create one"* → `loom.createReference`.
   - Context node always renders → *"No context yet — generate it"* → `loom.refreshCtx` (global scope).
   - Per-weave / per-thread ctx & refs subsections stay **data-driven** (they never render empty), so no clutter across the 11 weaves.

3. **`Generate Weave Report`** — new right-click action on weave nodes (`loom.generateWeaveReport`, `ai@1` group). Reuses `generateReportCommand`; the weave node carries its slug, so the picker opens pre-scoped to that weave.

**Verified**: `build-all.sh` clean, `test-all.sh` 23/23 green, and confirmed the new commands + placeholder strings are in the built `extension.js` bundle. The tree itself can't be driven headlessly — a **Reload Window** in the Extension Development Host (or a fresh dev `.vsix`) will show the always-on nodes.

No package.json change was needed for the report button (already `inline@1`); only the new weave command + its menu binding.

Next: **Reload Window** to eyeball the empty-state nodes in the tree. Say the word if you want me to commit.

## Rafa:

Checked here and in Chord Flow, working

retitle plan-008 to have a descriptive title
commit

## AI:

Confirmed working in both repos — good. 

Retitled plan-008 → **"Always-render empty Reports/Refs/Context tree nodes + Generate Weave Report action"**.

Committing everything now — the extension changes plus the plan-008 / done / this chat.