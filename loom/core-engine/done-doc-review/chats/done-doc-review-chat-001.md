---
type: chat
id: ch_01KW2GNXP8MDZW467MGBDPK0KG
title: done-doc-review Chat
status: active
created: 2026-06-26
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 19
---
# done-doc-review Chat

## Rafa:

By dogfooding Loom with my other project `Chord Flow` I discover AI sometimes fails creating done docs for a plan.

AI tried to create done doc by using `loom_close_plan` but ending having an empty done doc stub

I asked AI and this is its reply:
>loom_close_plan's notes parameter doesn't write the body — it produces a "TODO" stub regardless. I re-wrote it via loom_update_doc, which persisted.  

So `loom_close_plan` is not working to create a done doc
AI needs to use loom_append_done to write a proper persisted done doc

Analize the cause and tell me

## AI:

Analyzed it. The AI's self-diagnosis described the symptom correctly but missed the actual cause. Here's what's really happening.

## Root cause

`loom_close_plan` never writes your `notes` to the body. It feeds them to an **AI inference call** and writes *that* call's output as the body. In a Claude Code (or any keyless) session there is no inference, so a hardcoded stub answers instead — which is why you always get the TODO placeholder no matter what `notes` says.

The chain:

1. `loom_close_plan` (`packages/mcp/src/tools/closePlan.ts`) calls the `closePlan` use-case with `aiClient: makeAiClient()`.
2. `closePlan` (`packages/app/src/closePlan.ts:76`) builds a summarization prompt — your `notes` go in only as `=== User notes ===` *prompt input* — then does `const aiBody = await deps.aiClient.complete(messages)` and writes `content: aiBody.trim()`. **The notes are never written directly; they're raw material for an AI that's supposed to rewrite them.**
3. `makeAiClient()` (`packages/mcp/src/deepseekClient.ts:45`) returns a real client **only if `DEEPSEEK_API_KEY` is set**. Otherwise it returns a stub whose `complete()` unconditionally returns:
   > `TODO: Add implementation notes.\n\n(Set DEEPSEEK_API_KEY env var to enable AI generation.)`

So with no key, the done body is *always* that stub string. With a key, your notes would be reworded by DeepSeek — still not written verbatim.

## Why this is the wrong architecture, not just a missing key

This is the same class of bug as `loom_generate_*` / `loom_refine_*`: tools built around the **fallback sampling/API-key AI path**, used inside a Claude Code session where *Claude itself is the AI* and recursive inference is intentionally unavailable. But `loom_close_plan` is worse than those:

- `loom_generate_*` / `loom_refine_*` **error out** (`MethodNotFound`) in a CLI session — a loud, honest failure.
- `loom_close_plan` **silently succeeds**, writing a garbage stub. No error, a real file on disk, a "done" plan. That's the dangerous part — it looks like it worked.

Two extra smells worth noting:
- It bypasses MCP sampling entirely and hardcodes **DeepSeek**, while the rest of the fallback path documented in CLAUDE.md uses `makeAIClient()` → `reslava-loom.ai.apiKey` (Claude). So there are two unrelated AI clients in the codebase.
- Even on the happy path (key present), `notes` is treated as *material to summarize*, never as the body. A caller who already wrote good notes can't get them through verbatim.

## Why your workaround worked

`loom_append_done` (`packages/mcp/src/tools/appendDone.ts`) is **purely mechanical** — zero AI. It takes `notes` and writes them straight into a `## Step N — {description}` section, idempotent per step. So it persists exactly what you give it. Same for `loom_update_doc`. That's the correct shape for the Claude-is-the-AI path: the agent has already authored the content; the tool just stores it.

## The fix (design decision — your call)

The clean fix follows the same principle every other create tool already uses in a CLI session: **the agent supplies the content, the tool writes it verbatim; AI generation is fallback-only.**

**Option A — make `notes` authoritative (smallest change).** In `closePlan`, if `notes` is provided, write it directly as the body and skip inference entirely. Only call `aiClient.complete()` when `notes` is absent *and* a real client exists. Keeps one tool; `loom_close_plan` works in CLI sessions.

**Option B — split responsibilities (cleanest).** `loom_close_plan` only does plan finalization (the `FINISH_PLAN` reducer + status, the part that genuinely needs the use-case). The done-doc *body* is authored by the agent via `loom_append_done` per step during implementation, exactly as you did. `loom_close_plan` then assembles/validates rather than generates. This matches the workflow doc ("AI records what it did in done.md via `loom_append_done`") — `loom_append_done` is the intended authoring path, and `loom_close_plan`'s AI-generation was a fallback-path leftover.

