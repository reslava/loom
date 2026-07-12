---
type: chat
id: ch_01KXC7Q5S2GPA9GF85AWDEW6Y9
title: doc-graph-reports — plan-006 Chat 005
status: active
created: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 1
---
# doc-graph-reports — plan-006 Chat 005

## Rafa:

I started plan-006
if is it all grounded 
do plan

## AI:

**Grounded — yes.** I checked plan-006 against the idea, the design, chat-004, *and* the live code before running it. Every claim held:

- **Its premise is true in the code.** `reportSelection.ts` sorted `byRelevance` newest-first and greedy-packed full bodies to the newest, degrading the tail — the exact "keeps NEWEST full, drops foundational" behavior. Output order was already separately chronological, so inverting *only* the relevance order (step 1's design) was a clean, localized change.
- **The knob fits the existing shape** — `defaultSort` on `ReportKind`, a 5th `sort` param on `selectReportDocs`, `--full`'s proven CLI→prompt→selection path to mirror.
- **The sub-decisions were already locked by you in chat-004** (`--sort`, `recency`/`oldest`, per-kind defaults, `structural` deferred), and step 3 fulfills the promise I made there to rework the ctx suggestion.

So I ran the whole plan.

**Plan-006 done — all 4 steps ✅, plan auto-closed.**

1. **Keep-full ordering knob** (core). `sort: 'recency' | 'oldest'` resolved as `param → kind.defaultSort → global 'recency'`. Per-kind defaults: `designs`/`ideas`/`plans`/`dones`/`architecture` → **oldest** (foundational stays full); `decisions`/`drift-audit`/`security` + roadmap → **recency**. Only the relevance order flips; output stays chronological. `manifest.sort` added.
2. **`--sort` wired end-to-end** — CLI flag (validated at the edge) → prompt arg (validated again; public surface) → selection. Composes with `--full` (which ignores sort — nothing degrades).
3. **Reworded oversized-budget suggestion** — now leads with `--sort oldest` / `--full`; ctx demoted to a secondary opt-in that explicitly flags `loom refresh ctx` writes a **persistent** weave `ctx.md`, not an ephemeral one. That's the chat-004 ctx concern resolved: the brief no longer headlines a nudge toward a standing weave ctx.
4. **Tests + suite + the showcase gen.** 4 new test blocks (17/17), full suite green. Ran the one sanctioned generation: `loom report designs --weave core-engine --sort oldest` → saved `rp_01KXC9GHQQ…` at `loom/core-engine/reports/`.

**The before/after you asked for** — same 32 designs, 22 full / 10 reference both ways, *inverted membership*:
- recency dropped the 10 **foundational** designs (Core Engine, Link Index, BaseDoc, Clean-Architecture layering, ID Management…) to reference — the finding.
- oldest keeps those 22 foundational designs full (2026-04-11 → 2026-06-14) and drops the 10 **newest** incremental ones (date-handling → mcp-read-surface-naming) instead. The oldest run is the better `designs` showcase, so it's now the ✅ candidate in `reports-reference.md`; the recency run is marked ↩ superseded (kept for the contrast).

Everything is uncommitted (plan-006 code across core/cli/mcp + tests + the saved report + the reference-doc edits + plan/done/these turns). Want me to **commit** — one commit for plan-006?