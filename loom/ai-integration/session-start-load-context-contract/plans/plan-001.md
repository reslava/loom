---
type: plan
id: pl_01KX3YB3KFB41P55V8NN5EZHZT
title: session-start-load-context-contract Plan
status: done
created: 2026-07-09
updated: 2026-07-09
version: 1
design_version: 1
tags: []
parent_id: null
requires_load: []
target_version: 0.1.0
steps:
  - id: added-shared-hard-rule-to-both
    order: 1
    status: done
    description: "Added shared hard rule `human-pointer-context` to both CLAUDE.md (AI session rules) and the LOOM_CLAUDE_MD template in installWorkspace.ts, each with the `<!-- rule:human-pointer-context -->` marker so claude-md-sync enforces parity: when the user points at a doc/thread by name/path (session start or mid-session), resolve via the slug-path human-pointable context resource and never derive the ULID by hand — the bundle header returns target/thread_ulid."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: rewrote-session-start-step-5-in
    order: 2
    status: done
    description: Rewrote session-start step 5 in both surfaces to lead with the slug-path human-pointable resource and defer to the new hard rule, instead of leading with do-next-step/planUlid (which broke on a plan-less thread).
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: updated-the-chat-reply-context-injection
    order: 3
    status: done
    description: "Updated the chat-reply context-injection visibility line in both surfaces to show the slug-path form (loom://context/{weaveSlug}/{threadSlug}/{chat-stem}?mode=chat) as the human-pointer entry, documenting the {chat-ulid} form as the mid-session equivalent."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: verified-build-all-clean-claude-md
    order: 4
    status: done
    description: "Verified: build-all clean, claude-md-sync passes at 16 shared rule ids (was 15), full test suite 23/23."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# session-start-load-context-contract Plan

## Goal

Quick-ship record of 4 completed changes.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Added shared hard rule `human-pointer-context` to both CLAUDE.md (AI session rules) and the LOOM_CLAUDE_MD template in installWorkspace.ts, each with the `<!-- rule:human-pointer-context -->` marker so claude-md-sync enforces parity: when the user points at a doc/thread by name/path (session start or mid-session), resolve via the slug-path human-pointable context resource and never derive the ULID by hand — the bundle header returns target/thread_ulid. | — | — | — |
| ✅ | 2 | Rewrote session-start step 5 in both surfaces to lead with the slug-path human-pointable resource and defer to the new hard rule, instead of leading with do-next-step/planUlid (which broke on a plan-less thread). | — | — | — |
| ✅ | 3 | Updated the chat-reply context-injection visibility line in both surfaces to show the slug-path form (loom://context/{weaveSlug}/{threadSlug}/{chat-stem}?mode=chat) as the human-pointer entry, documenting the {chat-ulid} form as the mid-session equivalent. | — | — | — |
| ✅ | 4 | Verified: build-all clean, claude-md-sync passes at 16 shared rule ids (was 15), full test suite 23/23. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
