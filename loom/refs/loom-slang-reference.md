---
type: reference
id: rf_01KX95R2202FGMYCYN64STHSKA
title: "Loom slang"
status: active
created: 2026-07-11
version: 1
tags: []
parent_id: null
child_ids: []
requires_load: []
slug: loom-slang
description: "Canonical User→AI verb protocol: the small set of loom words (read, reply, do quick, do step/steps, do plan, docs done), each with its trigger context and exact tool/command mapping."
---
# Loom slang — a canonical User→AI verb protocol

A small, canonical set of **loom words** — short verbs the user says to the AI, each mapping **deterministically** to exactly one CLI command / MCP tool / resource, **or a fixed multi-tool sequence**. One word → one known action, so the user never memorizes tool names and the AI never guesses meaning from phrasing.

This doc is the canonical table. It is referenced by the AI session contract (`CLAUDE.md` and the installed `.loom/CLAUDE.md`), so every Loom AI treats these words as canonical.

## What slang is — and isn't

A word earns slang status **only if** it is **(a)** ambiguous English (fires only in a defined context) **or** **(b)** expands to a fixed multi-tool chain. Any capability with a clean, self-naming command gets **no slang** — the command name already tells the user what to say and the AI what to run (e.g. "set status done for {path}" → `loom set-status` / `loom_set_status`). As command names sharpen, the slang set *shrinks*, not grows. Discovery of the full surface is the job of `loom://catalog`, not slang.

## The `do` execution namespace

`do {target}` is the **execute family** — `do quick`, `do step`, `do steps`, `do plan`. "do" is never an accidental bare English word, so it is the collision-safe home for execution verbs, and any *future* execution slang goes under `do …`. `read` and `reply` stand alone because they already live in the natural chat flow.

## Canonical vocabulary

| Word | Fires when… | Maps to | Kind |
|------|-------------|---------|------|
| `read {weaveSlug}/{threadSlug}/{docSlug}` | a slug path follows the word | `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` (add `?mode=chat` for a chat) — CLI: `loom context <path>` | pointer to existing command |
| `reply` | a chat doc is the active context | `loom_read_chat_tail` → *[compose]* → `loom_append_to_chat` | chain |
| `do quick` | you just did some work to record | `loom_quick_ship(...)` — CLI: `loom quick-ship` | pointer to existing command |
| `do step {N}` | an active (implementing) plan | resolve ordinal `N` → step id (`loom_list_plan_steps`) → `loom_do_step` → *[implement]* → `loom_append_done` → `loom_complete_step` | chain |
| `do steps {N,M}` / `do steps {N-Z}` | an active plan | the `do step` chain for each step in the set/range, in dependency order | chain (batch) |
| `do plan` | an active plan | every pending step in dependency order | chain (batch) |
| `docs done` | a thread's authored docs are finished | recipe below (set-status sweep + open-plan guard) | documented recipe |

Outside its trigger context each word is ordinary English and no action fires — that is what lets the vocabulary use real words without hijacking normal conversation.

## The chains, explicit

**`reply`** *(a chat doc is active)*
```
loom_read_chat_tail(id)         → the user's new turns since my last ## AI:
   ↓ [compose the reply]
loom_append_to_chat(id, body)   → write it under ## AI: (body is the text ONLY — no role header)
```

**`do step {N}`** *(active plan; the strongest chain — real work in the middle)*
```
loom_list_plan_steps(plan)      → resolve the visible ordinal N to its stable step id
loom_do_step(plan, N)           → brief: step + thread context
   ↓ [implement: edits, build, test]
loom_append_done(plan, N, …)    → record what was actually done
loom_complete_step(plan, N)     → mark ✅
```
`{N}` is the **visible ordinal** in the plan's Steps table; step identity is a stable kebab-slug, so the ordinal is resolved first.

**`do steps {N,M}` / `do steps {N-Z}` / `do plan`** — the same chain per step, in dependency order.

## `docs done` — the recipe

`docs done` is a **documented recipe, not a command** (it is a low-frequency `set-status` chain the agent runs in the open so you can watch it):

1. **Sweep** `set-status done` on the thread's **idea, design, and chats**.
2. **Never touch plans.** Plan status is workflow-owned — a plan reaches done via `close-plan` with all steps complete (`loom_set_status` guards `plan → done`). Naming it `docs done` (not "thread done") avoids implying the whole thread — plans included — is finished.
3. **Leave `req` at `locked`.** A locked req is the thread's perpetual spec; it is excluded from the DONE derivation (same as ctx/reference).
4. **If any plan still has pending steps, stop and report it** ("plan-002 has 3 pending steps — `do plan` first"). Never imply done while work is open.

Result: the thread's *derived* status flips `DONE` only once its plans are already closed (thread DONE = idea + design + plans all done). `docs done` finishes the authored side; only the workflow finishes plans.

## Stop-rule alignment

The step-family slang is a canonical name for an authorization the session contract's stop-rules already define:

- `do step {N}` → single step, then **STOP** and wait for `go` (default stop-rule 1).
- `do steps {range}` / `do plan` → run through **without stopping between steps** (the explicit multi-step-authorization exception) — **but the error-loop and design-decision stop-rules still interrupt**. Each step is still marked ✅ with a done note as it completes.

## What is NOT slang

- **No single-letter aliases** (`r`, `s`) — a private DSL nobody remembers; they collide with typos and teach a new user nothing. Whole words + the `do {target}` family are self-documenting.
- **No slang for self-naming commands** — create / refine / promote / set-status / rename / archive / roadmap / stale / search / validate all name themselves; the `loom://catalog` covers discovery.
- **`docs done` is a recipe, not a CLI command.** It is a rare, agent-mediated `set-status` chain; encoding it as a tri-surface command was weighed and rejected as over-engineering for a once-per-thread op with no extension button. Revisit if usage shows otherwise.
