---
type: chat
id: ch_01KT4KD0TWCTXRNZ4WYDTKYJV5
title: vscode-gif-demo Chat
status: done
created: "2026-06-02T00:00:00.000Z"
updated: 2026-06-02
version: 3
tags: []
parent_id: null
requires_load: []
---
# vscode-gif-demo Chat

## Rafa:

Review docs in this thread `loom/vscode-extension/vscode-gif-demo/`
Preview chat `vscode-gif-demo-chat-001.md` is messy. 

Summarize the pending tasks, enumerating them in phases with priority and dependencies. 
Analize if the proposed GIF demo is still the best option to show loom extension capabilities and context way of work.


## AI:

Reviewed the whole thread. Quick orientation first: this `vscode-gif-demo` thread has **no idea/design/plan of its own** — chat-001 is the entire artifact, and it did two unrelated jobs at once: (a) plan the demo GIFs, and (b) spawn a major engineering arc (the Unified Context Pipeline + event-save-scope) in the `ai-integration` and `core-engine` weaves. That's why it reads messy: it's a demo thread that accidentally became the design surface for a core refactor. Worth keeping that split in mind — most "pending" work below is actually *engineering*, not *demo production*.

## What's already shipped (so pending is clear by contrast)

- ✅ **vsix body-builder fixes** (`pl_01KRTB3J2BY6EEGKH330HY9V5P`) — no `# Title` headings, blank line after frontmatter.
- ✅ **Context Pipeline Phase 1** (`aab2ccc`) — pure `assembleContext`, `loom://context/{docId}` resource, chat-reply + do-step wired, `threadContext.ts` deleted.
- ✅ **Truncation bug + pipe-escape bug** fixed (`planTableUtils.ts`).
- ✅ **event-save-scope** (`55db0d4`) — events save only changed docs, not the whole weave.
- ✅ **load-when / reference-load-context** threads archived (you fixed the path to the single `loom/.archive`).

## Pending — phased, with priority + dependencies

