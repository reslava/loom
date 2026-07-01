---
type: plan
id: pl_01KSG7MW7ZZJ2R9D76EPEAX02G
title: Context Pipeline — Phase 1
status: done
created: 2026-05-25
updated: 2026-05-25
version: 2
design_version: 5
tags: []
parent_id: de_01KSG5XTNGXB2KPE448CA5B586
requires_load: []
target_version: 0.1.0
actual_release: 0.7.0
steps:
  - id: define-core-context-types-in-packages
    order: 1
    status: done
    description: "Define core context types in packages/core: ContextBundle, BundledDoc, ExcludedDoc, plus the OperationMode, DocScope, EmitReason and ExcludeReason unions. Export from the core index. Types only, no logic. (Files: packages/core/src/entities/context.ts + index export.) Verify: tsc builds; types importable from app and mcp."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: implement-the-pure-assembler-packages-app
    order: 2
    status: done
    description: "Implement the pure assembler packages/app/src/context/assembleContext.ts with signature (targetId, mode, overrides, state) => ContextBundle. Phase-1 behaviour only: auto-load global/weave/thread ctx (all ctx treated as load:always), add the target's parent chain (idea/design/plan), resolve requires_load eagerly + transitively with a visited-set for cycle safety, emit a missing-target placeholder BundledDoc{missing:true} (+ excluded 'missing') for dangling ids, compute tokenEstimate = ceil(chars/4), flag stale via existing staleness helpers, and apply the deterministic ordering (global ctx -> weave ctx -> thread ctx -> refs -> parent chain -> target -> requires_load refs). Include a pure classifyScope(doc, state) helper. NO load_when, NO override logic beyond accepting an empty {include,exclude}, NO budget. Unit tests in tests/context-assembler.test.ts over a hand-built LoomState fixture: scope ordering, transitive + cyclic requires_load termination, missing-target placeholder, stale flagging."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: implement-bundle-serialisation-in-packages-app
    order: 3
    status: done
    description: "Implement bundle serialisation in packages/app/src/context/serializeBundle.ts: serializeBundle(bundle) => string producing the agent-agnostic markdown blob (one section per doc, one-line provenance header '### [scope type] Title  ·  id  ·  stale?', sections split by '---', missing target rendered as '### ⚠️ requires_load target missing: <id>' with no body, leading '<!-- loom:context-bundle ... -->' comment). Add bundleVisibilityLines(bundle) => string[] returning the '📄 {Title} — loaded for context' lines walked from the same ordered docs[]. Unit-test both against a known bundle."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: add-the-mcp-resource-loom-context
    order: 4
    status: done
    description: "Add the MCP resource loom://context/{docId}?mode={mode} in packages/mcp/src/resources/context.ts: parse docId + mode from the URI, getState(deps) (the one impure boundary), pass empty overrides (Phase 1), run assembleContext, serialise via serializeBundle, return the text. Register the resource in server.ts. Add an MCP integration test (packages/mcp/tests) that spawns 'loom mcp', reads loom://context for a known doc at mode=chat, and asserts the serialised markdown contains the expected provenance headers."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: wire-the-extension-s-chat-reply
    order: 5
    status: done
    description: "Wire the extension's chat-reply launch path to the pipeline: before launching the agent, read loom://context/{chatId}?mode=chat, prepend the serialised bundle to the prompt, and print the bundleVisibilityLines ('📄 … — loaded for context') to the terminal log. This is the path that fixes the demo bug. Verify on a real chat reply that the lines appear and the agent answers from context without grepping."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: repoint-the-do-next-step-prompt
    order: 6
    status: done
    description: "Repoint the do-next-step prompt (packages/mcp/src/prompts/doNextStep.ts) to use loom://context/{planId}?mode=implementing instead of its ad-hoc bundling. Confirm the do-step brief still contains idea/design/active-plan + requires_load (now via the assembler)."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: delete-the-legacy-bundler-with-zero
    order: 7
    status: done
    description: "Delete the legacy bundler with zero residue: remove packages/mcp/src/resources/threadContext.ts and unregister loom://thread-context in server.ts; migrate any remaining callers to loom://context; update BOTH CLAUDE.md surfaces (repo-root CLAUDE.md and the LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts) so the Primary entry points table and the chat-reply context-injection rules name loom://context, not loom://thread-context. Grep the whole repo to confirm no 'thread-context' reference survives."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: verify-end-to-end-run
    order: 8
    status: done
    description: "Verify end-to-end: run ./scripts/build-all.sh then ./scripts/test-all.sh, plus the MCP integration test; manually exercise a chat reply and a do-step in the extension and confirm the 📄 visibility lines match the injected docs and the AI answers with context. Record results in the done doc."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Context Pipeline — Phase 1

