---
type: plan
id: pl_01KQYDFDDE984XT56WQKQD9TPE
title: DoStep(s) — Multi-Step Picker UX — Plan 002
status: done
created: "2026-05-01T00:00:00.000Z"
version: 1
design_version: 1
tags: [vscode, mcp, do-step, ux, quickpick]
parent_id: de_01KQYDFDDE8Z0AV1R2Q8NNNKGK
requires_load: [de_01KQYDFDDE8Z0AV1R2Q8NNNKGK, pl_01KQYDFDDER47Y0H7W7K4ZX80M]
target_release: 0.5.0
actual_release: null
---

# DoStep(s) — Multi-Step Picker UX — Plan 002

Builds on plan-001 (which shipped DoStep as a single-step Claude Code launcher). This plan replaces the always-single-step behavior with a QuickPick (Option A from [vscode-mcp-do-steps-chat.md](../chats/vscode-mcp-do-steps-chat.md)) offering three modes: **Next doable step**, **All doable steps**, **Pick steps…**. The launched Claude session iterates the chosen step list in dependency order within a single session so context is preserved across steps.

## Definitions (locked in)

- **Doable step**: a plan step that is not done AND every `blockedBy` step is either already ✅ OR included in the same launch pick. (Cross-plan blockers don't count.)
- **Sparkle visibility**: shown on a plan node iff plan `status: implementing` AND at least one step is not done. Hidden otherwise.
- **Launch model**: one Claude Code terminal session per click, regardless of how many steps were picked. Claude iterates `loom_do_step → implement → loom_append_done → loom_complete_step` per step without exiting.

## Steps



# Steps