| # | Task | Status | Priority | Depends on |
|---|------|--------|----------|-----------|
| **D — Demo deliverables (the original ask of this thread)** |
| D1 | **README updates** (vsix: rename → "CONTEXT panel", full button inventory, GIF placeholder; main: hero `loom.png`, GIF placeholder, exact button names, link to extension) | Not started — from chat-001's *first* message, never done | **P1** | none (pure docs, can do now) |
| D2 | **Record GIF 1** — full workflow (install → chat → idea → design → plan → dostep → done). Script + demo project + prompts ready. | Ready to record | P1 | clean build + permission setup (D4) |
| D3 | **Record GIF 2** — ctx + reference workflow. Script + `brand-style-reference.md` + expected `demo-ctx.md` drafted. | Blocked | P1 | **A1 + A2** (ctx must actually load on camera) |
| D4 | **Recording infra** — `.claude/settings.local.json` allowlist, restart MCP after build, small clean project | Partially specced | P1 | none |
| **A — Demo-truthfulness blockers (the reason this thread exists)** |
| A1 | **Weave/thread ctx auto-load into state** — the "inert" gap from Phase-1 finding #2 | **Likely resolved** (see note) | **P0** | ctx-load work (2026-05-31) |
| A2 | **Verify Phase 1 chat-reply fix live in the extension** — the original demo bug ("AI grepped instead of loading ctx"). Never clicked in a real VS Code session. | Unverified | **P0** | A1 |
| **B — Context pipeline remaining phases** |
| B1 | **Phase 2** — `load` / `load_when` filtering (plan-002 `pl_01KSNAAWE8FWDV91GCBQ8E4GRF` exists) | Planned, not implemented | P1 | ctx filtering gated behind A1; reference filtering ships now |
| B2 | **Phase 3** — sidebar CONTEXT UX (user include/exclude; absorbs archived threads' tree UX). *This is the feature you stressed: "real injected context depends on the CONTEXT section; user decides what to inject."* | Not planned | P1 | Phase 2 |
| B3 | **Phase 4** — wire remaining commands (refine/promote/generate/refresh) | Not planned | P2 | P2/P3 shape |
| B4 | **Phase 5** — token budget + summarisation | Not planned | P3 | started unlimited deliberately |
| **C — Hardening** |
| C1 | **event-save-scope `saveWeave` idempotency guard** (design §6) | Deferred-optional | P3 | none |

## Critical note on A1 — re-verify before assuming GIF 2 is blocked

Your original GIF-2 observation ("I don't see any signal the AI loaded `demo-ctx.md` — it explored files") was made *before* the ctx-load work landed. The picture has changed:

- `assembleContext.ts` step **2b** now explicitly collects weave-scope ctx (`weave.looseFibers` + `weave.refDocs`, `type === 'ctx'`) — so a flat `loom/demo/demo-ctx.md` *should* now flow into the bundle.
- ctx-load (global + weave scope, flat `ctx.md` per scope) shipped ~2026-05-31, after the chat-001 discussion.

So A1 is **probably already done** — but it must be **re-verified end-to-end in the extension** (click Reply on a thread chat, confirm `📄 demo-ctx.md — loaded for context` prints and the agent answers without grepping) before recording GIF 2. Don't record on the assumption; confirm on the actual build.

## Is the GIF still the best format?

Honest take — **partly. It's right for half the demo and wrong for the other half:**

- **GIF 1 (workflow) — yes, GIF is genuinely good.** The value is *visible*: the CONTEXT tree growing node-by-node as chat→idea→design→plan→done materialise, and the steps table flipping 🔳→✅. That reads in a silent, looping, autoplaying GIF, and GIF is the only format the **VS Code marketplace README** reliably renders inline (it does not embed video).
- **GIF 2 (ctx + reference) — GIF is the wrong tool for the core point.** The entire value prop — *"the AI already knew the project, no context dump"* — is **invisible and behavioral**. A silent loop literally cannot show the difference between "auto-loaded ctx" and "grepped the repo for 5 seconds." The thing that makes Loom different is the one thing a GIF can't capture. Captions help but a viewer can't verify the claim; it just looks like a fast chat reply.

Strategic flag (you've framed Loom as an unvalidated bet): a polished two-GIF production pipeline is real hours sunk into an asset before there's any signal of demand. The cheapest validation is one rough screen-recording that tells the story, shared somewhere, to see if anyone leans in — not a marketplace-grade asset set.

**Recommendation — hybrid, not two GIFs:**
1. **One tight GIF** of GIF 1's workflow (tree building up) → marketplace + README hero. This carries the "feels like real tooling" hook and is the part GIF does well.
2. **Ctx/reference value → a short narrated video** (30–60s, hosted/linked, e.g. YouTube), framed as the explicit contrast: *"normal AI — you re-paste context every message"* vs *"Loom — the AI already read the design."* Narration + a visible `📄 ... — loaded for context` overlay is what makes the invisible value legible. GitHub READMEs embed uploaded video; marketplace gets the link.
3. Treat the README updates (D1) as **independent and first** — they don't need any recording and are overdue from chat-001's opening message.

One process suggestion: this thread should get a proper **idea + a small plan** for the *demo deliverables themselves* (D1–D4), so the GIF/video production is tracked like any other Loom work instead of living in a 1300-line chat. The engineering tasks (A/B/C) already have homes in their own threads — they shouldn't be tracked here at all; this thread is about producing the demo.

**Next:** waiting for direction — happy to (a) draft the demo-deliverables idea+plan for this thread, (b) re-verify A1/A2 live so we know GIF 2's true status, or (c) start the README (D1) since it's unblocked. Your call on which, and on the GIF-vs-hybrid format question.

## Rafa:

I think we could close this thread and create a new one: 
`vscode-demo` with the idea, design plan for demo deliverables
if you agree, create the new thread and the idea and design there

## AI:

Agreed — clean split. New thread + idea created:

- **`loom/vscode-extension/vscode-demo/vscode-demo-idea.md`** — `id_01KT4MA3Z7SX80DNYAJSTH3YYV`, title **"Loom Demo Deliverables"** (status draft). It captures D1–D4, success criteria, the scope boundary (engineering tasks stay in their own threads), and the vision tie.

**I deliberately did *not* write the design yet — here's why, and it needs your call.** The design has exactly one load-bearing decision, and everything else (asset count, recording infra, README placeholders, what each asset shows) hangs off it: **the asset format.** Writing the design now means guessing it, which produces the kind of hand-wavy doc Loom exists to avoid. You saw my recommendation last turn and chose to restructure instead of picking — so let's settle it here, then I write a design that's concrete instead of speculative.

**The fork:**

| Option | D2 (workflow) | D3 (ctx/reference) | Trade-off |
|--------|--------------|--------------------|-----------|
| **A — two GIFs** | GIF | GIF | Simple, both inline on marketplace. But D3's value (ctx auto-load) is invisible in a silent loop — looks like a fast chat reply, viewer can't tell it's the differentiator. |
| **B — hybrid (recommended)** | GIF | short narrated video (linked) | GIF carries the visible workflow hook; narration makes D3's invisible value legible. Marketplace gets GIF + video link; GitHub embeds the video. Two formats to produce. |
| **C — one asset only** | GIF | folded into D2 or dropped | Cheapest validation (your "unvalidated bet" framing). Ship one rough workflow GIF, gauge interest before investing in the ctx story. |

My pick stays **B**, with **C as the pragmatic hedge** if you'd rather validate demand before producing polished assets.

**Second, smaller question — what does "close this thread" mean operationally?** The `vscode-gif-demo` thread also holds the **shipped vsix-body-builder plan + done doc** (real history). Two options:
1. **Archive the whole thread** → moves it (including that history) to `loom/.archive/vscode-extension/vscode-gif-demo/`. Cleanest tree, history preserved in archive + git.
2. **Leave it in place, mark the two chats done.** Keeps the body-builder history visible in the live tree.

I lean (1) — the body-builder work is long done and its record survives in git + the done doc, so archiving the whole thread keeps the live tree honest. But it's your history, so I'm asking before moving anything.

**STOP** — waiting on: (a) format A/B/C, (b) close = archive vs mark-done. Once you answer, I'll write `vscode-demo-design.md` against the settled format and then the plan.

## Rafa:

My proposal is 2 GIFs, both with captions. We will launch D2 first and D3 after.
If you agree create the deseign.
Then I will close this thread (just mark all as done), and I will start a new session on the new thread. Then we will create the plan there. Correct or you have better suggestion?

## AI:

Agreed — 2 captioned GIFs, D2 first then D3. Design created:

- **`loom/vscode-extension/vscode-demo/vscode-demo-design.md`** — `de_01KT4MRDAM5R9Q2N7WTM3VJDCA` (status draft, linked to the idea). It fixes the format, specs D1–D4 (full scene+caption scripts for both GIFs carried in so the doc is self-contained), the recording infra, and a production sequence with the dependencies.

The one thing I baked in beyond your proposal: in **D3** the GIF must show the on-screen `📄 demo-ctx.md — loaded for context` line before the AI replies — so the caption is backed by visible proof, not just a claim. And I flagged the hard prerequisite: weave-ctx must be verified loading live in the extension before D3 is recorded (the fix itself isn't this thread's work).

**Your close/new-session plan is correct — one small addition.** When you start the new session: finalize the idea and design (draft → active) *before* creating the plan, so the plan parents onto finalized docs and isn't born already-stale. Other than that, your sequence is clean:
1. Here: mark chat-001 + chat-002 done (your "close = mark-done" choice).
2. New session on `vscode-demo`: finalize idea + design → create the plan there.

The fresh session is the right move — it drops the messy chat-001 context and starts the plan against the clean idea/design.

**Next:** nothing pending from me — close this thread when ready and I'll pick up `vscode-demo` in the new session to finalize the docs and draft the plan.