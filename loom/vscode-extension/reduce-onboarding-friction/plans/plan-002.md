---
type: plan
id: pl_01KWWRH4811GS66D4RY1GYDH4T
title: Plan B — Sharpen discoverability
status: done
created: 2026-07-06
updated: 2026-07-07
version: 1
design_version: 1
req_version: 1
tags: []
parent_id: de_01KWWPT2GMZ4YRE270SNJZ3D5T
requires_load: []
target_version: 0.1.0
steps:
  - id: keywords-getting-started-link
    order: 1
    status: done
    description: Add target keywords (mcp, ai-agent, claude-code, workflow-automation) to package.json and make the Getting Started link prominent (above the fold) in both READMEs. A-independent, does not overpromise — safe to land anytime.
    files_touched: [packages/vscode/package.json, packages/vscode/README.md, packages/cli/README.md]
    blocked_by: []
    satisfies: [IN10]
  - id: value-prop-zero-install-positioning
    order: 2
    status: done
    description: "Rewrite the value prop / short description across the marketplace listing and both READMEs to the concrete 'AI workflow engine: turns project docs into a structured graph' framing, including the zero-install positioning — written against Plan A's shipped behavior."
    files_touched: [packages/vscode/package.json, packages/vscode/README.md, packages/cli/README.md]
    blocked_by: [pl_01KWWRGAMRRWKBH2A03Z7Q3H0X]
    satisfies: [IN10, IN12, C1]
  - id: walkthrough-runnable-first-loop
    order: 3
    status: done
    description: Rewrite the 'Loom AI' walkthrough to end in a runnable first loop (create chat → generate idea), demonstrating the actually-shipped zero-install flow rather than prose.
    files_touched: [packages/vscode/package.json, packages/vscode/walkthroughs]
    blocked_by: [pl_01KWWRGAMRRWKBH2A03Z7Q3H0X]
    satisfies: [IN10, C1]
  - id: empty-state-viewswelcome
    order: 4
    status: done
    description: "Add a viewsWelcome empty-state to the Loom tree: when there are no weaves, show action buttons (Create first chat / Initialize workspace / Start with an example) instead of a dead panel."
    files_touched: [packages/vscode/package.json, packages/vscode/src/extension.ts]
    blocked_by: [pl_01KWWRGAMRRWKBH2A03Z7Q3H0X]
    satisfies: [IN10]
  - id: opt-in-example-seed
    order: 5
    status: done
    description: "Implement the opt-in 'Start with an example' seed: a command (wired from the empty state) that seeds one tiny example weave→thread→idea→plan via the in-process app — never auto-seeded on install."
    files_touched: [packages/app/src/seedExample.ts, packages/vscode/src/extension.ts]
    blocked_by: [pl_01KWWRGAMRRWKBH2A03Z7Q3H0X]
    satisfies: [IN11, EX3]
  - id: 3-surface-docs-architecture-reference-audience
    order: 6
    status: done
    description: Update loom/refs/architecture-reference.md with a delivery-surfaces / audiences architecture diagram covering the three surfaces (extension = 1-click bundled server; Claude Code agent = npx-fetched server; CLI + MCP = non-VS-Code hosts/CI); split into linked per-surface docs if that reads clearer. Ensure the main / CLI / extension READMEs reflect the same three distinct surfaces, each with a focused per-audience install+usage story.
    files_touched: [loom/refs/architecture-reference.md, README.md, packages/cli/README.md, packages/vscode/README.md]
    blocked_by: [pl_01KWWRGAMRRWKBH2A03Z7Q3H0X]
    satisfies: [IN13, IN14, C1]
  - id: what-s-new-upgrade-toast-returning
    order: 7
    status: done
    description: "Add a one-time 'What's New' upgrade toast for returning users: on activation, compare the last-seen extension version in globalState against the current version; when it crosses into this release, show once — 'Loom is now 1-click — no CLI, no setup' with a [Show me] action that opens the walkthrough. The only proactive channel to users who installed then quit over install friction."
    files_touched: [packages/vscode/src/extension.ts, packages/vscode/package.json]
    blocked_by: [pl_01KWWRGAMRRWKBH2A03Z7Q3H0X]
    satisfies: [IN10, C1]
---
# Plan B — Sharpen discoverability

## Goal

Make the marketplace listing and first-run experience honestly convey and demonstrate the zero-install flow. The A-independent listing tweaks (keywords, Getting Started link) can land anytime; everything that promises or demonstrates the zero-install flow is cross-plan-blocked on Plan A so the copy and the walkthrough stay truthful to what actually shipped (C1). Ships in the same release as Plan A.

---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | Add target keywords (mcp, ai-agent, claude-code, workflow-automation) to package.json and make the Getting Started link prominent (above the fold) in both READMEs. A-independent, does not overpromise — safe to land anytime. | packages/vscode/package.json, packages/vscode/README.md, packages/cli/README.md | — | IN10 |
| ✅ | 2 | Rewrite the value prop / short description across the marketplace listing and both READMEs to the concrete 'AI workflow engine: turns project docs into a structured graph' framing, including the zero-install positioning — written against Plan A's shipped behavior. | packages/vscode/package.json, packages/vscode/README.md, packages/cli/README.md | pl_01KWWRGAMRRWKBH2A03Z7Q3H0X | IN10, IN12, C1 |
| ✅ | 3 | Rewrite the 'Loom AI' walkthrough to end in a runnable first loop (create chat → generate idea), demonstrating the actually-shipped zero-install flow rather than prose. | packages/vscode/package.json, packages/vscode/walkthroughs | pl_01KWWRGAMRRWKBH2A03Z7Q3H0X | IN10, C1 |
| ✅ | 4 | Add a viewsWelcome empty-state to the Loom tree: when there are no weaves, show action buttons (Create first chat / Initialize workspace / Start with an example) instead of a dead panel. | packages/vscode/package.json, packages/vscode/src/extension.ts | pl_01KWWRGAMRRWKBH2A03Z7Q3H0X | IN10 |
| ✅ | 5 | Implement the opt-in 'Start with an example' seed: a command (wired from the empty state) that seeds one tiny example weave→thread→idea→plan via the in-process app — never auto-seeded on install. | packages/app/src/seedExample.ts, packages/vscode/src/extension.ts | pl_01KWWRGAMRRWKBH2A03Z7Q3H0X | IN11, EX3 |
| ✅ | 6 | Update loom/refs/architecture-reference.md with a delivery-surfaces / audiences architecture diagram covering the three surfaces (extension = 1-click bundled server; Claude Code agent = npx-fetched server; CLI + MCP = non-VS-Code hosts/CI); split into linked per-surface docs if that reads clearer. Ensure the main / CLI / extension READMEs reflect the same three distinct surfaces, each with a focused per-audience install+usage story. | loom/refs/architecture-reference.md, README.md, packages/cli/README.md, packages/vscode/README.md | pl_01KWWRGAMRRWKBH2A03Z7Q3H0X | IN13, IN14, C1 |
| ✅ | 7 | Add a one-time 'What's New' upgrade toast for returning users: on activation, compare the last-seen extension version in globalState against the current version; when it crosses into this release, show once — 'Loom is now 1-click — no CLI, no setup' with a [Show me] action that opens the walkthrough. The only proactive channel to users who installed then quit over install friction. | packages/vscode/src/extension.ts, packages/vscode/package.json | pl_01KWWRGAMRRWKBH2A03Z7Q3H0X | IN10, C1 |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |
