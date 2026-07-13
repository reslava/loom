---
type: plan
id: pl_01KXE1ZMFPJ9R2JMZCFWB5M3K5
title: Split pointed context into load (heavy-once) vs read/reply (doc-only)
status: done
created: 2026-07-13
updated: 2026-07-13
version: 1
design_version: 1
tags: []
parent_id: de_01KX93MWNFW1BVNFCDNM07RSA4
requires_load: []
target_version: 0.1.0
steps:
  - id: assemblecontext-scope-doc-scope-doc-resource
    order: 1
    status: done
    description: "Add a scope option to assembleContext ('full' default | 'doc'): in 'doc' mode emit only the target doc — skip global/weave ctx, always-refs, the parent chain, user-includes, and requires_load — while still populating the weaveSlug/threadUlid header and honoring the alreadyLoaded ledger (a read of a doc already held returns an empty delta). Parse scope in handleContextResource and pass it through; must compose with ?mode=chat. Keep the assembler pure."
    files_touched: [packages/app/src/context/assembleContext.ts, packages/mcp/src/resources/context.ts]
    blocked_by: []
    satisfies: []
  - id: test-doc-only-scope
    order: 2
    status: done
    description: "Add tests/context-scope-doc.test.ts (dist-importing, tests/test-utils assert style; register a run_test line in scripts/test-all.sh): assert ?scope=doc returns exactly the target doc with no ctx/parent-chain/requires_load docs, that the bundle header still carries threadUlid, that ?mode=chat still resolves the chat target, and that declaring the target in ?loaded= yields an empty delta."
    files_touched: [tests/context-scope-doc.test.ts, scripts/test-all.sh]
    blocked_by: [assemblecontext-scope-doc-scope-doc-resource]
    satisfies: []
  - id: rewrite-loom-slang-reference-md
    order: 3
    status: done
    description: "Rewrite loom/refs/loom-slang-reference.md (via loom_update_doc) for the split: add `load {weave}/{thread}` (heavy, sets the AI-held active thread, maps to loom://context/thread/...); redefine `read` and `reply` as doc-only on the active thread via ?scope=doc. Document the active-thread convention (AI-held, server is stateless), bare-filename resolution within the active thread, full weave/thread/doc only at session start or thread switch, first-pointed-action-implicitly-loads (Q2a), read never auto-loads (Q1), the read-vs-reply cross-thread asymmetry (read {full path} = pure fetch, no switch; reply {full path} to a non-active thread refused + prompt to load, Q3), and the `load X, reply Y` chain. Preserve the earned-slang framing and stop-rule alignment."
    files_touched: [loom/refs/loom-slang-reference.md]
    blocked_by: [assemblecontext-scope-doc-scope-doc-resource]
    satisfies: []
  - id: update-ways-to-use-loom-md
    order: 4
    status: done
    description: Update the Loom slang section of docs/WAYS-TO-USE-LOOM.md to summarize the load/read/reply split and link loom-slang-reference.md, framed for the Power terminal / Pure agent ways where the words remove real friction. Verify the availability clause still holds (no advertised way relies on a capability the slang can't reach).
    files_touched: [docs/WAYS-TO-USE-LOOM.md]
    blocked_by: [rewrite-loom-slang-reference-md]
    satisfies: []
  - id: shared-slang-rule-aligned-claude-md
    order: 5
    status: done
    description: "Update the shared rule:loom-slang block in CLAUDE.md and the LOOM_CLAUDE_MD template (packages/app/src/installWorkspace.ts), keeping the matching <!-- rule:loom-slang --> markers so tests/claude-md-sync.test.ts stays green, with voice tailored per surface. Also align CLAUDE.md's own sections that describe pointed reads to the new semantics: 'Human pointer -> slug-path context resource', the 'Chat-reply context injection' block, and session-start step 5 — so load/read/reply are consistent everywhere. These are the load-once / read-doc-only / reply-cross-thread-refused rules."
    files_touched: [CLAUDE.md, packages/app/src/installWorkspace.ts]
    blocked_by: [rewrite-loom-slang-reference-md]
    satisfies: []
  - id: extension-launch-prompts
    order: 6
    status: done
    description: Update the extension launch prompts (packages/vscode/src/commands/*.ts) so extension-launched Claude agents get the same load/read/reply slang and active-thread semantics. Mirror the reference wording; keep it terse.
    files_touched: [packages/vscode/src/commands/chatReply.ts]
    blocked_by: [rewrite-loom-slang-reference-md]
    satisfies: []
  - id: document-scope-doc-in-mcp-reference
    order: 7
    status: done
    description: "Document the new ?scope=doc query param on the slug-path context resource in loom/refs/mcp-reference.md (doc-sync contract: the MCP resource surface map), noting it returns only the target doc and still carries the threadUlid header."
    files_touched: [loom/refs/mcp-reference.md]
    blocked_by: [assemblecontext-scope-doc-scope-doc-resource]
    satisfies: []
  - id: build-full-test-verification
    order: 8
    status: done
    description: Run ./scripts/build-all.sh then ./scripts/test-all.sh; confirm the new context-scope-doc test and tests/claude-md-sync.test.ts pass, and spot-check ?scope=doc against the live rebuilt server (a fresh session, since build-all does not restart a running MCP). Fix any failures.
    files_touched: []
    blocked_by: [assemblecontext-scope-doc-scope-doc-resource, test-doc-only-scope, rewrite-loom-slang-reference-md, update-ways-to-use-loom-md, shared-slang-rule-aligned-claude-md, extension-launch-prompts, document-scope-doc-in-mcp-reference]
    satisfies: []
---
# Split pointed context into load (heavy-once) vs read/reply (doc-only)

## Goal

Eliminate the double-read where `read`/`reply` re-bundle a thread already loaded this session. Split the pointed-context slang into a heavy-once `load {weave}/{thread}` (the full thread bundle, sets the AI-held active thread) and cheap doc-only `read`/`reply` (only the pointed doc, riding the active thread). The only code is a `scope: 'doc'` option on assembleContext, surfaced as `?scope=doc` on the slug-path context resource — it emits just the target doc while keeping the threadUlid/weaveSlug header and honoring the ?loaded= ledger. Everything else is slang + session-contract docs across the four homes (loom-slang-reference, WAYS-TO-USE, both CLAUDE.md surfaces + template, extension launch prompts) plus the MCP resource reference. Semantics settled in chat-002: read never auto-loads (Q1); the first pointed action of a session implicitly loads its thread (Q2a); bare filenames resolve inside the active thread, full weave/thread/doc only at session start or thread switch; `reply {full path}` to a non-active thread is refused with a prompt to `load` first (Q3), while `read {full path}` to a non-active thread is an allowed pure doc fetch that does not switch the active thread.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add a scope option to assembleContext ('full' default \| 'doc'): in 'doc' mode emit only the target doc — skip global/weave ctx, always-refs, the parent chain, user-includes, and requires_load — while still populating the weaveSlug/threadUlid header and honoring the alreadyLoaded ledger (a read of a doc already held returns an empty delta). Parse scope in handleContextResource and pass it through; must compose with ?mode=chat. Keep the assembler pure. | packages/app/src/context/assembleContext.ts, packages/mcp/src/resources/context.ts | — | — |
| ✅ | 2 | Add tests/context-scope-doc.test.ts (dist-importing, tests/test-utils assert style; register a run_test line in scripts/test-all.sh): assert ?scope=doc returns exactly the target doc with no ctx/parent-chain/requires_load docs, that the bundle header still carries threadUlid, that ?mode=chat still resolves the chat target, and that declaring the target in ?loaded= yields an empty delta. | tests/context-scope-doc.test.ts, scripts/test-all.sh | assemblecontext-scope-doc-scope-doc-resource | — |
| ✅ | 3 | Rewrite loom/refs/loom-slang-reference.md (via loom_update_doc) for the split: add `load {weave}/{thread}` (heavy, sets the AI-held active thread, maps to loom://context/thread/...); redefine `read` and `reply` as doc-only on the active thread via ?scope=doc. Document the active-thread convention (AI-held, server is stateless), bare-filename resolution within the active thread, full weave/thread/doc only at session start or thread switch, first-pointed-action-implicitly-loads (Q2a), read never auto-loads (Q1), the read-vs-reply cross-thread asymmetry (read {full path} = pure fetch, no switch; reply {full path} to a non-active thread refused + prompt to load, Q3), and the `load X, reply Y` chain. Preserve the earned-slang framing and stop-rule alignment. | loom/refs/loom-slang-reference.md | assemblecontext-scope-doc-scope-doc-resource | — |
| ✅ | 4 | Update the Loom slang section of docs/WAYS-TO-USE-LOOM.md to summarize the load/read/reply split and link loom-slang-reference.md, framed for the Power terminal / Pure agent ways where the words remove real friction. Verify the availability clause still holds (no advertised way relies on a capability the slang can't reach). | docs/WAYS-TO-USE-LOOM.md | rewrite-loom-slang-reference-md | — |
| ✅ | 5 | Update the shared rule:loom-slang block in CLAUDE.md and the LOOM_CLAUDE_MD template (packages/app/src/installWorkspace.ts), keeping the matching <!-- rule:loom-slang --> markers so tests/claude-md-sync.test.ts stays green, with voice tailored per surface. Also align CLAUDE.md's own sections that describe pointed reads to the new semantics: 'Human pointer -> slug-path context resource', the 'Chat-reply context injection' block, and session-start step 5 — so load/read/reply are consistent everywhere. These are the load-once / read-doc-only / reply-cross-thread-refused rules. | CLAUDE.md, packages/app/src/installWorkspace.ts | rewrite-loom-slang-reference-md | — |
| ✅ | 6 | Update the extension launch prompts (packages/vscode/src/commands/*.ts) so extension-launched Claude agents get the same load/read/reply slang and active-thread semantics. Mirror the reference wording; keep it terse. | packages/vscode/src/commands/chatReply.ts | rewrite-loom-slang-reference-md | — |
| ✅ | 7 | Document the new ?scope=doc query param on the slug-path context resource in loom/refs/mcp-reference.md (doc-sync contract: the MCP resource surface map), noting it returns only the target doc and still carries the threadUlid header. | loom/refs/mcp-reference.md | assemblecontext-scope-doc-scope-doc-resource | — |
| ✅ | 8 | Run ./scripts/build-all.sh then ./scripts/test-all.sh; confirm the new context-scope-doc test and tests/claude-md-sync.test.ts pass, and spot-check ?scope=doc against the live rebuilt server (a fresh session, since build-all does not restart a running MCP). Fix any failures. | — | assemblecontext-scope-doc-scope-doc-resource, test-doc-only-scope, rewrite-loom-slang-reference-md, update-ways-to-use-loom-md, shared-slang-rule-aligned-claude-md, extension-launch-prompts, document-scope-doc-in-mcp-reference | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
