---
type: idea
id: id_01KWW4S1BHFEBWFH84KVYAYKD9
title: Load thread context by need, not by trigger, on chat reply
status: done
created: 2026-07-06
version: 1
tags: []
parent_id: null
requires_load: []
---
# Load thread context by need, not by trigger, on chat reply

## Problem

The chat-reply context-injection rule (CLAUDE.md → "Chat-reply context injection") triggers on **position in the conversation**, not on **need**: *"first reply for this thread in the current conversation → read the thread context (idea + design + active plan + requires_load)."* It is a *load-by-trigger* rule.

That default is right for the common case — continuing a design conversation, where the thread's idea/design **are** load-bearing for the reply. But a meaningful fraction of thread chats are **debugging / systems / operational** questions whose answer lives in code, logs, or a running binary — *not* in the thread's design docs. For those, the "first reply" trigger forces a read of idea/design that is **framing, not answer-bearing**: it costs tokens and points nowhere near the actual answer.

This was observed live in the `validation/telemetry` thread (chat-003): the root cause of "telemetry stopped sending" was found entirely from source + the linked global binary; the thread's idea/design were loaded afterward **only because the rule required it**, and they contributed framing, not the fix. Rafa flagged the seam directly: *"why load thread context after the bug root cause was already found? … if you resolved the problem you don't need the extra context."*

## What we want to build

Shift the rule from **load-by-trigger** to **load-by-need with a safety floor**:

- Let a chat reply **declare its mode** when it opens — e.g. *"answering from code / logs / running system; thread-design not load-bearing"* — and **defer** the idea/design read in that case, emitting an honest visibility line to that effect (so the skip is transparent, not silent).
- Keep a **hard floor**: any reply that makes a *design proposal* (architecture, API shape, doc-graph change, or a `{generate}/{refine}` suggestion) MUST load the thread context first. This mirrors the existing **vision-check** gate — same shape, same discipline.
- Preserve determinism exactly where it matters (design) and drop the ceremony exactly where it doesn't (pure debugging / status / systems answers).

## Why it matters

The current rule guards a real failure — replying into a thread while ignorant of its locked decisions — and that guard must survive. But paying a full idea+design read on every first-touch chat, including operational ones, is a standing token tax and, worse, trains the habit of loading context reflexively rather than deliberately. Load-by-need keeps the guard (design floor) while removing the tax on the cases that provably don't need it.

## Not this (scope guard)

- **Not** removing context injection or the "reply inside the chat doc" rule — both stay.
- **Not** making the whole load discretionary. The design-proposal floor is non-negotiable; this is *narrowing* when the pre-read is mandatory, not abolishing it.
- **Not** a code change to the MCP server — the "is this thread already loaded / do I need it?" decision lives in the AI, not the stateless server. This is a **contract refinement** (CLAUDE.md + the `LOOM_CLAUDE_MD` template, machine-synced via the rule-marker test).

## Open questions

- **Mode taxonomy:** how many declared modes? Likely just two — *answering-from-code* (defer) vs *design/continuation* (load) — to avoid a decision tree the AI will get wrong.
- **Floor boundary:** what exactly counts as a "design proposal" that trips the mandatory load? Needs a crisp, testable definition so it isn't judgment-soup.
- **Visibility line:** the exact wording of the "deferred thread context (answering from code)" marker, so a reviewer can see the choice was made deliberately.
- **Shared-rule sync:** this edits a rule that exists in both CLAUDE surfaces → needs a `rule:` marker in both and must pass `claude-md-sync.test.ts`.

## Success criteria

- The contract states, in the chat-reply context-injection section, that thread-context pre-load is **required for design proposals** and **deferrable for code/systems answers**, with a transparent visibility marker for the deferral.
- Both CLAUDE surfaces carry the refined rule with a matching `rule:` marker; `claude-md-sync.test.ts` passes.
- A debugging chat reply can legitimately skip the idea/design read and say so; a design-proposal reply cannot.
