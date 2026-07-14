---
type: idea
id: id_01KXFZZGR2RYDYEA5671637Z65
title: Auto-fire ctx refresh inference at plan-finish
status: draft
created: 2026-07-14
version: 1
tags: []
parent_id: null
requires_load: []
---
# Auto-fire ctx refresh inference at plan-finish

## Status: parked — future nice-to-have, not needed

Spun out of `core-engine/ctx-surface-parity` (`chat-001`), where auto-firing ctx refresh was deliberately cut from the global-ctx design. Captured here so the idea isn't lost — **not** because it's scheduled. Do not build before `ctx-surface-parity` ships.

## The idea

When a plan reaches **done**, have the AI check whether the completed work affects any section of `loom/ctx.md` (architecture, API, stack, …) and, if so, refresh that ctx — or at least flag it. This is the *only* genuinely accurate staleness signal for global ctx: the AI that just did the work is the one thing that actually knows whether the project's architecture/API description changed.

## Why it's parked, not built

- **Off-spine — AI acting unprompted.** A plan-finish event firing inference violates Loom's core rule "AI never acts unprompted," and spends tokens on a cadence the user didn't choose.
- **Cost without demand.** Every plan-finish would pay for a ctx-diff inference, most of which conclude "no change."
- **The cheap alternatives are enough for now.** The shipped ctx design uses a manual, always-available Refresh plus a "last refreshed: {date}" recency signal — honest, free, user-controlled.

## What would make it viable later

- A **detect-only** variant: at plan-finish, *deterministically* (no inference) flag ctx as "possibly affected" from which pillar's file-areas the plan touched — then let the user click Refresh. Keeps the trigger free and the inference user-initiated. This is the honest half worth revisiting first.
- Clear, well-bounded ctx sections (the pillar template) so a change → section mapping is even possible.
- Evidence that global ctx actually drifts often enough in real projects to justify it.

## Success criteria (if ever built)

- ctx is flagged/refreshed after a plan-finish that genuinely changed the project's architecture/API — with zero inference on plan-finishes that didn't.
- No auto-firing inference the user didn't initiate (the detect-only path), or an explicit opt-in setting if full auto-refresh is chosen.

## Relationship

Follows `core-engine/ctx-surface-parity` (the global-ctx + pillar-template baseline). This thread's `depends_on` points at it.