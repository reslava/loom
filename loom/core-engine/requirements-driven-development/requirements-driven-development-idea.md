---
type: idea
id: id_01KT77TXDA9H80GMW62NY0GD7B
title: Requirements-Driven Development
status: draft
created: "2026-06-03T00:00:00.000Z"
updated: 2026-06-03
version: 2
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

## Concept — Requirements-Driven Development (RDD)

Let the user declare, in a clear and structured way, what a thread's workflow should **include** and **exclude** — and guarantee those requirements are carried faithfully through every promotion (chat → idea → design → plan → done). The generator's job is *faithful translation of the spec*, never imposition of policy:

- It must **carry** every user-stated inclusion and exclusion through each stage without silently dropping them.
- It must **not invent** scope absent from the spec (Open Questions ≠ deliverables).
- No step-count rule, no banned-step list. Neutral faithfulness, not restriction — equally serving the user who *wants* a smoke-test and the user who explicitly *doesn't*.

## Goal

A mechanism for explicit, structured requirements (includes/excludes) on a thread that propagate verifiably through the whole workflow, so the plan reflects exactly what the user asked for — no more, no less.

## Design direction (settled in chat-001)

Banked from `chats/requirements-driven-development-chat-001.md` so the design phase starts from these, not from scratch:

1. **Doc shape — a dedicated `rdd` doc-type, one per thread.** Flat `rdd.md` (no `{thread}-` prefix), consistent with how `ctx.md` is flat-per-scope. Behaviorally near ctx (auto-loaded, scope-level) but it is **authoritative spec, not a regenerable summary** — keep it distinct so nobody treats it as throwaway. Body is the minimal `✅ Included` / `❌ Excluded` lists; the intelligence lives in the diagnostic, not the document.
2. **Single authoritative scope surface.** RDD holds the include/exclude; the idea body is narrative that may *reference* RDD but never restates it. This kills the two-scope-surfaces drift RDD exists to prevent.
3. **How RDD is filled — `{generate} rdd` from chat, user curates.** AI extracts the explicit includes/excludes from the chat (the *safe* kind of generation — constrained extraction, not the high-risk design→plan invention), producing `status: draft`; the user adds / deletes / edits; finalize → locked. Refine stays available if the source chat changes. AI proposes, human approves.
4. **Immutability = re-openable, not frozen-forever.** "Immutable once approved" means *can't silently drift*. To change scope you bump `version`, which marks downstream idea/design/plan **stale** — riding the existing refine/staleness machinery, no new enforcement concept.
5. **Representation carries stable IDs.** Each requirement gets a handle (`IN1`, `EX1`) so promotion can cite it and diagnostics can track it individually.
6. **Verification is hybrid, and prevention beats detection.**
   - *Structural / coverage* — a pure deterministic reducer in `packages/core` (no AI, runs always): every `Included` ID has ≥1 covering plan step; no step cites or implements an `Excluded` ID. It checks **scope traceability through the doc graph**, NOT functional correctness of the built code.
   - *Semantic* — an AI prompt for "did a step violate an exclusion phrased differently?" Runs as a **sampling** diagnostic in the VS Code extension; in a Claude Code CLI session the agent itself is the verifier (server→client sampling is blocked there).
   - *Prevention* — have the planner **cite requirements as it generates** (`Excluded` reqs handed in as hard boundaries), so most verification collapses into the cheap structural check and the AI pass becomes a backstop, not the primary gate.
7. **The real cost is the planner-citation contract, not the reducer.** Plan steps have no field to cite requirements today. The feature must extend the plan-step schema (e.g. `satisfies: [IN1, IN2]`) and teach the planner to emit it; the structural check is only possible *because* steps carry cited IDs. The reducer itself is a trivial set-coverage comparison.

## Remaining open questions

- **Pre-thread / loose-fiber constraints.** The demo failure originated at the *chat opener*, before any thread or RDD existed. How does an early constraint get captured into RDD when the thread later forms — carried forward from the loose fiber, or re-extracted at thread creation?
- **Locking mechanics.** The exact status model for approve→locked and the re-open gate: who bumps `version`, and what button/UI surfaces it.
- **Semantic-verifier surface parity.** Is it acceptable that CLI sessions verify via the agent while the extension uses sampling, or do we want a single shared path?
- **Relationship to existing scope-exclusion prose** already written in idea/design bodies — migrate it into RDD, or leave it as narrative that references RDD?

## Status / sequencing

Parked for deeper design **after the demo GIF launches** (per Rafa, 2026-06-03). This idea is the durable capture so the thinking isn't lost; the demo's Option A (explicit constraints stated verbatim in the chat opener) is the interim, spec-level workaround and is already shipped. The design direction above is settled enough to start the design doc the moment this is un-parked.

## Vision tie

Serves the vision promise that Loom makes the AI faithfully act on durable, user-authored intent — removing the manual step of re-stating constraints at every stage and re-checking that the AI didn't drift from what was asked.