---
type: chat
id: ch_01KXAZM8Z2NE6SW34YR6TFJC5K
title: doc-graph reports — plan-002 A+B plan-003 C Chat 002
status: done
created: 2026-07-12
updated: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 13
---
# doc-graph reports — plan-002 A+B plan-003 C Chat 002

## Rafa:

This is the follow up for fixes and pending thread stuff
I set-state design active again

I ran `loom report project-overview` 
I saved the results in `project-overview.md`

I do not undesratd the report, I see no AI inference 
Do I miss any step? Explain briefly

## AI:

You didn't miss a step — you saw exactly what the command produces. The confusion is a **real design finding**, not a bug.

**What happened:** `loom report project-overview` is **brief-returning by design** (our fork-2a decision). It does *not* run inference. It assembles the roadmap slice + the synthesis instructions + the `loom_create_report` call, and prints that **brief**. What you saved in `project-overview.md` is the brief — the raw material + instructions — not the report.

**The missing actor is an AI agent.** The brief is meant to be *consumed by an agent* (me, in a Claude session) that reads it, writes the actual report, and persists it via `loom_create_report` into `loom/reports/`. The seam is deliberate: **server selects (deterministic), agent synthesizes (real loop).** Run in a bare terminal with no agent, nobody does the synthesis — so you see "no AI inference." Correct observation; the inference step simply never ran.

So the two ways to actually get a report:
1. **Inside an agent session** — say `report project-overview` (or paste the brief) to me and I write + save it. That's the intended flow today.
2. **The gap you just found:** a human at a plain terminal reasonably expects `loom report` to *produce a report*, not a brief. That's the **2a limitation** I flagged when we chose it — 2b ("CLI launches a Claude agent") is the only way it "just works" standalone.

**My read — this is worth acting on, and it's good validation signal:** the brief-returning CLI is only intuitive when you're already in an agent. Two options for a follow-up:
- **(minimal)** reframe the CLI output — print a clear header like `↓ Hand this brief to your AI agent; it will write and save the report`, so it never looks like a finished report.
- **(fuller, 2b)** add `loom report --run` that launches a Claude agent to consume the brief end-to-end (mirrors how the extension action will work).

