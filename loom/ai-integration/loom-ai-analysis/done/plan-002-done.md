---
type: done
id: pl_01KXB3GQBMK693G5P3S40WHSGR-done
title: Done — Doc-graph reports — polish + standalone (Groups A+B)
status: done
created: 2026-07-12
version: 4
tags: []
parent_id: pl_01KXB3GQBMK693G5P3S40WHSGR
requires_load: []
---
# Done — Doc-graph reports — polish + standalone (Groups A+B)

## Step 1 — Fix the double-dated report filename. Update the `report` MCP prompt to instruct a DATE-LESS title (createReport already appends `({date})`), and defensively strip an embedded `(YYYY-MM-DD)` from the title inside createReport so the filename can never double regardless of what the agent passes.

Fixed the double-dated filename two ways. (1) `packages/app/src/createReport.ts`: strip a trailing `(YYYY-MM-DD)` from the title (`cleanTitle`) before both the filename stem and the frontmatter title — so the filename's appended `({date})` can never double, and a redundant date never lands in the stored title (the date already lives in created/generated_at). (2) `packages/mcp/src/prompts/report.ts`: the persist instruction now asks for a title WITHOUT a date. Root-cause fix at the prompt + defensive strip in the writer.

## Step 2 — Reframe the `loom report` CLI output so a bare-terminal run is never mistaken for a finished report: print a clear header marking the printed text as a BRIEF for an AI agent (e.g. `↓ This is a brief — hand it to your AI agent, or re-run with --run; it will write and save the report`). Keep the `report` prompt itself agent-clean (human framing lives at the CLI edge).

`packages/cli/src/commands/report.ts`: wrapped the printed brief with human framing at the CLI edge — a bold header (`↓ This is a BRIEF for your AI agent — not a finished report.`) + a gray sub-line explaining it, and a footer pointing to `loom report <kind> --run`. The `report` prompt stays agent-clean (framing lives only in the CLI, the human surface). Directly addresses the bare-terminal confusion from chat-002.

## Step 3 — Add `loom report <kind> --run`: launch a Claude CLI agent that consumes the assembled brief end-to-end (synthesize the report + persist via loom_create_report), mirroring the extension's launchClaude pattern. Without --run the CLI keeps printing the reframed brief (the no-agent default). Note: the exact launch shape (interactive vs headless `claude -p`, ensuring MCP is reachable) is a design decision to settle at implementation.

Added `loom report <kind> --run` (option b, headless via stdin, per Rafa's call in chat-002). `packages/cli/src/commands/report.ts`: restructured to capture the brief, close the MCP client, then branch — without --run it prints the reframed brief (step 2); with --run it calls `runAgent`, which spawns `claude -p --allowedTools mcp__loom__loom_create_report` with `stdio: ['pipe','inherit','inherit']`, pipes the brief in on stdin (avoids the ~32k Windows argv-length limit a large roadmap slice would blow), and inherits stdout so the run is visible. Pre-allows only the write tool (everything the agent reads is already in the brief). `shell: true` so Windows resolves `claude.cmd`; args are static/no user input so quoting is safe. ENOENT → friendly "install Claude Code, or run without --run" error. Registered the `--run` option in `packages/cli/src/index.ts`.

## Step 4 — Run ./scripts/build-all.sh then ./scripts/test-all.sh. Verify: a generated report filename carries a SINGLE date; `loom report project-overview` prints the reframed brief with the agent-handoff header; `loom report project-overview --run` drives an agent that persists a report under loom/reports/. Add/adjust tests as needed (e.g. assert createReport de-dupes a dated title).

Ran ./scripts/build-all.sh (clean) + ./scripts/test-all.sh (all 23 suites pass). Added a de-dup case to tests/reports.test.ts: a title ending in `(2026-07-12)` yields a filename with exactly ONE date and a de-dated frontmatter title. Live verification: `loom report --help` shows the `--run` option; `loom report project-overview` prints the reframed brief with the `↓ This is a BRIEF for your AI agent` header. Deliberately did NOT execute a full `loom report --run` in verify — it would spawn a real paid Claude agent and mint a stray report; the wiring is verified via --help + the code path, and Rafa can run it live when he wants.
