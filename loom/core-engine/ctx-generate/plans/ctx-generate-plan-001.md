---
type: plan
id: pl_01KSYES8RRR8N3JPQ0PC1QJN4J
title: Consolidate ctx generators into one (global + weave)
status: done
created: 2026-05-31
updated: 2026-05-31
version: 1
design_version: 1
tags: []
parent_id: de_01KSYEC48HS5VPGRDK5FFDPDFH
requires_load: []
target_version: 0.1.0
actual_release: 0.7.0
steps:
  - id: app-add-pure-buildctxsource-scope-ids
    order: 1
    status: done
    description: "app: add pure buildCtxSource(scope, ids, state) in packages/app/src/buildCtxSource.ts — weave rolls up the weave's threads (primary design body, ideas, plans with step progress, done decisions + open items, lifted from summarise.ts); global lists active/implementing weaves + threads with one-line status. Export from app/index.ts. Add tests/build-ctx-source.test.ts (fixture-driven, pure)."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: app-add-ctx-target-idempotency-helpers
    order: 2
    status: done
    description: "app: add ctx target + idempotency helpers co-located with buildCtxSource — ctxTarget(scope, ids, state) returning ctxId/relPath/title, computeSourceHash(source) via node crypto sha1, and a canonical ctx frontmatter builder (id loom-ctx or {weave}-ctx, parent_id null, version increments, tags [ctx, summary], source_hash). Pure."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: mcp-rewrite-loom-refresh-ctx-to
    order: 3
    status: done
    description: "mcp: rewrite loom_refresh_ctx to assemble-not-generate — inputs scope (global|weave) + optional weaveId; no sampling. getState, buildCtxSource, computeSourceHash, compare to existing ctx source_hash for stale, ensure the ctx shell exists at the canonical path (write frontmatter if missing), return JSON with ctxId, targetPath, scope, stale, source."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: remove-the-two-redundant-generators-delete
    order: 4
    status: done
    description: Remove the two redundant generators — delete packages/mcp/src/tools/summarise.ts and generateGlobalCtx.ts and unregister both in server.ts; delete packages/app/src/summarise.ts and its app/index.ts export; delete tests/summarise.test.ts (superseded by build-ctx-source.test.ts).
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: cli-remove-the-summarise-context-command
    order: 5
    status: done
    description: "CLI: remove the summarise-context command (packages/cli/src/index.ts) and packages/cli/src/commands/summarise.ts — it depended on the deleted app inference path; ctx generation is now an agent/MCP flow. Remove the summarise-context block from tests/commands.test.ts."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: extension-collapse-to-one-ctx-flow
    order: 6
    status: done
    description: "Extension: collapse to one ctx flow — rewrite loom.refreshCtx to call loom_refresh_ctx(scope, weaveId?), then launch the agent with the returned source and an instruction to write the summary via loom_update_doc on ctxId. Remove the redundant loom.summarise and loom.generateGlobalCtx commands (their command files, registrations in extension.ts, and package.json contributions)."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: subsume-global-ctx-verify-note-core
    order: 7
    status: done
    description: "Subsume global-ctx + verify — note core-engine/global-ctx as subsumed (global generation now lives in the unified tool). Run ./scripts/build-all.sh and ./scripts/test-all.sh green; smoke: exercise loom_refresh_ctx for global and weave (shell created at canonical path, source assembled, stale flag)."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Consolidate ctx generators into one (global + weave)

## Goal

Replace the three divergent ctx generators with one assemble-not-generate tool, loom_refresh_ctx(scope: global|weave, weaveId?), that assembles the scope source + ensures the ctx shell at the canonical flat path and lets the agent write the body via loom_update_doc (D1=b). No server-side inference; uniform across CLI and the extension. Remove loom_summarise + loom_generate_global_ctx + the CLI summarise-context command + redundant extension commands. One frontmatter template (parent_id null, version increments, source_hash idempotency).
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | app: add pure buildCtxSource(scope, ids, state) in packages/app/src/buildCtxSource.ts — weave rolls up the weave's threads (primary design body, ideas, plans with step progress, done decisions + open items, lifted from summarise.ts); global lists active/implementing weaves + threads with one-line status. Export from app/index.ts. Add tests/build-ctx-source.test.ts (fixture-driven, pure). | — | — | — |
| ✅ | 2 | app: add ctx target + idempotency helpers co-located with buildCtxSource — ctxTarget(scope, ids, state) returning ctxId/relPath/title, computeSourceHash(source) via node crypto sha1, and a canonical ctx frontmatter builder (id loom-ctx or {weave}-ctx, parent_id null, version increments, tags [ctx, summary], source_hash). Pure. | — | — | — |
| ✅ | 3 | mcp: rewrite loom_refresh_ctx to assemble-not-generate — inputs scope (global\|weave) + optional weaveId; no sampling. getState, buildCtxSource, computeSourceHash, compare to existing ctx source_hash for stale, ensure the ctx shell exists at the canonical path (write frontmatter if missing), return JSON with ctxId, targetPath, scope, stale, source. | — | — | — |
| ✅ | 4 | Remove the two redundant generators — delete packages/mcp/src/tools/summarise.ts and generateGlobalCtx.ts and unregister both in server.ts; delete packages/app/src/summarise.ts and its app/index.ts export; delete tests/summarise.test.ts (superseded by build-ctx-source.test.ts). | — | — | — |
| ✅ | 5 | CLI: remove the summarise-context command (packages/cli/src/index.ts) and packages/cli/src/commands/summarise.ts — it depended on the deleted app inference path; ctx generation is now an agent/MCP flow. Remove the summarise-context block from tests/commands.test.ts. | — | — | — |
| ✅ | 6 | Extension: collapse to one ctx flow — rewrite loom.refreshCtx to call loom_refresh_ctx(scope, weaveId?), then launch the agent with the returned source and an instruction to write the summary via loom_update_doc on ctxId. Remove the redundant loom.summarise and loom.generateGlobalCtx commands (their command files, registrations in extension.ts, and package.json contributions). | — | — | — |
| ✅ | 7 | Subsume global-ctx + verify — note core-engine/global-ctx as subsumed (global generation now lives in the unified tool). Run ./scripts/build-all.sh and ./scripts/test-all.sh green; smoke: exercise loom_refresh_ctx for global and weave (shell created at canonical path, source assembled, stale flag). | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
