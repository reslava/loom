---
type: done
id: pl_01KWWRH4811GS66D4RY1GYDH4T-done
title: Done — Plan B — Sharpen discoverability
status: done
created: 2026-07-07
version: 1
tags: []
parent_id: pl_01KWWRH4811GS66D4RY1GYDH4T
requires_load: []
---
# Done — Plan B — Sharpen discoverability

## Step 1 — Add target keywords (mcp, ai-agent, claude-code, workflow-automation) to package.json and make the Getting Started link prominent (above the fold) in both READMEs. A-independent, does not overpromise — safe to land anytime.

Added `keywords` to packages/vscode/package.json (mcp, ai-agent, claude-code, workflow-automation, ai, workflow, documentation, markdown, cursor). Made the Getting Started link prominent in the VS Code README's install section (above the fold) and added an extension cross-link in the CLI README.

## Step 2 — Rewrite the value prop / short description across the marketplace listing and both READMEs to the concrete 'AI workflow engine: turns project docs into a structured graph' framing, including the zero-install positioning — written against Plan A's shipped behavior.

Rewrote the value prop + zero-install positioning. package.json `description` → 'AI workflow engine: turns your project docs into a structured graph your AI agent reads and writes. 1-click in VS Code — no CLI, no setup.' VS Code README Install section rewritten to the 1-click/no-CLI flow; Requirements updated (no global CLI); `.mcp.json` example → pinned `npx`. CLI README gained an audience callout (extension for VS Code users; this package for agents/CLI/CI). Root README Quick Start leads with the extension path; its `.mcp.json` example → `npx`.

## Step 3 — Rewrite the 'Loom AI' walkthrough to end in a runnable first loop (create chat → generate idea), demonstrating the actually-shipped zero-install flow rather than prose.

Moved the walkthrough OUT of package.json into its own directory (your request): packages/vscode/walkthroughs/01-initialize.md, 02-connect-ai.md, 03-first-weave.md, 04-run-the-loop.md, referenced from each step via `media.markdown`. Dropped the obsolete 'Install Loom CLI' (`npm install -g`) step; the walkthrough now goes Initialize (1 click) → Connect AI (optional) → First weave / Start with an example → Run the loop. Confirmed `vsce ls` ships all four files.

## Step 4 — Add a viewsWelcome empty-state to the Loom tree: when there are no weaves, show action buttons (Create first chat / Initialize workspace / Start with an example) instead of a dead panel.

Reworked the `viewsWelcome` empty-states: not-initialized → '1-click, no CLI needed' with Initialize + Open walkthrough; initialized-but-no-weaves → New Weave + 'Start with an example' (loom.seedExample).

## Step 5 — Implement the opt-in 'Start with an example' seed: a command (wired from the empty state) that seeds one tiny example weave→thread→idea→plan via the in-process app — never auto-seeded on install.

Opt-in example seed. New `loom_seed_example` MCP tool (packages/mcp/src/tools/seedExample.ts) composing the existing app create use-cases (createWeave → createThread → weaveIdea → weavePlan) to seed one clearly-labelled `example` weave→thread→idea→plan; registered in the `workspace` group (catalog auto-lists it). Extension `loom.seedExample` command calls it via MCP with progress + error handling. **Deviation from plan file list:** put the composition in the MCP tool (mcp → app) rather than a new packages/app/src/seedExample.ts — cleaner, avoids duplicating deps wiring, and there is no other caller (YAGNI); still correct-layered. Verified end-to-end against a temp dir: creates thread.md, idea.md, plans/plan-001.md and returns the ids. Never auto-run on install (EX3).

## Step 6 — Update loom/refs/architecture-reference.md with a delivery-surfaces / audiences architecture diagram covering the three surfaces (extension = 1-click bundled server; Claude Code agent = npx-fetched server; CLI + MCP = non-VS-Code hosts/CI); split into linked per-surface docs if that reads clearer. Ensure the main / CLI / extension READMEs reflect the same three distinct surfaces, each with a focused per-audience install+usage story.

Added a 'Delivery surfaces & audiences' section to loom/refs/architecture-reference.md — an ASCII diagram of the one engine → three surfaces (bundled extension / npx agent / global CLI), a per-surface audience+delivery+prereqs table, and the design rules (surfaces never diverge; extension imports no app; positioning; CLI no longer a prerequisite). The three READMEs (root, vscode, cli) now carry a matching 'Three ways to run Loom' table linking to that section's anchor (#delivery-surfaces--audiences). Satisfies IN13 (READMEs reflect the 3 surfaces) + IN14 (architecture-reference diagram).

## Step 7 — Add a one-time 'What's New' upgrade toast for returning users: on activation, compare the last-seen extension version in globalState against the current version; when it crosses into this release, show once — 'Loom is now 1-click — no CLI, no setup' with a [Show me] action that opens the walkthrough. The only proactive channel to users who installed then quit over install friction.

What's-New upgrade toast (folded-in step). `maybeShowWhatsNew` in extension.ts fires once per version and ONLY for users upgrading from an older version — a fresh install stores the version silently and gets the walkthrough instead. Message: 'Loom is now 1-click — no CLI, no setup…', [Show me] → opens the Get Started walkthrough. Added the `loom.openWalkthrough` command (also used by the empty-state). Uses globalState `loom.whatsNewSeenVersion`. The one proactive channel to users who installed then quit over install friction.