**Option C — guard against silent stubs.** Independently of A/B: `makeAiClient()`'s stub should make the tool *fail loudly* (like `loom_generate_*`) instead of writing the TODO string, so a keyless session never silently produces a stub done doc.

My recommendation: **B + C** — it's the root-cause fix (the body belongs to the agent, not to a fallback inference call) and it removes the silent-stub failure mode for good. A is a valid quicker patch if you want `loom_close_plan` to stay a single self-contained tool.

Want me to spin this thread up into an idea/design, or go straight to a plan?

## Rafa:

B+C

I think we could write directly a plan, agree?
If so write it

## AI:

Agreed — straight to a plan is right here: the root cause is pinned to two files, you've made the B+C call, and there's no open design question left to settle. Wrote it: `done-doc-review-plan-001` (`pl_01KW2HKGCBF051SA6MDSE784WK`), parented to this chat since the thread has no design.

Five steps:
1. **closePlan use-case** (`packages/app/src/closePlan.ts`) — rip out the AI inference; `notes` written verbatim; finalization (FINISH_PLAN + save/move) unchanged; closing with neither notes nor an existing done doc throws instead of stubbing (C).
2. **loom_close_plan tool** (`packages/mcp/src/tools/closePlan.ts`) — drop `makeAiClient`, rewrite the description (verbatim notes; per-step bodies via `loom_append_done`).
3. **Delete `deepseekClient.ts`** — orphaned once step 2 lands (it was its only importer).
4. **Tests** (`close-plan.test.ts`, `workspace-workflow.test.ts`) — drop the mock AI client; assert verbatim notes; add the loud-failure test.
5. **Build + test + live-verify** no stub is ever written (restart MCP first — running server is stale after build).

The plan is in `draft`. Say `go` (or `start`) and I'll start it from step 1.

## Rafa:

I started the plan
Do whole plan

## AI:

Got it — running the whole plan. I'll mark each step ✅ and append a done note as I go, and surface anything that needs a decision. Starting with step 1 (the use-case rewrite).

## AI:

Whole plan done — `done-doc-review-plan-001` is `done` (all 5 steps ✅). Summary:

- **`packages/app/src/closePlan.ts`** — no more inference. `notes` written verbatim (created as body, or appended as a `## Closing notes` section if a done doc already exists); no notes + existing done doc → finalize and leave it; no notes + no done doc → **throws** `No done content…` instead of stubbing.
- **`packages/mcp/src/tools/closePlan.ts`** — dropped `makeAiClient`; description rewritten (verbatim notes, per-step bodies via `loom_append_done`, no stub).
- **`packages/mcp/src/deepseekClient.ts`** — deleted (the stub's source; was closePlan's only importer).
- **Tests** — `close-plan.test.ts` rewritten (5 cases incl. the loud-failure path), `workspace-workflow.test.ts` updated. `build-all` clean, `test-all` green (incl. MCP integration 17/17).

**One thing before you rely on the live tool:** this session's running `loom mcp` is stale after the rebuild, so a `loom_close_plan` call right now would still run the old code. Restart the session / MCP (or reload the extension window) and it'll pick up the fix — then it'll write your notes verbatim, or fail loudly, never a TODO stub.

Nothing's committed yet. Want me to commit this (`fix: loom_close_plan writes verbatim done docs, never a stub`)?

## Rafa:

I reconnected mcp
Did you update the mcp tools descriptions for both tools updated, in order AI knows what tools use?
`loom_append_done` is able to create the whole done doc for all steps or 1 by 1?
Creating the whole done should be available and AI should know this. This way done creation requires just 1 mcp call.
If is fast and easy could you verify there is no other mcp tool with this kind of stale error **fallback sampling/API-key AI path**?

## AI:

Three answers.

## 1. Tool descriptions — only one of the two was rewritten

- **`loom_close_plan`** — yes, rewritten this run: it now states the body is authored via `loom_append_done`, that `notes` is written verbatim, and that closing with no content throws (no stub).
- **`loom_append_done`** — **not touched.** And that's the crux of your next question: its description still says "Append an implementation note for a plan **step**… Creates the done doc on first call." It advertises 1-by-1 only, because 1-by-1 is all it can currently do. So no, the AI does *not* currently know a whole-done path exists through it — because it doesn't exist yet.

## 2. `loom_append_done`: 1-by-1 only today

