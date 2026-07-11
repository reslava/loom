---
type: chat
id: ch_01KX97MJR6WWKDBWW5E67GV2Y0
title: quick-fix-lane Chat 001
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 7
---
# quick-fix-lane Chat 001

## Rafa:

read idea

about `do quick`
in my opinion include 2 cases:
- record the the implementation already done 
- implement pending task and record it

always imply some coding already done or pending

perhaps, to avoid any ambiguity, we could add some slang:
`code quick`:
1. implement pending task
2. `do quick`

## AI:

I think `code quick` resolves the open A-vs-B decision cleanly — better than either original option. Here's why, and the couple of things left to nail down.

**What your proposal actually does to the decision.** The idea framed it as one word forced to choose: does `do quick` stay pure record-only (A) or sometimes-implement (B)? Your move sidesteps that — it keeps `do quick` **pure record-only** (so A wins, the word never silently writes code) *and* gives a terse one-word path for the implement-then-record case by naming it separately. That's the best of both: (B)'s terseness without (B)'s meaning-drift, because the code-writing lives in its own deterministically-named word. This is exactly what slang is *for* — the reference says slang covers "ambiguous or multi-step verbs"; `code quick` is a two-step composite, `do quick` a single record verb.

**One framing nudge.** I'd keep the boundary crisp rather than say "`do quick` always implies some coding, done or pending." Cleaner to state it as: `do quick` / quick-ship is the **recording** verb — it records work that is *already done*. The coding is a separate act. `code quick` is then just the sugar for "do that separate act first, then record": `implement the pending change → do quick`. Keeping "record" and "write code" as distinct primitives is precisely what makes each word deterministic.

So the family is:
- `do quick` — record already-finished work as a one-shot DONE plan. **Never writes code.**
- `code quick` — implement the pending change we agreed in the chat, **then** `do quick`. Writes code.

**Three sub-points to settle so `code quick` is unambiguous:**

1. **What is "the pending task"?** In this lane there's no plan, so the task isn't a plan step — it's *the change agreed in the active chat* (the root cause + fix we just discussed). So `code quick` fires only when a chat is active and a concrete change has been agreed but not yet applied. Worth stating that trigger explicitly, or the word is under-defined.

2. **Stop-rule interaction.** `code quick` writes code, so it should behave like an explicitly-authorized run: implement → record without stopping *between* those two (you invoked the composite on purpose), but stop-rules 2 (error loop) and 3 (design decision surfaces mid-fix) still interrupt. Same treatment `do plan` gets.

3. **How it differs from `do step`.** `do step` implements within an *active plan* (`status: implementing`). `code quick` is the **plan-less** lane — the task lives only in the chat. That distinction is the whole reason the quick-fix lane exists, so it should be called out beside `do step` in the reference.

**Naming:** `code quick` parallels `do quick` (`{verb} quick` shape) — I'd keep it over `fix quick`/`quick fix`, because the lane isn't only for bug fixes (small features too), and "code" reads as the general implement verb.

If you're good with this, the settle-work is small and doc-only: add `code quick` to `loom-slang-reference.md` beside `do quick`, record the A-decision-plus-`code-quick` resolution in the idea, and update the idea's example chain — `"fix it, do quick, docs done, commit"` becomes `"code quick, docs done, commit"`. Want me to draft those edits, or is there anything about the two sub-triggers (what counts as "pending", stop behavior) you'd frame differently first?

## Rafa:

Agree all

But I am thinking in having 3 slang related word:
do quick
code quick: codebase, docs (loom + docs) touching + do quick
write quick: docs (loom + docs) touching + do quick

doubt: where CLAUDE.md lives? code or docs, in my opinion is code becuase affect behaviour, agree?

What do you think is worth to split in these 3 cases?

new slang words should laso be included in:
both CLAUDE.md surfaces: CLAUDE.md and LOOM_CLAUDE_MD template
<!-- rule:loom-slang -->

## AI:

