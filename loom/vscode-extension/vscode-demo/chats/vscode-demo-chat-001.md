---
type: chat
id: ch_01KT4MXP58KA35QCZEA3CDXGAR
title: vscode-demo Chat
status: active
created: 2026-06-02
version: 1
tags: []
parent_id: null
requires_load: []
---
# vscode-demo Chat

## Rafa:

Create a plan

## Rafa:

We come from vscode-gif-demo/ that was messy and we created this clean starting point for demo of VSCode loom extension

The idea is to produces 2 GIFs to show loom workflow and context through sample project with corresponding prompts so the final user can see what is loom and the added value to collaborate with AI to create complex projects

The GIFs will be included in all README placeholders already wating for GIFs to be recorded



## AI:

Created `vscode-demo-plan-001.md` (`pl_01KT4NKFH0TD8RSDJ674XPV71H`), parented to the demo design. The idea and design were already settled (both `status: done`), so this just turns the design's §6 production sequence into a steps table.

Per your call, the validate-first boundary is handled by **splitting into two plans**:

**Plan 001 — workflow GIF (this doc): D1 + D4 + D2**
1. D1 — vsix README: "the panel" → "the CONTEXT panel", 12-button inventory, `media/loom-demo-workflow.gif` placeholder + caption.
2. D1 — main README: hero icon, demo placeholder after Workflow section, exact button names, marketplace link.
3. D4 — recording infra: pricing-page demo project, `.claude/settings.local.json` allowlist (no `--dangerously-skip-permissions` on screen), MCP-restart-after-build checklist.
4. D2 — record + publish the 8-scene workflow GIF (~0.5s slowed tree transitions) into both README placeholders.

**Plan 002 — ctx/reference GIF (D3)** — *not created yet.* It gets created only after D2 ships and we've gauged viewer response, and it still carries the hard prerequisite of verifying weave-ctx auto-load works live (the `📄 … loaded for context` line printing before the AI reply) before recording.

Steps 1–2 touch `packages/vscode/README.md` and root `README.md`, which are outside the MCP gate — those will be normal file edits when we get there.


## AI:

Agreed — the prompts are load-bearing. The D2 GIF records the AI *producing* the idea/design/plan/done live, so a vague prompt breaks the scene: Generate Idea sprawls, the plan comes out 6 steps instead of 2–3, and the captions stop matching what's on screen. The exact prompt strings are a deliverable, not an improvisation.

Added a dedicated step to Plan 001 (now **5 steps**):

> **Step 4 — author + dry-run the exact demo chat prompts.** Write the precise prompt for each scripted point (New Chat opener, Generate Idea, Generate Design, Generate Plan, Do Step) so the produced docs come out tight and on-script. Dry-run the full chat → done sequence against the demo project once end-to-end, capture the exact prompt strings + expected outputs, and tune until reproducible — the recording (now step 5) types these verbatim.

It's blocked by step 3 (you need the demo project to dry-run against) and now gates the recording. When Plan 002 (D3) is created, it'll carry the same kind of step for its two acts — the weave-ctx "what's next?" prompt and the brand-style `requires_load` design prompt, both of which have to produce the exact brand-hex proof on cue.

## Rafa:

I do not what you are doing with prompts.
Read preview old thread chat `loom/vscode-extension/vscode-gif-demo/chats/vscode-gif-demo-chat-001.md`
Here you can find we were already creating prompts to get accuracy (short plan for GIF) and impressive results for final user, like this:
> We need a pricing section on the landing page. Three tiers — Free, Pro, and Enterprise. Each tier should show the price, 4 bullet points of features, and a CTA button. Pro should be visually highlighted as the recommended plan. Output is a self-contained `pricing.html` snippet with inline CSS.


## AI:

Read `gif-demo-chat-001.md` — you're right, the prompts already exist and were already refined for accuracy. I was framing step 4 as "author the prompts from scratch," which was wrong. The real assets are already there:

- **D2 pricing prompt** (chat-001 line 274) — the rewritten 2-deliverable version: *"…Scope is markup + inline CSS only; no JS, no responsive QA, no interaction testing. Two deliverables: (1) a self-contained `pricing.html` snippet, (2) integration into `index.html`…"* — this is what turned a 6-step plan into a tight 2–3 step plan.
- The **plan + design prompt fixes** that make it land ≤3 steps reliably — already shipped to `packages/mcp/src/tools/generate.ts` and validated (you ran it, got 3 clean steps).
- The **8-scene caption script**, and for D3: the two GIF-2 prompts, the `brand-style-reference.md` body, and the expected `demo-ctx.md`.

