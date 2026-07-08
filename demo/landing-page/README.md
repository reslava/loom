# Loom workflow-GIF demo project (`demo/landing-page/`)

A small, clean **starting state** for recording the D2 workflow GIF
(`packages/vscode/media/loom-demo-workflow.gif`). The full spec lives in the thread
[`loom/vscode-extension/vscode-demo/`](../../loom/vscode-extension/vscode-demo/);
the verbatim prompts + 8-scene caption script live in
[`loom/refs/demo-script-reference.md`](../../loom/refs/demo-script-reference.md).
This README seeds those assets locally so the recording types them **verbatim**.

## What's here (starting state — do NOT pre-add pricing)

| File | Role |
|------|------|
| `index.html` | Dark-theme **Nimbus** landing page: hero + 3-feature grid. **No pricing section yet** — the demo records *adding* it. Uses brand indigo `#4F46E5` for continuity with the D3 ctx/reference GIF. |
| `.claude/settings.local.json` | Permission allowlist (Edit/Write/Read/Glob/Grep, scoped `loom`/`npx` Bash, `mcp__loom`). **So no `--dangerously-skip-permissions` appears on screen.** |
| `.gitignore` | Keeps the `loom/` + `.loom/` + `pricing.html` generated on-camera out of the repo. |

The recording produces `pricing.html` + a pricing section integrated into `index.html`.
Both are gitignored — they're regenerated each take.

---

## Pre-record checklist

1. **Build current code + restart MCP** (stale-after-build gotcha — the running
   `loom mcp` keeps old tool code until restarted):
   ```bash
   ./scripts/build-all.sh        # from the loom repo root
   # then fully restart any running `loom mcp` / the extension's MCP client
   ```
   This guarantees the recording uses the tightened `generate.ts` prompts that
   land the pricing plan at ≤3 steps.
2. **Open `demo/landing-page/` as its own VS Code window** (not the loom repo root —
   you want a clean, empty CONTEXT tree on camera).
3. **Add `.mcp.json`** pointing `loom` at this folder (gitignored). Because you're
   recording your *local build*, use the local-path dev config (not `command:"loom"`,
   which is retired, nor the `npx` pin, which would fetch the published release):
   ```json
   { "mcpServers": { "loom": { "type": "stdio", "command": "node",
     "args": ["<repo>/packages/vscode/dist/loom-mcp.js"],
     "env": { "LOOM_ROOT": "${workspaceFolder}" } } } }
   ```
4. **Confirm the allowlist works** — click an AI button once off-camera; there must
   be **no** permission prompt and **no** `--dangerously-skip-permissions` banner.
5. Slow the tree-update transitions to **~0.5s** — the graph building node-by-node
   is the hook.

---

## Scene 1 setup

Terminal, in this folder:
```bash
loom install
```
This is the on-camera "one command sets up the whole workspace" moment.

## Scene 3 — verbatim chat opener (type exactly)

> Add a pricing section to the landing page. Three tiers — Free, Pro, Enterprise —
> each with price, 4 feature bullets, and a CTA button. **Pro is visually highlighted
> as the recommended plan.** Scope is markup + inline CSS only; no JS, no responsive QA,
> no interaction testing. Two deliverables: (1) a self-contained `pricing.html` snippet,
> (2) integration into `index.html` in the right spot. That's the whole job.

"Two deliverables (1)(2)" + the explicit no-JS/no-QA scope is what holds the plan to
2–3 steps. **>3 steps means the prompt drifted — re-tighten before recording.**

## 8-scene caption script (one-line overlays)

| # | Action shown | Caption |
|---|---|---|
| 1 | Terminal: `loom install` | **"One command sets up the whole workspace"** |
| 2 | CONTEXT panel appears, empty tree | **"Your document graph lives in the sidebar"** |
| 3 | Weave Chat → type prompt → AI Reply lands in the doc | **"Chat with AI inside a persistent doc — not a throwaway window"** |
| 4 | Promote / Weave Idea → idea node appears | **"One click turns the conversation into a scoped idea"** |
| 5 | Generate Design (AI) → design node | **"Promote to a design — decisions recorded"** |
| 6 | Generate Plan (AI) → plan with steps table | **"Break the design into reviewable steps"** |
| 7 | Do Step(s) → code appears, step ✅ | **"AI implements one step at a time — you stay in control"** |
| 8 | Done doc in tree | **"What was built is recorded. Nothing disappears."** |
| hold (2s) | — | `chat → idea → design → plan → done` |

> Button names above are the **real extension titles** (`Weave Chat`, `Generate
> Design (AI)`, `Do Step(s)`, …), so the captions match what's on screen.
