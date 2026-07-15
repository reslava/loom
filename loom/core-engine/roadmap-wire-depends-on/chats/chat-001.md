---
type: chat
id: ch_01KXJR22V1F13K2FAYHQ74F6QN
title: roadmap-wire-depends-on Chat 001
status: done
created: 2026-07-15
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 11
---
# roadmap-wire-depends-on Chat 001

## Rafa:

loom CLI has a command for setting up threads depends_on:
set-thread-deps <weave> <thread> [deps...]   Set a thread's hard depends_on edges (th_ ULIDs or weave/thread slugs; no deps clears). Refused on a cycle.

but this should be easy for User to assign thread dependencies in roadmap visually using the extension 

goal: implement the UX to wire this

## AI:

**Vision check:** this serves the "weave/threads operations" tree UX and the roadmap (the one feature you've called out as genuinely useful) — it removes the manual step of hand-running `set-thread-deps` in a terminal or hand-editing `depends_on` in `thread.md`. It's a **NO-AI** operation (pure state write), so it's a command-wiring job, not an AI action.

Framing it as parity is the clean lens: the capability already exists on two of three surfaces —

- CLI `set-thread-deps` ✓
- MCP `loom_set_thread_deps` ✓
- extension visual ✗ ← the gap you're pointing at

So this thread *completes the triangle*. Before I propose steps, two design forks worth settling out loud:

**1. "Wire visually" is two halves — see the wires, and edit the wires.**
You can't meaningfully wire dependencies you can't see. So the real question is whether the roadmap currently *renders* dependency edges at all, or only consumes them for ordering (`buildRoadmap` orders future work by dependency + priority, but I don't think the tree draws the edges). If edges aren't visible today, "set deps" alone will feel blind — you'd set an edge and see nothing change except reordering. I'd treat **show-the-edge** as part of this thread, not a follow-up. Do you agree, or do you only want the *set* half for now?

**2. Interaction model** — the extension roadmap is a VS Code **TreeView**, not a graph canvas, which constrains what "visual" can mean:

- **(A) Command + multi-select quick-pick** — right-click a thread → *Set Dependencies…* → a checkbox list of the other threads (pre-checked = current deps). Mirrors the CLI 1:1, cheapest, parity-clean, cycle-error surfaced as a toast. Least "visual," most robust.
- **(B) Drag-to-link** — drag thread A onto thread B to add an edge. Most direct, but it **collides with the existing drag = priority-reorder gesture** in the roadmap; you'd need a modifier key or a drop-zone distinction, which is fiddly and easy to misfire.
- **(C) Webview dependency graph** — real nodes-and-arrows canvas you draw edges on. The only truly "visual" option, but it's a large lift (new webview, layout, message-passing) and steps outside the TreeView the rest of the extension lives in.

My lean: **(A)** as the core write path (fast, safe, completes parity) plus rendering existing edges inline in the tree (the "see" half) — that gets you a genuinely usable visual loop without a webview. (C) is the eventual dream but a separate, much bigger thread.

Cycle handling is free either way: the MCP/CLI already refuse cycles, so the extension just surfaces the rejection as an error toast.

Which interaction model do you want to anchor on — and do you want the *see-the-edge* half in scope here, or just *set*?

## Rafa:

I think (A) is best option, enough

## AI:

Locked: **(A)** — right-click a thread → *Set Dependencies…* → multi-select quick-pick of the other threads, pre-checked = current deps, write via `loom_set_thread_deps`, cycle rejection surfaced as an error toast.

The nice part: (A) folds the *see* half in for free without any graph work. Because the quick-pick is **pre-checked with the current `depends_on`**, opening it *is* how you see a thread's existing wiring — you read and edit in the same gesture. So "enough" holds: no webview, no inline edge-drawing, no drag gesture to disambiguate. One command, one picker.

Scope, kept lean:
- New extension command + context-menu item on thread nodes (roadmap and/or main tree).
- Quick-pick lists sibling threads (label = title, description = weave/slug); pre-checks current deps; on confirm, diff → `loom_set_thread_deps`.
- Surface the cycle/`Refused on a cycle` error as a toast; leave the picker's prior state untouched.

Next artifact — your call on ceremony:
- **Straight to a plan** — this is a small, well-scoped NO-AI parity command; a short idea/design would mostly restate this chat. I'd lean here.
- **Idea + design first** — if you want the decision captured as durable docs before any plan.

Which — plan directly, or idea/design first?

## Rafa:

Sorry I missed about `see the wires` I think roadmap already shows dependencies
I agree plan directly, write plan or code quick as you consider

## AI:

Plan direct it is — and you're right that the roadmap already carries the dependency graph (`RoadmapNode.dependsOn` drives the DnD reorder pre-check), so scope is purely the *set* UX. No idea/design; this chat is the design record.

I went to a plan rather than `code quick` because it genuinely spans four files (manifest contribution + command handler + registration + build/verify) — more than a quick fix warrants. **plan-001** created:

1. **package.json** — declare `reslava-loom.setThreadDeps` + a thread-node context menu (`viewItem =~ /^thread/`, so it shows in roadmap *and* main tree) + palette guard.
2. **setThreadDeps.ts** — resolve target thread ULID + current deps from the roadmap the tree already holds; pre-checked multi-select quick-pick of the other threads; write the diff via `loom_set_thread_deps`; cycle/unknown → error toast via `handleMcpError`.
3. **extension.ts** — register the command.
4. **build + test + verify** — `build-all` / `test-all` (the thread/parity tests already cover the MCP tool; the extension command has no ts-node harness, same as the rest of the extension), then exercise the picker in the Extension Dev Host incl. a cycle refusal.

The one thing I chose without asking: **candidate source = the roadmap band** (present + future threads), since that's the "roadmap dependency" surface you named — done threads aren't offered as deps. Say the word if you'd rather the picker list *every* thread with a `th_` ULID.

Plan's in `draft`. Say `do plan` (or `do step 1`) to start implementing, or `start plan` first if you want it in `implementing` before stepping.

## Rafa:

agree all, candidate source = the roadmap band
I started plan
do plan

## AI:

**plan-001 done** — all 4 steps ✅, plan auto-closed. Thread deps now have a visual surface, completing CLI ⇄ MCP ⇄ extension parity.

What shipped:
- **package.json** — `loom.setThreadDeps` command + a thread-node context menu (`viewItem =~ /^thread/`, roadmap *and* tree).
- **commands/setThreadDeps.ts** — right-click a thread → *Set Dependencies…* → a pre-checked multi-select quick-pick of the other roadmap-band threads → writes the diff via `loom_set_thread_deps`. Pre-check = the "see current wiring" surface, so no webview/drag. Reads `loom://roadmap` fresh for candidates + current deps.
- **extension.ts** — registered, node-tolerant (falls back to tree selection like `rename`).

Two small deviations from the plan's literal text, both to match the codebase: command id is `loom.setThreadDeps` (not `reslava-loom.*`), and no command-palette guard (this package.json has no `commandPalette` section — the node-tolerant handler covers palette/keybinding invocation instead). Both noted in the done doc.

Error handling worth flagging: `handleMcpError` *re-throws* non-timeout errors, so a cycle **refusal** would have surfaced as an uncaught error. I split it — timeouts reconnect via `handleMcpError`, but a cycle/unknown-target/self rejection is caught and shown as a warning toast (`Dependencies refused: …`), leaving the graph intact — same pattern the roadmap DnD uses.

Verified headless: `build-all` ✅, vscode `tsc --noEmit` ✅ (exit 0), `test-all` ✅ (23/23 MCP integration). **Your half:** the live picker exercise in the Extension Development Host — Reload Window (new `extension.js`), right-click a roadmap thread → Set Dependencies → confirm pre-check, persistence, roadmap reorder, and a cycle showing the refusal toast.

Not committed — say the word if you want it committed.

## Rafa:

I repackage vsix, installed vsix and reloaded window
no right-click menu option appears

## AI:

Good catch — that's a real bug in my step 1, and it's exactly the roadmap case.

**Root cause:** roadmap-view thread nodes get `contextValue = 'roadmap-thread'` (`treeProvider.ts:477`), but normal-tree thread nodes get `thread…`. My menu `when` was `viewItem =~ /^thread/`, which matches only the tree view — so the item never showed in the roadmap, which is where you're using it.

**Fix:** widened it to `viewItem =~ /^(roadmap-)?thread/`, so it matches both. The handler already works for both node shapes (`node.roadmap?.ulid ?? node.threadUlid`), so no code change needed. Rebuilt + suite green (23/23). Recorded as plan-002 (quick-ship).

The menu lives in `package.json`, which the vsix packages verbatim — so **repackage the vsix + reinstall + Reload Window** and *Set Dependencies…* should now appear on a right-clicked roadmap thread. (Or run the Extension Development Host with F5 to skip the package/install cycle while iterating.)

If it *still* doesn't show after a clean repackage, tell me and I'll check whether the vsix is actually bundling the updated package.json vs. a cached build.

## Rafa:

Working

Curiosity: why you wired `Set Dependencies…` in weaves/threads tree nodes instead of wiring in roadmap directly?

Curiosity: in extension roadmap, the roadmap node elements can be a thread, idea, design... doc what is the fallback decision order to pick one of them?

commit

## AI:

Both good questions — they get at how the tree actually works.

**Q1 — why "on thread nodes" rather than "in the roadmap directly"?** They're the same thing here. The roadmap isn't a separate view — it's the one `loom.threads` TreeView in *roadmap mode* (a render toggle via `roadmapEnabled`), not a distinct webview. VS Code context menus attach to items by `viewItem` (the node's `contextValue`), never by which view/mode is showing. So the only way to put the command "in the roadmap" **is** to match the roadmap thread node's contextValue — which is exactly what it now does. The bug earlier was that I matched only the tree-mode contextValue (`thread…`) and missed the roadmap-mode one (`roadmap-thread`); the fix (`/^(roadmap-)?thread/`) covers both render modes of the same thread node. There was never a separate roadmap surface to wire into.

**Q2 — a roadmap node can be thread/idea/design… what's the fallback order?** Slight correction on the premise: in the **roadmap band** every node is a **thread** — one node per thread (`createRoadmapNode`), not separate idea/design/doc children (they're collapsibleState `None`). So there's no thread-vs-idea-vs-design *ambiguity* at the node level; the node always carries the thread identity (`threadUlid`) my command uses.

What *does* have a fallback order is the **doc that opens when you click** a roadmap thread node. That's `resolveThreadDocPath` (treeProvider.ts:563):

```
const doc = t?.design ?? t?.idea ?? t?.manifest;
```

So: **design → idea → thread.md**. It opens the design if present, else the idea, else the thread manifest — i.e. it jumps you to the most-evolved artifact of the thread. (The *history* band is different again — those nodes are shipped plans, resolved via `resolvePlanPath`.)

Committing now.