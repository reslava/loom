---
type: design
id: de_01KWWPT2GMZ4YRE270SNJZ3D5T
title: Reduce marketplace-to-working-Loom friction
status: done
created: 2026-07-06
version: 1
idea_version: 2
tags: []
parent_id: id_01KWWNAKHSB3V9MVCHMMFA30VX
requires_load: []
---
# Reduce marketplace-to-working-Loom friction

## Approach

Two prongs from the idea, realized as **two independently-shippable plans in this thread** (not two threads — they share one idea and one success metric; only their done-criteria differ):

- **Plan A — dissolve the setup pipeline** (engineering: bundling, spawn, in-process install, `.mcp.json`, AI funnel).
- **Plan B — sharpen discoverability** (content: value prop, keywords, walkthrough, empty-state, example seed, AI status, reviews).

The architecture risk is concentrated entirely in Plan A (specifically the Node-spawn decision). Plan B is low-risk content and can ship first.

---

## Prong A — the setup pipeline

### A1. Bundle the MCP server into the VSIX
Today `mcp-client.ts:57` spawns `command: 'loom'` — a global binary. Instead, esbuild-bundle the `packages/mcp` entrypoint plus its `app`/`core`/`fs`/`telemetry` deps into `packages/vscode/dist/loom-mcp.js`, shipped inside the VSIX. The extension spawns *that* file. The extension's tree + CRUD then work with **no global install and no PATH probe** — Gate 2 and the PATH-staleness failure both disappear.

### A2. Node spawn strategy — **the key decision**
The bundled server is JS; something must run it.

- **(a) Electron's own Node** — spawn `process.execPath` with env `ELECTRON_RUN_AS_NODE=1`. Ships inside VS Code, so **no user Node required at all**; deterministic version; works offline.
- **(b) system `node` on PATH** — reintroduces a dependency and the exact PATH-staleness class of bug we're removing.

**Recommendation: (a).** It's the only option that actually delivers "zero external dependency for the tree." Known risk: `ELECTRON_RUN_AS_NODE` + the MCP SDK's `StdioClientTransport` needs verification that stderr piping (`mcp-client.ts:64`) and stdio framing still behave. **Prototype this before committing the rest of Plan A** — it's the load-bearing assumption.

### A3. In-process workspace init
With `app` bundled, import `installWorkspace` and call it directly (deps: `{ fs, registry, cwd }`) instead of `terminal.sendText('loom install')` (`extension.ts:485`). Wrap in `withProgress`, surface real errors. Rewrite `showSetupNotification` (`extension.ts:367`) so it **re-checks and re-prompts per remaining step** rather than setting `setupNotificationShown` once and going silent (`extension.ts:407`) — the folded FP1 lesson.

### A4. Telemetry key baking
Today only the CLI's esbuild bakes the PostHog key; the extension currently rides the *global* CLI's baked key because it spawns `loom mcp`. Once we spawn a **bundled** server, the VSIX build must bake the same key (same release secret) or extension-driven telemetry silently goes dark. This is a release-pipeline change, not just code.

### A5. `.mcp.json` → pinned `npx`
`installWorkspace` writes `.mcp.json` for the **Claude Code agent's** MCP (separate from the extension's bundled server). Use `command: "npx", args: ["-y", "@reslava/loom@<version>", "mcp"]`, version pinned to the extension at write time — no global install for the agent, and no lockstep skew between the agent's server and the bundled one. (Rejected alternative: point `.mcp.json` at the bundled `dist/loom-mcp.js` by absolute path — brittle, the path changes every extension update.)

### A6. Claude Code onboarding funnel
Detect via `isClaudeInstalled` (`claudeTerminal.ts:13`). When absent, the first AI action funnels to the install page (half-built at `claudeTerminal.ts:66`) instead of dead-ending, and the API-key fallback stays discoverable in settings. Visible status handled in B5.

---

## Prong B — discoverability

- **B1. Value prop + keywords + getting-started link** (`package.json` + both READMEs). New short description e.g. *"AI workflow engine: turns project docs into a structured graph."* Add keywords `mcp`, `ai-agent`, `claude-code`, `workflow-automation`. Put the Getting Started link above the fold.
- **B2. Walkthrough rewrite** — end on a *runnable* first loop (create chat → generate idea), not prose.
- **B3. Empty-state `viewsWelcome`** — no-weaves tree shows action buttons (Create first chat / Initialize / Start with example) instead of a dead panel.
- **B4. Seed an example weave** — see open decision #3; recommend an **opt-in "Start with an example" button in the empty state**, not auto-seeding every `loom install` (auto-seed pollutes real repos = new friction).
- **B5. AI status indicator** — see open decision #2.
- **B6. Reviews / social proof** — ask Open VSX / GitHub users to leave a Marketplace review (non-code, your action).

---

## Open decisions (need your call before plans)

1. **Node spawn** — Electron Node (a, recommended) vs system Node (b).
2. **AI status placement** — a third status-bar item next to Feedback + Telemetry, vs. a status row inside the Loom sidebar. I lean **status-bar item** for consistency with the two existing ones and because it's visible without opening the panel; sidebar row is tidier but hidden until the view is open.
3. **Example seed** — opt-in empty-state button (recommended) vs. auto-seed on install.
4. **Sequencing** — I recommend **Plan B content quick-wins first** (keywords, value prop, getting-started link, walkthrough, empty-state — low risk, immediate listing lift; GIF + funnel already shipped), **then Plan A bundling** (the real engineering), **then** example-seed + AI-status polish.

## Non-goals (carried from the idea)
No promotion of the API-key/sampling path; no deletion of the global `loom` npm package (still ships for CLI users and the `npx` path).

## Plans this design implies
- **plan-001** — Prong A (A1–A6), gated on the A2 spawn prototype.
- **plan-002** — Prong B (B1–B6).
- Optional **req** first to lock scope (Included/Excluded/Constraints) before planning — worth it here because scope has grown from "auto-install CLI" to a pipeline-plus-positioning push.