---
type: plan
id: pl_01KXB3GQBMK693G5P3S40WHSGR
title: Doc-graph reports — polish + standalone (Groups A+B)
status: done
created: 2026-07-12
updated: 2026-07-12
version: 1
design_version: 2
tags: []
parent_id: de_01KXAV5RB06F8E13CC9VKC22WE
requires_load: []
target_version: 0.1.0
steps:
  - id: double-date-filename-fix
    order: 1
    status: done
    description: Fix the double-dated report filename. Update the `report` MCP prompt to instruct a DATE-LESS title (createReport already appends `({date})`), and defensively strip an embedded `(YYYY-MM-DD)` from the title inside createReport so the filename can never double regardless of what the agent passes.
    files_touched: [packages/mcp/src/prompts/report.ts, packages/app/src/createReport.ts]
    blocked_by: []
    satisfies: []
  - id: reframe-the-cli-brief-output
    order: 2
    status: done
    description: "Reframe the `loom report` CLI output so a bare-terminal run is never mistaken for a finished report: print a clear header marking the printed text as a BRIEF for an AI agent (e.g. `↓ This is a brief — hand it to your AI agent, or re-run with --run; it will write and save the report`). Keep the `report` prompt itself agent-clean (human framing lives at the CLI edge)."
    files_touched: [packages/cli/src/commands/report.ts]
    blocked_by: []
    satisfies: []
  - id: loom-report-run-2b-agent-launch
    order: 3
    status: done
    description: "Add `loom report <kind> --run`: launch a Claude CLI agent that consumes the assembled brief end-to-end (synthesize the report + persist via loom_create_report), mirroring the extension's launchClaude pattern. Without --run the CLI keeps printing the reframed brief (the no-agent default). Note: the exact launch shape (interactive vs headless `claude -p`, ensuring MCP is reachable) is a design decision to settle at implementation."
    files_touched: [packages/cli/src/commands/report.ts]
    blocked_by: []
    satisfies: []
  - id: build-test-verify
    order: 4
    status: done
    description: "Run ./scripts/build-all.sh then ./scripts/test-all.sh. Verify: a generated report filename carries a SINGLE date; `loom report project-overview` prints the reframed brief with the agent-handoff header; `loom report project-overview --run` drives an agent that persists a report under loom/reports/. Add/adjust tests as needed (e.g. assert createReport de-dupes a dated title)."
    files_touched: [tests]
    blocked_by: [double-date-filename-fix, reframe-the-cli-brief-output, loom-report-run-2b-agent-launch]
    satisfies: []
---
# Doc-graph reports — polish + standalone (Groups A+B)

## Goal

Ship the cheap, immediately-useful follow-ups to the report first slice, fixing the exact first-run friction surfaced in chat-002: the double-dated filename, the bare-terminal brief that looks like a finished report, and the fact that `loom report` alone never runs the synthesis. Adds `loom report --run` to launch a Claude agent that consumes the brief end-to-end (the 2b path), while keeping the printed (reframed) brief as the no-agent default. Does NOT touch the doc-selection engine, new kinds, or filters — those are plan C.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Fix the double-dated report filename. Update the `report` MCP prompt to instruct a DATE-LESS title (createReport already appends `({date})`), and defensively strip an embedded `(YYYY-MM-DD)` from the title inside createReport so the filename can never double regardless of what the agent passes. | packages/mcp/src/prompts/report.ts, packages/app/src/createReport.ts | — | — |
| ✅ | 2 | Reframe the `loom report` CLI output so a bare-terminal run is never mistaken for a finished report: print a clear header marking the printed text as a BRIEF for an AI agent (e.g. `↓ This is a brief — hand it to your AI agent, or re-run with --run; it will write and save the report`). Keep the `report` prompt itself agent-clean (human framing lives at the CLI edge). | packages/cli/src/commands/report.ts | — | — |
| ✅ | 3 | Add `loom report <kind> --run`: launch a Claude CLI agent that consumes the assembled brief end-to-end (synthesize the report + persist via loom_create_report), mirroring the extension's launchClaude pattern. Without --run the CLI keeps printing the reframed brief (the no-agent default). Note: the exact launch shape (interactive vs headless `claude -p`, ensuring MCP is reachable) is a design decision to settle at implementation. | packages/cli/src/commands/report.ts | — | — |
| ✅ | 4 | Run ./scripts/build-all.sh then ./scripts/test-all.sh. Verify: a generated report filename carries a SINGLE date; `loom report project-overview` prints the reframed brief with the agent-handoff header; `loom report project-overview --run` drives an agent that persists a report under loom/reports/. Add/adjust tests as needed (e.g. assert createReport de-dupes a dated title). | tests | double-date-filename-fix, reframe-the-cli-brief-output, loom-report-run-2b-agent-launch | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
