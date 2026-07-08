---
type: done
id: pl_01KX18XMQF0RVWV85Q3GK3HRYS-done
title: Done — loom-install-claude-written Plan
status: done
created: 2026-07-08
version: 1
tags: []
parent_id: pl_01KX18XMQF0RVWV85Q3GK3HRYS
requires_load: []
---
# Done — loom-install-claude-written Plan

Bug 1 of the loom-install chat (chat-001): `loom install` always wrote `.loom/CLAUDE.md` even when byte-identical, dirtying the tree and printing a phantom "written". Root cause: installWorkspace.ts Step 2 did an unconditional writeFileSync and hardcoded `const claudeMdWritten = true`, never comparing to the existing file. Fix is a content-compare writeIfChanged helper applied to the Loom-owned CLAUDE.md write and the regenerable --force writes. Bug 2 (extension upgrade never re-runs install + shape-gated .mcp.json pin heal) is deliberately NOT in this ship — Rafa asked to stop after bug 1.
