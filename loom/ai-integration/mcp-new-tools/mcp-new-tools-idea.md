---
type: idea
id: id_01KTTM64G1B2XZMDS739CDABYF
title: MCP friction-reduction tools
status: draft
created: 2026-06-11
version: 1
tags: []
parent_id: null
requires_load: []
---
# MCP friction-reduction tools

## What we want to build

A small set of new MCP tools (plus one token optimization) that remove the three sharpest sources of friction encountered while dogfooding Loom as an AI agent. The frictions were surfaced in `mcp-new-tools-chat-001.md` and refined into a concrete, ship-now scope.

## Why it matters

Every friction below is something the AI hits on *normal* day-one use — not edge cases. They make working through Loom's MCP surface more token-expensive and error-prone than it should be, which directly undercuts the vision that the durable, traceable path should also be the path of least resistance. Two of the three are cheap, clean tools with no architectural risk.

## The three frictions and their fixes

### 1. Full-body replace is the sharpest edge → `loom_patch_doc`
Changing one line in a 200-line doc currently means re-supplying the entire body through `loom_update_doc` — token-expensive and genuinely error-prone (retyping content just to touch a sentence).

**Fix:** a string-match patch tool (`old_string` → `new_string`, like the native Edit tool) scoped to **body prose only**. It refuses to touch frontmatter or the canonical `## Steps` table, and routes through the same validated load → write → re-index pipeline `loom_update_doc` uses. This is *less* error-prone than full-body replace, not more — the danger was never prose edits, it was frontmatter/state, which the tool refuses by design.

### 2. No clean way to amend a plan step → `loom_update_step` + `loom_reorder_steps`
Steps now live in YAML frontmatter (source of truth, body table generated), so amending a step requires a tool. There was no MCP-native fix for a cosmetic citation wart in Claude Code (only sampling-based `refine`, which doesn't work there), so a known wart had to stay. Steps felt write-once.

**Fix:** two surgical, pending-only tools:
- `loom_update_step(planId, stepId, {fields})` — amend an existing pending/active step's fields.
- `loom_reorder_steps(planId, orderedStepIds)` — reorder (safe: `blockedBy` references stable step ids).

**Done steps are immutable.** Loom is event-sourced; a completed step is history and its `done.md` cites it. Corrections to a done step are recorded *forward* (a note, or a new step), never by mutating the past.

### 3. Replying inside the chat doc fights the AI's nature → chat token optimization
"Reply inside the chat" is the #1 most-violated rule. The durable-by-default place to reply should be the path of least resistance, not the disciplined one.

**Fix (incentive, not restriction):** make appending so cheap there's no pull toward the terminal. A frontmatter **read-cursor** (last-read offset / last `## AI:` line) plus `loom_read_chat_tail(id)` that returns only the new Rafa-turns since the last AI reply — instead of re-reading the whole chat on first touch. `loom_append_to_chat` auto-advances the cursor.

## Explicitly out of scope

**Hooks are rejected.** A Stop-hook to *force* chat replies was considered and dropped. Empirically, the edit-gate hook has been disabled the entire time and doc-writes-via-MCP still happen reliably under rules alone — so hook enforcement is proven unnecessary where it'd be easy (doc writes), and hardest where it'd help (chat replies: stateless detection problem, not portable across OSes). With a single user, the cross-platform hook-install pipeline buys nothing. The chat-reply weak spot is addressed the vision-aligned way: make the durable path *cheap* (friction #3), not *mandatory*.

## Success criteria

- A one-line change to a large Loom doc costs one small patch call, not a full-body re-supply.
- A wrong citation / typo on a *pending* plan step is fixable via one MCP call; done steps remain immutable.
- First reply into a chat reads only the new turns since the last AI reply, not the whole doc.
- No new hooks; behavior stays rule-driven.

## Priority

`loom_patch_doc` first (biggest, most-felt friction, lowest risk) → `loom_update_step`/`loom_reorder_steps` (small, kills a known wart) → chat read-cursor + tail-read.