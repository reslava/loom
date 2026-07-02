---
type: plan
id: pl_01KRT2TST0TZZG16HERT2KTCW0
title: Instrument MCP and capture a timeout
status: done
created: 2026-05-17
updated: 2026-05-17
version: 1
design_version: 2
tags: []
parent_id: de_01KRT2RZGM09CBDB9B9BZF1GH1
requires_load: []
target_version: 0.1.0
actual_release: 0.6.5
steps:
  - id: client-instrumentation-in-packages-vscode-src
    order: 1
    status: done
    description: "Client instrumentation in packages/vscode/src/mcp-client.ts: create the \"Loom MCP\" output channel; add a logged() wrapper around readResource and callTool that records {id, label, startedAt, durationMs, outcome, inFlight}; bridge the spawned child's stderr into the same channel with a [server] prefix; log child exit/close with code+signal. No behavior changes — only logging."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: server-instrumentation-in-packages-mcp-src
    order: 2
    status: done
    description: "Server instrumentation in packages/mcp/src/stateCache.ts and packages/mcp/src/resources/state.ts: emit bracketed-prefix stderr lines on every cache invalidate / miss / rebuild start / rebuild end / hit, and one [state] read uri=… cacheHit=… totalMs=… line per resource read. Plain stderr — no structured logging."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: reproduce-and-diagnose-build-reload-the
    order: 3
    status: pending
    description: "Reproduce and diagnose: build, reload the extension, capture (a) the cold getState() duration on session start and (b) the fs.watch invalidation count during a single DoStep, then drive the workspace until a timeout fires and save the full \"Loom MCP\" output. Paste the log into the chat. Identify which hypothesis the evidence supports. The real fix is scoped in a new thread — not in this plan."
    files_touched: []
    blocked_by: []
    satisfies: []
---
# Instrument MCP and capture a timeout

| | |
|---|---|
| **Created** | 2026-05-17 |
| **Status** | DRAFT |
| **Design** | `{design-id}.md` |
| **Target version** | {X.X.X} |

---

## Goal

Add client + server instrumentation, capture a real timeout in the "Loom MCP" output channel, identify which of the three hypotheses (cache thrashing / transport stall / silent child death) the evidence supports. No fixes in this plan — the fix lives in a follow-up thread designed against the captured log.
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Client instrumentation in packages/vscode/src/mcp-client.ts: create the "Loom MCP" output channel; add a logged() wrapper around readResource and callTool that records {id, label, startedAt, durationMs, outcome, inFlight}; bridge the spawned child's stderr into the same channel with a [server] prefix; log child exit/close with code+signal. No behavior changes — only logging. | — | — | — |
| ✅ | 2 | Server instrumentation in packages/mcp/src/stateCache.ts and packages/mcp/src/resources/state.ts: emit bracketed-prefix stderr lines on every cache invalidate / miss / rebuild start / rebuild end / hit, and one [state] read uri=… cacheHit=… totalMs=… line per resource read. Plain stderr — no structured logging. | — | — | — |
| 🔳 | 3 | Reproduce and diagnose: build, reload the extension, capture (a) the cold getState() duration on session start and (b) the fs.watch invalidation count during a single DoStep, then drive the workspace until a timeout fires and save the full "Loom MCP" output. Paste the log into the chat. Identify which hypothesis the evidence supports. The real fix is scoped in a new thread — not in this plan. | — | — | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
