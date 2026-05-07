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

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
| ✅ | 1 | Extend `loom_do_step` to accept optional `stepNumber`. When provided, return the brief for that exact step (validate not done; do not require it to be the next pending). When omitted, keep current "first not-done step" behavior. Update tool description and inputSchema accordingly. | `packages/mcp/src/tools/doStep.ts` | — |
| ✅ | 2 | Add MCP tool `loom_list_plan_steps` — input `{ planId }`, output `[{ order, description, filesToTouch, done, blockedBy }]`. Pure read; reuses plan loading logic. Used by the extension to compute visibility and build the multi-select QuickPick. | `packages/mcp/src/tools/listPlanSteps.ts`, `packages/mcp/src/server.ts` | — |
| ✅ | 3 | Update plan tree node visibility — sparkle inline button shows iff plan `status: implementing` AND `loom_list_plan_steps` returns at least one step with `done: false`. Tree refreshes when plan files change (existing watcher handles this). | `packages/vscode/src/tree/*.ts` (locate the plan node renderer) | 2 |
| ✅ | 4 | Replace `doStepCommand` with the QuickPick flow. On click: call `loom_list_plan_steps`, derive `nextDoable` (first not-done step whose `blockedBy` are all done) and `allDoable` (all not-done steps in dep order). Show QuickPick with three items: "Next doable step", "All doable steps", "Pick steps…". "Pick steps…" opens a multi-select QuickPick listing every not-done step (each item shows step #, description, and a "blocked by N, M" suffix when applicable). User confirms → resolves the launch list. | `packages/vscode/src/commands/doStep.ts` | 1, 2 |
| ✅ | 5 | Update the Claude prompt template for multi-step single-session execution. Prompt names `planId` and a JSON array `stepNumbers: [N, M, …]` in dependency order. Instructions tell Claude: for each step number in order, call `loom_do_step(planId, stepNumber)`, implement, call `loom_append_done`, call `loom_complete_step`, then continue to the next; if any step fails, stop and report. Keep `claude` binary detection from plan-001 unchanged. | `packages/vscode/src/commands/doStep.ts` | 4 |
| ✅ | 6 | Manual test in Extension Development Host. Create a 3-step implementing plan (step 2 blockedBy 1; step 3 blockedBy 2). Verify: (a) "Next doable" runs only step 1; (b) "All doable" runs 1→2→3 in one terminal; (c) "Pick steps…" allows selecting {2,3} only when 1 is also picked or already done; (d) sparkle hides after the last step is ✅. | — | 5 |
## Definition of Done

- `loom_do_step` accepts an optional `stepNumber`; when provided, returns the brief for that step (errors if step is already done).
- `loom_list_plan_steps` returns step metadata sufficient for the extension to compute doable/blocked status without parsing markdown itself.
- Plan-node sparkle is hidden when the plan has zero not-done steps OR is not in `implementing` status.
- Clicking the sparkle shows a QuickPick with Next / All / Pick…; each option launches a single Claude Code terminal that iterates the resolved step list.
- "Pick steps…" allows picking a step whose blocker is also in the pick (chain picking); the launched order respects `blockedBy`.
- Multi-step runs preserve Claude session context — one terminal, one Claude process, sequential `loom_do_step` calls per step.
- All picked steps end up ✅ in the plan, and `done.md` has one section per step (idempotent on re-run).

## Notes

- **Supersedes** plan-001's single-step `doStepCommand` (steps 3-4 of plan-001). The terminal-launch + `claude` detection plumbing from plan-001 stays; only the prompt content and the click handler change.
- Out of scope: cross-plan dependency awareness (we still ignore cross-plan blockers when deciding doable). If a future plan needs to chain across plans, that's a separate design.
- Out of scope: changing `loom_append_done` or `loom_complete_step` — both already work per-step and are reused as-is.
- The multi-select QuickPick should sort by step order, not by blocked/doable status, so the list reads top-to-bottom like the plan itself.
