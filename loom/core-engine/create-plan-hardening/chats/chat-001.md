---
type: chat
id: ch_01KV94E3XREDD6ZSXXPDDNNQQV
title: create-plan-hardening Chat
status: done
created: 2026-06-16
updated: 2026-06-16
version: 2
tags: []
parent_id: null
requires_load: []
last_ai_block: 5
---
# create-plan-hardening Chat

## Rafa:

Read the idea. That happens when you tried to create a plan from terminal CLI.
We need to ensure AI always create a well formed plan, even from CLI.


## AI:

Read the idea + traced the code (`packages/mcp/src/tools/createPlan.ts` → `packages/app/src/weavePlan.ts`). The root cause is **not quite what the idea hypothesized** — and that changes the fix. Worth nailing down before we write anything (idea's own success criterion: confirm the cause first).

### What actually happened

The idea guesses "`steps` arrived as a stringified JSON blob." But the observed symptom — `</goal>` **and** `<parameter name="steps">[…]` leaking *into the Goal section of the body* — points somewhere else. That XML is the model's raw tool-call **wire format**. The signature reads as:

- The whole garbled blob (`…goal text…</goal><parameter name="steps">[…]`) landed in the **`goal`** argument.
- **`steps` was never parsed as a separate argument → `args['steps']` was `undefined`.**

Trace that through the code and it explains *both* symptoms exactly:
- `weavePlan` line 91: `buildStructuredSteps(input.steps ?? [])` → `undefined ?? []` → `[]` → `steps: []` in frontmatter. Silent.
- line 92: `serializePlanBody(planSteps, { goal: input.goal })` faithfully renders the wire garbage that's sitting in `goal` into the `## Goal` section.

So Loom didn't drop anything — it **faithfully serialized a malformed tool call**. The corruption originated upstream (model emitted a bad call / harness arg-parse boundary failed), and Loom had no guard to notice.

Note: the idea's "stringified `steps`" variant is a *different* failure (and `createPlan.ts:43` `args['steps'] as any[]` — a cast, not a runtime check — would let it through too; a string would then blow up on `.map` in `buildStructuredSteps`). Both are real; they need different guards.

### What "always create a well-formed plan, even from CLI" can actually mean

We can't reconstruct the agent's intent from a garbled call — so the honest guarantee isn't "always produce a good plan." It's: **always produce a well-formed plan OR fail loudly; never silently persist a corrupt one + return success.** A create tool that drops its payload and returns `{id, filePath}` success is the worst case — that's the real bug.

### Guards, ranked by whether they catch *this* failure

1. **Wire-marker leak detection (catches the observed failure).** Before write, if `goal`/`title` contains `</goal>`, `<parameter name=`, `</parameter>`, `<invoke`, etc. → hard error. Unmistakable signature, zero false positives in real prose.
2. **Coerce stringified `steps` (catches the *other* variant).** If `steps` is a string, `JSON.parse` it; on failure, error — never cast-and-pray.
3. **Runtime step validation.** Each step must be an object with a non-empty `description` (the inputSchema's `required` isn't enforced at runtime when args bypass host validation). Reject otherwise.
4. **Post-write length assert** (idea candidate #3) — keep as belt-and-suspenders, but note it does **not** catch the observed case: input had no `steps`, so `input.steps.length === frontmatter.steps.length === 0` passes vacuously. It only catches mid-pipeline drops, which aren't what bit us.

### Where the guard lives — this is the "even from CLI" answer

Put it in **`weavePlan` (app layer)**, not in the thin `createPlan.ts` MCP tool. CLI → app, MCP → app, extension → MCP → app — so a guard in the app use-case covers *every* surface, including the bare CLI path. A guard in `createPlan.ts` would protect only the MCP surface. This is the architecturally correct home and it's exactly what "even from CLI" requires.

### One decision for you (affects API shape)

Should `weavePlan` **throw** on these (consistent with a create op — the MCP tool surfaces it as a tool error), or return a structured `{ error }` result? I lean **throw** — simplest, and a corrupt plan should be impossible to ignore. Your call.

If you agree on the cause + the throw-on-leak shape, I'd draft a design (or go straight to a plan since the idea's tight) with: leak-detect → coerce-string-steps → validate-steps → write, plus regression tests for the wire-leak and stringified-steps cases.

Next: waiting for your go on (a) the corrected root cause and (b) throw vs. structured-error.

## Rafa:

(b) throw
do the fix

## AI:

Done — throw-on-malformed shipped in the **app layer** (`packages/app/src/weavePlan.ts`), so every surface (CLI, MCP, extension) inherits it. Full suite green (17 passed).

**What changed**

- **`assertNoWireLeak(field, value)`** — rejects `goal`/`title` containing tool-call wire markers (`</goal>`, `<parameter …>`, `<invoke>`, `<function_calls>`, incl. `antml:`-namespaced). This is the guard that catches the *observed* failure: the malformed call had the wire blob in `goal`, and we now refuse to serialize it into the body.
- **`coerceSteps(raw)`** — normalizes `steps` at the boundary: a JSON string is `JSON.parse`d (unparseable → throw), non-array → throw, and each item must be an object with a non-empty `description` → else throw. No path can silently degrade a non-empty input to `steps: []`.
- Wired both into `weavePlan` before any write; replaced both `buildStructuredSteps(input.steps ?? [])` call sites with the validated array.
- `createPlan.ts`: dropped the lying `as any[]` cast (typed `… | string` now); the app boundary owns coercion.

**Regression test** — `tests/create-plan-hardening.test.ts` (registered in `test-all.sh`), 7 cases: wire-leak in goal (asserts **no file written**), wire-leak in title, stringified-but-valid steps coerced, unparseable steps string, non-array steps, step missing description, and the clean happy path.

**One thing I corrected along the way:** `tests/req-usecases.test.ts` was calling `weavePlan({ … steps: ['do a thing'] })` — a bare *string* array. That was never a supported shape; the old `s.description ?? ''` silently turned it into a step with an empty description, and the test only checked `req_version` so it never noticed. Exactly the silent-degradation this hardening kills. Fixed it to the proper `[{ description: 'do a thing' }]`.

**Note on the idea's candidate #3 (post-write length assert):** I deliberately left it out. It can't catch the observed failure — `steps` arrived `undefined`, so `input.length === frontmatter.length === 0` passes vacuously. The wire-leak + coercion guards are what actually close the hole; a length assert would be dead weight here. Flagging in case you want it anyway as defense-in-depth.

Next: this resolves the idea — want me to (a) mark the idea done / archive it, or (b) leave it and move on? Nothing is committed yet.

## Rafa:

thread has no plan and its done, so do not appear in roadmap history
create a minimal post plan, mark all done

commit push

## AI:

Done.

- Created a minimal plan `create-plan-hardening-plan-001` (3 steps: confirm root cause → add guards → regression tests), started it, marked all 3 done → plan auto-completed to **done**, so the thread now shows in roadmap history.
- Completing the plan auto-marked the idea **done (v2)** — the thread is fully resolved.
- Committed `df470ba` (`fix(app): harden loom_create_plan against malformed agent calls`) and pushed to `main`. Left the unrelated `core-purity-chat-001.md` change unstaged.

Closing this thread. `close` whenever you're ready, or open another chat.