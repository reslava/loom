---
type: done
id: pl_01KX3VNXAY62W4A86DNQ863WRE-done
title: Done — self-hosting-repo-guard-for-loom-install Plan
status: done
created: 2026-07-09
version: 1
tags: []
parent_id: pl_01KX3VNXAY62W4A86DNQ863WRE
requires_load: []
---
# Done — self-hosting-repo-guard-for-loom-install Plan

Implements idea id_01KX3TA3059YGZ15GK1Y5J5YVC (self-hosting repo guard). Detection via explicit `selfHosting: true` flag (chosen over git-remote sniffing — declarative, fork/CI-safe, entry-point-agnostic). Sequencing was load-bearing: guard built first, then flag set, then artifacts deleted + imports stripped, so an extension reload can't recreate them. Sync test unaffected — it reads root CLAUDE.md + the LOOM_CLAUDE_MD template, never .loom/CLAUDE.md, and the removed @import lines are neither a rule marker nor an invariant token.
