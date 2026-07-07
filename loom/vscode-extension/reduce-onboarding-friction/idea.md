---
type: idea
id: id_01KWWNAKHSB3V9MVCHMMFA30VX
title: Reduce marketplace-to-working-Loom friction
status: done
created: 2026-07-06
updated: 2026-07-06
version: 2
tags: []
parent_id: null
requires_load: []
---
# Reduce marketplace-to-working-Loom friction

## Why this matters

The extension has ~426 marketplace downloads in 30 days but ~2 retained installs. The funnel from *view* → *working Loom* leaks almost everything. Tracing the code, the "two-step barrier" the marketplace describes is actually **four gates**, only one of which the listing mentions:

1. **Node/npm present** — never checked.
2. **`@reslava/loom` global CLI** — `npm install -g`; probed via `execSync('loom --version')` (`extension.ts:469`).
3. **`loom install`** in the repo — writes `.loom/`, `.mcp.json`, `CLAUDE.md`.
4. **Claude Code CLI** — a *separate* install (`claudeTerminal.ts:13`), needed the instant the user clicks Generate/Refine/DoStep.

Gates 1, 3, 4 are invisible until they fail. Worse, even a *correct* CLI install reads as failure because the extension host's PATH is captured at launch, so `loom --version` keeps failing until VS Code is fully restarted — the user does everything right and Loom still says "not found," then uninstalls.

This idea removes the reason those gates exist and makes the ones that remain honest and guided.

## What we want to build

Two prongs of one goal (higher install conversion). Both are in scope; they split into separate designs/plans later.

### Prong A — Dissolve the setup pipeline (engineering)

- **Bundle `app`+`mcp`+`cli` into the VSIX** and spawn the MCP server as `node <extensionPath>/dist/mcp.js` instead of a global `loom` (`mcp-client.ts:57` currently hardcodes `command: 'loom'`). The tree + CRUD then work the instant the extension installs — **zero npm install**. Eliminates Gate 2 and the PATH-staleness failure.
- **In-process workspace init.** With `app` bundled, the "Initialize Loom in this workspace?" affordance calls `installWorkspace()` directly — a real function with a return value and try/catch — instead of `terminal.sendText('loom install')` (`extension.ts:485`). Real success/error handling; no fire-and-forget terminal. The onboarding prompt must **re-check and re-prompt per step** (the FP1 lesson) rather than firing once and going silent (`extension.ts:407`).
- **`.mcp.json` uses `npx -y @reslava/loom@<pinned-version> mcp`** so the *Claude Code* agent's own MCP needs no global install; pin to the extension's exact version to avoid lockstep skew.
- **Claude Code onboarding funnel.** Detect Claude Code; when absent, funnel to its install page (half-done at `claudeTerminal.ts:66`) instead of dead-ending on first Generate. Keep the API-key sampling fallback discoverable in settings.

### Prong B — Sharpen discoverability (positioning)

- **Clarify the value prop.** Replace vague "AI-assisted workflow" with something concrete, e.g. *"AI workflow engine: turns project docs into a structured graph."*
- **Target keywords** in `package.json`: `mcp`, `ai-agent`, `claude-code`, `workflow-automation` — not just `ai`/`loom`.
- **Prominent Getting Started link** above the fold so an interested user can verify fit *before* installing.
- **Rewrite the "Loom AI" walkthrough** to end in a runnable first loop (create chat → generate idea), not just prose.
- **Empty-state welcome view** (`viewsWelcome`): when there are no weaves, the tree shows action buttons (Create first chat / Initialize) instead of a dead panel.
- **Seed reviews / social proof** — ask existing Open VSX / GitHub users to leave a Marketplace review.

## Explicitly NOT in scope

- **Not** making the API-key/sampling path first-class — it's a captive text-completion call the vision disparages; kept as a fallback, not promoted.
- **Not** deleting the global `loom` npm package — it still ships for CLI users and the `npx` path. We remove it as a *hard prerequisite*, not as a product.

## Positioning truth to encode

Loom is **MCP-agent-agnostic underneath** (Cursor, Continue, any MCP host drive it) with a **Claude-Code convenience layer** on the extension's launch buttons. Stop presenting the extension as provider-neutral; make Claude Code the recommended AI for it while keeping MCP-agnosticism as the top-line pitch.

## Success criteria

- Installing the extension yields a working tree + CRUD with **no npm install and no terminal step**.
- A correct setup never reads as failure (no PATH-probe race).
- First Generate click never dead-ends — it either launches an agent or funnels to a clear install.
- Marketplace listing states real dependencies honestly and leads with the zero-install experience.
- The activation → init → first-weave → first-AI-action **funnel is instrumented**, so drop-off is measured, not guessed.

## Already shipped (leverage, don't rebuild)

- **Conversion-funnel telemetry** exists, but it's **off by default**, so there is *no data yet* — the 426→2 drop-off is still a guess. Opt-in rate is the real blocker to visibility; the instrumentation is not.
- **Hero GIF** is already present in all READMEs.

## Folded into scope (committed)

- **Seed a tiny example weave on init** so the tree is never empty on first open — the user sees the weave→thread→idea→plan shape immediately.
- **Surface AI status (Claude Code ✓/✗)** so Gate 4 is visible upfront, not on first Generate click. Placement is an open design question: a third status-bar item (alongside the existing Feedback + Telemetry items) vs. a status row in the Loom sidebar.
