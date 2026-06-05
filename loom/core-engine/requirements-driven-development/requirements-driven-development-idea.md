---
type: idea
id: id_01KT77TXDA9H80GMW62NY0GD7B
title: Requirements-Driven Development
status: active
created: "2026-06-03T00:00:00.000Z"
updated: 2026-06-05
version: 3
tags: []
parent_id: null
requires_load: []
---
# Requirements-Driven Development

## Problem

User-stated requirements do not survive the workflow. When a user specifies what a piece of work should **include** and **exclude** in a chat, those constraints are silently lost or distorted as the work is promoted chat → idea → design → plan. The generator behaves as an unfaithful translator in **both** directions:

- **Constraints get dropped on promotion.** A chat opener stated "no interaction testing"; on promotion to design that exclusion was lost (the design carried "no JS, no external CSS, no responsive QA" but not "no interaction testing"), so the planner — working from a design that no longer held the exclusion — emitted a manual smoke-test step the user had explicitly ruled out.
- **Scope gets invented.** The same planner added a palette-confirmation step that existed in the design only as an *Open Question*, never as a deliverable. Open Questions are being treated as work items.

Concrete evidence: the `J:\landing-page` demo run (2026-06-03). Verbatim opener said "no interaction testing / no responsive QA / two deliverables"; the generated plan came back with 5 steps including an invented smoke-test. See `loom/vscode-extension/vscode-demo/chats/vscode-demo-chat-001.md` and [[demo-script-reference]].

## Why the obvious fix is wrong

The tempting fix — hardening the global plan-generation prompt in `packages/mcp/src/tools/generate.ts` with rules like "never emit a smoke-test step / smallest step count / one step per deliverable" — was considered and **rejected**. It hardcodes a *preference* into a general-purpose tool and creates contradictions: a user who legitimately wants a smoke-test, or a complex deliverable that genuinely needs 2+ steps, would be fighting the generator. Constraints must come from the **user's spec**, not from generator policy.

## Concept — the `req` doc

Let the user declare, in a clear and structured way, what a thread's workflow should **include**, **exclude**, and be **constrained** by — and guarantee those requirements are carried faithfully through every promotion (chat → req → idea → design → plan → done). The spec lives in a dedicated, always-loaded `req.md` per thread. The generator's job is *faithful translation of the spec*, never imposition of policy:

- It must **carry** every user-stated inclusion, exclusion, and constraint through each stage without silently dropping them.
- It must **not invent** scope absent from the spec (Open Questions ≠ deliverables).
- No step-count rule, no banned-step list. Neutral faithfulness, not restriction — equally serving the user who *wants* a smoke-test and the user who explicitly *doesn't*.

## Goal

A mechanism for explicit, structured requirements (includes / excludes / constraints) on a thread that propagate verifiably through the whole workflow, so the plan reflects exactly what the user asked for — no more, no less.

## Design direction (settled in chat-001)

Banked from `chats/requirements-driven-development-chat-001.md` so the design phase starts from these, not from scratch:

