---
type: plan
id: pl_01KWKHA82YGZ6AHAHPAR7TZ79F
title: Unambiguous naming + canonical ULID refactor
status: implementing
created: 2026-07-03
updated: 2026-07-04
version: 1
design_version: 4
req_version: 2
tags: []
parent_id: de_01KWKFHSXS96W36BE28VYFG64P
requires_load: []
target_version: 0.1.0
steps:
  - id: draft-the-naming-reference-provisional
    order: 1
    status: done
    description: "Write loom/refs/api-naming-reference.md: the governing 'final consumer' principle; `*Ulid` for ULID references (ban `*Id`); `*Slug` for folder names incl. weaveSlug; every entity by ULID except weave (documented exception); per-surface casing (snake_case MCP schema, camelCase app). Mark provisional-pending-audit."
    files_touched: [loom/refs/api-naming-reference.md]
    blocked_by: []
    satisfies: [IN1, IN2, IN3, IN4, C1, C4]
  - id: claude-md-hard-rule-short-form
    order: 2
    status: done
    description: "Add the naming hard-rule short-form to CLAUDE.md pointing to the reference — with NO `rule:` marker and NO LOOM_CLAUDE_MD template mirror (repo-specific; must not enter the CLAUDE.md⇄template sync test)."
    files_touched: [CLAUDE.md]
    blocked_by: [draft-the-naming-reference-provisional]
    satisfies: [IN1, C2]
  - id: audit-the-whole-api-surface
    order: 3
    status: done
    description: "Read-only inventory of every loom_* tool (packages/mcp/src/tools/*) and app use-case (packages/app/src/*): classify each parameter (ULID-ref / slug / title / body / other) and produce a current→proposed rename table. Cast wide — also flag ANY misleading name (ambiguous verbs, params, return shapes), not just the ULID/Slug axis. The audit catalogs every smell; fixes stay scoped (EX5) — safe ULID/Slug renames ride step 7, larger/riskier ones are flagged as follow-ups. Confirms the convention against all cases before any rename."
    files_touched: [loom/core-engine/api-contract-refactor/refs/api-audit-reference.md]
    blocked_by: [draft-the-naming-reference-provisional]
    satisfies: [IN5, C3]
  - id: finalize-the-convention-from-audit
    order: 4
    status: done
    description: Fold any cases the audit surfaced into api-naming-reference.md and drop the provisional marker.
    files_touched: [loom/refs/api-naming-reference.md]
    blocked_by: [audit-the-whole-api-surface]
    satisfies: [IN1]
  - id: shared-resolvethreadfolder-resolver
    order: 5
    status: done
    description: Add a single shared resolveThreadFolder(weaveSlug, threadUlid, deps) in packages/app/src/utils — scans thread manifests, maps th_ ULID → folder, throws on an unresolvable ULID. The one ULID→folder chokepoint every create/promote/folder-op routes through.
    files_touched: [packages/app/src/utils/resolveThreadFolder.ts, packages/app/src/index.ts]
    blocked_by: [finalize-the-convention-from-audit]
    satisfies: [IN6]
  - id: explicit-thread-creation-remove-auto-scaffold
    order: 6
    status: done
    description: Remove the ensureThreadManifest auto-scaffold-into-unknown-thread seam. Thread creation becomes explicit (createThread → { threadUlid }); doc-create use-cases require an existing thread referenced by threadUlid (resolved via step 5) and never fabricate one.
    files_touched: [packages/app/src/thread.ts, packages/app/src/weaveIdea.ts, packages/app/src/weaveDesign.ts, packages/app/src/req.ts, packages/app/src/weavePlan.ts, packages/app/src/chatNew.ts, packages/app/src/promoteToIdea.ts, packages/app/src/promoteToDesign.ts, packages/app/src/promoteToPlan.ts]
    blocked_by: [shared-resolvethreadfolder-resolver]
    satisfies: [IN7, EX3]
  - id: rename-params-api-wide-snake-case
    order: 7
    status: done
    description: "Full API-consistency pass, build-green stages (plan B). (a) Convert the REMAINING thread-referencing use-cases that step 6 didn't (verify_req, and the folder-ops rename/move/archive/delete/restore) to resolve-at-boundary by thread_ulid — so the whole live surface is uniformly ULID. (b) Cosmetic renames: MCP schemas + descriptions → snake_case (weave_slug, thread_ulid, …); app inputs/functions → camelCase; handlers map. (c) The two tool renames: loom_rename→loom_retitle, loom_rename_doc_file→loom_rename_reference_file. (d) Fix the MCP integration-test fixtures (real thread manifests + ULIDs) so test-all is fully green. Update ALL callers. Clean break — no shims."
    files_touched: [packages/mcp/src/tools/, packages/app/src/, packages/cli/src/, packages/vscode/src/, tests/, packages/mcp/tests/]
    blocked_by: [finalize-the-convention-from-audit, explicit-thread-creation-remove-auto-scaffold]
    satisfies: [IN8, C1, C5, C6, EX2]
  - id: cli-slug-ulid-ergonomics-create-commands
    order: 8
    status: done
    description: "CLI slug/ULID ergonomics: create commands accept a thread SLUG (resolved to ULID for humans) or a ULID directly; add `loom resolve-ulid <weave> <slug>` (slug → th_ ULID) and `loom resolve-path <weave> <ulid>` (ULID → folder path), backed by a new `resolveThreadUlid` app helper (inverse of resolveThreadFolder)."
    files_touched: [packages/cli/src/, packages/app/src/utils/resolveThreadFolder.ts, packages/app/src/index.ts]
    blocked_by: []
    satisfies: [IN6, IN8]
  - id: regression-tests-full-suite-green
    order: 9
    status: done
    description: "Add tests/api-contract-refactor.test.ts (wired into scripts/test-all.sh): create-by-existing-threadUlid lands in that thread; create-by-unknown-threadUlid throws; no path fabricates a thread folder. Then build-all + test-all green."
    files_touched: [tests/api-contract-refactor.test.ts, scripts/test-all.sh]
    blocked_by: [rename-params-api-wide-snake-case]
    satisfies: [IN9]
  - id: chatnew-two-canonical-homes-or-throw
    order: 10
    status: done
    description: "Fix chatNew to two canonical chat homes only. A chat resolves to exactly: (1) {weave}/{thread}/chats when weaveSlug+threadUlid (via resolveThreadFolder, throw if unresolvable), or (2) refs/chats when weaveSlug='refs'. Delete the weave-root ({weave}/chats) and bare loom/chats fallback branches — a non-refs chat with no resolvable thread now THROWS instead of silently orphaning an invalid, tree-invisible file (same 'unresolvable → error, never fabricate' invariant this thread enforces elsewhere). Correct the stale loom_create_chat tool description ('requires weaveId + threadId' → the weave_slug/thread_ulid + refs contract)."
    files_touched: [packages/app/src/chatNew.ts, packages/mcp/src/tools/createChat.ts]
    blocked_by: []
    satisfies: [IN7]
  - id: plumb-threadulid-down-tree-nodes
    order: 11
    status: done
    description: "Plumb the thread's th_ ULID down the VS Code tree node subtree. Pass thread.manifest?.id through getThreadChildren → createChatsSection / createDocumentNode / createChatNode (and ctx/refs children) so every descendant node carries threadUlid, exactly as weaveId/threadId (the slug) already flow. Root cause of the regression: threadUlid was set on ONLY the thread node, so New Chat / req / rename invoked from a descendant row saw threadUlid=undefined. This one change fixes New Chat from inside a thread, the false 'no thread.md manifest' errors on req/rename from doc rows, and the ensureThreadUlid create_thread fallback."
    files_touched: [packages/vscode/src/tree/treeProvider.ts, packages/vscode/src/commands/chatNew.ts]
    blocked_by: []
    satisfies: [IN8]
  - id: regression-chat-location-contract
    order: 12
    status: done
    description: "Regression test for the chat-location contract (extend tests/api-contract-refactor.test.ts, already wired into scripts/test-all.sh): (1) create_chat with a real existing threadUlid lands in {weave}/{thread}/chats; (2) create_chat for refs lands in refs/chats; (3) a non-refs chat with no resolvable thread THROWS and creates no file at loom/{weave}/chats or loom/chats. Then build-all + test-all green."
    files_touched: [tests/api-contract-refactor.test.ts, scripts/test-all.sh]
    blocked_by: [chatnew-two-canonical-homes-or-throw, plumb-threadulid-down-tree-nodes]
    satisfies: [IN9]
  - id: docs-reflect-the-refactor
    order: 13
    status: done
    description: "Documentation pass — reflect the refactor's naming/tool renames in the living canonical docs (frozen history left as-is). Fix: architecture-reference (loom_rename→loom_retitle, loom_rename_doc_file→loom_rename_reference_file); loom-requirements-reference (loom_create_req(weaveId,threadId)→(weave_slug,thread_ulid)); README + CLAUDE.md + ctx.md + the LOOM_CLAUDE_MD template ({weaveId}/{threadId} context-URI placeholders → {weaveSlug}/{threadUlid}); ctx.md runEvent(threadId)→runEvent(weaveSlug); README loom://state phantom threadId= → status=. CLAUDE.md⇄template parity preserved (claude-md-sync green)."
    files_touched: [loom/refs/architecture-reference.md, loom/refs/loom-requirements-reference.md, README.md, CLAUDE.md, loom/ctx.md, packages/app/src/installWorkspace.ts]
    blocked_by: []
    satisfies: [IN1]
  - id: release
    order: 14
    status: pending
    description: Ship the synchronized release via /do-release (breaking change → minor/major). Changelog notes the parameter renames and the seam removal.
    files_touched: [CHANGELOG.md]
    blocked_by: [regression-tests-full-suite-green, regression-chat-location-contract]
    satisfies: [IN10]