Right now it writes exactly **one** `## Step N — …` section per call. A 5-step done doc = 5 calls (that's literally what I just did above). There is no "all steps in one call" mode.

A whole-done-in-one-call path *does* already exist as of this fix — but through **`loom_close_plan(notes=<entire done body>)`**, which writes the full body verbatim in one call. The catch: that couples done-authoring with finalizing the plan, and the body is freeform (no enforced `## Step N` sections).

You're right that whole-done should be a first-class, AI-known, single call. Two clean ways — this is an API-shape decision, so I want your pick:

**Option A — give `loom_append_done` a batch mode (recommended).** Add an optional `steps: [{ stepNumber, notes }, …]` array alongside the existing single `stepNumber`+`notes`. One call writes/updates N sections. Keeps *all* done-doc authoring in one well-named tool; `loom_close_plan` stays a pure finalizer (consistent with the B decision we just shipped). AI mental model becomes simple: *"write the done — one step or all of them — with `loom_append_done`; then `loom_close_plan` to finalize."* Update both descriptions to say so.
- Cost: small schema + handler change (loop the existing section-merge logic over the array), a test, build.

**Option B — no new code; route whole-done through `loom_close_plan` notes.** Just rewrite both descriptions so the AI knows: incremental → `loom_append_done`; whole-doc-in-one-call → `loom_close_plan(notes=…)`.
- Cost: descriptions only. But it conflates authoring with closing, and loses the `## Step N` structure (notes go in as freeform body).

I recommend **A** — it's the correct home for the capability (done authoring belongs to the done tool, not the finalizer), keeps `close_plan` clean, and gives the AI one obvious tool for both shapes. B is the zero-code answer if you'd rather not widen the surface.

## 3. Audit — any other tool with the silent stub fallback? No.

`loom_close_plan` was the **only** offender. It was unique in using the deleted DeepSeek `makeAiClient()` stub, which silently returned the `TODO…` string. Every *other* AI-dependent MCP tool routes through `samplingAiClient(server)` / `requestSampling`, which **throws `SamplingUnsupportedError` (MethodNotFound)** when the host can't sample — a loud failure, never a stub:

- `loom_generate_idea/design/plan/reference/req/chat_reply` → `requestSampling` (loud)
- `loom_refine_idea/design/plan` → `samplingAiClient` (loud)
- `loom_promote` → `samplingAiClient` (loud)
- `loom_verify_req` → `requestSampling`, and it *degrades reportedly* (structural findings returned, "semantic blocked without sampling" stated) — not a silent stub.

So the class of bug is fully closed: the one silent-stub tool is fixed, its stub source file is deleted, and nothing else shares the pattern.

---

Pick A or B for the whole-done path and I'll implement it (A is a quick add). Also still holding on whether to commit the work already done.

## Rafa:

Do A
Then commit

## AI:

Option A shipped. `loom_append_done` now takes an optional `steps: [{ stepNumber, notes }]` batch array alongside the single `{ stepNumber, notes }` form — one call writes the whole done doc, sections upserted and ordered by step number, and it validates every referenced step *before* writing anything (atomic: an unknown step throws and nothing is written). Description rewritten so the AI knows both shapes and that `loom_append_done` is the home for done authoring while `loom_close_plan` only finalizes.

Added `tests/append-done.test.ts` (single create, batch whole-doc + ordering, idempotent replace + version bump, atomic fail-loud, empty-input guard) and registered it in `test-all.sh`. Rebuilt; new test 5/5 and full `test-all` green.

Heads-up: this rebuild made the running MCP server stale again — reconnect MCP before the live `loom_append_done` batch form is picked up.

Committing now.

## Rafa:

I pushed
I reconnected mcp, live-verify the batch form

## AI:

Live-verified the batch form against the reconnected MCP server — using this work's own done doc as the target.

One `loom_append_done` call, all five step sections supplied **out of order** (`[5,2,4,1,3]`):
- Returned `created:false`, `stepNumbers:[5,2,4,1,3]` (echoes input order).
- The saved doc has sections **ordered 1→5** — the tool sorts by step number, ignoring input order.
- **No duplicates** — every step upserted into its existing section.
- **version 5 → 6**: exactly one bump for the one call (vs. five separate calls + five bumps the old way).

So the whole-done-in-one-call path is confirmed working live. This re-authoring left the done doc with an uncommitted diff on top of what you pushed (version bump + step-5 text now records the verification + append_done batch coverage). Want me to commit that as `docs: record append_done batch live-verify` (directly to main), or discard it back to the pushed state?