---
type: chat
id: ch_01KT7NF7PENCVA1N4NTZ2DTNE8
title: requirements-driven-development Chat
status: active
created: 2026-06-03
version: 1
tags: []
parent_id: null
requires_load: []
---
# requirements-driven-development Chat

## Rafa:

I think we could have a new type of loom doc `rdd.md`.
Option, one per thread: {weave}/{thread}/rdd.md

with this frontmatter:

```markdown
---
type: rdd
id: rd_01KT7NF7PENCVA1N4NTZ2DTNE8
title: demo RDD
status: draft | active
created: 2026-06-03
version: 1
---
```

this body:

```markdown
### ✅ Included 
- User registration with email/password.
- Login flow with session management.
- Password reset via email link.
- API rate limiting (100 req/min).

### ❌ Excluded 
- **Social Login:** Google/Facebook auth (Phase 2).
- **UI Styling:** Color palette, typography, and layout (Design System handles this).
```

### How it works
This doc should be injected in any AI action relative to the thread with a note similar to:
`This section is immutable once approved. It defines what we build and what we don't.`

### Questions

This is only a draft of possible approach
Tell me what you think
Better approach? Suggestions?
You think is enough or should we expand to more complex idea?

## AI:

**Vision tie first:** this serves the vision promise that Loom makes the AI *faithfully act on durable, user-authored intent* — it removes the manual step of re-stating constraints at every promotion and re-checking the AI didn't drift. So it's on-vision. Good.

**Verdict on the shape:** I like the dedicated doc-type over the alternatives in the idea's open question #1 (a field on the idea, or prose in the body). Two reasons:

1. **Structured include/exclude lists are parseable.** Buried-in-prose scope is exactly what failed in the demo — "no interaction testing" was in the opener and got lost because nothing held it in a machine-readable place. Bullets under `✅ Included` / `❌ Excluded` give us a surface a diagnostic can actually check.
2. **A separate doc gives an immutable anchor to verify against.** You can't verify faithfulness against narrative that's allowed to evolve. A frozen RDD is the fixed reference point.

**But here's the one decision that drives everything else — and I'd settle it before any other detail:**

> Is RDD **injected-only** (we paste it into every AI action and trust the prompt), or **machine-verified** (a diagnostic checks each requirement survived into the plan)?

The idea doc lists verification as a goal ("diagnostics that flag dropped or invented scope between stages"). If we want that, plain bullets aren't quite enough — each requirement needs a stable handle so a diagnostic can say *"REQ-3 (no smoke test) violated by plan step 4."* That's a small change to your body — e.g.:

```markdown
### ❌ Excluded
- `EX1` **Interaction testing** — no manual smoke-test steps.
- `EX2` **Social login** — Google/Facebook auth (Phase 2).
```

If RDD is injected-only, your exact draft is enough and I would *not* add more. The cost/value fork is entirely on this axis. My lean: start injected-only (cheap, ships the faithfulness win immediately), design the IDs in now so verification is a later additive step, not a rewrite.

**:**

- **Immutability = re-openable, not frozen-forever.** "Immutable once approved" should mean *can't silently drift*, not *can never change*. Real scope changes. Model it as: approve → locked; to change it you bump `version`, which marks downstream idea/design/plan **stale** — that's exactly the existing refine/staleness machinery. So immutability rides on the model we already have, no new enforcement concept.

- **Naming.** A flat `rdd.md` per thread (no `{thread}-` prefix) is actually consistent with how `ctx.md` is flat-per-scope — fine, just call it out so it doesn't look like a convention break. Behaviorally RDD is close to ctx (auto-loaded, scope-level), but it's *authoritative spec*, not a summary — worth keeping distinct so nobody treats it as regenerable.

- **Relationship to the idea.** An idea already carries "success criteria / scope." If RDD also holds scope, we've created two scope surfaces — the drift risk RDD exists to kill. Resolve it explicitly: **RDD is the authoritative, immutable include/exclude; the idea body is narrative that may *reference* RDD but never restates it.**

**On "enough, or expand to something more complex?":** Don't expand the doc *shape* — the include/exclude body is the right minimalism, and bloating it reintroduces the prose problem. The only axis worth expanding is verification (the IDs above). Keep the body dead simple; put the intelligence in the diagnostic, not the document.

