---
type: idea
id: id_01KV8SRTQJ1N3HG9VWD1N7HEC4
title: Harden loom_create_plan against malformed / stringified steps payloads
status: draft
created: 2026-06-16
version: 1
tags: []
parent_id: null
requires_load: []
---
# Harden loom_create_plan against malformed / stringified steps payloads

## Problem (observed)

During `vscode-mcp-refactor` plan creation, a `loom_create_plan` call with a goal + an 11-element structured `steps` array produced a **malformed doc**: `steps: []` in frontmatter (all steps dropped) and the literal tool-call wire wrapper (`</goal>` + `<parameter name="steps">[…]`) leaked verbatim into the body's Goal section, leaving the generated `## Steps` table empty. The tool still returned `{ id, filePath }` **success**, so nothing flagged the corruption. A clean retry passing `steps` as a genuine array worked first try.

## Root cause (suspected — needs confirmation)

The `steps` argument arrived as a stringified JSON blob rather than a parsed array. The server neither (a) coerced/validated it into the `steps` schema (→ silent empty array) nor (b) rejected the call, and the goal/body writer emitted the raw parameter text into the body. Localised to `loom_create_plan` input handling of large / string-encoded `steps`.

## Why it matters

A create tool that silently drops its primary payload **and returns success** is the worst failure mode — it corrupts the doc and hides it from the caller. Recorded originally as a finding in `core-engine/roadmap/chats/roadmap-chat-006.md`; promoted here so it's tracked, not parked.

## Desired outcome (hardening candidates)

- **Validate, don't silently empty.** If `steps` is present but unparseable / in string form, coerce (`JSON.parse` a string) or hard-error — never persist `steps: []` from a non-empty input.
- **Reject body-leak.** The goal/body writer must never emit raw `<parameter …>` / `</goal>` markers; treat their presence as a serialization failure.
- **Post-write assertion.** After create, assert `frontmatter.steps.length === input.steps.length`; on mismatch, throw — a corrupt plan must never return success.

## Success criteria

- A `loom_create_plan` call with a stringified `steps` blob either parses correctly or errors — never produces `steps: []` + leaked body.
- Regression test covering the stringified-`steps` and body-leak cases.
- First step of any eventual plan is to **reproduce + confirm the root cause** (the above is a hypothesis), since the failure wasn't isolated in code yet.
