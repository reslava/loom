---
type: req
id: rq_01KWWQVE2G2JFRZ9521RJY3M57
title: Reduce marketplace-to-working-Loom friction — Requirements
status: locked
created: 2026-07-06
updated: 2026-07-07
version: 2
design_version: 1
tags: []
parent_id: de_01KWWPT2GMZ4YRE270SNJZ3D5T
requires_load: []
---
# Reduce marketplace-to-working-Loom friction — Requirements

### ✅ Included

- `IN1` Bundle the MCP server (+ `app`/`core`/`fs`/`telemetry`) into the VSIX and spawn it as a bundled JS file, so the extension's tree + CRUD work with no global CLI install.
- `IN2` Spawn the bundled server with **Electron's own Node** (`process.execPath` + `ELECTRON_RUN_AS_NODE=1`) — no user-installed Node required; **works offline** (explicit bonus to highlight).
- `IN3` Prototype the A2 spawn (Electron Node + MCP SDK stdio: stderr piping + framing) **as a gate** before committing the rest of Plan A.
- `IN4` Replace terminal `loom install` with an **in-process workspace init** (real progress + error surfacing).
- `IN5` Rewrite onboarding so it **re-checks and re-prompts per remaining step** instead of firing once and going silent (folded FP1 lesson).
- `IN6` Write `.mcp.json` for the Claude Code agent with `npx -y @reslava/loom@<version> mcp`, version **pinned to the extension**.
- `IN7` Detect Claude Code; when absent, **funnel to its install page** on first AI action; keep the API-key fallback discoverable in settings.
- `IN8` Surface AI status (Claude Code ✓/✗) as a **third status-bar item** alongside Feedback + Telemetry.
- `IN9` Bake the telemetry PostHog key into the **VSIX build** (release-pipeline change) so the bundled server keeps emitting consent-gated events.
- `IN10` Discoverability: new value prop, keywords (`mcp`, `ai-agent`, `claude-code`, `workflow-automation`), prominent Getting Started link, walkthrough rewrite ending in a runnable first loop, empty-state `viewsWelcome`.
- `IN11` Seed a tiny example weave **only via an opt-in "Start with an example" button** in the empty state.
- `IN12` Ship A + B in **one release**; B's documentation/positioning is written against the **finished** A behavior.
- `IN13` The **three distinct delivery surfaces / audiences** are made explicit and kept distinct across the main README, CLI README, and extension README — each audience gets a focused, non-conflated install + usage story: (1) **Extension** (VS Code human, 1-click, bundled server, no CLI); (2) **Claude Code agent** (`.mcp.json` → npx-fetched server, no global install); (3) **CLI + MCP** (non-VS-Code hosts — Cursor/Continue/terminal Claude Code — plus CI/scripting). Extension is the recommended hero everywhere it applies; the CLI/MCP path stays a first-class, signposted alternative rather than being funneled into the extension.
- `IN14` `loom/refs/architecture-reference.md` gains a **delivery-surfaces / audiences architecture diagram** covering the three surfaces (optionally split into linked per-surface docs), so the "too many surfaces — which do I need?" confusion is resolved in one canonical place.

### ❌ Excluded

- `EX1` Promoting or first-classing the API-key/sampling AI path (kept as fallback only).
- `EX2` Deleting the global `@reslava/loom` npm package (still ships for CLI users and the `npx` path).
- `EX3` Auto-seeding an example weave on every `loom install` (pollutes real repos).
- `EX4` Spawning via system `node` on PATH — unless the IN3 prototype forces it as a fallback.
- `EX5` Two separate releases for A and B.

### ⛓ Constraints

- `C1` B's positioning must not overpromise the zero-install flow before A ships — docs stay truthful to shipped behavior.
- `C2` Lockstep versioning holds; the `.mcp.json` npx version is pinned to the extension version.
- `C3` Layer rules unchanged (`vscode → mcp → app → core/fs`; no upward imports); bundling must not violate them.
- `C4` The bundled-server spawn must require no user-installed Node.
- `C5` Telemetry stays off by default and consent-gated.