## Goal

Ship Phase 1 of the Unified Context Pipeline: a pure context assembler in packages/app, the loom://context MCP resource, wired into chat-reply and do-step, with the legacy loom://thread-context bundler deleted (zero legacy). Phase-1 scope only — auto-load global/weave/thread ctx (all ctx treated as load:always) plus eager+transitive requires_load. NO load_when, NO sidebar overrides, NO token budget (those are Phases 2/3/5). Parent design: context-pipeline-design.md.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Define core context types in packages/core: ContextBundle, BundledDoc, ExcludedDoc, plus the OperationMode, DocScope, EmitReason and ExcludeReason unions. Export from the core index. Types only, no logic. (Files: packages/core/src/entities/context.ts + index export.) Verify: tsc builds; types importable from app and mcp. | — | — | — |
| ✅ | 2 | Implement the pure assembler packages/app/src/context/assembleContext.ts with signature (targetId, mode, overrides, state) => ContextBundle. Phase-1 behaviour only: auto-load global/weave/thread ctx (all ctx treated as load:always), add the target's parent chain (idea/design/plan), resolve requires_load eagerly + transitively with a visited-set for cycle safety, emit a missing-target placeholder BundledDoc{missing:true} (+ excluded 'missing') for dangling ids, compute tokenEstimate = ceil(chars/4), flag stale via existing staleness helpers, and apply the deterministic ordering (global ctx -> weave ctx -> thread ctx -> refs -> parent chain -> target -> requires_load refs). Include a pure classifyScope(doc, state) helper. NO load_when, NO override logic beyond accepting an empty {include,exclude}, NO budget. Unit tests in tests/context-assembler.test.ts over a hand-built LoomState fixture: scope ordering, transitive + cyclic requires_load termination, missing-target placeholder, stale flagging. | — | — | — |
| ✅ | 3 | Implement bundle serialisation in packages/app/src/context/serializeBundle.ts: serializeBundle(bundle) => string producing the agent-agnostic markdown blob (one section per doc, one-line provenance header '### [scope type] Title  ·  id  ·  stale?', sections split by '---', missing target rendered as '### ⚠️ requires_load target missing: <id>' with no body, leading '<!-- loom:context-bundle ... -->' comment). Add bundleVisibilityLines(bundle) => string[] returning the '📄 {Title} — loaded for context' lines walked from the same ordered docs[]. Unit-test both against a known bundle. | — | — | — |
| ✅ | 4 | Add the MCP resource loom://context/{docId}?mode={mode} in packages/mcp/src/resources/context.ts: parse docId + mode from the URI, getState(deps) (the one impure boundary), pass empty overrides (Phase 1), run assembleContext, serialise via serializeBundle, return the text. Register the resource in server.ts. Add an MCP integration test (packages/mcp/tests) that spawns 'loom mcp', reads loom://context for a known doc at mode=chat, and asserts the serialised markdown contains the expected provenance headers. | — | — | — |
| ✅ | 5 | Wire the extension's chat-reply launch path to the pipeline: before launching the agent, read loom://context/{chatId}?mode=chat, prepend the serialised bundle to the prompt, and print the bundleVisibilityLines ('📄 … — loaded for context') to the terminal log. This is the path that fixes the demo bug. Verify on a real chat reply that the lines appear and the agent answers from context without grepping. | — | — | — |
| ✅ | 6 | Repoint the do-next-step prompt (packages/mcp/src/prompts/doNextStep.ts) to use loom://context/{planId}?mode=implementing instead of its ad-hoc bundling. Confirm the do-step brief still contains idea/design/active-plan + requires_load (now via the assembler). | — | — | — |
| ✅ | 7 | Delete the legacy bundler with zero residue: remove packages/mcp/src/resources/threadContext.ts and unregister loom://thread-context in server.ts; migrate any remaining callers to loom://context; update BOTH CLAUDE.md surfaces (repo-root CLAUDE.md and the LOOM_CLAUDE_MD template in packages/app/src/installWorkspace.ts) so the Primary entry points table and the chat-reply context-injection rules name loom://context, not loom://thread-context. Grep the whole repo to confirm no 'thread-context' reference survives. | — | — | — |
| ✅ | 8 | Verify end-to-end: run ./scripts/build-all.sh then ./scripts/test-all.sh, plus the MCP integration test; manually exercise a chat reply and a do-step in the extension and confirm the 📄 visibility lines match the injected docs and the AI answers with context. Record results in the done doc. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |