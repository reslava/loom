---
type: idea
id: id_01KX6HQR682WRGN3QZS447E47R
title: Loom slang — a canonical User→AI verb protocol
status: done
created: 2026-07-10
updated: 2026-07-10
version: 2
tags: []
parent_id: null
requires_load: []
---
# Loom slang — a canonical User→AI verb protocol

## What we want to build

A small, canonical set of **"loom words"** — short verbs a user can say to the AI that each map **deterministically to exactly one CLI command or MCP tool/resource (or a fixed sequence)**. A "loom word" removes the guesswork: the user says one word, the AI runs one known thing.

Seed vocabulary (from `ways-to-use-loom/chat-001`):

| Loom word | Means (deterministic mapping) |
|-----------|-------------------------------|
| `reply` | `loom_read_chat_tail` → then `loom_append_to_chat` on the active chat |
| `read {weaveSlug}/{threadSlug}/{docSlug}` | `loom://context/{weaveSlug}/{threadSlug}/{docSlug}` |
| `do quick` | `loom_quick_ship` |

## Why it matters

- It's a real friction point for the **② Power terminal / ③ Pure agent** ways (Rafa's own daily driver). Today the AI sometimes *hesitates* on what a bare word like "reply" means — that hesitation is exactly the ambiguity this removes.
- Without a protocol, the only alternatives are both bad: **(a)** the user memorizes CLI/MCP command names, or **(b)** the AI guesses per phrasing. A tiny shared vocabulary beats both.
- It makes User↔AI collaboration **fast and secure**: one word → one action, no misfire.

## Design stance (my take — to settle in design)

- **A loom word maps to a fixed sequence, not always a single tool** (`reply` = read-tail *then* append). The mapping must be exact and side-effect-clear.
- **Two homes, both needed:** (1) a user-facing reference (`loom/refs/loom-slang-reference.md` + a section in `docs/WAYS-TO-USE-LOOM.md`), and (2) a rule baked into the **AI session contract** (`CLAUDE.md` / launch prompts) so every Loom AI treats these as canonical rather than guessing. The contract layer is what actually removes the hesitation.
- **Context-scoped to avoid English collisions:** `reply` is also an ordinary word — the rule fires only when a chat doc is the active context. Define each word's trigger context.
- **Scope discipline:** define words only for high-frequency, ambiguity-prone workflows (chat reply, pointed read, quick ship). Do **not** over-formalize the whole surface — the `loom://catalog` already covers discovery.
- **Slang is only for verbs that are ambiguous OR expand to a multi-tool sequence — not for anything with a clear 1:1 command.** If a command names itself, the user already knows what to say and the AI already knows what to run; slang would be redundant. Concrete case: once `loom set-status <slug> <status>` exists (see `cli/cli-mcp-command-parity`), the user just says *"set status done for {path}"* and it maps unambiguously — **no slang needed**. Slang earns its place only for `reply` (ambiguous English *and* a fixed sequence: `loom_read_chat_tail` → `loom_append_to_chat`) or `read {path}` (bare phrase → `loom://context/...`). This narrows the vocabulary: as the command surface gets clearer names (per the tri-surface parity work), the set of words that *need* slang shrinks.

## Success criteria

- A canonical slang table exists (reference + user guide), with each word's exact mapping and trigger context.
- The AI session contract references the table so behavior is consistent across sessions and hosts.
- The seed words (`reply`, `read {path}`, `do quick`) work unambiguously.

## Open questions for design

- Is slang a **doc/contract convention only**, or should the CLI also expose literal aliases (e.g. a `loom reply` command)?
- How many words is too many? Where's the line between "useful shortcut" and "private DSL nobody remembers"?