**Fixed step 4** to reflect this: it now says *assemble the demo script from the already-refined assets in gif-demo-chat-001 (do NOT re-author) — use the pricing prompt verbatim, then dry-run once on current code and tune only if output drifts.* The work is reuse + verify, not invention.

One suggestion: those prompts and seed assets are currently buried in a 1343-line chat marked `status: done`. They're the load-bearing inputs for both GIFs, so I'd rather they live as a durable, citable asset for this thread rather than in an old chat. Two options:

1. **A `demo-script-reference.md`** in this thread (`type: reference`) holding the verbatim prompts + caption script + the brand-style/ctx seed bodies — plan steps cite it by ID.
2. **Fold them into the design** as an appendix section.

I lean (1) — it's exactly what reference docs are for (durable facts the work cites), and it keeps the design about decisions rather than copy. Want me to create it before we start step 1, or just leave the prompts referenced by their chat-001 line numbers?

Next: waiting for your call on capturing the prompts (reference doc vs leave in chat-001), then `go` to start step 1.

## Rafa:

Yes, capture it in `demo-script-reference.md`

## AI:

Created the reference (`rf_01KT4P8QYQH49VKD8P187XNMJZ`) with the verbatim D2 pricing prompt, the 8-scene caption script, the expected 2-step plan, and the D3 assets (both prompts, the `brand-style-reference.md` body, the expected ctx body), plus a note that the prompt-gen fixes are already shipped in `generate.ts`.

**Finding — double type-suffix in the filename.** `loom_create_reference` auto-appends `-reference` to the slug, and I passed the title *"Demo Script Reference"*, so the file landed as:

```
loom/refs/demo-script-reference-reference.md   ← slug "demo-script-reference"
```

You asked for `demo-script-reference.md`. Two things here, one your call:

1. **The filename is malformed** (`-reference-reference`). To get exactly `demo-script-reference.md` the title needs to be *"Demo Script"* (tool appends the suffix). Fix: rename slug `demo-script-reference` → `demo-script`. I can do that with `loom_rename`, or archive + recreate with the right title.
2. **It went to global `loom/refs/`, not the thread.** The `loom_create_reference` tool only ever writes to `loom/refs/` — it has no thread-local option, so a thread-scoped reference isn't possible through MCP. It's citable by ID regardless, but it's a global ref, not a `vscode-demo/` thread asset like I implied earlier.

Per the "treat MCP tool behavior as findings" rule I'm stopping here rather than routing around it. How do you want to handle the rename — `loom_rename` to `demo-script`, or leave the slug as-is? And are you fine with it living in global `loom/refs/`?

Next: waiting on your call on the rename/location, then I'll point plan step 4 at this reference's ID and we can start step 1.

## Rafa:

Yes, refs are global only
Yes, tool add the sufix
Both are correct loom design behaviours
I renamed file to `loom/refs/demo-script-reference.md`

## AI:

Understood on all three — my error to put "Reference" in the title; refs being global + slug-suffixed are correct Loom behavior. The slug is `demo-script-reference`, matching the file you renamed.

Wired it in: added `demo-script-reference` to the plan's `requires_load`, and steps 4 and 5 now cite `[[demo-script-reference]]` for the verbatim prompt + caption script instead of pointing at old chat line numbers.

**Plan 001 is settled** (5 steps, reference linked):
1. D1 — vsix README
2. D1 — main README
3. D4 — recording infra + demo project
4. D2 — assemble demo script from the reference + dry-run on current code
5. D2 — record + publish workflow GIF

Ready to start. Step 1 touches `packages/vscode/README.md` (outside the MCP gate — normal file edit): rename "the panel" → "the CONTEXT panel" throughout, add the 12-button inventory, and add the `media/loom-demo-workflow.gif` placeholder + caption at the top.

STOP — waiting for `go` to start Step 1.

## Rafa:

Do whole plan `loom/vscode-extension/vscode-demo/plans/vscode-demo-plan-001.md`


## AI:

Before running the plan I reconciled it against the current code, and three things needed your call (now answered). Capturing the durable decisions here:

