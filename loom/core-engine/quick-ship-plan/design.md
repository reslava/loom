---
type: design
id: de_01KWJD3J9MB1XC6XE32QXWDWGA
title: Quick-ship — one-call recorder that mints a done plan
status: done
created: 2026-07-02
version: 1
idea_version: 1
tags: []
parent_id: id_01KVACCC86E0B0EKACG6HH0DT4
requires_load: []
---
# Quick-ship — one-call recorder that mints a done plan

## Vision anchor

Serves the **roadmap / versioned-history** surface (the one Rafa finds "very useful"). Removes the manual four-call chore — create plan → start → complete each step → close — that fast fixes skip today, which is why real work (e.g. v1.9.2) ships without leaving a `current_release`-bearing done plan.

## Core model

Quick-ship is a **post-hoc recorder of already-done work**. It never implements code — implementation is always normal agent work with real tools. Quick-ship only turns a description of *completed* work into a done plan.

This is what makes it honest **by construction**: it has no power to do work, so it can only record work that already exists. That sidesteps the false-step-4 hallucination class (a "DoStep" that marks done without observable implementation).

**The invariant — the whole reason it stays simple:**

> Quick-ship always produces **exactly one new done plan**, and **never touches an existing plan**.

Every design decision below falls out of that one sentence.

## The tool

`loom_quick_ship` — a single MCP tool that composes existing primitives end-to-end, in one call:

1. `create_plan` — a plan whose steps are the description(s)
2. `start_plan` — → `implementing`
3. `complete_step` — one per step (all marked done at once; the work is already done)
4. `append_done` — write `{plan-id}-done.md`
5. `close_plan` — → `done`

No new doc type. No hand-authored plan body — the `## Steps` table is generated as usual.

### Interface — two branches (the only real branch)

The timing axis (already-done vs. do-it-then-record) **collapses**: by the time the tool is called the work is done either way, so both use the same call. The only genuine branch is *where the done plan lands*:

- **Existing thread (case a):**
  `loom_quick_ship({ weaveId, threadId, description })`
  Mints a new done plan in that thread. Works whether or not the thread already has an active plan — a side fix that arises mid-implementation becomes `plan-002.md` (done) alongside `plan-001.md` (implementing). Nothing special needed.

- **New thread (case b):**
  `loom_quick_ship({ weaveId, newThread: { slug, title }, description })`
  Creates the thread (`thread.md`, `th_` ULID, default priority, no deps) **and** the done plan in one call. A thread with only a done plan — no idea, no design — is the correct minimal shape for "work that deserves a history entry but not the idea+design ceremony," not a malformed thread. Case (b) is likely the *most common* quick-ship scenario (standalone small fixes have no home thread) and the one with the most manual ceremony today.

### `description`: `string | string[]`

- Single string — the 90% path, dead simple: `loom_quick_ship({ weaveId, threadId, description: "fixed X" })` → one done step, no body.
- Array — the short-list path: each entry becomes one done step.

**No numeric cap.** Once steps are just documentation of already-done work (nothing is executed step-by-step), granularity is fidelity, not execution control. A cap of 3 would be arbitrary and wouldn't enforce the real "trivial vs. planned" line anyway (you can mark one undone step done just as easily as eight). The tool's one-shot ergonomics are the natural governor — nobody hand-types a 10-item array.

Each description must read as **completed work** ("add retry to fetch" ✓, "TODO: add retry" ✗), since it lands as a *done* step.

## Scope boundaries (explicit non-goals)

- **Never edits an existing plan.** A side task that belongs *in* the current plan's goal is `loom_add_step` (+ DoStep + `complete_step`), not quick-ship. Quick-ship only ever mints a fresh done plan.
- **No "do the work" mode.** "Not yet done" is handled by implementing normally, then quick-shipping. Baking implementation in would duplicate DoStep and reopen the false-done risk.
- **No new doc type.** Convenience over existing primitives only.
- **Does not change the "history = done plans" model** or `actual_release` semantics. A quick-shipped plan carries `actual_release: null` until `loom record-release` stamps it at release time — same as any done plan.
- **Possible future sibling, out of scope:** a one-call "add an already-done step to the *current* plan" (`quick-step`). Distinct affordance, not a mode of quick-ship. Build only if the pain proves real.

## Architecture / layering

- An **app use-case** `(input, deps) => result` that composes the existing plan/thread use-cases. No new IO primitives.
- Exposed as the MCP tool `loom_quick_ship`. CLI command and extension button are **thin callers** of the same use-case, added later.
- Follows the dependency rule `cli / vscode / mcp → app → core + fs`; reducers stay pure (the compose sequence runs as ordered `runEvent`s in the use-case, not inside a reducer).

## Open questions for the plan

- **Plan title / goal derivation** from the description (single line → `goal`; list → a short title + steps?).
- **New-thread defaults:** priority value, and whether `weaveId` is required or defaulted.
- **Idempotency / surface order:** confirm MCP primitive first, CLI + button deferred to follow-up plans.