1. **Doc shape — a dedicated `req` doc-type, one per thread.** Flat `req.md` (no `{thread}-` prefix), single stem for type and file (`type: req` + `req.md`), consistent with `ctx`/`ctx.md`. (Renamed from the earlier `rdd.md` — "requirements-driven-development" is the methodology/thread name, not the artifact's contents.) Behaviorally near ctx (auto-loaded, scope-level) but it is **authoritative spec, not a regenerable summary** — keep it distinct so nobody treats it as throwaway. Body is the minimal `✅ Included` / `❌ Excluded` / `⛓ Constraints` lists; the intelligence lives in the diagnostic, not the document.

2. **Three immutable lists, sorted by one rule: "can a later design change it?"** Only sections whose answer is **No** belong in `req.md`:
   - **Included** (user authority) — in scope.
   - **Excluded** (user authority) — out of scope.
   - **Constraints** (user / environment authority) — hard boundaries the work must respect ("TypeScript only", "must run offline", "no new dependency"). Same immutability class as requirements, so they live in `req.md` too.
   - **Design Choices** (user / AI authority) are **mutable** — they belong in `design.md`, never in the locked `req`. Putting a mutable section in the anchor recreates the two-scope-surfaces drift `req` exists to kill.
   - **Open Questions** stay in the idea or chat, **never in `req`** — this whole thread exists because an Open Question was treated as a deliverable; placing them in the most-authoritative, always-loaded, planner-cited doc maximally re-exposes that failure.

3. **Single authoritative scope surface.** `req` holds include / exclude / constraints; the idea body is narrative that may *reference* `req` but never restates it.

4. **Position in the chain — `req` is first, and it is dual-natured.** The promotion chain becomes `chat → req → idea → design → plan → implementation`.
   - *Birth order:* `req` is the first formal artifact, extracted from the chat opener, so every later node (idea included) is built against a locked spec instead of re-deriving it. The demo constraint lived in the chat opener and was lost on the very first promotion — authoring `req` first closes that gap.
   - *Cross-cutting load:* "loaded always" is not a chain position — it is a ctx-like property. `req` is **both**: created early **and** injected into every downstream action, anchoring all later transforms, not just the next one.
   - *Fills the thread-scope-ctx slot:* we decided earlier there is no thread-level ctx (global + weave only). `req.md` quietly fills that slot — the thread-scope always-loaded doc, but with authoritative-spec semantics instead of regenerable-summary semantics. No new concept.

5. **How `req` is filled — `{generate} req` from chat, user curates.** AI extracts the explicit includes / excludes / constraints from the chat (the *safe* kind of generation — constrained extraction, not the high-risk design→plan invention), producing `status: draft`; the user adds / deletes / edits; finalize → locked. Refine stays available if the source chat changes. AI proposes, human approves.

6. **Immutability = re-openable, not frozen-forever.** "Immutable once approved" means *can't silently drift*. To change scope you bump `version`, which marks downstream idea / design / plan **stale** — riding the existing refine / staleness machinery, no new enforcement concept.

7. **Representation carries stable IDs.** Each item gets a handle (`IN1`, `EX1`, `C1`) so promotion can cite it and diagnostics can track it individually.

8. **Verification is hybrid, and prevention beats detection.**
   - *Structural / coverage* — a pure deterministic reducer in `packages/core` (no AI, runs always): every `Included` ID has ≥1 covering plan step; no step cites or implements an `Excluded` ID; constraints carry through. It checks **scope traceability through the doc graph**, NOT functional correctness of the built code.
   - *Semantic* — an AI prompt for "did a step violate an exclusion / constraint phrased differently?" Runs as a **sampling** diagnostic in the VS Code extension; in a Claude Code CLI session the agent itself is the verifier (server→client sampling is blocked there). Two delivery paths, same logic — exactly like `generate`.
   - *Prevention* — have the planner **cite requirements as it generates** (`Excluded` / `Constraints` handed in as hard boundaries), so most verification collapses into the cheap structural check and the AI pass becomes a backstop, not the primary gate.

9. **The real cost is the planner-citation contract, not the reducer.** Plan steps have no field to cite requirements today. The feature must extend the plan-step schema (e.g. `satisfies: [IN1, IN2]`) and teach the planner to emit it; the structural check is only possible *because* steps carry cited IDs. The reducer itself is a trivial set-coverage comparison.

## Surface area

Touches and must be wired across: **core** (new `req` entity + pure structural reducer + plan-step `satisfies` schema), **app** (req use-cases, context-pipeline always-load, diagnostic wiring), **mcp** (`loom_create_req` / `loom_refine_req` / finalize + the `req` context resource + planner-citation in `generate`), and the **VS Code extension** (req tree node, generate/refine/finalize buttons, semantic-verifier sampling diagnostic).

## Remaining open questions (for the design)

- **Phasing.** Ship injected-only first (`req` doc + always-load + generate-from-chat — faithfulness via prompt, IDs designed in) and add planner-citation + structural reducer + semantic backstop as a second phase? Or one feature? The schema change is the heavy part.
- **Lock surface.** Explicit `finalize`/lock action vs status flipping on first downstream use; who bumps `version` and which button/UI surfaces the re-open gate.
- **Loose-fiber / pre-thread home.** With `req` first in the chain the thread case is covered, but a constraint stated before any thread exists (loose fiber at weave root) still needs a home until the thread forms.
- **Migration of existing scope prose** already written in idea / design bodies — migrate into `req`, or leave as narrative that references `req`?

## Status / sequencing

**Un-parked (2026-06-05).** The demo GIF shipped, so the design phase is open. The design direction above is settled; what remains are the design-level decisions in "Remaining open questions". The demo's Option A (explicit constraints stated verbatim in the chat opener) was the interim, spec-level workaround.

## Vision tie

Serves the vision promise that Loom makes the AI faithfully act on durable, user-authored intent — removing the manual step of re-stating constraints at every stage and re-checking that the AI didn't drift from what was asked.