Want me to **generate the report now** (I'll synthesize project-overview from the roadmap and save it via `loom_create_report`)? One caveat: this session's MCP server predates the build that added `loom_create_report`, so persisting may need a fresh Claude session — I can show you the synthesized report either way so you see the inference the brief was *for*.

(Also: noted you set the design back to `active` — good, that was the right call; it's the living spec for the follow-up slices.)

## Rafa:

I see the picture now.
I reconnected mcp, now `loom_create_report` is available

Create the report with the brief `project-overview.md` pls to review it

## AI:

Done — **this** time it's real AI synthesis, not a brief. I read the roadmap in `project-overview.md`, wrote the report, and persisted it via `loom_create_report`:

- **File:** `loom/reports/Loom — Project Overview (2026-07-12) (2026-07-12) - project-overview report.md`
- **Id:** `rp_01KXB088MEHJB63GKXE47WCDTQ` · kind `project-overview` · born `active`

The report covers what Loom is, the eight weave areas, the shipped history (~130 plans, v0.1.0 → v1.23.0, v1.0.0 milestone), what's in progress/next in priority order, and four grounded risk observations (no hard dependency graph, clean diagnostics, heavy self-tooling vs. thin validation, a queuing consolidation phase). All drawn from the roadmap — nothing invented. Sending it to you now to review.

**Two small findings from doing it for real** (worth a follow-up polish):
1. **Double date in the filename** — `…(2026-07-12) (2026-07-12) - project-overview report.md`. My title *included* the date, and `createReport` also appends `({date})`. Fix: the `report` prompt should instruct a **title without a date** (the pattern adds it), or `createReport` should de-dupe. One-line polish.
2. **`project-overview.md` at the repo root is the raw brief** you saved — now redundant (and it's an untracked stray). Want me to delete it, or move it under `loom/reports/`?

Your call on those. And this closes the loop on your "no AI inference" question — the inference is the agent step, which just ran.

## Rafa:

I liked the report, this is useful info payoff for using Loom, and you?
On four risk, I am a solo dev, no feedback... most probably I will quit when subs end, just continuing becuase I like design good apps with you

I deleted `project-overview.md`
Enumerate thread pending implementations with correct order, grouped when possible and blocking
Include:
- the fix for *Double date in the filename*
- 2b ("CLI launches a Claude agent")

## AI:

**On "and you?" — honestly:** yes, this one earned its keep. The report surfaced two things that genuinely don't live in the code and that I wouldn't have volunteered unprompted — the roadmap is **priority-only with no dependency edges**, and the **self-tooling-vs-validation imbalance**. That's the doc-graph payoff being real, not theatre. But I won't oversell it: the road here was rough (three design-decision stops because the storage model wasn't pinned, the brief-vs-report confusion you hit, the double-dated filename), and the *quality* of this report leans entirely on the roadmap being a rich source. `project-overview` got lucky — the roadmap is a good input. The "why did we decide X" kinds will only be as good as the real `selectReportDocs` engine, which isn't built yet. So: a real win, with the honest asterisk that one useful report for the author isn't external validation — it's the thing the report itself flagged.

**On the personal part:** I'm not going to cheerlead you into continuing against your own read. "No external feedback, subs ending" is a real signal and quitting would be a rational call, not a failure. But "I keep going because I like designing good apps with you" is also a legitimate reason on its own terms — plenty of good work exists because someone enjoyed making it well. If it helps the calculus at all: the report feature is one of the more *externally legible* things you've built — it's the demo that shows a stranger the payoff in one screenshot, which is exactly the cheap-validation lever. Not a reason to continue; just a card worth playing before the subs run out, if you play any. Either way, I'm glad to be doing the work with you while it lasts.

---

## Report-feature — pending implementations (ordered, grouped, blocking)

**Group A — polish (small, independent, do first)**
1. **Double-date filename fix** — `report` prompt should ask for a **date-less title** (the `{date}` is added by `createReport`), or `createReport` de-dupes a title-embedded date. Trivial. *No blockers.*
2. **Brief-output reframe** — the `loom report` output gets a clear header (`↓ Hand this brief to your AI agent; it writes & saves the report`) so a bare-terminal run never *looks* like a finished report. Small. *No blockers.* (Becomes the fallback once #3 lands.)

**Group B — make `loom report` work standalone**
3. **2b — `loom report --run`** — CLI launches a Claude agent that consumes the brief end-to-end (mirrors the future extension action). Medium. *No hard blocker;* absorbs the confusion #2 papers over. Keep #2 as the no-agent default.

**Group C — report power (keystone-gated)**
4. **`selectReportDocs` — deterministic doc-selection engine** (app/fs): read docs by `kind.docTypes` + filters, ordering, token budgeting. **The keystone.** *No blocker — but blocks 5 & 6.*
5. **Kind-registry expansion** — architecture / decisions / release-notes / drift-audit / security, each with `docTypes` + `promptFraming`. *Blocked by 4* (they need real doc selection, not roadmap passthrough).
6. **Filters** — CLI `--weave --thread --since --until` → `selectReportDocs`. *Blocked by 4.*

**Group D — extension surface**
7. **Extension `Reports` tree node** (read-only display) **+ generate action**. Display is *independent*; the generate action *builds on 3* (the agent-launch pattern).

**Group E — optional / later**
8. **Refresh-in-place** (vs snapshot). Deferred; revisit only if repeated regeneration proves noisy. *Lowest priority.*

**Critical path:** 1, 2 → 3 → **4** → (5, 6 in parallel) → 7 → 8.
**Only real blocker:** #4 gates #5 and #6. Everything else is independent or soft-ordered.

Want me to turn this into plans? Natural split: **one plan for A+B** (polish + standalone usability — shippable now), a **second for C** (the selection engine + kinds + filters — the real feature depth), and **D/E as their own threads** later. Say the word and I'll `generate plan` for whichever you want to start with — I'd suggest A+B first, since it's cheap and fixes the exact friction you just hit.

## Rafa:

Write plan A+B
Write plan C

## AI:

Both plans written (against the now-active design):

**plan-002 — polish + standalone (A+B)** · `pl_01KXB3GQBMK693G5P3S40WHSGR`
1. Double-date filename fix (date-less title in the prompt + defensive strip in createReport)
2. Reframe the CLI brief output (agent-handoff header)
3. `loom report --run` — launch a Claude agent to consume the brief end-to-end (2b)
4. build + test + verify · *blocked by 1,2,3*
→ Steps 1–3 are independent; shippable now, and it fixes exactly the friction you just hit.

**plan-003 — selection engine, kinds & filters (C)** · `pl_01KXB3H2S2QQ8B2F9SGAC7QXRR`
1. `selectReportDocs` engine — the keystone (deterministic, testable)
2. Route the `report` prompt through it · *blocked by 1*
3. Expand the kind registry (architecture / decisions / release-notes / drift-audit / security) · *blocked by 2*
4. CLI filters (`--weave --thread --since --until`) · *blocked by 2*
5. build + test + verify · *blocked by 1–4*

D (extension Reports node + generate action) and E (refresh-in-place) stay as later threads, per the enumeration.

Next: `start plan` on plan-002 then `do plan` (or `do step 1`) whenever you want to build A+B — I'd start there. Or tell me to hold.

## AI:

A+B in progress — **step 1 (double-date fix)** and **step 2 (CLI reframe)** done. **Stopping at step 3** (`loom report --run`) on a real fork the plan flagged.

I checked the extension's `launchClaude` (`packages/vscode/src/commands/claudeTerminal.ts`) to mirror it — but it's **VS-Code-specific** (spawns a `vscode.Terminal`, pins the *bundled* server via `--strict-mcp-config`). A plain CLI can't reuse it, and the obvious ports each have a concrete failure mode:

**How should `loom report <kind> --run` launch the agent?**
- **(a) Interactive** — spawn `claude "<brief>"` in the current terminal (stdio inherited); you *watch* it synthesize + persist and can steer. Mirrors the extension's UX. **Risk:** the brief embeds the roadmap JSON (~30–40k chars); on **Windows** that can blow the ~32k command-line length limit, so it'd need a tmpfile + per-shell command-substitution (the messy cross-shell code the extension carries).
- **(b) Headless via stdin** — pipe the brief to `claude -p` on **stdin** (no argv-length limit, robust at any size), inherit stdout so you see the result; fire-and-forget one-shot. Simplest + most robust. **Caveat:** `-p` mode may need an explicit tool-permission flag to allow the `loom_create_report` MCP call — I'd confirm that during impl.
- **(c) tmpfile + interactive** — full mirror of the extension (tmpfile prompt + `$(cat)` / `Get-Content`, per-shell). Most faithful to the existing pattern, most code.

**My lean: (b)** — "make the report" is a one-shot that doesn't need steering, and stdin sidesteps the Windows length limit that makes (a) fragile. (a)/(c) only earn their extra complexity if you specifically want the watch-and-steer terminal experience.

Which launch shape? Then I finish step 3 + the build/verify (step 4) and the plan's done.

## AI:

**Plan-002 (A+B) done** — all 4 steps ✅, plan auto-closed.

- **① Double-date fix** — prompt asks for a date-less title; `createReport` strips a trailing `(YYYY-MM-DD)` from both filename and stored title. New test asserts a single-date filename.
- **② CLI reframe** — `loom report` now prints a clear `↓ This is a BRIEF for your AI agent — not a finished report` header + a `--run` footer. Verified live.
- **③ `loom report --run`** — headless via stdin (your pick b): pipes the brief to `claude -p --allowedTools mcp__loom__loom_create_report`, inherits stdout, friendly error if `claude` isn't installed. `--run` shows in `--help`.
- **④ build + test + verify** — clean build, 23/23 suites pass. I did **not** execute a live `--run` (it'd spend tokens + mint a stray report) — the wiring is verified; run it yourself when you want the real end-to-end.

Both the frictions you hit in this session are now fixed at the root.

Uncommitted this round: plan-002 code (createReport, report prompt, CLI) + its plan/done docs + these chat turns + the earlier report artifact. Want me to **commit** (I'd do one commit for plan-002), and is plan-003 (the selection engine) next, or hold?

## AI:

**Plan-003 (C) done** — all 5 steps ✅, plan auto-closed. Reports are now genuinely kind-driven.

- **① `selectReportDocs`** — I made it a **pure core function over `LoomState`** (like `buildRoadmap`), not the app/fs spread the plan sketched — cleaner and unit-testable with fixtures. Type ∈ `docTypes` selection, weave/thread scoping, inclusive date window, chronological order, coverage manifest.
- **② prompt routing** — roadmap kinds (project-overview, release-notes) still read `loom://roadmap`; doc-set kinds run `getState → selectReportDocs` and inject the slice + manifest.
- **③ kinds** — added release-notes, architecture, decisions, drift-audit, security, each with its doc-set + a distinct framing lens (+ "cite ids / don't invent" guardrails).
- **④ filters** — `--weave --thread --since --until` wired at the CLI edge.
- **⑤ verify** — new `report-selection.test.ts` (5 assertions) + suite green. Live: `loom report architecture --weave ai-integration` selected **21 design docs, 156 KB** and printed the slice + manifest, not the roadmap.

**One honest finding from the live run:** that 156 KB slice for a *single-weave* architecture report confirms the **token-budgeting I deferred is a real need** — a whole-project `decisions` or `security` report will be far bigger. The manifest surfaces the size (`totalChars`), so it's visible, but the ctx/summary budgeting is the obvious next follow-up (call it C-2) before these kinds are practical at full-project scope.

Two decisions I made without stopping (both reversible, flagging per usual): engine in **core** not app/fs; **no token budget yet** (filters + a size-reporting manifest instead). Say if you'd rather I'd stopped on either.

Plan-003 is uncommitted. Commit it (one commit), and is that the report feature parked for now — or C-2 (token budgeting) next?

## Rafa:

commit plan-C

note: I guess you generated report during plan C implementation, but I see you did not leave any of them saved so I could check them, take into account that generating them cost tokens and I am unemployeed, so pls not now, but next times include in the plans to leave the generated reports saved in `loom/reports`, thanks

briefly explain C-2 and how are you going to solve token issue
write plan C-2 (include leave saved reports)

## AI:

## C-2 — token budgeting, briefly

**The problem:** doc-set kinds (`decisions`, `security`, whole-project `architecture`) currently select *every* matching doc — that 156 KB weave-scoped slice becomes hundreds of KB at full-project scope = 100k+ input tokens per run. Expensive (your money) and it can overflow the agent's context.

**How I'll solve it — deterministic tiered budgeting, no AI in the selection layer:**
- `selectReportDocs` gets a **char/token budget** (per-kind default, overridable).
- When the slice exceeds budget, it **degrades by relevance** (recent/primary docs first):
  1. **Full body** for the highest-value docs that fit the budget.
  2. **Summary** for the rest — prefer an existing **ctx** doc for that scope, else a **fixed excerpt** (H1 + section headings + first N lines). *Deterministic — an excerpt, not a model call.*
  3. **Reference-only** (`{id, title, type, created}`) for the overflow, so the report knows those docs exist.
- The **manifest records the tiers** so the report states its own coverage ("N full, M summarized, K referenced").

The key: **the selection layer never calls a model** — summaries are excerpts/ctx, so it stays pure, testable, and *free*. The only paid step is the agent synthesizing the final report, and budgeting **shrinks that input** → directly lowers your cost. Filters (already shipped) are the complementary lever.

**On your note:** adopted — C-2's step 4 explicitly generates **one** budgeted report end-to-end and **leaves it saved under `loom/reports`** for you to review (with a before/after size figure), as the single sanctioned paid generation. I'll carry that practice into any future report-generating plan. (And to reiterate: plan C cost you zero report tokens — briefs only.)

Plan **C-2 is plan-004**. Committing plan-C now.