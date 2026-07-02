---
type: chat
id: ch_01KWH1F11XWTRKMXDRDQJC86P8
title: roadmap-dnd-reenable-review Chat
status: done
created: 2026-07-02
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 19
---
# roadmap-dnd-reenable-review Chat

## Rafa:

### Roadmap DnD

After implementing `core-engine/loom-entities-crud` that allow moving weave and threads via DnD

Now roadmap soft priority assignement via DnD is not working.

Could we have both DnD behaviours? They live in different extension functional panels

### Roadmap review

I also would like to review roadmap pending threads.
These are real vaue pending threads:
  ⚪ core-engine/clean-legacy-read (p10) Clean legacy-read — drop dual-read + rename weave.looseFibers
  ⚪ core-engine/test-harness-unify (p20) Remove orphaned jest tests — one test harness
  ⚪ core-engine/quick-ship-plan (p30) Quick-ship: a one-action done plan so fast fixes land in versioned history
  ⚪ core-engine/layer-imports-guard (p40) Single table-driven layer-imports guard for all package dependency rules
  🟢 ai-integration/ai-integration-token-optimization (p50) Token Consumption Awareness
  🟢 ai-integration/context-dispatcher-sidebar (p70) Context Dispatcher Sidebar — surface the loaded-context ledger

But the rest I am not sure if they are outdated, superseeded, should be archived...

## AI:

Dug into both. Taking them in turn.

## 1. Roadmap DnD — "both behaviours"

First, a correction to the mental model that changes the fix: **these are not two panels.** There is one tree view (`loom.threads`) and one drag controller (`RoadmapDragAndDropController`, `packages/vscode/src/tree/roadmapDnd.ts`). The Roadmap band and the normal weave/thread tree are two **mutually-exclusive layouts** of that same view, switched by `viewState.roadmapEnabled` (`treeProvider.getChildren` returns *either* the roadmap bands *or* the weave tree, never both). The controller already multiplexes on the exact same flag:

- `roadmapEnabled` → drag sets `ROADMAP_MIME`, drop renumbers `priority` via `loom_set_priority`.
- else (normal tree) → drag sets `TREE_MIME`, drop calls `loom_move_thread` (thread → weave).

So "can we have both?" — we already do, and it's the correct design: one controller, keyed off the one flag that also decides which layout is on screen. There's no architectural conflict to resolve.

**Which means the regression is a bug, not a missing feature.** And here's the honest part: reading it statically, I *can't* see the break. The entities-CRUD refactor (`60b0d51`) only deleted the loose-fiber→thread *doc-move* branch; it never touched the roadmap branch. The roadmap drag guard (`node.roadmap?.ulid`), the drop target resolution (`roadmap-band-roadmap` / `roadmap-thread`), the hard-edge pre-check, and the `loom_set_priority({ threadUlid, priority })` call all still line up with what `createRoadmapNode` produces and what the MCP tool expects. Nothing is obviously wrong.

