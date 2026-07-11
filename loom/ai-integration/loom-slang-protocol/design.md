---
type: design
id: de_01KX93MWNFW1BVNFCDNM07RSA4
title: Loom slang — a canonical User→AI verb protocol
status: done
created: 2026-07-11
version: 1
tags: []
parent_id: id_01KX6HQR682WRGN3QZS447E47R
requires_load: []
---
# Loom slang — a canonical User→AI verb protocol

## Vision check

Serves the vision element *"User↔AI collaboration, fast and secure: one word → one action, no misfire."* Removes the manual step where the user must memorize CLI/MCP command names — or the AI guesses meaning per phrasing. A tiny shared vocabulary replaces both.

## Overview

A small, canonical set of **loom words** — short verbs the user says to the AI, each mapping **deterministically** to exactly one CLI command / MCP tool / resource, **or a fixed multi-tool sequence**. One word → one known action.

## Design principle — slang is *earned*, not assigned

A word earns slang status **only if** it is **(a)** ambiguous English **or** **(b)** expands to a fixed multi-tool chain. Any capability with a clean, self-naming 1:1 command gets **no slang** — the command name already tells the user what to say and the AI what to run. As command names sharpen (the tri-surface parity work), the slang set *shrinks*. Live proof: `loom set-status` shipped, so it needs no slang — the user just says "set status done for {path}."

This keeps the vocabulary small on purpose: the `loom://catalog` already covers discovery; slang exists only to remove genuine ambiguity or collapse a sequence.

## The `do` execution namespace

`do {target}` is the **execute family** — `do quick`, `do step`, `do steps`, `do plan`. "do" is never an accidental bare English word, so it is the collision-safe home for execution verbs. `read` and `reply` stand alone because they already live in the natural chat flow. Any *future* execution slang goes under `do …` without reopening the whole surface.

## Canonical vocabulary

| Word | Trigger context | Maps to | Notes |
|------|-----------------|---------|-------|
| `read {path}` | a slug path follows | `loom://context/{weaveSlug}/{threadSlug}/{docSlug}[?mode=chat]` | disambiguates bare "read" into one exact context load |
| `reply` | a chat doc is the active context | `loom_read_chat_tail` → *[compose]* → `loom_append_to_chat` | the archetypal chain |
| `do quick` | just did some work | `loom_quick_ship(...)` | slang buys the argument-assembly from conversation, not just the name |
| `do step {N}` | an active plan | resolve ordinal `N` → step slug (`loom_list_plan_steps`) → `loom_do_step` → *[implement]* → `loom_append_done` → `loom_complete_step` | **STOP after** (stop-rule 1 default) |
| `do steps {N,M}` / `do steps {N-Z}` | an active plan | the `do step` chain for each step in the set/range | **run through, no stop between** (stop-rule 1 exception) |
| `do plan` | an active plan | all pending steps in order | run through (same exception) |
| `docs done` | thread's authored docs are finished | `set-status done` on idea + design + chats; never plans; req stays locked | see semantics below |

## `docs done` — precise semantics

- **Sweeps** `set-status done` on **idea + design + chats**.
- **Never sets plans.** Plan status is workflow-owned — `loom_set_status` guards `plan → done` behind `close-plan` (all steps complete). A user could otherwise expect "thread done"; naming it `docs done` (not `thread done`) removes that overpromise.
- **`req` stays `locked`.** A locked req is the thread's perpetual spec; `derived.ts` deliberately excludes it from the DONE check (same bucket as ctx/reference).
- **If a plan still has pending steps → stop and report** ("plan-002 has 3 pending steps — `do plan` first"). Never pretend the thread is finished while work is open.
- **Result:** the thread's *derived* status flips `DONE` once its plans are already closed — because `derived.ts` computes thread DONE = idea + design + plans all done. `docs done` finishes the authored side; only the workflow finishes plans.

## Stop-rule alignment (the safety rail)

The step-family slang is a **canonical name for an authorization the contract already defines** (CLAUDE.md non-negotiable stop-rule 1, "explicit multi-step authorization"):

- `do step {N}` → single step, **STOP after** (default).
- `do steps {range}` / `do plan` → **no stop between steps** (the explicit-authorization exception) — **but stop-rules 2 (error loop) and 3 (design decision) still interrupt.** These are the safety rails and must appear in the slang reference.

Note on `{N}`: it is the **visible ordinal** in the plan's Steps table, but step identity is a stable kebab-slug (not `s1/s2`), so `do step 3` resolves the ordinal to its step id via `loom_list_plan_steps` first — one more reason it is a genuine chain that earns slang.

## Two homes — both required

1. **User-facing reference** — `loom/refs/loom-slang-reference.md` (the canonical table + trigger contexts + explicit chains) and a **Loom slang** section in `docs/WAYS-TO-USE-LOOM.md`.
2. **AI session contract** — a rule in `CLAUDE.md`, mirrored into the `LOOM_CLAUDE_MD` template (`packages/app/src/installWorkspace.ts`, shared → carries a `rule:` marker per the sync contract), plus the **extension launch prompts** (`packages/vscode/src/commands/*.ts`). The contract layer is what actually removes the AI's hesitation — a reference alone lets the AI keep guessing.

## Trigger contexts (avoid English collisions)

Each word fires **only in its context**: `reply` only when a chat doc is active; `read` only when a slug path follows; the `do`-family only with an active plan (except `do quick`); `docs done` only at thread scope. Outside its trigger the word is ordinary English and no action fires. This is why the vocabulary can use real words without hijacking normal conversation.

## Explicit rejections / non-goals

- **No single-letter aliases** (`r`, `s`) — the "private DSL nobody remembers" failure; they collide with typos and teach a new user nothing. Whole words + the `do {target}` family are self-documenting.
- **No slang for self-naming commands** — create / refine / promote / set-status / rename / archive / roadmap / stale / search / validate all name themselves; the catalog covers discovery.
- **Not (yet) a CLI feature** — slang is a doc/contract convention, not literal `loom reply` commands.

## Implementation surface — no code changes required

Every word maps onto **existing** tools; `docs done` is pure orchestration over `loom_set_status` + a `close-plan`/pending-step check. So shipping this is documentation + contract work:

- **New:** `loom/refs/loom-slang-reference.md`.
- **Edit:** `docs/WAYS-TO-USE-LOOM.md` (add the slang section).
- **Edit:** `CLAUDE.md` + `LOOM_CLAUDE_MD` template (shared rule, `rule:` marker on both — `claude-md-sync` test enforces parity).
- **Edit:** extension launch prompts (`packages/vscode/src/commands/*.ts`).

## Open questions (deferred, not blocking)

- Should the CLI also expose **literal aliases** (e.g. `loom reply`, `loom docs-done`)? Current stance: contract convention only.
- `do quick` vs `do ship` wording (adjective vs verb-noun consistency) — kept `do quick` to match current usage.