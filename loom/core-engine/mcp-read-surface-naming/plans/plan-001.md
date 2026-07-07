---
type: plan
id: pl_01KWYYXSQJ6E3F27K54B9HZ1BC
title: Align the MCP read surface to the Slug/Ulid contract
status: done
created: 2026-07-07
updated: 2026-07-07
version: 1
design_version: 4
req_version: 1
tags: []
parent_id: de_01KWYVRS94S3K18HDRSVPHNE4K
requires_load: []
target_version: 0.1.0
steps:
  - id: resource-uri-placeholders-ulid-slug
    order: 1
    status: done
    description: "Rename resource URI placeholders in the registry to the contract: docs/{docUlid}, context/{docUlid}, context/thread/{weaveSlug}/{threadSlug}, plan/{planUlid}, requires-load/{docUlid}. Update the RESOURCE_TEMPLATES descriptions to match."
    files_touched: [packages/mcp/src/server.ts, packages/mcp/src/resources/context.ts]
    blocked_by: []
    satisfies: [IN1]
  - id: prompt-args-strict-ulid-slug
    order: 2
    status: done
    description: "Rename prompt args to strict contract across all prompts: weaveId/threadId → weaveSlug/threadSlug; planId → planUlid (ULID only — retire the filename dual-accept per naming rule 2). Update promptDef.arguments, the arg reads, and the URIs each prompt builds."
    files_touched: [packages/mcp/src/prompts/continueThread.ts, packages/mcp/src/prompts/doNextStep.ts, packages/mcp/src/prompts/refineDesign.ts, packages/mcp/src/prompts/weaveIdea.ts, packages/mcp/src/prompts/weaveDesign.ts, packages/mcp/src/prompts/weavePlan.ts]
    blocked_by: []
    satisfies: [IN2]
  - id: lockstep-fix-broken-prompt-callers-c2
    order: 3
    status: done
    description: "Fix the in-repo prompt callers the arg rename breaks — minimal lockstep only, not the full CLI rename: loom next passes planUlid to do-next-step. Audit for any other in-repo getPrompt callers and update them too."
    files_touched: [packages/cli/src/commands/next.ts]
    blocked_by: [prompt-args-strict-ulid-slug]
    satisfies: [C2]
  - id: rewrite-prompt-body-tool-call-guidance
    order: 4
    status: done
    description: "Rewrite the prompt bodies' tool-call guidance to the current tool contract: use snake_case weave_slug/thread_ulid, and make the create-plan guidance use goal + a structured steps array (never a content Steps table). Fixes the doubly-stale weave-plan/weave-design/weave-idea instructions."
    files_touched: [packages/mcp/src/prompts/weaveIdea.ts, packages/mcp/src/prompts/weaveDesign.ts, packages/mcp/src/prompts/weavePlan.ts]
    blocked_by: [prompt-args-strict-ulid-slug]
    satisfies: [IN3]
  - id: context-bundle-manifest-carries-the-thread
    order: 5
    status: done
    description: "Manifest enhancement: stamp the resolved weave_slug and thread_ulid (and anchor doc ULIDs if cheap) into the context-bundle manifest header emitted by assembleContext — extend the existing <!-- loom:context-bundle … --> comment, leave the bundle body unchanged."
    files_touched: [packages/mcp/src/resources/context.ts]
    blocked_by: []
    satisfies: [IN4]
  - id: ulid-strict-doc-plan-forms-slug
    order: 6
    status: done
    description: "Expose two explicit context-addressing forms, each strict about its own input (naming rule 2): a ULID form (context/{docUlid}, plan/{planUlid}) accepting the ULID only, and a slug form for human pointing — the existing thread form context/thread/{weaveSlug}/{threadSlug} plus a path-qualified doc form (e.g. context/{weaveSlug}/{threadSlug}/{docSlug}) — resolving slug→ULID via the existing link index (resolveId over buildLinkIndex). Fully satisfies IN5's slug-addressing intent while keeping the ULID form strict; no req amend needed."
    files_touched: [packages/mcp/src/resources/context.ts]
    blocked_by: [resource-uri-placeholders-ulid-slug]
    satisfies: [IN5]
  - id: doc-sync-sweep-in6
    order: 7
    status: done
    description: "Doc sweep in one commit (doc-sync row 3): update mcp-reference.md (§1 resources + §3 prompts), CLAUDE.md, ctx.md, and the LOOM_CLAUDE_MD template so every placeholder and prompt-arg name matches the renamed code."
    files_touched: [loom/refs/mcp-reference.md, CLAUDE.md, loom/ctx.md, packages/app/src/installWorkspace.ts]
    blocked_by: [resource-uri-placeholders-ulid-slug, prompt-args-strict-ulid-slug]
    satisfies: [IN6]
  - id: regression-no-id-guard-in7
    order: 8
    status: done
    description: "Regression + guard coverage, then build-all and run test-all: an MCP integration test asserting loom://context/thread/{weaveSlug}/{threadSlug} returns a bundle whose manifest carries thread_ulid=th_…, and a guard test that no RESOURCE_TEMPLATES uriTemplate and no prompt arg name contains the *Id token. Add the new test to scripts/test-all.sh."
    files_touched: [packages/mcp/tests/integration.test.ts, tests/mcp-read-surface-naming.test.ts, scripts/test-all.sh]
    blocked_by: [resource-uri-placeholders-ulid-slug, prompt-args-strict-ulid-slug, context-bundle-manifest-carries-the-thread]
    satisfies: [IN7]
