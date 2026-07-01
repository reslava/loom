---
type: idea
id: id_01KQZ2GHS4P00ASVPK5N06VHA9
title: Token Count — Local Estimator
status: draft
created: "2026-05-06T00:00:00.000Z"
updated: "2026-05-06T00:00:00.000Z"
version: 2
tags: []
parent_id: null
requires_load: []
---
# Token Count — Local Estimator

## Problem
The context sidebar needs to show a token estimate for each doc so users can manage their context budget. Calling the Anthropic `countTokens` API for every doc on every tree selection change would add latency and API cost.

## Idea
A local token estimator using chars/4 as an approximation — accurate enough for budget awareness, zero latency, no network dependency. Estimates are cached per doc path and invalidated whenever VS Code fires a file save event for that path.

## Why now
Required by the context sidebar (vscode-ctx thread). Without token estimates, the sidebar cannot show meaningful budget information.

## Open questions
- In-memory cache only (reset on extension restart) vs persisted to workspace storage? In-memory is simpler and sufficient — docs don't change often.
- Per-model calibration? No — chars/4 is a rough estimate regardless; we're showing budget awareness, not exact counts.

## Next step
design