---
# Unambiguous naming + canonical ULID refactor

## Goal

Make the Loom API's parameter names unambiguous and canonicalize ULID usage in one comprehensive pass. Establish the naming convention (ban `*Id` for references → `*Ulid`; `*Slug` for folder names incl. `weaveSlug`; every entity addressed by its ULID except weave; snake_case at the MCP schema, camelCase in the app, handler maps), document it, audit the whole surface, then apply it as a single breaking change — including removing the auto-scaffold-into-unknown-thread seam that let a doc-create fabricate a thread (the originating bug). Convention first (provisional), audit second (finalizes it), code refactor third, tests and release last. No back-compat shims, no convenience wrappers, no weave ULID.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Write loom/refs/api-naming-reference.md: the governing 'final consumer' principle; `*Ulid` for ULID references (ban `*Id`); `*Slug` for folder names incl. weaveSlug; every entity by ULID except weave (documented exception); per-surface casing (snake_case MCP schema, camelCase app). Mark provisional-pending-audit. | loom/refs/api-naming-reference.md | — | IN1, IN2, IN3, IN4, C1, C4 |
| ✅ | 2 | Add the naming hard-rule short-form to CLAUDE.md pointing to the reference — with NO `rule:` marker and NO LOOM_CLAUDE_MD template mirror (repo-specific; must not enter the CLAUDE.md⇄template sync test). | CLAUDE.md | draft-the-naming-reference-provisional | IN1, C2 |
| ✅ | 3 | Read-only inventory of every loom_* tool (packages/mcp/src/tools/*) and app use-case (packages/app/src/*): classify each parameter (ULID-ref / slug / title / body / other) and produce a current→proposed rename table. Cast wide — also flag ANY misleading name (ambiguous verbs, params, return shapes), not just the ULID/Slug axis. The audit catalogs every smell; fixes stay scoped (EX5) — safe ULID/Slug renames ride step 7, larger/riskier ones are flagged as follow-ups. Confirms the convention against all cases before any rename. | loom/core-engine/api-contract-refactor/refs/api-audit-reference.md | draft-the-naming-reference-provisional | IN5, C3 |
| ✅ | 4 | Fold any cases the audit surfaced into api-naming-reference.md and drop the provisional marker. | loom/refs/api-naming-reference.md | audit-the-whole-api-surface | IN1 |
| ✅ | 5 | Add a single shared resolveThreadFolder(weaveSlug, threadUlid, deps) in packages/app/src/utils — scans thread manifests, maps th_ ULID → folder, throws on an unresolvable ULID. The one ULID→folder chokepoint every create/promote/folder-op routes through. | packages/app/src/utils/resolveThreadFolder.ts, packages/app/src/index.ts | finalize-the-convention-from-audit | IN6 |
| ✅ | 6 | Remove the ensureThreadManifest auto-scaffold-into-unknown-thread seam. Thread creation becomes explicit (createThread → { threadUlid }); doc-create use-cases require an existing thread referenced by threadUlid (resolved via step 5) and never fabricate one. | packages/app/src/thread.ts, packages/app/src/weaveIdea.ts, packages/app/src/weaveDesign.ts, packages/app/src/req.ts, packages/app/src/weavePlan.ts, packages/app/src/chatNew.ts, packages/app/src/promoteToIdea.ts, packages/app/src/promoteToDesign.ts, packages/app/src/promoteToPlan.ts | shared-resolvethreadfolder-resolver | IN7, EX3 |
| ✅ | 7 | Full API-consistency pass, build-green stages (plan B). (a) Convert the REMAINING thread-referencing use-cases that step 6 didn't (verify_req, and the folder-ops rename/move/archive/delete/restore) to resolve-at-boundary by thread_ulid — so the whole live surface is uniformly ULID. (b) Cosmetic renames: MCP schemas + descriptions → snake_case (weave_slug, thread_ulid, …); app inputs/functions → camelCase; handlers map. (c) The two tool renames: loom_rename→loom_retitle, loom_rename_doc_file→loom_rename_reference_file. (d) Fix the MCP integration-test fixtures (real thread manifests + ULIDs) so test-all is fully green. Update ALL callers. Clean break — no shims. | packages/mcp/src/tools/, packages/app/src/, packages/cli/src/, packages/vscode/src/, tests/, packages/mcp/tests/ | finalize-the-convention-from-audit, explicit-thread-creation-remove-auto-scaffold | IN8, C1, C5, C6, EX2 |
| ✅ | 8 | CLI slug/ULID ergonomics: create commands accept a thread SLUG (resolved to ULID for humans) or a ULID directly; add `loom resolve-ulid <weave> <slug>` (slug → th_ ULID) and `loom resolve-path <weave> <ulid>` (ULID → folder path), backed by a new `resolveThreadUlid` app helper (inverse of resolveThreadFolder). | packages/cli/src/, packages/app/src/utils/resolveThreadFolder.ts, packages/app/src/index.ts | — | IN6, IN8 |
| ✅ | 9 | Add tests/api-contract-refactor.test.ts (wired into scripts/test-all.sh): create-by-existing-threadUlid lands in that thread; create-by-unknown-threadUlid throws; no path fabricates a thread folder. Then build-all + test-all green. | tests/api-contract-refactor.test.ts, scripts/test-all.sh | rename-params-api-wide-snake-case | IN9 |
| ✅ | 10 | Fix chatNew to two canonical chat homes only. A chat resolves to exactly: (1) {weave}/{thread}/chats when weaveSlug+threadUlid (via resolveThreadFolder, throw if unresolvable), or (2) refs/chats when weaveSlug='refs'. Delete the weave-root ({weave}/chats) and bare loom/chats fallback branches — a non-refs chat with no resolvable thread now THROWS instead of silently orphaning an invalid, tree-invisible file (same 'unresolvable → error, never fabricate' invariant this thread enforces elsewhere). Correct the stale loom_create_chat tool description ('requires weaveId + threadId' → the weave_slug/thread_ulid + refs contract). | packages/app/src/chatNew.ts, packages/mcp/src/tools/createChat.ts | — | IN7 |
| ✅ | 11 | Plumb the thread's th_ ULID down the VS Code tree node subtree. Pass thread.manifest?.id through getThreadChildren → createChatsSection / createDocumentNode / createChatNode (and ctx/refs children) so every descendant node carries threadUlid, exactly as weaveId/threadId (the slug) already flow. Root cause of the regression: threadUlid was set on ONLY the thread node, so New Chat / req / rename invoked from a descendant row saw threadUlid=undefined. This one change fixes New Chat from inside a thread, the false 'no thread.md manifest' errors on req/rename from doc rows, and the ensureThreadUlid create_thread fallback. | packages/vscode/src/tree/treeProvider.ts, packages/vscode/src/commands/chatNew.ts | — | IN8 |
| ✅ | 12 | Regression test for the chat-location contract (extend tests/api-contract-refactor.test.ts, already wired into scripts/test-all.sh): (1) create_chat with a real existing threadUlid lands in {weave}/{thread}/chats; (2) create_chat for refs lands in refs/chats; (3) a non-refs chat with no resolvable thread THROWS and creates no file at loom/{weave}/chats or loom/chats. Then build-all + test-all green. | tests/api-contract-refactor.test.ts, scripts/test-all.sh | chatnew-two-canonical-homes-or-throw, plumb-threadulid-down-tree-nodes | IN9 |
| ✅ | 13 | Documentation pass — reflect the refactor's naming/tool renames in the living canonical docs (frozen history left as-is). Fix: architecture-reference (loom_rename→loom_retitle, loom_rename_doc_file→loom_rename_reference_file); loom-requirements-reference (loom_create_req(weaveId,threadId)→(weave_slug,thread_ulid)); README + CLAUDE.md + ctx.md + the LOOM_CLAUDE_MD template ({weaveId}/{threadId} context-URI placeholders → {weaveSlug}/{threadUlid}); ctx.md runEvent(threadId)→runEvent(weaveSlug); README loom://state phantom threadId= → status=. CLAUDE.md⇄template parity preserved (claude-md-sync green). | loom/refs/architecture-reference.md, loom/refs/loom-requirements-reference.md, README.md, CLAUDE.md, loom/ctx.md, packages/app/src/installWorkspace.ts | — | IN1 |
| 🔳 | 14 | Ship the synchronized release via /do-release (breaking change → minor/major). Changelog notes the parameter renames and the seam removal. | CHANGELOG.md | regression-tests-full-suite-green, regression-chat-location-contract | IN10 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