When the code reads correct but the behaviour is broken, the two usual suspects are:
- **Stale extension build** — the running Extension Host still has pre-refactor `roadmapDnd.js`. This needs `build-all` **+ Reload Window** (an MCP restart doesn't touch the extension bundle). Worth ruling out first because it's free.
- **A runtime-only break** — e.g. `roadmapEnabled` not actually true at drag time, or VS Code not offering the drop because of the dual-MIME registration. Only a live repro with a couple of log points at the top of `handleDrag`/`handleDrop` will show it.

**Question before I go further:** when you saw it fail, was that against a freshly built + reloaded extension? If yes, I'll add temporary instrumentation and repro; if you're not sure, a Reload Window first might just fix it. This is the design/diagnosis fork — I'd rather not guess-patch a controller that reads correct.

## 2. Roadmap review — the pending threads

Your 6 "real value" threads all sit at the top of the priority band (p10–p70), so the roadmap is already surfacing them correctly. Here's the rest of the *active/implementing* set that's cluttering the band, with my read. I can classify from state + titles, but **"superseded vs still-live" needs me to actually read each thread's idea/design** before we archive anything — so treat the right column as a hypothesis, not a verdict:

| Thread | Prio | My read | Action |
|---|---|---|---|
| `loom/global` | 100 | Meta AI↔Rafa chat thread, not a deliverable — shouldn't be on the roadmap at all | Set priority back to default (1000) to drop it off the band — **not** archive |
| `loom/test-release-roadmap` | — | Test artifact from release-roadmap dogfooding | Archive candidate |
| `core-engine/docs-file-names-titles` | 80 | Canonical flat filenames already shipped (`layout-migration`, `ctx-naming` done) — likely superseded | Read → probably archive |
| `core-engine/plan-steps-v2` | 110 | `table-steps` + `step-crud-tools` already done — may be the already-shipped work under an old name | Read → probably archive |
| `vscode-extension/vscode-mcp-timeout-diagnostics` | 190 | `vscode-mcp-timeout` is **done**; this diagnostics spike likely obsolete | Read → probably archive |
| `vscode-extension/vscode-demo` | 160 | Demo deliverables, still `implementing` (2 steps pending) — may be stale or may be real | Read to decide |
| `vscode-extension/tokens-count` | 140 | Local token estimator — overlaps `ai-integration-token-optimization` (p50, your list). Complementary or duplicate? | Read to decide |
| `mvp/tutorial` | 150 | Onboarding tutorial — probably still valid, just low priority | Keep, low prio |

So the archive/de-clutter candidates are roughly: `test-release-roadmap`, `docs-file-names-titles`, `plan-steps-v2`, `vscode-mcp-timeout-diagnostics` (all "read-then-likely-archive"), plus `global` which just needs its priority reset off the band.

**Recommendation:** let me read those 5–6 candidate threads (idea/design only) and come back with a confirmed archive-or-keep verdict per thread + the exact `loom_archive` / `loom_set_priority` calls. That's cheap and reversible. But I'll wait for your call on ordering.

## Where to go next

Two independent workstreams here — DnD fix and roadmap cleanup. Which first? And for the DnD: was your failing test on a reloaded extension build, or should we try Reload Window before I instrument?

STOP — waiting for direction.

## Rafa:

### 1. Roadmap DnD 

Roadmap DnD is not working
It is not a stale extension build, I installed new version, I reloaded window...
So I guess it should be a runtime-only break

## 2. Roadmap review 

I marked all chats in `loom/global` done so now `loom/global` does not appear in roadmap anymore
Read the rest and tell me
Propably we archive them, loom has no feedback/users

## AI:

Read all of them. Verdicts below — `loom/global` you already handled by marking its chats done, so it's off the band.

## Roadmap review — verdicts

| Thread | Prio | What I found | Verdict |
|---|---|---|---|
| `loom/test-release-roadmap` | — | Pure dogfood test of `/do-release` + `record-release`. The test **passed** — v1.10.0 shipped, the chat ends with "test passed ✅". Nothing left to do. | **Archive** — high confidence |
| `core-engine/plan-steps-v2` | 110 | Design draft for "structured steps in YAML frontmatter, table becomes a generated view." **This is exactly the model that shipped** — `table-steps`, `step-crud-tools`, `force-using-canonical-plan-steps-table` are all done, and CLAUDE.md documents this as current reality. | **Archive** — superseded by shipped work |
| `core-engine/docs-file-names-titles` | 80 | Design chat that resolved into a ref-doc edit (arch-ref §7). Its headline decision — **Option B: drop the `# Title` body heading** — was *not* adopted; Loom kept the synced body H1 (CLAUDE.md still says "synced body H1"). The flat-filename half shipped via `layout-migration`/`ctx-naming`. So the live outcome is a ref doc; the rest is superseded. | **Archive** — decision documented + superseded |
| `vscode-extension/tokens-count` | 140 | Local chars/4 estimator "required by the context sidebar (vscode-ctx)". The sidebar shipped (`vscode-ctx`, `context-sidebar` done), and it overlaps `ai-integration-token-optimization` (p50, your keep-list — "Token Consumption Awareness"). Either already built into the sidebar or subsumed by p50. | **Archive** — fold into p50 (confirm below) |
| `vscode-extension/vscode-mcp-timeout-diagnostics` | 190 | Instrumentation steps 1–2 **done** (client+server logging shipped); step 3 is "reproduce and diagnose the timeout." A diagnostic spike — done only if the timeout still reproduces. | **Confirm then archive** — do you still hit MCP timeouts? If no, archive |
| `vscode-extension/vscode-demo` | 160 | Demo/GIF deliverables. README steps done; remaining steps are recording infra + the actual GIF (manual). Real, but marketing polish. | **Keep, low prio** — not superseded, but build-in-the-dark with no users. Don't archive; just leave it low |
| `mvp/tutorial` | 150 | Onboarding tutorial GIF, draft plan blocked on "extension commands stable." Same class as vscode-demo. | **Keep, low prio** — real onboarding asset, defer |

**Net:** three clean archives (`test-release-roadmap`, `plan-steps-v2`, `docs-file-names-titles`), two confirm-then-archive (`tokens-count` → subsumed by p50; `vscode-mcp-timeout-diagnostics` → only if timeouts are gone), and two keep-but-defer demo/onboarding threads (`vscode-demo`, `tutorial`).

This matches your instinct — with no users, the demo/tutorial polish is exactly the build-in-the-dark work worth deferring rather than deleting, and the three superseded/test threads are just clutter on the band.

**Two questions before I archive anything** (archive is reversible via `loom_restore`, but I won't move folders without your go):
1. Confirm the three clean archives + whether `tokens-count` and `vscode-mcp-timeout-diagnostics` join them (i.e. are MCP timeouts still happening?).
2. Archive path per convention is `loom/.archive/{weave}/{thread}/` via `loom_archive`.

## DnD — the honest state

I traced the full roadmap drag/drop path and it reads **correct**: `handleDrag` (roadmap branch) sets `ROADMAP_MIME` from `node.roadmap.ulid` (which is populated — your band shows real `p10…` priorities, so the manifests/ulids are loaded), and `handleDrop` routes `ROADMAP_MIME` → renumber via `loom_set_priority({threadUlid, priority})` (param name matches the tool). The entities-CRUD commits only *added* the `TREE_MIME` branch; they never edited the roadmap logic. So a runtime-only break won't yield to more static reading — it's one of: `roadmapEnabled` not actually true at drag time, `getRoadmap()` returning a stale/empty band, a silent early-return in target resolution, or VS Code not delivering the drop under the dual-MIME registration.

The correct next move is **instrument, don't guess-patch**: add temporary `console.log`/output-channel lines at the top of `handleDrag`/`handleDrop` and at each early-return, build + Reload Window, you reproduce one failed drag, and the log names the exact guard that bails. Then the real one-line fix is obvious. I'd rather do that than patch a controller that reads correct.

**So, ordering:** want me to (a) do the three clean archives first (quick, and I'll pause on the two confirm-cases for your answer), then (b) add the DnD instrumentation for you to repro? Or DnD first?

STOP — waiting for direction.

## Rafa:

I already did:

loom/test-release-roadmap -> marked done
core-engine/plan-steps-v2 -> archived (bug detected, do copy instead of move the thread files, i needed to deleted the source)
core-engine/docs-file-names-titles -> archived (correcly)
vscode-extension/tokens-count -> archived (correcly)
vscode-extension/vscode-mcp-timeout-diagnostics -> marked plan done, no more timeouts
vscode-extension/vscode-demo -> p1000
mvp/tutorial -> p1000

commit: `chore: roadmap`

## AI:

Your roadmap actions are all in `0eda548 chore: roadmap` — nothing for me to re-commit. Recap: `test-release-roadmap` done, `plan-steps-v2` / `docs-file-names-titles` / `tokens-count` archived, `vscode-mcp-timeout-diagnostics` plan done (no more timeouts ✅), `vscode-demo` + `tutorial` → p1000. Band's clean now.

## DnD — found it, and you were right: entities-CRUD hid it

Your instinct nailed the location. The regression is in **`handleDrop`**, and it came in with the tree-move DnD (`147e437`). That commit *prepended* this to the top of `handleDrop`:

```ts
const treeItem = dataTransfer.get(TREE_MIME);
if (treeItem) { await this.handleTreeDrop(...); return; }   // ← runs BEFORE the roadmap path
```

`handleDrag` decides mode the right way — it branches on `roadmapEnabled` first. But `handleDrop` was left *inferring the mode from which MIME is present*. `TREE_MIME` is declared in `dragMimeTypes`, and a declared-but-unset MIME can still come back truthy from `dataTransfer.get()` — so in roadmap mode the thread-move branch **swallows the drop and returns before the priority-reorder code ever runs**. Before entities-CRUD, `handleDrop` had only the roadmap path, so it always worked. Exactly the "something in the CRUD build hid it" you felt.

**The fix (clean, root-cause):** route `handleDrop` on the same `roadmapEnabled` flag `handleDrag` already uses — symmetric, deterministic, no MIME-presence guessing:

```ts
if (!roadmapEnabled) {          // normal tree → thread-move
    const treeItem = dataTransfer.get(TREE_MIME);
    if (treeItem) await this.handleTreeDrop(target, treeItem.value);
    return;
}
// roadmap mode → priority reorder (ROADMAP_MIME)
```

This is strictly better than the old code regardless of the VS Code MIME quirk: both handlers now key off the one flag that also decides the on-screen layout. Build + vscode typecheck green.

**But I have NOT verified it live** — I found the cause by reasoning, not measurement, and this whole thread exists because the timeout work taught us that shipping a fix against an unmeasured symptom is how you miss three times. So the honest state is: strong root-cause fix, compiles, **unverified in the GUI**. 

**Your move:** Reload Window (the bundle changed — no MCP restart needed) and try a roadmap-band priority drag. If it reorders, I'll commit as `fix(vscode): route roadmap DnD by roadmapEnabled, not MIME presence`. If it still fails, I'll add the instrumentation and we measure. I'm holding the commit until you confirm.

## Separate finding — `loom_archive` copied instead of moved

You flagged that archiving `plan-steps-v2` left the source behind (you deleted it manually). That's a real bug and worth its own look — `packages/app/src/archive.ts` uses `fs.move(source, dest, { overwrite: false })`, which on Windows can fall back to copy-then-unlink and leave the source if any file in the thread folder is held open (e.g. a doc open in an editor tab). It's unrelated to the DnD fix, so I'd rather not fold it in here. Want me to open a small thread for it (repro + robust move) after the DnD is confirmed?

Next: waiting for your Reload-Window + drag test to confirm the DnD fix.

STOP — waiting for go.

## Rafa:

DnD is working 
commit

### `loom_archive` copied instead of moved
open a small thread for it (repro + robust move)

## AI:

Great — that confirms the root cause. Committing the fix as `fix(vscode): route roadmap DnD by roadmapEnabled, not MIME presence`.

And opening a small `core-engine/archive-robust-move` thread for the `loom_archive` copy-not-move bug — I'll capture the repro (archiving `plan-steps-v2` left the source folder behind) and the likely cause (`fs.move` copy-then-unlink fallback leaving the source when a file is held open on Windows) so the fix can make the move atomic-or-fail-loud instead of silently duplicating.

## Rafa:

Write small plan for this fix, 1 step, done
Write design for `core-engine/archive-robust-move`

## AI:

Both written.

**DnD fix — `plan-001` (this thread), marked done.** One step ("Route handleDrop by roadmapEnabled"), auto-completed to `done` on the last step, with `done/plan-001-done.md` recording the root cause, the fix, and that you confirmed it live. The thread now has a proper versioned-history record for the fix instead of only a chat trail.

**`core-engine/archive-robust-move` — `design.md` written** (status draft, for your review). It proposes a single shared `moveTreeOrThrow(source, dest)` helper in `packages/fs` that all three folder-moves (`archive`, `restore`, `moveThread`) call instead of `fs.move` directly, giving them one **atomic-or-fail-loud** contract.

One decision in the design I want you to weigh in on before it's finalized:

- **On a failed move (source survives the copy), roll back the just-made copy so the tree returns to its exact original state (chosen)** — vs. leave the copy and just throw. I picked rollback because it guarantees "either fully moved or nothing changed" — no duplicate ULIDs, no manual cleanup, which is the whole point. The cost is a best-effort `remove(dest)` on the error path. If you'd rather keep the copy and clean up by hand, say so and I'll flip it.

I'm holding the commit on both until you've looked — `plan-001` + its done doc, and the archive `design.md`. Say `commit` and I'll land them (plan/done as `chore`, design with it or separate — your call).

Next: your review of the archive design decision, then I commit.

## Rafa:

commit this fix thread, all done

on `core-engine/archive-robust-move` On a failed move, roll back
update design, write small plan

## AI:

Done.

**Fix thread** — committing `roadmap-dnd-reenable-review` as complete: `plan-001` (done) + its done doc + this chat.

**`archive-robust-move`** — rollback is now settled in `design.md` (the "vs leave-copy" framing is gone; it reads as the decision). Wrote a small 3-step `plan-001`:
1. Add `moveTreeOrThrow` helper in `packages/fs` (move → if source survives, roll back the copy + throw).
2. Route the three `fs.move` folder-move callers through it — `archive.ts`, `restore.ts`, `thread.ts` (I confirmed those are the only ones).
3. Regression test with an injected `fs` that leaves the source → assert throw + rollback; wire into `test-all.sh`.

Committing the archive `design.md` + `plan-001` alongside.

Next: `archive-robust-move` is ready to implement whenever you want — say `do step 1` (or start the plan) and I'll build the helper.