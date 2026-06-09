---
type: plan
id: pl_01KT4NKFH0TD8RSDJ674XPV71H
title: Demo deliverables — workflow GIF (D1+D4+D2)
status: implementing
created: "2026-06-02T00:00:00.000Z"
updated: "2026-06-03T00:00:00.000Z"
version: 4
design_version: 1
tags: []
parent_id: de_01KT4MRDAM5R9Q2N7WTM3VJDCA
requires_load: [demo-script-reference]
target_version: 0.1.0
steps:
  - id: d1-vsix-readme-packages-vscode-readme
    order: 1
    status: done
    description: "D1 — vsix README (packages/vscode/README.md): rename \"the panel\" → \"the CONTEXT panel\" throughout; add full button inventory (Generate Idea, Generate Design, Generate Plan, Do Step, Refine, Promote, AI Reply, Generate Ctx, New Chat, Start Plan, Rename, Archive); add demo-asset placeholder `media/loom-demo-workflow.gif` at the top with a one-line caption."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: d1-main-readme-readme
    order: 2
    status: done
    description: "D1 — main README (README.md): add hero icon `packages/vscode/media/loom.png` at the top of the VS Code Extension section; add demo-asset placeholder right after the Workflow section; use the exact button names in the extension bullet list; add a link to the extension / marketplace listing."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: d4-recording-infra-build-a-small
    order: 3
    status: done
    description: "D4 — recording infra: build a small pricing-page demo project (3–4 files, dark theme); add a demo-project `.claude/settings.local.json` allowlist (Edit/Write/Read/Glob/Grep, scoped Bash, `mcp__loom`) so no `--dangerously-skip-permissions` appears on screen; document the MCP-restart-after-build checklist."
    files_touched: []
    blocked_by: []
    satisfies: []
  - id: d2-assemble-the-demo-script-from
    order: 4
    status: pending
    description: "D2 — assemble the demo script from [[demo-script-reference]] (do NOT re-author): use the refined pricing prompt verbatim as the New Chat opener and the 8-scene caption script from that reference; seed them into the demo project so the recording types them verbatim. The plan/design prompt fixes that make this land ≤3 steps are already shipped in `packages/mcp/src/tools/generate.ts`. Dry-run chat → idea → design → plan → dostep → done once on current code; tune only if output drifts from the expected 2–3 step plan in the reference."
    files_touched: [demo project]
    blocked_by: [3]
    satisfies: []
  - id: d2-record-publish-workflow-gif-run
    order: 5
    status: pending
    description: "D2 — record + publish workflow GIF: run a clean `build-all.sh` and restart any running `loom mcp`; record the 8-scene script (install → chat → idea → design → plan → dostep → done) with ~0.5s slowed tree transitions and one-line captions, using the [[demo-script-reference]] prompt verbatim; export to `media/loom-demo-workflow.gif` at ≤ a few MB; verify it renders inline in both README placeholders."
    files_touched: ["`media/loom-demo-workflow.gif`"]
    blocked_by: [1, 2, 3, 4]
    satisfies: []
---
# Demo deliverables — workflow GIF (D1+D4+D2)

## Goal

Ship the workflow-GIF half of the demo deliverables: land the README copy/placeholder updates (D1), stand up the recording infra and demo project (D4), assemble the demo script from `demo-script-reference` and dry-run it on current code, then record and publish the D2 workflow GIF into both README placeholders. D3 (ctx/reference GIF) is deferred to a second plan created only after D2 has been validated with viewers.

All verbatim prompts, the caption script, and seed assets live in [[demo-script-reference]] (`loom/refs/demo-script-reference.md`).
---

## Steps

| Done | # | Step | Files touched | Blocked by | Satisfies |
|---|---|---|---|---|---|
| ✅ | 1 | D1 — vsix README (packages/vscode/README.md): rename "the panel" → "the CONTEXT panel" throughout; add full button inventory (Generate Idea, Generate Design, Generate Plan, Do Step, Refine, Promote, AI Reply, Generate Ctx, New Chat, Start Plan, Rename, Archive); add demo-asset placeholder `media/loom-demo-workflow.gif` at the top with a one-line caption. | — | — | — |
| ✅ | 2 | D1 — main README (README.md): add hero icon `packages/vscode/media/loom.png` at the top of the VS Code Extension section; add demo-asset placeholder right after the Workflow section; use the exact button names in the extension bullet list; add a link to the extension / marketplace listing. | — | — | — |
| ✅ | 3 | D4 — recording infra: build a small pricing-page demo project (3–4 files, dark theme); add a demo-project `.claude/settings.local.json` allowlist (Edit/Write/Read/Glob/Grep, scoped Bash, `mcp__loom`) so no `--dangerously-skip-permissions` appears on screen; document the MCP-restart-after-build checklist. | — | — | — |
| 🔳 | 4 | D2 — assemble the demo script from [[demo-script-reference]] (do NOT re-author): use the refined pricing prompt verbatim as the New Chat opener and the 8-scene caption script from that reference; seed them into the demo project so the recording types them verbatim. The plan/design prompt fixes that make this land ≤3 steps are already shipped in `packages/mcp/src/tools/generate.ts`. Dry-run chat → idea → design → plan → dostep → done once on current code; tune only if output drifts from the expected 2–3 step plan in the reference. | demo project | 3 | — |
| 🔳 | 5 | D2 — record + publish workflow GIF: run a clean `build-all.sh` and restart any running `loom mcp`; record the 8-scene script (install → chat → idea → design → plan → dostep → done) with ~0.5s slowed tree transitions and one-line captions, using the [[demo-script-reference]] prompt verbatim; export to `media/loom-demo-workflow.gif` at ≤ a few MB; verify it renders inline in both README placeholders. | `media/loom-demo-workflow.gif` | 1, 2, 3, 4 | — |
---

### Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| 🔳 | Pending |
| ❌ | Cancelled |