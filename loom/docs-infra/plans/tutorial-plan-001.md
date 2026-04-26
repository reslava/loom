---
type: plan
id: tutorial-plan-001
title: "Loom Tutorial — Install to Done (README + GIF)"
status: draft
created: 2026-04-23
version: 1
tags: [docs, tutorial, readme, gif, onboarding]
parent_id: null
child_ids: []
requires_load: []
design_version: 1
---

# Loom Tutorial — Install to Done (README + GIF)

## Goal

Create a single-scroll tutorial section for `README.md` that shows the complete happy path in
under 200 words + one GIF animation. A developer should be able to go from install to first
AI-generated plan step without reading any other documentation.

## Flow

```
Install → Idea → Design → Plan → Implement → Done
```

The GIF captures the VS Code tree view updating live through each stage.

## Steps

| Done | # | Step | Files touched | Blocked by |
|------|---|------|---------------|------------|
| | 1 | Script the happy path — write the exact commands and UI interactions for the tutorial flow: `ext install` + `loom init`, `loom weave-idea`, `loom weave-design`, `loom weave-plan` (2 steps), `loom do-step 1`, `loom complete-step 1`, `loom do-step 2`, `loom complete-step 2`, `loom close-plan`. Ensure this flow works end-to-end on a clean workspace | `weaves/docs-infra/plans/tutorial-plan-001.md` (notes) | Extension commands stable |
| | 2 | Validate the full flow on `j:/temp/loom-tutorial` — clean workspace, run every command, verify tree view updates at each stage, no errors | manual test | Step 1 |
| | 3 | Record GIF — screen capture the VS Code window during the validated flow. Target: under 45 seconds, 1280×720, shows tree view + terminal side by side | GIF file (to be stored in `docs/` or linked from CDN) | Step 2 |
| | 4 | Write `README.md` tutorial section — install command, embed GIF, five-stage walkthrough (one sentence per stage), under 200 words total | `README.md` | Steps 1–3 |
| | 5 | Review: confirm the tutorial matches the actual UX after plan-008 and vscode-tests-plan-001 polish is applied | `README.md` | Steps 4, vscode-extension-plan-008, vscode-tests-plan-001 |

## Notes

- Tutorial must be finalized **after** the extension UX is locked. Do not write it before
  plan-008 and any other VS Code polish are done — the GIF will be wrong.
- Install process target: `ext install reslava.loom` in VS Code + `loom init` in terminal.
  That's two commands. If it requires more, fix the install first.
- The five-stage flow maps directly to Loom's document types: idea → design → plan → chat → done.
  Each stage produces one new document visible in the tree view.