---
# Align the MCP read surface to the Slug/Ulid contract

## Goal

Bring the MCP read surface into the Slug/Ulid API contract established by api-contract-refactor: rename resource URI placeholders and prompt args to strict *Ulid / *Slug (no dual-accept, per naming rule 2), rewrite the prompt bodies' stale tool-call guidance, stamp the resolved {weave_slug, thread_ulid} into the context-bundle manifest so a following write needs no second lookup, sweep the doc-sync doc set, and lock it with regression coverage plus a no-*Id guard. The write surface and the weave-slug exception are untouched; the full CLI rename and the resource catalog are sibling threads (cli/cli-surface-naming, ai-integration/loom-resource-catalog). Requires build-all + an MCP/session restart to take effect on a running server.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Rename resource URI placeholders in the registry to the contract: docs/{docUlid}, context/{docUlid}, context/thread/{weaveSlug}/{threadSlug}, plan/{planUlid}, requires-load/{docUlid}. Update the RESOURCE_TEMPLATES descriptions to match. | packages/mcp/src/server.ts, packages/mcp/src/resources/context.ts | — | IN1 |
| ✅ | 2 | Rename prompt args to strict contract across all prompts: weaveId/threadId → weaveSlug/threadSlug; planId → planUlid (ULID only — retire the filename dual-accept per naming rule 2). Update promptDef.arguments, the arg reads, and the URIs each prompt builds. | packages/mcp/src/prompts/continueThread.ts, packages/mcp/src/prompts/doNextStep.ts, packages/mcp/src/prompts/refineDesign.ts, packages/mcp/src/prompts/weaveIdea.ts, packages/mcp/src/prompts/weaveDesign.ts, packages/mcp/src/prompts/weavePlan.ts | — | IN2 |
| ✅ | 3 | Fix the in-repo prompt callers the arg rename breaks — minimal lockstep only, not the full CLI rename: loom next passes planUlid to do-next-step. Audit for any other in-repo getPrompt callers and update them too. | packages/cli/src/commands/next.ts | prompt-args-strict-ulid-slug | C2 |
| ✅ | 4 | Rewrite the prompt bodies' tool-call guidance to the current tool contract: use snake_case weave_slug/thread_ulid, and make the create-plan guidance use goal + a structured steps array (never a content Steps table). Fixes the doubly-stale weave-plan/weave-design/weave-idea instructions. | packages/mcp/src/prompts/weaveIdea.ts, packages/mcp/src/prompts/weaveDesign.ts, packages/mcp/src/prompts/weavePlan.ts | prompt-args-strict-ulid-slug | IN3 |
| ✅ | 5 | Manifest enhancement: stamp the resolved weave_slug and thread_ulid (and anchor doc ULIDs if cheap) into the context-bundle manifest header emitted by assembleContext — extend the existing <!-- loom:context-bundle … --> comment, leave the bundle body unchanged. | packages/mcp/src/resources/context.ts | — | IN4 |
| ✅ | 6 | Expose two explicit context-addressing forms, each strict about its own input (naming rule 2): a ULID form (context/{docUlid}, plan/{planUlid}) accepting the ULID only, and a slug form for human pointing — the existing thread form context/thread/{weaveSlug}/{threadSlug} plus a path-qualified doc form (e.g. context/{weaveSlug}/{threadSlug}/{docSlug}) — resolving slug→ULID via the existing link index (resolveId over buildLinkIndex). Fully satisfies IN5's slug-addressing intent while keeping the ULID form strict; no req amend needed. | packages/mcp/src/resources/context.ts | resource-uri-placeholders-ulid-slug | IN5 |
| ✅ | 7 | Doc sweep in one commit (doc-sync row 3): update mcp-reference.md (§1 resources + §3 prompts), CLAUDE.md, ctx.md, and the LOOM_CLAUDE_MD template so every placeholder and prompt-arg name matches the renamed code. | loom/refs/mcp-reference.md, CLAUDE.md, loom/ctx.md, packages/app/src/installWorkspace.ts | resource-uri-placeholders-ulid-slug, prompt-args-strict-ulid-slug | IN6 |
| ✅ | 8 | Regression + guard coverage, then build-all and run test-all: an MCP integration test asserting loom://context/thread/{weaveSlug}/{threadSlug} returns a bundle whose manifest carries thread_ulid=th_…, and a guard test that no RESOURCE_TEMPLATES uriTemplate and no prompt arg name contains the *Id token. Add the new test to scripts/test-all.sh. | packages/mcp/tests/integration.test.ts, tests/mcp-read-surface-naming.test.ts, scripts/test-all.sh | resource-uri-placeholders-ulid-slug, prompt-args-strict-ulid-slug, context-bundle-manifest-carries-the-thread | IN7 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