One open thread of my own: the demo failure originated at the **chat opener** — pre-thread, before any RDD could exist. One-per-thread is the right home for the durable artifact, but worth a line in the design about how a loose-fiber/early constraint gets captured into RDD when the thread forms.

**Caveat:** the idea doc parks this until after the demo GIF launches. So treat this as design thinking to bank, not a build-now — I'm not proposing we implement.

Next: if you want, I can fold the injected-vs-verified fork + the ID'd-requirement representation into the design phase as the lead open question.

## Rafa:

Agreed with your 3 smaller points

### Questions:
Could we genertate a rdd.md doc from a chat that describe them through AI with an specific prompt that get includes / excludes from chat? And then reviewed and update by User or refine by AI?

Or should rdd.md filled just by user?

I prefer AI extract it from chat and user review, add, delete point

### RDD machine-verified
If we finally implement this diagnostic that checks each requirement survived into the plan, it will be verified by AI with an specific prompt?

## AI:

**Q1 — AI extracts from chat, user reviews. Yes, and it needs no new concept.**

What you're describing *is* the canonical loop applied to a new target: `chat → {generate} rdd → {refine}`. RDD just becomes another generate node in the graph:

- **Generate RDD** reads the chat (the opener especially) and extracts the explicit `Included` / `Excluded` items → produces `status: draft`.
- **User curates** — adds, deletes, edits points. The human stays the *approver*; AI proposes, human disposes.
- **Finalize/approve → locked** (the immutable anchor we agreed on).
- **Refine** stays available if the source chat changes.

AI-extract beats user-only on vision grounds: user-only just relocates the "user must remember to re-state constraints" failure mode. AI does the extraction (removes the manual step), user does the judgment (keeps authorship).

One thing worth naming: the extraction prompt is faithfulness-critical *but it's the safe kind of generation*. Pulling an explicit "no smoke test" out of a chat into an `Excluded` bullet is constrained extraction — very different from the high-risk transform (design → plan) that invented scope in the demo. And once RDD is locked, it's the thing that *anchors* those risky downstream transforms. So generating-from-chat is both the right entry point and the low-risk one.

**Q2 — "verified by AI with a specific prompt?" — It's a hybrid, and the split is the architecture.**

Don't make it all-AI. Two kinds of check, two mechanisms:

1. **Structural / coverage — pure code, no AI, runs always.** If requirements carry stable IDs (the `EX1`/`IN1` handles) and we make the planner *cite* which requirements each step advances, then a deterministic diagnostic can check: every `Included` ID has ≥1 covering step; the RDD was actually present in context; no step is tagged to an `Excluded` ID. This is a pure reducer/diagnostic — fits "reducers stay pure," cheap, deterministic.

2. **Semantic — needs AI.** "Did step 4 secretly violate `EX1` (no smoke test) while phrasing it differently?" — that's a judgment no string match catches. *That* part is the AI-with-a-specific-prompt: given locked RDD + generated plan, flag steps that implement an excluded item or inclusions with no covering step.

**Two architecture flags on the semantic part:**

