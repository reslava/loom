---
type: idea
id: id_01KVACCC86E0B0EKACG6HH0DT4
title: "Quick-ship: a one-action done plan so fast fixes land in versioned history"
status: draft
created: 2026-06-17
version: 1
tags: []
parent_id: null
requires_load: []
---
# Quick-ship: a one-action done plan so fast fixes land in versioned history

## What

A single affordance that creates a minimal 1-step plan, starts it, marks the step done, and writes the done-doc — in one action. So a quick fix can become a *done plan* (the unit roadmap history and `actual_release` key on) without the full create → start → step → close dance.

## Why it matters

Roadmap history and the release version (`actual_release`) live on **done plans only** (see [[roadmap-release-version-idea]]). That is the right single carrier — but it means a thread that ships with only a chat or only an idea is **invisible** to versioned history. The backfill made this concrete: v1.9.2 shipped real work yet derives no `current_release` entry because nothing in it left a done plan, and several same-day fixes collapsed onto one tag.

Today the friction to leave a done plan (create plan with steps → start → complete each → close) is high enough that fast fixes skip it. Quick-ship removes that friction so "to be in versioned history, leave a done plan" is a one-click rule, not a chore.

## Sketch (for design to settle)

- One affordance — an MCP tool (e.g. `loom_quick_ship`) and/or a CLI command / extension button — that takes a thread + a one-line description, and: creates a 1-step plan (the step = the description), starts it, completes the step (auto-done), and appends the done-doc. The plan body is the generated 1-step table; no hand-authored body.
- **No new doc type.** A 1-step plan already has no hand-authored body — quick-ship is a *convenience over existing primitives* (create_plan + start + complete + append_done), not a new artifact. Keep doc types minimal.
- Result: the thread now has a done plan → it appears in roadmap history and can carry `actual_release` at release time.

## Explicit non-goals

- Not a replacement for real multi-step plans — quick-ship is for genuinely small work that still deserves a history entry.
- Does not change the "history = done plans" model; it makes that model cheap to satisfy.

## Success criteria

- A fast fix becomes a done plan in one action (one MCP tool call / one CLI command / one button).
- That plan appears in `loom roadmap` history and is stampable by `loom record-release`.
- No new doc type; the affordance composes existing create/start/complete/append primitives.

## Open questions for design

- Surface(s): MCP tool only, or also CLI + extension button? (Lean: MCP tool as the primitive, CLI + button as thin callers.)
- Does it auto-finalize/`start` the plan, or leave status choices to the caller? (Lean: fully done in one call — that is the point.)
- Step granularity: always exactly one step, or allow a short list?
