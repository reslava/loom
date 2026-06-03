---
type: done
id: pl_01KT4NKFH0TD8RSDJ674XPV71H-done
title: Done — Demo deliverables — workflow GIF (D1+D4+D2)
status: done
created: "2026-06-03T00:00:00.000Z"
version: 3
tags: []
parent_id: pl_01KT4NKFH0TD8RSDJ674XPV71H
requires_load: []
---
# Done — Demo deliverables — workflow GIF (D1+D4+D2)

## Step 1 — D1 — vsix README (packages/vscode/README.md): rename "the panel" → "the CONTEXT panel" throughout; add full button inventory (Generate Idea, Generate Design, Generate Plan, Do Step, Refine, Promote, AI Reply, Generate Ctx, New Chat, Start Plan, Rename, Archive); add demo-asset placeholder `media/loom-demo-workflow.gif` at the top with a one-line caption.

**D1 — vsix README (`packages/vscode/README.md`).** Reconcile, not from-scratch (README was revised after this plan was written).

- **"the panel" naming:** already correct in the current README — it names the whole sidebar "the Loom panel" with distinct **Threads** and **Context** views. Did NOT rename the sidebar to "the CONTEXT panel" (Rafa's call): that would mis-describe the Threads view. Left as-is.
- **Demo placeholder:** changed `media/loom-demo.gif` → `media/loom-demo-workflow.gif` with a one-line caption (`chat → idea → design → plan → do-step → done`, graph building node-by-node).
- **Button inventory:** rewrote the Threads-view table into three accurate groups (AI actions / Create & promote / Manage) using the **real `package.json` command titles** (Rafa's call: match the extension, not the plan's drafted names). Corrections: `Generate Design (AI)` / `Generate Plan (AI)` carry the "(AI)" suffix; there is no "Generate Idea" command (idea creation is `Weave Idea`); "Generate Ctx" is really `Refresh Context`; "New Chat" is `Weave Chat`; added `Weave Idea/Design/Plan`, `Promote to …/Reference`, `Create Reference`, `Add References…`, `Complete Step`, `Mark Done/Active`, `Validate`, `Delete`.

## Step 2 — D1 — main README (README.md): add hero icon `packages/vscode/media/loom.png` at the top of the VS Code Extension section; add demo-asset placeholder right after the Workflow section; use the exact button names in the extension bullet list; add a link to the extension / marketplace listing.

**D1 — main README (`README.md`).** Reconcile.

- **Hero icon:** already present at the top of the "VS Code Extension" section (`packages/vscode/media/loom.png`, width 64). No change.
- **Marketplace link:** already present ("search `reslava.loom`"). No change.
- **Demo placeholder after the Workflow section:** added a new placeholder line right after the Workflow section's `requires_load` paragraph (the spec'd location) → `packages/vscode/media/loom-demo-workflow.gif` with the loop caption. Also aligned the pre-existing placeholder inside the VS Code Extension section from `loom-demo.gif` → `loom-demo-workflow.gif` so both references name the same asset.
- **Exact button names:** updated the extension button table to real titles — `Generate Design (AI)`, `Generate Plan (AI)`, `Refresh Context` regenerates `ctx.md` for a weave; added `Weave Idea/Design/Plan/Chat`, `Promote to Idea/Design/Plan/Reference`, and `Delete`.

## Step 3 — D4 — recording infra: build a small pricing-page demo project (3–4 files, dark theme); add a demo-project `.claude/settings.local.json` allowlist (Edit/Write/Read/Glob/Grep, scoped Bash, `mcp__loom`) so no `--dangerously-skip-permissions` appears on screen; document the MCP-restart-after-build checklist.

**D4 — recording infra.** Built `demo/landing-page/` as a standalone, clean starting-state project (4 files):

- `index.html` — dark-theme **Nimbus** landing page (nav + hero + 3-feature grid), inline CSS, **no pricing section** (the recording adds it). Uses brand indigo `#4F46E5` so the same project stays visually continuous when the D3 ctx/reference GIF grows it.
- `.claude/settings.local.json` — permission allowlist: `Edit/Write/Read/Glob/Grep`, `Bash(loom:*)`, `Bash(npx:*)`, `mcp__loom`, `enabledMcpjsonServers: [loom]`. **No `--dangerously-skip-permissions` needed on screen.**
- `.gitignore` — keeps the `loom/` + `.loom/` + `.mcp.json` + on-camera `pricing.html` out of the repo so the demo project stays pristine.
- `README.md` — pre-record checklist incl. the **MCP-restart-after-build** step (build-all then fully restart `loom mcp`/the extension client so the recording uses current `generate.ts` prompts), the `.mcp.json` snippet, and the allowlist verification step.

**Design note:** placed at repo-root `demo/landing-page/` rather than inside `loom/` — running `loom install` on camera generates a nested workspace, which the `.gitignore` keeps out of the parent repo (avoids nested-loom confusion).