**1. README copy follows the real extension titles, not the plan's drafted names.** The plan/design used working names that never matched the shipped commands. Source of truth = `packages/vscode/package.json`. Corrections that flow into D1:
- "Generate Idea" → there is **no AI generate-idea command**; idea creation is **Weave Idea** (`loom.weaveIdea`); the AI verb on an idea is **Refine Idea** + **Generate Design (AI)**.
- "Generate Ctx" → real command is **Refresh Context** (`loom.refreshCtx`).
- "New Chat" → **Weave Chat** (`loom.chatNew`).
- AI buttons carry the **"(AI)"** suffix: **Generate Design (AI)**, **Generate Plan (AI)**.
- Do Step is titled **Do Step(s)**.

**2. Panel naming:** the Loom sidebar holds **two** views — **Threads** and **Context** — so I'm keeping "the **Loom panel**" for the whole sidebar and naming the sub-view "the **Context view**". Not renaming the whole sidebar to "the CONTEXT panel" (that would mis-describe the Threads view). This keeps the idea's success criterion — *name the Context panel correctly* — honest.

**3. Steps 4 & 5 can't run in this Claude Code CLI session.** Per the workflow + CLAUDE.md rules, `loom_generate_*` sampling is blocked in CLI (it only works inside the extension), and Step 5 is a literal screen recording. So:
- I execute **Steps 1–3** fully (READMEs, demo project, settings allowlist + MCP-restart checklist).
- I **stage** everything Step 4/5 need — seed the verbatim opener prompt from `demo-script-reference` into the demo project and lay out the 8-scene script — but the **live dry-run + GIF recording is yours** in the extension.

**Note on Steps 1–2 being partly pre-done:** both READMEs were revised after this plan was written (plan is v4), so they already carry button tables, hero icons, and demo placeholders. Steps 1–2 are therefore a *reconcile* — fix the stale button names, align the demo-asset filename to `media/loom-demo-workflow.gif`, fill genuine gaps — not a from-scratch add. I'll note per-step what was already satisfied vs. what I changed.

Proceeding now with Steps 1–3. (Also: I'd skipped loading `vision`/`workflow` from ctx's `requires_load` and was replying only in the terminal — both corrected; this reply and all follow-ups land here in the chat.)

## AI:

**Steps 1–3 done and recorded** (plan now `implementing`, steps 1–3 ✅, done notes in `vscode-demo-plan-001-done.md`).

What landed:
- **Step 1 (vsix README)** — demo placeholder → `loom-demo-workflow.gif` + caption; button table rewritten to real titles in three groups (AI / Create & promote / Manage). "the panel" naming was already correct, left as-is.
- **Step 2 (main README)** — workflow-GIF placeholder added right after the Workflow section; existing extension-section placeholder filename aligned; button table fixed to real titles.
- **Step 3 (recording infra)** — new `demo/landing-page/` standalone project: `index.html` (dark Nimbus landing page, hero + features, **no pricing yet**, brand `#4F46E5`), `.claude/settings.local.json` allowlist, `.gitignore`, and a `README.md` recording checklist.
- **Step 4 staged** — the verbatim pricing opener prompt + 8-scene caption script (with real button names) are seeded in `demo/landing-page/README.md` so the recording types them verbatim.

**Stopping here — Steps 4 & 5 are yours to drive in the extension** (live `loom_generate_*` sampling is blocked in this CLI session; Step 5 is a screen recording). Your move:
1. `./scripts/build-all.sh` then **fully restart `loom mcp`** / the extension MCP client.
2. Open `demo/landing-page/` as its own VS Code window, add the `.mcp.json` (snippet in its README), `loom install`.
3. **Step 4 dry-run:** run chat → idea → design → plan → do-step → done once. Confirm the plan lands at **2–3 steps** (>3 = prompt drifted). Tune only if it drifts; then I can mark step 4 ✅.
4. **Step 5:** record the 8 scenes (~0.5s tree transitions), export to `packages/vscode/media/loom-demo-workflow.gif`, verify it renders in both README placeholders. Then mark step 5 ✅ and the plan auto-closes.

Nothing to commit yet unless you want the README + demo-project changes landed now — say the word and I'll commit to `main`.

Steps 1–3 of the plan are done and marked ✅; Step 4's assets are
  staged. Steps 4–5 require the live VS Code extension (sampling is
  blocked in this CLI session, and Step 5 is a screen recording), so
  those are yours to drive — the demo project at demo/landing-page/
  has the full pre-record checklist + verbatim script.

Next: in the extension — build-all.sh + restart loom mcp, open
  demo/landing-page/, loom install, then dry-run chat→done (Step 4)
  and record the GIF (Step 5). Tell me when each is done and I'll mark
  it ✅. Or say the word to commit the README + demo-project changes
  to main now. STOP — waiting for go.