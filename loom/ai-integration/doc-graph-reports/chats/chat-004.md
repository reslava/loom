---
type: chat
id: ch_01KXBTYC2TTQ4GFM0MK0K91AFN
title: doc-graph-reports — plan-005 Chat 004
status: done
created: 2026-07-12
updated: 2026-07-12
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 3
---
# doc-graph-reports — plan-005 Chat 004

## Rafa:

I started plan-005
do plan

## AI:

**Plan-005 (Reports — coverage & kinds) done** — all 6 steps ✅, plan auto-closed.

**What shipped**
1. Four single-doc-type "complete" kinds — `ideas` / `designs` / `plans` / `dones` — each cross-weave with a distinct lens and a **150k-char default budget**.
2. `ctx` registered in `docTypes` for the summary-friendly kinds (architecture + the four new); analytical kinds (`decisions`/`drift-audit`/`security`) stay ctx-free.
3. `loom report <kind> --full` — unlimited-budget override wired CLI→prompt→`selectReportDocs`, with a **token-cost warning** at the CLI edge (reads `manifest.fullChars`).
4. On-demand-ctx suggestion — when a weave slice degrades and has no ctx, the manifest + coverage note point at `loom refresh ctx` (capability only, no auto-gen).
5. Tests (13 blocks) + build + **23/23 suite green** + one real sample report.
6. `loom/refs/reports-reference.md` completed (Parameters, Examples/how-to, kinds promoted to shipped).

**Sample report — `designs --weave core-engine`** (weave-scoped, showcase shape):
- **211,746 → 150,463 chars** (~53k → ~37.6k tokens), tiers 22 full · 0 summary · 10 reference. The step-4 ctx suggestion fired live.
- Saved: `loom/core-engine/reports/Core Engine — Designs (2026-07-12) - designs report.md` (`rp_01KXC1HB5W…`) — added to the showcase-candidates table.

**Finding worth your eye (reinforces last time's):** recency=relevance degraded the **oldest/foundational** designs (Link Index, Clean-Architecture layering, BaseDoc, ID Management) to reference-only — the *opposite* of what a `designs`/`architecture` reader wants. For these kinds, **oldest-first ordering or `--full` is the better shape**. It's a real design question we could pick up as a small follow-up if you want the single-doc-type kinds to default to a non-recency order.

Uncommitted: plan-005 code (core kinds/selection, mcp prompt, cli) + tests + reference doc + the sample report + plan/done docs + these turns. Want me to **commit** (one commit for plan-005)?

## Rafa:

commit
spin up a small follow-up plan for the single-doc-type kinds to default to a non-recency order
maybe we could have recency, oldest sort options together with full or budget 

### ctx

i saw that brief generated for the report said:
>SUGGESTION — these weaves had docs degraded by the budget but have no ctx to summarize with: core-engine. Generating a ctx for them (e.g. `loom refresh ctx` scoped to the weave) would give better summaries on the next run. (Informational — no ctx is generated automatically.)

that is suggesting to include again weave level ctx.md files? because currently we only have global ones

### Pending plans

from `loom/ai-integration/doc-graph-reports/chats/chat-002.md` lines 102-106

**Group D — extension surface**
7. **Extension `Reports` tree node** (read-only display) **+ generate action**. Display is *independent*; the generate action *builds on 3* (the agent-launch pattern).

**Group E — optional / later**
8. **Refresh-in-place** (vs snapshot). Deferred; revisit only if repeated regeneration proves noisy. *Lowest priority.*

write plan for group D

currently:
- global reports appears in extension tree in weave = reports > Loose fibers > * and should appears in special folder similar to Refs, Reports 
- weave reports do not appear in extension tree

### Notes about Loom reports

reports about Loom itself can bring some weird information becuase Loom was born and grew up inside Loom repo itself, so old decisions was taken with very early states of Loom, even Stage 1 and Stage 2 (maybe we clean that stages info in the future from relevant docs like CLAUDE)

## AI:

Committing plan-005 as the last action. On your four points:

## ctx — you caught a real seam

Half-right, so let me be precise. The suggestion does **not** reintroduce weave ctx as a *mandatory* doc, and nothing auto-generates one — that boundary holds. **But** if you *act* on it (`loom refresh ctx` scoped to a weave), Loom writes a **persistent** `loom/{weave}/ctx.md` that then lives on and is loaded by `getState` from that point. So it's not ephemeral — following the suggestion *is* opting into a standing weave ctx. It's your choice (never forced), so the "optional/on-demand, never mandatory" rule isn't broken — but you're right that it *nudges* toward the weave ctx you're wary of.

And given the recency finding, generating a ctx is **not** the best fix for the case that triggered the suggestion (a `designs`/`architecture` run dropping foundational docs) — **ordering (oldest-first) or `--full` is.** So I'll rework the suggestion (in the ordering plan) to lead with `--sort oldest` / `--full`, and mention ctx only as a secondary opt-in that *creates a persistent doc*. That keeps the (c) capability honest — "use a ctx if one exists" — without pushing weave ctx on you.

## plan-006 — non-recency ordering (drafted)

`pl_…` in this thread. Shape:
1. `selectReportDocs` gets a **keep-full ordering** knob — `sort: 'recency' | 'oldest'` (recency = newest keep full, today's behavior; oldest = oldest keep full). Per-kind default via a new `defaultSort`: **single-doc-type kinds + architecture → `oldest`** (foundational docs stay full), analytical/roadmap → `recency`. Output stays chronological.
2. `--sort <recency|oldest>` wired CLI→prompt→selection (mirrors `--full`; they compose).
3. Rework the oversized-ctx suggestion (per the ctx answer above).
4. Tests + regenerate `designs --weave core-engine --sort oldest`, saved — a better showcase candidate that keeps the foundational designs full (before/after vs the recency run).

**Sub-decisions to confirm:** flag `--sort` vs `--order`; values `recency`/`oldest` (add `structural` later?); the per-kind defaults above.

## plan-007 — Group D, extension reports surface (drafted)

`pl_…` in this thread (kept here for feature cohesion — say if you'd rather it be its own vscode-extension thread). I found the cause of your phantom-weave bug: the tree special-cases a `refs` pseudo-weave into a **"Refs"** node (`treeProvider.ts:163–235`); `loom/reports/` has no such handling, so it falls through as a normal weave whose docs show as Loose Fibers. Plan:
1. Render cross-weave `loom/reports/` under a dedicated **Reports** node (mirror the refs special-casing), read-only + click-to-open — kills the phantom weave.
2. Render weave-scoped `loom/{weave}/reports/` under their weave (reports are outside `LoomState`, so the tree scans the dir directly).
3. **Generate-report** action (command + menu) launching the `--run`/`launchClaude` agent to synthesize + save, then refresh.
4. build + test + verify in the Extension Dev Host.

## Loom-self reports — agreed, real artifact

You're right: a whole-history Loom report faithfully surfaces **superseded early-stage decisions** (Stage 1/2, pre-ULID, the old `weaves/` folder naming — I saw it in the core-engine designs). That's *correct* for a decisions/history report but misleading for a **showcase**. Levers, cheapest first: **`--since`** to scope past the early stages, weave-scoping, and — the deeper one you flagged — a future cleanup of Stage 1/2 references from `CLAUDE.md`/refs. I'd treat that CLAUDE cleanup as its own small task when you want it, not part of these plans. (It's also why **Chord Flow** reports will be the cleaner showcase — that repo didn't grow up inside Loom.)

Both plans are drafts (uncommitted) for your review — `start plan` whichever you want first. Committing plan-005 now.