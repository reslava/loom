---
type: done
id: pl_01KX3YB3KFB41P55V8NN5EZHZT-done
title: Done — session-start-load-context-contract Plan
status: done
created: 2026-07-09
version: 1
tags: []
parent_id: pl_01KX3YB3KFB41P55V8NN5EZHZT
requires_load: []
---
# Done — session-start-load-context-contract Plan

Quick-shipped — recorded already-completed work:

1. Added shared hard rule `human-pointer-context` to both CLAUDE.md (AI session rules) and the LOOM_CLAUDE_MD template in installWorkspace.ts, each with the `<!-- rule:human-pointer-context -->` marker so claude-md-sync enforces parity: when the user points at a doc/thread by name/path (session start or mid-session), resolve via the slug-path human-pointable context resource and never derive the ULID by hand — the bundle header returns target/thread_ulid.
2. Rewrote session-start step 5 in both surfaces to lead with the slug-path human-pointable resource and defer to the new hard rule, instead of leading with do-next-step/planUlid (which broke on a plan-less thread).
3. Updated the chat-reply context-injection visibility line in both surfaces to show the slug-path form (loom://context/{weaveSlug}/{threadSlug}/{chat-stem}?mode=chat) as the human-pointer entry, documenting the {chat-ulid} form as the mid-session equivalent.
4. Verified: build-all clean, claude-md-sync passes at 16 shared rule ids (was 15), full test suite 23/23.