- **Sampling constraint.** An AI verifier from the MCP server is a *sampling* call (server→client). Per our setup, sampling works in the **VS Code extension** but is **blocked in Claude Code CLI sessions** (returns MethodNotFound — the CLI session is already the AI, recursive inference isn't supported). So the semantic verifier lives where sampling lives: extension does it as a sampling diagnostic; in a CLI session the *agent itself* is the verifier (reads RDD + plan, judges directly). Same logic, two delivery paths — exactly like generate already works.

- **Prevention beats detection.** The strongest version isn't post-hoc verification at all — it's making the planner *cite requirements as it generates* (each step tags the `Included` reqs it advances; `Excluded` reqs handed in as hard boundaries). Then most verification collapses into the cheap structural coverage check, and the semantic AI pass becomes a lighter backstop instead of the primary gate. Catching drift is good; not producing it is better.

So my answer to your literal question: **partly yes** — the semantic check is an AI prompt — but the system shouldn't lean on it. Make IDs + citation carry the deterministic load, use AI only for the judgment that genuinely needs it, and prefer prevention (planner cites reqs) over detection.

These are design-phase decisions (representation with IDs, planner-citation contract, where the verifier runs). Still parked behind the demo GIF per the idea, so I'm banking them, not building.

Next: I can capture this whole fork — generate-from-chat + hybrid verification (structural/deterministic vs semantic/sampling) + prevention-via-citation — as the structured open questions for the design doc when you un-park this. Say `go` if you want that.

## Rafa:

Doubt about Structural / coverage — pure code, no AI, runs always (line 131). That means we need to code handles/reducers to verify if requirements are accomplished? AI will code them? Language? 

## AI:

Good doubt — and it hides an important ambiguity in the word "accomplished." Let me split it.

**First, what the structural check actually verifies — and what it does *not*.**

It does **not** verify that requirements are *truly accomplished in the software* (that the code really does rate-limit at 100 req/min). It verifies **scope traceability through the doc graph**:

- every `Included` requirement has ≥1 plan step that cites it (nothing was dropped on promotion), and
- no plan step cites — or implements — an `Excluded` requirement (nothing invented).

So it answers *"did the plan faithfully honor the includes/excludes?"* — which is the entire RDD problem — **not** *"does the built code work?"* That second question is normal testing, a separate concern RDD doesn't touch. Even the AI/semantic check stays at plan↔RDD faithfulness, not runtime behavior. Important to keep that boundary clean.

**Now your literal questions:**

- **Do we code reducers for this?** Yes — but **once**, generically, in the engine. It's a single pure function in `packages/core`: `(rdd requirements, plan steps with their cited req IDs) → coverage diagnostics`. No IO, no side effects → fits the "reducers stay pure" rule. It then runs automatically on *every* thread's RDD. We are **not** generating per-thread verification code — the `EX1`/`IN1` handles are just *data in the RDD doc body*; the reducer is generic and reads whatever IDs it finds.

- **Will AI code it?** Yes, as normal Loom feature work — when this thread is un-parked, gets a plan, and you DoStep it. Same way every other diagnostic was built. It's a *new diagnostic in the existing diagnostics system* (alongside stale-detection, blocked-steps), not a new infrastructure category.

- **Language?** TypeScript, like the rest of Loom — `packages/core` for the pure check, wired through `app`/`mcp` like the other diagnostics.

**The honest cost — and it's not the reducer.** The check itself is trivial (a set-coverage comparison). The real work it *depends on* is the **planner-citation contract**: plan steps currently have no field to cite which requirements they advance. So part of this feature is extending the plan-step schema to carry something like `satisfies: [IN1, IN2]`, and teaching the planner to emit it. Without that linkage there's nothing structural to compare — the deterministic check is only possible *because* steps carry cited IDs. That schema/contract change is the actual design weight here; the reducer is the easy part.

So: deterministic code, written once in TS by AI as a normal step, checking doc-graph scope faithfulness (not functional correctness), gated on adding requirement-citation to plan steps.

Still parked behind the demo GIF — banking this, not building.

Next: say `go` and I'll fold this (scope-faithfulness boundary + generic reducer + planner-citation schema change as the real cost) into the design open questions.

## Rafa:

Now I have clear vision of what you mean
Go

## AI:

Done — banked into `requirements-driven-development-idea.md` (version bumped). I kept the idea **parked** (not opening the design phase, per the demo-GIF gate) and instead enriched its capture so the design doc starts loaded:

- Replaced the four generic open questions with a **"Design direction (settled in chat-001)"** section — the 7 conclusions we reached: dedicated `rdd` doc-type (flat `rdd.md`, ctx-adjacent but authoritative), single scope surface, generate-from-chat + user-curate, re-openable immutability via version-bump/staleness, stable `IN`/`EX` IDs, hybrid verification (deterministic structural vs sampling-based semantic, prevention via planner-citation), and the planner-citation schema change as the real cost.
- Kept a tighter **"Remaining open questions"** set — pre-thread/loose-fiber capture, locking mechanics, verifier surface parity, and migration of existing scope prose.
- The Status section now notes the direction is settled enough to start the design doc the moment it's un-parked.

Next: nothing pending — un-park when the demo GIF is out and say the word; I'll spin the design doc from the banked direction.