Yes — I agree CLAUDE.md is "code," and I think the 3-way split is worth it, but let me sharpen *why*, because the sharpening also answers the CLAUDE.md question cleanly.

**What the code/write line really is.** The distinction that earns its keep isn't "which folder" — it's **what verification the recording is owed before `do quick` stamps it done**:

- `write quick` — a **prose-only** change (references, README, `docs/`, an idea/design's text). Correctness is a read-through; there's nothing to build or run. Fast lane, and it *honestly* claims no build — you don't want the agent implying it "verified" a README by compiling.
- `code quick` — any change whose correctness is **machine-checkable and owed**: source under `packages/**`, *and* a test-gated contract file. Runs the build + `test-all` + verify cycle, then records.
- `do quick` — record already-finished work; no implementation, no verification of its own.

So the fork the two words encode is exactly **"run the build+test+verify cycle, or not?"** That's the single most valuable thing to make explicit, because it's precisely what you don't want the agent *guessing* — slang exists to remove that guess. That's my answer to "is it worth splitting": **yes**, because most of Loom's own small work is pure docs, and giving that a fast, build-free lane while real code changes get the full cycle is a real win — for one extra word that stays mnemonic in the `X quick` family.

**Where CLAUDE.md lives → code, and here's the crisp reason.** CLAUDE.md is the one "doc" that is **test-gated**: `claude-md-sync.test.ts` asserts rule-marker parity + invariant tokens across `CLAUDE.md` ⇄ the `LOOM_CLAUDE_MD` template. So a CLAUDE.md edit *owes* a `test-all` run to prove the mirror didn't drift. Since `write quick` deliberately skips build/test, CLAUDE.md **cannot** be write quick — it must be `code quick`. Your instinct ("affects behaviour → code") lands in the same place; the test-gate is just the mechanical proof of it. Clean rule: **prose with no test gate → `write quick`; source or a test-gated contract file → `code quick`.**

**Two edges the definitions already handle:**
- *Touches both code and docs* → `code quick` (it's the superset — any code touch pulls in the full cycle). Your defs already say this.
- *`loom/refs/*.md` and `docs/*.md`* → `write quick` (prose, no test gate). Note this puts `loom-slang-reference.md` itself on the `write quick` side, but the `CLAUDE.md` + template edits that mirror the new words are `code quick` — so *adding these very words* is itself a mixed change → `code quick`. Nice self-consistent first example.

**On landing them in both surfaces** (your `rule:loom-slang` point): agreed and required. New words go in (1) `loom-slang-reference.md` (authoritative table), (2) the slang section of `CLAUDE.md`, and (3) the slang section of the `LOOM_CLAUDE_MD` template — the `<!-- rule:loom-slang -->` marker already exists on both surfaces, so parity is guarded by the sync test. One thing I'd want to check before writing: the template is deliberately terser and the test locks the *marker set* and *invariant tokens*, **not** the prose — so I need to confirm whether the template currently *enumerates* the slang words or just points at the reference, and mirror at the matching altitude rather than forcing a verbatim copy. And to reassure on scope: all of this stays **doc-only** — slang is pure composition of tools that already exist, so no `packages/**` engine code, even though `code quick`/`write quick` themselves are `code quick`-class edits (because they touch the test-gated contract).

Net: I'd lock it as `do quick` (record) · `write quick` (prose → do quick, no build) · `code quick` (source/contract → build+test+verify → do quick), with CLAUDE.md firmly in `code quick`. Want me to draft the reference + both-surface CLAUDE.md edits on that basis? If so I'll first read the current slang sections in all three files so the mirror is exact.

## Rafa:

I think it is all grounded, go 
note: when you are wording, framing, remind that slang is for all loom user kind of projects

## AI:

Done — `code quick` and `write quick` are landed across all three slang surfaces, framed generically for any Loom project (source code / your project's tests, not repo specifics), with the recursive `CLAUDE.md` keeping its repo-specific examples.

**What changed:**

1. **`loom/refs/loom-slang-reference.md`** (authoritative, bumped v1 → v2):
   - Reframed the namespace section into two families — `do {target}` (plan execution: `do step`/`do steps`/`do plan`) and the **`{act} quick` family** (`do quick`/`code quick`/`write quick`), where the leading verb declares the act preceding the record and `do quick` is the shared pivot.
   - Added `code quick` / `write quick` rows to the vocabulary table and explicit chains.
   - New section **"`code quick` vs `write quick` — which act is it?"** stating the split axis = *what verification the record is owed* (build/test/verify or not), with the two hard rules: any source touch → `code quick` (superset); a test-gated contract file → `code quick` even if it's "just markdown."
   - Stop-rule alignment: `code quick`/`write quick` run implement→record without stopping, but error-loop and design-decision rules still interrupt.

2. **`CLAUDE.md`** (recursive) and 3. **`LOOM_CLAUDE_MD` template** (`packages/app/src/installWorkspace.ts`): mirrored the two new bullets under the `<!-- rule:loom-slang -->` marker — recursive names the repo specifics (`build-all`/`test-all`, `claude-md-sync.test.ts` as the gate that makes `CLAUDE.md` a `code quick`); template stays generic ("a file your project's tests validate").

**Verified** (this edit is itself `code quick` — it touched the test-gated contract): `build-all` clean → `claude-md-sync.test.ts` green (17 shared rule ids match, all 12 invariant tokens present) → full `test-all` **23/23 passed**. So the marker parity the sync test guards holds with the new words in.

**Remaining settle-work, for your call** — all doc-only:
- **Update this thread's idea** to record the resolution: `do quick` = record-only (option A), plus the `code quick`/`write quick` split; and swap the example chain `"fix it, do quick, docs done, commit"` → `"code quick, docs done, commit"`. (The idea still poses the open A-vs-B question and the old example.) This one goes through `loom_patch_doc`/`loom_update_doc` since it's a loom doc.
- **`docs/WAYS-TO-USE-LOOM.md`** — the idea's success criteria name it as a second home for the quick-fix-lane recipe (way ① Guided / small projects). Not touched yet; worth a short section?
- **Comma-chaining** (`code quick, docs done, commit`) — documented in the idea but not yet stated as supported in the reference. Want a one-line note added?

Say the word and I'll do the idea patch + whichever of the other two you want; then this is a clean `code quick`/`docs done`/`commit` of its own.

## Rafa:

- Update this thread's idea
- `docs/WAYS-TO-USE-LOOM.md`. Yes 
- Comma-chaining. Yes, add a one-line note

docs done
commit

## AI:

All three follow-ups done, then recorded and closed:

- **Idea** — settled the open decision (`do quick` = record-only; `code quick`/`write quick` = implement-then-record, source vs prose) and refreshed the example chain + success criteria.
- **`docs/WAYS-TO-USE-LOOM.md`** — added the two new words to the slang table and a **"quick-fix lane"** recipe subsection (chat → `read` → `code quick`/`write quick` → `docs done, commit`).
- **Reference** — added the one-line comma-chaining note.

**Recorded via `write quick`** — since the thread had no plan, `loom_quick_ship` minted `plan-001` as a one-shot DONE plan (4 steps + done doc) capturing the whole change. Then **`docs done`**: idea + this chat set to `done` (no other plans to guard; the quick-shipped plan is DONE by construction). Committing last.

**Nice dogfooding datapoint:** the very first real use of the new vocabulary landed right on the `code`/`write` boundary — you reached for `write quick`, but the batch had already touched `installWorkspace.ts` (template source) and `CLAUDE.md` (a test-gated contract), which our own rule classifies as `code quick`, so I'd already run build + `test-all` (23/23) last turn. That the boundary *bit on its first use* is evidence the split is real and worth having — the word you pick genuinely determines whether a verification run is owed. The record stands on verified work regardless of which word named it.