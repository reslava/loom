---
type: idea
id: id_01KX6HR9V2HKBWF1YF2TMMKCD0
title: CLI ⇄ MCP command parity + retire pre-ULID commands
status: done
created: 2026-07-10
version: 1
tags: []
parent_id: null
requires_load: []
---
# CLI ⇄ MCP command parity + retire pre-ULID commands

## What we want to build

Bring the `loom` CLI back in sync with the MCP surface it has fallen behind, and retire/repair commands whose behavior is stale from the pre-ULID era. Two concrete workstreams:

1. **Parity gaps — add missing CLI twins.** Every MCP write a terminal user reasonably wants should have a slug/human-first CLI command (per the API-naming rule: CLI = human-first). The known miss:
   - **No command to create a chat.** `loom_create_chat` exists on MCP but has no CLI twin — so the ② Power terminal chat loop can't start a chat from the terminal. (A chat's beginning has no frontmatter / no state, so this is a cheap add.)
   - Audit the rest of the MCP write surface for other terminal-relevant gaps.
2. **Retire / repair pre-ULID commands.** `loom finalize <draft>` still describes itself as *"Finalize a draft document and generate its permanent ID"* — the "generate its permanent ID" framing is **pre-ULID and now false** (ULID identity is minted at creation). Its MCP twin `loom_finalize_doc` is more honest ("sets status to active"). Reconcile the help text and semantics across both surfaces.

## Why it matters

- The CLI is a first-class Loom door (③ Pure agent, ④ Automation, and terminal-first ② users). When it lags MCP, those ways are silently second-class.
- Stale help text that references a mechanism that no longer exists (pre-ULID "generate permanent ID") actively misleads users about how Loom works.

## Open architecture question — do we still need the `draft` state? (my take, to settle before implementing)

The `finalize` cleanup surfaces a bigger question Rafa raised: *is `draft` still needed, or should docs be created `active` directly?*

**My recommendation: keep `draft`, but decouple it from the obsolete "ID generation" story.** Reasoning:
- ULID made "finalize to get an ID" obsolete — that framing should die. ✅
- **But `draft → active` is not an ID mechanism; it's a review gate.** It encodes *"the AI generated this; the human hasn't approved it yet."* That gate is a workflow feature (vision: "User reviews; the doc starts in status: draft") and it drives the tree's unreviewed signal + the Finalize button's meaning. Creating docs `active` directly would silently delete that gate.
- The gate is already **bypassed where it makes no sense** — `loom_quick_ship` goes straight to `done`; chats have no status at all. So the model is already "draft only where a human review step is meaningful."

So: **fix the stale framing, keep the state.** This is a **design decision — needs Rafa's call** before any implementation; it's captured here as the headline open question, not resolved.

## Success criteria

- CLI has a create-chat command (and any other parity gaps closed), slug/human-first.
- No CLI/MCP help text references pre-ULID "permanent ID generation."
- The draft-state decision is settled (recorded in the design) and both surfaces reflect it.

## Non-goals (for now)

- Not a full CLI redesign — targeted parity + de-stale, not a rewrite.
