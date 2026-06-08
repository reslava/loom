---
type: plan
id: pl_01KTJS51X8B0QWC8Z6MQAKGY5Y
title: CLI Commands — Tier 1+2 Plan
status: done
created: "2026-06-08T00:00:00.000Z"
updated: 2026-06-08
version: 1
design_version: 1
tags: []
parent_id: de_01KTJS4ME8XT191QZ53HVC9WKW
requires_load: []
target_version: 0.1.0
---
# CLI Commands — Tier 1+2 Plan

## Goal

Ship Tier 1 (loom catalog, loom resources) and Tier 2 (loom context, loom next, loom search, loom stale, loom blocked) as thin delivery-layer commands over an in-process MCP client helper and existing app use-cases. No new domain logic; Tier 3 (--json, loom doctor) deferred.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add packages/cli/src/mcpClient.ts: an in-process MCP client helper that builds the server via createLoomMcpServer(root), connects over an in-memory transport pair, runs initialize + notifications/initialized, and exposes readResource(uri) / listResources() / getPrompt(name, args) with teardown. Add a unit test that round-trips loom://catalog and asserts non-empty grouped markdown. | — | — | — |
| ✅ | 2 | Add `loom catalog` (commands/catalog.ts) — readResource('loom://catalog'), print grouped markdown — and wire it into index.ts. | — | — | — |
| ✅ | 3 | Add `loom resources` (commands/resources.ts): bare command lists resources (uri + title) via listResources(); `loom resources read <uri>` subcommand prints readResource(uri). Wire both into index.ts. | — | — | — |
| ✅ | 4 | Add `loom context <docId>` (commands/context.ts) over readResource('loom://context/<docId>') with --mode and the thread/<weave>/<thread> form, and `loom next [plan-id]` (commands/next.ts) over getPrompt('do-next-step', {planId}) defaulting to the active plan. Wire into index.ts. | — | — | — |
| ✅ | 5 | Add `loom search <query>` (commands/search.ts) over the app search use-case, printing id + title + snippet. Verify the app use-case exists; if missing add the thin wrapper in app, not the CLI. Wire into index.ts. | — | — | — |
| ✅ | 6 | Add `loom stale` (commands/stale.ts) and `loom blocked` (commands/blocked.ts) over the existing app stale-docs and blocked-steps use-cases, printing doc/step + reason. Wire into index.ts. | — | — | — |
| ✅ | 7 | Add command tests in the tests/commands.test.ts style against a fixture loom for each new command, then run ./scripts/build-all.sh and ./scripts/test-all.sh and confirm green. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
