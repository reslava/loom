---
type: idea
id: id_01KR1PS6ZQ3K0AT96SKE4XQKRP
title: Surface blocked steps per-plan in the VS Code tree
status: done
created: "2026-05-07T00:00:00.000Z"
updated: "2026-05-08T00:00:00.000Z"
version: 3
tags: []
parent_id: null
requires_load: []
---
# Surface blocked steps per-plan in the VS Code tree

## Problem

`LoomState.summary.blockedSteps` is computed on every `getState` call (via `isStepBlocked` per step per plan) but is never visualized in the tree. A plan with blocked steps looks identical to a normal implementing plan — the user has no signal that the plan is stuck without opening the file and reading the steps table manually.

The `plan-implementing-doable` contextValue only distinguishes whether _any_ pending step exists, not whether steps are blocked. There is no icon variant, badge, or description suffix for a plan that has one or more blocked steps.

## Idea

Compute per-plan blocked-step count during tree build (iterate `plan.steps`, call `isStepBlocked` with the link index already in state) and surface it as a description suffix on plan nodes: e.g. `2/5 · Step 3: … 🚫 1 blocked`. Plans with all pending steps blocked could use the existing `warning` codicon. The link index is already present in `LoomState.index`, so no extra MCP call is needed.

## Why now

Blocked steps are invisible today. A developer staring at an implementing plan that never advances has no tree-level signal about why. This is a pure read-only visualization change with no MCP write path involved — low risk, targeted impact.

## Open questions

- Should we call `isStepBlocked` in the tree provider directly (imports `core`), or should the MCP state resource pre-compute per-plan blocked counts and include them in the `PlanDoc` shape returned to the extension?
- Is a description suffix enough, or does the plan node need a dedicated icon state (e.g. `plan-blocked-steps.svg`)?
- Should the next-step preview in the plan description skip blocked steps and show the first _unblocked_ pending step instead?

## Next step

design
